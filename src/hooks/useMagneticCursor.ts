import { useEffect, useState } from 'react';
import { gsap } from 'gsap';

const SELECTOR =
  'button:not([disabled]), [data-cursor="magnetic"]:not([disabled]), input[type="button"]:not([disabled]), input[type="submit"]:not([disabled])';

const ZONE_PX = 80;
const PULL = 0.3;
const MOVE_DURATION = 0.4;
const RESET_EASE = 'elastic.out(1, 0.3)';
const RESET_DURATION = 0.85;

function isAriaDisabled(el: Element): boolean {
  return el.getAttribute('aria-disabled') === 'true';
}

function collectMagneticElements(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(SELECTOR)).filter((el) => {
    if (isAriaDisabled(el)) return false;
    const cs = window.getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.pointerEvents !== 'none';
  });
}

export const useMagneticCursor = (enabled: boolean) => {
  const [isNearMagnetic, setIsNearMagnetic] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) return;

    let magneticEls = collectMagneticElements();

    const refresh = () => {
      magneticEls = collectMagneticElements();
    };

    const ro = new ResizeObserver(refresh);
    ro.observe(document.body);

    const mo = new MutationObserver(refresh);
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled', 'class', 'style'],
    });

    let lastClosest: HTMLElement | null = null;

    const onMove = (e: MouseEvent) => {
      const cx = e.clientX;
      const cy = e.clientY;

      let closest: { el: HTMLElement; dx: number; dy: number; dist: number } | null = null;

      for (const el of magneticEls) {
        if (!document.documentElement.contains(el)) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        const ecx = rect.left + rect.width / 2;
        const ecy = rect.top + rect.height / 2;
        const dx = cx - ecx;
        const dy = cy - ecy;
        const dist = Math.hypot(dx, dy);
        if (dist < ZONE_PX && (!closest || dist < closest.dist)) {
          closest = { el, dx, dy, dist };
        }
      }

      const newClosestEl = closest?.el ?? null;
      setIsNearMagnetic(closest !== null);

      if (newClosestEl !== lastClosest) {
        if (lastClosest && document.documentElement.contains(lastClosest)) {
          gsap.to(lastClosest, {
            x: 0,
            y: 0,
            duration: RESET_DURATION,
            ease: RESET_EASE,
            overwrite: 'auto',
          });
        }
        lastClosest = newClosestEl;
      }

      if (closest) {
        gsap.to(closest.el, {
          x: closest.dx * PULL,
          y: closest.dy * PULL,
          duration: MOVE_DURATION,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    };

    document.addEventListener('mousemove', onMove, { passive: true });

    return () => {
      document.removeEventListener('mousemove', onMove);
      mo.disconnect();
      ro.disconnect();
      const toReset = collectMagneticElements();
      for (const el of toReset) {
        gsap.killTweensOf(el, 'x,y');
        gsap.set(el, { x: 0, y: 0 });
      }
    };
  }, [enabled]);

  return { isNearMagnetic };
};
