import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSoundManager } from './sound/SoundManager';

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
const LINE_EASE_LINK: [number, number, number, number] = [0.25, 1, 0.5, 1];

const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const BREAKPOINT = 1024;

function labelParts(label: string): { text: string; period: string } {
  if (label.endsWith('.')) {
    return { text: label.slice(0, -1), period: '.' };
  }
  return { text: label, period: '' };
}

const Navbar: React.FC<NavbarProps> = ({ className = '' }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWide, setIsWide] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= BREAKPOINT : true,
  );
  const [savedAssessments, setSavedAssessments] = useState<unknown[]>([]);
  const [triggerScrolled, setTriggerScrolled] = useState(false);
  const [triggerHovered, setTriggerHovered] = useState(false);
  const [hoverLine, setHoverLine] = useState<{ top: number; width: number } | null>(null);

  const { isAuthenticated, userProfile, logout } = useAuth();
  const { playSound } = useSoundManager();
  const location = useLocation();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const prevMenuOpen = useRef(false);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    playSound('click');
    setIsMenuOpen((open) => !open);
  }, [playSound]);

  const handleLogout = async () => {
    try {
      await logout();
      closeMenu();
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
    if (!isMenuOpen) {
      return;
    }

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
        closeMenu();
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
  }, [isMenuOpen, closeMenu]);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const overlayLinks = NAV_LINKS.map((item) => ({
    ...item,
    hasNotification: item.path === '/assessment-history' && savedAssessments.length > 0,
    isActive:
      location.pathname === item.path ||
      (item.path === '/quizpage' && location.pathname === '/assessment'),
  }));

  const menuLineWidth = triggerHovered ? 56 : 40;

  const triggerPositionClass = isWide
    ? 'fixed top-[32px] right-[40px] z-[110]'
    : 'fixed top-5 right-6 z-[110]';

  const triggerInner = (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`relative flex items-center justify-center ${
          isWide ? 'h-[14px]' : 'h-4'
        } ${isWide ? 'w-14' : 'w-14'}`}
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
      <motion.span
        className="font-inter text-[11px] font-light uppercase tracking-[0.15em] text-[#1a1a1a]"
        initial={false}
        animate={{
          opacity: isMenuOpen ? 1 : triggerHovered ? 1 : 0.5,
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {isMenuOpen ? 'close' : 'menu'}
      </motion.span>
    </div>
  );

  const overlayVariants = {
    visible: {
      clipPath: 'inset(0 0 0% 0)',
      transition: { duration: 0.5, ease: LINE_EASE_IN },
    },
    hidden: {
      clipPath: 'inset(0 0 100% 0)',
      transition: { duration: 0.4, ease: LINE_EASE_IN },
    },
  };

  return (
    <>
      {/*
        Parallax must not run on this <nav>: GSAP sets transform on `.parallax-section`,
        which breaks fixed/absolute layout for the menu trigger. A zero-impact sentinel
        keeps the same section index order (Header stays at i=1 in ScrollTrigger).
      */}
      <div
        className={`pointer-events-none absolute left-0 top-0 -z-10 h-px w-px overflow-hidden opacity-0 ${className}`.trim()}
        aria-hidden
      />
      <nav
        className="pointer-events-none fixed left-0 right-0 top-0 z-[100] min-h-0"
        aria-label="Site navigation"
      >
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            ref={overlayRef}
            id="nav-overlay-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            className="pointer-events-auto fixed inset-0 z-[100] flex flex-col bg-[rgba(245,245,240,0.98)] backdrop-blur-[24px]"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={overlayVariants}
          >
            <div
              className={`flex min-h-0 flex-1 flex-col px-6 pb-36 sm:px-12 lg:px-10 ${
                isWide
                  ? 'justify-center pt-28 lg:ml-[40%] lg:w-[60%]'
                  : 'justify-center pt-24'
              }`}
            >
              <nav className="flex flex-1 flex-col justify-center" aria-label="Primary">
                <ul
                  className={`flex flex-col gap-[clamp(12px,2vw,24px)] ${
                    isWide ? 'items-end text-right' : 'items-start text-left'
                  }`}
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
                      <li key={item.path} className={isWide ? 'w-full' : ''}>
                        <motion.div
                          initial={{ opacity: 0, x: isWide ? 40 : -24 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            delay: 0.2 + i * 0.06,
                            duration: 0.5,
                            ease: LINE_EASE_LINK,
                          }}
                          className={`group relative flex ${isWide ? 'w-full justify-end' : ''}`}
                          whileTap={
                            !isWide ? { scale: 0.98, opacity: 0.7 } : undefined
                          }
                        >
                          <Link
                            to={item.path}
                            onClick={() => {
                              playSound('click');
                              closeMenu();
                            }}
                            onMouseEnter={
                              isWide
                                ? (e) => {
                                    const r = e.currentTarget.getBoundingClientRect();
                                    setHoverLine({
                                      top: r.top + r.height / 2,
                                      width: r.left,
                                    });
                                  }
                                : undefined
                            }
                            onMouseLeave={
                              isWide
                                ? () => {
                                    setHoverLine(null);
                                  }
                                : undefined
                            }
                            className={`relative inline-flex items-baseline gap-3 ${
                              isWide ? 'origin-right' : ''
                            }`}
                          >
                            {isWide && (
                              <span
                                className="flex shrink-0 items-center gap-2 self-start pt-[0.35em]"
                                aria-hidden
                              >
                                {showDot && (
                                  <span
                                    className="h-[4px] w-[4px] shrink-0 rounded-full"
                                    style={{
                                      backgroundColor: dotIsBlue ? '#3B82F6' : '#1a1a1a',
                                    }}
                                  />
                                )}
                                {!showDot && <span className="w-[4px] shrink-0" aria-hidden />}
                                <span
                                  className={`font-mono text-xs tabular-nums text-[#999] transition-[opacity,color] duration-300 ease-out ${
                                    numberStrong
                                      ? 'opacity-100 text-[#1a1a1a]'
                                      : 'opacity-[0.4] group-hover:opacity-100'
                                  }`}
                                >
                                  {n}
                                </span>
                              </span>
                            )}
                            <span
                              className={`font-inter leading-[1.65] tracking-tight text-[#1a1a1a] transition-[transform,font-weight] duration-300 ease-out ${
                                isWide
                                  ? 'text-[clamp(36px,5vw,64px)] group-hover:translate-x-2'
                                  : 'text-[clamp(28px,8vw,40px)]'
                              } ${item.isActive ? 'font-normal' : 'font-light'}`}
                            >
                              <span>{text}</span>
                              {period ? (
                                <span
                                  className={`inline-block transition-transform duration-300 ease-out ${
                                    isWide
                                      ? 'delay-75 group-hover:translate-x-1'
                                      : ''
                                  }`}
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

            <motion.div
              className="pointer-events-auto absolute bottom-8 left-6 font-inter text-sm sm:bottom-10 sm:left-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4, ease: 'easeOut' }}
            >
              {isAuthenticated ? (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[14px] text-[#999]">
                    Welcome, {userProfile?.firstName ?? 'there'}.
                  </p>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-left text-[14px] text-[#999] transition-colors duration-200 hover:text-[#1a1a1a]"
                  >
                    sign out.
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Link
                    to="/login"
                    onClick={() => {
                      playSound('click');
                      closeMenu();
                    }}
                    className="text-[14px] text-[#999] transition-colors duration-200 hover:text-[#1a1a1a]"
                  >
                    sign in.
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => {
                      playSound('click');
                      closeMenu();
                    }}
                    className="text-[14px] text-[#999] transition-colors duration-200 hover:text-[#1a1a1a]"
                  >
                    get started.
                  </Link>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {hoverLine !== null && isWide && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed left-0 z-[110] h-px bg-[#1a1a1a]/20"
          style={{ top: hoverLine.top }}
          initial={{ width: 0 }}
          animate={{ width: hoverLine.width }}
          exit={{ width: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
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
        <span className="sr-only">
          {isMenuOpen ? 'Close navigation' : 'Open navigation'}
        </span>
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
            backdropFilter:
              triggerScrolled && !isMenuOpen ? 'blur(8px)' : 'none',
            WebkitBackdropFilter:
              triggerScrolled && !isMenuOpen ? 'blur(8px)' : 'none',
          }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          {triggerInner}
        </motion.div>
      </button>
    </nav>
    </>
  );
};

export default Navbar;
