import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Brain } from './Brain';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';

export const CanvasContainer: React.FC = () => {
  return (
    <Canvas gl={{ antialias: true }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.5} />
      <pointLight intensity={60} position={[2.39, 3.58, -0.05]} rotation={[-1.83, 0.60, 1.93]} />
      <pointLight intensity={400} decay={2} position={[-3.09, 2.97, -0.80]} rotation={[-1.83, 0.60, 1.93]} />
      <pointLight intensity={100} decay={2} color="#fff8cb" position={[-5.08, -1.04, 0.75]} rotation={[-1.83, 0.60, 1.93]} />
      <Suspense fallback={null}>
        <Brain />
      </Suspense>
      <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
    </Canvas>
  );
};
