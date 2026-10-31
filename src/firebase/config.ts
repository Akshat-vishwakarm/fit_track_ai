import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Firebase configuration from user project fittracker-2e209
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDvVKAYL3ZAE3W10dKT4DD8J9pHKtVG8zc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "fittracker-2e209.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "fittracker-2e209",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "fittracker-2e209.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "734592064395",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:734592064395:web:ae11aea66fc94a0bfbad8e",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-8SV431EKXY"
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Explicitly guarantee browser local persistence for sessions
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('[Firebase Auth] Persistence initialization warning:', err?.message || err);
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
googleProvider.addScope('profile');
googleProvider.addScope('email');

export const firestoreDb = getFirestore(app);

// Initialize Analytics if supported in current browser environment
export const analyticsPromise = isSupported().then((supported) => (supported ? getAnalytics(app) : null));

export default app;
