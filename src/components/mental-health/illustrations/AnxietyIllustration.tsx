import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface AnxietyIllustrationProps {
  severity: 'low' | 'moderate' | 'high';
  size?: number;
  animated?: boolean;
}

const AnxietyIllustration: React.FC<AnxietyIllustrationProps> = ({ 
  severity, 
  size = 200,
  animated = true 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const brainRef = useRef<SVGPathElement>(null);
  const thoughtsRef = useRef<SVGGElement>(null);
  const circleOneRef = useRef<SVGCircleElement>(null);
  const circleTwoRef = useRef<SVGCircleElement>(null);
  const circleThreeRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (animated && svgRef.current) {
      // Initial setup
      gsap.set([circleOneRef.current, circleTwoRef.current, circleThreeRef.current], {
        scale: 0,
        transformOrigin: 'center'
      });

      // Animate brain
      const timeline = gsap.timeline({
        repeat: -1,
        yoyo: true
      });

      // Different animations based on severity
      if (severity === 'high') {
        // Rapid, intense pulsing for high anxiety
        timeline.to(brainRef.current, {
          duration: 0.7,
          scale: 1.03,
          ease: "sine.inOut"
        });

        // Rapid thought circles
        gsap.to(circleOneRef.current, {
          scale: 1,
          opacity: 0.7,
          duration: 0.7,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut"
        });
        gsap.to(circleTwoRef.current, {
          scale: 1,
          opacity: 0.5,
          duration: 0.8,
          delay: 0.2,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut"
        });
        gsap.to(circleThreeRef.current, {
          scale: 1,
          opacity: 0.3,
          duration: 0.9,
          delay: 0.4,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut"
        });
      } else if (severity === 'moderate') {
        // Moderate pulsing
        timeline.to(brainRef.current, {
          duration: 1.3,
          scale: 1.02,
          ease: "sine.inOut"
        });

        // Moderate thought circles
        gsap.to(circleOneRef.current, {
          scale: 1,
          opacity: 0.6,
          duration: 1.3,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut"
        });
        gsap.to(circleTwoRef.current, {
          scale: 1,
          opacity: 0.4,
          duration: 1.5,
          delay: 0.3,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut"
        });
        gsap.to(circleThreeRef.current, {
          scale: 1,
          opacity: 0.2,
          duration: 1.7,
          delay: 0.6,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut"
        });
      } else {
        // Slow, gentle pulsing for low anxiety
        timeline.to(brainRef.current, {
          duration: 2,
          scale: 1.01,
          ease: "sine.inOut"
        });

        // Slow thought circles
        gsap.to(circleOneRef.current, {
          scale: 1,
          opacity: 0.4,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut"
        });
        gsap.to(circleTwoRef.current, {
          scale: 1,
          opacity: 0.3,
          duration: 2.2,
          delay: 0.5,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut"
        });
        gsap.to(circleThreeRef.current, {
          scale: 1,
          opacity: 0.1,
          duration: 2.4,
          delay: 1,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut"
        });
      }
    }
  }, [animated, severity]);

  // Colors based on severity
  const getColors = () => {
    switch (severity) {
      case 'high':
        return { 
          brain: '#ff6b6b', 
          thoughts: '#ff8787',
          strokeWidth: 2
        };
      case 'moderate':
        return { 
          brain: '#ffa06b', 
          thoughts: '#ffbc8c',
          strokeWidth: 1.5
        };
      case 'low':
        return { 
          brain: '#82c0ff', 
          thoughts: '#a9d4ff',
          strokeWidth: 1
        };
      default:
        return { 
          brain: '#82c0ff', 
          thoughts: '#a9d4ff',
          strokeWidth: 1
        };
    }
  };

  const { brain, thoughts, strokeWidth } = getColors();

  return (
    <svg 
      ref={svgRef}
      width={size} 
      height={size} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Brain */}
      <path
        ref={brainRef}
        d="M100,65 C90,50 70,45 55,50 C40,55 30,70 35,85 C40,100 45,110 50,120 C55,130 60,135 70,140 C80,145 90,150 100,155 C110,150 120,145 130,140 C140,135 145,130 150,120 C155,110 160,100 165,85 C170,70 160,55 145,50 C130,45 110,50 100,65 Z"
        fill={brain}
        stroke="#333"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        style={{ transformOrigin: 'center' }}
      />

      {/* Thoughts/Worry circles */}
      <g ref={thoughtsRef}>
        <circle 
          ref={circleOneRef} 
          cx="60" 
          cy="40" 
          r="12" 
          fill={thoughts} 
          opacity="0.6" 
        />
        <circle 
          ref={circleTwoRef} 
          cx="85" 
          cy="25" 
          r="8" 
          fill={thoughts} 
          opacity="0.4" 
        />
        <circle 
          ref={circleThreeRef} 
          cx="110" 
          cy="30" 
          r="10" 
          fill={thoughts} 
          opacity="0.5" 
        />
      </g>
    </svg>
  );
};

export default AnxietyIllustration; 