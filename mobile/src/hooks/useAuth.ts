import { useState, useEffect, useCallback } from "react";
import Constants from "expo-constants";
import {
  auth,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  User,
} from "../config/firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Check if Google Sign-In is configured
const googleClientId = Constants.expoConfig?.extra?.googleIosClientId || 
                       Constants.expoConfig?.extra?.googleWebClientId ||
                       process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
                       process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const isGoogleConfigured = !!googleClientId && !googleClientId.includes('YOUR_');

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthState((prev) => ({ ...prev, user, loading: false }));
    });
    return () => unsubscribe();
  }, []);

  // Google Sign-In (only if configured)
  const signInWithGoogle = useCallback(async () => {
    if (!isGoogleConfigured) {
      setAuthState((prev) => ({ 
        ...prev, 
        error: "Google Sign-In is not configured. Please use email/password login." 
      }));
      return;
    }
    
    // Dynamic import to avoid errors when not configured
    try {
      const Google = await import("expo-auth-session/providers/google");
      // This would need proper implementation with useAuthRequest hook
      // For now, show a message that it's not fully set up
      setAuthState((prev) => ({ 
        ...prev, 
        error: "Google Sign-In requires additional setup. Please use email/password for now." 
      }));
    } catch (error: any) {
      setAuthState((prev) => ({ ...prev, error: error.message }));
    }
  }, []);

  // Email Sign-In
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, error: null, loading: true }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      let errorMessage = "Sign in failed";
      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email";
      } else if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        errorMessage = "Incorrect password";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address";
      } else if (error.code === "auth/user-disabled") {
        errorMessage = "This account has been disabled";
      } else {
        errorMessage = error.message;
      }
      setAuthState((prev) => ({ ...prev, error: errorMessage, loading: false }));
      throw new Error(errorMessage);
    } finally {
      setAuthState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  // Email Sign-Up
  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName: string) => {
      setAuthState((prev) => ({ ...prev, error: null, loading: true }));
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: displayName.trim() });
        await userCredential.user.reload();
        await sendEmailVerification(userCredential.user);
        return true;
      } catch (error: any) {
        let errorMessage = "Sign up failed";
        if (error.code === "auth/email-already-in-use") {
          errorMessage = "This email is already registered";
        } else if (error.code === "auth/invalid-email") {
          errorMessage = "Please enter a valid email address";
        } else if (error.code === "auth/weak-password") {
          errorMessage = "Password is too weak";
        } else {
          errorMessage = error.message;
        }
        setAuthState((prev) => ({ ...prev, error: errorMessage, loading: false }));
        throw new Error(errorMessage);
      } finally {
        setAuthState((prev) => ({ ...prev, loading: false }));
      }
    },
    []
  );

  // Password Reset
  const resetPassword = useCallback(async (email: string) => {
    setAuthState((prev) => ({ ...prev, error: null }));
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error: any) {
      let errorMessage = "Failed to send reset email";
      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address";
      }
      setAuthState((prev) => ({ ...prev, error: errorMessage }));
      throw new Error(errorMessage);
    }
  }, []);

  // Sign Out
  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      setAuthState((prev) => ({ ...prev, error: error.message }));
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setAuthState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
    clearError,
    isGoogleReady: isGoogleConfigured,
  };
}
