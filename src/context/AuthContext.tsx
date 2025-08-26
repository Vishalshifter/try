'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Check if user profile exists in Firestore
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);

          if (!userDoc.exists()) {
            // Create user profile in Firestore
            await setDoc(userRef, {
              email: user.email,
              name: user.displayName || 'Unknown User',
              avatar: user.photoURL,
              createdAt: new Date(),
              lastLoginAt: new Date(),
            });
          } else {
            // Update last login
            await setDoc(userRef, { lastLoginAt: new Date() }, { merge: true });
          }
        } catch (err) {
          console.warn('Firestore profile sync skipped (possibly offline):', err);
        } finally {
          setUser(user);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      if (result.user) {
        // User profile will be created/updated in the useEffect
        console.log('Signed in with Google:', result.user.email);
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in with email:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      if (result.user) {
        // Update profile with display name
        await updateProfile(result.user, { displayName: name });
        
        // Create user profile in Firestore
        const userRef = doc(db, 'users', result.user.uid);
        await setDoc(userRef, {
          email: result.user.email,
          name: name,
          avatar: result.user.photoURL,
          createdAt: new Date(),
          lastLoginAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error signing up with email:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      console.log('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('Password reset email sent');
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  };

  const updateUserProfile = async (displayName: string) => {
    try {
      if (user) {
        await updateProfile(user, { displayName });
        
        // Update in Firestore
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { name: displayName }, { merge: true });
        
        console.log('Profile updated successfully');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    resetPassword,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
