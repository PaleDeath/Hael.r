import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoodEntry, MoodState, MoodActivity, MoodTag } from '../types';
import { v4 as uuidv4 } from 'uuid';

const MoodTracker: React.FC = () => {
  const navigate = useNavigate();
  const [moodState, setMoodState] = useState<MoodState>({
    entries: [],
    streak: 0,
    lastEntryDate: null
  });
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

  // Load mood data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('moodData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setMoodState(parsedData);
        
        // Check if entry was made today
        const today = new Date().toLocaleDateString();
        const lastEntryDate = parsedData.lastEntryDate;
        if (lastEntryDate === today) {
          setFormSubmitted(true);
        }
      } catch (error) {
        console.error('Error loading mood data:', error);
      }
    }
  }, []);

  // Calculate streak
  useEffect(() => {
    if (!moodState.lastEntryDate) return;
    
    const today = new Date();
    const lastEntry = new Date(moodState.lastEntryDate);
    
    // Reset streak if more than 1 day gap
    if ((today.getTime() - lastEntry.getTime()) > 48 * 60 * 60 * 1000) {
      setMoodState(prev => ({
        ...prev,
        streak: 0
      }));
    }
  }, [moodState.lastEntryDate]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const today = new Date();
    const todayStr = today.toLocaleDateString();
    
    const newMoodEntry: MoodEntry = {
      id: uuidv4(),
      date: todayStr,
      ...newEntry
    };
    
    // Add entry and update streak
    const wasYesterday = moodState.lastEntryDate && 
      new Date(moodState.lastEntryDate).getDate() === today.getDate() - 1;
    
    const updatedState: MoodState = {
      entries: [newMoodEntry, ...moodState.entries],
      streak: wasYesterday ? moodState.streak + 1 : 1,
      lastEntryDate: todayStr
    };
    
    setMoodState(updatedState);
    localStorage.setItem('moodData', JSON.stringify(updatedState));
    
    setFormSubmitted(true);
    setShowForm(false);
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
              </p>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">{moodState.streak}</div>
              <div className="text-sm text-gray-500">day streak</div>
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
          
          {formSubmitted && !showForm && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setFormSubmitted(false);
                  setShowForm(true);
                }}
                className="py-2 border border-blue-500 text-blue-500 hover:bg-blue-50 font-medium rounded-lg transition-colors"
              >
                Update Today's Entry
              </button>
              <button
                onClick={() => navigate('/assessment-history')}
                className="py-2 border border-green-500 text-green-500 hover:bg-green-50 font-medium rounded-lg transition-colors"
              >
                View Assessment History
              </button>
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