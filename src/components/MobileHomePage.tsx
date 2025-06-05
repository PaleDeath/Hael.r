import React, { useRef, useEffect, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import Overlay from './Overlay';
import useTextAnimation from '../hooks/useTextAnimation';
import { ErrorBoundary } from 'react-error-boundary';
import Navbar from './Navbar';

// Lazy load the 3D components to reduce initial bundle size
const RotatingBrainContainer = lazy(() => import('./3D/RotatingBrainContainer'));
const ModelFallback = lazy(() => import('./ModelFallback'));

// Add props interface to match DesktopHomePage
interface MobileHomePageProps {
  isOverlayVisible?: boolean;
  isFadingOut?: boolean;
  handleEnter?: () => void;
}

const MobileHomePage: React.FC<MobileHomePageProps> = ({ 
  isOverlayVisible = true, 
  isFadingOut = false, 
  handleEnter = () => {} 
}) => {
  const logoRef = useRef<HTMLImageElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Text animation refs for each section
  const heroRef = useTextAnimation();
  const aboutRef = useTextAnimation();
  const hippoRef = useTextAnimation();
  const amygdalaRef = useTextAnimation();
  const neuroRef = useTextAnimation();
  const footerRef = useTextAnimation();

  useEffect(() => {
    console.log("MobileHomePage mounted");
    if (!isOverlayVisible) {
      const mainContainer = contentRef.current;
      if (mainContainer) {
        mainContainer.style.opacity = '1';
        mainContainer.style.display = 'block';
      }
    }
    console.log("Logo element:", logoRef.current);
    console.log("Content element:", contentRef.current);
    return () => {
      gsap.killTweensOf(logoRef.current);
    };
  }, [isOverlayVisible]);

  // Show the overlay if it's visible
  if (isOverlayVisible) {
    return <Overlay onEnter={handleEnter} isFadingOut={isFadingOut} />;
  }

  return (
    <div 
      ref={contentRef} 
      className="fixed inset-0 flex flex-col h-screen w-screen bg-[#F5F5F0] overflow-auto"
      style={{ display: 'block', opacity: 1 }} // Force visibility
    >
      {/* Use shared Navbar for consistency */}
      <Navbar />
      {/* Main Content - Structured to match desktop version */}
      <div className="flex flex-col flex-grow overflow-y-auto">
        {/* Header Section */}
        <section className="relative z-20 flex flex-col justify-center items-center px-4 py-10 mb-0">
          <h1 className="text-center justify-center font-light font-inter text-base pt-4 w-full">
            Discover peace of mind one day at a time
          </h1>
          <div className="text-center text-black relative w-full overflow-hidden mt-2">
            <div className="font-inter text-black text-[80px] font-thin tracking-wide mt-2 leading-none">
              H<span className="text-white">a</span><span className="text-white">e</span>l.r
            </div>
            <div className='font-inter font-light text-base mb-2'>
              Your personalized mental health companion. 
            </div>
            
            {/* Mobile-friendly version of the side text */}
            <div className="px-2 mb-2">
              <p className="text-black text-xs font-inter tracking-tight text-center">
                With a blend of evidence-based techniques and innovative features,
                Hael.r empowers you to take control of your mental wellness.
              </p>
            </div>
          </div>
          <div className='font-inter text-sm mt-2'>
            Scroll.
          </div>
        </section>

        {/* Vector Illustration Divider */}
        <div className="w-full py-4 flex justify-center items-center overflow-hidden">
          <ErrorBoundary fallback={<ModelFallback />}>
            <Suspense fallback={<ModelFallback />}>
              <RotatingBrainContainer />
            </Suspense>
          </ErrorBoundary>
        </div>

        {/* Hero Section - adjusted to reduce gap */}
        <section ref={heroRef} id='hero' className="py-8 relative z-20 flex flex-col justify-center px-4 mt-0">
          <div className="w-full text-center">
            <div className="font-inter text-black text-4xl font-thin tracking-wide leading-tight animate-text">
              What is <br /> Hael.r?
            </div>
          </div>
          
          {/* Info box for mobile */}
          <div className="w-full flex flex-col justify-center items-center mt-6">
            <div className="p-3 mb-4 animate-text w-full max-w-xs">
              <span className="block text-center mb-1 text-xs">More than an AI</span>
              <div className="border-2 border-black p-3 text-xs tracking-tight">
                Comprehensive mental health <br/> companion crafted to assist you in <br /> managing stress, anxiety,<br /> depression, and other mental<br /> health challenges.
              </div>
            </div>
          </div>
          
          <p className="mt-6 text-center font-inter text-xs px-4 animate-text">
            At Hael.r, we believe that mental well-being is the cornerstone of a fulfilling life. Our 
            app is designed to be your trusted companion on the journey to mental health, offering 
            personalized support and resources to help you thrive.
          </p>
        </section>

        {/* Vector Illustration Divider 2 */}
        <div className="w-full py-8 flex justify-center items-center overflow-hidden">
          <div className="w-4/5 h-[100px] relative">
            {/* This is a placeholder - replace with actual SVG vector */}
            <svg 
              className="w-full h-full"
              viewBox="0 0 800 200" 
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid meet"
            >
              <rect x="100" y="80" width="20" height="20" transform="rotate(45 110 90)" stroke="#000000" strokeWidth="1" fill="none" opacity="0.6" />
              <rect x="200" y="100" width="30" height="30" transform="rotate(30 215 115)" stroke="#000000" strokeWidth="1" fill="none" opacity="0.5" />
              <rect x="400" y="70" width="40" height="40" transform="rotate(15 420 90)" stroke="#000000" strokeWidth="1" fill="none" opacity="0.6" />
              <rect x="600" y="90" width="25" height="25" transform="rotate(60 612.5 102.5)" stroke="#000000" strokeWidth="1" fill="none" opacity="0.5" />
              <path
                d="M50,120 L750,120"
                stroke="#000000"
                strokeWidth="1"
                fill="none"
                strokeDasharray="1,5"
                opacity="0.5"
              />
              <path
                d="M50,140 L750,140"
                stroke="#000000"
                strokeWidth="1"
                fill="none"
                strokeDasharray="5,10"
                opacity="0.4"
              />
            </svg>
          </div>
        </div>

        {/* About Section */}
        <section ref={aboutRef} id="about" className="py-10 relative z-20 flex flex-col justify-center items-center px-4 animate-text">
          <h2 className="text-2xl font-light font-inter mb-4 text-center">Our Approach</h2>
          <p className="text-sm text-center max-w-md mb-6">
            Hael.r combines evidence-based psychological techniques with advanced AI to provide personalized mental health support.
          </p>
          <div className="border-2 border-black p-4 w-full max-w-sm">
            <p className="text-xs">
              We believe in a holistic approach to mental health, addressing both immediate symptoms and underlying causes.
            </p>
          </div>
        </section>

        {/* Vector Illustration Divider 3 */}
        <div className="w-full py-8 flex justify-center items-center overflow-hidden">
          <div className="w-4/5 h-[100px] relative">
            {/* This is a placeholder - replace with actual SVG vector */}
            <svg 
              className="w-full h-full"
              viewBox="0 0 800 200" 
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid meet"
            >
              <path
                d="M100,100 Q200,50 300,100 T500,100 T700,100"
                stroke="#000000"
                strokeWidth="1.5"
                fill="none"
                opacity="0.5"
              />
              <circle cx="150" cy="100" r="8" fill="none" stroke="#000000" strokeWidth="1" opacity="0.6" />
              <circle cx="350" cy="100" r="8" fill="none" stroke="#000000" strokeWidth="1" opacity="0.6" />
              <circle cx="550" cy="100" r="8" fill="none" stroke="#000000" strokeWidth="1" opacity="0.6" />
              <circle cx="650" cy="100" r="8" fill="none" stroke="#000000" strokeWidth="1" opacity="0.6" />
              <path
                d="M100,130 Q250,180 400,130 T700,130"
                stroke="#000000"
                strokeWidth="1"
                fill="none"
                opacity="0.4"
                strokeDasharray="2,4"
              />
            </svg>
          </div>
        </div>

        {/* Hippo Section */}
        <section ref={hippoRef} id="hippo" className="py-10 relative z-20 flex flex-col justify-center items-center px-4 animate-text">
          <h2 className="text-2xl font-light font-inter mb-4 text-center">The Hippocampus</h2>
          <p className="text-sm text-center max-w-md mb-6">
            The hippocampus plays a crucial role in forming, organizing, and storing memories. It's also involved in learning and emotional regulation.
          </p>
          <div className="w-full max-w-xs flex justify-center items-center mb-4">
            <img 
              src="images//hippocampus.png" 
              alt="Hippocampus illustration" 
              className="w-full h-auto"
            />
          </div>
          <p className="text-xs text-center max-w-md">
            Mental health conditions like depression and PTSD can affect the hippocampus, which is why maintaining mental wellness is essential for cognitive health.
          </p>
        </section>

        {/* Vector Illustration Divider 4 - Fixed with unique design */}
        <div className="w-full py-8 flex justify-center items-center overflow-hidden">
          <div className="w-4/5 h-[100px] relative">
            {/* This is a placeholder - replace with actual SVG vector */}
            <svg 
              className="w-full h-full"
              viewBox="0 0 800 200" 
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid meet"
            >
              <path
                d="M100,80 L700,80"
                stroke="#000000"
                strokeWidth="0.5"
                strokeDasharray="2,8"
                opacity="0.4"
              />
              <path
                d="M100,100 L700,100"
                stroke="#000000"
                strokeWidth="0.5"
                strokeDasharray="2,8"
                opacity="0.5"
              />
              <path
                d="M100,120 L700,120"
                stroke="#000000"
                strokeWidth="0.5"
                strokeDasharray="2,8"
                opacity="0.4"
              />
              <polygon points="200,70 220,100 200,130 180,100" stroke="#000000" strokeWidth="1" fill="none" opacity="0.6" />
              <polygon points="400,70 420,100 400,130 380,100" stroke="#000000" strokeWidth="1" fill="none" opacity="0.6" />
              <polygon points="600,70 620,100 600,130 580,100" stroke="#000000" strokeWidth="1" fill="none" opacity="0.6" />
            </svg>
          </div>
        </div>

        {/* Amygdala Section */}
        <section ref={amygdalaRef} id="amygdala" className="py-10 relative z-20 flex flex-col justify-center items-center px-4 animate-text">
          <h2 className="text-2xl font-light font-inter mb-4 text-center">The Amygdala</h2>
          <p className="text-sm text-center max-w-md mb-6">
            The amygdala is responsible for processing emotions, particularly fear and threat responses, helping us respond to danger.
          </p>
          <div className="w-full max-w-xs flex justify-center items-center mb-4">
            <img 
              src="/images/amygdala.jpg" 
              alt="Amygdala illustration" 
              className="w-full h-auto"
            />
          </div>
          <p className="text-xs text-center max-w-md">
            Our tools help regulate emotional responses by training your brain to better manage stress and anxiety triggers.
          </p>
        </section>

        {/* Vector Illustration Divider 5 */}
        <div className="w-full py-8 flex justify-center items-center overflow-hidden">
          <div className="w-4/5 h-[100px] relative">
            {/* This is a placeholder - replace with actual SVG vector */}
            <svg 
              className="w-full h-full"
              viewBox="0 0 800 200" 
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid meet"
            >
              <path
                d="M100,100 C200,150 300,50 400,100 C500,150 600,50 700,100"
                stroke="#000000"
                strokeWidth="1"
                fill="none"
                opacity="0.5"
              />
              <path
                d="M100,120 C250,70 350,170 500,120 C650,70 750,170 900,120"
                stroke="#000000"
                strokeWidth="0.5"
                fill="none"
                opacity="0.4"
              />
              <circle cx="250" cy="110" r="3" fill="#000000" opacity="0.5" />
              <circle cx="350" cy="90" r="3" fill="#000000" opacity="0.5" />
              <circle cx="450" cy="110" r="3" fill="#000000" opacity="0.5" />
              <circle cx="550" cy="90" r="3" fill="#000000" opacity="0.5" />
            </svg>
          </div>
        </div>

        {/* Neuro Section */}
        <section ref={neuroRef} id="neuro" className="py-10 relative z-20 flex flex-col justify-center items-center px-4 animate-text">
          <h2 className="text-2xl font-light font-inter mb-4 text-center">Neuroplasticity</h2>
          <p className="text-sm text-center max-w-md mb-6">
            Neuroplasticity is your brain's ability to reorganize itself by forming new neural connections throughout life.
          </p>
          <div className="w-full max-w-xs flex justify-center items-center mb-4">
            <img 
              src="/images/neuroplasticity.jpg" 
              alt="Neuroplasticity illustration" 
              className="w-full h-auto"
            />
          </div>
          <p className="text-xs text-center max-w-md">
            Through consistent practice of the techniques in Hael.r, you can reshape neural pathways and develop healthier mental patterns.
          </p>
        </section>

        {/* Vector Illustration Divider 6 */}
        <div className="w-full py-8 flex justify-center items-center overflow-hidden">
          <div className="w-4/5 h-[100px] relative">
            {/* This is a placeholder - replace with actual SVG vector */}
            <svg 
              className="w-full h-full"
              viewBox="0 0 800 200" 
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid meet"
            >
              <line x1="100" y1="100" x2="700" y2="100" stroke="#000000" strokeWidth="1" opacity="0.4" strokeDasharray="5,10" />
              <line x1="400" y1="70" x2="400" y2="130" stroke="#000000" strokeWidth="1" opacity="0.5" />
              <circle cx="400" cy="100" r="30" stroke="#000000" strokeWidth="0.5" fill="none" opacity="0.5" />
              <circle cx="400" cy="100" r="20" stroke="#000000" strokeWidth="0.5" fill="none" opacity="0.6" />
              <circle cx="400" cy="100" r="10" stroke="#000000" strokeWidth="0.5" fill="none" opacity="0.6" />
              <circle cx="250" cy="100" r="5" stroke="#000000" strokeWidth="0.5" fill="none" opacity="0.6" />
              <circle cx="550" cy="100" r="5" stroke="#000000" strokeWidth="0.5" fill="none" opacity="0.6" />
            </svg>
          </div>
        </div>

        {/* Footer Section */}
        <section ref={footerRef} id="footer" className="py-12 relative z-20 flex flex-col justify-center items-center px-4 font-inter font-light text-base animate-text">
          <div className="text-center mb-6">
            Discover Peace of Mind, One Day at a Time.
      </div>

          {/* CTA Button for Quiz */}
          <div className="mt-6 flex flex-col items-center">
            <p className="text-sm mb-4 text-center max-w-md">
              Ready to understand your mental health better? Take our comprehensive assessment now.
            </p>
            <Link 
              to="/quizpage" 
              className="inline-block bg-black hover:bg-gray-800 text-white font-medium py-3 px-8 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1 text-sm"
            >
              Take the Assessment
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MobileHomePage; 