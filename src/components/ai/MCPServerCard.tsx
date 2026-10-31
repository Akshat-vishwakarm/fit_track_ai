import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export const MCPServerCard: React.FC = () => {
  const { currentUser } = useAuth();
  const [serverUrl, setServerUrl] = useState<string>('http://localhost:3005');
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
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 sm:p-6 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">hub</span>
            <h2 className="font-heading text-base font-semibold text-primary">
              ChatGPT MCP Server &amp; Live Agent Integration
            </h2>
            <span className="px-2 py-0.5 rounded border border-outline-variant font-mono text-[10px] text-secondary bg-surface uppercase">
              MCP PROTOCOL V2.0
            </span>
          </div>
          <p className="text-xs text-secondary mt-1">
            Real Model Context Protocol (MCP) server enabling ChatGPT to query and update your live FitTrack AI habits, nutrition, gym splits, and body weight.
          </p>
        </div>

        {/* Live Server Status Badge */}
        <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded border border-outline-variant self-start md:self-auto font-mono text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'online' ? 'bg-primary animate-pulse' : 'bg-secondary'
            }`}
          />
          <div className="text-xs text-primary font-medium">
            {status === 'online' && `Server Online (${totalTools} tools • ${latencyMs}ms)`}
            {status === 'checking' && 'Pinging Server...'}
            {status === 'offline' && 'Server Offline (Port 3005)'}
          </div>
          <button
            onClick={() => checkHealth()}
            title="Refresh status"
            className="p-0.5 hover:text-primary transition-colors text-secondary cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">refresh</span>
          </button>
        </div>
      </div>

      {/* Server URL Config Bar */}
      <div className="bg-surface p-3 rounded border border-outline-variant flex flex-col sm:flex-row items-center gap-3 text-xs">
        <span className="font-mono text-secondary whitespace-nowrap">MCP Server URL:</span>
        <input
          type="text"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          className="flex-1 w-full bg-surface-container-lowest border border-outline-variant px-3 py-1.5 rounded font-mono text-xs text-primary focus:outline-none focus:border-primary"
        />
        <button
          onClick={() => checkHealth(serverUrl)}
          className="px-3 py-1.5 bg-primary text-on-primary font-medium rounded hover:bg-neutral-800 transition-colors shrink-0 cursor-pointer"
        >
          Check Ping
        </button>
      </div>

      {/* Integration Credentials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Token Card */}
        <div className="bg-surface p-3.5 rounded border border-outline-variant space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-secondary">
            <span>BEARER TOKEN</span>
            <button
              onClick={() => setShowToken(!showToken)}
              className="hover:underline text-[11px] cursor-pointer"
            >
              {showToken ? 'Hide' : 'Reveal'}
            </button>
          </div>
          <div className="font-mono text-xs font-medium text-primary truncate">
            {showToken ? mcpToken : `fittrack_live_${userId.substring(0, 6)}••••••••`}
          </div>
          <button
            onClick={() => copyToClipboard(mcpToken, 'token')}
            className="w-full py-1.5 rounded border border-outline-variant bg-surface-container-lowest hover:bg-neutral-100 text-xs font-medium text-primary transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">
              {copiedField === 'token' ? 'check' : 'content_copy'}
            </span>
            <span>{copiedField === 'token' ? 'Copied Token' : 'Copy Token'}</span>
          </button>
        </div>

        {/* SSE URL Card */}
        <div className="bg-surface p-3.5 rounded border border-outline-variant space-y-2">
          <div className="text-xs font-mono text-secondary">REMOTE MCP SSE URL</div>
          <div className="font-mono text-xs font-medium text-primary truncate" title={sseUrl}>
            {sseUrl}
          </div>
          <button
            onClick={() => copyToClipboard(sseUrl, 'sse')}
            className="w-full py-1.5 rounded border border-outline-variant bg-surface-container-lowest hover:bg-neutral-100 text-xs font-medium text-primary transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">
              {copiedField === 'sse' ? 'check' : 'content_copy'}
            </span>
            <span>{copiedField === 'sse' ? 'Copied URL' : 'Copy SSE URL'}</span>
          </button>
        </div>

        {/* OpenAPI URL Card */}
        <div className="bg-surface p-3.5 rounded border border-outline-variant space-y-2">
          <div className="text-xs font-mono text-secondary">OPENAPI SPEC (CUSTOM GPT)</div>
          <div className="font-mono text-xs font-medium text-primary truncate" title={openApiUrl}>
            {openApiUrl}
          </div>
          <button
            onClick={() => copyToClipboard(openApiUrl, 'openapi')}
            className="w-full py-1.5 rounded border border-outline-variant bg-surface-container-lowest hover:bg-neutral-100 text-xs font-medium text-primary transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">
              {copiedField === 'openapi' ? 'check' : 'content_copy'}
            </span>
            <span>{copiedField === 'openapi' ? 'Copied Spec' : 'Copy Spec URL'}</span>
          </button>
        </div>
      </div>

      {/* 3 Steps Guide Box */}
      <div className="bg-surface p-4 rounded border border-outline-variant space-y-2 text-xs">
        <div className="font-heading font-semibold text-primary flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">verified</span>
          <span>How to Connect ChatGPT in 3 Steps</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-secondary pt-1">
          <div className="space-y-1">
            <span className="font-mono font-medium text-primary">1. Run Server</span>
            <p>Ensure `npm run server:dev` is running in your terminal on port 3005.</p>
          </div>
          <div className="space-y-1">
            <span className="font-mono font-medium text-primary">2. Add Action to GPT</span>
            <p>In ChatGPT &rarr; Create a GPT &rarr; Actions &rarr; click Import from URL and paste the OpenAPI Spec URL above.</p>
          </div>
          <div className="space-y-1">
            <span className="font-mono font-medium text-primary">3. Set Authentication</span>
            <p>Select Bearer Auth and paste your Personal MCP Bearer Token. Done!</p>
          </div>
        </div>
      </div>
    </div>
  );
};
