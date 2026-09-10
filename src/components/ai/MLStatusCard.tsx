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
    <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 space-y-6 shadow-lg">
      {/* Header status bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isConnected
                ? 'bg-secondary-container/20 text-secondary'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[28px]">
              {isConnected ? 'smart_toy' : 'power_off'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-base text-on-surface">
                {isConnected ? 'AI Model Connected' : 'AI Model Not Connected'}
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full font-heading text-[10px] font-extrabold uppercase ${
                  isConnected
                    ? 'bg-secondary-container text-on-secondary-fixed shadow-[0_0_10px_rgba(0,229,153,0.4)]'
                    : 'bg-surface-container-highest text-on-surface-variant'
                }`}
              >
                {isConnected ? 'Live Telemetry' : 'Disconnected'}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {isConnected
                ? 'Personalized insights will be processed via your connected endpoint.'
                : 'Connect your ML model to unlock personalized insights based on your fitness data.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => handleToggleConnection(!isConnected)}
          disabled={isSaving}
          className={`px-5 py-2 rounded-xl font-heading font-bold text-xs transition-all shadow-md ${
            isConnected
              ? 'bg-surface-container-high text-on-surface hover:bg-error-container hover:text-error'
              : 'bg-primary-container text-on-primary-fixed hover:scale-105 shadow-[0_0_12px_rgba(0,210,255,0.3)]'
          }`}
        >
          {isSaving ? 'Updating...' : isConnected ? 'Disconnect Model' : 'Connect Endpoint'}
        </button>
      </div>

      {/* Connection Endpoint Settings */}
      <div className="space-y-4">
        <div className="font-heading text-xs font-bold text-on-surface uppercase tracking-wider">
          ML Inference Endpoint Settings
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Model Framework / Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as MLConfig['provider'])}
              className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container"
            >
              <option value="python_fastapi">Python FastAPI / PyTorch</option>
              <option value="local">Local ONNX / TensorFlow.js</option>
              <option value="rest_api">Hosted REST API Endpoint</option>
              <option value="custom">Custom Inference Server</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Inference Endpoint URL
            </label>
            <input
              type="url"
              placeholder="http://localhost:8000/api/v1/predict"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container font-mono text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
