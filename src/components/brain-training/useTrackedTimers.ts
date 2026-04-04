import { useCallback, useEffect, useRef } from 'react';

/** Clears all timeouts/intervals registered during a brain game session; clears on unmount via hook. */
export function useTrackedTimers() {
  const idsRef = useRef<number[]>([]);

  const clearAll = useCallback(() => {
    idsRef.current.forEach((id) => {
      window.clearTimeout(id);
      window.clearInterval(id);
    });
    idsRef.current = [];
  }, []);

  const trackTimeout = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    idsRef.current.push(id);
    return id;
  }, []);

  const trackInterval = useCallback((fn: () => void, ms: number) => {
    const id = window.setInterval(fn, ms);
    idsRef.current.push(id);
    return id;
  }, []);

  const untrack = useCallback((id: number) => {
    window.clearTimeout(id);
    window.clearInterval(id);
    idsRef.current = idsRef.current.filter((x) => x !== id);
  }, []);

  useEffect(() => () => clearAll(), [clearAll]);

  return { clearAll, trackTimeout, trackInterval, untrack, idsRef };
}
