import { db } from '../db/database';
import { firestoreService } from './firestoreService';
import type { WorkoutPlan, WorkoutLog } from '../types';

export const workoutService = {
  async getWorkoutPlans(userId: string): Promise<WorkoutPlan[]> {
    try {
      const fsPlans = await firestoreService.getWorkoutPlans(userId);
      if (fsPlans && fsPlans.length > 0) {
        for (const p of fsPlans) {
          await db.workoutPlans.put(p).catch(() => {});
        }
        return fsPlans;
      }
    } catch (err) {
      console.warn('firestoreService.getWorkoutPlans error, falling back to local Dexie:', err);
    }

    return await db.workoutPlans.where('user_id').equals(userId).toArray();
  },

  async saveWorkoutPlan(
    userId: string,
    dayOfWeek: number,
    workoutName: string,
    muscleGroup: string,
    exercises: WorkoutPlan['exercises']
  ): Promise<WorkoutPlan> {
    const existing = await db.workoutPlans
      .where({ user_id: userId, day_of_week: dayOfWeek })
      .first();

    let plan: WorkoutPlan;
    if (existing) {
      plan = {
        ...existing,
        workout_name: workoutName,
        muscle_group: muscleGroup,
        exercises,
      };
      await db.workoutPlans.put(plan);
    } else {
      plan = {
        id: 'wp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        user_id: userId,
        day_of_week: dayOfWeek,
        workout_name: workoutName,
        muscle_group: muscleGroup,
        exercises,
        created_at: new Date().toISOString(),
      };
      await db.workoutPlans.add(plan);
    }

    // Direct Firestore cloud persistence under users/{userId}/workoutPlans/{planId}
    await firestoreService.saveWorkoutPlan(userId, dayOfWeek, workoutName, muscleGroup, exercises, plan.id).catch((err) => {
      console.warn('saveWorkoutPlan error to Firestore:', err);
    });

    return plan;
  },

  async deleteWorkoutPlan(id: string, userId?: string, dayOfWeek?: number): Promise<void> {
    await db.workoutPlans.delete(id);
    if (userId && dayOfWeek !== undefined) {
      const duplicates = await db.workoutPlans
        .where({ user_id: userId, day_of_week: dayOfWeek })
        .toArray();
      for (const d of duplicates) {
        await db.workoutPlans.delete(d.id);
      }
    }
    if (userId) {
      await firestoreService.deleteWorkoutPlan(userId, id, dayOfWeek);
    }
  },

  async logWorkout(log: Omit<WorkoutLog, 'id' | 'created_at'>): Promise<WorkoutLog> {
    const newLog: WorkoutLog = {
      ...log,
      id: 'wl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      created_at: new Date().toISOString(),
    };
    await db.workoutLogs.add(newLog);

    await firestoreService.logWorkout(log.user_id, newLog).catch((err) => {
      console.warn('logWorkout error to Firestore:', err);
    });

    return newLog;
  },

  async getWorkoutLogs(userId: string): Promise<WorkoutLog[]> {
    try {
      const fsLogs = await firestoreService.getWorkoutLogs(userId);
      if (fsLogs && fsLogs.length > 0) {
        for (const l of fsLogs) {
          await db.workoutLogs.put(l).catch(() => {});
        }
        return fsLogs;
      }
    } catch (err) {
      console.warn('firestoreService.getWorkoutLogs error, falling back to local Dexie:', err);
    }

    return await db.workoutLogs.where('user_id').equals(userId).reverse().sortBy('date');
  },
};
