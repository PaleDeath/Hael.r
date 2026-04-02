import { useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';

/**
 * Scroll-driven brain poses — values copied from the former GSAP timeline
 * (camera + group rotation keyframes spaced evenly over scroll 0→1).
 * Scroll is only OBSERVED (ref + passive listeners); nothing touches the scroll pipeline.
 */
interface BrainPose {
  scrollProgress: number;
  cameraPosition: [number, number, number];
  brainRotation: [number, number, number];
}

const BRAIN_POSES: BrainPose[] = [
  { scrollProgress: 0, cameraPosition: [0, 0, 5], brainRotation: [0, 0, 0] },
  { scrollProgress: 1 / 6, cameraPosition: [-2, 3, 4], brainRotation: [0.08, 0.35, 0] },
  { scrollProgress: 2 / 6, cameraPosition: [3, 2, 5], brainRotation: [0.35, 0.05, 0] },
  { scrollProgress: 3 / 6, cameraPosition: [0, -4, 5], brainRotation: [0.15, -0.4, 0.05] },
  { scrollProgress: 4 / 6, cameraPosition: [-1, 4, 3], brainRotation: [-0.12, 0.75, 0] },
  { scrollProgress: 5 / 6, cameraPosition: [1, 3, 5], brainRotation: [0.1, -0.35, 0.08] },
  { scrollProgress: 1, cameraPosition: [0, 2, 5.5], brainRotation: [0.22, 0.45, 0.06] },
];

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function readDocumentScrollProgress(): number {
  const el = document.documentElement;
  const max = el.scrollHeight - window.innerHeight;
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, window.scrollY / max));
}

interface BrainProps {
  [key: string]: any;
}

/** Higher = snappier catch-up with scroll (lambda for MathUtils.damp). */
const SCROLL_DAMP = 6;

export function Brain(props: BrainProps) {
  const { nodes, materials } = useGLTF('/btest.glb') as any;
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const smoothProgressRef = useRef(0);

  useFrame((state, delta) => {
    const group = ref.current;
    if (!group || !(camera instanceof THREE.PerspectiveCamera)) return;

    const target = readDocumentScrollProgress();
    smoothProgressRef.current = THREE.MathUtils.damp(
      smoothProgressRef.current,
      target,
      SCROLL_DAMP,
      delta,
    );

    const t = smoothProgressRef.current;
    const poses = BRAIN_POSES;

    let fromIdx = 0;
    let toIdx = 1;
    for (let i = 0; i < poses.length - 1; i++) {
      if (t >= poses[i].scrollProgress && t <= poses[i + 1].scrollProgress) {
        fromIdx = i;
        toIdx = i + 1;
        break;
      }
    }
    if (t >= poses[poses.length - 1].scrollProgress) {
      fromIdx = poses.length - 2;
      toIdx = poses.length - 1;
    }

    const from = poses[fromIdx];
    const to = poses[toIdx];
    const range = to.scrollProgress - from.scrollProgress;
    const localT = range > 0 ? (t - from.scrollProgress) / range : 0;
    const eased = smoothstep(localT);

    const [fx, fy, fz] = from.cameraPosition;
    const [tx, ty, tz] = to.cameraPosition;
    camera.position.set(
      THREE.MathUtils.lerp(fx, tx, eased),
      THREE.MathUtils.lerp(fy, ty, eased),
      THREE.MathUtils.lerp(fz, tz, eased),
    );
    camera.lookAt(0, 0, 0);

    const [frx, fry, frz] = from.brainRotation;
    const [trx, try_, trz] = to.brainRotation;
    group.rotation.set(
      THREE.MathUtils.lerp(frx, trx, eased),
      THREE.MathUtils.lerp(fry, try_, eased),
      THREE.MathUtils.lerp(frz, trz, eased),
    );

    const bob = Math.sin(state.clock.elapsedTime) * 0.05;
    group.position.x = bob;
    group.position.y = 0;
    group.position.z = 0;
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
