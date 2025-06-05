import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

interface SceneManagerProps {
  mood?: 'calm' | 'neutral' | 'intense';
}

const SceneManager: React.FC<SceneManagerProps> = ({ mood = 'neutral' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const particlesRef = useRef<THREE.Points>();
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create particles
    const createParticles = () => {
      const geometry = new THREE.BufferGeometry();
      const count = 2000;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      for (let i = 0; i < count * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 10;
        positions[i + 1] = (Math.random() - 0.5) * 10;
        positions[i + 2] = (Math.random() - 0.5) * 10;

        colors[i] = Math.random();
        colors[i + 1] = Math.random();
        colors[i + 2] = Math.random();
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.6
      });

      const particles = new THREE.Points(geometry, material);
      scene.add(particles);
      particlesRef.current = particles;
    };

    createParticles();

    // Animation
    const animate = () => {
      if (!particlesRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;

      particlesRef.current.rotation.x += 0.001;
      particlesRef.current.rotation.y += 0.001;

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      rafRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animate();

    // Handle resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;

      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Mouse interaction
    const handleMouseMove = (event: MouseEvent) => {
      if (!particlesRef.current) return;

      const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

      gsap.to(particlesRef.current.rotation, {
        x: mouseY * 0.1,
        y: mouseX * 0.1,
        duration: 2,
        ease: "power2.out"
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Cleanup
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Update based on mood
  useEffect(() => {
    if (!particlesRef.current) return;

    const material = particlesRef.current.material as THREE.PointsMaterial;
    
    switch (mood) {
      case 'calm':
        gsap.to(material, { size: 0.03, opacity: 0.4, duration: 1 });
        gsap.to(particlesRef.current.rotation, { x: 0, y: 0, duration: 2 });
        break;
      case 'intense':
        gsap.to(material, { size: 0.08, opacity: 0.8, duration: 1 });
        gsap.to(particlesRef.current.rotation, { 
          x: Math.PI * 2,
          y: Math.PI * 2,
          duration: 20,
          repeat: -1,
          ease: "none"
        });
        break;
      default:
        gsap.to(material, { size: 0.05, opacity: 0.6, duration: 1 });
        gsap.to(particlesRef.current.rotation, { x: 0, y: 0, duration: 2 });
    }
  }, [mood]);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.3 }}
    />
  );
};

export default SceneManager; 