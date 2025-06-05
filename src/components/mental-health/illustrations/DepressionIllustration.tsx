import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface DepressionIllustrationProps {
  severity: 'low' | 'moderate' | 'high';
  size?: number;
  animated?: boolean;
}

const DepressionIllustration: React.FC<DepressionIllustrationProps> = ({ 
  severity, 
  size = 200,
  animated = true 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const cloudRef = useRef<SVGPathElement>(null);
  const raindropOneRef = useRef<SVGPathElement>(null);
  const raindropTwoRef = useRef<SVGPathElement>(null);
  const raindropThreeRef = useRef<SVGPathElement>(null);
  const sunRef = useRef<SVGCircleElement>(null);
  const rayOneRef = useRef<SVGLineElement>(null);
  const rayTwoRef = useRef<SVGLineElement>(null);
  const rayThreeRef = useRef<SVGLineElement>(null);
  const rayFourRef = useRef<SVGLineElement>(null);

  useEffect(() => {
    if (animated && svgRef.current) {
      // Clear any existing animations
      gsap.killTweensOf([
        cloudRef.current, 
        raindropOneRef.current, 
        raindropTwoRef.current, 
        raindropThreeRef.current,
        sunRef.current,
        rayOneRef.current,
        rayTwoRef.current,
        rayThreeRef.current,
        rayFourRef.current
      ]);

      // Animation setup based on severity
      if (severity === 'high') {
        // Heavy rain for high severity
        gsap.to(cloudRef.current, {
          y: 3,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });

        // Hide sun completely
        gsap.set([sunRef.current, rayOneRef.current, rayTwoRef.current, rayThreeRef.current, rayFourRef.current], {
          opacity: 0
        });

        // Animate raindrops in sequence
        const rainTimeline = gsap.timeline({ repeat: -1 });
        
        // Reset positions
        gsap.set([raindropOneRef.current, raindropTwoRef.current, raindropThreeRef.current], {
          y: 0,
          opacity: 1
        });

        // Fast, heavy rain animation
        rainTimeline
          .to(raindropOneRef.current, { y: 70, duration: 0.7, ease: "power1.in" })
          .to(raindropOneRef.current, { opacity: 0, duration: 0.1 }, "-=0.1")
          .to(raindropOneRef.current, { y: 0, opacity: 1, duration: 0 });

        rainTimeline
          .to(raindropTwoRef.current, { y: 70, duration: 0.6, ease: "power1.in" }, "-=0.4")
          .to(raindropTwoRef.current, { opacity: 0, duration: 0.1 }, "-=0.1")
          .to(raindropTwoRef.current, { y: 0, opacity: 1, duration: 0 });

        rainTimeline
          .to(raindropThreeRef.current, { y: 70, duration: 0.8, ease: "power1.in" }, "-=0.5")
          .to(raindropThreeRef.current, { opacity: 0, duration: 0.1 }, "-=0.1")
          .to(raindropThreeRef.current, { y: 0, opacity: 1, duration: 0 });
      } 
      else if (severity === 'moderate') {
        // Light rain for moderate severity
        gsap.to(cloudRef.current, {
          y: 2,
          duration: 3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });

        // Dim sun
        gsap.set(sunRef.current, { opacity: 0.3 });
        gsap.set([rayOneRef.current, rayTwoRef.current, rayThreeRef.current, rayFourRef.current], {
          opacity: 0.2
        });
        
        // Animate rays subtly
        gsap.to([rayOneRef.current, rayTwoRef.current, rayThreeRef.current, rayFourRef.current], {
          opacity: 0.1,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });

        // Moderate rain animation
        const rainTimeline = gsap.timeline({ repeat: -1 });
        
        // Reset positions
        gsap.set([raindropOneRef.current, raindropTwoRef.current], {
          y: 0,
          opacity: 0.7
        });
        
        gsap.set(raindropThreeRef.current, {
          opacity: 0
        });

        // Medium pace rain animation
        rainTimeline
          .to(raindropOneRef.current, { y: 70, duration: 1.2, ease: "power1.in" })
          .to(raindropOneRef.current, { opacity: 0, duration: 0.1 }, "-=0.1")
          .to(raindropOneRef.current, { y: 0, opacity: 0.7, duration: 0 });

        rainTimeline
          .to(raindropTwoRef.current, { y: 70, duration: 1.4, ease: "power1.in" }, "-=0.8")
          .to(raindropTwoRef.current, { opacity: 0, duration: 0.1 }, "-=0.1")
          .to(raindropTwoRef.current, { y: 0, opacity: 0.7, duration: 0 });
      } 
      else {
        // No rain for low severity, just cloudy
        gsap.to(cloudRef.current, {
          y: 1,
          duration: 4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });

        // Bright sun
        gsap.set(sunRef.current, { opacity: 0.7 });
        gsap.set([rayOneRef.current, rayTwoRef.current, rayThreeRef.current, rayFourRef.current], {
          opacity: 0.6
        });
        
        // Animate rays
        gsap.to([rayOneRef.current, rayTwoRef.current, rayThreeRef.current, rayFourRef.current], {
          opacity: 0.9,
          duration: 2,
          repeat: -1,
          yoyo: true,
          stagger: 0.3,
          ease: "sine.inOut"
        });

        // No raindrops
        gsap.set([raindropOneRef.current, raindropTwoRef.current, raindropThreeRef.current], {
          opacity: 0
        });

        // Occasional very light rain
        const rainTimeline = gsap.timeline({ repeat: -1, repeatDelay: 3 });
        
        rainTimeline
          .to(raindropOneRef.current, { opacity: 0.3, duration: 0.5 })
          .to(raindropOneRef.current, { y: 70, duration: 2, ease: "power1.in" })
          .to(raindropOneRef.current, { opacity: 0, duration: 0.1 }, "-=0.1")
          .to(raindropOneRef.current, { y: 0, duration: 0 });
      }
    }
  }, [animated, severity]);

  // Colors based on severity
  const getColors = () => {
    switch (severity) {
      case 'high':
        return { 
          cloud: '#4a4a4a', 
          rain: '#6b91ff',
          sun: '#fad02c',
          rays: '#fad02c'
        };
      case 'moderate':
        return { 
          cloud: '#6e6e6e', 
          rain: '#82a7ff',
          sun: '#fad02c',
          rays: '#fad02c'
        };
      case 'low':
        return { 
          cloud: '#a8a8a8', 
          rain: '#a2bcff',
          sun: '#fad02c',
          rays: '#fad02c'
        };
      default:
        return { 
          cloud: '#a8a8a8', 
          rain: '#a2bcff',
          sun: '#fad02c',
          rays: '#fad02c'
        };
    }
  };

  const { cloud, rain, sun, rays } = getColors();

  return (
    <svg 
      ref={svgRef}
      width={size} 
      height={size} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Sun */}
      <circle 
        ref={sunRef}
        cx="150" 
        cy="50" 
        r="20" 
        fill={sun} 
      />
      
      {/* Sun rays */}
      <line 
        ref={rayOneRef}
        x1="150" 
        y1="20" 
        x2="150" 
        y2="10" 
        stroke={rays} 
        strokeWidth="3" 
        strokeLinecap="round" 
      />
      <line 
        ref={rayTwoRef}
        x1="150" 
        y1="80" 
        x2="150" 
        y2="90" 
        stroke={rays} 
        strokeWidth="3" 
        strokeLinecap="round" 
      />
      <line 
        ref={rayThreeRef}
        x1="120" 
        y1="50" 
        x2="110" 
        y2="50" 
        stroke={rays} 
        strokeWidth="3" 
        strokeLinecap="round" 
      />
      <line 
        ref={rayFourRef}
        x1="180" 
        y1="50" 
        x2="190" 
        y2="50" 
        stroke={rays} 
        strokeWidth="3" 
        strokeLinecap="round" 
      />
      
      {/* Cloud */}
      <path
        ref={cloudRef}
        d="M90,70 C80,60 50,65 45,80 C40,95 45,110 70,110 C95,110 130,110 145,110 C160,110 170,100 160,85 C150,70 130,70 120,75 C115,65 100,60 90,70 Z"
        fill={cloud}
        style={{ transformOrigin: 'center' }}
      />
      
      {/* Raindrops */}
      <path
        ref={raindropOneRef}
        d="M70,120 C70,120 65,130 70,135 C75,140 80,130 80,130 L75,120 L70,120 Z"
        fill={rain}
        style={{ transformOrigin: 'center' }}
      />
      <path
        ref={raindropTwoRef}
        d="M100,120 C100,120 95,130 100,135 C105,140 110,130 110,130 L105,120 L100,120 Z"
        fill={rain}
        style={{ transformOrigin: 'center' }}
      />
      <path
        ref={raindropThreeRef}
        d="M130,120 C130,120 125,130 130,135 C135,140 140,130 140,130 L135,120 L130,120 Z"
        fill={rain}
        style={{ transformOrigin: 'center' }}
      />
    </svg>
  );
};

export default DepressionIllustration; 