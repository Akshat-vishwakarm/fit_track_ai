import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { TokenPublicMetadata } from '../../../server/src/auth/tokenTypes';

export const ApiIntegrationSection: React.FC = () => {
  const { currentUser } = useAuth();
  const [tokenMeta, setTokenMeta] = useState<TokenPublicMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [newGeneratedToken, setNewGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const serverBaseUrl = 'http://localhost:3005';

  const fetchTokenStatus = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch(`${serverBaseUrl}/api/v1/tokens/current`, {
        headers: {
          'x-firebase-uid': currentUser.id,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setTokenMeta(data.data || null);
      }
    } catch {
      // Backend offline or unreachable
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenStatus();
  }, [currentUser]);

  const handleGenerate = async () => {
    if (!currentUser) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${serverBaseUrl}/api/v1/tokens/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-firebase-uid': currentUser.id,
        },
        body: JSON.stringify({
          name: `${currentUser.name}'s AI Assistant`,
          expires_in_days: 90,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNewGeneratedToken(data.data.token);
        setSuccessMsg('Personal API token generated successfully.');
        await fetchTokenStatus();
      } else {
        setErrorMsg(data.message || 'Failed to generate token. Ensure backend server is running on port 3005.');
      }
    } catch {
      setErrorMsg('Failed to connect to backend server on http://localhost:3005. Run "npm run server" first.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to revoke your Personal API Token? Any connected AI assistants will immediately lose access.')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${serverBaseUrl}/api/v1/tokens/revoke`, {
        method: 'POST',
        headers: {
          'x-firebase-uid': currentUser.id,
        },
      });
      if (res.ok) {
        setNewGeneratedToken(null);
        setSuccessMsg('Token successfully revoked.');
        await fetchTokenStatus();
      }
    } catch {
      setErrorMsg('Failed to revoke token');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-surface border border-outline rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-variant border border-outline flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[20px]">key</span>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">Security &bull; REST API</div>
            <h2 className="font-heading font-bold text-base text-on-surface">
              Personal API Integration &amp; Access Tokens
            </h2>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-primary text-on-primary uppercase tracking-widest self-start sm:self-auto">
          PROTOCOL V1.0
        </span>
      </div>

      {/* Security Notice Banner */}
      <div className="bg-surface-variant border border-outline rounded-lg p-4 flex items-start gap-3 text-xs text-on-surface">
        <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">shield</span>
        <div className="space-y-1">
          <span className="font-bold text-[11px] uppercase tracking-wide">Security Architecture Notice</span>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Your personal API token authorizes external AI assistants (ChatGPT, Claude) to read your verified habits, gym workouts, nutrition metrics, and progress logs. Tokens are cryptographically hashed via SHA-256 before storage.
          </p>
        </div>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="bg-surface-variant border border-outline text-on-surface p-3 rounded-lg text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-[11px] font-bold uppercase underline">Dismiss</button>
        </div>
      )}
      {errorMsg && (
        <div className="bg-surface-variant border border-outline text-on-surface p-3 rounded-lg text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">info</span>
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-[11px] font-bold uppercase underline">Dismiss</button>
        </div>
      )}

      {/* Newly Generated Plaintext Token Alert (Shown EXACTLY ONCE) */}
      {newGeneratedToken && (
        <div className="bg-surface-variant border-2 border-primary rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">check</span>
              <span className="font-heading text-xs font-bold text-on-surface uppercase tracking-wider">
                Personal API Bearer Token (Copy Now)
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-on-surface-variant uppercase">
              Shown Once Only
            </span>
          </div>

          <div className="flex items-center gap-2 bg-surface p-2.5 rounded-lg border border-outline">
            <code className="text-xs font-mono text-on-surface select-all truncate flex-1 font-semibold">
              {newGeneratedToken}
            </code>
            <button
              onClick={() => copyToClipboard(newGeneratedToken)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary hover:bg-[#222222] text-on-primary text-xs font-heading font-bold transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <p className="text-[11px] text-on-surface-variant">
            FitTrack AI hashes tokens using SHA-256 and never retains raw plaintext. Save this secret in your secure vault.
          </p>
        </div>
      )}

      {/* Token Status & Metadata Card */}
      <div className="bg-surface-variant/40 p-4 rounded-xl border border-outline space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-mono font-bold text-on-surface uppercase tracking-wider">
            Active Token Telemetry
          </div>
          <span
            className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
              tokenMeta?.status === 'active'
                ? 'bg-primary text-on-primary'
                : 'border border-outline bg-surface text-on-surface-variant'
            }`}
          >
            {tokenMeta ? tokenMeta.status.toUpperCase() : 'NO TOKEN ACTIVE'}
          </span>
        </div>

        {tokenMeta ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-surface p-3 rounded-lg border border-outline">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Token Identifier</span>
              <span className="font-mono text-on-surface font-semibold">{tokenMeta.token_prefix}••••••••</span>
            </div>
            <div className="bg-surface p-3 rounded-lg border border-outline">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Issued On</span>
              <span className="font-mono text-on-surface">
                {new Date(tokenMeta.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="bg-surface p-3 rounded-lg border border-outline">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Last Access</span>
              <span className="font-mono text-on-surface">
                {tokenMeta.last_used_at ? new Date(tokenMeta.last_used_at).toLocaleDateString() : 'Never'}
              </span>
            </div>
            <div className="bg-surface p-3 rounded-lg border border-outline">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase block">Validity Expiry</span>
              <span className="font-mono text-on-surface">
                {tokenMeta.expires_at ? new Date(tokenMeta.expires_at).toLocaleDateString() : 'Indefinite'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-on-surface-variant py-2">
            No API token currently registered for this profile. Click below to generate an authorized bearer token.
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2 flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-[#222222] text-on-primary font-heading text-xs font-bold transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">key</span>
            <span>{tokenMeta ? 'Regenerate API Token' : 'Generate Personal API Token'}</span>
          </button>

          {tokenMeta?.status === 'active' && (
            <button
              onClick={handleRevoke}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface hover:bg-surface-variant text-on-surface font-heading text-xs font-bold transition-colors border border-outline disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
              <span>Revoke Token</span>
            </button>
          )}

          <button
            onClick={fetchTokenStatus}
            disabled={loading}
            className="p-2 rounded-lg bg-surface hover:bg-surface-variant text-on-surface border border-outline transition-colors"
            title="Refresh Token Telemetry"
          >
            <span className={`material-symbols-outlined text-[18px] block ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>
        </div>
      </div>

      {/* Example API Requests */}
      <div className="space-y-3 pt-2">
        <div className="text-[11px] font-mono font-bold text-on-surface uppercase tracking-wider">
          Authorized REST Endpoints (Port 3005)
        </div>

        <div className="space-y-2 text-xs font-mono">
          <div className="bg-surface-variant p-3 rounded-lg border border-outline space-y-1">
            <span className="text-[10px] text-on-surface-variant font-bold uppercase font-mono block">
              1. Full Daily Fitness Telemetry
            </span>
            <div className="text-on-surface select-all overflow-x-auto">
              curl -H &quot;Authorization: Bearer ft_live_...&quot; http://localhost:3005/api/v1/dashboard
            </div>
          </div>

          <div className="bg-surface-variant p-3 rounded-lg border border-outline space-y-1">
            <span className="text-[10px] text-on-surface-variant font-bold uppercase font-mono block">
              2. Hydration &amp; Target Progress
            </span>
            <div className="text-on-surface select-all overflow-x-auto">
              curl -H &quot;Authorization: Bearer ft_live_...&quot; http://localhost:3005/api/v1/water/today
            </div>
          </div>

          <div className="bg-surface-variant p-3 rounded-lg border border-outline space-y-1">
            <span className="text-[10px] text-on-surface-variant font-bold uppercase font-mono block">
              3. Nutrition Logs &amp; Macros
            </span>
            <div className="text-on-surface select-all overflow-x-auto">
              curl -H &quot;Authorization: Bearer ft_live_...&quot; http://localhost:3005/api/v1/nutrition/today
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
