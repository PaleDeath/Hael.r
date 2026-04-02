import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useAuth } from '../contexts/AuthContext';
import { useSoundManager } from './sound/SoundManager';

declare global {
  interface Window {
    lenis?: { stop: () => void; start: () => void };
  }
}

interface NavbarProps {
  className?: string;
}

const NAV_LINKS = [
  { path: '/', label: 'home.' },
  { path: '/quizpage', label: 'assessment.' },
  { path: '/assessment-history', label: 'history.' },
  { path: '/mood-tracker', label: 'mood.' },
  { path: '/meditation', label: 'meditation.' },
  { path: '/brain-training', label: 'brain training.' },
  { path: '/community', label: 'community.' },
] as const;

const LINE_EASE_IN: [number, number, number, number] = [0.76, 0, 0.24, 1];

const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const BREAKPOINT = 1024;
const TAGLINE = 'your mind, understood.';
const ACCENT = '#C4956A';

type LinkAnimParts = {
  row: HTMLElement | null;
  link: HTMLAnchorElement | null;
  number: HTMLElement | null;
  text: HTMLElement | null;
  period: HTMLElement | null;
  decoLine: HTMLElement | null;
};

function labelParts(label: string): { text: string; period: string } {
  if (label.endsWith('.')) {
    return { text: label.slice(0, -1), period: '.' };
  }
  return { text: label, period: '' };
}

function padLinkRefs(): LinkAnimParts[] {
  return Array.from({ length: NAV_LINKS.length }, () => ({
    row: null,
    link: null,
    number: null,
    text: null,
    period: null,
    decoLine: null,
  }));
}

const Navbar: React.FC<NavbarProps> = ({ className = '' }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWide, setIsWide] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= BREAKPOINT : true,
  );
  const [savedAssessments, setSavedAssessments] = useState<unknown[]>([]);
  const [triggerScrolled, setTriggerScrolled] = useState(false);
  const [triggerHovered, setTriggerHovered] = useState(false);
  const [clock, setClock] = useState(() => new Date());

  const { isAuthenticated, userProfile, currentUser, logout } = useAuth();
  const { playSound } = useSoundManager();
  const location = useLocation();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const prevMenuOpen = useRef(false);
  const brandRef = useRef<HTMLSpanElement>(null);
  const taglineRef = useRef<HTMLSpanElement>(null);
  const pageTitleRef = useRef<HTMLSpanElement>(null);
  const menuLabelRef = useRef<HTMLSpanElement>(null);
  const triggerIconRef = useRef<HTMLDivElement>(null);
  const edgeLineRef = useRef<HTMLDivElement>(null);
  const linkAnimRefsArray = useRef<LinkAnimParts[]>(padLinkRefs());

  const closeMenuImmediate = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const requestCloseMenu = useCallback(() => {
    const rows = linkAnimRefsArray.current
      .map((p) => p.row)
      .filter((n): n is HTMLElement => !!n);
    const ov = overlayRef.current;

    if (rows.length > 0) {
      gsap.killTweensOf(rows);
      gsap.to(rows, {
        y: -20,
        opacity: 0,
        duration: 0.25,
        ease: 'power2.in',
        overwrite: 'auto',
      });
    }
    if (ov) {
      gsap.killTweensOf(ov);
      gsap.to(ov, {
        backdropFilter: 'blur(0px)',
        WebkitBackdropFilter: 'blur(0px)',
        duration: 0.45,
        delay: 0.45,
        ease: 'power2.inOut',
        overwrite: 'auto',
      });
    }
    gsap.delayedCall(0.45, () => setIsMenuOpen(false));
  }, []);

  const mergeLinkPart = useCallback((i: number, patch: Partial<LinkAnimParts>) => {
    const cur = linkAnimRefsArray.current[i] ?? {
      row: null,
      link: null,
      number: null,
      text: null,
      period: null,
      decoLine: null,
    };
    linkAnimRefsArray.current[i] = { ...cur, ...patch };
  }, []);

  const toggleMenu = useCallback(() => {
    playSound('click');
    if (isMenuOpen) {
      requestCloseMenu();
    } else {
      setIsMenuOpen(true);
      if (triggerRef.current) {
        gsap.fromTo(
          triggerRef.current,
          { scale: 1 },
          {
            scale: 0.92,
            duration: 0.15,
            yoyo: true,
            repeat: 1,
            ease: 'power2.inOut',
            overwrite: 'auto',
          },
        );
      }
    }
  }, [isMenuOpen, playSound, requestCloseMenu]);

  const handleLogout = async () => {
    try {
      await logout();
      closeMenuImmediate();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const debouncedResize = useRef(
    (() => {
      let timeoutId: ReturnType<typeof setTimeout>;
      return (fn: () => void, delay: number) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(fn, delay);
      };
    })(),
  );

  const handleResize = useCallback(() => {
    debouncedResize.current(() => setIsWide(window.innerWidth >= BREAKPOINT), 100);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    const t = window.setInterval(() => setClock(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const checkSavedAssessments = () => {
      try {
        const savedData = localStorage.getItem('savedAssessments');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          setSavedAssessments(Array.isArray(parsedData) ? parsedData : []);
        }
      } catch (error) {
        console.error('Failed to parse saved assessments:', error);
      }
    };

    checkSavedAssessments();
    window.addEventListener('storage', checkSavedAssessments);
    return () => window.removeEventListener('storage', checkSavedAssessments);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const vh = window.innerHeight || 1;
      setTriggerScrolled(window.scrollY > vh * 0.5);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (prevMenuOpen.current && !isMenuOpen) {
      triggerRef.current?.focus();
    }
    prevMenuOpen.current = isMenuOpen;
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;

    window.lenis?.stop();
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${window.scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      const top = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      const y = parseInt(top || '0', 10);
      window.scrollTo(0, Number.isFinite(y) ? y * -1 : 0);
      window.lenis?.start();
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const overlayEl = overlayRef.current;
    const triggerEl = triggerRef.current;
    const focusables: HTMLElement[] = [];

    if (overlayEl) {
      focusables.push(
        ...Array.from(overlayEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)),
      );
    }
    if (triggerEl) {
      focusables.push(triggerEl);
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestCloseMenu();
        return;
      }
      if (e.key !== 'Tab' || focusables.length === 0) {
        return;
      }
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen, requestCloseMenu]);

  useLayoutEffect(() => {
    if (!isMenuOpen || !menuLabelRef.current) return;
    const inners = menuLabelRef.current.querySelectorAll<HTMLElement>('.nav-menu-char-inner');
    if (!inners.length) return;
    gsap.fromTo(
      inners,
      { y: '100%', opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.3,
        stagger: 0.025,
        ease: 'power3.out',
        overwrite: 'auto',
      },
    );
  }, [isMenuOpen]);

  useLayoutEffect(() => {
    if (!isMenuOpen || !triggerIconRef.current) return;
    gsap.set(triggerIconRef.current, { rotation: 0 });
  }, [isMenuOpen]);

  useEffect(() => {
    const icon = triggerIconRef.current;
    if (!icon || !isMenuOpen) {
      if (icon) gsap.to(icon, { rotation: 0, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
      return;
    }
    if (triggerHovered) {
      gsap.to(icon, { rotation: 90, duration: 0.4, ease: 'back.out(1.4)', overwrite: 'auto' });
    } else {
      gsap.to(icon, { rotation: 0, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
    }
  }, [isMenuOpen, triggerHovered]);

  useLayoutEffect(() => {
    if (!isMenuOpen) return;
    const id = requestAnimationFrame(() => {
      const ov = overlayRef.current;
      if (ov) {
        gsap.fromTo(
          ov,
          { backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' },
          {
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            duration: 0.5,
            ease: 'power2.out',
            overwrite: 'auto',
          },
        );
      }
      if (isWide && brandRef.current) {
        gsap.fromTo(
          brandRef.current,
          { opacity: 0, y: 30 },
          {
            opacity: 0.04,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            delay: 0.3,
            overwrite: 'auto',
          },
        );
      }
      if (isWide && taglineRef.current) {
        gsap.fromTo(
          taglineRef.current,
          { opacity: 0, y: 10 },
          {
            opacity: 0.4,
            y: 0,
            duration: 0.6,
            delay: 0.5,
            ease: 'power3.out',
            overwrite: 'auto',
          },
        );
      }
      if (isWide && pageTitleRef.current) {
        gsap.fromTo(
          pageTitleRef.current,
          { opacity: 0, y: 8 },
          {
            opacity: 0.35,
            y: 0,
            duration: 0.5,
            delay: 0.55,
            ease: 'power3.out',
            overwrite: 'auto',
          },
        );
      }
      NAV_LINKS.forEach((_, i) => {
        const line = linkAnimRefsArray.current[i]?.decoLine;
        if (line && isWide) {
          gsap.fromTo(
            line,
            { width: 0 },
            {
              width: 40,
              duration: 0.5,
              ease: 'power3.out',
              delay: 0.25 + i * 0.05,
              overwrite: 'auto',
            },
          );
        }
      });
      const rows = linkAnimRefsArray.current
        .map((p) => p.row)
        .filter((n): n is HTMLElement => !!n);
      if (rows.length) {
        gsap.set(rows, { y: 40, opacity: 0 });
        gsap.to(rows, {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: 'power3.out',
          stagger: 0.06,
          delay: 0.25,
          overwrite: 'auto',
        });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [isMenuOpen, isWide]);

  useEffect(() => {
    return () => {
      linkAnimRefsArray.current.forEach((_, i) => {
        const p = linkAnimRefsArray.current[i];
        if (!p) return;
        [p.row, p.number, p.text, p.period, p.decoLine, p.link].forEach((el) => {
          if (el) gsap.killTweensOf(el);
        });
      });
      if (edgeLineRef.current) gsap.killTweensOf(edgeLineRef.current);
    };
  }, []);

  const overlayLinks = NAV_LINKS.map((item) => ({
    ...item,
    hasNotification: item.path === '/assessment-history' && savedAssessments.length > 0,
    isActive:
      location.pathname === item.path ||
      (item.path === '/quizpage' && location.pathname === '/assessment'),
  }));

  const menuLineWidth = triggerHovered ? 56 : 40;

  const routeLabel =
    location.pathname === '/'
      ? 'home'
      : location.pathname.replace(/^\//, '').replace(/-/g, ' ');

  const triggerPositionClass = isWide
    ? 'fixed top-[32px] right-[40px] z-[110]'
    : 'fixed top-5 right-6 z-[110]';

  const onLinkMouseEnter = useCallback(
    (i: number) => {
      if (!isWide) return;
      const p = linkAnimRefsArray.current[i];
      if (!p?.link || !p.text) return;
      const r = p.link.getBoundingClientRect();
      if (p.number) {
        gsap.to(p.number, { opacity: 1, x: -4, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
      }
      gsap.to(p.text, { letterSpacing: '0.05em', duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
      if (p.decoLine) {
        gsap.to(p.decoLine, { width: 60, opacity: 0.3, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
      }
      if (p.period) {
        gsap.to(p.period, { scale: 1.8, color: ACCENT, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
      }
      if (edgeLineRef.current) {
        gsap.to(edgeLineRef.current, {
          width: r.left,
          top: r.top + r.height / 2,
          opacity: 0.2,
          duration: 0.4,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    },
    [isWide],
  );

  const onLinkMouseLeave = useCallback(
    (i: number, isActiveLink: boolean) => {
      if (!isWide) return;
      const p = linkAnimRefsArray.current[i];
      if (!p?.text) return;
      gsap.to(p.text, { letterSpacing: '-0.025em', duration: 0.28, ease: 'power2.out', overwrite: 'auto' });
      if (p.number) {
        gsap.to(p.number, {
          opacity: isActiveLink ? 1 : 0.6,
          x: 0,
          duration: 0.25,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
      if (p.decoLine) {
        gsap.to(p.decoLine, { width: 40, opacity: 0.15, duration: 0.28, ease: 'power2.out', overwrite: 'auto' });
      }
      if (p.period) {
        gsap.to(p.period, { scale: 1, color: '#1a1a1a', duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
      }
      if (edgeLineRef.current) {
        gsap.to(edgeLineRef.current, { width: 0, opacity: 0, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
      }
    },
    [isWide],
  );

  const overlayVariants = {
    visible: {
      clipPath: 'inset(0 0 0% 0)',
      transition: { duration: 0.6, ease: LINE_EASE_IN },
    },
    hidden: {
      clipPath: 'inset(0 0 100% 0)',
      transition: { duration: 0.45, ease: LINE_EASE_IN },
    },
  };

  const timeStr = `${String(clock.getHours()).padStart(2, '0')}:${String(clock.getMinutes()).padStart(2, '0')}`;

  const welcomeFirstName = (() => {
    if (!isAuthenticated) return 'there';
    const fromProfile = userProfile?.firstName?.trim();
    if (fromProfile) return fromProfile;
    const fromDisplay = currentUser?.displayName?.trim();
    if (fromDisplay) {
      const first = fromDisplay.split(/\s+/)[0];
      if (first) return first;
    }
    const email = currentUser?.email?.trim() ?? userProfile?.email?.trim();
    if (email?.includes('@')) {
      const local = email.split('@')[0];
      if (local) return local;
    }
    return 'there';
  })();

  const welcomeShort = `Welcome, ${welcomeFirstName}.`;

  return (
    <>
      <div
        className={`pointer-events-none absolute left-0 top-0 -z-10 h-px w-px overflow-hidden opacity-0 ${className}`.trim()}
        aria-hidden
      />
      <nav className="pointer-events-none fixed left-0 right-0 top-0 z-[100] min-h-0" aria-label="Site navigation">
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              ref={overlayRef}
              id="nav-overlay-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="Site navigation"
              className="pointer-events-auto fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[rgba(245,245,240,0.98)]"
              style={{
                overflow: 'hidden',
                overscrollBehavior: 'none',
                touchAction: 'none',
              }}
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={overlayVariants}
            >
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-1 overflow-hidden lg:grid-cols-[40fr_60fr]">
                  {isWide && (
                    <div className="relative flex flex-col justify-end px-10 pb-10">
                      <span
                        ref={brandRef}
                        className="pointer-events-none absolute bottom-[15%] left-6 select-none font-inter text-[clamp(100px,12vw,200px)] font-thin leading-none text-black/[0.04]"
                        aria-hidden
                      >
                        Hael.r
                      </span>
                      <span
                        ref={pageTitleRef}
                        className="relative z-[1] font-inter text-[11px] font-light uppercase tracking-[0.3em] text-black/40"
                      >
                        {routeLabel}
                      </span>
                      <span
                        ref={taglineRef}
                        className="relative z-[1] mt-3 font-inter text-[11px] font-light uppercase tracking-[0.3em] text-black/40"
                      >
                        {TAGLINE}
                      </span>
                    </div>
                  )}

                  <div
                    className={`flex min-h-0 flex-col justify-center overflow-x-hidden ${
                      isWide
                        ? 'overflow-hidden px-10 pt-[clamp(60px,8vh,100px)] pb-[clamp(80px,12vh,120px)] pr-[max(40px,4vw)]'
                        : 'overflow-y-auto px-6 py-24 pb-36'
                    }`}
                    style={
                      isWide
                        ? undefined
                        : { touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' as const }
                    }
                  >
                    <nav className="flex flex-col" aria-label="Primary">
                      <ul
                        className={`flex flex-col ${
                          isWide
                            ? 'gap-[clamp(8px,1.5vh,20px)]'
                            : 'gap-[clamp(16px,2.5vh,32px)]'
                        } ${isWide ? 'items-end text-right' : 'items-start text-left'}`}
                      >
                        {overlayLinks.map((item, i) => {
                          const n = String(i + 1).padStart(2, '0');
                          const { text, period } = labelParts(item.label);
                          const showDot =
                            item.isActive ||
                            (item.path === '/assessment-history' && item.hasNotification);
                          const dotIsBlue =
                            item.path === '/assessment-history' && item.hasNotification;
                          const numberStrong = item.isActive;

                          return (
                            <li
                              key={item.path}
                              className={isWide ? 'w-full' : 'w-full max-w-lg'}
                              ref={(el) => mergeLinkPart(i, { row: el })}
                            >
                              <motion.div
                                className={`group relative flex ${isWide ? 'w-full justify-end' : 'justify-center'}`}
                                whileTap={
                                  !isWide ? { scale: 0.98, opacity: 0.7 } : undefined
                                }
                              >
                                <Link
                                  ref={(el) => mergeLinkPart(i, { link: el })}
                                  to={item.path}
                                  onClick={() => {
                                    playSound('click');
                                    closeMenuImmediate();
                                  }}
                                  onMouseEnter={() => onLinkMouseEnter(i)}
                                  onMouseLeave={() => onLinkMouseLeave(i, item.isActive)}
                                  className={`relative inline-flex items-baseline gap-3 ${
                                    isWide ? 'origin-right' : 'mx-auto'
                                  }`}
                                >
                                  {isWide && (
                                    <span
                                      className="flex shrink-0 items-center gap-2 self-start pt-[0.35em]"
                                      aria-hidden
                                    >
                                      {showDot ? (
                                        <span
                                          className="h-[4px] w-[4px] shrink-0 rounded-full"
                                          style={{
                                            backgroundColor: dotIsBlue ? '#3B82F6' : '#1a1a1a',
                                          }}
                                        />
                                      ) : (
                                        <span className="w-[4px] shrink-0" aria-hidden />
                                      )}
                                      <span
                                        ref={(el) => mergeLinkPart(i, { decoLine: el })}
                                        className="h-px shrink-0 bg-black opacity-[0.15]"
                                        style={{ width: 0 }}
                                      />
                                      <span
                                        ref={(el) => mergeLinkPart(i, { number: el })}
                                        className={`font-mono text-sm tabular-nums text-[#1a1a1a] ${
                                          numberStrong ? 'opacity-100' : 'opacity-60'
                                        }`}
                                      >
                                        {n}
                                      </span>
                                    </span>
                                  )}
                                  <span
                                    ref={(el) => mergeLinkPart(i, { text: el })}
                                    className={`font-inter tracking-tight text-[#1a1a1a] ${
                                      isWide
                                        ? 'text-[clamp(24px,5.5vh,56px)] leading-[1.1]'
                                        : 'text-[clamp(28px,8vw,40px)] leading-[1.65]'
                                    } ${item.isActive ? 'font-normal' : 'font-light'}`}
                                  >
                                    <span>{text}</span>
                                    {period ? (
                                      <span
                                        ref={(el) => mergeLinkPart(i, { period: el })}
                                        className="nav-period inline-block text-[#1a1a1a]"
                                      >
                                        {period}
                                      </span>
                                    ) : null}
                                  </span>
                                </Link>
                              </motion.div>
                            </li>
                          );
                        })}
                      </ul>
                    </nav>
                  </div>
                </div>
              </div>

              <div
                className={`pointer-events-auto absolute bottom-0 left-0 right-0 z-10 flex border-t border-black/5 bg-[#F5F5F0]/95 px-6 font-inter lg:px-10 ${
                  isWide
                    ? 'h-[72px] min-h-[72px] shrink-0 items-center justify-between py-2.5'
                    : 'flex-col items-center justify-center gap-3 py-4 text-center'
                }`}
              >
                {isWide ? (
                  <>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-[#1a1a1a]/70">{welcomeShort}</p>
                      {isAuthenticated ? (
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="text-left text-xs text-[#999] transition-colors duration-200 hover:text-[#1a1a1a]"
                        >
                          sign out.
                        </button>
                      ) : (
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <Link
                            to="/login"
                            onClick={() => {
                              playSound('click');
                              closeMenuImmediate();
                            }}
                            className="text-xs text-[#999] transition-colors duration-200 hover:text-[#1a1a1a]"
                          >
                            sign in.
                          </Link>
                          <Link
                            to="/register"
                            onClick={() => {
                              playSound('click');
                              closeMenuImmediate();
                            }}
                            className="text-xs text-[#999] transition-colors duration-200 hover:text-[#1a1a1a]"
                          >
                            get started.
                          </Link>
                        </div>
                      )}
                    </div>
                    <time className="font-mono text-xs tabular-nums opacity-30" dateTime={clock.toISOString()}>
                      {timeStr}
                    </time>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs font-light uppercase tracking-[0.3em] text-[#1a1a1a]/40">{TAGLINE}</p>
                    {isAuthenticated ? (
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="text-xs text-[#999] transition-colors duration-200 hover:text-[#1a1a1a]"
                      >
                        sign out.
                      </button>
                    ) : (
                      <div className="flex gap-4">
                        <Link
                          to="/login"
                          onClick={() => {
                            playSound('click');
                            closeMenuImmediate();
                          }}
                          className="text-xs text-[#999] transition-colors duration-200 hover:text-[#1a1a1a]"
                        >
                          sign in.
                        </Link>
                        <Link
                          to="/register"
                          onClick={() => {
                            playSound('click');
                            closeMenuImmediate();
                          }}
                          className="text-xs text-[#999] transition-colors duration-200 hover:text-[#1a1a1a]"
                        >
                          get started.
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isWide && (
          <div
            ref={edgeLineRef}
            aria-hidden
            className="pointer-events-none fixed left-0 z-[115] h-px bg-[#1a1a1a]/20"
            style={{ top: 0, width: 0, opacity: 0 }}
          />
        )}

        <button
          ref={triggerRef}
          type="button"
          onClick={toggleMenu}
          onMouseEnter={() => setTriggerHovered(true)}
          onMouseLeave={() => setTriggerHovered(false)}
          className={`pointer-events-auto flex items-center justify-center rounded-full border-0 bg-transparent p-0 text-inherit outline-none ${triggerPositionClass} ${
            !isWide ? 'min-h-[44px] min-w-[44px]' : ''
          }`}
          aria-expanded={isMenuOpen}
          aria-controls="nav-overlay-dialog"
          aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'}
        >
          <span className="sr-only">{isMenuOpen ? 'Close navigation' : 'Open navigation'}</span>
          <motion.div
            className="flex flex-col items-center"
            initial={false}
            animate={{
              paddingLeft: triggerScrolled && !isMenuOpen ? 16 : 0,
              paddingRight: triggerScrolled && !isMenuOpen ? 16 : 0,
              paddingTop: triggerScrolled && !isMenuOpen ? 8 : 0,
              paddingBottom: triggerScrolled && !isMenuOpen ? 8 : 0,
              backgroundColor:
                triggerScrolled && !isMenuOpen
                  ? 'rgba(245, 245, 240, 0.6)'
                  : 'rgba(245, 245, 240, 0)',
            }}
            style={{
              borderRadius: 20,
              backdropFilter: triggerScrolled && !isMenuOpen ? 'blur(8px)' : 'none',
              WebkitBackdropFilter: triggerScrolled && !isMenuOpen ? 'blur(8px)' : 'none',
            }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div className="flex flex-col items-center gap-1.5">
              <div
                ref={triggerIconRef}
                className={`relative flex items-center justify-center ${isWide ? 'h-[14px]' : 'h-4'} w-14`}
              >
                <motion.span
                  className="absolute h-[1.5px] rounded-none bg-black"
                  style={{ originX: 0.5, originY: 0.5 }}
                  initial={false}
                  animate={
                    isMenuOpen
                      ? { width: 40, rotate: 45, opacity: 1 }
                      : { width: menuLineWidth, rotate: 0, opacity: 1 }
                  }
                  transition={{ duration: 0.3, ease: LINE_EASE_IN }}
                />
                <motion.span
                  className="absolute h-[1.5px] rounded-none bg-black"
                  style={{ originX: 0.5, originY: 0.5 }}
                  initial={false}
                  animate={
                    isMenuOpen
                      ? { width: 40, rotate: -45, opacity: 1 }
                      : { width: 0, rotate: -45, opacity: 0 }
                  }
                  transition={{ duration: 0.3, ease: LINE_EASE_IN }}
                />
              </div>
              <span
                ref={menuLabelRef}
                className="inline-flex font-inter text-[11px] font-light uppercase tracking-[0.15em] text-[#1a1a1a]"
              >
                {(isMenuOpen ? 'close' : 'menu').split('').map((ch, ui) => (
                  <span key={`${isMenuOpen}-${ui}`} className="nav-menu-char inline-block overflow-hidden">
                    <span className="nav-menu-char-inner inline-block">{ch === ' ' ? '\u00a0' : ch}</span>
                  </span>
                ))}
              </span>
            </div>
          </motion.div>
        </button>
      </nav>
    </>
  );
};

export default Navbar;
