import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface BrainProps {
  [key: string]: any;
}

export function Brain(props: BrainProps) {
  const { nodes, materials } = useGLTF('/btest.glb') as any;
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useLayoutEffect(() => {
    const timeline = gsap.timeline({
      defaults: { ease: 'power1.out', duration: 1 },
    });

    const animations = [
      { position: { x: -2, y: 3, z: 4 }, trigger: '.second-section' },
      { position: { x: 3, y: 2, z: 5 }, trigger: '#about' },
      { position: { x: 0, y: -4, z: 5 }, trigger: '#scrollSection1' },
      { position: { x: -1, y: 4, z: 3 }, trigger: '#scrollSection2' },
      { position: { x: 1, y: 3, z: 5 }, trigger: '#scrollSection3' },
    ];

    animations.forEach((anim) => {
      timeline.to(
        camera.position,
        {
          ...anim.position,
          scrollTrigger: {
            trigger: anim.trigger,
            start: 'top center',
            end: 'bottom center',
            scrub: true,
            immediateRender: false,
            invalidateOnRefresh: true,
          },
        },
        "-=1" 
      );
    });

    ScrollTrigger.create({
      trigger: '#scrollSection3', 
      start: 'top top',
      end: 'bottom bottom',
      snap: {
        snapTo: 1,
        duration: { min: 0.2, max: 1 }, 
        ease: 'power1.inOut', 
        delay: 0.1 
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach((instance) => instance.kill());
    };
  }, [camera]);

  useFrame((state) => {
    if (ref.current) {
      gsap.to(ref.current.position, {
        x: Math.sin(state.clock.elapsedTime) * 0.05,
        duration: 0.3, 
        ease: 'power2.out',
      });
    }
  });
  

  return (
    <group {...props} dispose={null} ref={ref}>
      <mesh
        geometry={nodes.Brain_Model006.geometry}
        material={materials['Dark iron']}
        position={[0, -1, 0]}
        rotation={[1.3, 0, 0]}
        scale={[3.7, 3.7, 3.7]}
      />
    </group>
  );
}

useGLTF.preload('/btest.glb');
