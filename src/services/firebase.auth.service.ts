import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  User,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// User interface for Firestore
export interface FirebaseUser {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}

// Auth service class
class FirebaseAuthService {
  private currentUser: User | null = null;

  constructor() {
    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
    });
  }

  // Register new user
  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );
      
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, {
        displayName: `${userData.firstName} ${userData.lastName}`
      });

      // Create user document in Firestore
      const userDoc: FirebaseUser = {
        uid: user.uid,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'users', user.uid), userDoc);

      return {
        success: true,
        user: userDoc,
        message: 'User registered successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Registration failed',
        error
      };
    }
  }

  // Login user
  async login(credentials: { email: string; password: string }) {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        credentials.email, 
        credentials.password
      );

      const user = userCredential.user;
      
      // Get additional user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as FirebaseUser;
        return {
          success: true,
          user: userData,
          message: 'Login successful'
        };
      } else {
        throw new Error('User data not found');
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Login failed',
        error
      };
    }
  }

  // Google Sign In
  async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Check if user document exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Create new user document for Google sign-in
        const userData: FirebaseUser = {
          uid: user.uid,
          email: user.email || '',
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await setDoc(doc(db, 'users', user.uid), userData);
        return {
          success: true,
          user: userData,
          message: 'Google sign-in successful'
        };
      } else {
        const userData = userDoc.data() as FirebaseUser;
        return {
          success: true,
          user: userData,
          message: 'Google sign-in successful'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Google sign-in failed',
        error
      };
    }
  }

  // Logout user
  async logout() {
    try {
      await signOut(auth);
      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Logout failed',
        error
      };
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      if (this.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', this.currentUser.uid));
        if (userDoc.exists()) {
          return {
            success: true,
            user: userDoc.data() as FirebaseUser
          };
        }
      }
      
      return {
        success: false,
        message: 'No authenticated user found'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get current user',
        error
      };
    }
  }

  // Update user profile
  async updateProfile(userData: {
    firstName?: string;
    lastName?: string;
  }) {
    try {
      if (!this.currentUser) {
        throw new Error('No authenticated user');
      }

      const updateData: Partial<FirebaseUser> = {
        ...userData,
        updatedAt: new Date()
      };

      // Update Firestore document
      await updateDoc(doc(db, 'users', this.currentUser.uid), updateData);

      // Update Firebase Auth display name if names changed
      if (userData.firstName || userData.lastName) {
        const userDoc = await getDoc(doc(db, 'users', this.currentUser.uid));
        if (userDoc.exists()) {
          const currentData = userDoc.data() as FirebaseUser;
          const firstName = userData.firstName || currentData.firstName;
          const lastName = userData.lastName || currentData.lastName;
          
          await updateProfile(this.currentUser, {
            displayName: `${firstName} ${lastName}`
          });
        }
      }

      return {
        success: true,
        message: 'Profile updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Profile update failed',
        error
      };
    }
  }

  // Get current Firebase User
  get user() {
    return this.currentUser;
  }

  // Check if user is authenticated
  get isAuthenticated() {
    return !!this.currentUser;
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }
}

export default new FirebaseAuthService(); 