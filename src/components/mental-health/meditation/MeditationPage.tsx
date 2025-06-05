import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MeditationPlayer from './MeditationPlayer';

// Define the meditation stats type for better type safety
interface MeditationStats {
  completedSessions: number;
  totalMinutes: number;
  streak: number;
}

const MeditationPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<MeditationStats>({
    completedSessions: 0,
    totalMinutes: 0,
    streak: 0
  });
  
  // Load saved meditation stats from localStorage
  useEffect(() => {
    const loadMeditationStats = () => {
      try {
        const savedData = localStorage.getItem('meditationStats');
        if (savedData) {
          const loadedStats = JSON.parse(savedData) as MeditationStats;
          
          // Validate the stats to ensure they are numbers
          const validatedStats: MeditationStats = {
            completedSessions: Number(loadedStats.completedSessions) || 0,
            totalMinutes: Number(loadedStats.totalMinutes) || 0,
            streak: Number(loadedStats.streak) || 0
          };
          
          setStats(validatedStats);
        } else {
          // Initialize default stats if none exist
          const defaultStats: MeditationStats = { 
            completedSessions: 0, 
            totalMinutes: 0, 
            streak: 0 
          };
          localStorage.setItem('meditationStats', JSON.stringify(defaultStats));
          setStats(defaultStats);
        }
      } catch (error) {
        console.error('Error loading meditation stats:', error);
        // Reset to defaults if there's an error
        const defaultStats: MeditationStats = { 
          completedSessions: 0, 
          totalMinutes: 0, 
          streak: 0 
        };
        localStorage.setItem('meditationStats', JSON.stringify(defaultStats));
        setStats(defaultStats);
      }
    };

    loadMeditationStats();

    // Add event listener to catch storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'meditationStats' && e.newValue) {
        try {
          const newStats = JSON.parse(e.newValue) as MeditationStats;
          setStats(newStats);
        } catch (error) {
          console.error('Error parsing storage event data:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // Function to update stats when a meditation session is completed
  const handleSessionComplete = (minutes: number) => {
    // Get the latest stats to ensure we have fresh data
    try {
      const savedData = localStorage.getItem('meditationStats');
      
      const currentStats: MeditationStats = savedData 
        ? JSON.parse(savedData) 
        : { completedSessions: 0, totalMinutes: 0, streak: 0 };
      
      // Calculate new values
      const newCompletedSessions = Number(currentStats.completedSessions || 0) + 1;
      const newTotalMinutes = Number(currentStats.totalMinutes || 0) + Number(minutes);
      
      // Check if last meditation was within the past 48 hours to maintain streak
      const lastMeditationDate = localStorage.getItem('lastMeditationDate');
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // format: YYYY-MM-DD
      
      let newStreak = Number(currentStats.streak || 0);
      
      if (lastMeditationDate) {
        const lastDate = new Date(lastMeditationDate);
        const hoursDiff = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 48 && today !== lastMeditationDate) {
          newStreak += 1;
        } else if (hoursDiff >= 48) {
          newStreak = 1; // Reset streak but count today
        }
        // If same day, streak stays the same
      } else {
        newStreak = 1; // First time meditating
      }
      
      // Create and save the updated stats
      const newStats: MeditationStats = {
        completedSessions: newCompletedSessions,
        totalMinutes: newTotalMinutes,
        streak: newStreak
      };
      
      // Save to localStorage
      localStorage.setItem('meditationStats', JSON.stringify(newStats));
      localStorage.setItem('lastMeditationDate', today);
      
      // Update the state
      setStats(newStats);
    } catch (error) {
      console.error('[Debug] Error updating meditation stats:', error);
    }
  };
  
  return (
    <div className="min-h-screen bg-[#F5F5F0] py-20 px-4">
      <div className="max-w-5xl mx-auto">
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
        
        {/* Meditation Stats */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-medium mb-4">Your Meditation Journey</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-semibold text-blue-600 mb-2">{stats.completedSessions.toFixed(0)}</div>
              <div className="text-gray-600">Sessions Completed</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-semibold text-blue-600 mb-2">{stats.totalMinutes.toFixed(0)}</div>
              <div className="text-gray-600">Total Minutes</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-semibold text-blue-600 mb-2">{stats.streak.toFixed(0)}</div>
              <div className="text-gray-600">Day Streak</div>
            </div>
          </div>
        </div>
        
        {/* Benefits of Meditation */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-medium mb-4">Benefits of Regular Meditation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start">
              <div className="bg-blue-100 rounded-full p-2 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium mb-1">Reduces Stress</h3>
                <p className="text-sm text-gray-600">Regular meditation lowers cortisol levels, reducing stress and anxiety.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-100 rounded-full p-2 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium mb-1">Improves Focus</h3>
                <p className="text-sm text-gray-600">Meditation strengthens attention and concentration skills.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-100 rounded-full p-2 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium mb-1">Enhances Emotional Health</h3>
                <p className="text-sm text-gray-600">Helps manage depression and creates a more positive outlook.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-100 rounded-full p-2 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium mb-1">Improves Sleep</h3>
                <p className="text-sm text-gray-600">Regular meditation helps you fall asleep faster and stay asleep longer.</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Meditation Player Component */}
        <MeditationPlayer onSessionComplete={handleSessionComplete} />
      </div>
    </div>
  );
};

export default MeditationPage; 