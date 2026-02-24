'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { normalizedToWorld, calculateOptimalFaceScale, validateLandmarks } from '@/utils/coordinates';
import { getFaceTriangles, validateTriangles } from '@/utils/triangulation';
import MaskLoader, { MASK_MODELS, type MaskModel } from '@/components/MaskLoader';

interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface FaceMesh3DProps {
  landmarks: Landmark[];
  selectedMask?: string;
  generatedTexture?: any;
}

const FaceMesh = React.forwardRef<THREE.Mesh, { landmarks: Landmark[] }>(({ landmarks }, ref) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.Mesh>(null);

  // Convert normalized landmarks to 3D coordinates with proper coordinate system
  const { geometry, material, wireframeGeometry } = useMemo(() => {
    if (landmarks.length === 0 || !validateLandmarks(landmarks)) {
      return {
        geometry: new THREE.BufferGeometry(),
        material: new THREE.MeshStandardMaterial(),
        wireframeGeometry: new THREE.BufferGeometry()
      };
    }

    // Calculate optimal scale based on face size
    const faceScale = calculateOptimalFaceScale(landmarks, 2.0);
    const vertices: number[] = [];
    const uvs: number[] = [];

    // Convert landmarks from normalized space to 3D world space
    landmarks.forEach((landmark) => {
      const worldPos = normalizedToWorld(landmark, faceScale);
      vertices.push(worldPos.x, worldPos.y, worldPos.z);
      uvs.push(landmark.x, landmark.y);
    });

    // Get proper triangulation indices
    const triangleIndices = getFaceTriangles();

    // Validate triangles
    if (!validateTriangles(triangleIndices, landmarks.length)) {
      console.warn('Invalid triangle indices detected');
      return {
        geometry: new THREE.BufferGeometry(),
        material: new THREE.MeshPhongMaterial(),
        wireframeGeometry: new THREE.BufferGeometry()
      };
    }

    // Create main geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(triangleIndices), 1));
    geometry.computeVertexNormals();

    // Create material with proper lighting
    const material = new THREE.MeshStandardMaterial({
      color: 0xffdbac,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      roughness: 0.5,
      metalness: 0.0,
    });

    // Create wireframe geometry (same as main geometry)
    const wireframeGeometry = geometry.clone();

    return { geometry, material, wireframeGeometry };
  }, [landmarks]);

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle animation to show it's 3D
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  if (landmarks.length === 0) {
    return null;
  }

  return (
    <group>
      {/* Main face mesh */}
      <mesh ref={meshRef} geometry={geometry} material={material} />
      
      {/* Wireframe overlay */}
      <mesh ref={wireframeRef} geometry={wireframeGeometry}>
        <meshBasicMaterial
          color={0x000000}
          wireframe
          transparent
          opacity={0.1}
          depthTest={true}
        />
      </mesh>
    </group>
  );
});

// Inner component that uses useFrame - must be child of Canvas
function SceneContent({ landmarks, selectedMask, generatedTexture }: FaceMesh3DProps) {
  const maskRef = useRef<THREE.Group>(null);
  const textureToApply = useRef(generatedTexture);

  // Update ref when generatedTexture changes
  useEffect(() => {
    textureToApply.current = generatedTexture;
  }, [generatedTexture]);

  // Apply texture in render loop when ready
  useFrame(() => {
    if (textureToApply.current && maskRef.current && maskRef.current.children[0]) {
      const maskMesh = maskRef.current.children[0] as THREE.Mesh;
      if (!maskMesh.material) return;
      const mat = maskMesh.material as THREE.MeshStandardMaterial;
      if (!mat.map) {
        console.log('Applying texture maps to material');

        const { baseColor, normalMap, roughnessMap, metalnessMap, width, height } = textureToApply.current;

        const baseTexture = new THREE.DataTexture(baseColor, width, height, THREE.RGBAFormat);
        baseTexture.flipY = false;
        baseTexture.needsUpdate = true;

        const normalTexture = new THREE.DataTexture(normalMap, width, height, THREE.RGBAFormat);
        normalTexture.flipY = false;
        normalTexture.needsUpdate = true;

        const roughnessTexture = new THREE.DataTexture(roughnessMap, width, height, THREE.RedFormat);
        roughnessTexture.flipY = false;
        roughnessTexture.needsUpdate = true;

        const metalnessTexture = new THREE.DataTexture(metalnessMap, width, height, THREE.RedFormat);
        metalnessTexture.flipY = false;
        metalnessTexture.needsUpdate = true;

        [baseTexture, normalTexture, roughnessTexture, metalnessTexture].forEach(tex => {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        });

        mat.map = baseTexture;
        mat.normalMap = normalTexture;
        mat.roughnessMap = roughnessTexture;
        mat.metalnessMap = metalnessTexture;
        mat.needsUpdate = true;

        console.log('Texture applied successfully');
        textureToApply.current = null; // prevent re-apply
      }
    }
  });

  // Cleanup textures on unmount/change
  useEffect(() => {
    return () => {
      if (maskRef.current && maskRef.current.children[0]) {
        const maskMesh = maskRef.current.children[0] as THREE.Mesh;
        if (maskMesh.material) {
          const mat = maskMesh.material as THREE.MeshStandardMaterial;
          if (mat.map) mat.map.dispose();
          if (mat.normalMap) mat.normalMap.dispose();
          if (mat.roughnessMap) mat.roughnessMap.dispose();
          if (mat.metalnessMap) mat.metalnessMap.dispose();
        }
      }
    };
  }, [generatedTexture]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 3]} />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1}
        maxDistance={10}
      />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.8}
        castShadow
      />
      <directionalLight
        position={[-10, -10, -5]}
        intensity={0.4}
      />

      {/* 3D Face Mesh */}
      <FaceMesh landmarks={landmarks} />

      {/* 3D Mask */}
      {selectedMask && landmarks.length > 0 && (
  <MaskLoader
    ref={maskRef}
    landmarks={landmarks}
    selectedMask={selectedMask}
    generatedTexture={generatedTexture}
  />
)}

      {/* Ground plane for reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial color={0x333333} transparent opacity={0.3} />
      </mesh>
    </>
  );
}

export default function FaceMesh3D({ landmarks, selectedMask, generatedTexture }: FaceMesh3DProps) {
  console.log('FaceMesh3D rendered with generatedTexture:', generatedTexture);

  return (
    <div className="w-full h-96 bg-gray-900 rounded-lg overflow-hidden">
      <Canvas>
        <SceneContent 
          landmarks={landmarks} 
          selectedMask={selectedMask} 
          generatedTexture={generatedTexture} 
        />
      </Canvas>
    </div>
  );
}
