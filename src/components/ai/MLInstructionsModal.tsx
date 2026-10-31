import React, { useState } from 'react';

interface MLInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MLInstructionsModal: React.FC<MLInstructionsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'prompt' | 'mcp' | 'api' | 'custom'>('prompt');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCode = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg max-w-3xl w-full p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded border border-outline-variant bg-surface flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">menu_book</span>
            </div>
            <div>
              <h2 className="font-heading font-semibold text-base text-primary">
                FitTrack AI &amp; Machine Learning User Guide
              </h2>
              <p className="text-xs text-secondary mt-0.5">
                Step-by-step instructions to connect, query, and automate your fitness coaching
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-secondary hover:text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-surface rounded border border-outline-variant overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('prompt')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors shrink-0 cursor-pointer ${
              activeTab === 'prompt'
                ? 'bg-primary text-on-primary font-medium'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">smart_toy</span>
            <span>1. LLM Prompt Copy</span>
          </button>

          <button
            onClick={() => setActiveTab('mcp')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors shrink-0 cursor-pointer ${
              activeTab === 'mcp'
                ? 'bg-primary text-on-primary font-medium'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">hub</span>
            <span>2. Live ChatGPT MCP</span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors shrink-0 cursor-pointer ${
              activeTab === 'api'
                ? 'bg-primary text-on-primary font-medium'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">key</span>
            <span>3. Personal API Token</span>
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors shrink-0 cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-primary text-on-primary font-medium'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">code</span>
            <span>4. Python / ML Endpoint</span>
          </button>
        </div>

        {/* Tab 1: Instant LLM Copy */}
        {activeTab === 'prompt' && (
          <div className="space-y-3 text-xs leading-relaxed text-secondary font-sans">
            <div className="bg-surface border border-outline-variant p-3 rounded text-primary font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">info</span>
              <span>Fastest Zero-Setup Method: No API keys or server configuration required!</span>
            </div>

            <ol className="list-decimal pl-5 space-y-2">
              <li>
                Navigate to the <strong className="text-primary">Live Telemetry &amp; LLM Knowledge Extractor</strong> card on this page.
              </li>
              <li>
                Click the <strong className="text-primary">&quot;Copy for ChatGPT&quot;</strong> button. This copies your entire fitness profile:
                <ul className="list-disc pl-5 mt-1 space-y-0.5 text-[11px]">
                  <li>Active habits, completion consistency, and streaks</li>
                  <li>Complete 7-day gym workout split with exercises, sets, reps, and weights</li>
                  <li>Today&apos;s logged meals and macro breakdown (calories, protein, carbs, fats)</li>
                  <li>Latest recorded body weight and active target deadlines</li>
                </ul>
              </li>
              <li>
                Open <a href="https://chatgpt.com" target="_blank" rel="noreferrer" className="underline font-mono text-primary">chatgpt.com</a> or Claude and paste (Ctrl+V).
              </li>
              <li>
                The AI will respond as an elite sports scientist and personal trainer with hyper-specific feedback tailored directly to your routine.
              </li>
            </ol>
          </div>
        )}

        {/* Tab 2: ChatGPT MCP Server */}
        {activeTab === 'mcp' && (
          <div className="space-y-3 text-xs leading-relaxed text-secondary font-sans">
            <div className="bg-surface border border-outline-variant p-3 rounded text-primary font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">hub</span>
              <span>Full Autonomous Agent: ChatGPT can query AND modify your habits/workouts directly.</span>
            </div>

            <div className="space-y-2">
              <span className="font-mono text-xs uppercase text-primary font-semibold">Setup in 3 Steps:</span>
              <div className="bg-surface p-3 rounded border border-outline-variant space-y-2 font-mono text-[11px]">
                <p><strong>Step 1:</strong> Start Express backend server in your repo:</p>
                <div className="bg-[#111111] text-[#EEEEEE] p-2 rounded flex justify-between items-center">
                  <code>npm run server:dev</code>
                  <button onClick={() => copyCode('npm run server:dev', 'cmd1')} className="text-secondary hover:text-white">
                    {copiedText === 'cmd1' ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <p className="pt-1"><strong>Step 2:</strong> In ChatGPT &rarr; Create a GPT &rarr; Actions &rarr; Import from URL:</p>
                <div className="bg-[#111111] text-[#EEEEEE] p-2 rounded flex justify-between items-center">
                  <code>http://localhost:3005/openapi.json</code>
                  <button onClick={() => copyCode('http://localhost:3005/openapi.json', 'url1')} className="text-secondary hover:text-white">
                    {copiedText === 'url1' ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <p className="pt-1"><strong>Step 3:</strong> Select Bearer Auth and paste your Personal Bearer Token from the MCP card.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Personal API Tokens */}
        {activeTab === 'api' && (
          <div className="space-y-3 text-xs leading-relaxed text-secondary font-sans">
            <div className="bg-surface border border-outline-variant p-3 rounded text-primary font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">key</span>
              <span>Personal REST API: Use personal tokens for custom integrations and AI assistants.</span>
            </div>

            <ol className="list-decimal pl-5 space-y-2">
              <li>Open <strong className="text-primary">Settings &rarr; Personal API Integration</strong>.</li>
              <li>Click <strong className="text-primary">&quot;Generate New Token&quot;</strong> and copy your token starting with <code className="font-mono bg-surface px-1 rounded">ft_live_...</code></li>
              <li>Use the Bearer authorization header:</li>
            </ol>

            <div className="bg-[#111111] text-[#EEEEEE] p-3 rounded font-mono text-xs space-y-1">
              <div>curl -H &quot;Authorization: Bearer YOUR_TOKEN&quot; \</div>
              <div>&nbsp;&nbsp;http://localhost:3005/api/v1/dashboard</div>
            </div>
          </div>
        )}

        {/* Tab 4: Custom Python Endpoint */}
        {activeTab === 'custom' && (
          <div className="space-y-3 text-xs leading-relaxed text-secondary font-sans">
            <div className="bg-surface border border-outline-variant p-3 rounded text-primary font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">code</span>
              <span>Python FastAPI / PyTorch Model Endpoint Schema:</span>
            </div>

            <p>Connect any custom ML microservice via POST endpoint receiving normalized feature tensors.</p>

            <div className="bg-[#111111] text-[#EEEEEE] p-3 rounded font-mono text-[11px] overflow-x-auto">
              <pre>{`from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class TelemetryPayload(BaseModel):
    user_id: str
    habits: list
    workout_split: list
    today_calories: float
    current_weight: float | None

@app.post("/api/v1/predict")
def predict_recommendations(payload: TelemetryPayload):
    # Run PyTorch/XGBoost inference
    return {
        "status": "success",
        "insights": ["Target hydration +500ml", "Squat progression +2.5kg recommended"]
    }`}</pre>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-outline-variant">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-primary text-on-primary hover:bg-neutral-800 text-xs font-medium cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
