/**
 * Prompt Processing Engine
 * 
 * Validates, enriches, and optimizes user prompts for AI texture generation
 */

export interface PromptConfig {
  style?: 'realistic' | 'artistic' | 'fantasy' | 'cyberpunk' | 'steampunk' | 'minimalist';
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  lighting?: 'studio' | 'natural' | 'dramatic' | 'soft';
  material?: 'fabric' | 'metal' | 'ceramic' | 'plastic' | 'leather' | 'wood';
  detailLevel?: 'low' | 'medium' | 'high' | 'extreme';
}

export interface EnhancedPrompt {
  original: string;
  enhanced: string;
  style: string;
  quality: string;
  lighting: string;
  material: string;
  detailLevel: string;
  tokens: number;
}

/**
 * Style presets for different mask aesthetics
 */
const STYLE_PRESETS: Record<string, string> = {
  realistic: 'photorealistic, 4K, professional photography, detailed, high quality',
  artistic: 'artistic rendering, painted, stylized, creative, unique',
  fantasy: 'fantasy art, magical, mystical, ethereal, otherworldly',
  cyberpunk: 'cyberpunk, neon, futuristic, high-tech, glowing',
  steampunk: 'steampunk, vintage, mechanical, brass, gears',
  minimalist: 'minimalist, clean, simple, elegant, modern'
};

const QUALITY_PRESETS: Record<string, string> = {
  low: '512x512 resolution',
  medium: '1024x1024 resolution, good quality',
  high: '2048x2048 resolution, excellent quality, highly detailed',
  ultra: '4096x4096 resolution, ultra high quality, extreme detail'
};

const LIGHTING_PRESETS: Record<string, string> = {
  studio: 'studio lighting, professional lighting setup, key light, fill light',
  natural: 'natural lighting, daylight, soft shadows, outdoor',
  dramatic: 'dramatic lighting, high contrast, moody, cinematic',
  soft: 'soft lighting, diffused, gentle shadows, flattering'
};

const MATERIAL_PRESETS: Record<string, string> = {
  fabric: 'fabric texture, cloth, woven, soft appearance',
  metal: 'metallic, shiny, reflective, polished metal',
  ceramic: 'ceramic, glossy, smooth, porcelain-like',
  plastic: 'plastic, matte, synthetic, uniform finish',
  leather: 'leather texture, supple, rich, aged patina',
  wood: 'wood texture, natural grain, warm tones'
};

const DETAIL_PRESETS: Record<string, string> = {
  low: 'simple design, minimal details',
  medium: 'moderate details, balanced complexity',
  high: 'intricate details, complex patterns, fine textures',
  extreme: 'extremely detailed, hyper-detailed, every surface textured'
};

/**
 * Prompt Processor Class
 */
export class PromptProcessor {
  private maxTokens: number = 150;
  private minLength: number = 5;
  private maxLength: number = 500;

  /**
   * Validate user input
   */
  validatePrompt(prompt: string): { valid: boolean; error?: string } {
    if (!prompt || typeof prompt !== 'string') {
      return { valid: false, error: 'Prompt must be a non-empty string' };
    }

    const trimmed = prompt.trim();

    if (trimmed.length < this.minLength) {
      return { valid: false, error: `Prompt must be at least ${this.minLength} characters` };
    }

    if (trimmed.length > this.maxLength) {
      return { valid: false, error: `Prompt must be less than ${this.maxLength} characters` };
    }

    // Check for inappropriate content
    const inappropriateWords = ['violence', 'hate', 'explicit'];
    if (inappropriateWords.some(word => trimmed.toLowerCase().includes(word))) {
      return { valid: false, error: 'Prompt contains inappropriate content' };
    }

    return { valid: true };
  }

  /**
   * Enhance prompt with style, quality, and other parameters
   */
  enhancePrompt(prompt: string, config: PromptConfig = {}): EnhancedPrompt {
    const validation = this.validatePrompt(prompt);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const style = config.style || 'realistic';
    const quality = config.quality || 'high';
    const lighting = config.lighting || 'studio';
    const material = config.material || 'metal';
    const detailLevel = config.detailLevel || 'high';

    // Build enhanced prompt
    const parts = [
      prompt.trim(),
      STYLE_PRESETS[style],
      QUALITY_PRESETS[quality],
      LIGHTING_PRESETS[lighting],
      MATERIAL_PRESETS[material],
      DETAIL_PRESETS[detailLevel],
      'mask, face mask, wearable art'
    ];

    const enhanced = parts.filter(p => p).join(', ');

    return {
      original: prompt,
      enhanced,
      style,
      quality,
      lighting,
      material,
      detailLevel,
      tokens: this.estimateTokens(enhanced)
    };
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~1 token per 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Generate negative prompt (what NOT to generate)
   */
  generateNegativePrompt(): string {
    return 'blurry, low quality, distorted, ugly, bad anatomy, deformed, ' +
           'watermark, text, logo, signature, amateur, poorly drawn, ' +
           'oversaturated, undersaturated, bad lighting';
  }

  /**
   * Get style suggestions based on partial input
   */
  getSuggestions(partial: string): string[] {
    const allStyles = Object.keys(STYLE_PRESETS);
    return allStyles.filter(style => style.includes(partial.toLowerCase()));
  }
}

/**
 * Example usage
 */
export function examplePromptProcessing() {
  const processor = new PromptProcessor();

  // Validate
  const validation = processor.validatePrompt('A golden mask with intricate patterns');
  console.log('Valid:', validation.valid);

  // Enhance
  const enhanced = processor.enhancePrompt(
    'A golden mask with intricate patterns',
    {
      style: 'realistic',
      quality: 'high',
      lighting: 'studio',
      material: 'metal',
      detailLevel: 'high'
    }
  );

  console.log('Enhanced prompt:', enhanced.enhanced);
  console.log('Tokens:', enhanced.tokens);

  // Negative prompt
  const negative = processor.generateNegativePrompt();
  console.log('Negative prompt:', negative);
}
