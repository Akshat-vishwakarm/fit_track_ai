/**
 * FitTrack AI MCP Server — Integration Test Suite
 * Validates authentication, user isolation, tool execution, and write operations.
 */

process.env.NODE_ENV = 'test';

import { executeTool, allTools } from '../src/tools/registry.js';
import { resolveUserFromToken } from '../src/auth/authMiddleware.js';
import type { UserContext } from '../src/types.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failedTests++;
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  }
}

async function runTests() {
  console.log('🧪 Starting FitTrack AI MCP Integration Test Suite...\n');

  // Test 1: Tool Registry Count
  console.log('--- Test 1: Tool Registry Inspection ---');
  assert(allTools.length >= 35, `Expected at least 35 tools, found ${allTools.length}`);
  const expectedTools = [
    'get_dashboard_summary',
    'get_all_tasks',
    'get_completed_tasks',
    'get_incomplete_tasks',
    'get_overdue_tasks',
    'get_habit_streaks',
    'get_habit_completion_rates',
    'get_nutrition_logs',
    'get_daily_nutrition_totals',
    'get_calorie_target',
    'get_macro_targets',
    'get_remaining_daily_nutrition',
    'get_training_split',
    'get_todays_workout',
    'get_workout_history',
    'get_exercise_sets_and_reps',
    'get_training_volume',
    'get_weight_history',
    'get_body_measurements',
    'get_fitness_goals',
    'get_goal_progress',
    'get_progress_trends',
    'get_available_data_categories',
    'get_user_data_schema',
    'search_fitness_records',
    'mark_task_complete',
    'log_food_entry',
    'record_workout',
    'log_weight_entry',
  ];
  for (const toolName of expectedTools) {
    assert(allTools.some((t) => t.name === toolName), `Tool '${toolName}' must be registered`);
  }

  // Test 2: Authentication & User Resolution
  console.log('\n--- Test 2: Authentication & Token Isolation ---');
  const userA = resolveUserFromToken('fittrack_live_athlete_123');
  assert(userA?.userId === 'athlete_123', 'Token fittrack_live_athlete_123 resolves to userId athlete_123');
  assert(userA?.readOnly === false, 'Standard live token has write permission');

  const readOnlyUser = resolveUserFromToken('fittrack_readonly_athlete_456');
  assert(readOnlyUser?.userId === 'athlete_456', 'Token fittrack_readonly_athlete_456 resolves to athlete_456');
  assert(readOnlyUser?.readOnly === true, 'Readonly token has readOnly=true');

  const testUserA: UserContext = { userId: 'test_user_alpha', role: 'user', readOnly: false };
  const testUserB: UserContext = { userId: 'test_user_beta', role: 'user', readOnly: false };

  // Test 3: Data Discovery Tools
  console.log('\n--- Test 3: Data Discovery ---');
  const categories = await executeTool('get_available_data_categories', {}, testUserA);
  assert(categories.categories.length >= 5, 'Discovered 5+ data categories');

  const schema = await executeTool('get_user_data_schema', { category: 'habits' }, testUserA);
  assert(schema.category === 'habits' && schema.schema.fields.name, 'Habit schema retrieved');

  // Test 4: Habit & Task Tools
  console.log('\n--- Test 4: Habit Tracking & Task Execution ---');
  // Mark task complete for User A
  const markRes = await executeTool(
    'mark_task_complete',
    { habit_id: 'habit_gym_01', date: '2026-10-27', completed: true },
    testUserA
  );
  assert(markRes.success === true, 'Habit marked completed successfully');
  assert(markRes.status === 'completed', 'Habit status confirmed completed');

  // Verify completed tasks for User A
  const completedA = await executeTool('get_completed_tasks', { date: '2026-10-27' }, testUserA);
  assert(completedA.date === '2026-10-27', 'Completed tasks queried for date');

  // Test 5: Strict Cross-User Data Isolation
  console.log('\n--- Test 5: Strict Cross-User Data Isolation ---');
  // User B's completed tasks should NOT contain User A's habit
  const completedB = await executeTool('get_completed_tasks', { date: '2026-10-27' }, testUserB);
  assert(completedB.completed_count === 0, 'User B has 0 completed tasks (strict user isolation)');

  // Test 6: Nutrition Tools & Logging
  console.log('\n--- Test 6: Nutrition Logging & Aggregation ---');
  const mealRes = await executeTool(
    'log_food_entry',
    {
      food_name: 'Grilled Salmon with Brown Rice',
      calories: 550,
      protein: 42,
      carbs: 45,
      fats: 18,
      meal_type: 'dinner',
      date: '2026-10-27',
    },
    testUserA
  );
  assert(mealRes.success === true, 'Meal logged successfully');
  assert(mealRes.meal_id.startsWith('ml_'), 'Meal ID generated');

  const totals = await executeTool('get_daily_nutrition_totals', { date: '2026-10-27' }, testUserA);
  assert(totals.total_calories === 550, `Daily total calories matches 550, got ${totals.total_calories}`);
  assert(totals.total_protein_g === 42, `Daily total protein matches 42g, got ${totals.total_protein_g}`);

  // Test 7: Training Split & Workout Logging
  console.log('\n--- Test 7: Workout & Training Split ---');
  const split = await executeTool('get_training_split', {}, testUserA);
  assert(split.weekly_training_split.length === 7, 'Weekly training split covers all 7 days');

  const workoutLogRes = await executeTool(
    'record_workout',
    {
      workout_name: 'Chest & Triceps Hypertrophy',
      duration_minutes: 55,
      date: '2026-10-27',
      exercises: [
        {
          exercise_name: 'Barbell Bench Press',
          target_muscle: 'Chest',
          sets: [
            { set_number: 1, weight: 80, reps: 8, completed: true },
            { set_number: 2, weight: 80, reps: 8, completed: true },
            { set_number: 3, weight: 85, reps: 6, completed: true },
          ],
        },
      ],
    },
    testUserA
  );
  assert(workoutLogRes.success === true, 'Workout recorded successfully');
  assert(workoutLogRes.total_volume_kg === 80 * 8 + 80 * 8 + 85 * 6, 'Volume accurately calculated');

  // Test 8: Body Weight & Progress Trends
  console.log('\n--- Test 8: Progress & Body Measurements ---');
  const weightRes = await executeTool(
    'log_weight_entry',
    { weight: 75.4, date: '2026-10-27', body_fat: 14.5 },
    testUserA
  );
  assert(weightRes.success === true, 'Weight logged successfully');

  const weightHistory = await executeTool('get_weight_history', { limit: 10 }, testUserA);
  assert(weightHistory.latest_weight_kg === 75.4, 'Latest weight accurately retrieved');

  // Test 9: Dashboard Holistic Summary
  console.log('\n--- Test 9: Dashboard Summary Synthesis ---');
  const dash = await executeTool('get_dashboard_summary', { date: '2026-10-27' }, testUserA);
  assert(dash.date === '2026-10-27', 'Dashboard summary returned for date');
  assert(dash.nutrition.consumed_calories === 550, 'Dashboard synthesizes live nutrition data');
  assert(dash.body_progress.latest_weight_kg === 75.4, 'Dashboard synthesizes live weight');

  // Test 10: Read-Only Protection
  console.log('\n--- Test 10: Safety & Read-Only Protection ---');
  let rejected = false;
  try {
    await executeTool(
      'mark_task_complete',
      { habit_id: 'h1', date: '2026-10-27', completed: true },
      { userId: 'u1', role: 'user', readOnly: true }
    );
  } catch (err: any) {
    if (err.message.includes('read-only access token')) {
      rejected = true;
    }
  }
  assert(rejected, 'Write operation blocked for read-only user token');

  console.log(`\n=======================================================`);
  console.log(`🎉 ALL TESTS PASSED! (${passedTests} passed, ${failedTests} failed)`);
  console.log(`=======================================================`);
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Fatal test failure:', err);
  process.exit(1);
});
