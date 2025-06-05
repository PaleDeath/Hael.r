import React from 'react';
import { useCustomCursor } from '../hooks/useCustomCursor';

const CustomCursor: React.FC = () => {
  const { position, isHovering, cursorVisible } = useCustomCursor();

  return (
    <>
      <div
        className={`fixed pointer-events-none z-[9999] transition-opacity duration-300 ${
          cursorVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div
          className={`rounded-full border border-black transition-all duration-200 ${
            isHovering ? 'w-16 h-16 bg-black/5' : 'w-4 h-4'
          }`}
        />
      </div>
      <div
        className={`fixed pointer-events-none z-[9999] mix-blend-difference transition-opacity duration-300 ${
          cursorVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div
          className={`rounded-full bg-white transition-all duration-200 ${
            isHovering ? 'w-2 h-2 opacity-0' : 'w-1 h-1'
          }`}
        />
      </div>
    </>
  );
};

export default CustomCursor; 