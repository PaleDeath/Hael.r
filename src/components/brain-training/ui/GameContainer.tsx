import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import '../brain-training.css';
import { ArrowLeft } from 'lucide-react';
import { GameErrorBoundary } from './GameErrorBoundary';

export type GameContainerTheme = 'light' | 'dark';

export interface GameContainerProps {
  children: React.ReactNode;
  /** Fullscreen overlay above nav; locks body scroll when true */
  immersive?: boolean;
  /** Atmosphere for immersive overlay. Default light (warm editorial). Use dark for reaction, memory matrix, sequence recall, rapid visual. */
  theme?: GameContainerTheme;
  onBack?: () => void;
  backLabel?: string;
  title?: string;
  topAccessory?: React.ReactNode;
  onErrorReset?: () => void;
  className?: string;
}

let lockCount = 0;
let savedScrollY = 0;

function lockBodyScroll() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY || document.documentElement.scrollTop;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = '';
    window.scrollTo(0, savedScrollY);
  }
}

export const GameContainer: React.FC<GameContainerProps> = ({
  children,
  immersive = false,
  theme = 'light',
  onBack,
  backLabel = 'Back to training',
  title,
  topAccessory,
  onErrorReset,
  className = '',
}) => {
  const reduceMotion = useReducedMotion();
  const prevImmersive = useRef(immersive);

  useEffect(() => {
    if (immersive && !prevImmersive.current) {
      lockBodyScroll();
    } else if (!immersive && prevImmersive.current) {
      unlockBodyScroll();
    }
    prevImmersive.current = immersive;
    return () => {
      if (immersive) {
        unlockBodyScroll();
      }
    };
  }, [immersive]);

  const surfaceClass =
    theme === 'dark'
      ? 'bt-immersive-game bt-immersive-dark'
      : 'bt-immersive-game bt-immersive-light';

  const backImmersiveLight =
    'z-30 flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-white p-0 text-gray-600 shadow-sm hover:text-gray-900';
  const backImmersiveDark =
    'z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 p-0 text-white backdrop-blur-md shadow-none hover:bg-white/15';

  const backButton = onBack && (
    <motion.button
      type="button"
      onClick={onBack}
      className={`${theme === 'light' ? backImmersiveLight : backImmersiveDark}`}
      aria-label={backLabel}
      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
    </motion.button>
  );

  const immersiveChrome = (
    <>
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-between gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-start">{backButton}</div>
        <div className="pointer-events-auto flex max-w-[72%] flex-col items-end gap-2">{topAccessory}</div>
      </div>
    </>
  );

  const inlineHeader = (
    <header className="flex shrink-0 items-center justify-between gap-3 pb-4">
      <div className="flex min-h-11 items-center gap-2">
        {onBack && (
          <motion.button
            type="button"
            onClick={onBack}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-black/10 bg-white px-0 py-2 text-sm font-medium text-neutral-900 shadow-sm"
            aria-label={backLabel}
            whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </motion.button>
        )}
        {title && <h1 className="truncate text-lg font-semibold text-neutral-900 md:text-xl">{title}</h1>}
      </div>
      {topAccessory}
    </header>
  );

  const innerImmersive = (
    <GameErrorBoundary onReset={onErrorReset}>
      <div className={`relative flex h-full min-h-0 flex-1 flex-col ${className}`}>
        {immersiveChrome}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </GameErrorBoundary>
  );

  const innerStandard = (
    <GameErrorBoundary onReset={onErrorReset}>
      <div
        className={`brain-training-root bt-hub flex min-h-[min(100dvh,100vh)] flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] ${immersive ? '' : 'pb-8'} ${className}`}
      >
        {inlineHeader}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </GameErrorBoundary>
  );

  if (!immersive) {
    return (
      <div className="min-h-[min(100dvh,100vh)] w-full bg-[#F5F5F0]">
        {innerStandard}
      </div>
    );
  }

  return (
    <motion.div
      role="presentation"
      className={`brain-training-root ${surfaceClass} bt-overlay-fill fixed inset-0 z-[60] flex h-full min-h-0 flex-col overflow-hidden rounded-none`}
      style={{
        paddingLeft: 'max(0px, env(safe-area-inset-left))',
        paddingRight: 'max(0px, env(safe-area-inset-right))',
        paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
      }}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.99 }}
      animate={reduceMotion ? {} : { opacity: 1, scale: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {innerImmersive}
    </motion.div>
  );
};
