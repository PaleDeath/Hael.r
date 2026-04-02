import React, { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export type SaveToastKind = 'success' | 'offline' | 'error';

interface SaveResultToastProps {
  message: string | null;
  kind: SaveToastKind | null;
  onDismiss: () => void;
}

export const SaveResultToast: React.FC<SaveResultToastProps> = ({ message, kind, onDismiss }) => {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onDismiss, 4200);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  return (
    <AnimatePresence>
      {message && kind && (
        <motion.div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-6 left-1/2 z-[70] max-w-md -translate-x-1/2 px-4"
          style={{
            paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
          }}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          exit={reduceMotion ? {} : { opacity: 0, y: 8 }}
        >
          <div
            className="bt-glass pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-lg"
            style={{
              color: 'var(--bt-text)',
              borderLeft:
                kind === 'success'
                  ? '4px solid var(--bt-success)'
                  : kind === 'offline'
                    ? '4px solid var(--bt-primary-from)'
                    : '4px solid var(--bt-error)',
            }}
          >
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
