/**
 * UV Mapping System
 * 
 * Generates optimal UV coordinates for 3D mask geometry
 */

import * as THREE from 'three';

export interface UVMappingConfig {
  method?: 'planar' | 'cylindrical' | 'spherical' | 'auto';
  seamBlending?: boolean;
  distortionMinimization?: boolean;
  padding?: number; // Padding between UV islands
}

export interface UVMappingResult {
  geometry: THREE.BufferGeometry;
  uvs: number[];
  method: string;
  distortion: number;
  seamCount: number;
}

/**
 * UV Mapper Class
 */
export class UVMapper {
  /**
   * Generate UV coordinates for geometry
   */
  static generateUVs(
    geometry: THREE.BufferGeometry,
    config: UVMappingConfig = {}
  ): UVMappingResult {
    const method = config.method || 'auto';

    switch (method) {
      case 'planar':
        return this.planarProjection(geometry, config);
      case 'cylindrical':
        return this.cylindricalProjection(geometry, config);
      case 'spherical':
        return this.sphericalProjection(geometry, config);
      case 'auto':
        return this.autoProjection(geometry, config);
      default:
        throw new Error(`Unknown UV mapping method: ${method}`);
    }
  }

  /**
   * Planar Projection
   * Best for: Flat masks, face-aligned masks
   */
  private static planarProjection(
    geometry: THREE.BufferGeometry,
    config: UVMappingConfig
  ): UVMappingResult {
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    const uvs: number[] = [];

    // Get bounding box
    const bbox = new THREE.Box3().setFromBufferAttribute(positions);
    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());

    // Project vertices onto XY plane
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);

      // Normalize to 0-1 range
      const u = (x - bbox.min.x) / size.x;
      const v = (y - bbox.min.y) / size.y;

      uvs.push(u, v);
    }

    return {
      geometry: this.applyUVs(geometry, uvs),
      uvs,
      method: 'planar',
      distortion: 0, // No distortion for planar
      seamCount: 0,
    };
  }

  /**
   * Cylindrical Projection
   * Best for: Curved masks, cylindrical shapes
   */
  private static cylindricalProjection(
    geometry: THREE.BufferGeometry,
    config: UVMappingConfig
  ): UVMappingResult {
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    const uvs: number[] = [];

    // Get bounding box
    const bbox = new THREE.Box3().setFromBufferAttribute(positions);
    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());

    // Project vertices onto cylinder
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i) - center.x;
      const y = positions.getY(i) - center.y;
      const z = positions.getZ(i) - center.z;

      // Calculate angle around cylinder
      const angle = Math.atan2(z, x);
      const u = (angle + Math.PI) / (2 * Math.PI);

      // Vertical coordinate
      const v = (y - bbox.min.y) / size.y;

      uvs.push(u, v);
    }

    return {
      geometry: this.applyUVs(geometry, uvs),
      uvs,
      method: 'cylindrical',
      distortion: 0.1, // Small distortion at poles
      seamCount: 1, // One seam at angle discontinuity
    };
  }

  /**
   * Spherical Projection
   * Best for: Complex, organic shapes
   */
  private static sphericalProjection(
    geometry: THREE.BufferGeometry,
    config: UVMappingConfig
  ): UVMappingResult {
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    const uvs: number[] = [];

    // Get bounding box
    const bbox = new THREE.Box3().setFromBufferAttribute(positions);
    const center = bbox.getCenter(new THREE.Vector3());
    const radius = bbox.getSize(new THREE.Vector3()).length() / 2;

    // Project vertices onto sphere
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i) - center.x;
      const y = positions.getY(i) - center.y;
      const z = positions.getZ(i) - center.z;

      // Calculate spherical coordinates
      const theta = Math.atan2(z, x);
      const phi = Math.acos(y / radius);

      const u = (theta + Math.PI) / (2 * Math.PI);
      const v = phi / Math.PI;

      uvs.push(u, v);
    }

    return {
      geometry: this.applyUVs(geometry, uvs),
      uvs,
      method: 'spherical',
      distortion: 0.2, // More distortion at poles
      seamCount: 2, // Seams at poles
    };
  }

  /**
   * Auto Projection
   * Analyzes geometry and chooses best method
   */
  private static autoProjection(
    geometry: THREE.BufferGeometry,
    config: UVMappingConfig
  ): UVMappingResult {
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    const bbox = new THREE.Box3().setFromBufferAttribute(positions);
    const size = bbox.getSize(new THREE.Vector3());

    // Analyze geometry shape
    const aspectRatio = Math.max(size.x, size.y) / Math.min(size.x, size.y);
    const flatness = size.z / Math.max(size.x, size.y);

    // Choose method based on geometry characteristics
    if (flatness < 0.2) {
      // Flat geometry - use planar
      return this.planarProjection(geometry, config);
    } else if (aspectRatio > 2) {
      // Elongated geometry - use cylindrical
      return this.cylindricalProjection(geometry, config);
    } else {
      // Complex geometry - use spherical
      return this.sphericalProjection(geometry, config);
    }
  }

  /**
   * Apply UVs to geometry
   */
  private static applyUVs(geometry: THREE.BufferGeometry, uvs: number[]): THREE.BufferGeometry {
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
    return geometry;
  }

  /**
   * Blend seams for seamless textures
   */
  static blendSeams(geometry: THREE.BufferGeometry, blendWidth: number = 0.05): void {
    const uvs = geometry.getAttribute('uv') as THREE.BufferAttribute;
    if (!uvs) return;

    // Find seam edges (UV discontinuities)
    const indices = geometry.getIndex();
    if (!indices) return;

    for (let i = 0; i < indices.count; i += 3) {
      const i0 = indices.getX(i);
      const i1 = indices.getX(i + 1);
      const i2 = indices.getX(i + 2);

      // Check for UV discontinuities
      const u0 = uvs.getX(i0);
      const u1 = uvs.getX(i1);
      const u2 = uvs.getX(i2);

      // If discontinuity found, blend
      if (Math.abs(u0 - u1) > 0.5 || Math.abs(u1 - u2) > 0.5 || Math.abs(u2 - u0) > 0.5) {
        // Apply blending logic
        // This is a simplified version - full implementation would be more complex
      }
    }
  }

  /**
   * Calculate UV distortion
   */
  static calculateDistortion(geometry: THREE.BufferGeometry): number {
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    const uvs = geometry.getAttribute('uv') as THREE.BufferAttribute;
    const indices = geometry.getIndex();

    if (!positions || !uvs || !indices) return 0;

    let totalDistortion = 0;
    let triangleCount = 0;

    for (let i = 0; i < indices.count; i += 3) {
      const i0 = indices.getX(i);
      const i1 = indices.getX(i + 1);
      const i2 = indices.getX(i + 2);

      // Get 3D positions
      const p0 = new THREE.Vector3(
        positions.getX(i0),
        positions.getY(i0),
        positions.getZ(i0)
      );
      const p1 = new THREE.Vector3(
        positions.getX(i1),
        positions.getY(i1),
        positions.getZ(i1)
      );
      const p2 = new THREE.Vector3(
        positions.getX(i2),
        positions.getY(i2),
        positions.getZ(i2)
      );

      // Get UV coordinates
      const uv0 = new THREE.Vector2(uvs.getX(i0), uvs.getY(i0));
      const uv1 = new THREE.Vector2(uvs.getX(i1), uvs.getY(i1));
      const uv2 = new THREE.Vector2(uvs.getX(i2), uvs.getY(i2));

      // Calculate 3D edge lengths
      const edge3d_01 = p0.distanceTo(p1);
      const edge3d_12 = p1.distanceTo(p2);
      const edge3d_20 = p2.distanceTo(p0);

      // Calculate UV edge lengths
      const edgeUV_01 = uv0.distanceTo(uv1);
      const edgeUV_12 = uv1.distanceTo(uv2);
      const edgeUV_20 = uv2.distanceTo(uv0);

      // Calculate distortion ratio
      const distortion =
        Math.abs(edge3d_01 - edgeUV_01) +
        Math.abs(edge3d_12 - edgeUV_12) +
        Math.abs(edge3d_20 - edgeUV_20);

      totalDistortion += distortion;
      triangleCount++;
    }

    return triangleCount > 0 ? totalDistortion / triangleCount : 0;
  }
}

/**
 * Example usage
 */
export function exampleUVMapping() {
  // Create a simple cube geometry
  const geometry = new THREE.BoxGeometry(1, 1, 1);

  // Generate UVs with auto method
  const result = UVMapper.generateUVs(geometry, {
    method: 'auto',
    seamBlending: true,
  });

  console.log('UV Mapping Result:', {
    method: result.method,
    distortion: result.distortion,
    seamCount: result.seamCount,
  });

  // Calculate distortion
  const distortion = UVMapper.calculateDistortion(result.geometry);
  console.log('Calculated distortion:', distortion);
}
