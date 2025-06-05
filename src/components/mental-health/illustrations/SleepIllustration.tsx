import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface SleepIllustrationProps {
  severity: 'low' | 'moderate' | 'high';
  size?: number;
  animated?: boolean;
}

const SleepIllustration: React.FC<SleepIllustrationProps> = ({ 
  severity, 
  size = 200,
  animated = true 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const moonRef = useRef<SVGPathElement>(null);
  const starOneRef = useRef<SVGPathElement>(null);
  const starTwoRef = useRef<SVGPathElement>(null);
  const starThreeRef = useRef<SVGPathElement>(null);
  const zOneRef = useRef<SVGTextElement>(null);
  const zTwoRef = useRef<SVGTextElement>(null);
  const zThreeRef = useRef<SVGTextElement>(null);

  useEffect(() => {
    if (animated && svgRef.current) {
      // Clear any existing animations
      gsap.killTweensOf([
        moonRef.current,
        starOneRef.current,
        starTwoRef.current,
        starThreeRef.current,
        zOneRef.current,
        zTwoRef.current,
        zThreeRef.current
      ]);

      // Different animations based on severity
      if (severity === 'high') {
        // Rapid, erratic animations for disturbed sleep
        gsap.to(moonRef.current, {
          rotate: 5,
          duration: 0.5,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut"
        });

        // Stars flicker rapidly
        [starOneRef.current, starTwoRef.current, starThreeRef.current].forEach((star, i) => {
          gsap.to(star, {
            opacity: 0.3,
            scale: 0.8,
            duration: 0.3,
            repeat: -1,
            yoyo: true,
            delay: i * 0.1,
            ease: "power1.inOut"
          });
        });

        // Z's appear and disappear quickly
        [zOneRef.current, zTwoRef.current, zThreeRef.current].forEach((z, i) => {
          gsap.to(z, {
            opacity: 0,
            y: -5,
            duration: 0.4,
            repeat: -1,
            yoyo: true,
            delay: i * 0.1,
            ease: "power1.inOut"
          });
        });
      } 
      else if (severity === 'moderate') {
        // Moderate, slightly uneven animations
        gsap.to(moonRef.current, {
          rotate: 3,
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });

        // Stars twinkle moderately
        [starOneRef.current, starTwoRef.current, starThreeRef.current].forEach((star, i) => {
          gsap.to(star, {
            opacity: 0.5,
            scale: 0.9,
            duration: 1,
            repeat: -1,
            yoyo: true,
            delay: i * 0.3,
            ease: "sine.inOut"
          });
        });

        // Z's float up with moderate timing
        [zOneRef.current, zTwoRef.current, zThreeRef.current].forEach((z, i) => {
          gsap.to(z, {
            y: -10,
            opacity: 0,
            duration: 1.5,
            repeat: -1,
            delay: i * 0.5,
            ease: "power1.inOut"
          });
        });
      } 
      else {
        // Smooth, gentle animations for good sleep
        gsap.to(moonRef.current, {
          rotate: 2,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });

        // Stars twinkle gently
        [starOneRef.current, starTwoRef.current, starThreeRef.current].forEach((star, i) => {
          gsap.to(star, {
            opacity: 0.8,
            scale: 0.95,
            duration: 2,
            repeat: -1,
            yoyo: true,
            delay: i * 0.5,
            ease: "sine.inOut"
          });
        });

        // Z's float up smoothly
        [zOneRef.current, zTwoRef.current, zThreeRef.current].forEach((z, i) => {
          gsap.to(z, {
            y: -15,
            opacity: 0,
            duration: 2,
            repeat: -1,
            delay: i * 0.7,
            ease: "power1.inOut"
          });
        });
      }
    }
  }, [animated, severity]);

  // Colors based on severity
  const getColors = () => {
    switch (severity) {
      case 'high':
        return { 
          moon: '#ff9e9e',
          stars: '#ffb1b1',
          zs: '#ffcfcf'
        };
      case 'moderate':
        return { 
          moon: '#b4a5ff',
          stars: '#c7bbff',
          zs: '#dcd5ff'
        };
      case 'low':
        return { 
          moon: '#9eb6ff',
          stars: '#b1c4ff',
          zs: '#cfdaff'
        };
      default:
        return { 
          moon: '#9eb6ff',
          stars: '#b1c4ff',
          zs: '#cfdaff'
        };
    }
  };

  const { moon, stars, zs } = getColors();

  return (
    <svg 
      ref={svgRef}
      width={size} 
      height={size} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Moon */}
      <path
        ref={moonRef}
        d="M100,50 C85,50 70,65 70,85 C70,105 85,120 105,120 C125,120 140,105 140,85 C140,65 125,50 110,50 C115,60 115,75 110,85 C105,95 95,100 85,95 C75,90 70,80 75,70 C80,60 90,55 100,50 Z"
        fill={moon}
        style={{ transformOrigin: 'center' }}
      />
      
      {/* Stars */}
      <path
        ref={starOneRef}
        d="M50,60 L53,67 L60,70 L53,73 L50,80 L47,73 L40,70 L47,67 Z"
        fill={stars}
      />
      <path
        ref={starTwoRef}
        d="M150,40 L153,47 L160,50 L153,53 L150,60 L147,53 L140,50 L147,47 Z"
        fill={stars}
      />
      <path
        ref={starThreeRef}
        d="M130,100 L133,107 L140,110 L133,113 L130,120 L127,113 L120,110 L127,107 Z"
        fill={stars}
      />
      
      {/* Z's */}
      <text
        ref={zOneRef}
        x="70"
        y="150"
        fontSize="24"
        fontWeight="bold"
        fill={zs}
        style={{ transformOrigin: 'center' }}
      >
        Z
      </text>
      <text
        ref={zTwoRef}
        x="90"
        y="130"
        fontSize="20"
        fontWeight="bold"
        fill={zs}
        style={{ transformOrigin: 'center' }}
      >
        Z
      </text>
      <text
        ref={zThreeRef}
        x="110"
        y="110"
        fontSize="16"
        fontWeight="bold"
        fill={zs}
        style={{ transformOrigin: 'center' }}
      >
        Z
      </text>
    </svg>
  );
};

export default SleepIllustration; 