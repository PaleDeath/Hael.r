import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import Toast, { ToastType } from '../../ui/Toast';

interface MeditationExercise {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  audioSrc: string;
  category: 'anxiety' | 'depression' | 'stress' | 'sleep' | 'focus';
  level: 'beginner' | 'intermediate' | 'advanced';
  thumbnailSrc?: string;
}

interface MeditationPlayerProps {
  onSessionComplete?: (minutes: number) => void;
}

const SAMPLE_MEDITATIONS: MeditationExercise[] = [
  {
    id: 'breathing-1',
    title: 'Calm Breathing',
    description: 'A simple breathing exercise to reduce anxiety and promote relaxation.',
    duration: 5,
    audioSrc: '/meditations/Calm Breathing.mp3',
    category: 'anxiety',
    level: 'beginner',
    thumbnailSrc: '/images/meditation-breathing.svg'
  },
  {
    id: 'body-scan-1',
    title: 'Body Scan Relaxation',
    description: 'Progressive muscle relaxation to release tension and reduce stress.',
    duration: 10,
    audioSrc: '/meditations/Body Scan.mp3',
    category: 'stress',
    level: 'beginner',
    thumbnailSrc: '/images/meditation-body-scan.svg'
  },
  {
    id: 'sleep-1',
    title: 'Sleep Meditation',
    description: 'Gentle guided meditation to help you fall asleep quickly and easily.',
    duration: 15,
    audioSrc: '/meditations/Sleep Meditation.mp3',
    category: 'sleep',
    level: 'beginner',
    thumbnailSrc: '/images/meditation-sleep.svg'
  },
  {
    id: 'depression-1',
    title: 'Mindful Awareness',
    description: 'Develop mindful awareness to help with symptoms of depression.',
    duration: 12,
    audioSrc: '/meditations/Mindful Awareness.mp3',
    category: 'depression',
    level: 'beginner',
    thumbnailSrc: '/images/meditation-mindful-awareness.svg'
  },
  {
    id: 'focus-1',
    title: 'Concentration Practice',
    description: 'Improve your focus and concentration through mindful attention.',
    duration: 8,
    audioSrc: '/meditations/Concentration Practice.mp3',
    category: 'focus',
    level: 'intermediate',
    thumbnailSrc: '/images/meditation-concentration.svg'
  },
  {
    id: 'anxiety-2',
    title: 'Grounding Technique',
    description: 'Use this 5-4-3-2-1 sensory grounding technique to reduce anxiety.',
    duration: 7,
    audioSrc: '/meditations/Grounding Technique.mp3',
    category: 'anxiety',
    level: 'beginner',
    thumbnailSrc: '/images/meditation-grounding.svg'
  },
  {
    id: 'stress-2',
    title: 'Loving-Kindness Meditation',
    description: 'Cultivate compassion and kindness to reduce stress and improve wellbeing.',
    duration: 12,
    audioSrc: '/meditations/Loving-Kindness Meditation.mp3',
    category: 'stress',
    level: 'intermediate',
    thumbnailSrc: '/images/meditation-loving-kindness.svg'
  },
  {
    id: 'sleep-2',
    title: 'Deep Relaxation',
    description: 'A deep relaxation practice to prepare the mind and body for sleep.',
    duration: 20,
    audioSrc: '/meditations/Deep Relaxation.mp3',
    category: 'sleep',
    level: 'intermediate',
    thumbnailSrc: '/images/meditation-deep-relaxation.svg'
  }
];

const MeditationPlayer: React.FC<MeditationPlayerProps> = ({ onSessionComplete }) => {
  const navigate = useNavigate();

  const serifFont = "'Cormorant Garamond', serif";
  const sansFont = "'DM Sans', sans-serif";

  const [currentMeditation, setCurrentMeditation] = useState<MeditationExercise | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  // const [isSeeking, setIsSeeking] = useState(false); // Temporarily disabled
  const [seekValue, setSeekValue] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0); // Track total paused time
  const pauseStartRef = useRef<number | null>(null);
  const totalDurationRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);

  const breathingCircleRef = useRef<HTMLDivElement>(null);
  const ring1Ref = useRef<HTMLDivElement>(null);
  const ring2Ref = useRef<HTMLDivElement>(null);
  const breathingTlRef = useRef<gsap.core.Timeline | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const categories = [
    { value: 'all', label: 'All Exercises' },
    { value: 'anxiety', label: 'Anxiety Relief' },
    { value: 'depression', label: 'Mood Improvement' },
    { value: 'stress', label: 'Stress Reduction' },
    { value: 'sleep', label: 'Better Sleep' },
    { value: 'focus', label: 'Focus & Productivity' }
  ];

  const filteredMeditations = selectedCategory === 'all' 
    ? SAMPLE_MEDITATIONS 
    : SAMPLE_MEDITATIONS.filter(m => m.category === selectedCategory);

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

  const getCategoryGradient = (category: string): string => {
    const gradients: Record<string, string> = {
      anxiety: 'linear-gradient(135deg, #E8D5B7, #B8A9C9)',
      stress: 'linear-gradient(135deg, #B8C9A9, #D4C5A9)',
      sleep: 'linear-gradient(135deg, #A9B8C9, #C9B8D4)',
      depression: 'linear-gradient(135deg, #C9C0B8, #D4B8C5)',
      focus: 'linear-gradient(135deg, #C5D4A9, #A9C9B8)'
    };
    return gradients[category] || 'linear-gradient(135deg, #D4D4D4, #E5E5E5)';
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      anxiety: '#B8A9C9',
      stress: '#8B9E8B',
      sleep: '#7B9DB8',
      depression: '#C9A06B',
      focus: '#A9C9B8'
    };
    return colors[category] || '#8B9E8B';
  };

  useEffect(() => {
    if (!gridRef.current) return;
    const ctx = gsap.context(() => {
      const cards = gridRef.current!.querySelectorAll('.exercise-card');
      if (cards.length === 0) return;
      gsap.fromTo(
        cards,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out' }
      );
    }, gridRef);
    return () => ctx.revert();
  }, [selectedCategory]);

  useEffect(() => {
    if (!breathingCircleRef.current || !ring1Ref.current || !ring2Ref.current) return;
    if (!currentMeditation) return;

    const ctx = gsap.context(() => {
      if (breathingTlRef.current) {
        breathingTlRef.current.kill();
        breathingTlRef.current = null;
      }

      if (isPlaying) {
        const tl = gsap.timeline({ repeat: -1, yoyo: true });
        tl.to(breathingCircleRef.current!, { scale: 1.15, duration: 4,  ease: 'sine.inOut' }, 0);
        tl.to(ring2Ref.current!, { scale: 1.1, opacity: 0.25, duration: 4, ease: 'sine.inOut' }, 0.3);
        tl.to(ring1Ref.current!, { scale: 1.08, opacity: 0.2, duration: 4, ease: 'sine.inOut' }, 0.6);
        breathingTlRef.current = tl;
      } else {
        gsap.to(breathingCircleRef.current, { scale: 1, duration: 0.8, ease: 'power2.out' });
        gsap.to(ring1Ref.current, { scale: 1, opacity: 0.15, duration: 0.8, ease: 'power2.out' });
        gsap.to(ring2Ref.current, { scale: 1, opacity: 0.2, duration: 0.8, ease: 'power2.out' });
      }
    });

    return () => {
      ctx.revert();
      if (breathingTlRef.current) {
        breathingTlRef.current.kill();
        breathingTlRef.current = null;
      }
    };
  }, [isPlaying, currentMeditation]);

  useEffect(() => {
    if (currentMeditation && playerContainerRef.current) {
      const ctx = gsap.context(() => {
        gsap.from(playerContainerRef.current!, {
          opacity: 0,
          scale: 0.97,
          duration: 0.5,
          ease: 'power2.out'
        });
      });
      return () => ctx.revert();
    }
  }, [currentMeditation]);

  const startMeditation = (meditation: MeditationExercise) => {
    setCurrentMeditation(meditation);
    setIsPlaying(true);
    const totalSeconds = meditation.duration * 60;
    setRemainingTime(totalSeconds);
    setProgress(0);
    setSeekValue(0);
    setElapsedSeconds(0);
    setSessionCompleted(false);
    // setIsSeeking(false); // Temporarily disabled
    isSeekingRef.current = false;
    startTimeRef.current = Date.now();
    pausedTimeRef.current = 0;
    pauseStartRef.current = null;
    totalDurationRef.current = totalSeconds;
    
    // In a real app, this would load and play the audio file
    if (audioRef.current) {
      audioRef.current.src = meditation.audioSrc;
      audioRef.current.play().catch(err => {
        console.error('Failed to play audio:', err);
        // For demo purposes, we'll continue the countdown even if audio fails
      });
    }
    
    // Start the countdown with precise second tracking
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      // Don't update if user is seeking
      if (isSeekingRef.current) return;
      
      // Calculate precise elapsed time (excluding paused time)
      if (startTimeRef.current) {
        const now = Date.now();
        // Account for current pause if paused
        const currentPauseTime = pauseStartRef.current ? (now - pauseStartRef.current) : 0;
        const elapsedMs = now - startTimeRef.current - pausedTimeRef.current - currentPauseTime;
        const elapsedSec = Math.floor(elapsedMs / 1000);
        
        setElapsedSeconds(elapsedSec);
        
        // Update remaining time
        const newRemainingTime = Math.max(0, totalSeconds - elapsedSec);
        setRemainingTime(newRemainingTime);
        
        // Update progress percentage
        const newProgress = Math.min(100, (elapsedSec / totalSeconds) * 100);
        setProgress(newProgress);
        setSeekValue(newProgress);
        
        // Check completion thresholds
        if (newRemainingTime <= 0 && !sessionCompleted) {
          endMeditation(true, 'timer'); // Timer completed
        } else if (newProgress >= 100 && !sessionCompleted) {
          endMeditation(true, 'progress'); // Progress completed
        }
      }
    }, 100); // Update every 100ms for precision, but we round to seconds
  };

  const pauseMeditation = () => {
    setIsPlaying(false);
    pauseStartRef.current = Date.now(); // Track when pause started
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    // Keep interval running to track paused time accurately
  };

  const resumeMeditation = () => {
    // If no start time is set, this is a fresh start after stop - reset everything
    if (!startTimeRef.current || elapsedSeconds === 0) {
      // Start fresh session
      if (currentMeditation) {
        startMeditation(currentMeditation);
      }
      return;
    }
    
    // Otherwise, resume from where we paused
    setIsPlaying(true);
    // setIsSeeking(false); // Temporarily disabled
    isSeekingRef.current = false;
    
    // Add paused time to total paused time
    if (pauseStartRef.current) {
      pausedTimeRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
    
    // Restart interval if it's not running
    if (!intervalRef.current && currentMeditation) {
      const totalSeconds = currentMeditation.duration * 60;
      intervalRef.current = setInterval(() => {
        // Don't update if user is seeking
        if (isSeekingRef.current) return;
        
        // Calculate precise elapsed time (excluding paused time)
        if (startTimeRef.current) {
          const now = Date.now();
          // Account for current pause if paused
          const currentPauseTime = pauseStartRef.current ? (now - pauseStartRef.current) : 0;
          const elapsedMs = now - startTimeRef.current - pausedTimeRef.current - currentPauseTime;
          const elapsedSec = Math.floor(elapsedMs / 1000);
          
          setElapsedSeconds(elapsedSec);
          
          // Update remaining time
          const newRemainingTime = Math.max(0, totalSeconds - elapsedSec);
          setRemainingTime(newRemainingTime);
          
          // Update progress percentage
          const newProgress = Math.min(100, (elapsedSec / totalSeconds) * 100);
          setProgress(newProgress);
          setSeekValue(newProgress);
          
          // Check completion thresholds
          if (newRemainingTime <= 0 && !sessionCompleted) {
            endMeditation(true, 'timer'); // Timer completed
          } else if (newProgress >= 100 && !sessionCompleted) {
            endMeditation(true, 'progress'); // Progress completed
          }
        }
      }, 100); // Update every 100ms for precision
    }
  };
  
  const handleSeek = (newProgress: number) => {
    if (!currentMeditation || !startTimeRef.current) return;
    
    // setIsSeeking(true); // Temporarily disabled
    isSeekingRef.current = true;
    const totalSeconds = currentMeditation.duration * 60;
    const newProgressPercent = Math.max(0, Math.min(100, newProgress));
    
    // Calculate new elapsed seconds based on seek position
    const newElapsedSeconds = Math.floor((newProgressPercent / 100) * totalSeconds);
    const newRemainingTime = Math.max(0, totalSeconds - newElapsedSeconds);
    
    // Update progress and remaining time
    setProgress(newProgressPercent);
    setSeekValue(newProgressPercent);
    setElapsedSeconds(newElapsedSeconds);
    setRemainingTime(newRemainingTime);
    
    // Adjust startTimeRef to reflect the seek position
    // This ensures precise tracking continues from the new position
    const now = Date.now();
    const adjustedStartTime = now - (newElapsedSeconds * 1000) - pausedTimeRef.current;
    startTimeRef.current = adjustedStartTime;
    
    // Update audio position if available
    if (audioRef.current && audioRef.current.duration) {
      const newAudioTime = (newProgressPercent / 100) * audioRef.current.duration;
      audioRef.current.currentTime = newAudioTime;
    }
    
    // If remaining time is 0, complete the session
    if (newRemainingTime <= 0 && !sessionCompleted) {
      endMeditation(true, 'progress');
    }
  };
  
  const handleSeekEnd = () => {
    // setIsSeeking(false); // Temporarily disabled
    isSeekingRef.current = false;
  };

  const resetMeditation = () => {
    // Reset all meditation state to start fresh
    setProgress(0);
    setSeekValue(0);
    setElapsedSeconds(0);
    setSessionCompleted(false);
    // setIsSeeking(false); // Temporarily disabled
    isSeekingRef.current = false;
    if (currentMeditation) {
      setRemainingTime(currentMeditation.duration * 60);
    }
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    pauseStartRef.current = null;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const endMeditation = (completed = false, reason: 'timer' | 'progress' | 'manual' | 'skip' = 'manual', shouldReset = false) => {
    // Stop all timers and audio
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Calculate final elapsed time precisely
    let finalElapsedSeconds = elapsedSeconds;
    if (startTimeRef.current && !isSeekingRef.current) {
      const now = Date.now();
      // Account for current pause if paused
      const currentPauseTime = pauseStartRef.current ? (now - pauseStartRef.current) : 0;
      const elapsedMs = now - startTimeRef.current - pausedTimeRef.current - currentPauseTime;
      finalElapsedSeconds = Math.floor(elapsedMs / 1000);
    }
    
    // Determine if session should be counted as completed
    // Only count as complete if:
    // 1. Reason is NOT 'skip' (user explicitly skipped)
    // 2. Progress is >= 80% (user reached completion threshold)
    const MIN_COMPLETION_THRESHOLD = 80; // 80% minimum to count as completed
    const isSkip = reason === 'skip';
    const finalProgress = currentMeditation 
      ? Math.min(100, (finalElapsedSeconds / totalDurationRef.current) * 100)
      : progress;
    const hasHighProgress = finalProgress >= MIN_COMPLETION_THRESHOLD;
    const shouldMarkComplete = !isSkip && hasHighProgress;
    
    // Only handle completion if conditions are met and not already completed
    if (shouldMarkComplete && currentMeditation && onSessionComplete && !sessionCompleted) {
      // Set completed first to prevent double-calling
      setSessionCompleted(true);
      
      try {
        // Calculate precise time in decimal minutes (e.g., 75 seconds = 1.25 minutes)
        // Round to 2 decimal places for precision
        const minutesCompleted = Math.round((finalElapsedSeconds / 60) * 100) / 100;
        
        // Only save if at least some time was completed (e.g., 1 second = 0.02 minutes)
        if (finalElapsedSeconds > 0 && minutesCompleted > 0) {
          // Call the callback with precise decimal minutes
          onSessionComplete(minutesCompleted);
          
          // Format display message
          const displayMinutes = Math.floor(minutesCompleted);
          const displaySeconds = Math.round((minutesCompleted - displayMinutes) * 60);
          let timeMessage = '';
          if (displayMinutes > 0 && displaySeconds > 0) {
            timeMessage = `${displayMinutes} minute${displayMinutes !== 1 ? 's' : ''} ${displaySeconds} second${displaySeconds !== 1 ? 's' : ''}`;
          } else if (displayMinutes > 0) {
            timeMessage = `${displayMinutes} minute${displayMinutes !== 1 ? 's' : ''}`;
          } else {
            timeMessage = `${displaySeconds} second${displaySeconds !== 1 ? 's' : ''}`;
          }
          
          // Show success toast
          setToast({
            message: `Meditation complete! ${timeMessage} added to your stats.`,
            type: 'success'
          });
        }
      } catch (error) {
        console.error('Error in onSessionComplete:', error);
        setToast({
          message: 'Error updating meditation stats. Please try again.',
          type: 'error'
        });
      }
    } else if (isSkip && finalProgress > 0 && finalProgress < MIN_COMPLETION_THRESHOLD) {
      // User explicitly skipped before reaching threshold, so we don't count it
    }
    
    // Reset progress and state if skipping or if shouldReset is true
    if (isSkip || shouldReset) {
      resetMeditation();
    } else if (completed) {
      setProgress(100);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${Math.floor(secs)}`;
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (breathingTlRef.current) {
        breathingTlRef.current.kill();
        breathingTlRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* TODO: Toast (ui/Toast.tsx) could be themed to match meditation palette. */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      <div className="pt-2 pb-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 style={{ fontFamily: serifFont }} className="text-2xl sm:text-3xl md:text-4xl font-light text-[#2C2C2C]">
              Guided Meditation
            </h1>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="group flex items-center gap-2 text-[#6B6B6B] hover:text-[#2C2C2C] text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B9E8B] focus-visible:ring-offset-2 rounded-lg px-2 py-1 active:scale-[0.97]"
              style={{ fontFamily: sansFont }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </button>
          </div>
        
          <audio ref={audioRef} className="hidden" />
        
          {!currentMeditation && (
            <div className="mb-8">
              <div style={{ fontFamily: sansFont }} className="text-xs uppercase tracking-[0.15em] text-[#9B9B9B] mb-4">
                Find the Right Exercise
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {categories.map(category => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => setSelectedCategory(category.value)}
                    className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B9E8B] focus-visible:ring-offset-2 active:scale-[0.97] ${
                      selectedCategory === category.value
                        ? 'bg-[#7A9A7A] text-white scale-[1.03] shadow-[0_2px_8px_rgba(122,154,122,0.3)]'
                        : 'bg-transparent border border-[rgba(0,0,0,0.12)] text-[#6B6B6B] hover:border-[#8B9E8B] hover:text-[#2C2C2C] hover:-translate-y-[1px]'
                    }`}
                    style={{ fontFamily: sansFont }}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        
          {currentMeditation && (
            <div ref={playerContainerRef} className="flex flex-col items-center text-center max-w-md mx-auto py-8">
              <div className="relative flex items-center justify-center mb-8" style={{ width: 220, height: 220 }}>
                <div
                  ref={ring1Ref}
                  className="absolute rounded-full"
                  style={{
                    width: 220,
                    height: 220,
                    background: `radial-gradient(circle, ${getCategoryColor(currentMeditation.category)}15 0%, transparent 70%)`,
                    opacity: 0.15
                  }}
                />
                <div
                  ref={ring2Ref}
                  className="absolute rounded-full"
                  style={{
                    width: 180,
                    height: 180,
                    background: `radial-gradient(circle, ${getCategoryColor(currentMeditation.category)}20 0%, transparent 70%)`,
                    opacity: 0.2
                  }}
                />
                <div
                  ref={breathingCircleRef}
                  className="rounded-full"
                  style={{
                    width: 140,
                    height: 140,
                    background: `radial-gradient(circle, ${getCategoryColor(currentMeditation.category)}40 0%, ${getCategoryColor(currentMeditation.category)}10 100%)`,
                    boxShadow: `0 0 40px ${getCategoryColor(currentMeditation.category)}20`
                  }}
                />
              </div>

              <h2 style={{ fontFamily: serifFont }} className="text-2xl font-medium text-[#2C2C2C] mb-2">
                {currentMeditation.title}
              </h2>
              <p style={{ fontFamily: sansFont }} className="text-sm text-[#6B6B6B] max-w-xs leading-relaxed mb-8">
                {currentMeditation.description}
              </p>

              <div className="w-full relative mb-2" style={{ height: 24 }}>
                <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[3px] rounded-full bg-[rgba(0,0,0,0.06)]">
                  <div
                    className="h-full rounded-full transition-[width] duration-100"
                    style={{
                      width: `${seekValue}%`,
                      background: `linear-gradient(90deg, ${getCategoryColor(currentMeditation.category)}80, ${getCategoryColor(currentMeditation.category)})`
                    }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={seekValue}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  onMouseUp={handleSeekEnd}
                  onTouchEnd={handleSeekEnd}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  style={{ height: 24 }}
                />
              </div>

              <div className="flex items-center justify-between w-full mb-8">
                <span style={{ fontFamily: sansFont }} className="text-xs text-[#9B9B9B] tabular-nums">
                  {formatTime(Math.floor((seekValue / 100) * (currentMeditation.duration * 60)))}
                </span>
                <span style={{ fontFamily: sansFont }} className="text-lg font-semibold text-[#2C2C2C] tabular-nums">
                  {formatTime(remainingTime)}
                </span>
                <span style={{ fontFamily: sansFont }} className="text-xs text-[#9B9B9B] tabular-nums">
                  {formatTime(currentMeditation.duration * 60)}
                </span>
              </div>

              <div className="flex items-center justify-center gap-5">
                {isPlaying ? (
                  <button
                    type="button"
                    onClick={pauseMeditation}
                    className="flex items-center justify-center w-16 h-16 rounded-full text-white hover:scale-105 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B9E8B] focus-visible:ring-offset-2"
                    style={{ backgroundColor: getCategoryColor(currentMeditation.category) }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={resumeMeditation}
                    className="flex items-center justify-center w-16 h-16 rounded-full text-white hover:scale-105 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B9E8B] focus-visible:ring-offset-2"
                    style={{ backgroundColor: getCategoryColor(currentMeditation.category) }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const currentProgress = currentMeditation
                      ? Math.min(100, (elapsedSeconds / totalDurationRef.current) * 100)
                      : progress;
                    const shouldComplete = currentProgress >= 80;
                    endMeditation(shouldComplete, shouldComplete ? 'manual' : 'skip', true);
                  }}
                  className="flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border border-[rgba(0,0,0,0.12)] text-[#6B6B6B] hover:bg-[#C97B6B]/10 hover:border-[#C97B6B]/30 hover:text-[#C97B6B] active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B9E8B] focus-visible:ring-offset-2"
                  title="Stop meditation"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10l6 0" />
                  </svg>
                </button>
              </div>

              {sessionCompleted && (
                <div className="mt-8 text-center">
                  <div className="inline-flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-[#8B9E8B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span style={{ fontFamily: serifFont }} className="text-lg font-medium text-[#2C2C2C] italic">
                      Session Complete
                    </span>
                  </div>
                  <p style={{ fontFamily: sansFont }} className="text-sm text-[#6B6B6B]">
                    You&apos;ve completed a {currentMeditation.duration}-minute meditation.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!sessionCompleted) {
                    endMeditation(false, 'skip');
                  }
                  setCurrentMeditation(null);
                  setProgress(0);
                  setSeekValue(0);
                  setElapsedSeconds(0);
                  setSessionCompleted(false);
                  // setIsSeeking(false); // Temporarily disabled
                  isSeekingRef.current = false;
                  startTimeRef.current = null;
                  pausedTimeRef.current = 0;
                  pauseStartRef.current = null;
                }}
                className="mt-10 text-sm text-[#9B9B9B] hover:text-[#2C2C2C] transition-colors duration-200 relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B9E8B] focus-visible:ring-offset-2 rounded active:scale-[0.98]"
                style={{ fontFamily: sansFont }}
              >
                Choose a Different Exercise
                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#2C2C2C] group-hover:w-full transition-all duration-300" />
              </button>
            </div>
          )}
        
          {!currentMeditation && (
            <>
              <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMeditations.map(meditation => (
                  <div
                    key={meditation.id}
                    className="exercise-card group cursor-pointer rounded-2xl overflow-hidden bg-white/80 backdrop-blur-md border border-white/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-[2px] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B9E8B] focus-visible:ring-offset-2 active:scale-[0.98]"
                    tabIndex={0}
                    role="button"
                    onClick={() => startMeditation(meditation)}
                    onKeyDown={(e) => e.key === 'Enter' && startMeditation(meditation)}
                  >
                    <div className="aspect-[4/3] overflow-hidden relative">
                      {meditation.thumbnailSrc ? (
                        <img
                          src={meditation.thumbnailSrc}
                          alt={meditation.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full" style={{ background: getCategoryGradient(meditation.category) }} />
                      )}
                      <div
                        className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-[#2C2C2C]"
                        style={{ fontFamily: sansFont }}
                      >
                        {meditation.duration.toFixed(0)} min
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 style={{ fontFamily: serifFont }} className="font-semibold text-[#2C2C2C] text-lg mb-2">
                        {meditation.title}
                      </h3>
                      <div className="flex justify-between items-center">
                        <span style={{ fontFamily: sansFont }} className="text-xs uppercase tracking-[0.1em] text-[#9B9B9B]">
                          {meditation.category}
                        </span>
                        <span style={{ fontFamily: sansFont }} className="text-xs text-[#9B9B9B] capitalize">
                          {meditation.level}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredMeditations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 rounded-full bg-[#8B9E8B]/10 animate-pulse mb-6 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-[#8B9E8B]/20" />
                  </div>
                  <p style={{ fontFamily: serifFont }} className="text-[#9B9B9B] text-lg italic">
                    No exercises in this category yet
                  </p>
                </div>
              )}
            </>
          )}
        
          <div style={{ fontFamily: sansFont }} className="text-center text-xs text-[#9B9B9B] mt-10 tracking-wide">
            Note: These are meditation audio by different creators.
          </div>
        </div>
      </div>
    </>
  );
};

export default MeditationPlayer;
