import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  deleteUser,
} from 'firebase/auth';
import { auth } from './FirebaseContext';
import { useFirebase } from './FirebaseContext';

// Extended user type with our app's needs
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
}

// Convert Firebase User to AppUser
const toAppUser = (user: User): AppUser => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
  photoURL: user.photoURL,
  emailVerified: user.emailVerified,
  metadata: {
    creationTime: user.metadata.creationTime,
    lastSignInTime: user.metadata.lastSignInTime,
  },
});

// Context type
interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  // Auth methods
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
}

// Create context
const AuthContext = createContext<AuthContextType | null>(null);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { logAnalyticsEvent } = useFirebase();

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(toAppUser(firebaseUser));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Check for redirect result on mount
    getRedirectResult(auth).catch((err) => {
      console.error('Redirect result failed:', err);
    });

    return () => unsubscribe();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const loginWithGoogle = useCallback(async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      logAnalyticsEvent('user_login', { method: 'google' });
    } catch (err: any) {
      if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request'
      ) {
        try {
          const provider = new GoogleAuthProvider();
          await signInWithRedirect(auth, provider);
        } catch (redirectErr: any) {
          console.error('Redirect login failed:', redirectErr);
          setError('Login failed. Please try again.');
        }
      } else {
        setError(err.message || 'Login failed');
      }
    }
  }, [logAnalyticsEvent]);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      logAnalyticsEvent('user_login', { method: 'email' });
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(err.message || 'Login failed');
      }
      throw err;
    }
  }, [logAnalyticsEvent]);

  const signupWithEmail = useCallback(async (email: string, password: string, name: string) => {
    setError(null);
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(newUser, { displayName: name });
      await sendEmailVerification(newUser);
      logAnalyticsEvent('user_signup', { method: 'email' });
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak');
      } else {
        setError(err.message || 'Signup failed');
      }
      throw err;
    }
  }, [logAnalyticsEvent]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      logAnalyticsEvent('user_logout');
    } catch (err: any) {
      setError(err.message || 'Logout failed');
    }
  }, [logAnalyticsEvent]);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
      throw err;
    }
  }, []);

  const updateUserProfile = useCallback(async (displayName: string) => {
    if (!auth.currentUser) return;
    try {
      await updateProfile(auth.currentUser, { displayName });
      setUser(toAppUser(auth.currentUser));
    } catch (err: any) {
      setError(err.message || 'Profile update failed');
      throw err;
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      await deleteUser(auth.currentUser);
      logAnalyticsEvent('user_delete_account');
    } catch (err: any) {
      setError(err.message || 'Account deletion failed');
      throw err;
    }
  }, [logAnalyticsEvent]);

  const value: AuthContextType = {
    user,
    loading,
    error,
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    logout,
    resetPassword,
    updateUserProfile,
    deleteAccount,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook to use auth
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
