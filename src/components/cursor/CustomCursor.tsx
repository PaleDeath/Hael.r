import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface CustomCursorProps {
  color?: string;
  size?: number;
  blend?: boolean;
  trail?: boolean;
}

const CustomCursor: React.FC<CustomCursorProps> = ({
  color = '#000000',
  size = 24,
  blend = false,
  trail = true
}) => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorTrailRef = useRef<HTMLDivElement>(null);
  const mousePosition = useRef({ x: 0, y: 0 });
  const isHovering = useRef(false);

  useEffect(() => {
    console.log('CustomCursor mounted');
    const cursor = cursorRef.current;
    const cursorTrail = cursorTrailRef.current;
    if (!cursor || !cursorTrail) return;

    // Hide default cursor
    document.body.style.cursor = 'none';

    const onMouseMove = (e: MouseEvent) => {
      mousePosition.current = { x: e.clientX, y: e.clientY };

      // Animate cursor
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0,
        ease: "none"
      });

      // Animate trail with delay
      if (trail) {
        gsap.to(cursorTrail, {
          x: e.clientX,
          y: e.clientY,
          duration: 0.3,
          ease: "power2.out"
        });
      }
    };

    const onMouseEnter = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      
      if (target.closest('button, a, input, [data-cursor-hover]')) {
        console.log('Cursor hover start');
        isHovering.current = true;
        gsap.to(cursor, {
          scale: 2,
          duration: 0.2
        });
        gsap.to(cursorTrail, {
          scale: 2.5,
          opacity: 0.5,
          duration: 0.2
        });
      }
    };

    const onMouseLeave = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      
      if (target.closest('button, a, input, [data-cursor-hover]')) {
        console.log('Cursor hover end');
        isHovering.current = false;
        gsap.to(cursor, {
          scale: 1,
          duration: 0.2
        });
        gsap.to(cursorTrail, {
          scale: 1,
          opacity: 0.3,
          duration: 0.2
        });
      }
    };

    // Add event listeners
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseenter', onMouseEnter, true);
    document.addEventListener('mouseleave', onMouseLeave, true);

    return () => {
      console.log('CustomCursor unmounted');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseenter', onMouseEnter, true);
      document.removeEventListener('mouseleave', onMouseLeave, true);
      document.body.style.cursor = 'auto';
    };
  }, [size, trail]);

  return (
    <>
      <div
        ref={cursorRef}
        className="fixed pointer-events-none"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: '50%',
          zIndex: 99999,
          mixBlendMode: blend ? 'difference' : 'normal',
          opacity: 0.8,
          transform: 'translate(-50%, -50%)',
          transition: 'width 0.2s, height 0.2s'
        }}
      />
      {trail && (
        <div
          ref={cursorTrailRef}
          className="fixed pointer-events-none"
          style={{
            width: size * 2,
            height: size * 2,
            border: `2px solid ${color}`,
            borderRadius: '50%',
            zIndex: 99998,
            opacity: 0.3,
            transform: 'translate(-50%, -50%)',
            transition: 'width 0.2s, height 0.2s'
          }}
        />
      )}
    </>
  );
};

export default CustomCursor; 