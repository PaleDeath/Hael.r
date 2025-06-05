import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

interface Point {
  x: number;
  y: number;
}

interface GestureState {
  startPoint: Point | null;
  currentPoint: Point | null;
  isGesturing: boolean;
  gestureType: 'swipe' | 'pinch' | 'rotate' | null;
  scale: number;
  rotation: number;
}

interface GestureHandlerProps {
  onSwipe?: (direction: 'left' | 'right' | 'up' | 'down') => void;
  onPinch?: (scale: number) => void;
  onRotate?: (angle: number) => void;
  children: React.ReactNode;
}

const GestureHandler: React.FC<GestureHandlerProps> = ({
  onSwipe,
  onPinch,
  onRotate,
  children
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<GestureState>({
    startPoint: null,
    currentPoint: null,
    isGesturing: false,
    gestureType: null,
    scale: 1,
    rotation: 0
  });

  // Touch event handlers
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      setState(prev => ({
        ...prev,
        startPoint: {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        },
        currentPoint: {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        },
        isGesturing: true,
        gestureType: 'swipe'
      }));
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!state.isGesturing) return;

    if (e.touches.length === 1 && state.startPoint) {
      const currentPoint = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };

      setState(prev => ({ ...prev, currentPoint }));

      // Handle swipe
      if (state.gestureType === 'swipe') {
        const deltaX = currentPoint.x - state.startPoint.x;
        const deltaY = currentPoint.y - state.startPoint.y;
        const threshold = 50;

        if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            onSwipe?.(deltaX > 0 ? 'right' : 'left');
          } else {
            onSwipe?.(deltaY > 0 ? 'down' : 'up');
          }
        }
      }
    } else if (e.touches.length === 2) {
      // Handle pinch and rotate
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      // Calculate scale
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const initialDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const scale = currentDistance / initialDistance;

      // Calculate rotation
      const angle = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      ) * 180 / Math.PI;

      setState(prev => ({
        ...prev,
        gestureType: 'pinch',
        scale,
        rotation: angle
      }));

      onPinch?.(scale);
      onRotate?.(angle);
    }
  };

  const handleTouchEnd = () => {
    setState({
      startPoint: null,
      currentPoint: null,
      isGesturing: false,
      gestureType: null,
      scale: 1,
      rotation: 0
    });
  };

  // Mouse event handlers for desktop
  const handleMouseDown = (e: MouseEvent) => {
    setState(prev => ({
      ...prev,
      startPoint: { x: e.clientX, y: e.clientY },
      currentPoint: { x: e.clientX, y: e.clientY },
      isGesturing: true,
      gestureType: 'swipe'
    }));
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!state.isGesturing || !state.startPoint) return;

    const currentPoint = { x: e.clientX, y: e.clientY };
    setState(prev => ({ ...prev, currentPoint }));

    // Handle swipe
    const deltaX = currentPoint.x - state.startPoint.x;
    const deltaY = currentPoint.y - state.startPoint.y;
    const threshold = 50;

    if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        onSwipe?.(deltaX > 0 ? 'right' : 'left');
      } else {
        onSwipe?.(deltaY > 0 ? 'down' : 'up');
      }
    }
  };

  const handleMouseUp = () => {
    handleTouchEnd();
  };

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    // Touch events
    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);

    // Mouse events
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('mouseleave', handleMouseUp);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);

      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [state.isGesturing, state.startPoint, onSwipe, onPinch, onRotate]);

  return (
    <div 
      ref={containerRef}
      style={{ 
        transform: `scale(${state.scale}) rotate(${state.rotation}deg)`,
        transition: 'transform 0.2s ease-out'
      }}
    >
      {children}
    </div>
  );
};

export default GestureHandler; 