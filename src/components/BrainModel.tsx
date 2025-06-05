import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface BrainModelProps {
  modelPath: string;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

const BrainModel: React.FC<BrainModelProps> = ({
  modelPath,
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0]
}) => {
  const modelRef = useRef<THREE.Object3D>(null);

  // Load the 3D model
  const { scene } = useGLTF(modelPath);

  // Setup continuous rotation
  useFrame(() => {
    if (modelRef.current) {
      modelRef.current.rotation.y += 0.005;
    }
  });

  return (
    <primitive 
      ref={modelRef}
      object={scene} 
      scale={scale} 
      position={position}
      rotation={rotation}
    />
  );
};

export default BrainModel; 