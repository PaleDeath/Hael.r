import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import firebaseAuthService, { FirebaseUser } from '../services/firebase.auth.service';

// Auth context interface
interface AuthContextType {
  currentUser: User | null;
  userProfile: FirebaseUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; error?: any }>;
  register: (userData: { email: string; password: string; firstName: string; lastName: string }) => Promise<{ success: boolean; message: string; error?: any }>;
  loginWithGoogle: () => Promise<{ success: boolean; message: string; error?: any }>;
  logout: () => Promise<{ success: boolean; message: string; error?: any }>;
  updateProfile: (userData: { firstName?: string; lastName?: string }) => Promise<{ success: boolean; message: string; error?: any }>;
}

// Create the context
const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = firebaseAuthService.onAuthStateChange(async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Get user profile from Firestore
        const profileResult = await firebaseAuthService.getCurrentUser();
        if (profileResult.success) {
          setUserProfile(profileResult.user!);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await firebaseAuthService.login({ email, password });
      if (result.success) {
        setUserProfile(result.user!);
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData: { email: string; password: string; firstName: string; lastName: string }) => {
    setLoading(true);
    try {
      const result = await firebaseAuthService.register(userData);
      if (result.success) {
        setUserProfile(result.user!);
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  // Google login function
  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await firebaseAuthService.loginWithGoogle();
      if (result.success) {
        setUserProfile(result.user!);
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setLoading(true);
    try {
      const result = await firebaseAuthService.logout();
      if (result.success) {
        setCurrentUser(null);
        setUserProfile(null);
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  // Update profile function
  const updateProfile = async (userData: { firstName?: string; lastName?: string }) => {
    setLoading(true);
    try {
      const result = await firebaseAuthService.updateProfile(userData);
      if (result.success) {
        // Refresh user profile
        const profileResult = await firebaseAuthService.getCurrentUser();
        if (profileResult.success) {
          setUserProfile(profileResult.user!);
        }
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    isAuthenticated: !!currentUser,
    login,
    register,
    loginWithGoogle,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// HOC for protected routes
interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback = <div>Please log in to access this page.</div> 
}) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <>{fallback}</>;
};

export default AuthContext; 