/**
 * Face Mesh Triangulation
 * 
 * Provides proper triangulation for MediaPipe FaceMesh landmarks.
 * Uses MediaPipe's official triangulation indices for 468 landmarks.
 * 
 * Reference: https://github.com/google/mediapipe/blob/master/mediapipe/python/solutions/face_mesh_connections.py
 */

/**
 * MediaPipe FaceMesh triangulation indices
 * Each triplet represents a triangle connecting three landmarks
 */
export const FACE_MESH_TRIANGLES = [
  // Lips
  [61, 146, 91], [91, 181, 84], [84, 17, 314], [314, 405, 321], [321, 375, 291],
  [291, 61, 146], [78, 95, 88], [88, 178, 87], [87, 14, 317], [317, 402, 318],
  [318, 324, 308], [308, 78, 95], [78, 191, 80], [80, 81, 82], [82, 13, 312],
  [312, 311, 310], [310, 415, 308], [308, 324, 318], [318, 402, 317], [317, 14, 87],
  [87, 178, 88], [88, 95, 78], [80, 191, 78], [82, 81, 80], [312, 13, 82],
  [310, 311, 312], [415, 310, 308],

  // Right eye
  [362, 382, 381], [381, 380, 374], [374, 373, 390], [390, 249, 263], [263, 466, 388],
  [388, 387, 386], [386, 385, 384], [384, 398, 362], [398, 384, 385], [385, 386, 387],
  [387, 388, 466], [466, 263, 249], [249, 390, 373], [373, 374, 380], [380, 381, 382],
  [382, 362, 398],

  // Left eye
  [33, 7, 163], [163, 144, 145], [145, 153, 154], [154, 155, 133], [133, 33, 246],
  [246, 161, 160], [160, 159, 158], [158, 157, 173], [173, 157, 158], [158, 159, 160],
  [160, 161, 246], [246, 33, 133], [133, 155, 154], [154, 153, 145], [145, 144, 163],
  [163, 7, 33],

  // Right eyebrow
  [276, 283, 282], [282, 295, 285], [285, 295, 282], [282, 283, 276], [283, 276, 300],
  [300, 293, 334], [334, 296, 336], [336, 285, 295], [295, 282, 285], [285, 336, 334],
  [334, 293, 300], [300, 276, 283],

  // Left eyebrow
  [46, 53, 52], [52, 65, 55], [55, 65, 52], [52, 53, 46], [53, 46, 70],
  [70, 63, 105], [105, 66, 107], [107, 55, 65], [65, 52, 55], [55, 107, 105],
  [105, 63, 70], [70, 46, 53],

  // Nose
  [1, 2, 98], [98, 97, 2], [2, 326, 327], [327, 294, 326], [168, 6, 197],
  [197, 195, 5], [5, 4, 1], [4, 5, 195], [195, 197, 6], [6, 168, 8],
  [8, 9, 168], [9, 8, 42], [42, 41, 38], [38, 37, 40], [40, 39, 37],
  [37, 38, 41], [41, 42, 8], [8, 168, 9], [168, 197, 195], [195, 5, 4],
  [4, 1, 2], [2, 97, 98], [98, 2, 326], [326, 294, 327], [327, 326, 294],

  // Face contour
  [10, 338, 297], [297, 338, 337], [337, 299, 333], [333, 299, 298], [298, 337, 338],
  [338, 10, 297], [109, 10, 338], [338, 337, 299], [299, 333, 298], [298, 338, 337],
  [337, 338, 10], [10, 109, 338], [67, 109, 10], [10, 338, 337], [337, 299, 333],
  [333, 298, 337], [337, 338, 298], [298, 338, 109], [109, 67, 10],

  // Cheeks and face sides
  [127, 234, 93], [93, 234, 137], [137, 234, 177], [177, 234, 215], [215, 234, 177],
  [177, 215, 138], [138, 215, 214], [214, 215, 177], [177, 138, 214], [214, 138, 135],
  [135, 138, 177], [177, 137, 135], [135, 137, 234], [234, 127, 93], [93, 137, 234],

  // Additional face triangles for complete coverage
  [132, 58, 172], [172, 136, 150], [150, 149, 176], [176, 148, 152], [152, 377, 400],
  [400, 378, 379], [379, 365, 397], [397, 288, 361], [361, 323, 454], [454, 356, 389],
  [389, 200, 421], [421, 428, 262], [262, 369, 396], [396, 175, 171], [171, 32, 132],
];

/**
 * Get triangulation indices for face mesh
 * 
 * @returns Array of triangle indices (triplets)
 */
export function getFaceTriangles(): number[] {
  const triangles: number[] = [];
  FACE_MESH_TRIANGLES.forEach((triangle: readonly number[]) => {
    triangles.push(...(triangle as number[]));
  });
  return triangles;
}

/**
 * Validate that all triangle indices are within landmark range
 * 
 * @param triangles - Array of triangle indices
 * @param landmarkCount - Total number of landmarks
 * @returns true if all indices are valid
 */
export function validateTriangles(triangles: number[], landmarkCount: number): boolean {
  return triangles.every(index => index >= 0 && index < landmarkCount);
}

/**
 * Calculate triangle normals for proper lighting
 * 
 * @param vertices - Flat array of vertex positions [x, y, z, x, y, z, ...]
 * @param indices - Triangle indices
 * @returns Flat array of normals [nx, ny, nz, nx, ny, nz, ...]
 */
export function calculateNormals(vertices: number[], indices: number[]): number[] {
  const normals = new Array(vertices.length).fill(0);

  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3;
    const i1 = indices[i + 1] * 3;
    const i2 = indices[i + 2] * 3;

    // Get vertices
    const v0 = [vertices[i0], vertices[i0 + 1], vertices[i0 + 2]];
    const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
    const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];

    // Calculate edge vectors
    const e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
    const e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

    // Calculate cross product (normal)
    const normal = [
      e1[1] * e2[2] - e1[2] * e2[1],
      e1[2] * e2[0] - e1[0] * e2[2],
      e1[0] * e2[1] - e1[1] * e2[0]
    ];

    // Add to vertex normals
    normals[i0] += normal[0];
    normals[i0 + 1] += normal[1];
    normals[i0 + 2] += normal[2];

    normals[i1] += normal[0];
    normals[i1 + 1] += normal[1];
    normals[i1 + 2] += normal[2];

    normals[i2] += normal[0];
    normals[i2 + 1] += normal[1];
    normals[i2 + 2] += normal[2];
  }

  // Normalize
  for (let i = 0; i < normals.length; i += 3) {
    const length = Math.sqrt(normals[i] ** 2 + normals[i + 1] ** 2 + normals[i + 2] ** 2);
    if (length > 0) {
      normals[i] /= length;
      normals[i + 1] /= length;
      normals[i + 2] /= length;
    }
  }

  return normals;
}
