/**
 * MediaPipe FaceMesh Landmark Indices
 * 
 * Reference: https://github.com/google/mediapipe/blob/master/mediapipe/python/solutions/face_mesh.py
 * 
 * MediaPipe FaceMesh detects 468 landmarks on the face.
 * This file documents the key landmark indices used for mask anchoring and face analysis.
 */

/**
 * Key facial landmark indices for mask anchoring
 */
export const LANDMARK_INDICES = {
  // Eyes
  leftEyeCenter: 33,      // Left eye center
  rightEyeCenter: 263,    // Right eye center
  leftEyeInner: 133,      // Left eye inner corner
  leftEyeOuter: 33,       // Left eye outer corner
  rightEyeInner: 362,     // Right eye inner corner
  rightEyeOuter: 263,     // Right eye outer corner

  // Eyebrows
  leftEyebrowInner: 46,   // Left eyebrow inner
  leftEyebrowOuter: 52,   // Left eyebrow outer
  rightEyebrowInner: 276, // Right eyebrow inner
  rightEyebrowOuter: 282, // Right eyebrow outer

  // Nose
  noseBridge: 6,          // Nose bridge (between eyes)
  noseTip: 4,             // Nose tip
  noseLeft: 98,           // Left nostril
  noseRight: 327,         // Right nostril

  // Mouth
  mouthLeft: 61,          // Left mouth corner
  mouthRight: 291,        // Right mouth corner
  mouthTop: 13,           // Top of mouth
  mouthBottom: 14,        // Bottom of mouth
  mouthCenter: 78,        // Mouth center

  // Face contour
  chin: 152,              // Chin bottom
  jawLeft: 234,           // Left jaw
  jawRight: 454,          // Right jaw
  leftCheek: 127,         // Left cheek
  rightCheek: 356,        // Right cheek

  // Forehead
  foreheadCenter: 10,     // Forehead center
  foreheadLeft: 109,      // Forehead left
  foreheadRight: 338,     // Forehead right
} as const;

/**
 * Landmark groups for different facial features
 */
export const LANDMARK_GROUPS = {
  leftEye: [33, 7, 163, 144, 145, 153, 154, 155, 133, 246, 161, 160, 159, 158, 157, 173] as const,
  rightEye: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398] as const,
  leftEyebrow: [46, 53, 52, 65, 55, 70, 63, 105, 107] as const,
  rightEyebrow: [276, 283, 282, 295, 285, 300, 293, 334, 296, 336] as const,
  nose: [1, 2, 98, 97, 168, 6, 197, 195, 5, 4, 8, 9, 42, 41, 38, 37, 40, 39, 326, 327, 294] as const,
  mouth: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 191, 80, 81, 82, 13, 312, 311, 310, 415] as const,
  jawline: [10, 338, 297, 337, 299, 333, 298, 109, 67, 127, 234, 93, 137, 177, 215, 138, 135, 214, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454, 356, 389, 200, 421, 428, 262, 369, 396, 175, 171, 32] as const,
  face: Array.from({ length: 468 }, (_, i) => i) as number[],
} as const;

/**
 * Get a specific landmark index by name
 * 
 * @param name - Landmark name
 * @returns Landmark index
 */
export function getLandmarkIndex(name: keyof typeof LANDMARK_INDICES): number {
  return LANDMARK_INDICES[name];
}

/**
 * Get all landmarks in a group
 * 
 * @param group - Group name
 * @returns Array of landmark indices
 */
export function getLandmarkGroup(group: keyof typeof LANDMARK_GROUPS): number[] {
  return Array.from(LANDMARK_GROUPS[group]);
}

/**
 * Validate that a landmark index is valid
 * 
 * @param index - Landmark index
 * @returns true if index is valid (0-467)
 */
export function isValidLandmarkIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < 468;
}
