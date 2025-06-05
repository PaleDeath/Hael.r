import React from 'react';
import useTextAnimation from '../hooks/useTextAnimation';
import { WithClassName } from '../types/common';

export const About: React.FC<WithClassName> = ({ className = '' }) => {
  const aboutRef = useTextAnimation();

  return (
    <section ref={aboutRef} id='about' className={`h-screen relative z-20 flex flex-col justify-center items-center py-8 px-4 ${className}`}>
      <div className='font-inter text-base sm:text-[20px] text-center font-light animate-text'>
        Understanding the brain's response to stress highlights the importance <span className="hidden sm:inline"><br /></span>
        of stress management techniques to mitigate its effects.
      </div>
    </section>
  );
};
