/*
 * Lenis (desktop home): Diagnostic 6 — shorter duration + native touch so scroll
 * doesn’t feel sluggish vs CSS snap (snap removed in index.css).
 */
import React, { useEffect, useRef, useState } from 'react';
import Lenis from '@studio-freight/lenis';
import { About } from './components/About';
import { CanvasContainer } from './components/CanvasContainer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Footer } from './components/Footer';
import Navbar from './components/Navbar';
import Overlay from './components/Overlay';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Hippo } from './components/Hippo';
import { Amygdala } from './components/Amygdala';
import { Neuro } from './components/Neuro';
import { Marquee } from './components/Marquee';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import QuizPage from './components/mental-health/QuizPage';
import AssessmentHistoryPage from './components/mental-health/AssessmentHistoryPage';
import MoodTracker from './components/mental-health/mood/MoodTracker';
import MeditationPage from './components/mental-health/meditation/MeditationPage';
import BrainTrainingPage from './components/brain-training/BrainTrainingPage';
import BrainTrainingGameRouter from './components/brain-training/BrainTrainingGameRouter';
import BrainTrainingProgress from './components/brain-training/BrainTrainingProgress';
import CustomCursor from './components/cursor/CustomCursor';
import { SoundProvider, useSoundManager } from './components/sound/SoundManager';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import MobileHomePage from './components/MobileHomePage';
import { AuthProvider } from './contexts/AuthContext';
import AuthPage from './components/auth/AuthPage';
import PostList from './components/community/PostList';
import PostComposer from './components/community/PostComposer';
import PostDetail from './components/community/PostDetail';
import { useIsMobile } from './hooks/useIsMobile';

gsap.registerPlugin(ScrollTrigger);

interface HomePageProps {
  isOverlayVisible: boolean;
  isFadingOut: boolean;
  handleEnter: () => void;
}

// ─── Desktop homepage ──────────────────────────────────────────────────────────
// This component is only rendered when !isMobile (see HomePageSelector), so we
// never need to track mobile state internally.
const DesktopHomePage: React.FC<HomePageProps> = ({ isOverlayVisible, isFadingOut, handleEnter }) => {
  const { playSound } = useSoundManager();

  useEffect(() => {
    // Desktop-only parallax
    const sections = document.querySelectorAll('.parallax-section');
    // Light parallax only — large yPercent scrubs fight Lenis and feel “stuck”
    sections.forEach((section, i) => {
      const depth = i * 0.15;
      gsap.to(section, {
        yPercent: -(8 * depth),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          markers: false
        }
      });
    });
  }, []); // runs once — DesktopHomePage is never shown on mobile

  return (
    <div className="relative bg-[#F5F5F0]">
      <Helmet>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#F5F5F0" />
      </Helmet>

      {isOverlayVisible && <Overlay onEnter={handleEnter} isFadingOut={isFadingOut} />}
      <div
        id="home-scroll-root"
        className={`transition-opacity duration-1000 ${
          isOverlayVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        onClick={() => playSound('click')}
      >
        <div
          className="brain-canvas-wrapper pointer-events-none h-screen w-full fixed inset-0 z-10 transition-opacity duration-1000 [will-change:transform] [transform:translateZ(0)]"
        >
          <CanvasContainer />
        </div>
        <Navbar className="parallax-section" />
        <Header className="parallax-section" />
        <Hero className="parallax-section" />
        <About className="parallax-section" />
        <Hippo className="parallax-section" />
        <Amygdala className="parallax-section" />
        <Neuro className="parallax-section" />
        <Footer className="parallax-section" />
        <Marquee className="parallax-section" />
      </div>
    </div>
  );
};

// ─── Homepage selector (mobile vs desktop) ─────────────────────────────────────
const HomePageSelector: React.FC<HomePageProps> = (props) => {
  // Single call to the shared hook — no duplicate listener
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileHomePage
        isOverlayVisible={props.isOverlayVisible}
        isFadingOut={props.isFadingOut}
        handleEnter={props.handleEnter}
      />
    );
  }

  return <DesktopHomePage {...props} />;
};

// ─── Root application ──────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const [isFadingOut, setIsFadingOut]             = useState(false);
  const isMobile = useIsMobile(); // single shared hook — no manual state + listener

  // ─── Lenis smooth scroll (desktop home page only) ───────────────────────────
  // Stores both the Lenis instance and the rAF id so the loop can be cancelled.
  const lenisRef   = useRef<InstanceType<typeof Lenis> | null>(null);
  const rafIdRef   = useRef<number>(0);

  const destroyLenis = () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
    if (lenisRef.current) {
      lenisRef.current.destroy();
      lenisRef.current = null;
    }
  };

  const createLenis = () => {
    if (lenisRef.current) return; // already running

    const instance = new Lenis({
      duration: 1.0,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 1,
      touchMultiplier: 1
    });

    const loop = (time: number) => {
      instance.raf(time);
      rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);
    lenisRef.current = instance;
  };

  // Initialise / destroy Lenis when route or mobile status changes
  useEffect(() => {
    const isHomePath = window.location.pathname === '/';

    if (isHomePath && !isMobile) {
      createLenis();
    } else {
      destroyLenis();
    }

    return destroyLenis; // guaranteed cleanup on unmount or dep change
  }, [isMobile]);

  // Keep Lenis in sync when using browser back/forward
  useEffect(() => {
    const onPopState = () => {
      const isHomePath = window.location.pathname === '/';
      if (!isHomePath || isMobile) {
        destroyLenis();
      } else {
        createLenis();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isMobile]);

  const handleEnter = () => {
    setIsFadingOut(true);
    setTimeout(() => setIsOverlayVisible(false), 1000);
  };

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <HelmetProvider>
        <AuthProvider>
          <SoundProvider>
            {!isMobile && <CustomCursor />}
            <Helmet>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
              <meta name="mobile-web-app-capable" content="yes" />
              <meta name="theme-color" content="#F5F5F0" />
            </Helmet>
            <Routes>
              <Route path="/" element={
                <HomePageSelector
                  isOverlayVisible={isOverlayVisible}
                  isFadingOut={isFadingOut}
                  handleEnter={handleEnter}
                />
              } />

              {/* Canonical assessment route */}
              <Route path="/assessment" element={
                <div className="bg-[#F5F5F0]"><Navbar /><QuizPage /></div>
              } />
              {/* Legacy alias — redirect to canonical URL */}
              <Route path="/quizpage" element={<Navigate to="/assessment" replace />} />

              <Route path="/assessment-history" element={
                <div className="bg-[#F5F5F0]"><Navbar /><AssessmentHistoryPage /></div>
              } />
              <Route path="/mood-tracker" element={
                <div className="bg-[#F5F5F0]"><Navbar /><MoodTracker /></div>
              } />
              <Route path="/meditation" element={
                <div className="bg-[#F5F5F0]"><Navbar /><MeditationPage /></div>
              } />
              <Route path="/brain-training" element={
                <div className="bg-[#F5F5F0]"><Navbar /><BrainTrainingPage /></div>
              } />
              <Route path="/brain-training/game/:gameId" element={
                <div className="bg-[#F5F5F0]"><Navbar /><BrainTrainingGameRouter /></div>
              } />
              <Route path="/brain-training/progress" element={
                <div className="bg-[#F5F5F0]"><Navbar /><BrainTrainingProgress /></div>
              } />
              <Route path="/community" element={
                <div className="bg-[#F5F5F0]"><Navbar /><PostList /></div>
              } />
              <Route path="/community/new" element={
                <div className="bg-[#F5F5F0]"><Navbar /><PostComposer /></div>
              } />
              <Route path="/community/:postId" element={
                <div className="bg-[#F5F5F0]"><Navbar /><PostDetail /></div>
              } />
              <Route path="/auth"     element={<AuthPage />} />
              <Route path="/login"    element={<AuthPage defaultTab="login" />} />
              <Route path="/register" element={<AuthPage defaultTab="register" />} />
            </Routes>
          </SoundProvider>
        </AuthProvider>
      </HelmetProvider>
    </Router>
  );
};

export default App;
