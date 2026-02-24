'use client';

import { useState, useRef } from 'react';
import FaceMeshDetector from '@/components/FaceMeshDetector';
import { MASK_DEFINITION } from '@/utils/maskTypes';

interface Landmark { x: number; y: number; z: number; }

const SOLID_COLORS = [
  { label: '⚫ Black',  value: '#000000' },
  { label: '⚪ White',  value: '#FFFFFF' },
  { label: '🔴 Red',    value: '#CC0000' },
  { label: '🔵 Navy',   value: '#001F5B' },
  { label: '🟢 Green',  value: '#003300' },
  { label: '🟤 Brown',  value: '#3B1A08' },
  { label: '🟣 Purple', value: '#2D0057' },
  { label: '🟠 Orange', value: '#CC4400' },
];

const TEXTURE_SUGGESTIONS = [
  'camo', 'snake skin', 'flames', 'circuit board', 'skull',
  'galaxy', 'gold', 'chrome', 'leopard print', 'lace',
  'diamond', 'tribal', 'glitch', 'carbon fiber', 'spider web',
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Home() {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [solidColor, setSolidColor] = useState<string>('#000000');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [processingTime, setProcessingTime] = useState<number | null>(null);

  const handlePhotoLoaded = async (dataUrl: string, file: File) => {
    setPhoto(dataUrl);
    setPhotoFile(file);
    setResultUrl(null);
  };

  const handleSolidColor = (color: string) => {
    setSolidColor(color);
    setResultUrl(null);
  };

  const handleGenerateTexture = async (prompt: string) => {
    if (!photo || !photoFile || landmarks.length === 0 || !prompt.trim()) return;
    setIsGenerating(true);
    setResultUrl(null);

    try {
      const formData = new FormData();
      formData.append('image', photoFile);
      formData.append('landmarks', JSON.stringify(landmarks));
      formData.append('maskType', MASK_DEFINITION.id);
      formData.append('prompt', prompt);
      formData.append('solidColor', solidColor);

      const response = await fetch(`${API_URL}/api/process-mask`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Processing failed');
      }

      const data = await response.json();
      setResultUrl(`${API_URL}${data.resultUrl}`);
      setProcessingTime(data.processingTime);

    } catch (err) {
      console.error('Texture generation failed:', err);
      alert(err instanceof Error ? err.message : 'Failed to generate texture');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = `mask-${customPrompt || 'result'}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="container mx-auto px-4 max-w-2xl">

        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Slofcoffee Mask Engine
          </h1>
          <p className="text-gray-500 text-sm">
            AI-powered balaclava mask generator · Backend processing
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <FaceMeshDetector
            onLandmarksDetected={setLandmarks}
            onPhotoLoaded={handlePhotoLoaded}
          />
        </div>

        {landmarks.length > 0 && photo && (
          <>
            {/* Preview */}
            <div className="flex justify-center mb-8">
              {resultUrl ? (
                <div className="relative">
                  <img
                    src={resultUrl}
                    alt="Generated mask result"
                    className="rounded-xl max-h-96 object-contain border border-gray-800"
                  />
                  {processingTime && (
                    <div className="absolute bottom-3 right-3 bg-green-600/90 text-white text-xs px-2 py-1 rounded-full">
                      ✓ {(processingTime / 1000).toFixed(1)}s
                    </div>
                  )}
                </div>
              ) : (
                <img
                  src={photo}
                  alt="Original"
                  className="rounded-xl max-h-96 object-contain border border-gray-800"
                />
              )}
            </div>

            {/* Solid Colors */}
            <div className="mb-6">
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">
                Solid Colors — instant
              </p>
              <div className="flex flex-wrap gap-2">
                {SOLID_COLORS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => handleSolidColor(value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      solidColor === value && !resultUrl
                        ? 'border-blue-500 bg-blue-600/20 text-white'
                        : 'border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-gray-600 text-xs uppercase tracking-widest">or AI texture</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            {/* AI Texture */}
            <div className="mb-6">
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">
                AI Generated Textures
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {TEXTURE_SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => { setCustomPrompt(s); handleGenerateTexture(s); }}
                    disabled={isGenerating}
                    className="px-3 py-1.5 rounded-full bg-gray-900 border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white text-xs transition-colors disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGenerateTexture(customPrompt)}
                  placeholder="Custom texture… e.g. 'neon graffiti'"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  onClick={() => handleGenerateTexture(customPrompt)}
                  disabled={isGenerating || !customPrompt.trim()}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors text-sm font-semibold whitespace-nowrap"
                >
                  {isGenerating ? 'Generating…' : 'Generate'}
                </button>
              </div>

              {isGenerating && (
                <div className="mt-4 flex items-center gap-3 text-gray-400 text-sm">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span>Processing with AI backend… this may take 30-60 seconds</span>
                </div>
              )}
            </div>

            {/* Download */}
            {resultUrl && (
              <div className="flex justify-center mt-2">
                <button
                  onClick={handleDownload}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold text-sm"
                >
                  ↓ Download
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
