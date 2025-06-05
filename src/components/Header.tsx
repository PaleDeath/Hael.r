import React, { useState, useEffect } from 'react';
import gsap from 'gsap';
import { WithClassName } from '../types/common';

export const Header: React.FC<WithClassName> = ({ className = '' }) => {
  const [isScrollTextVisible, setIsScrollTextVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0 && isScrollTextVisible) {
        gsap.to('.scroll-text', { opacity: 0, duration: 1 });
        setIsScrollTextVisible(false);
      } else if (window.scrollY === 0 && !isScrollTextVisible) {
        gsap.to('.scroll-text', { opacity: 1, duration: 1 });
        setIsScrollTextVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isScrollTextVisible]);

  return (
    <section id="home" className={`min-h-screen relative z-20 flex flex-col justify-center items-center px-4 py-8 ${className}`}>
      <div className="fixed top-0 left-0 z-50 p-4 sm:p-5 font-lexend text-lg sm:text-xl flex items-center">
        .r/
      </div>
      <h1 className="text-center justify-center font-light font-inter text-base xs:text-lg sm:text-xl pt-6 sm:pt-10 w-full">
        Discover peace of mind one day at a time
      </h1>
      <div className="text-center text-black relative w-full overflow-hidden mt-4 sm:mt-8">
        <div className="font-inter text-black text-[80px] xs:text-[120px] sm:text-[180px] md:text-[240px] lg:text-[400px] font-thin tracking-wide mt-4 sm:mt-6 md:mt-8 z-30 leading-none">
          H<span className="text-white">a</span><span className="text-white">e</span>l.r
        </div>
        <div className='font-inter font-light text-base sm:text-xl md:text-2xl lg:text-[32px] mb-4 sm:mb-6 md:mb-10'>
          Your personalized mental health companion. 
        </div>
        
        {/* Rotated side text - hidden on small screens */}
        <div className="hidden sm:block absolute top-1/2 transform -translate-y-1/2 -left-[190px]">
          <p className="text-black text-[15px] font-inter tracking-tight p-4 transform rotate-90">
            With a blend of evidence-based techniques and innovative features,<br />
            Hael.r empowers you to take control of your mental wellness.
          </p>
        </div>
        
        {/* Mobile-friendly version of the side text */}
        <div className="block sm:hidden px-2 mb-4">
          <p className="text-black text-xs font-inter tracking-tight text-center">
            With a blend of evidence-based techniques and innovative features,
            Hael.r empowers you to take control of your mental wellness.
          </p>
        </div>
        
        {/* Barcode - adjusted for mobile */}
        <div className="absolute top-1/2 transform -translate-y-1/2 right-0 sm:right-3">
          <img src="/Group.svg" alt="barcode" className="h-12 sm:h-16 md:h-auto" />
        </div>
      </div>
      {isScrollTextVisible && (
        <div className='scroll-text font-inter text-sm sm:text-base md:text-[20px] mt-4 sm:mt-6'>
          Scroll.
        </div>
      )}
      <div className="mt-4 sm:mt-6 md:mt-10 lg:mt-20 p-4 sm:p-10 md:p-28"></div>
    </section>
  );
};
