import React, { useState, useEffect, useMemo, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import gsap from 'gsap';
import { MoodEntry, MoodState, MoodActivity, MoodTag } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../../contexts/AuthContext';
import firebaseMoodService from '../../../services/firebase.mood.service';
import { analyzeNotes } from '../../../services/analysis.service';

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Consecutive calendar days with at least one entry, counting backward from `from` (inclusive). */
function computeMoodStreakFromEntries(entries: MoodEntry[], from: Date = new Date()): number {
  const daySet = new Set(
    entries.map((e) => {
      const t = new Date(e.date).getTime();
      if (Number.isNaN(t)) return ymd(from);
      return ymd(new Date(t));
    })
  );
  let streak = 0;
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (;;) {
    if (daySet.has(ymd(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

const MoodTracker: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const [moodState, setMoodState] = useState<MoodState>({
    entries: [],
    streak: 0,
    lastEntryDate: null
  });
  const [, setMoodStats] = useState<any>(null);
  const streakElRef = useRef<HTMLDivElement>(null);
  const [newEntry, setNewEntry] = useState<Omit<MoodEntry, 'id' | 'date'>>({
    mood: 5,
    energy: 5,
    sleep: 7,
    activities: [],
    notes: '',
    tags: []
  });
  const [showForm, setShowForm] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [, setSubmitting] = useState(false);

  // Available activities and tags
  const activities: MoodActivity[] = [
    'exercise', 'meditation', 'reading', 'socializing', 
    'work', 'hobbies', 'nature', 'rest'
  ];
  
  const tags: MoodTag[] = [
    'stressed', 'motivated', 'anxious', 'calm', 
    'sad', 'happy', 'tired', 'energetic', 
    'distracted', 'focused'
  ];

  // Load mood data from Firebase with localStorage fallback
  useEffect(() => {
    const loadMoodData = async () => {
      if (isAuthenticated && currentUser) {
        // Load from Firebase for authenticated users
        try {
          // Check if user has entry for today
          const todaysEntryResult = await firebaseMoodService.getTodaysMoodEntry();
          if (todaysEntryResult.success && todaysEntryResult.hasEntry) {
            setFormSubmitted(true);
          }

          // Load recent mood entries
          const entriesResult = await firebaseMoodService.getUserMoodEntries(30);
          if (entriesResult.success) {
            // Convert Firebase entries to local format
            const entries: MoodEntry[] = entriesResult.moodEntries!.map(entry => ({
              id: entry.id || uuidv4(),
              date: entry.date.toLocaleDateString(),
              mood: entry.mood,
              energy: entry.energy,
              sleep: entry.sleep,
              activities: entry.activities as MoodActivity[],
              notes: entry.notes,
              tags: entry.tags as MoodTag[]
            }));

            const lastEntry = entries[entries.length - 1];
            setMoodState({
              entries,
              streak: 0, // We'll get this from stats
              lastEntryDate: lastEntry ? lastEntry.date : null
            });
          }

          // Load mood statistics
           const statsResult = await firebaseMoodService.getMoodStats();
          if (statsResult.success) {
            // Update streak from stats and cache
            setMoodStats(statsResult.stats);
            setMoodState(prev => ({
              ...prev,
              streak: statsResult.stats!.currentStreak
            }));
          }

        } catch (error) {
          console.error('Error loading mood data from Firebase, falling back to localStorage:', error);
          loadFromLocalStorage();
        }
      } else {
        // Load from localStorage for non-authenticated users
        loadFromLocalStorage();
      }
      
      // loading complete
    };

    const loadFromLocalStorage = () => {
      try {
        const savedData = localStorage.getItem('moodData');
        if (savedData) {
          const parsedData = JSON.parse(savedData) as MoodState;
          const entries = parsedData.entries ?? [];
          const streak = computeMoodStreakFromEntries(entries);
          setMoodState({
            ...parsedData,
            entries,
            streak,
          });
          
          // Check if entry was made today
          const today = new Date().toLocaleDateString();
          const lastEntryDate = parsedData.lastEntryDate;
          if (lastEntryDate === today) {
            setFormSubmitted(true);
          }
        }
      } catch (error) {
        console.error('Error loading mood data from localStorage:', error);
      }
    };

    loadMoodData();
  }, [isAuthenticated, currentUser]);

  const notesSnapshot = useMemo(() => analyzeNotes(newEntry.notes || ''), [newEntry.notes]);

  const moodTrendData = useMemo(() => {
    const slice = moodState.entries.slice(0, 14).reverse();
    return slice.map((e) => ({
      label: new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      mood: e.mood,
      energy: e.energy,
    }));
  }, [moodState.entries]);

  useLayoutEffect(() => {
    const el = streakElRef.current;
    if (!el) return;
    gsap.fromTo(el, { scale: 1.12, opacity: 0.7 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.6)' });
  }, [moodState.streak]);

  const handleActivityToggle = (activity: MoodActivity) => {
    setNewEntry(prev => {
      const activities = [...prev.activities];
      if (activities.includes(activity)) {
        return {
          ...prev,
          activities: activities.filter(a => a !== activity)
        };
      } else {
        return {
          ...prev,
          activities: [...activities, activity]
        };
      }
    });
  };

  const handleTagToggle = (tag: MoodTag) => {
    setNewEntry(prev => {
      const tags = [...prev.tags];
      if (tags.includes(tag)) {
        return {
          ...prev,
          tags: tags.filter(t => t !== tag)
        };
      } else {
        return {
          ...prev,
          tags: [...tags, tag]
        };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const today = new Date();
    const todayStr = today.toLocaleDateString();
    
    if (isAuthenticated && currentUser) {
      // Save to Firebase for authenticated users
      try {
        const result = await firebaseMoodService.createMoodEntry({
          mood: newEntry.mood,
          energy: newEntry.energy,
          sleep: newEntry.sleep,
          activities: newEntry.activities as MoodActivity[],
          notes: newEntry.notes,
          tags: newEntry.tags as MoodTag[]
        });

        if (result.success) {
          console.log('Mood entry saved to Firebase:', result.moodEntry?.id);
          
          // Refresh the data
          const entriesResult = await firebaseMoodService.getUserMoodEntries(30);
          if (entriesResult.success) {
            const entries: MoodEntry[] = entriesResult.moodEntries!.map(entry => ({
              id: entry.id || uuidv4(),
              date: entry.date.toLocaleDateString(),
              mood: entry.mood,
              energy: entry.energy,
              sleep: entry.sleep,
              activities: entry.activities as MoodActivity[],
              notes: entry.notes,
              tags: entry.tags as MoodTag[]
            }));

            const streak = computeMoodStreakFromEntries(entries);
            setMoodState(prev => ({
              ...prev,
              entries,
              lastEntryDate: todayStr,
              streak,
            }));
          }

          // Refresh stats
          const statsResult = await firebaseMoodService.getMoodStats();
          if (statsResult.success) {
            setMoodStats(statsResult.stats!);
            setMoodState(prev => ({
              ...prev,
              streak: statsResult.stats!.currentStreak,
            }));
          }
          
          setFormSubmitted(true);
          setShowForm(false);
        } else {
          console.error('Failed to save to Firebase, falling back to localStorage:', result.message);
          throw new Error(result.message);
        }
      } catch (error) {
        console.error('Error saving to Firebase, using localStorage fallback:', error);
        saveToLocalStorage();
      }
    } else {
      // Save to localStorage for non-authenticated users
      saveToLocalStorage();
    }
    
    setSubmitting(false);
  };

  const saveToLocalStorage = () => {
    const today = new Date();
    const todayStr = today.toLocaleDateString();
    
    const newMoodEntry: MoodEntry = {
      id: uuidv4(),
      date: todayStr,
      ...newEntry
    };
    
    const nextEntries = [newMoodEntry, ...moodState.entries];
    const streak = computeMoodStreakFromEntries(nextEntries);

    const updatedState: MoodState = {
      entries: nextEntries,
      streak,
      lastEntryDate: todayStr,
    };
    
    setMoodState(updatedState);
    localStorage.setItem('moodData', JSON.stringify(updatedState));
    
    setFormSubmitted(true);
    setShowForm(false);
    console.log('Mood entry saved to localStorage');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getMoodEmoji = (mood: number) => {
    if (mood >= 9) return '😁';
    if (mood >= 7) return '🙂';
    if (mood >= 5) return '😐';
    if (mood >= 3) return '🙁';
    return '😞';
  };

  const getEnergyEmoji = (energy: number) => {
    if (energy >= 9) return '⚡⚡';
    if (energy >= 7) return '⚡';
    if (energy >= 5) return '✓';
    if (energy >= 3) return '😴';
    return '💤';
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold">Mood Tracker</h1>
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
        
        {/* Streak and Status */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-medium mb-1">Daily Check-in</h2>
              <p className="text-gray-600">
                {formSubmitted 
                  ? "You've tracked your mood today. Great job!" 
                  : "How are you feeling today?"}
                {!currentUser && (
                  <span className="block text-sm text-blue-600 mt-1">
                    Sign in to sync your data across devices
                  </span>
                )}
              </p>
            </div>
            <div className="text-center min-w-[4.5rem]">
              <div
                ref={streakElRef}
                className="text-2xl font-bold text-blue-600 tabular-nums"
                aria-live="polite"
              >
                {moodState.streak}
              </div>
              <div className="text-sm text-gray-500">day streak</div>
              <p className="text-xs text-gray-400 mt-1 max-w-[10rem] mx-auto">
                Consecutive days with a check-in (local)
              </p>
            </div>
          </div>
          
          {!formSubmitted && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Check In Now
            </button>
          )}
          
          {formSubmitted && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">✓ Mood tracked for today!</p>
            </div>
          )}
        </div>
        
        {/* Mood Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-medium mb-4">How are you feeling today?</h2>
            <form onSubmit={handleSubmit}>
              {/* Mood Slider */}
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Mood {getMoodEmoji(newEntry.mood)}
                </label>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">Low</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={newEntry.mood}
                    onChange={(e) => setNewEntry({...newEntry, mood: parseInt(e.target.value)})}
                    className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm text-gray-500 ml-2">High</span>
                </div>
              </div>
              
              {/* Energy Slider */}
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Energy {getEnergyEmoji(newEntry.energy)}
                </label>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">Low</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={newEntry.energy}
                    onChange={(e) => setNewEntry({...newEntry, energy: parseInt(e.target.value)})}
                    className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm text-gray-500 ml-2">High</span>
                </div>
              </div>
              
              {/* Sleep Input */}
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Hours of Sleep
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={newEntry.sleep}
                  onChange={(e) => setNewEntry({...newEntry, sleep: parseFloat(e.target.value)})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Activities */}
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Activities Today
                </label>
                <div className="flex flex-wrap gap-2">
                  {activities.map((activity) => (
                    <button
                      key={activity}
                      type="button"
                      onClick={() => handleActivityToggle(activity)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        newEntry.activities.includes(activity)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {activity.charAt(0).toUpperCase() + activity.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Tags */}
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  How would you describe your feelings?
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        newEntry.tags.includes(tag)
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tag.charAt(0).toUpperCase() + tag.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Notes */}
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="What's on your mind today?"
                ></textarea>
                {newEntry.notes.trim().length > 0 && (
                  <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/80 p-3 text-sm text-indigo-950">
                    <p className="font-medium text-indigo-800 text-xs uppercase tracking-wide mb-1">
                      Note snapshot (local, not AI)
                    </p>
                    <p className="text-gray-800">
                      Stress level read:{' '}
                      <span className="font-semibold capitalize">{notesSnapshot.stressLevel}</span>
                      {' · '}
                      Tone: <span className="font-semibold capitalize">{notesSnapshot.sentiment}</span>
                      {notesSnapshot.detectedKeywords.length > 0 && (
                        <>
                          {' · '}
                          Cues: {notesSnapshot.detectedKeywords.slice(0, 6).join(', ')}
                          {notesSnapshot.detectedKeywords.length > 6 ? '…' : ''}
                        </>
                      )}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Progress chart */}
        {moodTrendData.length >= 2 && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
            <h2 className="text-xl font-medium mb-1">Last {moodTrendData.length} check-ins</h2>
            <p className="text-sm text-gray-500 mb-4">Mood and energy trend (stored on this device or synced).</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={moodTrendData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} width={28} />
                  <Tooltip />
                  <Line type="monotone" dataKey="mood" name="Mood" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="energy" name="Energy" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Past Entries */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-medium mb-4">Past Entries</h2>
          
          {moodState.entries.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No mood entries yet. Start tracking your mood daily!</p>
          ) : (
            <div className="space-y-4">
              {moodState.entries.map((entry) => (
                <div key={entry.id} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex justify-between items-start">
                    <div className="font-medium">{formatDate(entry.date)}</div>
                    <div className="flex space-x-2">
                      <div className="text-xl" title={`Mood: ${entry.mood}/10`}>
                        {getMoodEmoji(entry.mood)}
                      </div>
                      <div className="text-xl" title={`Energy: ${entry.energy}/10`}>
                        {getEnergyEmoji(entry.energy)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Sleep:</span> {entry.sleep} hours
                  </div>
                  
                  {entry.activities.length > 0 && (
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-1">
                        {entry.activities.map((activity) => (
                          <span key={activity} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {activity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {entry.tags.length > 0 && (
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-1">
                        {entry.tags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {entry.notes && (
                    <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                      {entry.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MoodTracker; 