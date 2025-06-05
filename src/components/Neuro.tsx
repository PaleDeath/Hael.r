import React from 'react';
import useTextAnimation from '../hooks/useTextAnimation';
import { WithClassName } from '../types/common';

export const Neuro: React.FC<WithClassName> = ({ className = '' }) => {
  const neuroRef = useTextAnimation();

  return (
    <section ref={neuroRef} id='scrollSection3' className={`min-h-screen relative z-20 flex flex-col py-16 sm:py-24 md:py-36 px-4 sm:px-8 ${className}`}>
      <div className='font-inter text-4xl sm:text-6xl md:text-[96px] text-left leading-tight font-light animate-text'>
        Neurotransmitter <br /> Imbalance:
      </div>
      <div className='font-inter text-sm sm:text-base md:text-[20px] text-right mt-16 sm:mt-28 md:mt-44 font-light animate-text'>
        Chronic stress can disrupt the balance of 
        <span className="hidden sm:inline"><br /></span> neurotransmitters like serotonin and dopamine, 
        <span className="hidden sm:inline"><br /></span> contributing to mood disorders such as 
        <span className="hidden sm:inline"><br /></span> depression and anxiety.
      </div>
    </section>
  );
};
