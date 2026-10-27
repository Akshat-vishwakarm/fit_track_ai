# 🤖 FitTrack AI — Model Context Protocol (MCP) Server

Connect your live **FitTrack AI** fitness platform directly to **ChatGPT**, **Claude**, or any MCP-enabled AI client.

ChatGPT has real-time, authenticated access to your:
- ✅ Daily tasks, completed habits, missed habits, and streaks
- 🥗 Nutrition intake, calories, macros (protein, carbs, fats), and logged meal details
- 🏋️ Weekly gym training split (Monday–Sunday), target sets/reps/weights, and logged workout history
- ⚖️ Body weight logs, body measurements, and progressive overload trends
- 🎯 Fitness goals and progress metrics
- ✍️ Controlled write operations (mark habits complete, log meals, record workouts, update goals)

---

## 🚀 Quick Start

### 1. Run the MCP Server Locally
```bash
# Run server directly with TypeScript
npm run server

# Or run with auto-reload during development
npm run server:dev
```
The server will start on `http://localhost:3001`:
- **Health Check:** `http://localhost:3001/health`
- **Remote MCP SSE Endpoint:** `http://localhost:3001/sse`
- **OpenAPI 3.0 Spec:** `http://localhost:3001/openapi.json`
- **REST API:** `http://localhost:3001/api/v1/tools`

### 2. Run Test Suite
```bash
npm run test:mcp
```
Verifies all 41 tools, token authentication, user isolation, and read/write security.

---

## 🔗 Connecting to ChatGPT

You can connect ChatGPT to FitTrack AI using either of two methods:

### Method A: ChatGPT Custom GPT Action (Web & Mobile)
1. Go to [ChatGPT](https://chatgpt.com) &rarr; **Explore GPTs** &rarr; **Create a GPT**.
2. Name your GPT: `FitTrack AI Coach`.
3. In the **Instructions** box, paste:
   ```text
   You are my personal AI Fitness Coach and Sports Scientist integrated directly with my live FitTrack AI app.
   Always call the appropriate FitTrack tools to retrieve real-time live data before answering.
   Never invent or hallucinate missing data.
   Compare my actual nutrition against my targets, evaluate my training consistency, track my habit streaks, and recommend practical next steps.
   ```
4. Scroll down to **Actions** &rarr; click **Create new action**.
5. In **Import from URL**, enter your server's OpenAPI URL:
   ```text
   https://your-fittrack-mcp.onrender.com/openapi.json
   ```
   *(or `http://localhost:3001/openapi.json` via ngrok/localtunnel for local testing)*
6. Set **Authentication** to **API Key / Bearer**:
   - Auth Type: `Bearer`
   - Token: `fittrack_live_<YOUR_FIREBASE_USER_ID>`
7. Click **Save** &rarr; your GPT is now connected directly to your live application!

---

### Method B: Remote MCP via Server-Sent Events (ChatGPT Desktop / Claude)
Add the server to your MCP client configuration (`claude_desktop_config.json` or ChatGPT MCP settings):

```json
{
  "mcpServers": {
    "fittrack-ai": {
      "url": "https://your-fittrack-mcp.onrender.com/sse?token=fittrack_live_<YOUR_FIREBASE_USER_ID>"
    }
  }
}
```

---

## 🛠️ Complete Tool Registry (41 Live Tools)

### 📊 Dashboard & Overview
| Tool Name | Description |
| :--- | :--- |
| `get_dashboard_summary` | Overview of today's habits, scheduled workout, calories vs target, weight, and goals. |
| `get_daily_activity_summary` | Full breakdown for any date: completed vs missed habits, meals, workout, and weight. |
| `get_weekly_fitness_summary` | 7-day adherence: habit consistency %, workout volume kg, daily avg macros, weight delta. |
| `get_monthly_progress_summary` | 30-day macro trend of habits, lifting volume, nutrition averages, and weight curve. |

### 🔥 Tasks & Habits
| Tool Name | Description |
| :--- | :--- |
| `get_all_tasks` | List all configured daily habits/tasks with category, target, and frequency. |
| `get_completed_tasks` | List habits completed today (or on a specific date). |
| `get_incomplete_tasks` | List pending / incomplete habits for today. |
| `get_overdue_tasks` | Identify missed habits across previous days in a lookback window. |
| `get_habit_history` | Historical completion records for a specific habit or all habits. |
| `get_habit_streaks` | Current and best consecutive daily streaks for each habit. |
| `get_habit_completion_rates` | Completion percentages over 7-day, 14-day, and 30-day periods. |
| `mark_task_complete` *(Write)* | Mark a habit/task complete or incomplete for today or a specific date. |
| `update_task_status` *(Write)* | Update habit name, daily target, or archive status. |

### 🥗 Nutrition & Macros
| Tool Name | Description |
| :--- | :--- |
| `get_nutrition_logs` | Logged food entries for a date range with calories, protein, carbs, fats. |
| `get_daily_nutrition_totals` | Total calories and macros consumed on a date without double counting. |
| `get_food_log_details` | Itemized ingredient details and estimations for a specific meal. |
| `get_calorie_target` | User configured daily calorie intake goal. |
| `get_macro_targets` | Target grams for protein, carbohydrates, and fats. |
| `get_remaining_daily_nutrition` | Target minus consumed (calories remaining, protein needed). |
| `get_nutrition_history` | Historical daily calorie and macro intake averages over 7, 14, or 30 days. |
| `log_food_entry` *(Write)* | Log a new food/meal with calories, protein, carbs, fats, and meal type. |

### 🏋️ Training & Workouts
| Tool Name | Description |
| :--- | :--- |
| `get_training_split` | Full weekly training split (Monday–Sunday) with exercises, sets, reps, weights. |
| `get_todays_workout` | Scheduled workout for today's day of week with target sets, reps, and weights. |
| `get_exercises_for_workout` | Exercises for a specific workout plan or day of week. |
| `get_workout_history` | Past logged workout sessions with sets, weights, reps, and volume. |
| `get_exercise_sets_and_reps` | Historical progressive overload tracking for a specific exercise. |
| `get_workout_completion_status`| Whether today's scheduled workout was completed. |
| `get_training_volume` | Total lifting volume (kg) aggregated with muscle group breakdown. |
| `get_cardio_and_activity_logs` | Workout durations and activity frequencies. |
| `record_workout` *(Write)* | Record a completed workout session with exercises, sets, reps, weights. |

### ⚖️ Body Progress & Goals
| Tool Name | Description |
| :--- | :--- |
| `get_weight_history` | Chronological body weight logs with dates and delta calculations. |
| `get_body_measurements` | Body fat %, waist, chest, and arms measurements. |
| `get_progress_photos_metadata` | Notes and metadata from check-ins. |
| `get_fitness_goals` | Fitness goals with targets, current values, units, and deadlines. |
| `get_goal_progress` | Progress % and remaining delta to hit goal. |
| `get_progress_trends` | Holistic correlation between weight, workout volume, and calorie adherence. |
| `update_goal` *(Write)* | Update progress value or status on an existing goal. |
| `log_weight_entry` *(Write)* | Log body weight and measurements for today. |

### 🔍 Discovery & Dynamic Schema
| Tool Name | Description |
| :--- | :--- |
| `get_available_data_categories` | Dynamic catalog of all available data domains and record counts. |
| `get_user_data_schema` | Field definitions, types, and descriptions for all database entities. |
| `search_fitness_records` | Search habits, exercises, meals, and goals matching any keyword. |

---

## 🔒 Security & User Isolation

- **Token Scoping:** Every incoming request must provide an Authorization token:
  - Header: `Authorization: Bearer fittrack_live_<userId>`
  - Header: `x-api-key: fittrack_live_<userId>`
  - Query: `?token=fittrack_live_<userId>`
- **Strict Data Isolation:** All queries and writes are scoped strictly to `/users/{userId}/*`. A user can never read or write another user's records.
- **Read-Only Mode:** Tokens starting with `fittrack_readonly_<userId>` are strictly forbidden from performing write operations (`mark_task_complete`, `log_food_entry`, `record_workout`, etc.).
- **No Secret Exposure:** Database service account keys and API secrets remain strictly server-side and are never exposed to the frontend.

---

## 🌐 Deploy to Render

1. Create a free account on [Render.com](https://render.com).
2. Click **New +** &rarr; **Blueprint**.
3. Connect your GitHub repository (`Akshat-vishwakarm/fit_track_ai`).
4. Render will automatically read [`render.yaml`](../render.yaml) and deploy the MCP service.
5. Once deployed, copy your Render URL (e.g. `https://fittrack-ai-mcp.onrender.com`).
6. Connect ChatGPT using `https://fittrack-ai-mcp.onrender.com/openapi.json`!
