/**
 * Material System (PBR)
 * 
 * Creates and manages physically-based materials for 3D masks
 */

import * as THREE from 'three';

export interface PBRMaterialConfig {
  // Textures
  baseColorMap?: THREE.Texture;
  normalMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
  metalnessMap?: THREE.Texture;
  aoMap?: THREE.Texture;
  emissiveMap?: THREE.Texture;

  // Parameters
  roughness?: number;
  metalness?: number;
  emissiveIntensity?: number;
  normalScale?: number;
  aoIntensity?: number;

  // Advanced
  clearcoat?: number;
  clearcoatRoughness?: number;
  ior?: number;
}

export interface MaterialPreset {
  name: string;
  config: PBRMaterialConfig;
  description: string;
}

/**
 * Material Presets
 */
const MATERIAL_PRESETS: Record<string, MaterialPreset> = {
  gold: {
    name: 'Gold',
    config: {
      roughness: 0.2,
      metalness: 1.0,
      emissiveIntensity: 0.1,
    },
    description: 'Shiny metallic gold',
  },
  silver: {
    name: 'Silver',
    config: {
      roughness: 0.15,
      metalness: 1.0,
      emissiveIntensity: 0.05,
    },
    description: 'Polished silver metal',
  },
  copper: {
    name: 'Copper',
    config: {
      roughness: 0.25,
      metalness: 1.0,
      emissiveIntensity: 0.08,
    },
    description: 'Warm copper metal',
  },
  ceramic: {
    name: 'Ceramic',
    config: {
      roughness: 0.6,
      metalness: 0.0,
      emissiveIntensity: 0.0,
    },
    description: 'Smooth ceramic material',
  },
  fabric: {
    name: 'Fabric',
    config: {
      roughness: 0.8,
      metalness: 0.0,
      emissiveIntensity: 0.0,
    },
    description: 'Soft fabric material',
  },
  leather: {
    name: 'Leather',
    config: {
      roughness: 0.5,
      metalness: 0.0,
      emissiveIntensity: 0.0,
    },
    description: 'Rich leather material',
  },
  plastic: {
    name: 'Plastic',
    config: {
      roughness: 0.4,
      metalness: 0.0,
      emissiveIntensity: 0.0,
    },
    description: 'Synthetic plastic material',
  },
  glass: {
    name: 'Glass',
    config: {
      roughness: 0.1,
      metalness: 0.0,
      emissiveIntensity: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      ior: 1.5,
    },
    description: 'Transparent glass material',
  },
};

/**
 * Material System Class
 */
export class MaterialSystem {
  /**
   * Create a PBR material
   */
  static createMaterial(config: PBRMaterialConfig = {}): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      map: config.baseColorMap,
      normalMap: config.normalMap,
      normalScale: new THREE.Vector2(config.normalScale ?? 1.0, config.normalScale ?? 1.0),
      roughnessMap: config.roughnessMap,
      roughness: config.roughness ?? 0.5,
      metalnessMap: config.metalnessMap,
      metalness: config.metalness ?? 0.0,
      aoMap: config.aoMap,
      emissiveMap: config.emissiveMap,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: config.emissiveIntensity ?? 0.0,
      side: THREE.DoubleSide,
      flatShading: false,
    });

    return material;
  }

  /**
   * Create material from preset
   */
  static createFromPreset(presetName: string): THREE.MeshStandardMaterial {
    const preset = MATERIAL_PRESETS[presetName];
    if (!preset) {
      throw new Error(`Unknown material preset: ${presetName}`);
    }

    return this.createMaterial(preset.config);
  }

  /**
   * Update material with new textures
   */
  static updateTextures(
    material: THREE.MeshStandardMaterial,
    textures: {
      baseColor?: THREE.Texture;
      normal?: THREE.Texture;
      roughness?: THREE.Texture;
      metalness?: THREE.Texture;
      ao?: THREE.Texture;
      emissive?: THREE.Texture;
    }
  ): void {
    if (textures.baseColor) material.map = textures.baseColor;
    if (textures.normal) material.normalMap = textures.normal;
    if (textures.roughness) material.roughnessMap = textures.roughness;
    if (textures.metalness) material.metalnessMap = textures.metalness;
    if (textures.ao) material.aoMap = textures.ao;
    if (textures.emissive) material.emissiveMap = textures.emissive;

    material.needsUpdate = true;
  }

  /**
   * Update material properties
   */
  static updateProperties(
    material: THREE.MeshStandardMaterial,
    properties: {
      roughness?: number;
      metalness?: number;
      emissiveIntensity?: number;
      normalScale?: number;
      aoIntensity?: number;
    }
  ): void {
    if (properties.roughness !== undefined) material.roughness = properties.roughness;
    if (properties.metalness !== undefined) material.metalness = properties.metalness;
    if (properties.emissiveIntensity !== undefined) material.emissiveIntensity = properties.emissiveIntensity;
    if (properties.normalScale !== undefined) {
      material.normalScale.set(properties.normalScale, properties.normalScale);
    }

    material.needsUpdate = true;
  }

  /**
   * Blend two materials
   */
  static blendMaterials(
    material1: THREE.MeshStandardMaterial,
    material2: THREE.MeshStandardMaterial,
    blend: number
  ): THREE.MeshStandardMaterial {
    const blended = new THREE.MeshStandardMaterial({
      roughness: THREE.MathUtils.lerp(material1.roughness, material2.roughness, blend),
      metalness: THREE.MathUtils.lerp(material1.metalness, material2.metalness, blend),
      emissiveIntensity: THREE.MathUtils.lerp(
        material1.emissiveIntensity,
        material2.emissiveIntensity,
        blend
      ),
    });

    return blended;
  }

  /**
   * Get all available presets
   */
  static getPresets(): MaterialPreset[] {
    return Object.values(MATERIAL_PRESETS);
  }

  /**
   * Get preset by name
   */
  static getPreset(name: string): MaterialPreset | null {
    return MATERIAL_PRESETS[name] || null;
  }

  /**
   * Create texture from canvas
   */
  static createTextureFromCanvas(canvas: HTMLCanvasElement): THREE.Texture {
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Create texture from image data
   */
  static createTextureFromImageData(
    imageData: Uint8Array,
    width: number,
    height: number
  ): THREE.Texture {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    const imgData = ctx.createImageData(width, height);
    imgData.data.set(imageData);
    ctx.putImageData(imgData, 0, 0);

    return this.createTextureFromCanvas(canvas as any);
  }

  /**
   * Clone material
   */
  static cloneMaterial(material: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
    return material.clone() as THREE.MeshStandardMaterial;
  }

  /**
   * Dispose material and textures
   */
  static disposeMaterial(material: THREE.MeshStandardMaterial): void {
    if (material.map) material.map.dispose();
    if (material.normalMap) material.normalMap.dispose();
    if (material.roughnessMap) material.roughnessMap.dispose();
    if (material.metalnessMap) material.metalnessMap.dispose();
    if (material.aoMap) material.aoMap.dispose();
    if (material.emissiveMap) material.emissiveMap.dispose();
    material.dispose();
  }
}

/**
 * Example usage
 */
export function exampleMaterialSystem() {
  // Create material from preset
  const goldMaterial = MaterialSystem.createFromPreset('gold');
  console.log('Gold material created:', goldMaterial);

  // Update properties
  MaterialSystem.updateProperties(goldMaterial, {
    roughness: 0.3,
    metalness: 0.9,
  });

  // Get all presets
  const presets = MaterialSystem.getPresets();
  console.log('Available presets:', presets.map(p => p.name));

  // Blend materials
  const silverMaterial = MaterialSystem.createFromPreset('silver');
  const blended = MaterialSystem.blendMaterials(goldMaterial, silverMaterial, 0.5);
  console.log('Blended material created');
}
