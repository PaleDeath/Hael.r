import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { WithClassName } from '../types/common';

interface NavbarProps {
  className?: string;
}

const Navbar: React.FC<NavbarProps> = ({ className = '' }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [savedAssessments, setSavedAssessments] = useState<any[]>([]);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return function(...args: any[]) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  const handleResize = useCallback(debounce(() => {
    setIsMobile(window.innerWidth < 768);
  }, 100), []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
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
    return () => {
      window.removeEventListener('storage', checkSavedAssessments);
    };
  }, []);

  if (isMobile) {
    return (
      <nav className="fixed top-0 left-0 w-full z-50">
        {/* Header with improved styling */}
        <div className="relative z-50 flex justify-between items-center px-5 py-5 bg-[#F5F5F0]/95 backdrop-blur-sm shadow-sm">
          <Link to="/" className="font-lexend text-2xl tracking-tight">
            Hael.r
          </Link>
          
          {/* Cleaner hamburger button */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="relative z-50 w-10 h-10 flex items-center justify-center"
            aria-label="Toggle menu"
          >
            <div className="w-7 flex flex-col items-end">
              <span className={`block h-[1.5px] bg-black transition-all duration-300 ease-out ${isMenuOpen ? 'w-6 -mb-[1.5px] rotate-45' : 'w-6 mb-[6px]'}`} />
              <span className={`block h-[1.5px] bg-black transition-all duration-300 ease-out ${isMenuOpen ? 'w-6 opacity-0' : 'w-4 mb-[6px]'}`} />
              <span className={`block h-[1.5px] bg-black transition-all duration-300 ease-out ${isMenuOpen ? 'w-6 -rotate-45' : 'w-6'}`} />
            </div>
          </button>
        </div>

        {/* Menu Overlay - improved design */}
        <div 
          className={`fixed inset-0 bg-gradient-to-b from-black to-gray-900 transition-all duration-500 ease-in-out ${
            isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="h-full px-8 pt-24 pb-16 flex flex-col">
            {/* Navigation Links */}
            <div className="flex-1 flex flex-col space-y-6">
              {[
                { path: '/', label: 'Home' },
                { path: '/quizpage', label: 'Assessment' },
                { path: '/assessment-history', label: 'History', hasNotification: savedAssessments.length > 0 },
                { path: '/mood-tracker', label: 'Mood' },
                { path: '/meditation', label: 'Meditation' },
                { path: '/community', label: 'Community' }
              ].map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="group block"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <span className="text-white font-light text-3xl transition-transform duration-300 group-hover:text-gray-300">
                      {item.label}
                    </span>
                    {item.hasNotification && (
                      <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full inline-block" />
                    )}
                  </div>
                  <div className="h-px w-0 bg-white mt-1 transition-all duration-300 group-hover:w-16" />
                </Link>
              ))}
            </div>
            
            {/* Footer */}
            <div className="pt-6 mt-auto border-t border-gray-800">
              <p className="text-gray-500 text-sm font-light">
                © 2025 Hael.r • Your mental health companion
              </p>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Desktop navbar
  return (
    <nav className={`fixed top-0 right-0 p-5 z-50 ${className}`}>
      <div className="relative">
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center space-x-2 text-sm font-inter opacity-80 hover:opacity-100 transition-opacity duration-300"
          aria-label="Menu"
        >
          <span>menu</span>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-4 w-4 transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isMenuOpen && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-white/95 backdrop-blur-md shadow-lg rounded-md overflow-hidden border border-gray-200 transition-all duration-300">
            <ul className="py-1">
              {[
                { path: '/', label: 'home.' },
                { path: '/quizpage', label: 'assessment.' },
                { path: '/assessment-history', label: 'history.', hasNotification: savedAssessments.length > 0 },
                { path: '/mood-tracker', label: 'mood.' },
                { path: '/meditation', label: 'meditation.' },
                { path: '/community', label: 'community.' }
              ].map((item) => (
                <li key={item.path}>
                  <Link 
                    to={item.path}
                    className={`block px-4 py-2 text-sm font-inter ${location.pathname === item.path ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <span>{item.label}</span>
                      {item.hasNotification && (
                        <span className="ml-2 w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
