import React, { Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

// Brain model component with pendulum movement
const BrainModel = () => {
  const { nodes, materials } = useGLTF('/btest.glb') as any;
  const brainRef = React.useRef<THREE.Group>(null);
  const time = React.useRef(0);

  useFrame((_state) => {
    if (brainRef.current) {
      // Create a pendulum-like movement using sine wave
      time.current += 0.02;
      const swingAngle = Math.sin(time.current) * 0.05; // Reduced swing for subtlety
      
      // Apply smooth position change instead of rotation for more natural movement
      gsap.to(brainRef.current.position, {
        x: swingAngle,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  });

  return (
    <group ref={brainRef}>
      <mesh
        geometry={nodes.Brain_Model006.geometry}
        material={materials['Dark iron']}
        position={[0, -1, 0]}
        rotation={[1.3, 0, 0]}
        scale={[3.7, 3.7, 3.7]}
      />
    </group>
  );
};

// Enhanced loading fallback
const LoadingFallback = () => (
  <mesh>
    <sphereGeometry args={[1.5, 32, 32]} />
    <meshStandardMaterial color="#ff69b4" wireframe />
  </mesh>
);

const RotatingBrainContainer: React.FC = () => {
  return (
    <div className="w-full h-[200px] flex justify-center items-center">
      <div className="w-full h-full">
        <Canvas 
          gl={{ antialias: true }} 
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 6], fov: 45 }}
        >
          {/* Lighting setup from CanvasContainer */}
          <ambientLight intensity={0.5} />
          <pointLight intensity={60} position={[2.39, 3.58, -0.05]} rotation={[-1.83, 0.60, 1.93]} />
          <pointLight intensity={400} decay={2} position={[-3.09, 2.97, -0.80]} rotation={[-1.83, 0.60, 1.93]} />
          <pointLight intensity={100} decay={2} color="#fff8cb" position={[-5.08, -1.04, 0.75]} rotation={[-1.83, 0.60, 1.93]} />
          
          <Suspense fallback={<LoadingFallback />}>
            <BrainModel />
          </Suspense>
          <OrbitControls 
            enableZoom={false} 
            enablePan={false}
            enableRotate={false}
          />
        </Canvas>
      </div>
    </div>
  );
};

export default RotatingBrainContainer; 