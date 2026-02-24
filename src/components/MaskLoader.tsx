'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as THREE from 'three';
import { normalizedToWorld, calculateOptimalFaceScale, validateLandmarks } from '@/utils/coordinates';
import { LANDMARK_INDICES } from '@/utils/landmarks';

interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface MaskAnchors {
  noseTip: THREE.Vector3;
  leftCheek: THREE.Vector3;
  rightCheek: THREE.Vector3;
  chin: THREE.Vector3;
  forehead: THREE.Vector3;
}

interface MaskModel {
  id: string;
  name: string;
  url: string;
  type: 'glb' | 'obj';
  scale: number;
}

interface MaskLoaderProps {
  landmarks: Landmark[];
  selectedMask?: string;
  generatedTexture?: any;
  onMaskLoaded?: (mask: THREE.Group | null) => void;
}

// Predefined mask models
const MASK_MODELS: MaskModel[] = [
  {
    id: 'simple-mask',
    name: 'Simple Face Mask',
    url: '/models/simple-mask.glb',
    type: 'glb',
    scale: 1.0,
  },
  {
    id: 'hero-mask',
    name: 'Hero Mask',
    url: '/models/hero-mask.glb',
    type: 'glb',
    scale: 1.2,
  },
  {
    id: 'clown-mask',
    name: 'Clown Mask',
    url: '/models/clown-mask.obj',
    type: 'obj',
    scale: 0.9,
  }
];

const Mask = React.forwardRef<THREE.Group, {
  maskModel: MaskModel;
  faceAnchors: MaskAnchors;
  faceScale: number;
  visible: boolean;
  generatedTexture?: any;
}>(({ maskModel, faceAnchors, faceScale, visible, generatedTexture }, ref) => {

  // Calculate face transform based on landmark anchors in 3D world space
  const faceTransform = React.useMemo(() => {
    if (!faceAnchors.noseTip || !faceAnchors.leftCheek || !faceAnchors.rightCheek || !faceAnchors.chin || !faceAnchors.forehead) {
      return null;
    }

    // Position mask at nose tip
    const position = faceAnchors.noseTip.clone();

    // Compute face width (distance between cheeks)
    const faceWidth = faceAnchors.rightCheek.distanceTo(faceAnchors.leftCheek);

    // Compute head orientation
    // Forward direction: from forehead to chin
    const forward = new THREE.Vector3()
      .subVectors(faceAnchors.chin, faceAnchors.forehead)
      .normalize();

    // Up direction: from nose to forehead
    const up = new THREE.Vector3()
      .subVectors(faceAnchors.forehead, faceAnchors.noseTip)
      .normalize();

    // Right direction: cross product of forward and up
    const right = new THREE.Vector3()
      .crossVectors(forward, up)
      .normalize();

    // Recalculate up to ensure orthogonality
    const correctedUp = new THREE.Vector3()
      .crossVectors(right, forward)
      .normalize();

    // Create rotation matrix
    const rotationMatrix = new THREE.Matrix4().makeBasis(right, correctedUp, forward);

    // Compute scale factor based on face width
    const scaleFactor = faceWidth * maskModel.scale;

    return {
      position,
      rotation: new THREE.Euler().setFromRotationMatrix(rotationMatrix),
      scale: scaleFactor
    };
  }, [faceAnchors, maskModel.scale]);

  useFrame(() => {
    if (ref && 'current' in ref && ref.current && faceTransform) {
      ref.current.position.copy(faceTransform.position);
      ref.current.rotation.copy(faceTransform.rotation);
      ref.current.scale.setScalar(faceTransform.scale);
      ref.current.visible = visible;
    }
  });

  if (!faceTransform) {
    return null;
  }

  // Create placeholder geometric masks based on mask type
  const createMaskGeometry = (texture: any) => {
    // Use generated texture if available
    let materialProps: any = {};

    if (texture) {
      // Create texture from generated data
      const baseColorTexture = new THREE.DataTexture(
        generatedTexture.baseColor,
        generatedTexture.width,
        generatedTexture.height,
        THREE.RGBAFormat,
        THREE.UnsignedByteType
      );
      baseColorTexture.needsUpdate = true;

      const normalTexture = new THREE.DataTexture(
        generatedTexture.normalMap,
        generatedTexture.width,
        generatedTexture.height,
        THREE.RGBAFormat,
        THREE.UnsignedByteType
      );
      normalTexture.needsUpdate = true;

      const roughnessTexture = new THREE.DataTexture(
        generatedTexture.roughnessMap,
        generatedTexture.width,
        generatedTexture.height,
        THREE.RedFormat,
        THREE.UnsignedByteType
      );
      roughnessTexture.needsUpdate = true;

      const metalnessTexture = new THREE.DataTexture(
        generatedTexture.metalnessMap,
        generatedTexture.width,
        generatedTexture.height,
        THREE.RedFormat,
        THREE.UnsignedByteType
      );
      metalnessTexture.needsUpdate = true;

      materialProps = {
        map: baseColorTexture,
        normalMap: normalTexture,
        roughnessMap: roughnessTexture,
        metalnessMap: metalnessTexture,
        transparent: true,
        opacity: 0.9,
      };
    }

    switch (maskModel.id) {
      case 'simple-mask':
        return (
          <mesh>
            <boxGeometry args={[1, 0.8, 0.2]} />
            <meshStandardMaterial
              {...materialProps}
              color={texture ? undefined : 0x4a90e2}
              transparent
              opacity={0.8}
            />
          </mesh>
        );
      case 'hero-mask':
        return (
          <group>
            <mesh>
              <boxGeometry args={[1.2, 1, 0.3]} />
              <meshStandardMaterial
                {...materialProps}
                color={texture ? undefined : 0xffd700}
                transparent
                opacity={0.9}
              />
            </mesh>
            {/* Hero mask details */}
            <mesh position={[0, 0.2, 0.16]}>
              <boxGeometry args={[0.8, 0.1, 0.01]} />
              <meshStandardMaterial
                {...materialProps}
                color={generatedTexture ? undefined : 0xff0000}
              />
            </mesh>
          </group>
        );
      case 'clown-mask':
        return (
          <group>
            <mesh>
              <sphereGeometry args={[0.6, 16, 16]} />
              <meshStandardMaterial
                {...materialProps}
                color={texture ? undefined : 0xff69b4}
                transparent
                opacity={0.8}
              />
            </mesh>
            {/* Clown nose */}
            <mesh position={[0, -0.1, 0.4]}>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshStandardMaterial
                {...materialProps}
                color={generatedTexture ? undefined : 0xff0000}
              />
            </mesh>
          </group>
        );
      default:
        return (
          <mesh>
            <boxGeometry args={[1, 0.8, 0.2]} />
            <meshStandardMaterial
              {...materialProps}
              color={texture ? undefined : 0xcccccc}
              transparent
              opacity={0.7}
            />
          </mesh>
        );
    }
  };

  return (
    <group ref={ref}>
      {createMaskGeometry(generatedTexture)}
    </group>
  );
});

export default React.forwardRef<THREE.Group, MaskLoaderProps>(({ landmarks, selectedMask, generatedTexture, onMaskLoaded }, ref) => {
  const [currentMask, setCurrentMask] = useState<MaskModel | null>(null);
  const [maskAnchors, setMaskAnchors] = useState<MaskAnchors | null>(null);
  const [faceScale, setFaceScale] = useState<number>(2.0);

  // Extract face anchors from landmarks and convert to 3D world space
  useEffect(() => {
    if (landmarks.length >= 468 && validateLandmarks(landmarks)) {
      // Calculate optimal scale
      const scale = calculateOptimalFaceScale(landmarks, 2.0);
      setFaceScale(scale);

      // Extract anchor points from landmarks
      const anchors: MaskAnchors = {
        noseTip: normalizedToWorld(landmarks[LANDMARK_INDICES.noseTip], scale),
        leftCheek: normalizedToWorld(landmarks[LANDMARK_INDICES.leftCheek], scale),
        rightCheek: normalizedToWorld(landmarks[LANDMARK_INDICES.rightCheek], scale),
        chin: normalizedToWorld(landmarks[LANDMARK_INDICES.chin], scale),
        forehead: normalizedToWorld(landmarks[LANDMARK_INDICES.foreheadCenter], scale)
      };
      setMaskAnchors(anchors);
    }
  }, [landmarks]);

  // Load selected mask
  useEffect(() => {
    if (selectedMask) {
      const mask = MASK_MODELS.find(m => m.id === selectedMask);
      setCurrentMask(mask || null);
    } else {
      setCurrentMask(null);
    }
  }, [selectedMask]);

  // Notify parent when mask is loaded
  useEffect(() => {
    onMaskLoaded?.(currentMask ? {} as THREE.Group : null);
  }, [currentMask, onMaskLoaded]);

  if (!currentMask || !maskAnchors) {
    return null;
  }

  return (
    <Mask
      ref={ref}
      maskModel={currentMask}
      faceAnchors={maskAnchors}
      faceScale={faceScale}
      visible={!!selectedMask}
      generatedTexture={generatedTexture}
    />
  );
});




// Export mask models for UI selection
export { MASK_MODELS };
export type { MaskModel };
