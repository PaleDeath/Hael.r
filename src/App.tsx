import React, { useEffect, useState } from 'react';
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
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import QuizPage from './components/mental-health/QuizPage';
import AssessmentHistoryPage from './components/mental-health/AssessmentHistoryPage';
import MoodTracker from './components/mental-health/mood/MoodTracker';
import MeditationPage from './components/mental-health/meditation/MeditationPage';
import CommunityForum from './components/mental-health/community/CommunityForum';
import CustomCursor from './components/cursor/CustomCursor';
import { SoundProvider, useSoundManager } from './components/sound/SoundManager';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import MobileHomePage from './components/MobileHomePage';

gsap.registerPlugin(ScrollTrigger);

interface HomePageProps {
  isOverlayVisible: boolean;
  isFadingOut: boolean;
  handleEnter: () => void;
}

const DesktopHomePage: React.FC<HomePageProps> = ({ isOverlayVisible, isFadingOut, handleEnter }) => {
  const { playSound } = useSoundManager();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Set up parallax effects - optimized for mobile
  useEffect(() => {
    if (isMobile) {
      // Simpler animations for mobile
      const sections = document.querySelectorAll('.parallax-section');
      sections.forEach((section) => {
        gsap.to(section, {
          yPercent: -5,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
            markers: false
          }
        });
      });
    } else {
      // Full parallax for desktop
      const sections = document.querySelectorAll('.parallax-section');
      sections.forEach((section, i) => {
        const depth = i * 0.2; // Different parallax depths
        gsap.to(section, {
          yPercent: -(30 * depth),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
            markers: false
          }
        });
      });
    }
  }, [isMobile]);

  return (
    <div className="relative bg-[#F5F5F0]">
      <Helmet>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#F5F5F0" />
      </Helmet>
      
      {isOverlayVisible && <Overlay onEnter={handleEnter} isFadingOut={isFadingOut} />}
      <div 
        className={`transition-opacity duration-1000 ${
          isOverlayVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        onClick={() => playSound('click')}
      >
        <div className="h-screen w-full fixed top-0 z-10 transition-opacity duration-1000">
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

const HomePageSelector: React.FC<HomePageProps> = (props) => {
  const [isMobile, setIsMobile] = useState(false);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);

  // More reliable check for mobile view
  const checkIsMobile = () => {
    // Use both width and user agent as backup
    const width = window.innerWidth;
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileDevice = /mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(userAgent);
    
    // Set as mobile if either width is small or device is detected as mobile
    const mobile = width < 768 || isMobileDevice;
    console.log(`Screen width: ${width}, UserAgent mobile: ${isMobileDevice}, Setting isMobile: ${mobile}`);
    setIsMobile(mobile);
    
    // Mark initial check as complete
    if (!initialCheckComplete) {
      setInitialCheckComplete(true);
    }
  };

  useEffect(() => {
    console.log("HomePageSelector mounted");
    // Force immediate check
    checkIsMobile();
    
    // Add event listener
    window.addEventListener('resize', checkIsMobile);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  // Show a loading state until initial check completes
  if (!initialCheckComplete) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <div className="text-xl font-inter">Loading...</div>
      </div>
    );
  }

  // Ensure mobile homepage shows up immediately on load
  if (isMobile) {
    console.log("Rendering MobileHomePage");
    return <MobileHomePage 
      isOverlayVisible={props.isOverlayVisible}
      isFadingOut={props.isFadingOut}
      handleEnter={props.handleEnter}
    />;
  }

  console.log("Rendering DesktopHomePage");
  return <DesktopHomePage {...props} />;
};

const App: React.FC = () => {
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [lenis, setLenis] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const initLenis = () => {
      if (window.location.pathname === '/' && !isMobile) {
        const lenisInstance = new Lenis({
          duration: isMobile ? 0.8 : 1.2,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          wheelMultiplier: isMobile ? 0.8 : 1,
          touchMultiplier: isMobile ? 1.5 : 2,
        });

        const raf = (time: number) => {
          lenisInstance.raf(time);
          requestAnimationFrame(raf);
        };

        requestAnimationFrame(raf);
        setLenis(lenisInstance);

        return lenisInstance;
      }
      return null;
    };

    const lenisInstance = initLenis();

    return () => {
      if (lenisInstance) {
        lenisInstance.destroy();
      }
    };
  }, [isMobile]);

  // Clean up Lenis when navigating away from home page
  useEffect(() => {
    const handleRouteChange = () => {
      if (window.location.pathname !== '/' && lenis) {
        lenis.destroy();
        setLenis(null);
      } else if (window.location.pathname === '/' && !lenis && !isMobile) {
        const lenisInstance = new Lenis({
          duration: isMobile ? 0.8 : 1.2,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          wheelMultiplier: isMobile ? 0.8 : 1,
          touchMultiplier: isMobile ? 1.5 : 2,
        });

        const raf = (time: number) => {
          lenisInstance.raf(time);
          requestAnimationFrame(raf);
        };

        requestAnimationFrame(raf);
        setLenis(lenisInstance);
      }
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [lenis, isMobile]);

  const handleEnter = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setIsOverlayVisible(false);
    }, 1000);
  };

  return (
    <Router>
      <HelmetProvider>
        <SoundProvider>
          {/* Only show custom cursor on non-mobile devices */}
          {!isMobile && <CustomCursor />}
          <Helmet>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
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
            <Route path="/quizpage" element={
              <div className="bg-[#F5F5F0]">
                <Navbar />
                <QuizPage />
              </div>
            } />
            <Route path="/assessment" element={
              <div className="bg-[#F5F5F0]">
                <Navbar />
                <QuizPage />
              </div>
            } />
            <Route path="/assessment-history" element={
              <div className="bg-[#F5F5F0]">
                <Navbar />
                <AssessmentHistoryPage />
              </div>
            } />
            <Route path="/mood-tracker" element={
              <div className="bg-[#F5F5F0]">
                <Navbar />
                <MoodTracker />
              </div>
            } />
            <Route path="/meditation" element={
              <div className="bg-[#F5F5F0]">
                <Navbar />
                <MeditationPage />
              </div>
            } />
            <Route path="/community" element={
              <div className="bg-[#F5F5F0]">
                <Navbar />
                <CommunityForum />
              </div>
            } />
          </Routes>
        </SoundProvider>
      </HelmetProvider>
    </Router>
  );
};

export default App;
