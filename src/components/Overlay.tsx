import React, { useEffect, useRef } from "react";
import gsap from "gsap";

interface OverlayProps {
  onEnter: () => void;
  isFadingOut: boolean;
}

const Overlay: React.FC<OverlayProps> = ({ onEnter, isFadingOut }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (overlayRef.current && titleRef.current && textRef.current && !isFadingOut) {
      const tl = gsap.timeline();
      
      tl.fromTo(overlayRef.current, 
        { backgroundColor: 'rgba(255, 255, 255, 1)' },
        { backgroundColor: 'rgba(255, 255, 255, 0.95)', duration: 1.5, ease: 'power2.out' }
      )
      .fromTo(titleRef.current, 
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'power3.out' },
        '-=1'
      )
      .fromTo(textRef.current, 
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out' },
        '-=0.5'
      );
    }
  }, [isFadingOut]);

  // Create exit animation when fading out
  useEffect(() => {
    if (isFadingOut && overlayRef.current) {
      gsap.to(overlayRef.current, {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        duration: 1.2,
        ease: 'power2.inOut'
      });
    }
  }, [isFadingOut]);

  return (
    <div
      ref={overlayRef}
      onClick={onEnter}
      className={`fixed inset-0 bg-white backdrop-blur-lg flex flex-col items-center justify-center cursor-pointer z-[9999] transition-opacity duration-1000 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <h1 
        ref={titleRef}
        className="text-5xl sm:text-6xl md:text-7xl text-black font-inter font-thin mb-6 select-none"
      >
        H<span className="text-black">a</span><span className="text-black">e</span>l.r
      </h1>
      <span 
        ref={textRef}
        className="text-black text-sm sm:text-base font-inter font-light select-none"
      >
        Click to enter
      </span>
    </div>
  );
};

export default Overlay;
