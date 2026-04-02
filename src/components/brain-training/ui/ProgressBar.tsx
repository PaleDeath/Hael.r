import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { btSpringSoft } from '../motion/presets';

type ProgressVariant = 'light' | 'dark';

interface ProgressBarProps {
  /** 0..1 */
  progress: number;
  className?: string;
  trackClassName?: string;
  variant?: ProgressVariant;
  'aria-label'?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  className = '',
  trackClassName = '',
  variant = 'dark',
  'aria-label': ariaLabel = 'Progress',
}) => {
  const reduceMotion = useReducedMotion();
  const p = Math.min(1, Math.max(0, progress));

  const trackBg = variant === 'light' ? '#e5e7eb' : 'rgba(255,255,255,0.12)';
  const fillBg = variant === 'light' ? '#1a1a1a' : 'rgba(255,255,255,0.78)';

  return (
    <div
      className={`relative h-1 w-full overflow-hidden rounded-full ${className}`}
      style={{ background: trackBg }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
      aria-label={ariaLabel}
    >
      <motion.div
        className={`absolute left-0 top-0 h-full w-full origin-left rounded-full ${trackClassName}`}
        style={{ background: fillBg }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: p }}
        transition={reduceMotion ? { duration: 0 } : btSpringSoft}
      />
    </div>
  );
};
