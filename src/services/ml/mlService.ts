import { db } from '../../db/database';
import type { MLConfig, MLFeatureVector, MLPredictionResult } from '../../types';
import { predictionService } from './predictionService';
import { RemoteModelAdapter, DisconnectedModelAdapter, type ModelAdapter } from './modelAdapter';

export const mlService = {
  privateAdapter: new RemoteModelAdapter() as ModelAdapter,

  async getMLConfig(userId: string): Promise<MLConfig> {
    const existing = await db.mlConfigs.where('user_id').equals(userId).first();
    if (existing) return existing;

    const defaultConfig: MLConfig = {
      id: 'mlc_' + Date.now(),
      user_id: userId,
      endpoint_url: '',
      provider: 'python_fastapi',
      connected: false,
    };
    await db.mlConfigs.add(defaultConfig);
    return defaultConfig;
  },

  async saveMLConfig(userId: string, updates: Partial<MLConfig>): Promise<MLConfig> {
    const config = await this.getMLConfig(userId);
    const updated: MLConfig = {
      ...config,
      ...updates,
      last_synced_at: new Date().toISOString(),
    };
    await db.mlConfigs.put(updated);
    return updated;
  },

  async extractFeatureVector(userId: string): Promise<MLFeatureVector> {
    return await predictionService.buildFeatureVector(userId);
  },

  async getInsights(userId: string): Promise<MLPredictionResult> {
    const config = await this.getMLConfig(userId);
    const featureVector = await this.extractFeatureVector(userId);

    if (!config.connected || !config.endpoint_url) {
      return new DisconnectedModelAdapter().predict(featureVector, config);
    }

    return await this.privateAdapter.predict(featureVector, config);
  },
};
