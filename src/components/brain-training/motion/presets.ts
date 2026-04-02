import type { Transition, Variants } from 'framer-motion';

export const btSpring: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 25,
};

export const btSpringSoft: Transition = {
  type: 'spring',
  stiffness: 280,
  damping: 24,
};

export const btEaseShort: Transition = {
  duration: 0.25,
  ease: [0.25, 0.1, 0.25, 1],
};

export const screenTransition: Variants = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0, transition: btEaseShort },
  exit: { opacity: 0, x: -12, transition: { duration: 0.2 } },
};

export const tapWhileTap = { scale: 0.97 };

export const correctVariants: Variants = {
  initial: { scale: 1, opacity: 1 },
  correct: {
    scale: 1.06,
    opacity: 1,
    transition: btSpring,
  },
};

export const wrongShake: Variants = {
  shake: {
    x: [0, -6, 6, -4, 4, 0],
    transition: { duration: 0.4 },
  },
};

export const scorePopupVariants: Variants = {
  initial: { opacity: 0, y: 8, scale: 0.92 },
  animate: {
    opacity: 1,
    y: -40,
    scale: 1,
    transition: { type: 'spring', stiffness: 320, damping: 24 },
  },
  exit: {
    opacity: 0,
    y: -52,
    transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] },
  },
};
