/**
 * FitTrack AI Personal API Integration Test Suite
 * 
 * Tests real token generation, SHA-256 hashing, Bearer authentication,
 * all REST endpoints, rate limiting, and strict per-user isolation.
 */

process.env.NODE_ENV = 'test';
process.env.API_RATE_LIMIT_PER_MINUTE = '30';

import { tokenService, hashToken, validateTokenFormat } from '../src/auth/tokenService.js';
import { firestoreClient, setCloudFirestoreDisabled } from '../src/db/firestoreClient.js';
import { checkRateLimit, resetRateLimitsForUser } from '../src/auth/rateLimiter.js';
import app from '../src/index.js';

setCloudFirestoreDisabled(true);

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed++;
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    passed++;
  }
}

// Simple internal HTTP client helper using fetch against running server
let serverInstance: any = null;
let baseUrl = '';

async function startTestServer(): Promise<void> {
  return new Promise((resolve) => {
    // Listen on dynamic port
    serverInstance = app.listen(0, '127.0.0.1', () => {
      const addr = serverInstance.address();
      const port = typeof addr === 'object' && addr ? addr.port : 3001;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
}

function stopTestServer(): Promise<void> {
  return new Promise((resolve) => {
    if (serverInstance) {
      serverInstance.close(() => resolve());
    } else {
      resolve();
    }
  });
}

async function apiRequest(path: string, options: { method?: string; token?: string; headers?: Record<string, string>; body?: any } = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const status = res.status;
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response
  }
  return { status, data, headers: res.headers };
}

async function runPersonalApiTests() {
  console.log('🚀 Starting FitTrack AI Personal API Test Suite...\n');
  await startTestServer();

  try {
    const userA_ID = 'test_athlete_alice_' + Date.now();
    const userB_ID = 'test_athlete_bob_' + Date.now();

    // ------------------------------------------------------------------------
    // 1. Personal API Token Generation & CSPRNG Entropy
    // ------------------------------------------------------------------------
    console.log('--- 1. Testing Personal API Token Generation & Hashing ---');
    const genRes = await tokenService.generatePersonalToken(userA_ID, {
      name: "Alice's GPT Coach",
      expiresInDays: 90,
    });

    assert(typeof genRes.token === 'string', 'Plaintext token generated');
    assert(genRes.token.startsWith('ft_live_'), 'Token has ft_live_ prefix');
    assert(genRes.token.length === 72, `Token length is 72 chars (8 prefix + 64 hex), got ${genRes.token.length}`);
    assert(validateTokenFormat(genRes.token), 'Token passes cryptographic format validation');
    assert(genRes.record.user_id === userA_ID, 'Record links to correct Firebase UID');
    assert(!('token_hash' in genRes.record), 'Cryptographic hash is NOT exposed in generation record');

    const expectedHash = hashToken(genRes.token);
    assert(typeof expectedHash === 'string' && expectedHash.length === 64, 'SHA-256 hash successfully computed');

    const aliceToken = genRes.token;

    // ------------------------------------------------------------------------
    // 2. Authenticated Profile: GET /api/v1/me
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Testing Authenticated Profile (/api/v1/me) ---');
    const meRes = await apiRequest('/api/v1/me', { token: aliceToken });
    assert(meRes.status === 200, `Expected 200 OK, got ${meRes.status}`);
    assert(meRes.data.success === true, 'Response success is true');
    assert(meRes.data.data.user_id === userA_ID, `Returns verified user_id: ${userA_ID}`);
    assert(meRes.data.data.token_details.status === 'active', 'Token status is active');

    // ------------------------------------------------------------------------
    // 3. Populate Live Records in Real Database for User A
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Seeding Real User Records in Database for User A ---');
    const today = new Date().toISOString().split('T')[0];

    // Seed water intake for User A (1800 ml)
    await firestoreClient.addWaterEntry(userA_ID, {
      user_id: userA_ID,
      amount_ml: 1000,
      date: today,
      time: '09:00',
    });
    await firestoreClient.addWaterEntry(userA_ID, {
      user_id: userA_ID,
      amount_ml: 800,
      date: today,
      time: '14:30',
    });
    await firestoreClient.saveWaterGoal(userA_ID, 3000);

    // Seed meal for User A
    await firestoreClient.addMealEntry(userA_ID, {
      user_id: userA_ID,
      date: today,
      time: '12:30',
      meal_type: 'lunch',
      food_name: 'Chicken Rice Bowl',
      calories: 650,
      protein: 50,
      carbs: 70,
      fats: 15,
    });

    // Seed habit for User A
    const habitA = await firestoreClient.updateHabit(userA_ID, 'habit_water_01', {
      name: 'Drink 3L Water',
      category: 'health',
      frequency: 'daily',
      goal_target: 3000,
      unit: 'ml',
      icon: 'water_drop',
      color: '#00d2ff',
      start_date: today,
      archived: false,
      created_at: new Date().toISOString(),
    });
    await firestoreClient.saveHabitCompletion(userA_ID, habitA.id, today, true, 3000);

    // Seed weight for User A
    await firestoreClient.addProgressEntry(userA_ID, {
      user_id: userA_ID,
      date: today,
      weight: 78.5,
      body_fat: 15.0,
      waist: 82,
    });

    // Seed goal for User A
    await firestoreClient.updateGoal(userA_ID, 'goal_bench_01', {
      title: 'Bench Press 100kg',
      category: 'workout',
      target_value: 100,
      current_value: 90,
      unit: 'kg',
      start_date: today,
      status: 'active',
      created_at: new Date().toISOString(),
    });

    // ------------------------------------------------------------------------
    // 4. Hydration Endpoint: GET /api/v1/water/today
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Testing Hydration Endpoints ---');
    const waterRes = await apiRequest('/api/v1/water/today', { token: aliceToken });
    assert(waterRes.status === 200, 'Water endpoint returns 200');
    assert(waterRes.data.data.has_records === true, 'Water intake has records');
    assert(waterRes.data.data.water_intake_ml === 1800, `Water intake matches 1800 ml, got ${waterRes.data.data.water_intake_ml}`);
    assert(waterRes.data.data.daily_target_ml === 3000, `Water target matches 3000 ml, got ${waterRes.data.data.daily_target_ml}`);
    assert(waterRes.data.data.remaining_ml === 1200, `Remaining matches 1200 ml, got ${waterRes.data.data.remaining_ml}`);
    assert(waterRes.data.data.progress_percentage === 60, `Progress percentage matches 60%, got ${waterRes.data.data.progress_percentage}%`);
    assert(waterRes.data.data.entries.length === 2, '2 individual water entries returned');

    // History
    const waterHistRes = await apiRequest('/api/v1/water/history?days=7', { token: aliceToken });
    assert(waterHistRes.status === 200, 'Water history returns 200');
    assert(waterHistRes.data.data.daily_history.length === 7, 'Water history returns 7 days');

    // ------------------------------------------------------------------------
    // 5. Nutrition Endpoint: GET /api/v1/nutrition/today
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Testing Nutrition Endpoints ---');
    const nutRes = await apiRequest('/api/v1/nutrition/today', { token: aliceToken });
    assert(nutRes.status === 200, 'Nutrition endpoint returns 200');
    assert(nutRes.data.data.has_records === true, 'Nutrition has records');
    assert(nutRes.data.data.consumed.calories === 650, 'Nutrition consumed calories matches 650');
    assert(nutRes.data.data.consumed.protein === 50, 'Nutrition protein matches 50g');
    assert(nutRes.data.data.meals.length === 1, '1 meal entry returned');
    assert(nutRes.data.data.meals[0].food_name === 'Chicken Rice Bowl', 'Meal food_name matches');

    // ------------------------------------------------------------------------
    // 6. Complete Dashboard: GET /api/v1/dashboard
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Testing Complete Dashboard (/api/v1/dashboard) ---');
    const dashRes = await apiRequest('/api/v1/dashboard', { token: aliceToken });
    assert(dashRes.status === 200, 'Dashboard returns 200');
    assert(dashRes.data.data.hydration.water_consumed_ml === 1800, 'Dashboard reflects live water intake');
    assert(dashRes.data.data.nutrition.consumed.calories === 650, 'Dashboard reflects live calories');
    assert(dashRes.data.data.body_weight.latest_weight_kg === 78.5, 'Dashboard reflects live weight');
    assert(dashRes.data.data.habits.completed_today_count === 1, 'Dashboard reflects 1 completed habit');
    assert(dashRes.data.data.active_goals.length === 1, 'Dashboard reflects 1 active goal');

    // ------------------------------------------------------------------------
    // 7. Habits, Weight & Goals Endpoints
    // ------------------------------------------------------------------------
    console.log('\n--- 7. Testing Habits, Weight & Goals Endpoints ---');
    const habitsRes = await apiRequest('/api/v1/habits', { token: aliceToken });
    assert(habitsRes.status === 200, 'Habits returns 200');
    assert(habitsRes.data.data.habits[0].name === 'Drink 3L Water', 'Habit name accurately retrieved');

    const weightRes = await apiRequest('/api/v1/weight?days=30', { token: aliceToken });
    assert(weightRes.status === 200, 'Weight returns 200');
    assert(weightRes.data.data.latest_weight_kg === 78.5, 'Latest weight is 78.5kg');
    assert(weightRes.data.data.latest_measurements.waist_cm === 82, 'Waist is 82cm');

    const goalsRes = await apiRequest('/api/v1/goals', { token: aliceToken });
    assert(goalsRes.status === 200, 'Goals returns 200');
    assert(goalsRes.data.data.goals[0].title === 'Bench Press 100kg', 'Goal title matches');

    // ------------------------------------------------------------------------
    // 8. Strict Per-User Data Isolation & Anti-Tampering
    // ------------------------------------------------------------------------
    console.log('\n--- 8. Testing Strict Per-User Data Isolation ---');
    // Generate token for User B
    const genResB = await tokenService.generatePersonalToken(userB_ID, {
      name: "Bob's Assistant",
    });
    const bobToken = genResB.token;

    // Bob requests his hydration. User B has NOT logged any water.
    // Must return unlogged/null, NOT Alice's 1800ml!
    const bobWaterRes = await apiRequest('/api/v1/water/today', { token: bobToken });
    assert(bobWaterRes.status === 200, 'Bob hydration returns 200');
    assert(bobWaterRes.data.data.has_records === false, 'Bob has NO water records');
    assert(bobWaterRes.data.data.water_intake_ml === null, 'Bob water_intake_ml is explicitly null');
    assert(bobWaterRes.data.data.status === 'unlogged', 'Bob status is explicitly unlogged');

    // ATTACK ATTEMPT: Bob attempts to pass ?userId=Alice or ?user_id=Alice to steal Alice's records
    const attackRes = await apiRequest(`/api/v1/water/today?userId=${userA_ID}&user_id=${userA_ID}`, { token: bobToken });
    assert(attackRes.status === 200, 'Attack request handled');
    assert(attackRes.data.data.has_records === false, 'Server IGNORED client-supplied userId param');
    assert(attackRes.data.data.water_intake_ml === null, 'Alice data was NOT leaked to Bob');

    // ------------------------------------------------------------------------
    // 9. Invalid, Revoked, and Expired Token Rejection
    // ------------------------------------------------------------------------
    console.log('\n--- 9. Testing Token Rejection (Invalid, Expired, Revoked) ---');
    // Invalid token
    const fakeToken = 'ft_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const invalidRes = await apiRequest('/api/v1/me', { token: fakeToken });
    assert(invalidRes.status === 401, `Invalid token rejected with 401, got ${invalidRes.status}`);
    assert(invalidRes.data.code === 'TOKEN_NOT_FOUND', 'Correct error code TOKEN_NOT_FOUND');

    // Malformed token
    const malformedRes = await apiRequest('/api/v1/me', { token: 'bad_token_format' });
    assert(malformedRes.status === 401, 'Malformed token rejected with 401');

    // Revoked token
    await tokenService.revokeUserTokens(userA_ID);
    const revokedRes = await apiRequest('/api/v1/me', { token: aliceToken });
    assert(revokedRes.status === 401, `Revoked token rejected with 401, got ${revokedRes.status}`);
    assert(revokedRes.data.code === 'TOKEN_REVOKED', 'Correct error code TOKEN_REVOKED');

    // Expired token test
    const expiredRes = await tokenService.generatePersonalToken('user_expired_test', { expiresInDays: -1 });
    const testExpired = await apiRequest('/api/v1/me', { token: expiredRes.token });
    assert(testExpired.status === 401, `Expired token rejected with 401, got ${testExpired.status}`);
    assert(testExpired.data.code === 'TOKEN_EXPIRED', 'Correct error code TOKEN_EXPIRED');

    // ------------------------------------------------------------------------
    // 10. Rate Limiting: HTTP 429
    // ------------------------------------------------------------------------
    console.log('\n--- 10. Testing Rate Limiting (HTTP 429) ---');
    const rateLimitUser = 'user_rate_test_' + Date.now();
    const rateGen = await tokenService.generatePersonalToken(rateLimitUser);
    const rateToken = rateGen.token;

    // Reset rate limiter for this user
    resetRateLimitsForUser(rateLimitUser);

    // Limit is 30 per minute; 33 requests will trigger 429
    let hit429 = false;
    for (let i = 0; i < 33; i++) {
      const res = await apiRequest('/api/v1/me', { token: rateToken });
      if (res.status === 429) {
        hit429 = true;
        assert(res.data.code === 'RATE_LIMIT_EXCEEDED', 'Returns code RATE_LIMIT_EXCEEDED');
        assert(res.headers.get('retry-after') !== null, 'Includes Retry-After header');
        assert(res.headers.get('x-ratelimit-remaining-minute') === '0', 'X-RateLimit-Remaining-Minute is 0');
        break;
      }
    }
    assert(hit429, 'Rate limiter successfully triggered HTTP 429');

    console.log(`\n=======================================================`);
    console.log(`🎉 ALL PERSONAL API TESTS PASSED! (${passed} passed, ${failed} failed)`);
    console.log(`=======================================================`);
  } finally {
    await stopTestServer();
  }
}

runPersonalApiTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
