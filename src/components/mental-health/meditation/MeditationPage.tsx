// NOTE: Lenis smooth scroll is initialized globally in App.tsx.
// ScrollTrigger works with native scroll. If smooth scroll issues arise,
// initialize Lenis locally and sync with ScrollTrigger.update().

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger as _ScrollTrigger } from 'gsap/ScrollTrigger';
import MeditationPlayer from './MeditationPlayer';
import { useAuth } from '../../../contexts/AuthContext';
import firebaseMeditationService from '../../../services/firebase.meditation.service';
import { Loader2 as _Loader2, TrendingUp, Clock, Flame, AlertCircle } from 'lucide-react';

// Define the meditation stats type for better type safety
interface LocalMeditationStats {
  completedSessions: number;
  totalMinutes: number;
  streak: number;
}

// Helper function to calculate streak from localStorage sessions
const calculateLocalStorageStreak = (sessions: any[]): number => {
  if (sessions.length === 0) return 0;
  
  // Sort sessions by date (newest first)
  const sortedSessions = [...sessions]
    .map(s => ({
      ...s,
      date: new Date(s.date)
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  
  // Get unique dates (one session per day counts)
  const uniqueDates: string[] = [];
  sortedSessions.forEach(session => {
    const dateKey = session.date.toDateString();
    if (!uniqueDates.includes(dateKey)) {
      uniqueDates.push(dateKey);
    }
  });
  
  if (uniqueDates.length === 0) return 0;
  
  // Check if most recent session was today or yesterday
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const latestDate = new Date(uniqueDates[0]);
  const daysSinceLatest = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceLatest > 1) return 0; // Streak broken
  
  // Calculate streak backwards
  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const currentDate = new Date(uniqueDates[i - 1]);
    const prevDate = new Date(uniqueDates[i]);
    const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
};

const MeditationPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const serifFont = "'Cormorant Garamond', serif";
  const sansFont = "'DM Sans', sans-serif";

  const pageContentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const statsContainerRef = useRef<HTMLDivElement>(null);
  const sessionsNumRef = useRef<HTMLDivElement>(null);
  const minutesNumRef = useRef<HTMLDivElement>(null);
  const streakNumRef = useRef<HTMLDivElement>(null);
  const hasAnimatedStats = useRef(false);
  const benefitsSectionRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState<LocalMeditationStats>({
    completedSessions: 0,
    totalMinutes: 0,
    streak: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const linkId = 'meditation-page-fonts';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // Load meditation stats from Firebase with localStorage fallback
  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (currentUser) {
          // Load from Firebase for authenticated users
          try {
            const statsResult = await firebaseMeditationService.getMeditationStats();
            if (statsResult.success && statsResult.stats) {
              const s = statsResult.stats;
              setStats({
                completedSessions: s.completedSessions ?? s.sessionsThisMonth ?? 0,
                totalMinutes: s.totalMinutes,
                streak: s.currentStreak
              });
              console.log('Loaded meditation stats from Firebase');
            } else {
              console.warn('Failed to load from Firebase, falling back to localStorage:', statsResult.message);
              loadFromLocalStorage();
            }
          } catch (error) {
            console.error('Error loading from Firebase, using localStorage fallback:', error);
            loadFromLocalStorage();
          }
        } else {
          // Load from localStorage for non-authenticated users
          loadFromLocalStorage();
        }
      } catch (err: any) {
        console.error('Error loading meditation stats:', err);
        setError(err.message || 'Failed to load meditation stats');
      } finally {
        setLoading(false);
      }
    };

    const loadFromLocalStorage = () => {
      try {
        // Try to load from stats first
        const savedStats = localStorage.getItem('meditationStats');
        if (savedStats) {
          const parsedStats = JSON.parse(savedStats);
          // Recalculate streak from sessions if available
          const sessions = JSON.parse(localStorage.getItem('meditationSessions') || '[]');
          const calculatedStreak = calculateLocalStorageStreak(sessions);
          
          setStats({
            completedSessions: parsedStats.completedSessions || 0,
            totalMinutes: parsedStats.totalMinutes || 0,
            streak: calculatedStreak || parsedStats.streak || 0
          });
          console.log('Loaded meditation stats from localStorage');
        } else {
          // Try to calculate from sessions
          const sessions = JSON.parse(localStorage.getItem('meditationSessions') || '[]');
          if (sessions.length > 0) {
            const totalMinutes = sessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
            const streak = calculateLocalStorageStreak(sessions);
            
            setStats({
              completedSessions: sessions.length,
              totalMinutes,
              streak
            });
            
            // Save calculated stats
            localStorage.setItem('meditationStats', JSON.stringify({
              completedSessions: sessions.length,
              totalMinutes,
              streak
            }));
          }
        }
      } catch (error) {
        console.error('Error loading from localStorage:', error);
        setError('Failed to load meditation stats');
      }
    };

    loadStats();
  }, [currentUser]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (pageContentRef.current) {
        gsap.from(pageContentRef.current, {
          opacity: 0,
          duration: 0.6,
          ease: 'power2.out'
        });
      }

      if (titleRef.current) {
        const text = titleRef.current.textContent || '';
        const words = text.split(' ');
        titleRef.current.innerHTML = words.map(w => `<span class="inline-block" style="font-family: ${serifFont}">${w}&nbsp;</span>`).join('');
        gsap.from(titleRef.current.querySelectorAll('span'), {
          y: 30,
          opacity: 0,
          duration: 1,
          stagger: 0.08,
          ease: 'power3.out'
        });
      }

      if (subtitleRef.current) {
        gsap.from(subtitleRef.current, {
          y: 20,
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
          delay: 0.5
        });
      }
    }, pageContentRef);

    return () => ctx.revert();
  }, [serifFont]);

  useEffect(() => {
    if (loading || hasAnimatedStats.current) return;

    const ctx = gsap.context(() => {
      const statsCards = statsContainerRef.current?.querySelectorAll('.stat-card');
      if (statsCards && statsCards.length > 0) {
        gsap.from(statsCards, {
          y: 40,
          opacity: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: 'power2.out',
          delay: 0.3,
          scrollTrigger: {
            trigger: statsContainerRef.current,
            start: 'top 95%',
            once: true
          }
        });
      }

      const animateNumber = (
        ref: React.RefObject<HTMLDivElement | null>,
        targetValue: number,
        delay: number
      ) => {
        if (!ref.current) return;
        if (targetValue === 0) {
          ref.current.textContent = '0';
          return;
        }
        const obj = { val: 0 };
        gsap.to(obj, {
          val: targetValue,
          duration: 1.5,
          delay,
          ease: 'power2.out',
          snap: { val: 1 },
          scrollTrigger: {
            trigger: statsContainerRef.current,
            start: 'top 95%',
            once: true
          },
          onUpdate: () => {
            if (ref.current) ref.current.textContent = String(Math.round(obj.val));
          },
          onComplete: () => {
            if (ref.current) ref.current.textContent = String(targetValue);
          }
        });
      };

      animateNumber(sessionsNumRef, stats.completedSessions, 0);
      animateNumber(minutesNumRef, stats.totalMinutes, 0.2);
      animateNumber(streakNumRef, stats.streak, 0.4);

      hasAnimatedStats.current = true;
    }, statsContainerRef);

    requestAnimationFrame(() => {
      _ScrollTrigger.refresh();
    });

    return () => ctx.revert();
  }, [loading, stats]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        if (sessionsNumRef.current && sessionsNumRef.current.textContent === '0' && stats.completedSessions > 0) {
          sessionsNumRef.current.textContent = String(stats.completedSessions);
        }
        if (minutesNumRef.current && minutesNumRef.current.textContent === '0' && stats.totalMinutes > 0) {
          minutesNumRef.current.textContent = String(stats.totalMinutes);
        }
        if (streakNumRef.current && streakNumRef.current.textContent === '0' && stats.streak > 0) {
          streakNumRef.current.textContent = String(stats.streak);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [loading, stats]);

  useEffect(() => {
    if (!benefitsSectionRef.current) return;

    const ctx = gsap.context(() => {
      const items = benefitsSectionRef.current!.querySelectorAll('.benefit-item');

      items.forEach((item, i) => {
        const line = item.querySelector('.accent-line');
        const text = item.querySelector('.benefit-text');

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: item,
            start: 'top 88%',
            once: true
          }
        });

        if (line) {
          tl.from(line, {
            scaleY: 0,
            transformOrigin: 'top',
            duration: 0.5,
            ease: 'power2.out',
            delay: i * 0.1
          });
        }

        if (text) {
          tl.from(
            text,
            {
              x: -20,
              opacity: 0,
              duration: 0.6,
              ease: 'power2.out'
            },
            '-=0.3'
          );
        }
      });
    }, benefitsSectionRef);

    return () => ctx.revert();
  }, []);

  // Handle session completion with Firebase and localStorage support
  const handleSessionComplete = async (meditationType: 'breathing' | 'body-scan' | 'mindfulness' | 'loving-kindness' | 'custom', duration: number) => {
    try {
      if (currentUser) {
        // Save to Firebase for authenticated users
        try {
          const result = await firebaseMeditationService.createMeditationSession({
            type: meditationType,
            duration,
            completed: true
          });

          if (result.success) {
            console.log('Meditation session saved to Firebase:', result.session?.id);
        
            // Refresh stats from Firebase
            const statsResult = await firebaseMeditationService.getMeditationStats();
            if (statsResult.success && statsResult.stats) {
              const s = statsResult.stats;
              setStats({
                completedSessions: s.completedSessions ?? s.sessionsThisMonth ?? 0,
                totalMinutes: s.totalMinutes,
                streak: s.currentStreak
              });
            }
          } else {
            console.error('Failed to save to Firebase, falling back to localStorage:', result.message);
            throw new Error(result.message);
          }
        } catch (error) {
          console.error('Error saving to Firebase, using localStorage fallback:', error);
          saveToLocalStorage(meditationType, duration);
        }
      } else {
        // Save to localStorage for non-authenticated users
        saveToLocalStorage(meditationType, duration);
      }
    } catch (error: any) {
      console.error('Error completing meditation session:', error);
      setError(error.message || 'Failed to save meditation session');
    }
  };

  const saveToLocalStorage = (meditationType: string, duration: number) => {
    try {
      // Save individual session with precise duration (decimal minutes)
      const sessions = JSON.parse(localStorage.getItem('meditationSessions') || '[]');
      const newSession = {
        id: Date.now().toString(),
        type: meditationType,
        duration, // Already in decimal minutes (e.g., 1.25 for 75 seconds)
        date: new Date().toISOString(),
        completed: true
      };
      sessions.push(newSession);
      localStorage.setItem('meditationSessions', JSON.stringify(sessions));

      // Recalculate stats including streak
      // Sum all durations (already in decimal minutes) for precise total
      const totalMinutes = sessions.reduce((sum: number, s: any) => {
        const sessionDuration = s.duration || 0;
        return sum + sessionDuration;
      }, 0);
      
      // Round to 2 decimal places to avoid floating point errors
      const roundedTotalMinutes = Math.round(totalMinutes * 100) / 100;
      
      const streak = calculateLocalStorageStreak(sessions);
      
      const newStats: LocalMeditationStats = {
        completedSessions: sessions.length,
        totalMinutes: roundedTotalMinutes,
        streak
      };
      
      setStats(newStats);
      localStorage.setItem('meditationStats', JSON.stringify(newStats));
      console.log('Meditation session saved to localStorage');
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      setError('Failed to save meditation session');
    }
  };
  
  // Remove authentication gate - show the component for everyone
  return (
    <div className="min-h-screen bg-[#F5F5F0] relative">
      <style>{`
        @keyframes gradientShift {
          0%, 100% { background: radial-gradient(ellipse at 30% 20%, rgba(184,169,201,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(139,158,139,0.12) 0%, transparent 50%), #F5F0E8; }
          50% { background: radial-gradient(ellipse at 60% 70%, rgba(201,160,107,0.12) 0%, transparent 50%), radial-gradient(ellipse at 20% 30%, rgba(184,169,201,0.10) 0%, transparent 50%), #F5F0E8; }
        }
        @keyframes floatA { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, -30px); } }
        @keyframes floatB { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-25px, 20px); } }
        @keyframes floatC { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(15px, 25px); } }
      `}</style>
      <svg className="fixed w-0 h-0" aria-hidden="true">
        <filter id="meditation-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
      </svg>
      <div
        className="fixed inset-0 z-0 animate-[gradientShift_25s_ease-in-out_infinite]"
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.03]"
        style={{ filter: 'url(#meditation-grain)' }}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="absolute rounded-full animate-[floatA_20s_ease-in-out_infinite]"
          style={{
            width: 250,
            height: 250,
            top: '10%',
            left: '15%',
            background: 'radial-gradient(circle, rgba(166,150,184,0.14) 0%, transparent 70%)',
            filter: 'blur(50px)'
          }}
        />
        <div
          className="absolute rounded-full animate-[floatB_18s_ease-in-out_infinite_2s]"
          style={{
            width: 200,
            height: 200,
            top: '60%',
            right: '10%',
            background: 'radial-gradient(circle, rgba(122,154,122,0.12) 0%, transparent 70%)',
            filter: 'blur(50px)'
          }}
        />
        <div
          className="absolute rounded-full animate-[floatC_22s_ease-in-out_infinite_5s]"
          style={{
            width: 180,
            height: 180,
            bottom: '15%',
            left: '40%',
            background: 'radial-gradient(circle, rgba(192,144,80,0.10) 0%, transparent 70%)',
            filter: 'blur(50px)'
          }}
        />
        <div
          className="absolute rounded-full animate-[floatA_25s_ease-in-out_infinite_8s]"
          style={{
            width: 160,
            height: 160,
            top: '35%',
            right: '30%',
            background: 'radial-gradient(circle, rgba(107,141,168,0.10) 0%, transparent 70%)',
            filter: 'blur(50px)'
          }}
        />
      </div>

      <div ref={pageContentRef} className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1
              ref={titleRef}
              style={{ fontFamily: serifFont, letterSpacing: '-0.02em' }}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light text-[#2C2C2C] mb-2"
            >
              Meditation & Mindfulness
            </h1>
            <p
              ref={subtitleRef}
              style={{ fontFamily: sansFont }}
              className="text-base text-[#6B6B6B] mt-1"
            >
              Find peace and clarity through guided meditation
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="group flex items-center gap-2 text-[#6B6B6B] hover:text-[#2C2C2C] text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B9E8B] focus-visible:ring-offset-2 rounded-lg px-2 py-1 active:scale-[0.97]"
            style={{ fontFamily: sansFont }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        </div>
        <div className="w-16 h-[1px] bg-[#8B9E8B] mt-2 mb-10" />

        {!currentUser && (
          <div className="bg-white/40 backdrop-blur-sm border border-[rgba(0,0,0,0.06)] rounded-xl p-4 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#9B9B9B] flex-shrink-0 mt-0.5" />
              <p style={{ fontFamily: sansFont }} className="text-[#6B6B6B] text-sm">
                You&apos;re using local storage for meditation tracking.{' '}
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="text-[#2C2C2C] underline decoration-[#8B9E8B] hover:decoration-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B9E8B] focus-visible:ring-offset-2 rounded active:scale-[0.98]"
                >
                  Sign in
                </button>{' '}
                to sync your data across devices.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-[#C97B6B]/10 border border-[#C97B6B]/20 rounded-xl text-sm flex items-start gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <AlertCircle className="w-5 h-5 text-[#C97B6B] flex-shrink-0 mt-0.5" />
            <div style={{ fontFamily: sansFont }} className="text-[#8B4B3B]">
              {error}
            </div>
          </div>
        )}

        <div ref={statsContainerRef} className="mb-12">
          <h2
            style={{ fontFamily: serifFont }}
            className="text-xl sm:text-2xl md:text-3xl font-light text-[#2C2C2C] mb-8"
          >
            Your Meditation Journey
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-[#E8E3DB] rounded-2xl h-48 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="stat-card bg-white/80 backdrop-blur-md border border-white/50 border-t-[3px] border-t-[#7A9A7A] rounded-2xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] transition-all duration-300">
                <Clock className="w-7 h-7 text-[#8B9E8B] mb-4 hover:rotate-[15deg] hover:scale-110 transition-transform duration-300" />
                <div
                  ref={sessionsNumRef}
                  style={{ fontFamily: serifFont }}
                  className="text-5xl md:text-6xl font-light text-[#2C2C2C] mb-2"
                >
                  {stats.completedSessions}
                </div>
                <div style={{ fontFamily: sansFont }} className="text-xs uppercase tracking-[0.15em] text-[#9B9B9B]">
                  Sessions Completed
                </div>
              </div>

              <div className="stat-card bg-white/80 backdrop-blur-md border border-white/50 border-t-[3px] border-t-[#A696B8] rounded-2xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] transition-all duration-300">
                <TrendingUp className="w-7 h-7 text-[#B8A9C9] mb-4 hover:rotate-[15deg] hover:scale-110 transition-transform duration-300" />
                <div
                  ref={minutesNumRef}
                  style={{ fontFamily: serifFont }}
                  className="text-5xl md:text-6xl font-light text-[#2C2C2C] mb-2"
                >
                  {stats.totalMinutes}
                </div>
                <div style={{ fontFamily: sansFont }} className="text-xs uppercase tracking-[0.15em] text-[#9B9B9B]">
                  Total Minutes
                </div>
              </div>

              <div className="stat-card bg-white/80 backdrop-blur-md border border-white/50 border-t-[3px] border-t-[#C09050] rounded-2xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] transition-all duration-300">
                <Flame className="w-7 h-7 text-[#C9A06B] mb-4 hover:rotate-[15deg] hover:scale-110 transition-transform duration-300" />
                <div
                  ref={streakNumRef}
                  style={{ fontFamily: serifFont }}
                  className="text-5xl md:text-6xl font-light text-[#2C2C2C] mb-2"
                >
                  {stats.streak}
                </div>
                <div style={{ fontFamily: sansFont }} className="text-xs uppercase tracking-[0.15em] text-[#9B9B9B]">
                  Day Streak
                </div>
              </div>
            </div>
          )}
        </div>

        <div ref={benefitsSectionRef} className="mb-12">
          <h2
            style={{ fontFamily: serifFont }}
            className="text-xl sm:text-2xl md:text-3xl font-light text-[#2C2C2C] mb-10"
          >
            Benefits of Regular Meditation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
            <div className="benefit-item flex items-start gap-5">
              <div
                className="accent-line w-[3px] h-12 rounded-full flex-shrink-0 bg-[#7A9A7A]"
                style={{ boxShadow: '2px 0 8px rgba(122,154,122,0.15)' }}
              />
              <div className="benefit-text">
                <h3 style={{ fontFamily: sansFont }} className="font-semibold text-[#2C2C2C] text-base mb-1.5">
                  Reduces Stress
                </h3>
                <p style={{ fontFamily: sansFont }} className="text-sm text-[#6B6B6B] leading-relaxed">
                  Regular meditation lowers cortisol levels, reducing stress and anxiety.
                </p>
              </div>
            </div>

            <div className="benefit-item flex items-start gap-5">
              <div
                className="accent-line w-[3px] h-12 rounded-full flex-shrink-0 bg-[#A696B8]"
                style={{ boxShadow: '2px 0 8px rgba(166,150,184,0.15)' }}
              />
              <div className="benefit-text">
                <h3 style={{ fontFamily: sansFont }} className="font-semibold text-[#2C2C2C] text-base mb-1.5">
                  Improves Focus
                </h3>
                <p style={{ fontFamily: sansFont }} className="text-sm text-[#6B6B6B] leading-relaxed">
                  Meditation strengthens attention and concentration skills.
                </p>
              </div>
            </div>

            <div className="benefit-item flex items-start gap-5">
              <div
                className="accent-line w-[3px] h-12 rounded-full flex-shrink-0 bg-[#C09050]"
                style={{ boxShadow: '2px 0 8px rgba(192,144,80,0.15)' }}
              />
              <div className="benefit-text">
                <h3 style={{ fontFamily: sansFont }} className="font-semibold text-[#2C2C2C] text-base mb-1.5">
                  Enhances Emotional Health
                </h3>
                <p style={{ fontFamily: sansFont }} className="text-sm text-[#6B6B6B] leading-relaxed">
                  Improves self-awareness and promotes emotional well-being.
                </p>
              </div>
            </div>

            <div className="benefit-item flex items-start gap-5">
              <div
                className="accent-line w-[3px] h-12 rounded-full flex-shrink-0 bg-[#6B8DA8]"
                style={{ boxShadow: '2px 0 8px rgba(107,141,168,0.15)' }}
              />
              <div className="benefit-text">
                <h3 style={{ fontFamily: sansFont }} className="font-semibold text-[#2C2C2C] text-base mb-1.5">
                  Better Sleep
                </h3>
                <p style={{ fontFamily: sansFont }} className="text-sm text-[#6B6B6B] leading-relaxed">
                  Meditation can help improve sleep quality and reduce insomnia.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[rgba(0,0,0,0.06)] to-transparent my-8" />

        <MeditationPlayer onSessionComplete={(minutes: number) => { void handleSessionComplete('mindfulness', minutes); }} />
      </div>
    </div>
  );
};

export default MeditationPage;
