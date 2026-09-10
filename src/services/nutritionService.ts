import { db } from '../db/database';
import { firestoreService } from './firestoreService';
import type { NutritionGoal, MealEntry } from '../types';

export const nutritionService = {
  async getNutritionGoal(userId: string): Promise<NutritionGoal | null> {
    const localGoal = await db.nutritionGoals.where('user_id').equals(userId).first();

    // Fire-and-forget background sync
    firestoreService
      .getNutritionGoal(userId)
      .then((fsGoal) => {
        if (fsGoal) {
          db.nutritionGoals.put(fsGoal).catch(() => {});
        }
      })
      .catch(() => {});

    return localGoal || null;
  },

  async saveNutritionGoal(
    userId: string,
    goals: { calories: number; protein: number; carbs: number; fats: number }
  ): Promise<NutritionGoal> {
    const existing = await this.getNutritionGoal(userId);
    let resultGoal: NutritionGoal;
    if (existing) {
      resultGoal = {
        ...existing,
        ...goals,
        updated_at: new Date().toISOString(),
      };
      await db.nutritionGoals.put(resultGoal);
    } else {
      resultGoal = {
        id: 'ng_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        user_id: userId,
        ...goals,
        updated_at: new Date().toISOString(),
      };
      await db.nutritionGoals.add(resultGoal);
    }

    firestoreService.saveNutritionGoal(userId, goals).catch((err) => {
      console.warn('Background saveNutritionGoal error:', err);
    });

    return resultGoal;
  },

  async getMealEntriesForDate(userId: string, dateStr: string): Promise<MealEntry[]> {
    const all = await this.getMealEntries(userId);
    return all.filter((m) => m.date === dateStr);
  },

  async getMealEntries(userId: string): Promise<MealEntry[]> {
    const localMeals = await db.mealEntries.where('user_id').equals(userId).toArray();

    // Fire-and-forget background sync
    firestoreService
      .getMealEntries(userId)
      .then((fsMeals) => {
        if (fsMeals && fsMeals.length > 0) {
          for (const m of fsMeals) {
            db.mealEntries.put(m).catch(() => {});
          }
        }
      })
      .catch(() => {});

    return localMeals;
  },

  async addMealEntry(meal: Omit<MealEntry, 'id' | 'created_at'>): Promise<MealEntry> {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm
    const newEntry: MealEntry = {
      ...meal,
      id: 'ml_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      time: meal.time || timeStr,
      created_at: new Date().toISOString(),
    };
    await db.mealEntries.add(newEntry);

    firestoreService.addMealEntry(meal.user_id, newEntry).catch((err) => {
      console.warn('Background addMealEntry error:', err);
    });

    return newEntry;
  },

  async updateMealEntry(id: string, updates: Partial<MealEntry>, userId?: string): Promise<void> {
    await db.mealEntries.update(id, updates);
    if (userId) {
      firestoreService.updateMealEntry(userId, id, updates).catch(() => {});
    }
  },

  async deleteMealEntry(id: string, userId?: string): Promise<void> {
    await db.mealEntries.delete(id);
    if (userId) {
      firestoreService.deleteMealEntry(userId, id).catch(() => {});
    }
  },

  async getDailySummary(userId: string, dateStr: string) {
    const entries = await this.getMealEntriesForDate(userId, dateStr);
    const goal = await this.getNutritionGoal(userId);

    const consumed = entries.reduce(
      (acc, curr) => {
        acc.calories += curr.calories || 0;
        acc.protein += curr.protein || 0;
        acc.carbs += curr.carbs || 0;
        acc.fats += curr.fats || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    return {
      date: dateStr,
      goal,
      consumed,
      entries,
    };
  },
};


