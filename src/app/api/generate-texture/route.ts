import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing STABILITY_API_KEY' }, { status: 500 });

    // Generate a TEXTURE TILE — not a portrait. No photo input needed.
    const texturePrompt = buildTexturePrompt(prompt);
    console.log('[generate-texture] prompt:', texturePrompt);

    const formData = new FormData();
    formData.append('prompt', texturePrompt);
    formData.append('negative_prompt', 'face, person, human, eyes, mouth, nose, skin, portrait, photorealistic person, ugly, deformed, watermark, text');
    formData.append('output_format', 'png');
    formData.append('aspect_ratio', '1:1');

    const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'image/*',
      },
      body: formData,
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error(`[generate-texture] Stability AI ${response.status}:`, detail);
      return NextResponse.json({ error: 'Stability AI failed', details: detail }, { status: 500 });
    }

    const imageBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString('base64');
    return NextResponse.json({ base64 });

  } catch (error) {
    console.error('[generate-texture] Error:', error);
    return NextResponse.json({ error: 'Failed to generate', details: String(error) }, { status: 500 });
  }
}

function buildTexturePrompt(userPrompt: string): string {
  const lower = userPrompt.toLowerCase().trim();

  const map: [string[], string][] = [
    [['camo', 'camouflage', 'military'], 'military camouflage fabric texture pattern, green brown tan, seamless tile, macro close up'],
    [['snake', 'snakeskin', 'reptile'], 'snake skin scales texture pattern, dark iridescent, seamless macro close up'],
    [['flames', 'fire'], 'orange red yellow flame pattern on black background, seamless illustration'],
    [['circuit', 'cyber', 'tech', 'cyberpunk'], 'glowing neon green circuit board pattern on black, seamless, macro electronics'],
    [['skull', 'bones'], 'white skull pattern on black fabric, repeating seamless textile print'],
    [['floral', 'flowers'], 'intricate floral embroidery pattern, white thread on black fabric, seamless macro'],
    [['leather'], 'smooth black leather texture, macro close up, seamless tile'],
    [['velvet'], 'deep black velvet fabric texture, macro close up, seamless tile'],
    [['gold', 'golden'], 'polished 24k gold metal surface, reflective, seamless macro texture'],
    [['silver', 'chrome', 'mirror'], 'chrome silver mirror metal surface, seamless macro texture'],
    [['diamond', 'crystal', 'rhinestone'], 'crystal rhinestone diamonds on black fabric, sparkling, seamless macro close up'],
    [['lace'], 'intricate black lace fabric pattern, seamless macro close up'],
    [['neon', 'glow'], 'neon pink and blue glowing pattern on black, seamless, abstract'],
    [['zebra', 'zebra print'], 'zebra stripe pattern, black and white, seamless fabric print'],
    [['leopard', 'cheetah', 'animal print'], 'leopard print pattern, seamless fabric texture macro'],
    [['tie dye', 'tie-dye'], 'colorful tie dye swirl pattern, seamless textile macro'],
    [['galaxy', 'space', 'cosmos', 'stars'], 'deep space galaxy nebula pattern, purple blue stars, seamless dark'],
    [['paint splatter', 'splatter'], 'colorful paint splatter on black, abstract art, seamless'],
    [['glitch', 'matrix', 'digital'], 'green matrix code digital glitch pattern on black, seamless'],
    [['tribal', 'geometric'], 'white tribal geometric pattern on black fabric, seamless macro'],
    [['arabic', 'calligraphy'], 'gold arabic calligraphy pattern on black, seamless ornamental'],
    [['japanese', 'kanji'], 'japanese kanji characters gold on black, seamless pattern'],
    [['chess', 'checkered'], 'black and white checkered chess pattern, seamless fabric'],
    [['money', 'cash', 'dollar'], 'green dollar bill money pattern, seamless fabric print'],
    [['denim', 'jeans'], 'blue denim fabric weave texture, macro close up, seamless'],
    [['web', 'spider'], 'white spider web pattern on black background, seamless'],
    [['batman'], 'batman logo repeating pattern on black, seamless fabric print'],
    [['gradient', 'ombre'], 'smooth gradient fabric texture, dark to light, seamless tile'],
    [['carbon', 'carbon fiber'], 'carbon fiber weave texture, glossy black, seamless macro'],
    [['paisley'], 'paisley pattern on black fabric, ornate, seamless textile macro'],
  ];

  for (const [keywords, desc] of map) {
    if (keywords.some(k => lower.includes(k))) return desc;
  }

  // Custom — describe as a fabric/surface texture
  return `${userPrompt} texture pattern on fabric, seamless close up macro, no faces, no people`;
}
