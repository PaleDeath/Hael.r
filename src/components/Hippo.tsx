import React from 'react';
import useTextAnimation from '../hooks/useTextAnimation';
import { WithClassName } from '../types/common';

export const Hippo: React.FC<WithClassName> = ({ className = '' }) => {
  const hippoRef = useTextAnimation();

  return (
    <section ref={hippoRef} id='scrollSection1' className={`min-h-screen relative z-20 flex flex-col py-8 px-4 sm:px-8 ${className}`}>
      <div className='font-inter text-4xl sm:text-6xl md:text-[96px] text-left leading-tight font-light animate-text'>
        Hippocampus <br /> Impact:
      </div>
      <div className='font-inter text-sm sm:text-base md:text-[20px] text-right mt-16 sm:mt-24 md:mt-44 font-light animate-text'>
        Prolonged exposure to cortisol can damage 
        <span className="hidden sm:inline"><br /></span> the hippocampus, the brain region responsible 
        <span className="hidden sm:inline"><br /></span> for memory and learning. This can result in 
        <span className="hidden sm:inline"><br /></span> memory problems and difficulty concentrating.
      </div>
    </section>
  );
};
