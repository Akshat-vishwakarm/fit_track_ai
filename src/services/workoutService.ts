import { db } from '../db/database';
import { firestoreService } from './firestoreService';
import type { WorkoutPlan, WorkoutLog } from '../types';

export const workoutService = {
  async getWorkoutPlans(userId: string): Promise<WorkoutPlan[]> {
    const localPlans = await db.workoutPlans.where('user_id').equals(userId).toArray();

    // Fire-and-forget background sync
    firestoreService
      .getWorkoutPlans(userId)
      .then((fsPlans) => {
        if (fsPlans && fsPlans.length > 0) {
          for (const p of fsPlans) {
            db.workoutPlans.put(p).catch(() => {});
          }
        }
      })
      .catch(() => {});

    return localPlans;
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

    // Background non-blocking sync to Firestore
    firestoreService.saveWorkoutPlan(userId, dayOfWeek, workoutName, muscleGroup, exercises).catch((err) => {
      console.warn('Background saveWorkoutPlan error:', err);
    });

    return plan;
  },

  async deleteWorkoutPlan(id: string, userId?: string): Promise<void> {
    await db.workoutPlans.delete(id);
    if (userId) {
      firestoreService.deleteWorkoutPlan(userId, id).catch(() => {});
    }
  },

  async logWorkout(log: Omit<WorkoutLog, 'id' | 'created_at'>): Promise<WorkoutLog> {
    const newLog: WorkoutLog = {
      ...log,
      id: 'wl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      created_at: new Date().toISOString(),
    };
    await db.workoutLogs.add(newLog);

    firestoreService.logWorkout(log.user_id, log).catch((err) => {
      console.warn('Background logWorkout error:', err);
    });

    return newLog;
  },

  async getWorkoutLogs(userId: string): Promise<WorkoutLog[]> {
    const localLogs = await db.workoutLogs.where('user_id').equals(userId).reverse().sortBy('date');

    // Fire-and-forget background sync
    firestoreService
      .getWorkoutLogs(userId)
      .then((fsLogs) => {
        if (fsLogs && fsLogs.length > 0) {
          for (const l of fsLogs) {
            db.workoutLogs.put(l).catch(() => {});
          }
        }
      })
      .catch(() => {});

    return localLogs;
  },
};


