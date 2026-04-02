import { useEffect, useState } from 'react';

export type CursorVariant = 'default' | 'pointer' | 'text';

function resolveVariant(target: EventTarget | null): CursorVariant {
  if (!(target instanceof Element)) return 'default';

  if (
    target.closest(
      'a, button, [role="button"], [data-cursor="pointer"], input[type="button"], input[type="submit"]'
    )
  ) {
    return 'pointer';
  }

  if (target.closest('p, span, h1, h2, h3, h4, h5, h6, label')) {
    return 'text';
  }

  return 'default';
}

export const useCustomCursor = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [variant, setVariant] = useState<CursorVariant>('default');

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const sync = () => {
      setIsTouchDevice(mq.matches || 'ontouchstart' in window);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (isTouchDevice) return;

    const onMouseMove = () => {
      setCursorVisible(true);
    };

    const onDocLeave = (e: MouseEvent) => {
      const rel = e.relatedTarget as Node | null;
      if (!rel || !document.documentElement.contains(rel)) {
        setCursorVisible(false);
      }
    };

    const onPointerOver = (e: MouseEvent) => {
      setVariant(resolveVariant(e.target));
    };

    document.addEventListener('mousemove', onMouseMove);
    document.documentElement.addEventListener('mouseleave', onDocLeave);
    document.addEventListener('mouseover', onPointerOver, true);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.documentElement.removeEventListener('mouseleave', onDocLeave);
      document.removeEventListener('mouseover', onPointerOver, true);
    };
  }, [isTouchDevice]);

  return {
    isTouchDevice,
    cursorVisible,
    variant,
  };
};
