import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface StressIllustrationProps {
  severity: 'low' | 'moderate' | 'high';
  size?: number;
  animated?: boolean;
}

const StressIllustration: React.FC<StressIllustrationProps> = ({ 
  severity, 
  size = 200,
  animated = true 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const centerRef = useRef<SVGPathElement>(null);
  const particlesRef = useRef<SVGGElement>(null);
  const particle1Ref = useRef<SVGPathElement>(null);
  const particle2Ref = useRef<SVGPathElement>(null);
  const particle3Ref = useRef<SVGPathElement>(null);
  const particle4Ref = useRef<SVGPathElement>(null);
  const waveRef = useRef<SVGPathElement>(null);
  const pulseRingRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (animated && svgRef.current) {
      // Clear any existing animations
      gsap.killTweensOf([
        centerRef.current,
        particlesRef.current,
        particle1Ref.current,
        particle2Ref.current,
        particle3Ref.current,
        particle4Ref.current,
        waveRef.current,
        pulseRingRef.current
      ]);

      // Different animations based on severity
      if (severity === 'high') {
        // Rapid, intense pulsing for high stress
        gsap.to(centerRef.current, {
          scale: 1.15,
          duration: 0.5,
          repeat: -1,
          yoyo: true,
          ease: "power2.inOut"
        });

        // Erratic particle movement
        [particle1Ref.current, particle2Ref.current, particle3Ref.current, particle4Ref.current].forEach((particle, i) => {
          gsap.to(particle, {
            rotation: 360,
            scale: 1.2,
            x: `random(-20, 20)`,
            y: `random(-20, 20)`,
            duration: 0.8,
            repeat: -1,
            yoyo: true,
            delay: i * 0.1,
            ease: "power1.inOut"
          });
        });

        // Rapid wave animation
        gsap.to(waveRef.current, {
          strokeDashoffset: 0,
          duration: 0.7,
          repeat: -1,
          ease: "none"
        });

        // Quick pulse ring
        gsap.to(pulseRingRef.current, {
          scale: 1.5,
          opacity: 0,
          duration: 0.5,
          repeat: -1,
          ease: "power1.out"
        });
      } 
      else if (severity === 'moderate') {
        // Moderate pulsing
        gsap.to(centerRef.current, {
          scale: 1.1,
          duration: 1.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });

        // Moderate particle movement
        [particle1Ref.current, particle2Ref.current, particle3Ref.current, particle4Ref.current].forEach((particle, i) => {
          gsap.to(particle, {
            rotation: 180,
            scale: 1.1,
            x: `random(-10, 10)`,
            y: `random(-10, 10)`,
            duration: 1.5,
            repeat: -1,
            yoyo: true,
            delay: i * 0.2,
            ease: "sine.inOut"
          });
        });

        // Moderate wave animation
        gsap.to(waveRef.current, {
          strokeDashoffset: 0,
          duration: 1.5,
          repeat: -1,
          ease: "none"
        });

        // Moderate pulse ring
        gsap.to(pulseRingRef.current, {
          scale: 1.3,
          opacity: 0,
          duration: 1.2,
          repeat: -1,
          ease: "power1.out"
        });
      } 
      else {
        // Gentle pulsing for low stress
        gsap.to(centerRef.current, {
          scale: 1.05,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });

        // Gentle particle movement
        [particle1Ref.current, particle2Ref.current, particle3Ref.current, particle4Ref.current].forEach((particle, i) => {
          gsap.to(particle, {
            rotation: 90,
            scale: 1.05,
            x: `random(-5, 5)`,
            y: `random(-5, 5)`,
            duration: 2,
            repeat: -1,
            yoyo: true,
            delay: i * 0.3,
            ease: "sine.inOut"
          });
        });

        // Slow wave animation
        gsap.to(waveRef.current, {
          strokeDashoffset: 0,
          duration: 2,
          repeat: -1,
          ease: "none"
        });

        // Gentle pulse ring
        gsap.to(pulseRingRef.current, {
          scale: 1.2,
          opacity: 0,
          duration: 2,
          repeat: -1,
          ease: "power1.out"
        });
      }
    }
  }, [animated, severity]);

  // Colors based on severity
  const getColors = () => {
    switch (severity) {
      case 'high':
        return { 
          center: '#ff6b6b',
          particles: '#ff8787',
          wave: '#ffb1b1',
          pulseRing: '#ffcfcf'
        };
      case 'moderate':
        return { 
          center: '#ffa06b',
          particles: '#ffbc8c',
          wave: '#ffd4b1',
          pulseRing: '#ffe6cf'
        };
      case 'low':
        return { 
          center: '#82c0ff',
          particles: '#a9d4ff',
          wave: '#cfe4ff',
          pulseRing: '#e6f1ff'
        };
      default:
        return { 
          center: '#82c0ff',
          particles: '#a9d4ff',
          wave: '#cfe4ff',
          pulseRing: '#e6f1ff'
        };
    }
  };

  const { center, particles, wave, pulseRing } = getColors();

  return (
    <svg 
      ref={svgRef}
      width={size} 
      height={size} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Pulse Ring */}
      <circle
        ref={pulseRingRef}
        cx="100"
        cy="100"
        r="40"
        stroke={pulseRing}
        strokeWidth="2"
        fill="none"
        style={{ transformOrigin: 'center' }}
      />

      {/* Wave Pattern */}
      <path
        ref={waveRef}
        d="M60,100 Q80,80 100,100 Q120,120 140,100"
        stroke={wave}
        strokeWidth="2"
        fill="none"
        strokeDasharray="120"
        strokeDashoffset="120"
        style={{ transformOrigin: 'center' }}
      />

      {/* Center Shape */}
      <path
        ref={centerRef}
        d="M100,60 C120,60 140,80 140,100 C140,120 120,140 100,140 C80,140 60,120 60,100 C60,80 80,60 100,60 Z"
        fill={center}
        style={{ transformOrigin: 'center' }}
      />

      {/* Stress Particles */}
      <g ref={particlesRef}>
        <path
          ref={particle1Ref}
          d="M85,85 L90,80 L95,85 L90,90 Z"
          fill={particles}
          style={{ transformOrigin: 'center' }}
        />
        <path
          ref={particle2Ref}
          d="M105,85 L110,80 L115,85 L110,90 Z"
          fill={particles}
          style={{ transformOrigin: 'center' }}
        />
        <path
          ref={particle3Ref}
          d="M85,115 L90,110 L95,115 L90,120 Z"
          fill={particles}
          style={{ transformOrigin: 'center' }}
        />
        <path
          ref={particle4Ref}
          d="M105,115 L110,110 L115,115 L110,120 Z"
          fill={particles}
          style={{ transformOrigin: 'center' }}
        />
      </g>
    </svg>
  );
};

export default StressIllustration; 