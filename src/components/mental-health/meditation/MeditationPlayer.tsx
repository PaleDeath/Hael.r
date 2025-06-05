import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const [meditations, setMeditations] = useState<MeditationExercise[]>(SAMPLE_MEDITATIONS);
  const [currentMeditation, setCurrentMeditation] = useState<MeditationExercise | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sessionCompleted, setSessionCompleted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const categories = [
    { value: 'all', label: 'All Exercises' },
    { value: 'anxiety', label: 'Anxiety Relief' },
    { value: 'depression', label: 'Mood Improvement' },
    { value: 'stress', label: 'Stress Reduction' },
    { value: 'sleep', label: 'Better Sleep' },
    { value: 'focus', label: 'Focus & Productivity' }
  ];

  const filteredMeditations = selectedCategory === 'all' 
    ? meditations 
    : meditations.filter(m => m.category === selectedCategory);

  const startMeditation = (meditation: MeditationExercise) => {
    setCurrentMeditation(meditation);
    setIsPlaying(true);
    setRemainingTime(meditation.duration * 60);
    setProgress(0);
    setSessionCompleted(false);
    
    // In a real app, this would load and play the audio file
    if (audioRef.current) {
      audioRef.current.src = meditation.audioSrc;
      audioRef.current.play().catch(err => {
        console.error('Failed to play audio:', err);
        // For demo purposes, we'll continue the countdown even if audio fails
      });
    }
    
    // Start the countdown
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          console.log('Timer reached 0, completing session...');
          endMeditation(true); // Explicitly pass true for completion
          return 0;
        }
        return prev - 1;
      });
      
      setProgress(prev => {
        const newProgress = prev + (1 / (meditation.duration * 60)) * 100;
        const finalProgress = Math.min(newProgress, 100);
        
        // If we've reached 100%, complete the session
        if (finalProgress >= 100 && !sessionCompleted) {
          console.log('Progress reached 100%, completing session...');
          endMeditation(true); // Explicitly pass true for completion
        }
        
        return finalProgress;
      });
    }, 1000);
  };

  const pauseMeditation = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const resumeMeditation = () => {
    setIsPlaying(true);
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
    
    if (currentMeditation && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            endMeditation(true);
            return 0;
          }
          return prev - 1;
        });
        
        setProgress(prev => {
          const newProgress = prev + (1 / (currentMeditation.duration * 60)) * 100;
          return Math.min(newProgress, 100);
        });
      }, 1000);
    }
  };

  const endMeditation = (completed = false) => {
    console.log(`[Debug] endMeditation called with completed=${completed}`);
    console.log(`[Debug] Current state:`, {
      isPlaying,
      progress,
      remainingTime,
      currentMeditation: currentMeditation?.title,
      hasCallback: !!onSessionComplete,
      sessionCompleted
    });
    
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
    
    // Calculate if session should be considered complete
    const progressThreshold = 80; // 80% completion threshold
    const shouldMarkComplete = completed || progress >= progressThreshold;
    
    // Only handle completion if not already completed
    if (shouldMarkComplete && currentMeditation && onSessionComplete && !sessionCompleted) {
      console.log('[Debug] All conditions met for session completion');
      console.log('[Debug] Progress:', progress, 'Threshold:', progressThreshold);
      
      // Set completed first to prevent double-calling
      setSessionCompleted(true);
      
      try {
        // Calculate actual minutes completed based on progress
        const minutesCompleted = Math.ceil((progress / 100) * currentMeditation.duration);
        console.log(`[Debug] Calling onSessionComplete with ${minutesCompleted} minutes (${progress}% of ${currentMeditation.duration}min)`);
        
        // Call the callback with the actual minutes completed
        onSessionComplete(minutesCompleted);
        
        // Show completion message
        alert(`Meditation complete! ${minutesCompleted} minutes added to your stats.`);
      } catch (error) {
        console.error('[Debug] Error in onSessionComplete:', error);
        alert('Error updating meditation stats. Please try again.');
      }
    } else {
      console.log('[Debug] Session completion conditions not met:', {
        completed: shouldMarkComplete,
        hasCurrentMeditation: !!currentMeditation,
        hasOnSessionComplete: !!onSessionComplete,
        sessionCompleted,
        progress
      });
    }
    
    setProgress(100);
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
        
        {/* For debugging purposes - remove in production */}
        {!currentMeditation && (
          <div className="bg-white rounded-xl shadow-md p-4 mb-6">
            <h3 className="text-md font-medium mb-2">Debug Tools</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  if (onSessionComplete) {
                    onSessionComplete(5);
                    console.log('Test update: 5 minutes completed');
                    alert('Test update triggered: 5 minutes');
                  }
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm"
              >
                Test Update Stats
              </button>
            </div>
          </div>
        )}
        
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
              
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000" 
                  style={{ width: `${progress.toFixed(0)}%` }}
                ></div>
              </div>
              
              <div className="text-lg font-medium mb-8">{formatTime(remainingTime)}</div>
              
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
                    // If we've made significant progress (over 80%), mark as complete
                    const shouldComplete = progress >= 80;
                    endMeditation(shouldComplete);
                  }}
                  className="flex items-center justify-center w-16 h-16 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors"
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
                  endMeditation();
                  setCurrentMeditation(null);
                  setProgress(0);
                }}
                className="mt-8 text-blue-600 hover:text-blue-800"
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
  );
};

export default MeditationPlayer; 