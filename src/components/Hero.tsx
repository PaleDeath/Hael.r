import React from 'react';
import useTextAnimation from '../hooks/useTextAnimation';
import { WithClassName } from '../types/common';

export const Hero: React.FC<WithClassName> = ({ className = '' }) => {
  const heroRef = useTextAnimation();

  return (
    <section ref={heroRef} id='hero' className={`second-section min-h-screen relative z-0 flex py-8 sm:py-12 md:py-20 flex-col justify-center ${className}`}>
      <div className="absolute top-0 sm:top-[-60px] md:top-[-100px] lg:top-[-150px] left-0 w-full text-center px-4">
        <div className="font-inter text-black text-3xl xs:text-4xl sm:text-5xl md:text-7xl lg:text-9xl xl:text-[200px] font-thin tracking-wide leading-tight sm:leading-none z-10 animate-text">
          What is <br /> Hael.r?
        </div>
      </div>
      
      {/* Info boxes - reorganized for mobile */}
      <div className="relative w-full flex flex-col sm:flex-row justify-center items-center mt-10 xs:mt-16 sm:mt-20 md:mt-28 px-4">
        {/* First info box - center on mobile, left on larger screens */}
        <div className="relative sm:absolute sm:top-0 sm:left-0 sm:transform sm:-translate-y-1/2 p-3 sm:p-4 mb-6 sm:mb-0 animate-text w-full sm:w-auto max-w-xs">
          <span className="block text-center sm:text-left mb-1 sm:mb-2 text-xs md:text-sm lg:text-base">More than an AI</span>
          <div className="border-2 border-black p-3 sm:p-4 text-xs md:text-sm lg:text-base tracking-tight">
            Comprehensive mental health <br/> companion crafted to assist you in <br /> managing stress, anxiety,<br /> depression, and other mental<br /> health challenges.
          </div>
        </div>
        
        {/* Second info box - hidden on mobile, shown on right for larger screens */}
        <div className="hidden sm:block absolute top-0 right-0 transform -translate-y-1/2 p-4 animate-text">
          <span className="block text-right mb-2 text-xs md:text-sm lg:text-base">Remembers you</span>
          <div className="border-2 border-black p-4 text-xs md:text-sm lg:text-base tracking-tight">
            Come back whenever <br/> to check on your past mental health <br /> history, track your mood<br /> and meditate with Hael.r<br /> all in one place.
          </div>
        </div>
      </div>
      
      <p className="mt-8 sm:mt-12 md:mt-24 lg:mt-48 text-center font-inter text-xs sm:text-sm md:text-base lg:text-lg px-4 animate-text">
        At Hael.r, we believe that mental well-being is the cornerstone of a fulfilling life. Our 
        <span className="hidden sm:inline"><br /></span> app is designed to be your trusted companion on the journey to mental health, offering 
        <span className="hidden sm:inline"><br /></span> personalized support and resources to help you thrive.
      </p>
    </section>
  );
};