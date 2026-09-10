import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { mlService } from '../../services/ml/mlService';
import type { MLFeatureVector } from '../../types';

export const TelemetryPayloadViewer: React.FC = () => {
  const { currentUser } = useAuth();
  const [featureVector, setFeatureVector] = useState<MLFeatureVector | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (currentUser) {
      mlService.extractFeatureVector(currentUser.id).then(setFeatureVector);
    }
  }, [currentUser]);

  const handleCopy = () => {
    if (featureVector) {
      navigator.clipboard.writeText(JSON.stringify(featureVector, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 space-y-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-heading text-xs font-bold text-on-surface uppercase tracking-wider">
            Live Telemetry Feature Payload Inspector
          </span>
          <p className="text-xs text-on-surface-variant">
            Standardized input vector generated dynamically from stored database records for ML inference
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-heading font-semibold transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">
            {copied ? 'check' : 'content_copy'}
          </span>
          <span>{copied ? 'Copied JSON' : 'Copy JSON'}</span>
        </button>
      </div>

      <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20 overflow-x-auto">
        <pre className="font-mono text-[11px] text-primary-container leading-relaxed">
          {featureVector ? JSON.stringify(featureVector, null, 2) : '// Extracting live feature vector...'}
        </pre>
      </div>
    </div>
  );
};
