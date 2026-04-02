import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useCustomCursor, type CursorVariant } from '../hooks/useCustomCursor';
import { useMagneticCursor } from '../hooks/useMagneticCursor';

/** Matches hub text #1a1a1a — stronger alpha for #f5f5f0 / off-white surfaces */
const INK = '26, 26, 26';

const DIM = {
  default: { w: 20, h: 20, r: 9999, border: `rgba(${INK}, 0.55)`, bg: `rgba(${INK}, 0)`, bw: 1 },
  pointer: { w: 48, h: 48, r: 9999, border: `rgba(${INK}, 0.24)`, bg: `rgba(${INK}, 0.09)`, bw: 1 },
  magnetic: {
    w: 58,
    h: 58,
    r: 9999,
    border: `rgba(${INK}, 0.14)`,
    bg: `rgba(${INK}, 0.04)`,
    bw: 1,
  },
  magneticPointer: {
    w: 58,
    h: 58,
    r: 9999,
    border: `rgba(${INK}, 0.11)`,
    bg: `rgba(${INK}, 0.065)`,
    bw: 1,
  },
  text: { w: 2, h: 24, r: 1, border: `rgba(${INK}, 0)`, bg: `rgba(${INK}, 0.55)`, bw: 0 },
} as const;

type DimKey = keyof typeof DIM;

function resolveDimKey(variant: CursorVariant, isNearMagnetic: boolean): DimKey {
  if (variant === 'text') return 'text';
  if (isNearMagnetic && variant === 'pointer') return 'magneticPointer';
  if (isNearMagnetic) return 'magnetic';
  if (variant === 'pointer') return 'pointer';
  return 'default';
}

const CustomCursor: React.FC = () => {
  const { isTouchDevice, cursorVisible, variant } = useCustomCursor();
  const { isNearMagnetic } = useMagneticCursor(!isTouchDevice);
  const outerRef = useRef<HTMLDivElement>(null);
  const squeezeRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const dimKeyRef = useRef<DimKey>('default');

  const dimKey = resolveDimKey(variant, isNearMagnetic);

  useEffect(() => {
    if (isTouchDevice) return;

    const outer = outerRef.current;
    const squeeze = squeezeRef.current;
    if (!outer || !squeeze) return;

    gsap.set(outer, { xPercent: -50, yPercent: -50 });

    const onMove = (e: MouseEvent) => {
      gsap.to(outer, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.45,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    };

    const onDown = () => {
      gsap.killTweensOf(squeeze, 'scale');
      gsap.timeline()
        .to(squeeze, { scale: 0.85, duration: 0.1, ease: 'power2.out' })
        .to(squeeze, { scale: 1, duration: 0.1, ease: 'power2.out' });
    };

    document.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);

    return () => {
      document.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
    };
  }, [isTouchDevice]);

  useEffect(() => {
    if (isTouchDevice) return;

    const inner = innerRef.current;
    if (!inner) return;

    const prev = dimKeyRef.current;
    dimKeyRef.current = dimKey;

    const dims = DIM[dimKey];
    const ease =
      dimKey === 'pointer' || dimKey === 'magneticPointer'
        ? 'back.out(1.7)'
        : 'power2.out';
    const duration =
      dimKey === 'pointer' || dimKey === 'magnetic' || dimKey === 'magneticPointer' ? 0.32 : 0.28;

    if (prev === dimKey) {
      gsap.set(inner, {
        width: dims.w,
        height: dims.h,
        borderRadius: dims.r,
        borderColor: dims.border,
        backgroundColor: dims.bg,
        borderWidth: dims.bw,
      });
      return;
    }

    gsap.to(inner, {
      width: dims.w,
      height: dims.h,
      borderRadius: dims.r,
      borderColor: dims.border,
      backgroundColor: dims.bg,
      borderWidth: dims.bw,
      duration,
      ease,
      overwrite: 'auto',
    });
  }, [dimKey, isTouchDevice]);

  useEffect(() => {
    if (isTouchDevice) return;
    const squeeze = squeezeRef.current;
    if (!squeeze) return;
    const soften = isNearMagnetic && variant !== 'text';
    gsap.to(squeeze, {
      opacity: soften ? 0.76 : 1,
      duration: 0.28,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }, [isNearMagnetic, variant, isTouchDevice]);

  useEffect(() => {
    if (isTouchDevice) return;
    document.body.style.cursor = 'none';
    return () => {
      document.body.style.cursor = '';
    };
  }, [isTouchDevice]);

  useEffect(() => {
    if (isTouchDevice) return;
    const outer = outerRef.current;
    if (!outer) return;
    gsap.to(outer, {
      autoAlpha: cursorVisible ? 1 : 0,
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }, [cursorVisible, isTouchDevice]);

  if (isTouchDevice) return null;

  return (
    <div
      ref={outerRef}
      className="fixed left-0 top-0 z-[9999] pointer-events-none"
      style={{ willChange: 'transform' }}
      aria-hidden
    >
      <div ref={squeezeRef} style={{ willChange: 'transform, opacity' }}>
        <div
          ref={innerRef}
          className="box-border"
          style={{
            width: DIM.default.w,
            height: DIM.default.h,
            borderStyle: 'solid',
            borderColor: DIM.default.border,
            backgroundColor: DIM.default.bg,
            borderRadius: DIM.default.r,
            borderWidth: DIM.default.bw,
            willChange: 'width, height, border-radius, border-color, background-color, border-width',
          }}
        />
      </div>
    </div>
  );
};

export default CustomCursor;
