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
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import firebaseAuthService from './firebase.auth.service';

// Meditation session interface
export interface MeditationSession {
  id?: string;
  userId: string;
  duration: number; // in minutes
  type: 'breathing' | 'body-scan' | 'mindfulness' | 'loving-kindness' | 'custom';
  completed: boolean;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMeditationSessionData {
  duration: number;
  type: 'breathing' | 'body-scan' | 'mindfulness' | 'loving-kindness' | 'custom';
  completed: boolean;
}

export interface MeditationStats {
  completedSessions: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  averageSessionLength: number;
  favoriteType: string;
  sessionsThisWeek: number;
  sessionsThisMonth: number;
  totalHours: number;
}

class FirebaseMeditationService {
  private collectionName = 'meditationSessions';

  // Create new meditation session
  async createMeditationSession(sessionData: CreateMeditationSessionData) {
    try {
      const user = firebaseAuthService.user;
      if (!user) {
        throw new Error('User must be authenticated to create meditation session');
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const session: Omit<MeditationSession, 'id'> = {
        userId: user.uid,
        date: today,
        createdAt: now,
        updatedAt: now,
        ...sessionData
      };

      const docRef = await addDoc(collection(db, this.collectionName), {
        ...session,
        date: Timestamp.fromDate(session.date),
        createdAt: Timestamp.fromDate(session.createdAt),
        updatedAt: Timestamp.fromDate(session.updatedAt)
      });

      return {
        success: true,
        session: { id: docRef.id, ...session },
        message: 'Meditation session created successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create meditation session',
        error
      };
    }
  }

  // Get user's meditation sessions
  async getUserMeditationSessions(limitNum: number = 50) {
    try {
      const user = firebaseAuthService.user;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const sessionsRef = collection(db, this.collectionName);
      const sessionQuery = query(
        sessionsRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(limitNum)
      );

      const snapshot = await getDocs(sessionQuery);
      const sessions: MeditationSession[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as MeditationSession[];

      return {
        success: true,
        sessions,
        message: 'Meditation sessions retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get meditation sessions',
        error
      };
    }
  }

  // Get meditation statistics
  async getMeditationStats(): Promise<{ success: boolean; stats?: MeditationStats; message: string; error?: any }> {
    try {
      const user = firebaseAuthService.user;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const sessionsResult = await this.getUserMeditationSessions(365); // Get last year of data
      if (!sessionsResult.success) {
        throw new Error(sessionsResult.message);
      }

      const sessions = sessionsResult.sessions!;
      const completedSessions = sessions.filter(session => session.completed);
      
      if (completedSessions.length === 0) {
        const emptyStats: MeditationStats = {
          completedSessions: 0,
          totalMinutes: 0,
          currentStreak: 0,
          longestStreak: 0,
          averageSessionLength: 0,
          favoriteType: 'breathing',
          sessionsThisWeek: 0,
          sessionsThisMonth: 0,
          totalHours: 0
        };
        
        return {
          success: true,
          stats: emptyStats,
          message: 'No meditation sessions found'
        };
      }

      // Calculate basic stats
      const totalMinutes = completedSessions.reduce((sum, session) => sum + session.duration, 0);
      const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
      const averageSessionLength = Math.round((totalMinutes / completedSessions.length) * 10) / 10;

      // Calculate streaks
      const { currentStreak, longestStreak } = this.calculateStreaks(completedSessions);

      // Find favorite meditation type
      const typeCounts: Record<string, number> = {};
      completedSessions.forEach(session => {
        typeCounts[session.type] = (typeCounts[session.type] || 0) + 1;
      });
      
      const favoriteType = Object.entries(typeCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'breathing';

      // Calculate sessions this week and month
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const sessionsThisWeek = completedSessions.filter(session => 
        session.date >= weekAgo
      ).length;

      const sessionsThisMonth = completedSessions.filter(session => 
        session.date >= monthAgo
      ).length;

      const stats: MeditationStats = {
        completedSessions: completedSessions.length,
        totalMinutes,
        currentStreak,
        longestStreak,
        averageSessionLength,
        favoriteType,
        sessionsThisWeek,
        sessionsThisMonth,
        totalHours
      };

      return {
        success: true,
        stats,
        message: 'Meditation statistics calculated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to calculate meditation statistics',
        error
      };
    }
  }

  // Helper method to calculate streaks
  private calculateStreaks(sessions: MeditationSession[]): { currentStreak: number; longestStreak: number } {
    if (sessions.length === 0) return { currentStreak: 0, longestStreak: 0 };

    // Sort sessions by date (oldest first)
    const sortedSessions = [...sessions].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Group sessions by date (in case multiple sessions per day)
    const sessionsByDate: Record<string, MeditationSession[]> = {};
    sortedSessions.forEach(session => {
      const dateKey = session.date.toDateString();
      if (!sessionsByDate[dateKey]) {
        sessionsByDate[dateKey] = [];
      }
      sessionsByDate[dateKey].push(session);
    });

    const uniqueDates = Object.keys(sessionsByDate).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if there's a session for today or yesterday to start current streak
    const latestDateStr = uniqueDates[uniqueDates.length - 1];
    const latestDate = new Date(latestDateStr);
    const daysSinceLatest = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLatest <= 1) {
      currentStreak = 1;
      
      // Calculate current streak backwards
      for (let i = uniqueDates.length - 2; i >= 0; i--) {
        const currentDate = new Date(uniqueDates[i + 1]);
        const prevDate = new Date(uniqueDates[i]);
        const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
    
    // Calculate longest streak
    for (let i = 1; i < uniqueDates.length; i++) {
      const currentDate = new Date(uniqueDates[i]);
      const prevDate = new Date(uniqueDates[i - 1]);
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

  // Complete a meditation session (update existing or create new)
  async completeMeditationSession(duration: number, type: 'breathing' | 'body-scan' | 'mindfulness' | 'loving-kindness' | 'custom' = 'mindfulness') {
    try {
      const sessionData: CreateMeditationSessionData = {
        duration,
        type,
        completed: true
      };

      return await this.createMeditationSession(sessionData);
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to complete meditation session',
        error
      };
    }
  }

  // Update meditation session
  async updateMeditationSession(sessionId: string, updateData: Partial<CreateMeditationSessionData>) {
    try {
      const user = firebaseAuthService.user;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const updatePayload = {
        ...updateData,
        updatedAt: Timestamp.fromDate(new Date())
      };

      await updateDoc(doc(db, this.collectionName, sessionId), updatePayload);

      return {
        success: true,
        message: 'Meditation session updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update meditation session',
        error
      };
    }
  }
}

// Export singleton instance
const firebaseMeditationService = new FirebaseMeditationService();
export default firebaseMeditationService; 