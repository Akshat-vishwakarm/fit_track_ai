import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export const MCPServerCard: React.FC = () => {
  const { currentUser } = useAuth();
  const [serverUrl, setServerUrl] = useState<string>('http://localhost:3001');
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [totalTools, setTotalTools] = useState<number>(41);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const userId = currentUser?.id || 'demo_athlete';
  const mcpToken = `fittrack_live_${userId}`;
  const sseUrl = `${serverUrl}/sse?token=${mcpToken}`;
  const openApiUrl = `${serverUrl}/openapi.json`;

  const checkHealth = async (urlToCheck = serverUrl) => {
    setStatus('checking');
    const start = performance.now();
    try {
      const res = await fetch(`${urlToCheck}/health`, { signal: AbortSignal.timeout(3000) });
      const elapsed = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json();
        setStatus('online');
        setTotalTools(data.total_tools || 41);
        setLatencyMs(elapsed);
      } else {
        setStatus('offline');
      }
    } catch {
      setStatus('offline');
    }
  };

  useEffect(() => {
    checkHealth();
  }, [serverUrl]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="bg-surface-container-low border border-primary/20 rounded-2xl p-6 space-y-6 shadow-xl relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[24px]">hub</span>
            <h2 className="font-heading text-base font-extrabold text-on-surface">
              ChatGPT MCP Server &amp; Live Agent Integration
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 uppercase tracking-widest">
              MCP Protocol v2.0
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Real Model Context Protocol (MCP) server enabling ChatGPT to query and update your live FitTrack AI habits, nutrition, gym splits, and body weight.
          </p>
        </div>

        {/* Live Server Status Badge */}
        <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-xl border border-outline-variant/20 self-start md:self-auto">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              status === 'online'
                ? 'bg-emerald-400 animate-pulse'
                : status === 'checking'
                ? 'bg-amber-400 animate-spin'
                : 'bg-rose-500'
            }`}
          />
          <div className="text-xs font-heading font-semibold text-on-surface">
            {status === 'online' && (
              <span className="text-emerald-400">
                Server Online ({totalTools} tools active{latencyMs ? ` • ${latencyMs}ms` : ''})
              </span>
            )}
            {status === 'checking' && <span className="text-amber-400">Pinging Server...</span>}
            {status === 'offline' && <span className="text-rose-400">Server Offline (Start locally)</span>}
          </div>
          <button
            onClick={() => checkHealth()}
            title="Refresh status"
            className="p-1 hover:text-primary transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
          </button>
        </div>
      </div>

      {/* Server URL Config Bar */}
      <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/15 flex flex-col sm:flex-row items-center gap-3 text-xs">
        <span className="font-bold text-on-surface whitespace-nowrap flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-primary">dns</span>
          MCP Server Endpoint URL:
        </span>
        <input
          type="text"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          placeholder="http://localhost:3001 or https://fittrack-mcp.onrender.com"
          className="flex-1 bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant/20 font-mono text-on-surface text-xs focus:outline-none focus:border-primary"
        />
        <button
          onClick={() => checkHealth(serverUrl)}
          className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant font-semibold text-on-surface transition-colors"
        >
          Check Ping
        </button>
      </div>

      {/* Credentials & Endpoints Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Token Card */}
        <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/15 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">key</span>
              Bearer Token
            </span>
            <button
              onClick={() => setShowToken(!showToken)}
              className="text-[10px] text-primary hover:underline font-mono"
            >
              {showToken ? 'Hide' : 'Reveal'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-surface-container px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-on-surface flex-1 truncate select-all">
              {showToken ? mcpToken : `fittrack_live_${'•'.repeat(12)}`}
            </code>
            <button
              onClick={() => copyToClipboard(mcpToken, 'token')}
              className="px-2.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-heading font-semibold transition-colors shrink-0 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">
                {copiedField === 'token' ? 'check' : 'content_copy'}
              </span>
              <span>{copiedField === 'token' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Remote MCP SSE URL */}
        <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/15 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-emerald-400">stream</span>
              Remote MCP SSE URL
            </span>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-surface-container px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-emerald-400 flex-1 truncate select-all">
              {sseUrl}
            </code>
            <button
              onClick={() => copyToClipboard(sseUrl, 'sse')}
              className="px-2.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-heading font-semibold transition-colors shrink-0 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">
                {copiedField === 'sse' ? 'check' : 'content_copy'}
              </span>
              <span>{copiedField === 'sse' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* OpenAPI URL for Custom GPT */}
        <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/15 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-secondary">api</span>
              OpenAPI 3.0 Spec (Custom GPT)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-surface-container px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-secondary flex-1 truncate select-all">
              {openApiUrl}
            </code>
            <button
              onClick={() => copyToClipboard(openApiUrl, 'openapi')}
              className="px-2.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-heading font-semibold transition-colors shrink-0 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">
                {copiedField === 'openapi' ? 'check' : 'content_copy'}
              </span>
              <span>{copiedField === 'openapi' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step by step ChatGPT setup guide */}
      <div className="bg-surface-container/60 border border-outline-variant/15 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">verified</span>
          <span className="font-heading text-xs font-bold text-on-surface uppercase tracking-wider">
            How to Connect ChatGPT in 3 Steps
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-on-surface-variant">
          <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/10 space-y-1">
            <div className="font-bold text-on-surface">1. Run Server</div>
            <p className="text-[11px] leading-relaxed">
              Run <code className="text-primary font-mono">npm run server</code> in your terminal (or deploy to Render via <code className="text-primary font-mono">render.yaml</code>).
            </p>
          </div>
          <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/10 space-y-1">
            <div className="font-bold text-on-surface">2. Add Action to GPT</div>
            <p className="text-[11px] leading-relaxed">
              In ChatGPT &rarr; Create a GPT &rarr; Actions &rarr; click <strong>Import from URL</strong> and paste the OpenAPI Spec URL above.
            </p>
          </div>
          <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/10 space-y-1">
            <div className="font-bold text-on-surface">3. Set Authentication</div>
            <p className="text-[11px] leading-relaxed">
              Select <strong>Bearer Auth</strong> and paste your <strong>Personal MCP Bearer Token</strong>. Done!
            </p>
          </div>
        </div>
      </div>

      {/* Example Prompts Ready for ChatGPT */}
      <div className="space-y-2 pt-1">
        <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
          Example Questions You Can Ask ChatGPT Once Connected:
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div className="bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant/10 flex items-start gap-2">
            <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5">chat</span>
            <span>&ldquo;What tasks and habits have I completed and missed today?&rdquo;</span>
          </div>
          <div className="bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant/10 flex items-start gap-2">
            <span className="material-symbols-outlined text-secondary text-[16px] shrink-0 mt-0.5">chat</span>
            <span>&ldquo;What is my training split and which workout should I do today?&rdquo;</span>
          </div>
          <div className="bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant/10 flex items-start gap-2">
            <span className="material-symbols-outlined text-amber-400 text-[16px] shrink-0 mt-0.5">chat</span>
            <span>&ldquo;Analyze all my nutrition logs against my calorie and protein targets.&rdquo;</span>
          </div>
          <div className="bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant/10 flex items-start gap-2">
            <span className="material-symbols-outlined text-purple-400 text-[16px] shrink-0 mt-0.5">chat</span>
            <span>&ldquo;Compare my training consistency, nutrition, habits, and weight history.&rdquo;</span>
          </div>
        </div>
      </div>
    </div>
  );
};
