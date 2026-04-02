import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MeditationPlayer from './MeditationPlayer';
import { useAuth } from '../../../contexts/AuthContext';
import firebaseMeditationService from '../../../services/firebase.meditation.service';
import { Loader2, TrendingUp, Clock, Flame, AlertCircle } from 'lucide-react';

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
  const [stats, setStats] = useState<LocalMeditationStats>({
    completedSessions: 0,
    totalMinutes: 0,
    streak: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-light font-lexend text-black mb-2">Meditation & Mindfulness</h1>
            <p className="text-gray-600 font-inter">Find peace and clarity through guided meditation</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-black font-inter text-sm transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        </div>

        {/* Info Banner */}
        {!currentUser && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 font-inter text-sm">
                You're using local storage for meditation tracking. <button onClick={() => navigate('/auth')} className="text-black underline hover:no-underline">Sign in</button> to sync your data across devices.
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg font-inter text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}
        
        {/* Meditation Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="text-2xl font-light font-lexend text-black mb-6">Your Meditation Journey</h2>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 font-inter text-sm">Loading your meditation stats...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center border border-blue-200">
                <div className="flex items-center justify-center mb-3">
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
                <div className="text-4xl font-light font-lexend text-blue-600 mb-2">{stats.completedSessions}</div>
                <div className="text-gray-700 font-inter text-sm">Sessions Completed</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 text-center border border-purple-200">
                <div className="flex items-center justify-center mb-3">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
                <div className="text-4xl font-light font-lexend text-purple-600 mb-2">{stats.totalMinutes}</div>
                <div className="text-gray-700 font-inter text-sm">Total Minutes</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 text-center border border-orange-200">
                <div className="flex items-center justify-center mb-3">
                  <Flame className="w-8 h-8 text-orange-600" />
                </div>
                <div className="text-4xl font-light font-lexend text-orange-600 mb-2">{stats.streak}</div>
                <div className="text-gray-700 font-inter text-sm">Day Streak</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Benefits of Meditation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="text-2xl font-light font-lexend text-black mb-6">Benefits of Regular Meditation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 rounded-lg p-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium font-lexend text-black mb-1">Reduces Stress</h3>
                <p className="text-sm text-gray-600 font-inter leading-relaxed">Regular meditation lowers cortisol levels, reducing stress and anxiety.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-purple-100 rounded-lg p-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium font-lexend text-black mb-1">Improves Focus</h3>
                <p className="text-sm text-gray-600 font-inter leading-relaxed">Meditation strengthens attention and concentration skills.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-green-100 rounded-lg p-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium font-lexend text-black mb-1">Enhances Emotional Health</h3>
                <p className="text-sm text-gray-600 font-inter leading-relaxed">Improves self-awareness and promotes emotional well-being.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-orange-100 rounded-lg p-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium font-lexend text-black mb-1">Better Sleep</h3>
                <p className="text-sm text-gray-600 font-inter leading-relaxed">Meditation can help improve sleep quality and reduce insomnia.</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Meditation Player */}
        {/* adapt callback to expected signature */}
        <MeditationPlayer onSessionComplete={(minutes: number) => { void handleSessionComplete('mindfulness', minutes); }} />
      </div>
    </div>
  );
};

export default MeditationPage; 