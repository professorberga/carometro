'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface UserProfile {
  uid: string;
  email: string | null;
  nome: string | null;
  role: 'gestor' | 'professor';
  cargo?: string;
  criadoEm: any;
  atualizadoEm?: any;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch or create user profile
        const userDocRef = doc(db, 'usuarios', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          // Check if there is a pre-registered user by email (case-insensitive)
          const { collection, query, where, getDocs, deleteDoc } = await import('firebase/firestore');
          const normalizedEmail = user.email ? user.email.toLowerCase() : '';
          const q = query(collection(db, 'usuarios'), where('email', '==', normalizedEmail));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            // Found a pre-registered user. Update the document with UID and proper tracking
            const existingDoc = querySnapshot.docs[0];
            const data = existingDoc.data();
            
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email,
              nome: data.nome || user.displayName,
              role: data.role || 'professor',
              cargo: data.cargo || '',
              criadoEm: data.criadoEm || serverTimestamp(),
              atualizadoEm: serverTimestamp()
            };
            
            await setDoc(userDocRef, newProfile);
            
            if (existingDoc.id !== user.uid) {
              await deleteDoc(existingDoc.ref);
            }
            
            setProfile(newProfile);
          } else {
            // Default logic for first-time login without pre-registration
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email,
              nome: user.displayName,
              role: 'gestor', 
              criadoEm: serverTimestamp(),
            };
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('Login popup closed by user.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.log('Popup request cancelled.');
      } else {
        console.error('Login error:', error);
        alert('Erro ao fazer login: ' + error.message);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
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
