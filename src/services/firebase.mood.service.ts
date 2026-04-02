import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import firebaseAuthService from './firebase.auth.service';
import { MoodEntry, MoodActivity, MoodTag } from '../components/mental-health/types';

// Extended mood entry for Firebase
export interface FirebaseMoodEntry extends Omit<MoodEntry, 'id' | 'date'> {
  id?: string;
  userId: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMoodEntryData {
  mood: number;
  energy: number;
  sleep: number;
  activities: MoodActivity[];
  notes: string;
  tags: MoodTag[];
}

export interface MoodStats {
  totalEntries: number;
  averageMood: number;
  averageEnergy: number;
  averageSleep: number;
  currentStreak: number;
  longestStreak: number;
  mostCommonActivities: MoodActivity[];
  mostCommonTags: MoodTag[];
}

class FirebaseMoodService {
  private collectionName = 'moodEntries';

  // Create new mood entry
  async createMoodEntry(moodData: CreateMoodEntryData) {
    try {
      const user = firebaseAuthService.user;
      if (!user) {
        throw new Error('User must be authenticated to create mood entry');
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const moodEntry: Omit<FirebaseMoodEntry, 'id'> = {
        userId: user.uid,
        date: today,
        createdAt: now,
        updatedAt: now,
        ...moodData
      };

      const docRef = await addDoc(collection(db, this.collectionName), {
        ...moodEntry,
        date: Timestamp.fromDate(moodEntry.date),
        createdAt: Timestamp.fromDate(moodEntry.createdAt),
        updatedAt: Timestamp.fromDate(moodEntry.updatedAt)
      });

      return {
        success: true,
        moodEntry: { id: docRef.id, ...moodEntry },
        message: 'Mood entry created successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create mood entry',
        error
      };
    }
  }

  // Get user's mood entries
  async getUserMoodEntries(limitNum: number = 30) {
    try {
      const user = firebaseAuthService.user;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const moodEntriesRef = collection(db, this.collectionName);
      const moodQuery = query(
        moodEntriesRef,
        where('userId', '==', user.uid),
        orderBy('date', 'desc'),
        limit(limitNum)
      );

      const snapshot = await getDocs(moodQuery);
      const moodEntries: FirebaseMoodEntry[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as FirebaseMoodEntry[];

      return {
        success: true,
        moodEntries: moodEntries.reverse(), // Show oldest first for better chronological display
        message: 'Mood entries retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get mood entries',
        error
      };
    }
  }

  // Check if user has entry for today
  async getTodaysMoodEntry() {
    try {
      const user = firebaseAuthService.user;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const moodEntriesRef = collection(db, this.collectionName);
      const todayQuery = query(
        moodEntriesRef,
        where('userId', '==', user.uid),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      );

      const snapshot = await getDocs(todayQuery);
      
      if (snapshot.empty) {
        return {
          success: true,
          hasEntry: false,
          moodEntry: null,
          message: 'No mood entry for today'
        };
      }

      const moodEntry = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data(),
        date: snapshot.docs[0].data().date.toDate(),
        createdAt: snapshot.docs[0].data().createdAt.toDate(),
        updatedAt: snapshot.docs[0].data().updatedAt.toDate()
      } as FirebaseMoodEntry;

      return {
        success: true,
        hasEntry: true,
        moodEntry,
        message: 'Today\'s mood entry found'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to check today\'s mood entry',
        error
      };
    }
  }

  // Get mood statistics
  async getMoodStats(): Promise<{ success: boolean; stats?: MoodStats; message: string; error?: any }> {
    try {
      const user = firebaseAuthService.user;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const moodEntriesResult = await this.getUserMoodEntries(365); // Get last year of data
      if (!moodEntriesResult.success) {
        throw new Error(moodEntriesResult.message);
      }

      const entries = moodEntriesResult.moodEntries!;
      
      if (entries.length === 0) {
        const emptyStats: MoodStats = {
          totalEntries: 0,
          averageMood: 0,
          averageEnergy: 0,
          averageSleep: 0,
          currentStreak: 0,
          longestStreak: 0,
          mostCommonActivities: [],
          mostCommonTags: []
        };
        
        return {
          success: true,
          stats: emptyStats,
          message: 'No mood entries found'
        };
      }

      // Calculate averages
      const totalEntries = entries.length;
      const averageMood = entries.reduce((sum, entry) => sum + entry.mood, 0) / totalEntries;
      const averageEnergy = entries.reduce((sum, entry) => sum + entry.energy, 0) / totalEntries;
      const averageSleep = entries.reduce((sum, entry) => sum + entry.sleep, 0) / totalEntries;

      // Calculate streaks
      const { currentStreak, longestStreak } = this.calculateStreaks(entries);

      // Find most common activities and tags
      const activityCounts: Record<string, number> = {};
      const tagCounts: Record<string, number> = {};

      entries.forEach(entry => {
        entry.activities.forEach(activity => {
          activityCounts[activity] = (activityCounts[activity] || 0) + 1;
        });
        entry.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      const mostCommonActivities = Object.entries(activityCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([activity,]) => activity as MoodActivity);

      const mostCommonTags = Object.entries(tagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([tag,]) => tag as MoodTag);

      const stats: MoodStats = {
        totalEntries,
        averageMood: Math.round(averageMood * 10) / 10,
        averageEnergy: Math.round(averageEnergy * 10) / 10,
        averageSleep: Math.round(averageSleep * 10) / 10,
        currentStreak,
        longestStreak,
        mostCommonActivities,
        mostCommonTags
      };

      return {
        success: true,
        stats,
        message: 'Mood statistics calculated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to calculate mood statistics',
        error
      };
    }
  }

  // Helper method to calculate streaks
  private calculateStreaks(entries: FirebaseMoodEntry[]): { currentStreak: number; longestStreak: number } {
    if (entries.length === 0) return { currentStreak: 0, longestStreak: 0 };

    // Sort entries by date (oldest first)
    const sortedEntries = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if there's an entry for today or yesterday to start current streak
    const latestEntry = sortedEntries[sortedEntries.length - 1];
    const latestDate = new Date(latestEntry.date);
    const daysSinceLatest = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLatest <= 1) {
      currentStreak = 1;
      
      // Calculate current streak backwards
      for (let i = sortedEntries.length - 2; i >= 0; i--) {
        const currentDate = new Date(sortedEntries[i + 1].date);
        const prevDate = new Date(sortedEntries[i].date);
        const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
    
    // Calculate longest streak
    for (let i = 1; i < sortedEntries.length; i++) {
      const currentDate = new Date(sortedEntries[i].date);
      const prevDate = new Date(sortedEntries[i - 1].date);
      const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    
    longestStreak = Math.max(longestStreak, tempStreak);
    
    return { currentStreak, longestStreak };
  }

  // Update mood entry
  async updateMoodEntry(entryId: string, updateData: Partial<CreateMoodEntryData>) {
    try {
      const user = firebaseAuthService.user;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const updatePayload = {
        ...updateData,
        updatedAt: Timestamp.fromDate(new Date())
      };

      await updateDoc(doc(db, this.collectionName, entryId), updatePayload);

      return {
        success: true,
        message: 'Mood entry updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update mood entry',
        error
      };
    }
  }

  // Delete mood entry
  async deleteMoodEntry(entryId: string) {
    try {
      const user = firebaseAuthService.user;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      await deleteDoc(doc(db, this.collectionName, entryId));

      return {
        success: true,
        message: 'Mood entry deleted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete mood entry',
        error
      };
    }
  }
}

// Export singleton instance
const firebaseMoodService = new FirebaseMoodService();
export default firebaseMoodService; 