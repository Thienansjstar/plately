<div align="center">

# 🥗 Plately

### Plan it. Track it. Thrive.

A full-stack, AI-powered meal-planning and nutrition-tracking **PWA** — log your food by **photo, barcode, or voice**, plan your week, auto-build a grocery list, and watch your progress. Installable on any phone, works offline, and syncs to the cloud.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3FCF8E?logo=supabase&logoColor=white)
![Claude](https://img.shields.io/badge/Claude-Vision%20%2B%20NLP-D97757?logo=anthropic&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable%20%2F%20offline-5A0FC8?logo=pwa&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages%20%2B%20Functions-F38020?logo=cloudflare&logoColor=white)

<!-- TODO: add your deployed URL -->
**[Live demo →](#)**  ·  **[Architecture](#-architecture--engineering-decisions)**  ·  **[Tech stack](#-tech-stack)**

</div>

<!-- TODO: drop 3–4 screenshots/GIFs in assets/ and reference them here.
<p align="center">
  <img src="assets/screen-today.png"   width="24%" />
  <img src="assets/screen-scan.png"    width="24%" />
  <img src="assets/screen-plan.png"    width="24%" />
  <img src="assets/screen-progress.png" width="24%" />
</p>
-->

---

## Overview

Plately is a mobile-first nutrition app built as a single-page React PWA with a serverless backend. The goal was to make food logging *fast* — instead of hunting through a database for everything you eat, you can snap a photo of your plate, scan a barcode, or just say what you ate, and the app fills in the macros for you using a mix of AI estimation and authoritative nutrition databases.

It's a personal/portfolio project that exercises a full product surface: authentication, cloud sync, offline support, AI/vision, third-party API integration with graceful fallbacks, charts, and an installable native-like experience — all behind a clean, themeable design system.

---

## ✨ Features

### Logging — four ways to add food
| Method | How it works |
| --- | --- |
| 📷 **AI photo scan** | Snap a prepared meal → Claude identifies the dish, estimates one serving's macros, and counts how many servings are in the photo. |
| 🏷️ **Label scan** | Photograph a Nutrition Facts panel → Claude reads it (OCR-style) into structured macros. |
| 🎙️ **Voice / natural language** | Say or type *"two eggs, toast, and a banana"* → parsed into individual items with calories & macros. |
| 📦 **Barcode scan** | Live camera scanning via the native `BarcodeDetector` API → product nutrition from Open Food Facts. |
| 🔎 **Food search** | Type-ahead search across the USDA FoodData Central database plus a built-in common-foods list. |

### Plan & shop
- **Daily diary** with four meal slots (breakfast / lunch / dinner / snack) and live macro ring totals against your goals.
- **Weekly meal planner** — assign recipes to any day, jump straight to a day to log it.
- **Recipe browser & builder** — search thousands of recipes (Spoonacular, with Edamam failover) or build your own ingredient-by-ingredient with auto-calculated macros.
- **Smart grocery list** — generated from your week's plan, **auto-categorized** (Produce / Protein / Dairy / Pantry) and check-off-able, with mock delivery-partner integrations.

### Track & reflect
- **Progress dashboard** — weight trend (area chart) and daily calories (bar chart) via Recharts.
- **Logging streak** + a **calendar history** view to see which days you logged.
- **Personalized targets** — calorie & macro goals computed from your body stats using the **Mifflin–St Jeor** equation (BMR → TDEE → goal adjustment, 30/40/30 split).
- **CSV export** of your full weight + nutrition history.

### Account & platform
- **Email/password accounts** with per-user **cloud sync** across devices.
- **Onboarding flow** + editable **profile** (units, body stats, activity level, goal).
- **Offline-first** — everything works without a connection; changes sync when you're back online.
- **Installable PWA** — add to home screen, runs standalone, custom icons & splash.

---

## 🧱 Tech stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React 18, Vite 6, Tailwind CSS v4, a token-based inline-style design system, Recharts, Lucide icons |
| **Backend (serverless)** | Cloudflare Pages Functions (prod) + a mirrored Vite middleware proxy (dev) |
| **Auth & data** | Supabase — Postgres + Auth, secured with Row-Level Security |
| **AI** | Anthropic Claude (`claude-sonnet-4-6`) — vision for photo/label scanning, NLP for free-text logging |
| **Nutrition data** | Open Food Facts (barcodes), USDA FoodData Central (search), Nutritionix (NL fallback), Spoonacular + Edamam (recipes) |
| **Browser platform APIs** | `BarcodeDetector`, `getUserMedia` (camera), Web Speech API (voice), `FileReader`, `navigator.share` |
| **PWA** | vite-plugin-pwa / Workbox — service worker, runtime caching, offline fallback |
| **Tooling** | Programmatic icon generation (`@resvg/resvg-js`) from a single source SVG |

---

## 🏗️ Architecture & engineering decisions

> The interesting engineering here isn't any single feature — it's how the pieces stay **secure, resilient, and degrade gracefully** when keys are missing or the network drops.

```
┌───────────────────────────────────────────────────────────────┐
│  Browser (React SPA + Service Worker)                          │
│   • Camera / mic / file APIs   • localStorage (offline cache)  │
│   • Supabase JS (auth + sync)                                  │
└───────────────┬──────────────────────────────┬────────────────┘
                │ /api/*  (keys never sent)     │  HTTPS (RLS)
                ▼                                ▼
┌───────────────────────────────┐    ┌──────────────────────────┐
│  Serverless API proxy         │    │  Supabase                │
│  dev:  Vite middleware        │    │  • Auth (email/password) │
│  prod: CF Pages Functions     │    │  • app_state (jsonb)     │
│  injects secret keys server-  │    │  • profiles (structured) │
│  side, forwards upstream      │    │  • Row-Level Security    │
└───────┬───────────────────────┘    └──────────────────────────┘
        │
        ├─ Anthropic Claude  (vision + NL macro estimation)
        ├─ USDA FoodData Central  (food search)
        ├─ Nutritionix  (NL fallback)
        └─ Spoonacular → Edamam  (recipes, with failover)
        (Open Food Facts is called directly — public, CORS-OK, no key)
```

**1. Secret keys never touch the client.**
Every keyed third-party call goes through an `/api/*` proxy that injects the API key server-side. The clever part is that this proxy has **two implementations kept in sync** — Vite dev-server middleware (`vite.config.js`) for local development, and **Cloudflare Pages Functions** (`functions/api/*`) in production — so the client code (`/api/claude`, `/api/usda`, …) is identical in both environments. Only Supabase's public, RLS-protected anon key is exposed to the browser, by design.

**2. Offline-first, local-first sync.**
State loads from `localStorage` instantly, then reconciles with Supabase. Writes are **debounced** and go to `localStorage` always + Supabase when signed in. The app is fully usable with no account (local-only) and survives going offline mid-session — Supabase writes simply no-op and retry later.

**3. Graceful degradation everywhere.**
Missing a key never crashes the app: no Supabase → local-only mode; no Anthropic key → AI features disable with a friendly message; no USDA key → falls back to the shared `DEMO_KEY`; recipe search **fails over** from Spoonacular to Edamam (e.g. on a 402 "quota exhausted"). Browser-capability checks gate the camera/voice features so unsupported devices get a typed-input fallback instead of a broken UI.

**4. Normalizing messy nutrition data.**
Each upstream source models food differently — branded foods report per-serving label nutrients, generic foods report per-100 g; Edamam gives whole-recipe totals that must be divided by yield; Open Food Facts prefers serving values and falls back to per-100 g. Each integration normalizes to **one internal `{ kcal, protein, carbs, fat }` shape**, so the rest of the app never cares where a number came from.

**5. Robust AI output parsing.**
LLMs don't always return clean JSON. A custom `extractJSON` helper strips markdown fences and brace-matches the first complete JSON object/array out of the model's reply, making the photo/voice pipelines resilient to chatty responses.

**6. PWA caching strategy.**
Workbox precaches the app shell, serves an offline navigation fallback, **denylists `/api/*`** so the service worker never swallows live API calls, and uses a `NetworkFirst` runtime cache for Open Food Facts so previously scanned products resolve offline.

**7. Data modeling.**
The canonical store is a single per-user `app_state` JSON blob (fast to read/write, schema-flexible for a fast-moving prototype), with a **parallel structured `profiles` table** that mirrors identity + body stats as first-class, queryable columns. Both tables are isolated per user via Row-Level Security policies.

---

## 📁 Project structure

```
Plately.jsx              # main app shell + screens (diary, plan, recipes, grocery, progress)
functions/api/           # Cloudflare Pages Functions — production API proxy (keys server-side)
  claude.js  usda.js  nutritionix.js  spoonacular.js  edamam.js
src/
  components/            # AuthScreen, BarcodeScanner, profile, Sheet, ui
  lib/
    api.js               # all third-party integrations + data normalization
    profile.js           # BMR/TDEE math + Supabase profiles mirror
    supabase.js          # client (null-safe → local-only mode)
    helpers.js           # dates, ids, nutrition math, JSON extraction
    theme.js             # brand + design tokens (rebrand the whole app here)
  data/seed.js           # food DB, grocery categories, initial state
  styles.js              # shared style objects built from theme tokens
supabase/schema.sql      # tables + Row-Level Security policies
vite.config.js           # build, PWA config, + dev-server API proxy
scripts/gen-icons.mjs    # generates all PWA icons from assets/icon.svg
```

---

## 🚀 Getting started

```bash
npm install
cp .env.example .env      # then fill in your keys (all optional — see below)
npm run dev
```

Open the printed local URL (e.g. `http://localhost:5173`).

> **Zero-config start:** with an empty `.env` the app still runs — local-only storage, `DEMO_KEY` for USDA search, and AI/recipe features show a friendly "add a key" message. Add keys to unlock each feature.

### Configuration

All keys live in `.env` (gitignored). See `.env.example` for the full list.

| Variable | Enables | Required? |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | AI photo/label scan + natural-language logging | Optional |
| `USDA_FDC_API_KEY` | Food search (else shared `DEMO_KEY`, low limits) | Optional |
| `NUTRITIONIX_APP_ID` / `_KEY` | NL-logging fallback | Optional |
| `SPOONACULAR_API_KEY` | Recipe search (primary) | Optional |
| `EDAMAM_APP_ID` / `_KEY` | Recipe search (failover) | Optional |
| `VITE_SUPABASE_URL` / `_ANON_KEY` | Accounts + cloud sync (else local-only) | Optional |

### Supabase setup (optional — for accounts & sync)

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/schema.sql` in the SQL Editor (creates `app_state` + `profiles` with RLS).
3. Copy the Project URL and anon key into `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
4. For instant dev login, disable "Confirm email" in Authentication settings.

### Build & deploy

```bash
npm run build && npm run preview   # production bundle (SW + manifest active)
```

Deploys to **Cloudflare Pages** — connect the repo, set build command `npm run build`, output `dist`, and add the env vars in the dashboard. The `functions/` directory becomes the production API proxy automatically. Full walkthrough in **[DEPLOY.md](DEPLOY.md)**.

---

## 🧠 Skills demonstrated

A quick map of what this project shows, for reviewers:

- **Full-stack product engineering** — auth, cloud sync, offline support, and a real serverless backend, not just a UI.
- **AI / LLM integration** — multimodal (vision + text) Claude usage with structured-output parsing and sensible fallbacks.
- **API design & security** — server-side key isolation with a dev/prod-mirrored proxy; nothing secret reaches the browser.
- **Resilience engineering** — graceful degradation, multi-provider failover, and offline-first state management.
- **Data normalization** — reconciling five differently-shaped nutrition APIs into one clean internal model.
- **PWA / web-platform depth** — service-worker caching strategy, installability, and native browser APIs (camera, barcode, speech).
- **Database design** — Postgres with Row-Level Security and a hybrid JSON-blob + structured-table model.
- **Product & UX polish** — onboarding, a cohesive themeable design system, charts, streaks, and CSV export.

---

## ⚠️ Disclaimer

Prototype / portfolio project. Nutrition figures — especially AI estimates — are approximate and **not medical advice**. Delivery partners are mock integrations.

<div align="center">
<sub>Built by Thien-An Tran · React · Supabase · Claude · Cloudflare</sub>
</div>
