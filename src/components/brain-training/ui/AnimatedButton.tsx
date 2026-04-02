import { forwardRef, type CSSProperties, type MouseEventHandler, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { tapWhileTap, btSpring } from '../motion/presets';

export interface AnimatedButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  id?: string;
  'aria-label'?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** Reserved for future sound / haptics */
  onFeedback?: () => void;
}

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  function AnimatedButton(
    { children, variant = 'primary', onFeedback, onClick, disabled, className = '', type = 'button', id, 'aria-label': ariaLabel },
    ref
  ) {
    const reduceMotion = useReducedMotion();

    const base =
      'inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl px-6 py-3 font-semibold transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-45';

    const variants = {
      primary: 'text-white shadow-lg',
      ghost: 'border backdrop-blur-sm',
      danger: 'text-white shadow-md',
    };

    const style: CSSProperties =
      variant === 'primary'
        ? { background: '#171717', color: '#ffffff', boxShadow: 'var(--bt-card-shadow)' }
        : variant === 'ghost'
          ? {
              background: 'var(--bt-surface)',
              borderColor: 'var(--bt-surface-border)',
              color: 'var(--bt-text)',
            }
          : { background: 'linear-gradient(135deg, #dc2626, #b91c1c)' };

    const handleClick: MouseEventHandler<HTMLButtonElement> = (e) => {
      onFeedback?.();
      onClick?.(e);
    };

    if (reduceMotion) {
      return (
        <button
          ref={ref}
          type={type}
          id={id}
          className={`${base} ${variants[variant]} ${className}`}
          style={style}
          disabled={disabled}
          onClick={handleClick}
          aria-label={ariaLabel}
        >
          {children}
        </button>
      );
    }

    return (
      <motion.button
        ref={ref}
        type={type}
        id={id}
        className={`${base} ${variants[variant]} ${className}`}
        style={style}
        disabled={disabled}
        whileTap={tapWhileTap}
        transition={btSpring}
        onClick={handleClick}
        aria-label={ariaLabel}
      >
        {children}
      </motion.button>
    );
  }
);
