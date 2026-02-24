/**
 * AI Texture Generator
 * 
 * Integrates with AI models (Stable Diffusion, Midjourney, etc.) to generate textures
 */

import * as THREE from 'three';

export interface TextureGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  style?: string;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  seed?: number;
  steps?: number;
  guidance?: number;
}

export interface TextureGenerationResponse {
  baseColor: Uint8Array;
  normalMap: Uint8Array;
  roughnessMap: Uint8Array;
  metalnessMap: Uint8Array;
  aoMap?: Uint8Array;
  emissiveMap?: Uint8Array;
  width: number;
  height: number;
  seed: number;
  generationTime: number;
}

export interface AIModelConfig {
  apiEndpoint: string;
  apiKey: string;
  model: string;
  timeout?: number;
  retries?: number;
}

/**
 * Texture Generation Cache
 */
class TextureCache {
  private cache: Map<string, { data: TextureGenerationResponse; timestamp: number }> = new Map();
  private maxSize: number = 20;
  private ttl: number = 24 * 60 * 60 * 1000; // 24 hours

  set(key: string, value: TextureGenerationResponse): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, { data: value, timestamp: Date.now() });
  }

  get(key: string): TextureGenerationResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  generateKey(request: TextureGenerationRequest): string {
    return `${request.prompt}_${request.style}_${request.quality}`;
  }
}

/**
 * AI Texture Generator
 */
export class AITextureGenerator {
  private config: AIModelConfig;
  private cache: TextureCache;
  private isGenerating: boolean = false;

  constructor(config: AIModelConfig) {
    this.config = {
      timeout: 60000,
      retries: 3,
      ...config
    };
    this.cache = new TextureCache();
  }

  /**
   * Generate textures from prompt
   */
  async generate(request: TextureGenerationRequest): Promise<TextureGenerationResponse> {
    // Check cache first
    const cacheKey = this.cache.generateKey(request);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('Using cached texture');
      return cached;
    }

    if (this.isGenerating) {
      throw new Error('Generation already in progress');
    }

    this.isGenerating = true;

    try {
      const response = await this.callAIModel(request);
      this.cache.set(cacheKey, response);
      return response;
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Generate textures with streaming
   */
  async *generateStreaming(
    request: TextureGenerationRequest
  ): AsyncGenerator<Partial<TextureGenerationResponse>> {
    if (this.isGenerating) {
      throw new Error('Generation already in progress');
    }

    this.isGenerating = true;

    try {
      yield* this.streamAIModel(request);
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Call AI model API
   */
  private async callAIModel(request: TextureGenerationRequest): Promise<TextureGenerationResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < (this.config.retries || 3); attempt++) {
      try {
        const response = await fetch(`${this.config.apiEndpoint}/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            prompt: request.prompt,
            negativePrompt: request.negativePrompt || '',
            style: request.style || 'realistic',
            quality: request.quality || 'high',
            seed: request.seed || Math.floor(Math.random() * 1000000),
            steps: request.steps || 50,
            guidance: request.guidance || 7.5,
            model: this.config.model,
          }),
          signal: AbortSignal.timeout(this.config.timeout || 60000),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();

        return {
          baseColor: this.base64ToUint8Array(data.baseColor),
          normalMap: this.base64ToUint8Array(data.normalMap),
          roughnessMap: this.base64ToUint8Array(data.roughnessMap),
          metalnessMap: this.base64ToUint8Array(data.metalnessMap),
          aoMap: data.aoMap ? this.base64ToUint8Array(data.aoMap) : undefined,
          emissiveMap: data.emissiveMap ? this.base64ToUint8Array(data.emissiveMap) : undefined,
          width: data.width,
          height: data.height,
          seed: data.seed,
          generationTime: data.generationTime,
        };
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt + 1} failed:`, lastError.message);

        // Wait before retry
        if (attempt < (this.config.retries || 3) - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw new Error(`Failed to generate textures after ${this.config.retries} attempts: ${lastError?.message}`);
  }

  /**
   * Stream AI model API
   */
  private async *streamAIModel(
    request: TextureGenerationRequest
  ): AsyncGenerator<Partial<TextureGenerationResponse>> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/generate-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          prompt: request.prompt,
          negativePrompt: request.negativePrompt || '',
          style: request.style || 'realistic',
          quality: request.quality || 'high',
          seed: request.seed || Math.floor(Math.random() * 1000000),
          steps: request.steps || 50,
          guidance: request.guidance || 7.5,
          model: this.config.model,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              yield {
                baseColor: data.baseColor ? this.base64ToUint8Array(data.baseColor) : undefined,
                normalMap: data.normalMap ? this.base64ToUint8Array(data.normalMap) : undefined,
                roughnessMap: data.roughnessMap ? this.base64ToUint8Array(data.roughnessMap) : undefined,
                metalnessMap: data.metalnessMap ? this.base64ToUint8Array(data.metalnessMap) : undefined,
                aoMap: data.aoMap ? this.base64ToUint8Array(data.aoMap) : undefined,
                emissiveMap: data.emissiveMap ? this.base64ToUint8Array(data.emissiveMap) : undefined,
                width: data.width,
                height: data.height,
                seed: data.seed,
                generationTime: data.generationTime,
              };
            } catch (e) {
              console.error('Failed to parse stream data:', e);
            }
          }
        }
      }
    } catch (error) {
      throw new Error(`Streaming failed: ${(error as Error).message}`);
    }
  }

  /**
   * Convert base64 to Uint8Array
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Check if generation is in progress
   */
  isGeneratingNow(): boolean {
    return this.isGenerating;
  }
}

/**
 * Example usage
 */
export async function exampleTextureGeneration() {
  const generator = new AITextureGenerator({
    apiEndpoint: 'http://localhost:3001',
    apiKey: 'your-api-key',
    model: 'stable-diffusion-v2',
  });

  try {
    const textures = await generator.generate({
      prompt: 'A shiny gold mask with intricate patterns',
      style: 'realistic',
      quality: 'high',
    });

    console.log('Generated textures:', {
      width: textures.width,
      height: textures.height,
      generationTime: textures.generationTime,
    });
  } catch (error) {
    console.error('Generation failed:', error);
  }
}
