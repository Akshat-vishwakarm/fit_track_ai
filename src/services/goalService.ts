import { db } from '../db/database';
import { firestoreService } from './firestoreService';
import type { Goal } from '../types';

export const goalService = {
  async getGoals(userId: string): Promise<Goal[]> {
    const localGoals = await db.goals.where('user_id').equals(userId).toArray();

    // Fire-and-forget background sync
    firestoreService
      .getGoals(userId)
      .then((fsGoals) => {
        if (fsGoals && fsGoals.length > 0) {
          for (const g of fsGoals) {
            db.goals.put(g).catch(() => {});
          }
        }
      })
      .catch(() => {});

    return localGoals;
  },

  async addGoal(goal: Omit<Goal, 'id' | 'created_at' | 'status'>): Promise<Goal> {
    const newGoal: Goal = {
      ...goal,
      id: 'gl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      status: 'active',
      created_at: new Date().toISOString(),
    };
    await db.goals.add(newGoal);

    firestoreService.addGoal(goal.user_id, goal).catch((err) => {
      console.warn('Background addGoal error:', err);
    });

    return newGoal;
  },

  async updateGoal(id: string, updates: Partial<Goal>): Promise<void> {
    await db.goals.update(id, updates);
  },

  async deleteGoal(id: string, userId?: string): Promise<void> {
    await db.goals.delete(id);
    if (userId) {
      firestoreService.deleteGoal(userId, id).catch(() => {});
    }
  },
};


