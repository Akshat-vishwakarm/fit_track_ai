import { db } from '../db/database';
import { firestoreService } from './firestoreService';
import type { NutritionGoal, MealEntry } from '../types';

export const nutritionService = {
  async getNutritionGoal(userId: string): Promise<NutritionGoal | null> {
    try {
      const fsGoal = await firestoreService.getNutritionGoal(userId);
      if (fsGoal) {
        await db.nutritionGoals.put(fsGoal).catch(() => {});
        return fsGoal;
      }
    } catch (err) {
      console.warn('firestoreService.getNutritionGoal error, falling back to local Dexie:', err);
    }

    const localGoal = await db.nutritionGoals.where('user_id').equals(userId).first();
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

    await firestoreService.saveNutritionGoal(userId, goals).catch((err) => {
      console.warn('saveNutritionGoal error to Firestore:', err);
    });

    return resultGoal;
  },

  async getMealEntriesForDate(userId: string, dateStr: string): Promise<MealEntry[]> {
    const all = await this.getMealEntries(userId);
    return all.filter((m) => m.date === dateStr);
  },

  async getMealEntries(userId: string): Promise<MealEntry[]> {
    try {
      const fsMeals = await firestoreService.getMealEntries(userId);
      if (fsMeals && fsMeals.length > 0) {
        for (const m of fsMeals) {
          await db.mealEntries.put(m).catch(() => {});
        }
        return fsMeals;
      }
    } catch (err) {
      console.warn('firestoreService.getMealEntries error, falling back to local Dexie:', err);
    }

    return await db.mealEntries.where('user_id').equals(userId).toArray();
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

    await firestoreService.addMealEntry(meal.user_id, newEntry).catch((err) => {
      console.warn('addMealEntry error to Firestore:', err);
    });

    return newEntry;
  },

  async updateMealEntry(id: string, updates: Partial<MealEntry>, userId?: string): Promise<void> {
    await db.mealEntries.update(id, updates);
    const existing = await db.mealEntries.get(id);
    const ownerId = userId || existing?.user_id;
    if (ownerId) {
      await firestoreService.updateMealEntry(ownerId, id, updates).catch(() => {});
    }
  },

  async deleteMealEntry(id: string, userId?: string): Promise<void> {
    const existing = await db.mealEntries.get(id);
    const ownerId = userId || existing?.user_id;
    await db.mealEntries.delete(id);
    if (ownerId) {
      await firestoreService.deleteMealEntry(ownerId, id).catch(() => {});
    }
  },

  async getDailySummary(
    userId: string,
    dateStr: string
  ): Promise<{
    consumed: { calories: number; protein: number; carbs: number; fats: number };
    entries: MealEntry[];
  }> {
    const entries = await this.getMealEntriesForDate(userId, dateStr);
    const consumed = entries.reduce(
      (acc, entry) => ({
        calories: acc.calories + (entry.calories || 0),
        protein: acc.protein + (entry.protein || 0),
        carbs: acc.carbs + (entry.carbs || 0),
        fats: acc.fats + (entry.fats || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    return { consumed, entries };
  },
};
