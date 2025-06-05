import React from 'react';
import useTextAnimation from '../hooks/useTextAnimation';
import { WithClassName } from '../types/common';
import { Link } from 'react-router-dom';

export const Footer: React.FC<WithClassName> = ({ className = '' }) => {
  const footerRef = useTextAnimation();

  return (
    <section ref={footerRef} id="footer" className={`min-h-screen relative z-20 flex flex-col justify-center items-center px-4 py-8 font-inter font-light text-base sm:text-lg md:text-[20px] animate-text ${className}`}>
      <div className="text-center mb-10">
        Discover Peace of Mind, One Day at a Time.
      </div>
      
      {/* CTA Button for Quiz */}
      <div className="mt-8 flex flex-col items-center">
        <p className="text-sm sm:text-base md:text-lg mb-4 text-center max-w-md">
          Ready to understand your mental health better? Take our comprehensive assessment now.
        </p>
        <Link 
          to="/quizpage" 
          className="inline-block bg-black hover:bg-gray-800 text-white font-medium py-3 px-8 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1 text-sm sm:text-base"
        >
          Take the Assessment
        </Link>
      </div>
    </section>
  );
};
