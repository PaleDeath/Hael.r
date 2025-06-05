import React, { useEffect, useRef } from 'react';
import { WithClassName } from '../types/common';
import gsap from 'gsap';

export const Marquee: React.FC<WithClassName> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const textRef2 = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!textRef.current || !textRef2.current) return;
    
    // Calculate animation duration based on text width
    const textWidth = textRef.current.offsetWidth;
    const duration = textWidth / 100; // Adjust speed by changing this divisor
    
    // Create timeline for smooth infinite scrolling
    const tl = gsap.timeline({ repeat: -1, ease: "none" });
    
    // Set initial positions
    gsap.set(textRef2.current, { left: textWidth });
    
    // Animate both text elements
    tl.to([textRef.current, textRef2.current], {
      x: -textWidth,
      duration: duration,
      ease: "linear"
    });
    
    return () => {
      tl.kill();
    };
  }, []);
  
  return (
    <div className={`relative z-20 w-full overflow-hidden py-2 sm:py-3 md:py-4 lg:py-6 bg-[#F5F5F0] ${className}`}>
      <div 
        ref={containerRef} 
        className="marquee-container relative w-full h-[40px] xs:h-[50px] sm:h-[80px] md:h-[100px] lg:h-[120px] flex items-center overflow-hidden"
      >
        <div 
          ref={textRef} 
          className="marquee-text absolute whitespace-nowrap font-inter text-xl xs:text-2xl sm:text-4xl md:text-5xl lg:text-[72px] xl:text-[96px] font-light"
          style={{ left: 0 }}
        >
          <span className="mx-1 xs:mx-2 sm:mx-4">Start Your Journey Today</span>
          <span className="mx-1 xs:mx-2 sm:mx-4">•</span>
          <span className="mx-1 xs:mx-2 sm:mx-4">Take Control of Your Mental Health</span>
          <span className="mx-1 xs:mx-2 sm:mx-4">•</span>
        </div>
        
        <div 
          ref={textRef2} 
          className="marquee-text absolute whitespace-nowrap font-inter text-xl xs:text-2xl sm:text-4xl md:text-5xl lg:text-[72px] xl:text-[96px] font-light"
          style={{ left: '100%' }}
        >
          <span className="mx-1 xs:mx-2 sm:mx-4">Start Your Journey Today</span>
          <span className="mx-1 xs:mx-2 sm:mx-4">•</span>
          <span className="mx-1 xs:mx-2 sm:mx-4">Take Control of Your Mental Health</span>
          <span className="mx-1 xs:mx-2 sm:mx-4">•</span>
        </div>
      </div>
    </div>
  );
};
