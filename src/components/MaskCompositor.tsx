'use client';

import React, {
  useRef, useEffect, useImperativeHandle, forwardRef, useCallback
} from 'react';
import { MaskDefinition } from '@/utils/maskTypes';

interface Landmark { x: number; y: number; z: number; }

interface Props {
  photo: string;
  landmarks: Landmark[];
  maskDefinition: MaskDefinition;
  textureBase64: string | null;
  solidColor: string;
  hairImageData: ImageData | null;
  isGenerating?: boolean;
}

export interface MaskCompositorHandle {
  download: (filename?: string) => void;
}

const LM = {
  TOP_HEAD:    10,
  CHIN:       152,
  LEFT_EAR:   234,
  RIGHT_EAR:  454,
};

const LEFT_EYE  = [33,246,161,160,159,158,157,173,133,155,154,153,145,144,163,7];
const RIGHT_EYE = [362,398,384,385,386,387,388,466,263,249,390,373,374,380,381,382];
const MOUTH_PTS = [78, 13, 308, 14];

const MaskCompositor = forwardRef<MaskCompositorHandle, Props>(
  ({ photo, landmarks, maskDefinition, textureBase64, solidColor, hairImageData, isGenerating }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useImperativeHandle(ref, () => ({
      download: (filename = 'mask.png') => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = filename;
        link.click();
      }
    }));

    const draw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas || !photo || landmarks.length < 468) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const photoImg = new Image();
      photoImg.src = photo;
      photoImg.onload = () => {
        const W = photoImg.naturalWidth;
        const H = photoImg.naturalHeight;
        canvas.width  = W;
        canvas.height = H;

        // Just draw photo - don't erase anything
        ctx.drawImage(photoImg, 0, 0, W, H);

        const maskPath = buildMaskPath(landmarks, W, H);

        if (textureBase64) {
          const texImg = new Image();
          texImg.src = `data:image/png;base64,${textureBase64}`;
          texImg.onload = () => {
            const pattern = ctx.createPattern(texImg, 'repeat');
            if (!pattern) return;
            const headW = getHeadWidth(landmarks, W, H);
            const scale = headW / texImg.naturalWidth;
            const m = new DOMMatrix();
            const anchor = { x: px(landmarks, LM.LEFT_EAR, W), y: py(landmarks, LM.TOP_HEAD, H) };
            m.translateSelf(anchor.x, anchor.y);
            m.scaleSelf(scale, scale);
            pattern.setTransform(m);
            ctx.save();
            ctx.clip(maskPath, 'evenodd');
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
            drawEdge(ctx, landmarks, W, H);
          };
        } else {
          ctx.save();
          ctx.clip(maskPath, 'evenodd');
          ctx.fillStyle = solidColor;
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
          drawEdge(ctx, landmarks, W, H);
        }
      };
    }, [photo, landmarks, maskDefinition, textureBase64, solidColor, hairImageData]);

    useEffect(() => { draw(); }, [draw]);

    return (
      <div className="relative inline-block rounded-xl overflow-hidden shadow-2xl">
        <canvas ref={canvasRef} className="max-w-full h-auto block" style={{ maxHeight: '80vh' }} />

        {isGenerating && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-white text-sm font-medium">Generating texture…</p>
          </div>
        )}

        {textureBase64 && !isGenerating && (
          <div className="absolute bottom-3 right-3 bg-green-600/90 text-white text-xs px-2 py-1 rounded-full">
            ✓ texture applied
          </div>
        )}
      </div>
    );
  }
);

function px(lm: Landmark[], i: number, W: number) { return lm[i].x * W; }
function py(lm: Landmark[], i: number, H: number) { return lm[i].y * H; }

function getHeadWidth(lm: Landmark[], W: number, H: number) {
  return Math.abs(px(lm, LM.RIGHT_EAR, W) - px(lm, LM.LEFT_EAR, W));
}

function buildMaskPath(lm: Landmark[], W: number, H: number): Path2D {
  const topY    = py(lm, LM.TOP_HEAD, H);
  const chinY   = py(lm, LM.CHIN, H);
  const leftX   = px(lm, LM.LEFT_EAR, W);
  const rightX  = px(lm, LM.RIGHT_EAR, W);
  const centerX = (leftX + rightX) / 2;
  const faceW   = rightX - leftX;
  const faceH   = chinY - topY;

  // Simple balaclava - starts at forehead, ends at base of neck
  const topMask    = topY;  // starts at natural forehead line
  const bottomMask = chinY + faceH * 0.5;  // extends to collar area
  
  // Consistent width - simple cylinder
  const maskW = faceW * 0.65;
  const left  = centerX - maskW;
  const right = centerX + maskW;

  const p = new Path2D();

  // Simple rounded rectangle shape
  const cornerR = faceW * 0.25;

  p.moveTo(left + cornerR, topMask);
  
  // Top edge
  p.lineTo(right - cornerR, topMask);
  p.arcTo(right, topMask, right, topMask + cornerR, cornerR);
  
  // Right edge
  p.lineTo(right, bottomMask - cornerR);
  p.arcTo(right, bottomMask, right - cornerR, bottomMask, cornerR);
  
  // Bottom edge
  p.lineTo(left + cornerR, bottomMask);
  p.arcTo(left, bottomMask, left, bottomMask - cornerR, cornerR);
  
  // Left edge
  p.lineTo(left, topMask + cornerR);
  p.arcTo(left, topMask, left + cornerR, topMask, cornerR);
  
  p.closePath();

  // Eye holes
  addHoleCCW(p, LEFT_EYE,  lm, W, H);
  addHoleCCW(p, RIGHT_EYE, lm, W, H);

  // Mouth hole
  const mLeft   = lm[MOUTH_PTS[0]].x * W;
  const mTop    = lm[MOUTH_PTS[1]].y * H;
  const mRight  = lm[MOUTH_PTS[2]].x * W;
  const mBottom = lm[MOUTH_PTS[3]].y * H;
  const mCX = (mLeft + mRight) / 2;
  const mCY = (mTop + mBottom) / 2;
  const mRX = (mRight - mLeft) * 0.35;
  const mRY = (mBottom - mTop) * 0.45;
  p.ellipse(mCX, mCY, mRX, mRY, 0, 0, Math.PI * 2, true);

  return p;
}

function addHoleCCW(path: Path2D, indices: number[], lm: Landmark[], W: number, H: number) {
  const rev = [...indices].reverse();
  path.moveTo(lm[rev[0]].x * W, lm[rev[0]].y * H);
  for (let i = 1; i < rev.length; i++) {
    path.lineTo(lm[rev[i]].x * W, lm[rev[i]].y * H);
  }
  path.closePath();
}

function drawEdge(ctx: CanvasRenderingContext2D, lm: Landmark[], W: number, H: number) {
  const topY    = py(lm, LM.TOP_HEAD, H);
  const chinY   = py(lm, LM.CHIN, H);
  const leftX   = px(lm, LM.LEFT_EAR, W);
  const rightX  = px(lm, LM.RIGHT_EAR, W);
  const centerX = (leftX + rightX) / 2;
  const faceW   = rightX - leftX;
  const faceH   = chinY - topY;
  const topMask    = topY;
  const bottomMask = chinY + faceH * 0.5;
  const maskW = faceW * 0.65;
  const left  = centerX - maskW;
  const right = centerX + maskW;
  const cornerR = faceW * 0.25;

  const e = new Path2D();
  e.moveTo(left + cornerR, topMask);
  e.lineTo(right - cornerR, topMask);
  e.arcTo(right, topMask, right, topMask + cornerR, cornerR);
  e.lineTo(right, bottomMask - cornerR);
  e.arcTo(right, bottomMask, right - cornerR, bottomMask, cornerR);
  e.lineTo(left + cornerR, bottomMask);
  e.arcTo(left, bottomMask, left, bottomMask - cornerR, cornerR);
  e.lineTo(left, topMask + cornerR);
  e.arcTo(left, topMask, left + cornerR, topMask, cornerR);
  e.closePath();

  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 3;
  ctx.stroke(e);
  ctx.restore();
}

MaskCompositor.displayName = 'MaskCompositor';
export default MaskCompositor;
