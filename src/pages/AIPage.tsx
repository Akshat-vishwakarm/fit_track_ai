import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { mlService } from '../services/ml/mlService';
import { MLStatusCard } from '../components/ai/MLStatusCard';
import { TelemetryPayloadViewer } from '../components/ai/TelemetryPayloadViewer';
import { MCPServerCard } from '../components/ai/MCPServerCard';
import { MLInstructionsModal } from '../components/ai/MLInstructionsModal';
import type { MLConfig } from '../types';

export const AIPage: React.FC = () => {
  const { mlConfig, refreshData } = useData();
  const { currentUser } = useAuth();
  const [showInstructions, setShowInstructions] = useState(false);

  const handleSaveConfig = async (updates: Partial<MLConfig>) => {
    if (!currentUser) return;
    await mlService.saveMLConfig(currentUser.id, updates);
    await refreshData();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar with Instruction Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-primary tracking-tight">
            AI &amp; Machine Learning Insights
          </h1>
          <p className="text-xs text-secondary mt-0.5">
            Architectural interface layer for ML model inference and personalized recommendations.
          </p>
        </div>

        {/* Instructions Button */}
        <button
          onClick={() => setShowInstructions(true)}
          className="h-9 px-4 bg-primary text-on-primary text-xs font-medium rounded hover:bg-neutral-800 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">menu_book</span>
          <span>How to Use / Instructions</span>
        </button>
      </div>

      {/* Model Status & Connection Card */}
      <MLStatusCard config={mlConfig} onSaveConfig={handleSaveConfig} />

      {/* Integration Guide Box */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 sm:p-6 space-y-3 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">smart_toy</span>
            <h3 className="font-heading font-semibold text-sm text-primary">
              LLM (ChatGPT/Claude) &amp; ML Model Integration
            </h3>
          </div>
          <button
            onClick={() => setShowInstructions(true)}
            className="text-xs text-primary font-medium hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Read Guide</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>
        <p className="text-xs text-secondary leading-relaxed">
          FitTrack AI continuously compiles your active habits, completion consistency, weekly training split, nutrition meals, and weight into live telemetry. You can copy the complete dataset or pre-formatted prompt below into ChatGPT/GPT-4 for an instant AI coaching breakdown, or connect a remote Python FastAPI endpoint.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div className="bg-surface p-3 rounded border border-outline-variant text-secondary">
            <strong className="text-primary">LLM / GPT:</strong> Copy prompt below &rarr; Paste in ChatGPT
          </div>
          <div className="bg-surface p-3 rounded border border-outline-variant text-secondary">
            <strong className="text-primary">Custom ML API:</strong> POST endpoint_url &rarr; returns insights
          </div>
        </div>
      </div>

      {/* Real Model Context Protocol (MCP) Server for ChatGPT */}
      <MCPServerCard />

      {/* Payload Inspector */}
      <TelemetryPayloadViewer />

      {/* Instructions Modal Walkthrough */}
      <MLInstructionsModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} />
    </div>
  );
};
