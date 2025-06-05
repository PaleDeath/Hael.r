import { useEffect, useState } from 'react';

interface CursorPosition {
  x: number;
  y: number;
}

export const useCustomCursor = () => {
  const [position, setPosition] = useState<CursorPosition>({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(false);

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseEnter = () => {
      setCursorVisible(true);
    };

    const handleMouseLeave = () => {
      setCursorVisible(false);
    };

    document.addEventListener('mousemove', updatePosition);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', updatePosition);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleLinkHoverStart = () => {
    setIsHovering(true);
  };

  const handleLinkHoverEnd = () => {
    setIsHovering(false);
  };

  return {
    position,
    isHovering,
    cursorVisible,
    handleLinkHoverStart,
    handleLinkHoverEnd
  };
}; 