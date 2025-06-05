import React, { useEffect, useRef } from 'react';
// import * as THREE from 'three'; // TS6133: 'THREE' is declared but its value is never read.

interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

const InteractiveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Initialize points
    const initPoints = () => {
      const points: Point[] = [];
      const numPoints = Math.floor((window.innerWidth * window.innerHeight) / 15000);
      
      for (let i = 0; i < numPoints; i++) {
        points.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 2 + 1
        });
      }
      
      pointsRef.current = points;
    };

    // Draw points and connections
    const draw = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#F5F5F0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const points = pointsRef.current;
      const mouse = mouseRef.current;

      // Update and draw points
      points.forEach((point, i) => {
        // Update position
        point.x += point.vx;
        point.y += point.vy;

        // Bounce off edges
        if (point.x < 0 || point.x > canvas.width) point.vx *= -1;
        if (point.y < 0 || point.y > canvas.height) point.vy *= -1;

        // Mouse interaction
        const dx = mouse.x - point.x;
        const dy = mouse.y - point.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 100) {
          const angle = Math.atan2(dy, dx);
          const force = (100 - dist) / 100;
          point.vx -= Math.cos(angle) * force * 0.02;
          point.vy -= Math.sin(angle) * force * 0.02;
        }

        // Draw point
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#E5E5E0';
        ctx.fill();

        // Draw connections
        points.forEach((otherPoint, j) => {
          if (i === j) return;
          
          const dx = point.x - otherPoint.x;
          const dy = point.y - otherPoint.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(otherPoint.x, otherPoint.y);
            ctx.strokeStyle = `rgba(229, 229, 224, ${1 - dist / 100})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    // Event listeners
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX,
        y: e.clientY
      };
    };

    const handleResize = () => {
      setCanvasSize();
      initPoints();
    };

    // Initialize
    setCanvasSize();
    initPoints();
    draw();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
};

export default InteractiveBackground; 