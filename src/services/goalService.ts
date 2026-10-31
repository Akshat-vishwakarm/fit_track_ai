import { db } from '../db/database';
import { firestoreService } from './firestoreService';
import type { Goal } from '../types';

export const goalService = {
  async getGoals(userId: string): Promise<Goal[]> {
    try {
      const fsGoals = await firestoreService.getGoals(userId);
      if (fsGoals && fsGoals.length > 0) {
        for (const g of fsGoals) {
          await db.goals.put(g).catch(() => {});
        }
        return fsGoals;
      }
    } catch (err) {
      console.warn('firestoreService.getGoals error, falling back to local Dexie:', err);
    }

    return await db.goals.where('user_id').equals(userId).toArray();
  },

  async addGoal(goal: Omit<Goal, 'id' | 'created_at' | 'status'>): Promise<Goal> {
    const newGoal: Goal = {
      ...goal,
      id: 'gl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      status: 'active',
      created_at: new Date().toISOString(),
    };
    await db.goals.add(newGoal);

    await firestoreService.addGoal(goal.user_id, newGoal).catch((err) => {
      console.warn('addGoal error to Firestore:', err);
    });

    return newGoal;
  },

  async updateGoal(id: string, updates: Partial<Goal>, userId?: string): Promise<void> {
    await db.goals.update(id, updates);
    const existing = await db.goals.get(id);
    const ownerId = userId || existing?.user_id;
    if (ownerId && existing) {
      await firestoreService.addGoal(ownerId, existing).catch(() => {});
    }
  },

  async deleteGoal(id: string, userId?: string): Promise<void> {
    const existing = await db.goals.get(id);
    const ownerId = userId || existing?.user_id;
    await db.goals.delete(id);
    if (ownerId) {
      await firestoreService.deleteGoal(ownerId, id).catch(() => {});
    }
  },
};
