import React from 'react';
import useTextAnimation from '../hooks/useTextAnimation';
import { WithClassName } from '../types/common';

export const Amygdala: React.FC<WithClassName> = ({ className = '' }) => {
  const amygdalaRef = useTextAnimation();

  return (
    <section ref={amygdalaRef} id='scrollSection2' className={`min-h-screen relative z-20 flex flex-col py-12 sm:py-20 px-4 sm:px-8 ${className}`}>
      <div className='font-inter text-4xl sm:text-6xl md:text-[96px] text-right leading-tight font-light animate-text'>
        Amygdala <br /> Sensitization:
      </div>
      <div className='font-inter text-sm sm:text-base md:text-[20px] text-left mt-16 sm:mt-28 md:mt-56 font-light animate-text'>
        The amygdala, which processes emotions, 
        <span className="hidden sm:inline"><br /></span> becomes more sensitive under stress, leading 
        <span className="hidden sm:inline"><br /></span> to heightened anxiety and fear responses.
      </div>
    </section>
  );
};
