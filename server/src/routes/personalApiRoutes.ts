import { Router, Request, Response } from 'express';
import { firestoreClient } from '../db/firestoreClient.js';
import { tokenService, validateTokenFormat } from '../auth/tokenService.js';
import { rateLimitMiddleware } from '../auth/rateLimiter.js';
import { config } from '../config.js';

export const personalApiRouter = Router();

// Helper to get local date string YYYY-MM-DD
function getLocalDateStr(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + days);
  return getLocalDateStr(d);
}

// ============================================================================
// TOKEN MANAGEMENT ENDPOINTS
// Accessible by user to generate/view/revoke their personal API token
// ============================================================================

/**
 * Helper to resolve requesting user for token management
 * Accepts:
 * 1. Existing verified Personal API Token (via Bearer)
 * 2. Firebase User ID in header `x-firebase-uid` (verified against token or master secret)
 * 3. Body { user_id, client_secret }
 */
function resolveTokenManagementUser(req: Request): string | null {
  // If already authenticated via Bearer token
  if (req.userContext?.userId) {
    return req.userContext.userId;
  }

  const headerUid = req.headers['x-firebase-uid'] as string;
  const adminSecret = req.headers['x-admin-secret'] as string;

  if (headerUid && typeof headerUid === 'string' && headerUid.trim()) {
    // If admin secret matches or in dev/test environment
    if (
      adminSecret === config.auth.apiKeySecret ||
      config.nodeEnv === 'development' ||
      config.nodeEnv === 'test'
    ) {
      return headerUid.trim();
    }
  }

  const bodyUid = req.body?.user_id;
  const bodySecret = req.body?.client_secret;
  if (bodyUid && typeof bodyUid === 'string') {
    if (
      bodySecret === config.auth.apiKeySecret ||
      config.nodeEnv === 'development' ||
      config.nodeEnv === 'test'
    ) {
      return bodyUid.trim();
    }
  }

  return null;
}

/**
 * POST /api/v1/tokens/generate
 * Generates a new cryptographically secure Personal API Token.
 * The plaintext token is returned EXACTLY ONCE.
 */
personalApiRouter.post('/tokens/generate', async (req: Request, res: Response) => {
  const userId = resolveTokenManagementUser(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication Required',
      message: 'You must provide a valid authenticated session, Firebase UID, or existing token to generate a personal API token.',
      code: 'AUTH_REQUIRED',
    });
  }

  try {
    const { token, record } = await tokenService.generatePersonalToken(userId, {
      name: req.body?.name || 'Personal AI Assistant',
      expiresInDays: req.body?.expires_in_days,
    });

    return res.status(201).json({
      success: true,
      message: 'Personal API token generated successfully. Copy it now; it will not be displayed again.',
      data: {
        token, // RETURNED EXACTLY ONCE
        id: record.id,
        user_id: record.user_id,
        token_prefix: record.token_prefix,
        created_at: record.created_at,
        expires_at: record.expires_at,
        rate_limit: record.rate_limit,
        status: 'active',
        warning: 'This token grants authenticated access to your personal fitness records. Keep it private and never share it publicly.',
      },
    });
  } catch (err: any) {
    console.error('Error generating personal token:', err);
    return res.status(500).json({
      success: false,
      error: 'Token Generation Failed',
      message: err.message || 'Could not generate personal API token',
    });
  }
});

/**
 * GET /api/v1/tokens/current
 * Returns metadata of the user's current token (does not expose plaintext token or hash).
 */
personalApiRouter.get('/tokens/current', async (req: Request, res: Response) => {
  const userId = resolveTokenManagementUser(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication Required',
      code: 'AUTH_REQUIRED',
    });
  }

  try {
    const metadata = await tokenService.getUserTokenMetadata(userId);

    if (!metadata) {
      return res.json({
        success: true,
        data: null,
        message: 'No personal API token generated yet for this profile.',
      });
    }

    return res.json({
      success: true,
      data: metadata,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/v1/tokens/revoke
 * Revokes the user's active personal token.
 */
personalApiRouter.post('/tokens/revoke', async (req: Request, res: Response) => {
  const userId = resolveTokenManagementUser(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication Required',
      code: 'AUTH_REQUIRED',
    });
  }

  try {
    const revoked = await tokenService.revokeUserTokens(userId);
    return res.json({
      success: true,
      message: revoked
        ? 'Personal API token has been successfully revoked.'
        : 'No active token was found to revoke.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/v1/tokens/regenerate
 * Revokes old token and generates a new one.
 */
personalApiRouter.post('/tokens/regenerate', async (req: Request, res: Response) => {
  const userId = resolveTokenManagementUser(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication Required',
      code: 'AUTH_REQUIRED',
    });
  }

  try {
    const { token, record } = await tokenService.generatePersonalToken(userId, {
      name: req.body?.name || 'Personal AI Assistant (Regenerated)',
      expiresInDays: req.body?.expires_in_days,
    });

    return res.status(200).json({
      success: true,
      message: 'Personal API token successfully regenerated. The previous token is now permanently revoked.',
      data: {
        token, // RETURNED EXACTLY ONCE
        id: record.id,
        user_id: record.user_id,
        token_prefix: record.token_prefix,
        created_at: record.created_at,
        expires_at: record.expires_at,
        rate_limit: record.rate_limit,
        status: 'active',
        warning: 'This token grants authenticated access to your personal fitness records. Keep it private.',
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ============================================================================
// AUTHENTICATED REST API ENDPOINTS
// Rate-limited and strictly scoped to authenticated user derived from token
// ============================================================================

// Apply rate limiting middleware to all subsequent endpoints
personalApiRouter.use(rateLimitMiddleware);

/**
 * GET /api/v1/me
 * Returns authenticated account information and token metadata.
 */
personalApiRouter.get('/me', async (req: Request, res: Response) => {
  // STRICT USER ISOLATION: Derive userId SOLELY from verified token
  const userId = req.userContext?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' });
  }

  try {
    const tokenMetadata = await tokenService.getUserTokenMetadata(userId);

    return res.json({
      success: true,
      data: {
        user_id: userId,
        role: 'athlete',
        authenticated_via: 'personal_api_token',
        token_details: tokenMetadata
          ? {
              token_id: tokenMetadata.id,
              token_prefix: tokenMetadata.token_prefix,
              created_at: tokenMetadata.created_at,
              last_used_at: tokenMetadata.last_used_at,
              expires_at: tokenMetadata.expires_at,
              status: tokenMetadata.status,
            }
          : null,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/dashboard
 * Returns complete compact daily fitness summary:
 * - Today's calories, protein, carbs, fats
 * - Water intake and target
 * - Workout completion
 * - Habit completion
 * - Latest body weight
 * - Active goals
 */
personalApiRouter.get('/dashboard', async (req: Request, res: Response) => {
  const userId = req.userContext?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' });
  }

  const targetDate = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
    ? req.query.date
    : getLocalDateStr();

  try {
    const [
      habits,
      completions,
      workoutPlans,
      workoutLogs,
      nutritionGoal,
      meals,
      progressLogs,
      goals,
      waterEntries,
      waterGoal,
    ] = await Promise.all([
      firestoreClient.getHabits(userId),
      firestoreClient.getHabitCompletions(userId, undefined, addDays(targetDate, -30), targetDate, 200),
      firestoreClient.getWorkoutPlans(userId),
      firestoreClient.getWorkoutLogs(userId, 10),
      firestoreClient.getNutritionGoal(userId),
      firestoreClient.getMealEntries(userId, targetDate),
      firestoreClient.getProgressEntries(userId, 5),
      firestoreClient.getGoals(userId, 'active'),
      firestoreClient.getWaterEntries(userId, targetDate),
      firestoreClient.getWaterGoal(userId),
    ]);

    // 1. Habits
    const activeHabits = habits.filter((h) => !h.archived);
    const completedToday = activeHabits.filter((h) =>
      completions.some((c) => c.habit_id === h.id && c.date === targetDate && c.completed)
    );
    const habitCompletionPct = activeHabits.length > 0
      ? Math.round((completedToday.length / activeHabits.length) * 100)
      : null;

    // Current streak
    const dateSet = new Set<string>();
    completions.filter((c) => c.completed).forEach((c) => dateSet.add(c.date));
    let currentStreak = 0;
    let checkDate = targetDate;
    while (dateSet.has(checkDate)) {
      currentStreak++;
      checkDate = addDays(checkDate, -1);
    }

    // 2. Nutrition
    const hasMealRecords = meals.length > 0;
    const nutritionConsumed = meals.reduce(
      (acc, m) => {
        acc.calories += m.calories || 0;
        acc.protein += m.protein || 0;
        acc.carbs += m.carbs || 0;
        acc.fats += m.fats || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    // 3. Hydration
    const hasWaterRecords = waterEntries.length > 0;
    const waterConsumedMl = waterEntries.reduce((sum, w) => sum + (w.amount_ml || 0), 0);
    const dailyWaterTargetMl = waterGoal?.daily_target_ml || 2500;
    const waterRemainingMl = Math.max(0, dailyWaterTargetMl - waterConsumedMl);
    const waterProgressPct = Math.min(100, Math.round((waterConsumedMl / dailyWaterTargetMl) * 100));

    // 4. Workout
    const dayOfWeek = new Date().getDay() === 0 ? 7 : new Date().getDay(); // 1=Mon ... 7=Sun
    const scheduledPlan =
      workoutPlans.find((p) => p.day_of_week === dayOfWeek || p.day_of_week === dayOfWeek - 1) || null;
    const todaysWorkoutLogs = workoutLogs.filter((l) => l.date === targetDate);
    const isWorkoutCompleted = todaysWorkoutLogs.length > 0;
    const totalWorkoutVolumeKg = todaysWorkoutLogs.reduce((sum, log) => {
      return (
        sum +
        log.exercise_logs.reduce((exSum, ex) => {
          return exSum + ex.sets.reduce((sSum, s) => sSum + (s.completed ? s.weight * s.reps : 0), 0);
        }, 0)
      );
    }, 0);

    // 5. Weight & Measurements
    const latestProgress = progressLogs.length > 0 ? progressLogs[0] : null;

    return res.json({
      success: true,
      data: {
        date: targetDate,
        nutrition: {
          has_records: hasMealRecords,
          status: hasMealRecords ? 'logged' : 'unlogged',
          consumed: hasMealRecords ? nutritionConsumed : null,
          target: nutritionGoal
            ? {
                calories: nutritionGoal.calories,
                protein_g: nutritionGoal.protein,
                carbs_g: nutritionGoal.carbs,
                fats_g: nutritionGoal.fats,
              }
            : null,
          remaining_calories:
            hasMealRecords && nutritionGoal
              ? Math.max(0, nutritionGoal.calories - nutritionConsumed.calories)
              : null,
          meals_count: meals.length,
        },
        hydration: {
          has_records: hasWaterRecords,
          status: hasWaterRecords ? 'logged' : 'unlogged',
          water_consumed_ml: hasWaterRecords ? waterConsumedMl : null,
          daily_target_ml: dailyWaterTargetMl,
          remaining_ml: hasWaterRecords ? waterRemainingMl : dailyWaterTargetMl,
          progress_percentage: hasWaterRecords ? waterProgressPct : 0,
          entries_count: waterEntries.length,
        },
        workouts: {
          completed_today: isWorkoutCompleted,
          scheduled_today: scheduledPlan ? scheduledPlan.workout_name : 'Rest Day',
          sessions_logged_today: todaysWorkoutLogs.length,
          total_volume_kg: isWorkoutCompleted ? totalWorkoutVolumeKg : null,
          latest_session_duration_minutes:
            todaysWorkoutLogs.length > 0 ? todaysWorkoutLogs[0].duration_minutes : null,
        },
        habits: {
          has_records: activeHabits.length > 0,
          total_active_habits: activeHabits.length,
          completed_today_count: completedToday.length,
          pending_today_count: activeHabits.length - completedToday.length,
          completion_percentage: habitCompletionPct,
          current_streak_days: currentStreak,
        },
        body_weight: {
          has_records: !!latestProgress?.weight,
          latest_weight_kg: latestProgress?.weight || null,
          latest_body_fat_pct: latestProgress?.body_fat || null,
          recorded_date: latestProgress?.date || null,
        },
        active_goals: goals.map((g) => ({
          id: g.id,
          title: g.title,
          category: g.category,
          current_value: g.current_value,
          target_value: g.target_value,
          unit: g.unit,
          progress_percentage: Math.min(100, Math.round((g.current_value / (g.target_value || 1)) * 100)),
        })),
      },
    });
  } catch (err: any) {
    console.error('Error fetching dashboard summary:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/water/today
 * Returns today's water intake and hydration status.
 */
personalApiRouter.get('/water/today', async (req: Request, res: Response) => {
  const userId = req.userContext?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' });
  }

  const targetDate = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
    ? req.query.date
    : getLocalDateStr();

  try {
    const [entries, goal] = await Promise.all([
      firestoreClient.getWaterEntries(userId, targetDate),
      firestoreClient.getWaterGoal(userId),
    ]);

    const dailyTargetMl = goal?.daily_target_ml || 2500;
    const hasRecords = entries.length > 0;
    const totalConsumedMl = entries.reduce((acc, e) => acc + (e.amount_ml || 0), 0);
    const remainingMl = Math.max(0, dailyTargetMl - totalConsumedMl);
    const progressPercentage = Math.min(100, Math.round((totalConsumedMl / dailyTargetMl) * 100));

    return res.json({
      success: true,
      data: {
        date: targetDate,
        has_records: hasRecords,
        status: hasRecords ? 'logged' : 'unlogged',
        water_intake_ml: hasRecords ? totalConsumedMl : null,
        daily_target_ml: dailyTargetMl,
        remaining_ml: hasRecords ? remainingMl : dailyTargetMl,
        progress_percentage: hasRecords ? progressPercentage : 0,
        entries: entries.map((e) => ({
          id: e.id,
          amount_ml: e.amount_ml,
          time: e.time || null,
          date: e.date,
          created_at: e.created_at,
        })),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/water/history?days=7
 * Returns historical water logs over N days.
 */
personalApiRouter.get('/water/history', async (req: Request, res: Response) => {
  const userId = req.userContext?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' });
  }

  const days = Math.min(90, Math.max(1, parseInt((req.query.days as string) || '7', 10)));
  const today = getLocalDateStr();
  const startDate = addDays(today, -days + 1);

  try {
    const [entries, goal] = await Promise.all([
      firestoreClient.getWaterEntries(userId, undefined, startDate, today, 200),
      firestoreClient.getWaterGoal(userId),
    ]);

    const dailyTargetMl = goal?.daily_target_ml || 2500;

    // Group by date
    const dailyMap = new Map<string, number>();
    for (const e of entries) {
      dailyMap.set(e.date, (dailyMap.get(e.date) || 0) + (e.amount_ml || 0));
    }

    const dailyHistory: Array<{
      date: string;
      water_consumed_ml: number | null;
      has_records: boolean;
      progress_percentage: number;
    }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = addDays(today, -i);
      const consumed = dailyMap.get(d);
      const hasData = consumed !== undefined;
      dailyHistory.push({
        date: d,
        has_records: hasData,
        water_consumed_ml: hasData ? consumed : null,
        progress_percentage: hasData ? Math.min(100, Math.round((consumed / dailyTargetMl) * 100)) : 0,
      });
    }

    return res.json({
      success: true,
      data: {
        lookback_days: days,
        start_date: startDate,
        end_date: today,
        daily_target_ml: dailyTargetMl,
        total_entries_count: entries.length,
        daily_history: dailyHistory,
        individual_entries: entries,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/nutrition/today
 * Returns today's logged meals and macro breakdown.
 */
personalApiRouter.get('/nutrition/today', async (req: Request, res: Response) => {
  const userId = req.userContext?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' });
  }

  const targetDate = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
    ? req.query.date
    : getLocalDateStr();

  try {
    const [meals, goal] = await Promise.all([
      firestoreClient.getMealEntries(userId, targetDate),
      firestoreClient.getNutritionGoal(userId),
    ]);

    const hasRecords = meals.length > 0;

    const totals = meals.reduce(
      (acc, m) => {
        acc.calories += m.calories || 0;
        acc.protein += m.protein || 0;
        acc.carbs += m.carbs || 0;
        acc.fats += m.fats || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    return res.json({
      success: true,
      data: {
        date: targetDate,
        has_records: hasRecords,
        status: hasRecords ? 'logged' : 'unlogged',
        consumed: hasRecords ? totals : null,
        target: goal
          ? {
              calories: goal.calories,
              protein_g: goal.protein,
              carbs_g: goal.carbs,
              fats_g: goal.fats,
            }
          : null,
        remaining:
          hasRecords && goal
            ? {
                calories: Math.max(0, goal.calories - totals.calories),
                protein_g: Math.max(0, goal.protein - totals.protein),
                carbs_g: Math.max(0, goal.carbs - totals.carbs),
                fats_g: Math.max(0, goal.fats - totals.fats),
              }
            : null,
        meals: meals.map((m) => ({
          id: m.id,
          food_name: m.food_name,
          meal_type: m.meal_type,
          calories: m.calories,
          protein_g: m.protein,
          carbs_g: m.carbs,
          fats_g: m.fats,
          amount: m.amount || null,
          unit: m.unit || null,
          timestamp: m.time || m.created_at || null,
          food_items: m.food_items || [],
        })),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/nutrition/history?days=7
 * Returns historical nutrition intake over N days.
 */
personalApiRouter.get('/nutrition/history', async (req: Request, res: Response) => {
  const userId = req.userContext?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' });
  }

  const days = Math.min(90, Math.max(1, parseInt((req.query.days as string) || '7', 10)));
  const today = getLocalDateStr();
  const startDate = addDays(today, -days + 1);

  try {
    const [meals, goal] = await Promise.all([
      firestoreClient.getMealEntries(userId, undefined, startDate, today, 300),
      firestoreClient.getNutritionGoal(userId),
    ]);

    // Group meals by date
    const dailyMap = new Map<string, { calories: number; protein: number; carbs: number; fats: number; count: number }>();
    for (const m of meals) {
      const existing = dailyMap.get(m.date) || { calories: 0, protein: 0, carbs: 0, fats: 0, count: 0 };
      existing.calories += m.calories || 0;
      existing.protein += m.protein || 0;
      existing.carbs += m.carbs || 0;
      existing.fats += m.fats || 0;
      existing.count++;
      dailyMap.set(m.date, existing);
    }

    const history = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = addDays(today, -i);
      const data = dailyMap.get(d);
      history.push({
        date: d,
        has_records: !!data,
        consumed: data ? {
          calories: data.calories,
          protein_g: data.protein,
          carbs_g: data.carbs,
          fats_g: data.fats,
          meals_count: data.count,
        } : null,
      });
    }

    return res.json({
      success: true,
      data: {
        lookback_days: days,
        start_date: startDate,
        end_date: today,
        target: goal
          ? {
              calories: goal.calories,
              protein_g: goal.protein,
              carbs_g: goal.carbs,
              fats_g: goal.fats,
            }
          : null,
        daily_history: history,
        total_meals_logged: meals.length,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/workouts?days=7
 * Returns logged workout sessions over lookback period.
 */
personalApiRouter.get('/workouts', async (req: Request, res: Response) => {
  const userId = req.userContext?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' });
  }

  const days = Math.min(90, Math.max(1, parseInt((req.query.days as string) || '7', 10)));
  const today = getLocalDateStr();
  const startDate = addDays(today, -days + 1);

  try {
    const [logs, plans] = await Promise.all([
      firestoreClient.getWorkoutLogs(userId, 50, startDate, today),
      firestoreClient.getWorkoutPlans(userId),
    ]);

    const dayOfWeek = new Date().getDay() === 0 ? 7 : new Date().getDay();
    const scheduledPlan =
      plans.find((p) => p.day_of_week === dayOfWeek || p.day_of_week === dayOfWeek - 1) || null;

    const formattedLogs = logs.map((log) => {
      const totalVolume = log.exercise_logs.reduce((sum, ex) => {
        return (
          sum +
          ex.sets.reduce((sSum, s) => sSum + (s.completed ? s.weight * s.reps : 0), 0)
        );
      }, 0);

      return {
        id: log.id,
        workout_name: log.workout_name,
        date: log.date,
        duration_minutes: log.duration_minutes,
        total_volume_kg: totalVolume,
        exercise_count: log.exercise_logs.length,
        exercises: log.exercise_logs.map((e) => ({
          exercise_name: e.exercise_name,
          target_muscle: e.target_muscle,
          sets: e.sets.map((s) => ({
            set_number: s.set_number,
            weight_kg: s.weight,
            reps: s.reps,
            completed: s.completed,
          })),
        })),
        created_at: log.created_at,
      };
    });

    return res.json({
      success: true,
      data: {
        lookback_days: days,
        start_date: startDate,
        end_date: today,
        has_records: formattedLogs.length > 0,
        status: formattedLogs.length > 0 ? 'logged' : 'no_workouts_logged',
        scheduled_for_today: scheduledPlan
          ? {
              workout_name: scheduledPlan.workout_name,
              muscle_group: scheduledPlan.muscle_group,
              planned_exercises: scheduledPlan.exercises.map((e) => ({
                name: e.name,
                target_muscle: e.target_muscle,
                target_sets: e.target_sets,
                target_reps: e.target_reps,
                target_weight_kg: e.target_weight,
              })),
            }
          : 'Rest Day',
        logged_workouts: formattedLogs,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/habits
 * Returns user habits, streaks, and completion rates.
 */
personalApiRouter.get('/habits', async (req: Request, res: Response) => {
  const userId = req.userContext?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' });
  }

  const today = getLocalDateStr();
  const startDate = addDays(today, -30);

  try {
    const [habits, completions] = await Promise.all([
      firestoreClient.getHabits(userId),
      firestoreClient.getHabitCompletions(userId, undefined, startDate, today, 300),
    ]);

    const activeHabits = habits.filter((h) => !h.archived);
    const hasRecords = activeHabits.length > 0;

    const habitDetails = activeHabits.map((h) => {
      const todayComp = completions.find((c) => c.habit_id === h.id && c.date === today);
      const isCompletedToday = todayComp ? todayComp.completed : false;

      // Calculate streak
      let streak = 0;
      let check = today;
      const compDates = new Set(
        completions.filter((c) => c.habit_id === h.id && c.completed).map((c) => c.date)
      );
      while (compDates.has(check)) {
        streak++;
        check = addDays(check, -1);
      }

      // Calculate completion rates
      const last7Days = completions.filter((c) => c.habit_id === h.id && c.date >= addDays(today, -6));
      const completed7 = last7Days.filter((c) => c.completed).length;
      const rate7 = Math.round((completed7 / 7) * 100);

      const last30Days = completions.filter((c) => c.habit_id === h.id && c.date >= addDays(today, -29));
      const completed30 = last30Days.filter((c) => c.completed).length;
      const rate30 = Math.round((completed30 / 30) * 100);

      return {
        id: h.id,
        name: h.name,
        category: h.category,
        frequency: h.frequency,
        goal_target: h.goal_target,
        unit: h.unit,
        completed_today: isCompletedToday,
        current_streak_days: streak,
        completion_rate_7d_pct: rate7,
        completion_rate_30d_pct: rate30,
      };
    });

    return res.json({
      success: true,
      data: {
        date: today,
        has_records: hasRecords,
        status: hasRecords ? 'configured' : 'no_habits_configured',
        total_active_habits: activeHabits.length,
        completed_today_count: habitDetails.filter((h) => h.completed_today).length,
        habits: habitDetails,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/weight?days=30
 * Returns weight logs, measurements, and progressive delta.
 */
personalApiRouter.get('/weight', async (req: Request, res: Response) => {
  const userId = req.userContext?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' });
  }

  const days = Math.min(365, Math.max(1, parseInt((req.query.days as string) || '30', 10)));
  const today = getLocalDateStr();
  const startDate = addDays(today, -days + 1);

  try {
    const entries = await firestoreClient.getProgressEntries(userId, 50, startDate, today);
    const hasRecords = entries.length > 0;

    const latest = entries[0] || null;
    const oldest = entries[entries.length - 1] || null;
    const weightDelta =
      latest?.weight && oldest?.weight ? parseFloat((latest.weight - oldest.weight).toFixed(2)) : null;

    return res.json({
      success: true,
      data: {
        lookback_days: days,
        has_records: hasRecords,
        status: hasRecords ? 'logged' : 'no_records_found',
        latest_weight_kg: latest?.weight || null,
        latest_measurements: latest
          ? {
              date: latest.date,
              weight_kg: latest.weight || null,
              body_fat_pct: latest.body_fat || null,
              waist_cm: latest.waist || null,
              chest_cm: latest.chest || null,
              arms_cm: latest.arms || null,
            }
          : null,
        weight_change_period_kg: weightDelta,
        history: entries.map((e) => ({
          date: e.date,
          weight_kg: e.weight || null,
          body_fat_pct: e.body_fat || null,
          notes: e.notes || null,
        })),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/goals
 * Returns active fitness goals and progress.
 */
personalApiRouter.get('/goals', async (req: Request, res: Response) => {
  const userId = req.userContext?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' });
  }

  try {
    const goals = await firestoreClient.getGoals(userId);
    const hasRecords = goals.length > 0;

    return res.json({
      success: true,
      data: {
        has_records: hasRecords,
        status: hasRecords ? 'active_goals_found' : 'no_goals_configured',
        total_goals: goals.length,
        goals: goals.map((g) => ({
          id: g.id,
          title: g.title,
          category: g.category,
          target_value: g.target_value,
          current_value: g.current_value,
          unit: g.unit,
          progress_percentage: Math.min(100, Math.round((g.current_value / (g.target_value || 1)) * 100)),
          deadline: g.deadline || null,
          status: g.status,
          start_date: g.start_date,
        })),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
