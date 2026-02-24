// services/maskProcessor.ts - Core mask processing logic
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import Replicate from 'replicate';

interface Landmark {
  x: number;
  y: number;
  z?: number;
}

interface ProcessMaskOptions {
  imagePath: string;
  landmarks: Landmark[];
  maskType: string;
  prompt: string | null;
  solidColor: string;
}

interface ProcessResult {
  url: string;
  processingTime: number;
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
});

// Landmark indices for holes
const LEFT_EYE = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7];
const RIGHT_EYE = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382];
const MOUTH_PTS = [78, 13, 308, 14];

export async function processImageWithMask(options: ProcessMaskOptions): Promise<ProcessResult> {
  const startTime = Date.now();

  try {
    // Get image dimensions
    const metadata = await sharp(options.imagePath).metadata();
    const W = metadata.width || 512;
    const H = metadata.height || 512;

    // Generate mask image using SVG
    const maskBuffer = await generateMaskBuffer(options.landmarks, W, H);

    if (options.prompt && process.env.REPLICATE_API_TOKEN) {
      // AI-powered texture generation via Replicate
      const result = await generateAIMask(options.imagePath, maskBuffer, options.prompt);
      const processingTime = Date.now() - startTime;
      return {
        url: result,
        processingTime,
      };
    } else {
      // Simple solid color mask overlay
      const outputPath = await applySolidColorMask(options.imagePath, maskBuffer, options.solidColor, W, H);
      const processingTime = Date.now() - startTime;
      return {
        url: outputPath,
        processingTime,
      };
    }

  } catch (error) {
    console.error('[maskProcessor] Error:', error);
    throw error;
  }
}

async function generateMaskBuffer(landmarks: Landmark[], W: number, H: number): Promise<Buffer> {
  // Create SVG mask with white background and black holes for eyes/mouth
  let svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>
  `;

  // Add black holes for eyes
  const leftEyePoints = LEFT_EYE.map(idx => {
    const pt = landmarks[idx];
    return pt ? `${pt.x * W},${pt.y * H}` : '0,0';
  }).join(' ');
  
  const rightEyePoints = RIGHT_EYE.map(idx => {
    const pt = landmarks[idx];
    return pt ? `${pt.x * W},${pt.y * H}` : '0,0';
  }).join(' ');

  svg += `<polygon points="${leftEyePoints}" fill="black"/>`;
  svg += `<polygon points="${rightEyePoints}" fill="black"/>`;

  // Add black ellipse for mouth
  const mLeft = landmarks[MOUTH_PTS[0]]?.x * W || 0;
  const mTop = landmarks[MOUTH_PTS[1]]?.y * H || 0;
  const mRight = landmarks[MOUTH_PTS[2]]?.x * W || 0;
  const mBottom = landmarks[MOUTH_PTS[3]]?.y * H || 0;
  const mCX = (mLeft + mRight) / 2;
  const mCY = (mTop + mBottom) / 2;
  const mRX = Math.max((mRight - mLeft) * 0.35, 10);
  const mRY = Math.max((mBottom - mTop) * 0.45, 10);

  svg += `<ellipse cx="${mCX}" cy="${mCY}" rx="${mRX}" ry="${mRY}" fill="black"/>`;
  svg += '</svg>';

  return Buffer.from(svg);
}

async function applySolidColorMask(
  imagePath: string, 
  maskBuffer: Buffer, 
  solidColor: string,
  W: number,
  H: number
): Promise<string> {
  // Ensure outputs directory exists
  const outputsDir = path.join(process.cwd(), 'outputs');
  try {
    await fs.mkdir(outputsDir, { recursive: true });
  } catch (e) {
    // Directory may already exist
  }

  const outputFilename = `result-${Date.now()}.png`;
  const outputPath = path.join(outputsDir, outputFilename);

  // Create colored overlay using the mask
  const coloredMask = await sharp(maskBuffer)
    .resize(W, H)
    .composite([{
      input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${solidColor}"/>
      </svg>`),
      blend: 'over'
    }])
    .png()
    .toBuffer();

  // Apply mask to original image
  await sharp(imagePath)
    .composite([{
      input: coloredMask,
      blend: 'over'
    }])
    .png()
    .toFile(outputPath);

  return `/outputs/${outputFilename}`;
}

async function generateAIMask(
  imagePath: string,
  maskBuffer: Buffer,
  userPrompt: string
): Promise<string> {
  console.log('[Replicate] Starting inpainting with prompt:', userPrompt);

  // Ensure outputs directory exists
  const outputsDir = path.join(process.cwd(), 'outputs');
  try {
    await fs.mkdir(outputsDir, { recursive: true });
  } catch (e) {
    // Directory may already exist
  }

  // Read and convert images to base64
  const imageBuffer = await fs.readFile(imagePath);
  const imageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
  const maskBase64 = `data:image/svg+xml;base64,${maskBuffer.toString('base64')}`;

  const output = await replicate.run(
    "black-forest-labs/flux-schnell",
    {






      input: {
        image: imageBase64,
        mask: maskBase64,
        prompt: `Black ski mask balaclava with ${userPrompt} pattern, two eye holes, one mouth hole, realistic fabric texture, photorealistic, high detail, natural lighting`,
        negative_prompt: 'blurry, deformed, seams, unnatural, cartoon, low quality, extra faces, multiple people',
        num_inference_steps: 50,
        guidance_scale: 7.5,
      }
    }
  );

  // Replicate returns an array of URLs
  if (Array.isArray(output) && output.length > 0) {
    // Download the result and save it locally
    const resultUrl = output[0];
    const response = await fetch(resultUrl);
    const buffer = await response.arrayBuffer();
    
    const outputFilename = `result-${Date.now()}.png`;
    const outputPath = path.join(outputsDir, outputFilename);
    await fs.writeFile(outputPath, Buffer.from(buffer));
    
    return `/outputs/${outputFilename}`;
  }

  throw new Error('No output from Replicate');
}

// Legacy function for backward compatibility
export async function generateMaskImage(
  photoPath: string,
  landmarks: Landmark[],
  maskType: string,
  outputDir: string
): Promise<string> {
  const result = await processImageWithMask({
    imagePath: photoPath,
    landmarks,
    maskType,
    prompt: null,
    solidColor: '#000000'
  });
  
  return path.join(process.cwd(), result.url);
}
