import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { mlService } from '../../services/ml/mlService';
import type { MLFeatureVector, FullTelemetryContext } from '../../types';

export const TelemetryPayloadViewer: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'chatgpt' | 'json' | 'vector'>('chatgpt');
  const [featureVector, setFeatureVector] = useState<MLFeatureVector | null>(null);
  const [fullTelemetry, setFullTelemetry] = useState<FullTelemetryContext | null>(null);
  const [llmPrompt, setLlmPrompt] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [fv, ft] = await Promise.all([
        mlService.extractFeatureVector(currentUser.id),
        mlService.extractFullTelemetry(currentUser.id, {
          name: currentUser.name,
          email: currentUser.email,
        }),
      ]);
      setFeatureVector(fv);
      setFullTelemetry(ft);
      setLlmPrompt(mlService.buildLLMPrompt(ft));
    } catch (err) {
      console.error('Failed to extract live telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getCurrentContent = (): string => {
    if (activeTab === 'chatgpt') {
      return llmPrompt || '// Generating ChatGPT prompt with live telemetry...';
    }
    if (activeTab === 'json') {
      return fullTelemetry
        ? JSON.stringify(fullTelemetry, null, 2)
        : '// Extracting complete live telemetry dataset...';
    }
    return featureVector
      ? JSON.stringify(featureVector, null, 2)
      : '// Extracting mathematical feature vector...';
  };

  const handleCopy = () => {
    const textToCopy = getCurrentContent();
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!fullTelemetry) return;
    const dateStr = fullTelemetry.metadata.current_local_date || 'today';
    const content = activeTab === 'chatgpt' ? llmPrompt : JSON.stringify(fullTelemetry, null, 2);
    const filename =
      activeTab === 'chatgpt'
        ? `fittrack-chatgpt-prompt-${dateStr}.md`
        : `fittrack-live-telemetry-${dateStr}.json`;
    const mimeType = activeTab === 'chatgpt' ? 'text/markdown' : 'application/json';

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeHabitsCount = fullTelemetry?.habits.active_habits_count ?? 0;
  const completedTodayCount =
    fullTelemetry?.habits.habits_list.filter((h) => h.today_status === 'completed').length ?? 0;
  const plannedSplitDays =
    fullTelemetry?.gym_and_workout.weekly_training_split.filter((s) => !s.is_rest_day).length ?? 0;
  const todayCalories = fullTelemetry?.nutrition.today_summary.total_calories ?? 0;
  const mealsLoggedToday = fullTelemetry?.nutrition.today_summary.logged_meals_count ?? 0;
  const currentWeight = fullTelemetry?.body_progress_and_goals.latest_weight_kg;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 sm:p-6 space-y-5 shadow-sm">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-heading text-base font-semibold text-primary">
              Live Telemetry &amp; LLM Knowledge Extractor
            </span>
            <span className="px-2 py-0.5 rounded border border-outline-variant font-mono text-[10px] text-secondary bg-surface uppercase">
              LIVE DATA
            </span>
          </div>
          <p className="text-xs text-secondary mt-0.5">
            Real-time export of your habits, daily completions, weekly workout split, nutrition logs, and body progress. Paste directly into ChatGPT / Claude for instant sports science coaching.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadData}
            disabled={loading}
            className="h-8 px-3 rounded border border-outline-variant bg-surface hover:bg-neutral-200 text-xs font-medium text-primary transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[15px] ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Refresh</span>
          </button>
          <button
            onClick={handleDownload}
            className="h-8 px-3 rounded border border-outline-variant bg-surface hover:bg-neutral-200 text-xs font-medium text-primary transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">download</span>
            <span>Download</span>
          </button>
          <button
            onClick={handleCopy}
            className="h-8 px-4 rounded bg-primary text-on-primary hover:bg-neutral-800 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            <span>{copied ? 'Copied to Clipboard' : 'Copy for ChatGPT'}</span>
          </button>
        </div>
      </div>

      {/* Mini Metric Pills Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono text-xs">
        <div className="bg-surface p-2.5 rounded border border-outline-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary">task_alt</span>
          <div>
            <div className="text-[10px] text-secondary uppercase">Habits Tracked</div>
            <div className="font-semibold text-primary">
              {activeHabitsCount} active ({completedTodayCount} done today)
            </div>
          </div>
        </div>

        <div className="bg-surface p-2.5 rounded border border-outline-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary">fitness_center</span>
          <div>
            <div className="text-[10px] text-secondary uppercase">Workout Split</div>
            <div className="font-semibold text-primary">{plannedSplitDays} training days/wk</div>
          </div>
        </div>

        <div className="bg-surface p-2.5 rounded border border-outline-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary">restaurant</span>
          <div>
            <div className="text-[10px] text-secondary uppercase">Nutrition Today</div>
            <div className="font-semibold text-primary">{todayCalories} kcal ({mealsLoggedToday} meals)</div>
          </div>
        </div>

        <div className="bg-surface p-2.5 rounded border border-outline-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary">monitoring</span>
          <div>
            <div className="text-[10px] text-secondary uppercase">Current Weight</div>
            <div className="font-semibold text-primary">
              {currentWeight ? `${currentWeight} kg` : 'No logs yet'}
            </div>
          </div>
        </div>
      </div>

      {/* Format Selector Tabs */}
      <div className="flex border border-outline-variant rounded p-1 bg-surface gap-1">
        <button
          onClick={() => setActiveTab('chatgpt')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${
            activeTab === 'chatgpt'
              ? 'bg-primary text-on-primary'
              : 'text-secondary hover:text-primary'
          }`}
        >
          ChatGPT / LLM Coaching Prompt (Recommended)
        </button>
        <button
          onClick={() => setActiveTab('json')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${
            activeTab === 'json'
              ? 'bg-primary text-on-primary'
              : 'text-secondary hover:text-primary'
          }`}
        >
          Full Live Dataset (JSON)
        </button>
        <button
          onClick={() => setActiveTab('vector')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${
            activeTab === 'vector'
              ? 'bg-primary text-on-primary'
              : 'text-secondary hover:text-primary'
          }`}
        >
          ML Tensor Vector
        </button>
      </div>

      {/* Code Display Area */}
      <div className="relative rounded border border-neutral-700 bg-[#111111] overflow-hidden">
        <pre className="p-4 text-xs font-mono text-[#EEEEEE] overflow-x-auto max-h-96 leading-relaxed whitespace-pre-wrap">
          {getCurrentContent()}
        </pre>
      </div>
    </div>
  );
};
