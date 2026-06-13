# Plately

> Plan it. Track it. Thrive.

A meal-planning and nutrition-tracking app: daily diary, weekly plan, recipes, grocery list, and progress charts — with barcode scanning, AI photo/voice logging, food search, and accounts with cloud sync.

## Tech

- **React + Vite + Tailwind v4** — single-file UI in `Plately.jsx`
- **Supabase** — email/password auth + per-user cloud sync (Row Level Security)
- **Open Food Facts** — barcode → product nutrition (no key)
- **USDA FoodData Central** — food search
- **Anthropic Claude** — meal/label photo scan + natural-language logging
- **Nutritionix** — natural-language fallback

API keys for Claude, USDA, and Nutritionix are kept server-side by a small dev proxy in `vite.config.js` (`/api/*`); the browser never sees them.

## Run locally

```bash
npm install
cp .env.example .env   # then fill in your keys
npm run dev
```

Open the printed local URL (e.g. http://localhost:5173).

## Configuration

All keys live in `.env` (gitignored). See `.env.example` for the full list. Everything has a graceful fallback:

- No Supabase keys → runs local-only (no login, data cached in the browser).
- No USDA key → uses the shared `DEMO_KEY` (low rate limits).
- No Anthropic key → AI scan/logging is disabled with a clear message.

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/schema.sql` in the SQL Editor (creates the `app_state` table + RLS).
3. Copy the Project URL and anon key into `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
4. For instant dev login, disable "Confirm email" in Authentication settings.

## Disclaimer

Prototype. Nutrition figures — especially AI estimates — are approximate and not medical advice.
