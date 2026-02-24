'use client';

import { useRef, useState, useEffect } from 'react';
import { FaceLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface Props {
  onLandmarksDetected: (landmarks: Landmark[]) => void;
  onPhotoLoaded: (dataUrl: string, file: File) => void;
}

export default function FaceMeshDetector({ onLandmarksDetected, onPhotoLoaded }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [status, setStatus] = useState<string>('Ready to upload');

  useEffect(() => {
    async function init() {
      setIsInitializing(true);
      setStatus('Loading face detection model...');
      
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'IMAGE',
          numFaces: 1,
        });
        
        setFaceLandmarker(landmarker);
        setStatus('Ready to upload');
      } catch (err) {
        console.error('Failed to initialize FaceLandmarker:', err);
        setStatus('Failed to load model');
      } finally {
        setIsInitializing(false);
      }
    }
    
    init();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !faceLandmarker) return;

    setStatus('Detecting face...');

    const img = new Image();
    const dataUrl = URL.createObjectURL(file);
    
    img.onload = async () => {
      try {
        const results = faceLandmarker.detect(img);
        
        if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
          setStatus('No face detected. Please upload a clear face photo.');
          return;
        }

        const landmarks = results.faceLandmarks[0];
        setStatus(`✓ Detected ${landmarks.length} facial landmarks`);
        
        // Draw landmarks on canvas for preview
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d')!;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          const drawingUtils = new DrawingUtils(ctx);
          drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_TESSELATION,
            { color: '#00FF00', lineWidth: 1 }
          );
        }

        // Convert to simple format
        const simpleLandmarks: Landmark[] = landmarks.map(lm => ({
          x: lm.x,
          y: lm.y,
          z: lm.z || 0,
        }));

        onLandmarksDetected(simpleLandmarks);
        
        // Convert image to data URL for display
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrlString = e.target?.result as string;
          onPhotoLoaded(dataUrlString, file);
        };
        reader.readAsDataURL(file);

      } catch (err) {
        console.error('Face detection failed:', err);
        setStatus('Face detection failed');
      }
    };

    img.src = dataUrl;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={!faceLandmarker || isInitializing}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer transition-colors font-semibold inline-block disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isInitializing ? 'Loading...' : 'Upload Photo'}
        </label>
      </div>

      <p className="text-sm text-gray-400">{status}</p>

      <canvas
        ref={canvasRef}
        className="max-w-md rounded-xl border border-gray-800"
        style={{ display: canvasRef.current?.width ? 'block' : 'none' }}
      />
    </div>
  );
}
