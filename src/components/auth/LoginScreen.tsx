import React, { useState } from 'react';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth, googleProvider } from '../../firebase/config';

interface LoginScreenProps {
  onLocalGuestLogin?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLocalGuestLogin }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.warn('Google Sign-In popup error, trying redirect method:', err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          setErrorMsg('Popup was blocked. Please allow popups or try again.');
        }
      } else {
        setErrorMsg(err?.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center p-4 relative overflow-hidden selection:bg-primary-container selection:text-on-primary-fixed">
      {/* Background Ambient Glow Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary-container/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphism Auth Card */}
      <div className="w-full max-w-md bg-surface-container-low border border-outline-variant/30 rounded-3xl p-8 shadow-2xl space-y-8 relative z-10 backdrop-blur-xl animate-fade-in">
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="p-3 rounded-2xl bg-surface-container-high border border-outline-variant/20 shadow-inner">
            {/* FitTrack AI SVG Logo */}
            <svg className="h-10 w-auto" viewBox="0 0 160 40" fill="none">
              <path
                d="M10 20 L16 12 L22 28 L28 16 L34 20"
                stroke="#00d2ff"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="20" r="2.5" fill="#00e599" />
              <circle cx="34" cy="20" r="2.5" fill="#a855f7" />
              <text
                x="44"
                y="26"
                fill="#ffffff"
                fontFamily="Plus Jakarta Sans, sans-serif"
                fontSize="20"
                fontWeight="800"
                letterSpacing="-0.5px"
              >
                FitTrack <tspan fill="#00d2ff">AI</tspan>
              </text>
            </svg>
          </div>

          <h2 className="font-heading font-extrabold text-xl text-on-surface tracking-tight">
            Your Personal Fitness OS
          </h2>
          <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
            Intelligently track habits, workouts, nutrition, and body progress with AI precision.
          </p>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="bg-error-container/20 border border-error/30 text-error p-3.5 rounded-xl text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Primary Action: Continue with Google */}
        <div className="space-y-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-surface-container-high hover:bg-surface-variant text-on-surface font-heading font-bold text-sm border border-outline-variant/30 shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
                <span>Signing in with Google...</span>
              </div>
            ) : (
              <>
                {/* Official Google G Logo SVG */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {onLocalGuestLogin && (
            <button
              onClick={onLocalGuestLogin}
              className="w-full text-center py-2 text-xs font-heading font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Continue with Local Guest Mode
            </button>
          )}
        </div>

        {/* Security Disclaimers */}
        <div className="pt-4 border-t border-outline-variant/20 text-center space-y-2">
          <div className="flex items-center justify-center gap-1 text-[11px] font-heading font-bold text-secondary">
            <span className="material-symbols-outlined text-[16px]">lock</span>
            <span>Strict User Data Privacy & Encryption</span>
          </div>
          <p className="text-[10px] text-on-surface-variant/80 max-w-xs mx-auto leading-normal">
            Your fitness, workout, nutrition, and weight data is private to your Google UID. No other user can access your records.
          </p>
        </div>
      </div>
    </div>
  );
};
