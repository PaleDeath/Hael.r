import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface UserUsername {
  userId: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}

const USERNAME_COLLECTION = 'userPublicProfiles';
const USERNAME_STORAGE_KEY = 'community_username';

class UsernameService {
  // Get user's username from Firestore or localStorage
  async getUsername(userId: string): Promise<string | null> {
    try {
      // Try Firestore first
      const ref = doc(db, USERNAME_COLLECTION, userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        if (data?.displayName) {
          // Cache in localStorage
          localStorage.setItem(USERNAME_STORAGE_KEY, data.displayName);
          return data.displayName;
        }
      }
      
      // Fallback to localStorage
      const cached = localStorage.getItem(USERNAME_STORAGE_KEY);
      if (cached) return cached;
      
      return null;
    } catch (error) {
      console.error('Error getting username:', error);
      // Fallback to localStorage
      const cached = localStorage.getItem(USERNAME_STORAGE_KEY);
      return cached || null;
    }
  }

  // Set user's username
  async setUsername(userId: string, username: string): Promise<boolean> {
    try {
      // Validate username
      const cleaned = username.trim();
      if (cleaned.length < 2 || cleaned.length > 30) {
        throw new Error('Username must be between 2 and 30 characters');
      }
      
      // Basic validation - alphanumeric, underscore, hyphen
      if (!/^[a-zA-Z0-9_-]+$/.test(cleaned)) {
        throw new Error('Username can only contain letters, numbers, underscores, and hyphens');
      }
      
      // Save to Firestore
      const ref = doc(db, USERNAME_COLLECTION, userId);
      await setDoc(ref, {
        userId,
        displayName: cleaned,
        updatedAt: new Date(),
      }, { merge: true });
      
      // Cache in localStorage
      localStorage.setItem(USERNAME_STORAGE_KEY, cleaned);
      
      return true;
    } catch (error: any) {
      console.error('Error setting username:', error);
      throw error;
    }
  }

  // Get username from localStorage (for offline use)
  getCachedUsername(): string | null {
    return localStorage.getItem(USERNAME_STORAGE_KEY);
  }

  // Clear cached username
  clearCachedUsername(): void {
    localStorage.removeItem(USERNAME_STORAGE_KEY);
  }
}

const usernameService = new UsernameService();
export default usernameService;

