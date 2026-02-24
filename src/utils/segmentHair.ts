// utils/segmentHair.ts
// Runs MediaPipe ImageSegmenter on a photo and returns an ImageData
// containing ONLY the hair pixels (transparent everywhere else).

import {
  ImageSegmenter,
  FilesetResolver,
  ImageSegmenterResult,
} from '@mediapipe/tasks-vision';

let segmenter: ImageSegmenter | null = null;

async function getSegmenter(): Promise<ImageSegmenter> {
  if (segmenter) return segmenter;

  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  );

  segmenter = await ImageSegmenter.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
      delegate: 'GPU',
    },
    outputCategoryMask: true,
    outputConfidenceMasks: false,
    runningMode: 'IMAGE',
  });

  return segmenter;
}

// Category indices from selfie_multiclass_256x256:
//   0: background  1: hair  2: body-skin  3: face-skin  4: clothes  5: accessories
const HAIR_CATEGORY = 1;

export async function segmentHair(
  photoDataUrl: string
): Promise<ImageData | null> {
  try {
    const seg = await getSegmenter();

    // Load photo into an HTMLImageElement
    const img = await loadImage(photoDataUrl);
    const W = img.naturalWidth;
    const H = img.naturalHeight;

    // Draw photo to offscreen canvas so we can pass it to the segmenter
    const offscreen = document.createElement('canvas');
    offscreen.width = W;
    offscreen.height = H;
    const ctx = offscreen.getContext('2d')!;
    ctx.drawImage(img, 0, 0, W, H);

    // Run segmentation
    const result: ImageSegmenterResult = seg.segment(offscreen);
    const categoryMask = result.categoryMask;
    if (!categoryMask) return null;

    // categoryMask is a MPMask — get it as a Uint8ClampedArray
    const maskData: Uint8ClampedArray = categoryMask.getAsUint8Array();

    // Get original photo pixels
    const photoPixels = ctx.getImageData(0, 0, W, H);

    // Build output: copy original pixels where category == HAIR, else transparent
    const output = new ImageData(W, H);
    const maskW = categoryMask.width;
    const maskH = categoryMask.height;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        // Mask may be at a different resolution — sample nearest
        const maskX = Math.round((x / W) * maskW);
        const maskY = Math.round((y / H) * maskH);
        const maskIdx = maskY * maskW + maskX;
        const category = maskData[maskIdx];

        if (category === HAIR_CATEGORY) {
          const pIdx = (y * W + x) * 4;
          output.data[pIdx]     = photoPixels.data[pIdx];      // R
          output.data[pIdx + 1] = photoPixels.data[pIdx + 1];  // G
          output.data[pIdx + 2] = photoPixels.data[pIdx + 2];  // B
          output.data[pIdx + 3] = 255;                         // fully opaque
        }
        // else: stays transparent (alpha = 0)
      }
    }

    categoryMask.close();
    return output;

  } catch (err) {
    console.warn('[segmentHair] Failed:', err);
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
