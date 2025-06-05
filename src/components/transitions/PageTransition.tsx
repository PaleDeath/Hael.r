import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline();
    
    // Initial page load animation
    if (containerRef.current && overlayRef.current) {
      tl.set(containerRef.current, { opacity: 0 })
        .set(overlayRef.current, { yPercent: 100 })
        .to(overlayRef.current, {
          yPercent: 0,
          duration: 0.5,
          ease: "power2.inOut"
        })
        .to(containerRef.current, {
          opacity: 1,
          duration: 0.5,
          ease: "power2.out"
        })
        .to(overlayRef.current, {
          yPercent: -100,
          duration: 0.5,
          ease: "power2.inOut"
        });
    }
  }, [location]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="min-h-screen w-full"
      >
        {children}
      </div>
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-[#F5F5F0] z-50 pointer-events-none"
        style={{ transformOrigin: 'bottom' }}
      />
    </div>
  );
};

export default PageTransition; 