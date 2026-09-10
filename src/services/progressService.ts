import { db } from '../db/database';
import { firestoreService } from './firestoreService';
import type { ProgressEntry } from '../types';

export const progressService = {
  async getProgressEntries(userId: string): Promise<ProgressEntry[]> {
    const localProgress = await db.progressEntries.where('user_id').equals(userId).sortBy('date');

    // Fire-and-forget background sync
    firestoreService
      .getProgressEntries(userId)
      .then((fsProgress) => {
        if (fsProgress && fsProgress.length > 0) {
          for (const p of fsProgress) {
            db.progressEntries.put(p).catch(() => {});
          }
        }
      })
      .catch(() => {});

    return localProgress;
  },

  async addProgressEntry(entry: Omit<ProgressEntry, 'id' | 'created_at'>): Promise<ProgressEntry> {
    const existing = await db.progressEntries
      .where({ user_id: entry.user_id, date: entry.date })
      .first();

    let resultEntry: ProgressEntry;
    if (existing) {
      resultEntry = {
        ...existing,
        ...entry,
      };
      await db.progressEntries.put(resultEntry);
    } else {
      resultEntry = {
        ...entry,
        id: 'pe_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        created_at: new Date().toISOString(),
      };
      await db.progressEntries.add(resultEntry);
    }

    firestoreService.addProgressEntry(entry.user_id, entry).catch((err) => {
      console.warn('Background addProgressEntry error:', err);
    });

    return resultEntry;
  },

  async deleteProgressEntry(id: string, userId?: string): Promise<void> {
    await db.progressEntries.delete(id);
    if (userId) {
      firestoreService.deleteProgressEntry(userId, id).catch(() => {});
    }
  },

  async getLatestWeight(userId: string): Promise<number | null> {
    const entries = await this.getProgressEntries(userId);
    const withWeight = entries.filter((e) => e.weight !== undefined && e.weight !== null);
    if (withWeight.length === 0) return null;
    return withWeight[withWeight.length - 1].weight!;
  },
};


