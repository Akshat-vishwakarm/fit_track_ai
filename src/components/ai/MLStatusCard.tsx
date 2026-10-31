import React, { useState } from 'react';
import type { MLConfig } from '../../types';

interface MLStatusCardProps {
  config: MLConfig | null;
  onSaveConfig: (updates: Partial<MLConfig>) => Promise<void>;
}

export const MLStatusCard: React.FC<MLStatusCardProps> = ({ config, onSaveConfig }) => {
  const [endpointUrl, setEndpointUrl] = useState(config?.endpoint_url || '');
  const [provider, setProvider] = useState(config?.provider || 'python_fastapi');
  const [isConnected, setIsConnected] = useState(config?.connected || false);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleConnection = async (connectedStatus: boolean) => {
    setIsSaving(true);
    await onSaveConfig({
      endpoint_url: endpointUrl,
      provider: provider as MLConfig['provider'],
      connected: connectedStatus,
    });
    setIsConnected(connectedStatus);
    setIsSaving(false);
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 sm:p-6 space-y-5 shadow-sm">
      {/* Header status bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded border border-outline-variant bg-surface flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-[24px]">
              {isConnected ? 'smart_toy' : 'power_off'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-semibold text-base text-primary">
                {isConnected ? 'AI Model Connected' : 'AI Model Not Connected'}
              </h3>
              <span className="px-2 py-0.5 rounded border border-outline-variant font-mono text-[10px] text-secondary bg-surface uppercase">
                {isConnected ? 'LIVE TELEMETRY' : 'DISCONNECTED'}
              </span>
            </div>
            <p className="text-xs text-secondary mt-0.5">
              {isConnected
                ? 'Personalized insights will be processed via your connected endpoint.'
                : 'Connect your ML model to unlock personalized insights based on your fitness data.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => handleToggleConnection(!isConnected)}
          disabled={isSaving}
          className={`h-9 px-4 rounded text-xs font-medium transition-colors cursor-pointer ${
            isConnected
              ? 'border border-outline-variant bg-surface hover:bg-neutral-200 text-primary'
              : 'bg-primary text-on-primary hover:bg-neutral-800'
          }`}
        >
          {isSaving ? 'Updating...' : isConnected ? 'Disconnect Model' : 'Connect Endpoint'}
        </button>
      </div>

      {/* Connection Endpoint Settings */}
      <div className="space-y-3">
        <div className="font-mono text-xs uppercase tracking-wider text-secondary font-medium">
          ML Inference Endpoint Settings
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-mono uppercase text-secondary mb-1">
              Model Framework / Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as MLConfig['provider'])}
              className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant text-primary text-xs focus:outline-none focus:border-primary"
            >
              <option value="python_fastapi">Python FastAPI / PyTorch</option>
              <option value="local">Local ONNX / TensorFlow.js</option>
              <option value="rest_api">Hosted REST API Endpoint</option>
              <option value="custom">Custom Inference Server</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-secondary mb-1">
              Inference Endpoint URL
            </label>
            <input
              type="text"
              placeholder="http://localhost:8000/api/v1/predict"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant text-primary text-xs font-mono focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
