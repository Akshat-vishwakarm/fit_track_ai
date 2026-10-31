# 🏃 Radioactive — Minimalist Fitness OS  Demo:https://fit-track-ai-lilac.vercel.app/

> **Intelligent Personal Fitness & Telemetry Management** — Track habits, progressive overload, macronutrients, and body metrics with AI precision, an authenticated Personal API Token system, and a Model Context Protocol (MCP) agent bridge.

<p align="center">
  <img src="public/radioactive-logo.jpg" alt="Radioactive Logo" width="120" style="border-radius: 16px; border: 1px solid #E5E5E5; padding: 4px;" />
</p>

<p align="center">
  <a href="https://fit-track-ai-lilac.vercel.app/">
    <strong>🚀 Live Deployment</strong>
  </a>
  &bull;
  <a href="#-personal-api-token-system-rest-api-v1">
    <strong>🔑 Personal API</strong>
  </a>
  &bull;
  <a href="#-chatgpt-mcp-server-protocol-v20">
    <strong>🤖 MCP Agent Server</strong>
  </a>
  &bull;
  <a href="#-quick-start">
    <strong>⚡ Quick Start</strong>
  </a>
</p>

---

## 🎨 Minimalist Monochrome Interface & Glass Design

Designed in alignment with the **Google Stitch Monochrome Minimalist** design system:

* **Monochrome Palette:** Pure Black (`#000000`), Dark Neutral (`#111111`), Secondary Gray (`#777777`), Light Gray (`#E5E5E5`), Off-White (`#F8F8F8`), and White (`#FFFFFF`).
* **Zero Visual Clutter:** No purple/blue neon glows or decorative distractions. Clean 1px solid borders and high-legibility typography (`Inter` & `JetBrains Mono`).
* **Fixed Background Mascot:** The **Radioactive** running mascot image sits anchored in the background across all pages with `mix-blend-multiply` and subtle opacity.
* **Translucent Glass Cards:** Data output panels and input fields feature frosted glass styling (`backdrop-filter: blur(10px)`) so the mascot silhouette shines cleanly through while text remains 100% sharp and readable.

---

## ⚡ Core Feature Suite

### 1. 📊 Centralized Command Dashboard
* **4 Metric KPI Cards:** Daily Habits Completed, Weekly Split Training, Caloric & Macro Budget, and Latest Body Mass.
* **High-Focus Target Countdown:** Non-stop precision timer for discipline protocols and target deadlines with quick-edit modals.
* **Today's Routine Bento:** 7-column habit checklist paired with a 5-column calendar schedule and training overview.

### 2. 🔥 Habit Tracker & Matrix Analytics
* **7-Day Matrix Grid:** Minimalist habit tracking with custom monochrome check, lock, and active status indicators.
* **Month Navigator & Week Filters:** Toggle between `W1`, `W2`, `W3`, `W4`, and `All`.
* **21-Day Consistency Density Chart:** Segmented frequency visualization tracking streak momentum and routine telemetry.

### 3. 🏋️ Gym & Progressive Overload Tracking
* **Weekly Split Schedule (Mon – Sun):** Target muscle groups, planned exercises, and rest day management.
* **Active Day Highlight:** `TODAY` badge with one-click workout logging.
* **Set & Rep Ledger:** Log completed sets, weights (kg/lbs), reps, and training volume.

### 4. 🥗 Nutrition & Macro Intelligence
* **Energy Budget Panel:** Calorie consumed vs target budget with percentage progress indicators.
* **Macro Telemetry:** Target vs actual for Protein, Carbohydrates, and Fats.
* **AI-Assisted Logging:** Gemini-powered natural language meal estimation with manual adjustment fallbacks.
* **Collapsible Ledger:** Date-grouped meals with timestamps and one-click CSV export.

### 5. 📅 Calendar & Daily Journal
* **Interactive Month Calendar:** Day-by-day workout and habit status pills.
* **Daily Reflection Journal:** Add notes for any date (e.g. *"Today weight 85kg, ran 3 km, felt great"*).

### 6. 📈 Body Progress & Goals
* **Weight Trajectory Chart:** Minimalist SVG line chart with hover telemetry and 30-day moving averages.
* **Measurement Tracker:** Log waist, chest, arms, and body fat percentages.
* **Fitness Goals:** Target tracking for habit, workout, nutrition, and weight milestones.

---

## 🔑 Personal API Token System (REST API v1)

Every registered user can generate their own cryptographically secure Personal API Token to connect FitTrack data to external AI agents (like ChatGPT, Claude, or custom automation scripts).

### Security Architecture:
* **Cryptographic Generation:** 256-bit entropy random tokens with `ft_live_` prefix.
* **Zero Plaintext Storage:** Stored strictly as **SHA-256 hashes**; the full token is revealed **only once** upon generation.
* **Token-Derived Identity:** The backend derives the user's Firebase UID directly from the verified token—never accepting client-supplied user parameters.
* **Lifecycle Controls:** Instant token revocation, regeneration, and configurable expiration.
* **Rate Limiting:** Built-in sliding-window rate limiter protecting endpoints against abuse (HTTP 429).

### REST API Endpoints (`/api/v1`):
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/me` | Authenticated account details & token metadata |
| `GET` | `/api/v1/dashboard` | Complete daily summary (calories, macros, hydration, workout status, streaks) |
| `GET` | `/api/v1/water/today` | Today's water consumed, target, and remaining ml |
| `GET` | `/api/v1/water/history?days=7` | Multi-day hydration logs & completion rates |
| `GET` | `/api/v1/nutrition/today` | Today's calories, protein, carbs, fats, and meal list |
| `GET` | `/api/v1/nutrition/history?days=7` | Historical meal logs with timestamps and portion metrics |
| `GET` | `/api/v1/workouts?days=7` | Logged workout sessions, sets, reps, and weights |
| `GET` | `/api/v1/habits` | Active habits, daily targets, streaks, and completion status |
| `GET` | `/api/v1/weight?days=30` | Weight history entries and body measurements |
| `GET` | `/api/v1/goals` | Active fitness goals and percentage progress |

#### Example Call:
```bash
curl -H "Authorization: Bearer ft_live_YOUR_TOKEN" \
  http://localhost:3005/api/v1/dashboard
```

---

## 🤖 ChatGPT MCP Server (Protocol v2.0)

A live **Model Context Protocol (MCP)** server enabling ChatGPT and AI clients to query and update fitness data in real time.

* **SSE Endpoint:** `http://localhost:3005/sse`
* **OpenAPI 3.0 Specification:** `http://localhost:3005/openapi.json`
* **41 Registered Tools Active:**
  * Queries: `get_dashboard_summary`, `get_todays_workout`, `get_daily_nutrition_totals`, `get_habit_streaks`, `get_weight_history`, etc.
  * Actions: `mark_task_complete`, `log_food_entry`, `record_workout`, `log_weight_entry`.

### Connect ChatGPT in 3 Steps:
1. In ChatGPT &rarr; Create a GPT &rarr; Actions &rarr; Click **Import from URL**.
2. Paste the OpenAPI spec: `http://localhost:3005/openapi.json` (or your deployed Render URL).
3. Set Authentication to **Bearer Auth** and paste your Personal API Token.

---

## 🛠️ Tech Stack

* **Frontend:** React 19, TypeScript, Tailwind CSS v4, Vite, Canvas-Confetti, Material Symbols.
* **Database & Storage:** Dexie.js (IndexedDB local-first persistence), Firebase Firestore (cloud sync).
* **Authentication:** Firebase Authentication (Google OAuth + Guest Sandbox).
* **Backend:** Node.js, Express 5, `@modelcontextprotocol/sdk`, `dotenv`, `cors`, `zod`.
* **Testing:** Custom zero-dependency test runners executing 110 automated integration tests.

---

## ⚡ Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/Akshat-vishwakarm/fit_track_ai.git
cd fit_track_ai
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3005
HOST=0.0.0.0
BASE_URL=http://localhost:3005
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Development Servers
Start both the backend server and frontend application:

```bash
# Terminal 1: Backend MCP & REST Server (Port 3005)
npm run server:dev

# Terminal 2: Frontend Application (Port 5173)
npm run dev
```

* Open frontend: **[http://localhost:5173](http://localhost:5173)**
* Access backend: **[http://localhost:3005](http://localhost:3005)**

### 4. Run Test Suites
```bash
# Run Personal API Token security & endpoint tests (57 tests)
npm run test:api

# Run MCP server tools & agent integration tests (53 tests)
npm run test:mcp

# Run production build check
npm run build
```

---

## 📄 License

MIT License &copy; 2026 Akshat Vishwakarma. Built for athletic discipline and AI-assisted fitness intelligence.
