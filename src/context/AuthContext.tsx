import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import type { User } from '../types';
import { auth } from '../firebase/config';
import { firestoreService } from '../services/firestoreService';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  loading: boolean;
  logout: () => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
  createUser: (name: string, email: string) => Promise<User>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const initialUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Athlete',
          email: firebaseUser.email || '',
          avatar: firebaseUser.photoURL || undefined,
          created_at: new Date().toISOString(),
        };

        // Immediately set user and unblock UI loading state
        setCurrentUser(initialUser);
        setUsers([initialUser]);
        setLoading(false);

        // Perform Firestore profile sync asynchronously in the background
        firestoreService
          .syncUserProfile(
            firebaseUser.uid,
            firebaseUser.email || '',
            firebaseUser.displayName || 'Athlete',
            firebaseUser.photoURL || undefined
          )
          .then((synced) => {
            if (synced) {
              setCurrentUser(synced);
              setUsers([synced]);
            }
          })
          .catch((err) => {
            console.warn('Background Firestore sync skipped:', err);
          });
      } else {
        setCurrentUser(null);
        setUsers([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUsers([]);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleSwitchUser = async (_userId: string) => {
    // In Firebase auth mode, user switching is handled by Google re-authentication / logout
  };

  const handleCreateUser = async (name: string, email: string) => {
    const fallbackUser: User = {
      id: currentUser?.id || 'guest',
      name,
      email,
      created_at: new Date().toISOString(),
    };
    return fallbackUser;
  };

  const refreshUsers = async () => {};

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        loading,
        logout: handleLogout,
        switchUser: handleSwitchUser,
        createUser: handleCreateUser,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

