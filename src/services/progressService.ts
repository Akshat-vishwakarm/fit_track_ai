import { db } from '../db/database';
import { firestoreService } from './firestoreService';
import type { ProgressEntry } from '../types';

export const progressService = {
  async getProgressEntries(userId: string): Promise<ProgressEntry[]> {
    try {
      const fsProgress = await firestoreService.getProgressEntries(userId);
      if (fsProgress && fsProgress.length > 0) {
        for (const p of fsProgress) {
          await db.progressEntries.put(p).catch(() => {});
        }
        return fsProgress;
      }
    } catch (err) {
      console.warn('firestoreService.getProgressEntries error, falling back to local Dexie:', err);
    }

    return await db.progressEntries.where('user_id').equals(userId).sortBy('date');
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

    await firestoreService.addProgressEntry(entry.user_id, resultEntry).catch((err) => {
      console.warn('addProgressEntry error to Firestore:', err);
    });

    return resultEntry;
  },

  async deleteProgressEntry(id: string, userId?: string): Promise<void> {
    const existing = await db.progressEntries.get(id);
    const ownerId = userId || existing?.user_id;
    await db.progressEntries.delete(id);
    if (ownerId) {
      await firestoreService.deleteProgressEntry(ownerId, id).catch(() => {});
    }
  },

  async getLatestWeight(userId: string): Promise<number | null> {
    const entries = await this.getProgressEntries(userId);
    if (entries.length === 0) return null;
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0].weight ?? null;
  },
};
