import React from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { mlService } from '../services/ml/mlService';
import { MLStatusCard } from '../components/ai/MLStatusCard';
import { TelemetryPayloadViewer } from '../components/ai/TelemetryPayloadViewer';
import { MCPServerCard } from '../components/ai/MCPServerCard';
import type { MLConfig } from '../types';

export const AIPage: React.FC = () => {
  const { mlConfig, refreshData } = useData();
  const { currentUser } = useAuth();

  const handleSaveConfig = async (updates: Partial<MLConfig>) => {
    if (!currentUser) return;
    await mlService.saveMLConfig(currentUser.id, updates);
    await refreshData();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-on-surface">AI & Machine Learning Insights</h1>
        <p className="text-xs text-on-surface-variant">
          Architectural interface layer for ML model inference and personalized recommendations.
        </p>
      </div>

      {/* Model Status & Connection Card */}
      <MLStatusCard config={mlConfig} onSaveConfig={handleSaveConfig} />

      {/* Integration Guide Box */}
      <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 space-y-3 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[22px]">smart_toy</span>
          <h3 className="font-heading font-bold text-sm text-on-surface">LLM (ChatGPT/Claude) &amp; ML Model Integration</h3>
        </div>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          FitTrack AI continuously compiles your active habits, completion consistency, weekly training split, nutrition meals, and weight into live telemetry. You can copy the complete dataset or pre-formatted prompt below into ChatGPT/GPT-4 for an instant AI coaching breakdown, or connect a remote Python FastAPI endpoint.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-surface-container p-2.5 rounded-xl border border-outline-variant/10 text-secondary">
            🤖 <strong>LLM / GPT:</strong> Copy prompt below &rarr; Paste in ChatGPT
          </div>
          <div className="bg-surface-container p-2.5 rounded-xl border border-outline-variant/10 text-primary">
            ⚡ <strong>Custom ML API:</strong> POST &#123;endpoint_url&#125; &rarr; returns &#123; "insights": [...] &#125;
          </div>
        </div>
      </div>

      {/* Real Model Context Protocol (MCP) Server for ChatGPT */}
      <MCPServerCard />

      {/* Payload Inspector */}
      <TelemetryPayloadViewer />
    </div>
  );
};
