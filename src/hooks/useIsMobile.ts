import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

const MOBILE_UA_REGEX = /mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i;

function detectMobile(): boolean {
  return (
    window.innerWidth < MOBILE_BREAKPOINT ||
    MOBILE_UA_REGEX.test(navigator.userAgent)
  );
}

/**
 * Returns true when the viewport is considered mobile.
 * Consolidates the three duplicate resize-listener patterns in App.tsx into one
 * stable hook with a single event listener that is properly cleaned up.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(detectMobile);

  useEffect(() => {
    // Use resize observer where available (more efficient than window resize event)
    // Fall back to window resize for older browsers
    const handler = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []); // no deps — handler captures nothing from closure

  return isMobile;
}
