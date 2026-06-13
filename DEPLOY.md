# Deploying Plately (PWA on Cloudflare Pages)

Plately is a Vite SPA that installs as a PWA. The secret-key API proxy that runs
as Vite middleware in dev (`vite.config.js`) is mirrored in production by
**Cloudflare Pages Functions** in `functions/api/*`, so the client keeps calling
`/api/claude`, `/api/usda`, `/api/nutritionix` unchanged.

## One-time setup

1. **Push to GitHub** (Cloudflare deploys from the repo):
   ```sh
   git init && git add -A && git commit -m "Plately PWA + Cloudflare Functions"
   git branch -M main
   git remote add origin git@github.com:<you>/plately.git
   git push -u origin main
   ```
   `.env`, `node_modules`, and `dist` are gitignored — keys never get committed.

2. **Create the Pages project**: Cloudflare dashboard → Workers & Pages →
   Create → Pages → Connect to Git → pick the repo. Build settings:
   - Framework preset: **Vite** (or "None")
   - Build command: `npm run build`
   - Build output directory: `dist`
   - The `functions/` directory is detected automatically — no extra config.

3. **Add environment variables** (Settings → Environment variables, for both
   Production and Preview). These are the *secret* server-side keys:
   - `ANTHROPIC_API_KEY` — required for AI logging + photo/label scan
   - `USDA_FDC_API_KEY` — optional (falls back to `DEMO_KEY`, low rate limit)
   - `NUTRITIONIX_APP_ID`, `NUTRITIONIX_APP_KEY` — optional fallback
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — these are `VITE_`-prefixed,
     so they are baked into the client bundle and are public by design.

   Redeploy after adding/changing vars.

## Icons

App icons are generated from `assets/icon.svg`:
```sh
npm run gen-icons   # writes public/pwa-*.png, maskable, apple-touch, favicon
```
The PNGs are committed, so Cloudflare's build does not need the native renderer.
Re-run only when the source SVG changes.

## Local checks

- `npm run dev` — app + dev proxy (uses keys from `.env`).
- `npm run build && npm run preview` — production bundle (SW + manifest active).
- `npx wrangler pages dev dist` — exercise the real Pages Functions locally;
  put the keys in `.dev.vars` (same `KEY=value` format as `.env`).
