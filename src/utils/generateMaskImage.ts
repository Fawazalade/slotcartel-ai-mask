import { MaskDefinition } from './maskTypes';

interface Landmark {
  x: number;
  y: number;
  z: number;
}

/**
 * Generates a black/white mask PNG as base64.
 * White = inpaint here (face region)
 * Black = keep original (everything else)
 */
export function generateInpaintMask(
  landmarks: Landmark[],
  maskDefinition: MaskDefinition,
  imageWidth: number,
  imageHeight: number
): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageWidth;
  canvas.height = imageHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Fill entire canvas black (keep original)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, imageWidth, imageHeight);

  // Draw white region for the mask boundary (inpaint here)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  const firstIdx = maskDefinition.boundaryLandmarks[0];
  ctx.moveTo(landmarks[firstIdx].x * imageWidth, landmarks[firstIdx].y * imageHeight);
  for (let i = 1; i < maskDefinition.boundaryLandmarks.length; i++) {
    const idx = maskDefinition.boundaryLandmarks[i];
    ctx.lineTo(landmarks[idx].x * imageWidth, landmarks[idx].y * imageHeight);
  }
  ctx.closePath();
  ctx.fill();

  // Punch out cutouts (black = keep eyes, mouth etc)
  maskDefinition.cutouts.forEach(cutoutIndices => {
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    const firstCutIdx = cutoutIndices[0];
    ctx.moveTo(landmarks[firstCutIdx].x * imageWidth, landmarks[firstCutIdx].y * imageHeight);
    for (let i = 1; i < cutoutIndices.length; i++) {
      const idx = cutoutIndices[i];
      ctx.lineTo(landmarks[idx].x * imageWidth, landmarks[idx].y * imageHeight);
    }
    ctx.closePath();
    ctx.fill();
  });

  // Erode mask inward slightly to avoid dark border bleed
  ctx.globalCompositeOperation = 'destination-in';
  ctx.filter = 'blur(6px)';
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'source-over';

  // Slightly blur the mask edges for smoother blending
  ctx.filter = 'blur(4px)';

  const imageData = canvas.toDataURL('image/png');
  return imageData; // returns data:image/png;base64,...
}
