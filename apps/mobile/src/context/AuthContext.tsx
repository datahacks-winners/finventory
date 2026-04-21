import React, { createContext, useState, useEffect, ReactNode } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { AuthContextType, UserProfile } from '../types/auth';
import { AuthService } from '../services/firebase/auth';
import { FirestoreService } from '../services/firebase/firestore';
import { MessagingService } from '../services/firebase/messaging';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      setUser(user);

      if (user) {
        const profile = await FirestoreService.getUserProfile(user.uid);

        if (!profile) {
          const newProfile = await FirestoreService.createUserProfile(user.uid, {
            displayName: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || undefined,
            providers: user.providerData.map(p => p.providerId),
            isAnonymous: user.isAnonymous,
          });
          setUserProfile(newProfile);
        } else {
          setUserProfile(profile);
        }

        await MessagingService.initialize();
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    await AuthService.signInWithEmail(email, password);
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    await AuthService.signUpWithEmail(email, password, displayName);
  };

  const signInWithGoogle = async () => {
    const isUserAnonymous = auth().currentUser?.isAnonymous;

    if (isUserAnonymous) {
      const credential = await AuthService.getGoogleCredential();
      await AuthService.linkAnonymousAccount('google', credential);
    } else {
      await AuthService.signInWithGoogle();
    }
  };

  const signInWithApple = async () => {
    const isUserAnonymous = auth().currentUser?.isAnonymous;

    if (isUserAnonymous) {
      const credential = await AuthService.getAppleCredential();
      await AuthService.linkAnonymousAccount('apple', credential);
    } else {
      await AuthService.signInWithApple();
    }
  };

  const signOut = async () => {
    const userId = auth().currentUser?.uid;
    const token = await MessagingService.getToken();

    if (userId && token) {
      await MessagingService.removeToken(userId, token);
    }

    await AuthService.signOut();
  };

  const linkAnonymousAccount = async (provider: string) => {
    await AuthService.linkAnonymousAccount(provider as 'email' | 'google' | 'apple');
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    isAnonymous: user?.isAnonymous || false,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    signOut,
    linkAnonymousAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
