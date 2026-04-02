import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    };
  }, []);

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      <div className="min-h-screen bg-[#F5F5F0] py-20 px-4">
        <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold">Guided Meditation</h1>
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
        </div>
        
      
        
        {/* Audio element (hidden) */}
        <audio ref={audioRef} className="hidden" />
        
        {/* Category Filter */}
        {!currentMeditation && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-medium mb-4">Find the Right Exercise</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Meditation Player */}
        {currentMeditation && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex flex-col items-center text-center">
              <h2 className="text-2xl font-medium mb-2">{currentMeditation.title}</h2>
              <p className="text-gray-600 mb-6">{currentMeditation.description}</p>
              
              {/* Progress bar / Slider */}
              <div className="w-full mb-6">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={seekValue}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  onMouseUp={handleSeekEnd}
                  onTouchEnd={handleSeekEnd}
                  className="w-full h-2.5 bg-gray-200 rounded-full appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #2563eb 0%, #2563eb ${seekValue}%, #e5e7eb ${seekValue}%, #e5e7eb 100%)`
                  }}
                />
                <style>{`
                  .slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #2563eb;
                    cursor: pointer;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                    transition: all 0.2s ease;
                  }
                  .slider::-webkit-slider-thumb:hover {
                    background: #1d4ed8;
                    transform: scale(1.1);
                  }
                  .slider::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #2563eb;
                    cursor: pointer;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                    transition: all 0.2s ease;
                  }
                  .slider::-moz-range-thumb:hover {
                    background: #1d4ed8;
                    transform: scale(1.1);
                  }
                  .slider:active::-webkit-slider-thumb {
                    transform: scale(1.2);
                  }
                  .slider:active::-moz-range-thumb {
                    transform: scale(1.2);
                  }
                `}</style>
              </div>
              
              <div className="flex items-center justify-between w-full mb-8">
                <div className="text-sm text-gray-500 font-inter">
                  {formatTime(Math.floor((seekValue / 100) * (currentMeditation.duration * 60)))}
                </div>
                <div className="text-lg font-medium font-inter">{formatTime(remainingTime)}</div>
                <div className="text-sm text-gray-500 font-inter">
                  {formatTime(currentMeditation.duration * 60)}
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                {isPlaying ? (
                  <button
                    onClick={pauseMeditation}
                    className="flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={resumeMeditation}
                    className="flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                )}
                
                <button
                  onClick={() => {
                    // Stop button - check if we should mark as complete (80% threshold)
                    const currentProgress = currentMeditation 
                      ? Math.min(100, (elapsedSeconds / totalDurationRef.current) * 100)
                      : progress;
                    const shouldComplete = currentProgress >= 80;
                    // Stop and reset - user can start fresh by clicking play again
                    endMeditation(shouldComplete, shouldComplete ? 'manual' : 'skip', true);
                  }}
                  className="flex items-center justify-center w-16 h-16 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors"
                  title="Stop meditation"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10l6 0" />
                  </svg>
                </button>
              </div>
              
              {progress === 100 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg text-center">
                  <h3 className="font-medium text-blue-800 mb-2">Session Complete!</h3>
                  <p className="text-sm text-blue-600 mb-4">Great job! You've completed a {currentMeditation.duration}-minute meditation.</p>
                </div>
              )}
              
              <button
                onClick={() => {
                  // When switching exercises, always mark as skip (unless already completed)
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
                className="mt-8 text-gray-600 hover:text-black font-inter text-sm transition-colors"
              >
                Choose a Different Exercise
              </button>
            </div>
          </div>
        )}
        
        {/* Meditation List */}
        {!currentMeditation && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-medium mb-4">Available Exercises</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMeditations.map(meditation => (
                <div 
                  key={meditation.id}
                  className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => startMeditation(meditation)}
                >
                  <div className="h-32 bg-gray-200 relative">
                    {meditation.thumbnailSrc ? (
                      <img 
                        src={meditation.thumbnailSrc} 
                        alt={meditation.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-blue-50 text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 017.072 0m-9.9-2.828a9 9 0 0112.728 0" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-white rounded-full px-2 py-1 text-xs font-medium">
                      {meditation.duration.toFixed(0)} min
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium mb-1">{meditation.title}</h3>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span className="capitalize">{meditation.category}</span>
                      <span className="capitalize">{meditation.level}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredMeditations.length === 0 && (
              <p className="text-center text-gray-500 py-12">No meditation exercises found in this category.</p>
            )}
          </div>
        )}
        
        {/* Note: This is a frontend-only implementation
             In a real app, you would have actual audio files and proper meditation guidance */}
        <div className="text-center text-gray-500 text-sm mt-6">
          Note: These are meditation audio by different creators.
        </div>
      </div>
      </div>
    </>
  );
};

export default MeditationPlayer; 