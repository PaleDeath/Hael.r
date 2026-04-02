import React, { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

type MoodLabelBracket = 'low' | 'balanced' | 'good' | 'excellent';

function moodBracket(value: number): MoodLabelBracket {
  if (value <= 3) return 'low';
  if (value <= 6) return 'balanced';
  if (value <= 8) return 'good';
  return 'excellent';
}

const bracketCopy: Record<MoodLabelBracket, string> = {
  low: 'Low',
  balanced: 'Balanced',
  good: 'Good',
  excellent: 'Excellent',
};

const bracketTextClass: Record<MoodLabelBracket, string> = {
  low: 'text-[#8A8474]',
  balanced: 'text-[#4A4A4A]',
  good: 'text-[#2D4A3E]',
  excellent: 'text-[#C4654A]',
};

export interface CustomSliderProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label: string;
  emoji: string;
  mobileThumb?: boolean;
  prefersReducedMotion?: boolean;
}

const CustomSlider: React.FC<CustomSliderProps> = ({
  value,
  onChange,
  min,
  max,
  label,
  emoji,
  mobileThumb = false,
  prefersReducedMotion = false,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLSpanElement>(null);
  const labelWrapRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const bracket = moodBracket(value);
  const [shownBracket, setShownBracket] = useState(bracket);

  const pct = ((value - min) / (max - min)) * 100;

  const setValueFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
      const raw = min + (x / rect.width) * (max - min);
      const stepped = Math.round(raw);
      onChange(Math.min(max, Math.max(min, stepped)));
    },
    [max, min, onChange]
  );

  const bumpThumb = useCallback(
    (large: boolean) => {
      if (!thumbRef.current || prefersReducedMotion) return;
      const base = mobileThumb ? 28 : 20;
      const hi = mobileThumb ? 28 : 24;
      gsap.to(thumbRef.current, {
        scale: large ? hi / base : 1,
        duration: 0.2,
        ease: 'power2.out',
      });
    },
    [mobileThumb, prefersReducedMotion]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setValueFromClientX(e.clientX);
      bumpThumb(true);
    },
    [bumpThumb, setValueFromClientX]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      setValueFromClientX(e.clientX);
    },
    [setValueFromClientX]
  );

  const endDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      bumpThumb(false);
    },
    [bumpThumb]
  );

  useEffect(() => {
    if (bracket === shownBracket) return;
    if (prefersReducedMotion) {
      setShownBracket(bracket);
      return;
    }
    const wrap = labelWrapRef.current;
    if (!wrap) {
      setShownBracket(bracket);
      return;
    }
    gsap.killTweensOf(wrap);
    gsap.to(wrap, {
      opacity: 0,
      y: -4,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => setShownBracket(bracket),
    });
  }, [bracket, shownBracket, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const wrap = labelWrapRef.current;
    if (!wrap) return;
    gsap.killTweensOf(wrap);
    gsap.fromTo(
      wrap,
      { opacity: 0, y: 6 },
      { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' }
    );
  }, [shownBracket, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion || !emojiRef.current) return;
    gsap.fromTo(
      emojiRef.current,
      { scale: 1 },
      { scale: 1.15, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.inOut' }
    );
  }, [value, prefersReducedMotion]);

  const baseThumb = mobileThumb ? 28 : 20;

  useEffect(() => {
    const thumb = thumbRef.current;
    if (!thumb || prefersReducedMotion) return;
    const onEnter = () => {
      if (draggingRef.current) return;
      bumpThumb(true);
    };
    const onLeave = () => {
      if (draggingRef.current) return;
      bumpThumb(false);
    };
    thumb.addEventListener('pointerenter', onEnter);
    thumb.addEventListener('pointerleave', onLeave);
    return () => {
      thumb.removeEventListener('pointerenter', onEnter);
      thumb.removeEventListener('pointerleave', onLeave);
    };
  }, [bumpThumb, prefersReducedMotion]);

  return (
    <div className="w-full [-webkit-tap-highlight-color:transparent]">
      <div className="mb-2 flex items-center gap-2 font-inter text-sm text-[#1A1A1A]">
        <span>{label}</span>
        <span ref={emojiRef} className="inline-block origin-center text-lg" aria-hidden>
          {emoji}
        </span>
      </div>

      <div
        className="relative py-3"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => onChange(Number(e.target.value))}
        />

        <div ref={trackRef} className="relative h-2 w-full">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-[#E8E2D6]" />
          <div
            className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-[#2D4A3E]"
            style={{ width: `${pct}%` }}
          />
          <div
            ref={thumbRef}
            className="pointer-events-none absolute top-1/2 z-[5] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2D4A3E] shadow-[inset_0_0_0_2px_#FFFDF7]"
            style={{
              left: `${pct}%`,
              width: baseThumb,
              height: baseThumb,
            }}
          />
        </div>
      </div>

      <div ref={labelWrapRef} className="relative mt-3 min-h-[1.5rem] overflow-hidden font-inter">
        <span className={`block text-center text-sm ${bracketTextClass[shownBracket]}`}>
          {bracketCopy[shownBracket]}
        </span>
      </div>
    </div>
  );
};

export default CustomSlider;
