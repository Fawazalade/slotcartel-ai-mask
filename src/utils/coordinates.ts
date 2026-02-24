/**
 * Coordinate System Definitions
 * 
 * This module defines and converts between different coordinate systems:
 * 
 * 1. NORMALIZED (0-1): MediaPipe output, image space
 *    - x: 0 (left) to 1 (right)
 *    - y: 0 (top) to 1 (bottom)
 *    - z: 0 (far) to 1 (near), relative to face plane
 * 
 * 2. 3D WORLD: Three.js space, centered at face center
 *    - x: -1 to 1 (left to right)
 *    - y: -1 to 1 (bottom to top)
 *    - z: -1 to 1 (back to front)
 * 
 * 3. PIXEL: Canvas/image pixel space
 *    - x: 0 to imageWidth
 *    - y: 0 to imageHeight
 */

import * as THREE from 'three';

// Branded types for type safety
export type NormalizedCoordinate = { x: number; y: number; z: number } & { readonly __brand: 'NormalizedCoordinate' };
export type WorldCoordinate = THREE.Vector3 & { readonly __brand: 'WorldCoordinate' };
export type PixelCoordinate = { x: number; y: number } & { readonly __brand: 'PixelCoordinate' };

/**
 * Convert normalized coordinates (0-1) to 3D world space
 * 
 * @param normalized - Normalized coordinate from MediaPipe
 * @param faceScale - Scale factor for the face (typically 2-3)
 * @returns 3D world coordinate
 */
export function normalizedToWorld(
  normalized: { x: number; y: number; z: number },
  faceScale: number = 2.0
): THREE.Vector3 {
  return new THREE.Vector3(
    (normalized.x - 0.5) * faceScale,
    -(normalized.y - 0.5) * faceScale, // Flip Y: image coords are top-down
    normalized.z * faceScale * 0.5 // Z is relative depth
  );
}

/**
 * Convert 3D world coordinates back to normalized space
 * 
 * @param world - 3D world coordinate
 * @param faceScale - Scale factor used in conversion
 * @returns Normalized coordinate
 */
export function worldToNormalized(
  world: THREE.Vector3,
  faceScale: number = 2.0
): { x: number; y: number; z: number } {
  return {
    x: world.x / faceScale + 0.5,
    y: -(world.y / faceScale) + 0.5,
    z: world.z / (faceScale * 0.5)
  };
}

/**
 * Convert normalized coordinates to pixel coordinates
 * 
 * @param normalized - Normalized coordinate
 * @param imageWidth - Width of the image in pixels
 * @param imageHeight - Height of the image in pixels
 * @returns Pixel coordinate
 */
export function normalizedToPixel(
  normalized: { x: number; y: number },
  imageWidth: number,
  imageHeight: number
): { x: number; y: number } {
  return {
    x: normalized.x * imageWidth,
    y: normalized.y * imageHeight
  };
}

/**
 * Convert pixel coordinates to normalized
 * 
 * @param pixel - Pixel coordinate
 * @param imageWidth - Width of the image in pixels
 * @param imageHeight - Height of the image in pixels
 * @returns Normalized coordinate
 */
export function pixelToNormalized(
  pixel: { x: number; y: number },
  imageWidth: number,
  imageHeight: number
): { x: number; y: number } {
  return {
    x: pixel.x / imageWidth,
    y: pixel.y / imageHeight
  };
}

/**
 * Calculate face bounding box from landmarks
 * 
 * @param landmarks - Array of normalized landmarks
 * @returns Bounding box with min/max coordinates
 */
export function calculateFaceBoundingBox(
  landmarks: { x: number; y: number; z: number }[]
): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  width: number;
  height: number;
  depth: number;
} {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  landmarks.forEach(landmark => {
    minX = Math.min(minX, landmark.x);
    maxX = Math.max(maxX, landmark.x);
    minY = Math.min(minY, landmark.y);
    maxY = Math.max(maxY, landmark.y);
    minZ = Math.min(minZ, landmark.z);
    maxZ = Math.max(maxZ, landmark.z);
  });

  return {
    minX, maxX, minY, maxY, minZ, maxZ,
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ
  };
}

/**
 * Calculate optimal scale for face based on bounding box
 * 
 * @param landmarks - Array of normalized landmarks
 * @param targetSize - Desired size in world space (default 2.0)
 * @returns Scale factor
 */
export function calculateOptimalFaceScale(
  landmarks: { x: number; y: number; z: number }[],
  targetSize: number = 2.0
): number {
  const bbox = calculateFaceBoundingBox(landmarks);
  const maxDimension = Math.max(bbox.width, bbox.height);
  return maxDimension > 0 ? targetSize / maxDimension : targetSize;
}

/**
 * Validate that landmarks are in valid range
 * 
 * @param landmarks - Array of landmarks to validate
 * @returns true if all landmarks are valid
 */
export function validateLandmarks(
  landmarks: { x: number; y: number; z: number }[]
): boolean {
  if (!Array.isArray(landmarks) || landmarks.length === 0) {
    return false;
  }

  return landmarks.every(landmark => {
    return (
      typeof landmark.x === 'number' && !isNaN(landmark.x) && landmark.x >= 0 && landmark.x <= 1 &&
      typeof landmark.y === 'number' && !isNaN(landmark.y) && landmark.y >= 0 && landmark.y <= 1 &&
      typeof landmark.z === 'number' && !isNaN(landmark.z) && landmark.z >= -1 && landmark.z <= 1
    );
  });
}

/**
 * Get face center in world space
 * 
 * @param landmarks - Array of normalized landmarks
 * @param faceScale - Scale factor for the face
 * @returns Face center in world space
 */
export function getFaceCenter(
  landmarks: { x: number; y: number; z: number }[],
  faceScale: number = 2.0
): THREE.Vector3 {
  const bbox = calculateFaceBoundingBox(landmarks);
  const centerNormalized = {
    x: bbox.minX + bbox.width / 2,
    y: bbox.minY + bbox.height / 2,
    z: bbox.minZ + bbox.depth / 2
  };
  return normalizedToWorld(centerNormalized, faceScale);
}
