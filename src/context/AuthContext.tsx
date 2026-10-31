import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  type User as FirebaseUser,
} from 'firebase/auth';
import type { User } from '../types';
import { auth, googleProvider } from '../firebase/config';
import { firestoreService } from '../services/firestoreService';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  loading: boolean;
  authError: string | null;
  signInWithGoogle: (mode?: 'popup' | 'redirect') => Promise<void>;
  logout: () => Promise<void>;
  loginAsGuest: () => void;
  clearAuthError: () => void;
  switchUser: (userId: string) => Promise<void>;
  createUser: (name: string, email: string) => Promise<User>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_STORAGE_KEY = 'fittrack_guest_session';

export const formatAuthError = (err: any): string => {
  if (!err) return 'Authentication error occurred.';
  const code = err.code || '';
  const message = err.message || '';

  switch (code) {
    case 'auth/unauthorized-domain':
      return `Domain "${window.location.hostname}" is not authorized in Firebase Console. Go to Firebase Console > Authentication > Settings > Authorized Domains and add "${window.location.hostname}".`;
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Please allow popups or try the redirect option.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before completion. Please try again.';
    case 'auth/cancelled-popup-request':
      return 'Previous sign-in attempt was cancelled.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please verify your internet connection.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled in Firebase Authentication console.';
    default:
      return message || 'Failed to authenticate with Google. Please try again.';
  }
};

const mapFirebaseUser = (firebaseUser: FirebaseUser): User => ({
  id: firebaseUser.uid,
  name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Athlete',
  email: firebaseUser.email || '',
  avatar: firebaseUser.photoURL || undefined,
  created_at: firebaseUser.metadata?.creationTime || new Date().toISOString(),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // References to synchronize redirect resolution with onAuthStateChanged
  const redirectResolvedRef = useRef(false);
  const authStateFiredRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    console.log('[AuthContext] Initializing Firebase Auth lifecycle on:', window.location.href);

    // 1. Process getRedirectResult FIRST to catch returning OAuth redirects
    getRedirectResult(auth)
      .then((result) => {
        if (!isMounted) return;
        redirectResolvedRef.current = true;

        if (result && result.user) {
          console.log('[AuthContext] Successfully completed redirect sign-in for:', result.user.email);
          const mappedUser = mapFirebaseUser(result.user);
          setCurrentUser(mappedUser);
          setUsers([mappedUser]);
          setAuthError(null);
          setLoading(false);

          // Background Firestore sync
          firestoreService
            .syncUserProfile(
              result.user.uid,
              result.user.email || '',
              result.user.displayName || 'Athlete',
              result.user.photoURL || undefined
            )
            .then((synced) => {
              if (synced && isMounted) {
                setCurrentUser(synced);
                setUsers([synced]);
              }
            })
            .catch((err) => {
              console.warn('[AuthContext] Background Firestore profile sync notice:', err);
            });
        } else {
          console.log('[AuthContext] No redirect result found, proceeding to session listener');
          // If onAuthStateChanged already reported no user, we can now safely conclude loading
          if (authStateFiredRef.current && !auth.currentUser) {
            checkGuestSessionOrUnload();
          }
        }
      })
      .catch((error: any) => {
        if (!isMounted) return;
        redirectResolvedRef.current = true;
        console.error('[AuthContext] getRedirectResult error:', error?.code, error?.message);
        setAuthError(formatAuthError(error));
        if (authStateFiredRef.current && !auth.currentUser) {
          checkGuestSessionOrUnload();
        }
      });

    // Helper to check for existing guest session before setting unauthenticated state
    const checkGuestSessionOrUnload = () => {
      try {
        const savedGuest = localStorage.getItem(GUEST_STORAGE_KEY);
        if (savedGuest) {
          const parsed = JSON.parse(savedGuest) as User;
          if (parsed && parsed.id) {
            console.log('[AuthContext] Restored local guest profile:', parsed.name);
            setCurrentUser(parsed);
            setUsers([parsed]);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Ignore parse error
      }
      setCurrentUser(null);
      setUsers([]);
      setLoading(false);
    };

    // 2. Subscribe to onAuthStateChanged for persistent session detection
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (!isMounted) return;
        authStateFiredRef.current = true;

        if (firebaseUser) {
          console.log('[AuthContext] Active Firebase session detected:', firebaseUser.email, firebaseUser.uid);
          const mappedUser = mapFirebaseUser(firebaseUser);
          setCurrentUser(mappedUser);
          setUsers([mappedUser]);
          setAuthError(null);
          setLoading(false);
          localStorage.removeItem(GUEST_STORAGE_KEY);

          // Asynchronously sync user profile in background without delaying UI render
          firestoreService
            .syncUserProfile(
              firebaseUser.uid,
              firebaseUser.email || '',
              firebaseUser.displayName || 'Athlete',
              firebaseUser.photoURL || undefined
            )
            .then((synced) => {
              if (synced && isMounted) {
                setCurrentUser(synced);
                setUsers([synced]);
              }
            })
            .catch((err) => {
              console.warn('[AuthContext] Background Firestore profile sync notice:', err);
            });
        } else {
          console.log('[AuthContext] onAuthStateChanged: no active session');
          // CRITICAL: Only transition to unauthenticated state if getRedirectResult has already resolved!
          if (redirectResolvedRef.current) {
            checkGuestSessionOrUnload();
          }
        }
      },
      (error) => {
        if (!isMounted) return;
        authStateFiredRef.current = true;
        console.error('[AuthContext] onAuthStateChanged listener error:', error);
        setAuthError(formatAuthError(error));
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async (mode: 'popup' | 'redirect' = 'popup') => {
    setLoading(true);
    setAuthError(null);

    if (mode === 'redirect') {
      try {
        console.log('[AuthContext] Initiating signInWithRedirect...');
        await signInWithRedirect(auth, googleProvider);
        return;
      } catch (err: any) {
        console.error('[AuthContext] signInWithRedirect error:', err?.code, err?.message);
        setAuthError(formatAuthError(err));
        setLoading(false);
        return;
      }
    }

    try {
      console.log('[AuthContext] Initiating signInWithPopup...');
      const result = await signInWithPopup(auth, googleProvider);
      if (result && result.user) {
        console.log('[AuthContext] Popup sign-in successful:', result.user.email);
        const mappedUser = mapFirebaseUser(result.user);
        setCurrentUser(mappedUser);
        setUsers([mappedUser]);
        setAuthError(null);
        localStorage.removeItem(GUEST_STORAGE_KEY);
      }
    } catch (err: any) {
      console.warn('[AuthContext] Popup error caught:', err?.code, err?.message);

      // If popup was blocked by browser, automatically fall back to redirect
      if (err?.code === 'auth/popup-blocked') {
        console.log('[AuthContext] Popup was blocked, falling back to redirect...');
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          console.error('[AuthContext] Fallback redirect failed:', redirectErr);
          setAuthError(formatAuthError(redirectErr));
        }
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in popup closed. Click "Continue with Google" to try again or use redirect.');
      } else {
        setAuthError(formatAuthError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const loginAsGuest = () => {
    const guestUser: User = {
      id: 'local_guest_athlete',
      name: 'Guest Athlete',
      email: 'guest@fittrack.local',
      created_at: new Date().toISOString(),
    };
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestUser));
    } catch {
      // Ignore
    }
    setCurrentUser(guestUser);
    setUsers([guestUser]);
    setAuthError(null);
    setLoading(false);
  };

  const handleLogout = async () => {
    try {
      console.log('[AuthContext] Logging out user...');
      localStorage.removeItem(GUEST_STORAGE_KEY);
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUsers([]);
      setAuthError(null);
    } catch (err) {
      console.error('[AuthContext] Logout error:', err);
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

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        loading,
        authError,
        signInWithGoogle,
        logout: handleLogout,
        loginAsGuest,
        clearAuthError,
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
