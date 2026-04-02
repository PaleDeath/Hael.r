import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { scorePopupVariants } from '../motion/presets';

interface ScorePopupProps {
  value: string | null;
  show: boolean;
  className?: string;
  /** Reserved for future sound / haptics */
  onFeedback?: () => void;
}

export const ScorePopup: React.FC<ScorePopupProps> = ({
  value,
  show,
  className = '',
  onFeedback: _onFeedback,
}) => {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {show && value && (
        <motion.div
          key={value}
          role="status"
          aria-live="polite"
          className={`pointer-events-none text-2xl font-bold tabular-nums md:text-4xl ${className}`}
          style={{
            color: '#ffffff',
            textShadow: '0 2px 24px var(--bt-success-glow)',
          }}
          variants={scorePopupVariants}
          initial={reduceMotion ? false : 'initial'}
          animate={reduceMotion ? {} : 'animate'}
          exit={reduceMotion ? {} : 'exit'}
        >
          {value}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
