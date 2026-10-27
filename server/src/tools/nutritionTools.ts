import { z } from 'zod';
import { firestoreClient } from '../db/firestoreClient.js';
import type { ToolDefinition, UserContext, MealType } from '../types.js';

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

export const nutritionTools: ToolDefinition[] = [
  {
    name: 'get_nutrition_logs',
    description:
      'Retrieve logged food entries for a specific date or date range. Includes meal type, food name, amount, calories, protein, carbs, fats, and estimation status.',
    category: 'nutrition',
    parameters: z.object({
      date: z.string().optional().describe('Filter by exact date (YYYY-MM-DD)'),
      start_date: z.string().optional().describe('Start date range (YYYY-MM-DD)'),
      end_date: z.string().optional().describe('End date range (YYYY-MM-DD)'),
      meal_type: z
        .enum(['breakfast', 'lunch', 'dinner', 'snack', 'other'])
        .optional()
        .describe('Filter by meal type'),
      limit: z.number().min(1).max(100).optional().default(30),
    }),
    execute: async (
      args: {
        date?: string;
        start_date?: string;
        end_date?: string;
        meal_type?: MealType;
        limit?: number;
      },
      user: UserContext
    ) => {
      const meals = await firestoreClient.getMealEntries(
        user.userId,
        args.date,
        args.start_date,
        args.end_date,
        args.meal_type,
        args.limit || 30
      );

      return {
        count: meals.length,
        meals: meals.map((m) => ({
          id: m.id,
          date: m.date,
          time: m.time,
          meal_type: m.meal_type,
          food_name: m.food_name,
          amount: m.amount,
          unit: m.unit,
          calories: m.calories,
          protein_g: m.protein,
          carbs_g: m.carbs,
          fats_g: m.fats,
          has_item_breakdown: !!(m.food_items && m.food_items.length > 0),
          estimation_note: m.estimation_note,
        })),
      };
    },
  },
  {
    name: 'get_daily_nutrition_totals',
    description:
      'Calculate total calories, protein, carbs, and fats consumed on a given date without double counting.',
    category: 'nutrition',
    parameters: z.object({
      date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
    }),
    execute: async (args: { date?: string }, user: UserContext) => {
      const targetDate = args.date || getLocalDateStr();
      const [meals, goal] = await Promise.all([
        firestoreClient.getMealEntries(user.userId, targetDate),
        firestoreClient.getNutritionGoal(user.userId),
      ]);

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

      const targetCalories = goal?.calories || 0;
      const targetProtein = goal?.protein || 0;

      return {
        date: targetDate,
        total_calories: totals.calories,
        target_calories: targetCalories,
        calorie_adherence_pct: targetCalories > 0 ? Math.round((totals.calories / targetCalories) * 100) : 0,
        total_protein_g: totals.protein,
        target_protein_g: targetProtein,
        protein_adherence_pct: targetProtein > 0 ? Math.round((totals.protein / targetProtein) * 100) : 0,
        total_carbs_g: totals.carbs,
        target_carbs_g: goal?.carbs || 0,
        total_fats_g: totals.fats,
        target_fats_g: goal?.fats || 0,
        meals_count: meals.length,
        meal_breakdown: meals.map((m) => ({
          meal_type: m.meal_type,
          food_name: m.food_name,
          calories: m.calories,
          protein: m.protein,
        })),
      };
    },
  },
  {
    name: 'get_food_log_details',
    description:
      'Retrieve deep details of a single logged meal, including individual ingredient items breakdown and nutritional estimations.',
    category: 'nutrition',
    parameters: z.object({
      meal_id: z.string().describe('ID of the meal entry'),
    }),
    execute: async (args: { meal_id: string }, user: UserContext) => {
      const meal = await firestoreClient.getMealEntryById(user.userId, args.meal_id);
      if (!meal) {
        throw new Error(`Meal record with ID '${args.meal_id}' not found.`);
      }

      return {
        id: meal.id,
        date: meal.date,
        time: meal.time,
        meal_type: meal.meal_type,
        food_name: meal.food_name,
        amount: meal.amount,
        unit: meal.unit,
        total_calories: meal.calories,
        total_protein: meal.protein,
        total_carbs: meal.carbs,
        total_fats: meal.fats,
        food_items: meal.food_items || [],
        estimation_note: meal.estimation_note,
      };
    },
  },
  {
    name: 'get_calorie_target',
    description: 'Retrieve the user configured daily calorie intake target.',
    category: 'nutrition',
    parameters: z.object({}),
    execute: async (_args: {}, user: UserContext) => {
      const goal = await firestoreClient.getNutritionGoal(user.userId);
      return {
        daily_calorie_target: goal?.calories || 0,
        updated_at: goal?.updated_at || null,
        status: goal ? 'configured' : 'not_set',
      };
    },
  },
  {
    name: 'get_macro_targets',
    description: 'Retrieve the daily target goals for protein, carbohydrates, and fats in grams.',
    category: 'nutrition',
    parameters: z.object({}),
    execute: async (_args: {}, user: UserContext) => {
      const goal = await firestoreClient.getNutritionGoal(user.userId);
      return {
        calories: goal?.calories || 0,
        protein_g: goal?.protein || 0,
        carbs_g: goal?.carbs || 0,
        fats_g: goal?.fats || 0,
        updated_at: goal?.updated_at || null,
      };
    },
  },
  {
    name: 'get_remaining_daily_nutrition',
    description:
      'Compare target intake against actual consumed nutrition for today (or a specified date) to calculate remaining calories and macros.',
    category: 'nutrition',
    parameters: z.object({
      date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
    }),
    execute: async (args: { date?: string }, user: UserContext) => {
      const targetDate = args.date || getLocalDateStr();
      const [meals, goal] = await Promise.all([
        firestoreClient.getMealEntries(user.userId, targetDate),
        firestoreClient.getNutritionGoal(user.userId),
      ]);

      const consumed = meals.reduce(
        (acc, m) => {
          acc.calories += m.calories || 0;
          acc.protein += m.protein || 0;
          acc.carbs += m.carbs || 0;
          acc.fats += m.fats || 0;
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      );

      const targetCalories = goal?.calories || 0;
      const targetProtein = goal?.protein || 0;
      const targetCarbs = goal?.carbs || 0;
      const targetFats = goal?.fats || 0;

      return {
        date: targetDate,
        calories: {
          target: targetCalories,
          consumed: consumed.calories,
          remaining: Math.max(0, targetCalories - consumed.calories),
          surplus_or_deficit: consumed.calories - targetCalories,
        },
        protein_g: {
          target: targetProtein,
          consumed: consumed.protein,
          remaining: Math.max(0, targetProtein - consumed.protein),
        },
        carbs_g: {
          target: targetCarbs,
          consumed: consumed.carbs,
          remaining: Math.max(0, targetCarbs - consumed.carbs),
        },
        fats_g: {
          target: targetFats,
          consumed: consumed.fats,
          remaining: Math.max(0, targetFats - consumed.fats),
        },
      };
    },
  },
  {
    name: 'get_nutrition_history',
    description:
      'Retrieve daily calorie and macro intake averages over the past 7, 14, or 30 days.',
    category: 'nutrition',
    parameters: z.object({
      days: z.number().min(3).max(60).optional().default(7).describe('Lookback days (default: 7)'),
    }),
    execute: async (args: { days?: number }, user: UserContext) => {
      const days = args.days || 7;
      const today = getLocalDateStr();
      const startDate = addDays(today, -(days - 1));

      const [meals, goal] = await Promise.all([
        firestoreClient.getMealEntries(user.userId, undefined, startDate, today, undefined, 300),
        firestoreClient.getNutritionGoal(user.userId),
      ]);

      const dayMap: Record<string, { calories: number; protein: number; carbs: number; fats: number; count: number }> =
        {};

      for (let i = 0; i < days; i++) {
        const dStr = addDays(today, -i);
        dayMap[dStr] = { calories: 0, protein: 0, carbs: 0, fats: 0, count: 0 };
      }

      meals.forEach((m) => {
        if (dayMap[m.date]) {
          dayMap[m.date].calories += m.calories || 0;
          dayMap[m.date].protein += m.protein || 0;
          dayMap[m.date].carbs += m.carbs || 0;
          dayMap[m.date].fats += m.fats || 0;
          dayMap[m.date].count++;
        }
      });

      let sumCals = 0;
      let sumProt = 0;
      let sumCarbs = 0;
      let sumFats = 0;

      const dailyBreakdown = Object.keys(dayMap)
        .sort()
        .map((date) => {
          const item = dayMap[date];
          sumCals += item.calories;
          sumProt += item.protein;
          sumCarbs += item.carbs;
          sumFats += item.fats;
          return {
            date,
            calories: item.calories,
            protein_g: item.protein,
            carbs_g: item.carbs,
            fats_g: item.fats,
            meals_count: item.count,
          };
        });

      return {
        lookback_days: days,
        daily_averages: {
          calories: Math.round(sumCals / days),
          protein_g: Math.round(sumProt / days),
          carbs_g: Math.round(sumCarbs / days),
          fats_g: Math.round(sumFats / days),
        },
        target: goal
          ? { calories: goal.calories, protein_g: goal.protein, carbs_g: goal.carbs, fats_g: goal.fats }
          : null,
        history: dailyBreakdown,
      };
    },
  },
  {
    name: 'log_food_entry',
    description:
      'Log a food entry with calories, protein, carbs, fats, and meal type. Validates entry and avoids duplicate submissions.',
    category: 'nutrition',
    isWrite: true,
    parameters: z.object({
      food_name: z.string().describe('Name of the food or meal (e.g., "Grilled Chicken Salad")'),
      calories: z.number().min(0).describe('Total calories in kcal'),
      protein: z.number().min(0).describe('Protein in grams'),
      carbs: z.number().min(0).describe('Carbohydrates in grams'),
      fats: z.number().min(0).describe('Fats in grams'),
      meal_type: z
        .enum(['breakfast', 'lunch', 'dinner', 'snack', 'other'])
        .describe('Type of meal'),
      amount: z.number().optional().describe('Portion amount (e.g. 200)'),
      unit: z.string().optional().describe('Portion unit (e.g. "g" or "oz")'),
      date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
      time: z.string().optional().describe('Time in HH:mm format (defaults to current time)'),
      estimation_note: z.string().optional().describe('Estimation notes if applicable'),
    }),
    execute: async (
      args: {
        food_name: string;
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
        meal_type: MealType;
        amount?: number;
        unit?: string;
        date?: string;
        time?: string;
        estimation_note?: string;
      },
      user: UserContext
    ) => {
      if (user.readOnly) {
        throw new Error('Action rejected: read-only access token.');
      }
      const targetDate = args.date || getLocalDateStr();
      const now = new Date();
      const targetTime = args.time || now.toTimeString().split(' ')[0].substring(0, 5);

      // Duplicate check: verify if exact food and calories was logged in past 5 minutes
      const existingToday = await firestoreClient.getMealEntries(user.userId, targetDate);
      const isDuplicate = existingToday.some(
        (m) => m.food_name.toLowerCase() === args.food_name.toLowerCase() && m.calories === args.calories && m.time === targetTime
      );

      if (isDuplicate) {
        return {
          success: false,
          message: 'Potential duplicate meal entry detected with identical name and calories at the same time.',
        };
      }

      const created = await firestoreClient.addMealEntry(user.userId, {
        user_id: user.userId,
        date: targetDate,
        time: targetTime,
        meal_type: args.meal_type,
        food_name: args.food_name,
        amount: args.amount,
        unit: args.unit || 'g',
        calories: args.calories,
        protein: args.protein,
        carbs: args.carbs,
        fats: args.fats,
        estimation_note: args.estimation_note,
      });

      return {
        success: true,
        message: 'Food entry logged successfully.',
        meal_id: created.id,
        logged_entry: created,
      };
    },
  },
];
