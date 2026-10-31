import React, { useState } from 'react';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth, googleProvider } from '../../firebase/config';
import { RADIOACTIVE_LOGO } from '../../assets/logo';

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
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fixed Background Logo Watermark */}
      <div
        className="fixed inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
        aria-hidden="true"
      >
        <img
          src={RADIOACTIVE_LOGO}
          alt=""
          className="w-[500px] h-[500px] sm:w-[650px] sm:h-[650px] object-contain opacity-[0.16] mix-blend-multiply filter contrast-125"
        />
      </div>

      {/* Main Minimalist Auth Card */}
      <div className="w-full max-w-md bg-surface border border-outline rounded-xl p-8 space-y-8 relative z-10">
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <img
            src={RADIOACTIVE_LOGO}
            alt="Radioactive Logo"
            className="w-16 h-16 rounded-xl object-contain bg-white border border-outline p-1.5 shadow-sm"
          />

          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">OS v2.4 &bull; AUTHENTICATION</div>
            <h1 className="font-heading font-extrabold text-2xl text-on-surface tracking-tight mt-0.5 uppercase">
              RADIOACTIVE
            </h1>
          </div>

          <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
            Minimalist fitness operating system. Authenticate to sync your habits, training telemetry, and personal API tokens.
          </p>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="bg-surface-variant border border-outline text-on-surface p-3 rounded-lg text-xs font-mono flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] shrink-0">info</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Primary Action: Continue with Google */}
        <div className="space-y-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-primary hover:bg-[#222222] text-on-primary font-heading font-bold text-xs transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center gap-2 font-mono">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>AUTHENTICATING...</span>
              </div>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                </svg>
                <span>CONTINUE WITH GOOGLE</span>
              </>
            )}
          </button>

          {onLocalGuestLogin && (
            <button
              onClick={onLocalGuestLogin}
              className="w-full text-center py-2.5 px-4 rounded-lg bg-surface hover:bg-surface-variant border border-outline text-xs font-mono font-bold text-on-surface transition-colors"
            >
              LAUNCH LOCAL GUEST PROFILE
            </button>
          )}
        </div>

        {/* Security Disclaimers */}
        <div className="pt-4 border-t border-outline text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]">shield</span>
            <span>Cryptographic Per-User Isolation</span>
          </div>
          <p className="text-[10px] text-on-surface-variant max-w-xs mx-auto leading-normal">
            Your telemetry, gym splits, nutrition logs, and personal API tokens are encrypted and strictly bound to your authenticated identity.
          </p>
        </div>
      </div>
    </div>
  );
};
