import type { MLConfig, MLFeatureVector, MLPredictionResult } from '../../types';

export interface ModelAdapter {
  predict(featureVector: MLFeatureVector, config: MLConfig): Promise<MLPredictionResult>;
}

export class RemoteModelAdapter implements ModelAdapter {
  async predict(featureVector: MLFeatureVector, config: MLConfig): Promise<MLPredictionResult> {
    if (!config.connected || !config.endpoint_url) {
      return {
        connected: false,
        status_message: 'AI Model not connected. Connect your ML model to unlock personalized insights.',
        insights: [],
      };
    }

    try {
      const response = await fetch(config.endpoint_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.api_key ? { Authorization: `Bearer ${config.api_key}` } : {}),
        },
        body: JSON.stringify(featureVector),
      });

      if (!response.ok) {
        return {
          connected: false,
          status_message: `Inference server returned error status (${response.status})`,
          insights: [],
        };
      }

      const data = await response.json();
      return {
        connected: true,
        status_message: 'Connected & Live',
        insights: data.insights || [],
      };
    } catch (err: any) {
      return {
        connected: false,
        status_message: `Connection failed: ${err?.message || 'Endpoint unreachable'}`,
        insights: [],
      };
    }
  }
}

export class DisconnectedModelAdapter implements ModelAdapter {
  async predict(_featureVector: MLFeatureVector, _config: MLConfig): Promise<MLPredictionResult> {
    return {
      connected: false,
      status_message: 'AI Model not connected. Connect your ML model to unlock personalized insights.',
      insights: [],
    };
  }
}
