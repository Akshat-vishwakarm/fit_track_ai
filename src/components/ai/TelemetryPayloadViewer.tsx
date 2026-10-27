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
    setTimeout(() => setCopied(false), 2500);
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
    <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 space-y-5 shadow-lg">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-heading text-sm font-bold text-on-surface uppercase tracking-wider">
              Live Telemetry & LLM Knowledge Extractor
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 uppercase tracking-widest animate-pulse">
              LIVE DATA
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Real-time export of your habits, daily completions, weekly workout split, nutrition logs, and body progress. Paste directly into ChatGPT / Claude for instant sports science coaching.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadData}
            disabled={loading}
            title="Refresh live data from database"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-heading font-medium transition-colors border border-outline-variant/20 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={!fullTelemetry}
            title="Download payload as file"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-heading font-medium transition-colors border border-outline-variant/20 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span className="hidden sm:inline">Download</span>
          </button>

          <button
            onClick={handleCopy}
            disabled={loading || (!llmPrompt && !fullTelemetry && !featureVector)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all shadow-md active:scale-95 ${
              copied
                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                : 'bg-primary hover:bg-primary/90 text-on-primary shadow-primary/20'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {copied ? 'check_circle' : 'content_copy'}
            </span>
            <span>
              {copied
                ? 'Copied to Clipboard!'
                : activeTab === 'chatgpt'
                ? 'Copy for ChatGPT / GPT'
                : activeTab === 'json'
                ? 'Copy Full JSON'
                : 'Copy Feature Vector'}
            </span>
          </button>
        </div>
      </div>

      {/* Live Data Telemetry Metrics Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        <div className="bg-surface-container-lowest/80 border border-outline-variant/15 p-2.5 rounded-xl flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider truncate">
              Habits Tracked
            </div>
            <div className="text-xs font-bold text-on-surface truncate">
              {activeHabitsCount} active ({completedTodayCount} done today)
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest/80 border border-outline-variant/15 p-2.5 rounded-xl flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">fitness_center</span>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider truncate">
              Workout Split
            </div>
            <div className="text-xs font-bold text-on-surface truncate">
              {plannedSplitDays} training days/wk
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest/80 border border-outline-variant/15 p-2.5 rounded-xl flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">restaurant</span>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider truncate">
              Nutrition Today
            </div>
            <div className="text-xs font-bold text-on-surface truncate">
              {todayCalories.toLocaleString()} kcal ({mealsLoggedToday} meals)
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest/80 border border-outline-variant/15 p-2.5 rounded-xl flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">scale</span>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider truncate">
              Current Weight
            </div>
            <div className="text-xs font-bold text-on-surface truncate">
              {currentWeight !== null && currentWeight !== undefined ? `${currentWeight} kg` : 'No logs yet'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs / Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-surface-container-lowest rounded-xl border border-outline-variant/20">
        <button
          onClick={() => setActiveTab('chatgpt')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-heading font-bold transition-all flex-1 justify-center ${
            activeTab === 'chatgpt'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">smart_toy</span>
          <span>ChatGPT / LLM Prompt &amp; Data</span>
          <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] bg-black/20 text-white font-mono uppercase">
            Recommended
          </span>
        </button>

        <button
          onClick={() => setActiveTab('json')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-heading font-bold transition-all flex-1 justify-center ${
            activeTab === 'json'
              ? 'bg-secondary text-on-secondary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">data_object</span>
          <span>Full Live Dataset (JSON)</span>
        </button>

        <button
          onClick={() => setActiveTab('vector')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-heading font-bold transition-all justify-center ${
            activeTab === 'vector'
              ? 'bg-surface-container-highest text-on-surface shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">bolt</span>
          <span className="hidden sm:inline">ML Tensor Vector</span>
        </button>
      </div>

      {/* Instructions Banner */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-container/60 border border-outline-variant/15 text-xs text-on-surface-variant">
        <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">
          lightbulb
        </span>
        <div className="space-y-0.5">
          <span className="font-bold text-on-surface">How to use with ChatGPT / Claude:</span>
          <p className="leading-relaxed">
            1. Click the <strong className="text-primary font-semibold">Copy for ChatGPT</strong> button above.
            <br />
            2. Open <span className="text-on-surface font-mono">chatgpt.com</span> or your preferred LLM and press <kbd className="px-1.5 py-0.5 bg-surface-container-highest rounded text-[10px] text-on-surface font-mono">Ctrl+V</kbd>.
            <br />
            3. The AI will instantly ingest all your habit completion streaks, your exact weekly gym split (exercises, sets, reps), and your nutrition logs to deliver personalized coaching feedback.
          </p>
        </div>
      </div>

      {/* Code Display Area */}
      <div className="relative">
        {copied && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-heading font-semibold shadow-lg animate-fade-in">
            <span className="material-symbols-outlined text-[16px]">done</span>
            <span>Copied to Clipboard!</span>
          </div>
        )}

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20 max-h-[460px] overflow-y-auto overflow-x-auto scrollbar-thin">
          <pre className="font-mono text-[11px] text-primary-container leading-relaxed whitespace-pre-wrap break-words">
            {getCurrentContent()}
          </pre>
        </div>
      </div>
    </div>
  );
};
