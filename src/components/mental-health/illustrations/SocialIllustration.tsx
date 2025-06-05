import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface SocialIllustrationProps {
  severity: 'low' | 'moderate' | 'high';
  size?: number;
  animated?: boolean;
}

const SocialIllustration: React.FC<SocialIllustrationProps> = ({ 
  severity, 
  size = 200,
  animated = true 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const centerPersonRef = useRef<SVGPathElement>(null);
  const person1Ref = useRef<SVGPathElement>(null);
  const person2Ref = useRef<SVGPathElement>(null);
  const person3Ref = useRef<SVGPathElement>(null);
  const connection1Ref = useRef<SVGLineElement>(null);
  const connection2Ref = useRef<SVGLineElement>(null);
  const connection3Ref = useRef<SVGLineElement>(null);

  useEffect(() => {
    if (animated && svgRef.current) {
      // Clear any existing animations
      gsap.killTweensOf([
        centerPersonRef.current,
        person1Ref.current,
        person2Ref.current,
        person3Ref.current,
        connection1Ref.current,
        connection2Ref.current,
        connection3Ref.current
      ]);

      // Different animations based on severity
      if (severity === 'high') {
        // Center person shrinks and other people move away
        gsap.to(centerPersonRef.current, {
          scale: 0.7,
          duration: 1,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut"
        });

        // Other people move away with shaky motion
        [person1Ref.current, person2Ref.current, person3Ref.current].forEach((person, i) => {
          gsap.to(person, {
            x: `+=${20 + i * 5}`,
            y: `+=${15 + i * 5}`,
            rotation: 5,
            duration: 0.5,
            repeat: -1,
            yoyo: true,
            ease: "power1.inOut"
          });
        });

        // Connections flicker and stretch
        [connection1Ref.current, connection2Ref.current, connection3Ref.current].forEach((connection, i) => {
          gsap.to(connection, {
            opacity: 0.2,
            scale: 1.2,
            duration: 0.3,
            repeat: -1,
            yoyo: true,
            delay: i * 0.1,
            ease: "power1.inOut"
          });
        });
      } 
      else if (severity === 'moderate') {
        // Center person pulses moderately
        gsap.to(centerPersonRef.current, {
          scale: 0.9,
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });

        // Other people move with moderate distance
        [person1Ref.current, person2Ref.current, person3Ref.current].forEach((person, i) => {
          gsap.to(person, {
            x: `+=${10 + i * 3}`,
            y: `+=${8 + i * 3}`,
            duration: 1.5,
            repeat: -1,
            yoyo: true,
            delay: i * 0.3,
            ease: "sine.inOut"
          });
        });

        // Connections pulse moderately
        [connection1Ref.current, connection2Ref.current, connection3Ref.current].forEach((connection, i) => {
          gsap.to(connection, {
            opacity: 0.5,
            scale: 1.1,
            duration: 1.5,
            repeat: -1,
            yoyo: true,
            delay: i * 0.3,
            ease: "sine.inOut"
          });
        });
      } 
      else {
        // Center person pulses gently
        gsap.to(centerPersonRef.current, {
          scale: 0.95,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });

        // Other people move in harmony
        [person1Ref.current, person2Ref.current, person3Ref.current].forEach((person, i) => {
          gsap.to(person, {
            x: `+=${5 + i * 2}`,
            y: `+=${4 + i * 2}`,
            duration: 2,
            repeat: -1,
            yoyo: true,
            delay: i * 0.5,
            ease: "sine.inOut"
          });
        });

        // Connections pulse smoothly
        [connection1Ref.current, connection2Ref.current, connection3Ref.current].forEach((connection, i) => {
          gsap.to(connection, {
            opacity: 0.8,
            scale: 1.05,
            duration: 2,
            repeat: -1,
            yoyo: true,
            delay: i * 0.5,
            ease: "sine.inOut"
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
          person: '#ff9e9e',
          connection: '#ffb1b1'
        };
      case 'moderate':
        return { 
          person: '#b4a5ff',
          connection: '#c7bbff'
        };
      case 'low':
        return { 
          person: '#9eb6ff',
          connection: '#b1c4ff'
        };
      default:
        return { 
          person: '#9eb6ff',
          connection: '#b1c4ff'
        };
    }
  };

  const { person, connection } = getColors();

  return (
    <svg 
      ref={svgRef}
      width={size} 
      height={size} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Center Person */}
      <path
        ref={centerPersonRef}
        d="M95,85 C95,91 91,96 85,96 C79,96 75,91 75,85 C75,79 79,75 85,75 C91,75 95,79 95,85 M80,100 L90,100 L90,115 L80,115 Z"
        fill={person}
        style={{ transformOrigin: 'center' }}
      />
      
      {/* Person 1 (Left) */}
      <path
        ref={person1Ref}
        d="M55,85 C55,91 51,96 45,96 C39,96 35,91 35,85 C35,79 39,75 45,75 C51,75 55,79 55,85 M40,100 L50,100 L50,115 L40,115 Z"
        fill={person}
        style={{ transformOrigin: 'center' }}
      />

      {/* Person 2 (Right) */}
      <path
        ref={person2Ref}
        d="M165,85 C165,91 161,96 155,96 C149,96 145,91 145,85 C145,79 149,75 155,75 C161,75 165,79 165,85 M150,100 L160,100 L160,115 L150,115 Z"
        fill={person}
        style={{ transformOrigin: 'center' }}
      />

      {/* Person 3 (Bottom) */}
      <path
        ref={person3Ref}
        d="M95,145 C95,151 91,156 85,156 C79,156 75,151 75,145 C75,139 79,135 85,135 C91,135 95,139 95,145 M80,160 L90,160 L90,175 L80,175 Z"
        fill={person}
        style={{ transformOrigin: 'center' }}
      />

      {/* Connections */}
      <line
        ref={connection1Ref}
        x1="55"
        y1="95"
        x2="75"
        y2="95"
        stroke={connection}
        strokeWidth="2"
        style={{ transformOrigin: 'center' }}
      />
      <line
        ref={connection2Ref}
        x1="95"
        y1="95"
        x2="145"
        y2="95"
        stroke={connection}
        strokeWidth="2"
        style={{ transformOrigin: 'center' }}
      />
      <line
        ref={connection3Ref}
        x1="85"
        y1="115"
        x2="85"
        y2="135"
        stroke={connection}
        strokeWidth="2"
        style={{ transformOrigin: 'center' }}
      />
    </svg>
  );
};

export default SocialIllustration; 