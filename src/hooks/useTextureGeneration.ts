/**
 * React Hooks for Phase 4 AI Texture Generation
 * 
 * Provides hooks for integrating AI texture generation into React components
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PromptProcessor, PromptConfig } from '@/services/promptProcessor';
import { AITextureGenerator, TextureGenerationRequest } from '@/services/textureGenerator';
import { UVMapper, UVMappingConfig } from '@/services/uvMapper';
import { MaterialSystem, PBRMaterialConfig } from '@/services/materialSystem';

export interface UseTextureGenerationOptions {
  enabled?: boolean;
  autoGenerate?: boolean;
  cacheResults?: boolean;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
}

export interface TextureGenerationState {
  isGenerating: boolean;
  progress: number;
  error: string | null;
  material: THREE.MeshStandardMaterial | null;
  textures: {
    baseColor?: THREE.Texture;
    normal?: THREE.Texture;
    roughness?: THREE.Texture;
    metalness?: THREE.Texture;
    ao?: THREE.Texture;
    emissive?: THREE.Texture;
  } | null;
}

/**
 * Hook for texture generation
 */
export function useTextureGeneration(
  generator: AITextureGenerator,
  options: UseTextureGenerationOptions = {}
) {
  const {
    enabled = true,
    autoGenerate = false,
    cacheResults = true,
    onProgress,
    onError,
  } = options;

  const [state, setState] = useState<TextureGenerationState>({
    isGenerating: false,
    progress: 0,
    error: null,
    material: null,
    textures: null,
  });

  const promptProcessorRef = useRef(new PromptProcessor());

  /**
   * Generate textures from prompt
   */
  const generateTextures = async (
    prompt: string,
    config: PromptConfig = {}
  ): Promise<THREE.MeshStandardMaterial | null> => {
    if (!enabled || state.isGenerating) return null;

    setState(prev => ({ ...prev, isGenerating: true, error: null, progress: 0 }));

    try {
      // Process prompt
      setState(prev => ({ ...prev, progress: 10 }));
      const enhanced = promptProcessorRef.current.enhancePrompt(prompt, config);

      // Generate textures
      setState(prev => ({ ...prev, progress: 20 }));
      const textureData = await generator.generate({
        prompt: enhanced.enhanced,
        negativePrompt: promptProcessorRef.current.generateNegativePrompt(),
        style: enhanced.style,
        quality: enhanced.quality as any,
      });

      setState(prev => ({ ...prev, progress: 60 }));

      // Create textures
      const textures = {
        baseColor: MaterialSystem.createTextureFromImageData(
          textureData.baseColor,
          textureData.width,
          textureData.height
        ),
        normal: MaterialSystem.createTextureFromImageData(
          textureData.normalMap,
          textureData.width,
          textureData.height
        ),
        roughness: MaterialSystem.createTextureFromImageData(
          textureData.roughnessMap,
          textureData.width,
          textureData.height
        ),
        metalness: MaterialSystem.createTextureFromImageData(
          textureData.metalnessMap,
          textureData.width,
          textureData.height
        ),
        ao: textureData.aoMap
          ? MaterialSystem.createTextureFromImageData(
              textureData.aoMap,
              textureData.width,
              textureData.height
            )
          : undefined,
        emissive: textureData.emissiveMap
          ? MaterialSystem.createTextureFromImageData(
              textureData.emissiveMap,
              textureData.width,
              textureData.height
            )
          : undefined,
      };

      setState(prev => ({ ...prev, progress: 80, textures }));

      // Create material
      const material = MaterialSystem.createMaterial({
        baseColorMap: textures.baseColor,
        normalMap: textures.normal,
        roughnessMap: textures.roughness,
        metalnessMap: textures.metalness,
        aoMap: textures.ao,
        emissiveMap: textures.emissive,
      });

      setState(prev => ({ ...prev, progress: 100, material, isGenerating: false }));
      onProgress?.(100);

      return material;
    } catch (error) {
      const err = error as Error;
      setState(prev => ({ ...prev, error: err.message, isGenerating: false }));
      onError?.(err);
      return null;
    }
  };

  /**
   * Generate textures with streaming
   */
  const generateTexturesStreaming = async (
    prompt: string,
    config: PromptConfig = {}
  ): Promise<THREE.MeshStandardMaterial | null> => {
    if (!enabled || state.isGenerating) return null;

    setState(prev => ({ ...prev, isGenerating: true, error: null, progress: 0 }));

    try {
      // Process prompt
      const enhanced = promptProcessorRef.current.enhancePrompt(prompt, config);

      let textures: any = {};
      let textureData: any = {};

      // Stream textures
      for await (const chunk of generator.generateStreaming({
        prompt: enhanced.enhanced,
        negativePrompt: promptProcessorRef.current.generateNegativePrompt(),
        style: enhanced.style,
        quality: enhanced.quality as any,
      })) {
        if (chunk.baseColor) {
          textures.baseColor = MaterialSystem.createTextureFromImageData(
            chunk.baseColor,
            chunk.width || 1024,
            chunk.height || 1024
          );
          setState(prev => ({ ...prev, progress: 25 }));
          onProgress?.(25);
        }
        if (chunk.normalMap) {
          textures.normal = MaterialSystem.createTextureFromImageData(
            chunk.normalMap,
            chunk.width || 1024,
            chunk.height || 1024
          );
          setState(prev => ({ ...prev, progress: 50 }));
          onProgress?.(50);
        }
        if (chunk.roughnessMap) {
          textures.roughness = MaterialSystem.createTextureFromImageData(
            chunk.roughnessMap,
            chunk.width || 1024,
            chunk.height || 1024
          );
          setState(prev => ({ ...prev, progress: 75 }));
          onProgress?.(75);
        }
        if (chunk.metalnessMap) {
          textures.metalness = MaterialSystem.createTextureFromImageData(
            chunk.metalnessMap,
            chunk.width || 1024,
            chunk.height || 1024
          );
          textureData = chunk;
        }

        // Update material as textures arrive
        const material = MaterialSystem.createMaterial({
          baseColorMap: textures.baseColor,
          normalMap: textures.normal,
          roughnessMap: textures.roughness,
          metalnessMap: textures.metalness,
          aoMap: textures.ao,
          emissiveMap: textures.emissive,
        });

        setState(prev => ({ ...prev, material, textures }));
      }

      setState(prev => ({ ...prev, progress: 100, isGenerating: false }));
      onProgress?.(100);

      return state.material;
    } catch (error) {
      const err = error as Error;
      setState(prev => ({ ...prev, error: err.message, isGenerating: false }));
      onError?.(err);
      return null;
    }
  };

  /**
   * Clear current material
   */
  const clearMaterial = () => {
    if (state.material) {
      MaterialSystem.disposeMaterial(state.material);
    }
    setState({
      isGenerating: false,
      progress: 0,
      error: null,
      material: null,
      textures: null,
    });
  };

  return {
    ...state,
    generateTextures,
    generateTexturesStreaming,
    clearMaterial,
  };
}

/**
 * Hook for UV mapping
 */
export function useUVMapping(geometry: THREE.BufferGeometry | null) {
  const [uvResult, setUVResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const generateUVs = (config: UVMappingConfig = {}) => {
    if (!geometry) {
      setError('No geometry provided');
      return;
    }

    try {
      const result = UVMapper.generateUVs(geometry, config);
      setUVResult(result);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return {
    uvResult,
    error,
    generateUVs,
  };
}

/**
 * Hook for material management
 */
export function useMaterial(initialPreset?: string) {
  const [material, setMaterial] = useState<THREE.MeshStandardMaterial | null>(
    initialPreset ? MaterialSystem.createFromPreset(initialPreset) : null
  );

  const updateTextures = (textures: any) => {
    if (material) {
      MaterialSystem.updateTextures(material, textures);
    }
  };

  const updateProperties = (properties: any) => {
    if (material) {
      MaterialSystem.updateProperties(material, properties);
    }
  };

  const setPreset = (presetName: string) => {
    const newMaterial = MaterialSystem.createFromPreset(presetName);
    setMaterial(newMaterial);
  };

  const dispose = () => {
    if (material) {
      MaterialSystem.disposeMaterial(material);
      setMaterial(null);
    }
  };

  return {
    material,
    setMaterial,
    updateTextures,
    updateProperties,
    setPreset,
    dispose,
  };
}

/**
 * Example usage
 */
export function exampleHookUsage() {
  // This would be used in a React component
  /*
  const generator = new AITextureGenerator({
    apiEndpoint: 'http://localhost:3001',
    apiKey: 'your-api-key',
    model: 'stable-diffusion-v2',
  });

  const {
    isGenerating,
    progress,
    error,
    material,
    generateTextures,
  } = useTextureGeneration(generator);

  const handleGenerate = async () => {
    await generateTextures('A shiny gold mask', {
      style: 'realistic',
      quality: 'high',
    });
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={isGenerating}>
        Generate Texture
      </button>
      <progress value={progress} max={100} />
      {error && <p>Error: {error}</p>}
      {material && <p>Material ready!</p>}
    </div>
  );
  */
}
