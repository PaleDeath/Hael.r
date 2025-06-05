import React from 'react';

interface ModelFallbackProps {
  className?: string;
}

const ModelFallback: React.FC<ModelFallbackProps> = ({ className = '' }) => {
  return (
    <div className={`w-full h-[180px] flex items-center justify-center ${className}`}>
      <div className="relative w-32 h-32">
        {/* Simple brain icon as SVG */}
        <svg 
          className="w-full h-full"
          viewBox="0 0 100 100" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M50,10 C30,10 15,25 15,45 C15,65 30,80 50,80 C70,80 85,65 85,45 C85,25 70,10 50,10 Z" 
            fill="none" 
            stroke="#000000" 
            strokeWidth="1" 
            opacity="0.5"
          />
          <circle cx="40" cy="40" r="5" fill="none" stroke="#000000" strokeWidth="1" opacity="0.7" />
          <circle cx="60" cy="40" r="5" fill="none" stroke="#000000" strokeWidth="1" opacity="0.7" />
          <path 
            d="M30,50 C35,55 45,60 50,60 C55,60 65,55 70,50" 
            fill="none" 
            stroke="#000000" 
            strokeWidth="1" 
            opacity="0.5"
          />
        </svg>
        
        {/* Animation */}
        <div className="absolute top-0 left-0 w-full h-full animate-spin-slow opacity-20">
          <div className="w-full h-full border-2 border-black rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default ModelFallback; 