import React from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { mlService } from '../services/ml/mlService';
import { MLStatusCard } from '../components/ai/MLStatusCard';
import { TelemetryPayloadViewer } from '../components/ai/TelemetryPayloadViewer';
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
          <span className="material-symbols-outlined text-secondary text-[22px]">code</span>
          <h3 className="font-heading font-bold text-sm text-on-surface">ML Integration Contract</h3>
        </div>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          FitTrack AI generates a real-time normalized telemetry payload containing habit density, volume, calorie balance, and weight deltas. Connect your Python (FastAPI/Flask) or PyTorch server endpoint above.
        </p>
        <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/10 text-xs font-mono text-secondary">
          POST &#123;endpoint_url&#125; &rarr; returns &#123; "insights": [ &#123; "title": "...", "description": "..." &#125; ] &#125;
        </div>
      </div>

      {/* Payload Inspector */}
      <TelemetryPayloadViewer />
    </div>
  );
};
