import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// Dev-server proxy: keeps API keys server-side and handles CORS. The client
// posts to /api/* and we forward to the real services with keys from .env.
//   /api/claude      -> Anthropic (meal/label photo scan, AI logging)
//   /api/usda        -> USDA FoodData Central (food search)
//   /api/nutritionix -> Nutritionix natural-language (AI-logging fallback)
// Open Food Facts (barcode) is called directly from the client — no key, CORS OK.
//
// In PRODUCTION on Cloudflare Pages this proxy does not run — the same /api/*
// routes are served by the Pages Functions in /functions/api/*, which read the
// keys from the Cloudflare dashboard env vars. Keep the two in sync.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const ANTHROPIC = env.ANTHROPIC_API_KEY;
  const USDA = env.USDA_FDC_API_KEY || "DEMO_KEY"; // DEMO_KEY works at low rate limits
  const NIX_ID = env.NUTRITIONIX_APP_ID;
  const NIX_KEY = env.NUTRITIONIX_APP_KEY;
  const SPOON = env.SPOONACULAR_API_KEY;

  const readBody = async (req) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    return Buffer.concat(chunks).toString("utf8");
  };
  const sendJson = (res, status, obj) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(obj));
  };
  const pipe = async (res, upstream) => {
    const text = await upstream.text();
    res.statusCode = upstream.status;
    res.setHeader("Content-Type", "application/json");
    res.end(text);
  };

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        includeAssets: ["favicon-32.png", "apple-touch-icon.png"],
        manifest: {
          name: "Plately",
          short_name: "Plately",
          description: "Plan meals and track nutrition — log by photo, barcode, or voice.",
          theme_color: "#143C30",
          background_color: "#143C30",
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
          scope: "/",
          icons: [
            { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
            { src: "maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
          navigateFallback: "/index.html",
          // Never let the SPA fallback or the SW swallow API calls.
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              // Barcode lookups: serve fresh, fall back to cache offline.
              urlPattern: ({ url }) => url.origin === "https://world.openfoodfacts.org",
              handler: "NetworkFirst",
              options: {
                cacheName: "off-products",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
      {
        name: "api-proxy",
        configureServer(server) {
          server.middlewares.use("/api/claude", async (req, res) => {
            if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
            if (!ANTHROPIC) return sendJson(res, 500, { error: "Missing ANTHROPIC_API_KEY. Add it to .env and restart `npm run dev`." });
            try {
              const body = await readBody(req);
              await pipe(res, await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC, "anthropic-version": "2023-06-01" },
                body,
              }));
            } catch (e) { sendJson(res, 502, { error: "Upstream request failed: " + (e?.message || "unknown error") }); }
          });

          server.middlewares.use("/api/usda", async (req, res) => {
            if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
            try {
              const { query, pageSize } = JSON.parse((await readBody(req)) || "{}");
              if (!query || !query.trim()) return sendJson(res, 200, { foods: [] });
              await pipe(res, await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(USDA)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  query: query.trim(),
                  pageSize: Math.min(pageSize || 25, 50),
                  dataType: ["Branded", "SR Legacy", "Foundation", "Survey (FNDDS)"],
                }),
              }));
            } catch (e) { sendJson(res, 502, { error: "USDA request failed: " + (e?.message || "unknown error") }); }
          });

          server.middlewares.use("/api/nutritionix", async (req, res) => {
            if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
            if (!NIX_ID || !NIX_KEY) return sendJson(res, 501, { error: "Nutritionix not configured (set NUTRITIONIX_APP_ID and NUTRITIONIX_APP_KEY in .env)." });
            try {
              const body = await readBody(req);
              await pipe(res, await fetch("https://trackapi.nutritionix.com/v2/natural/nutrients", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-app-id": NIX_ID, "x-app-key": NIX_KEY },
                body,
              }));
            } catch (e) { sendJson(res, 502, { error: "Nutritionix request failed: " + (e?.message || "unknown error") }); }
          });

          server.middlewares.use("/api/spoonacular", async (req, res) => {
            if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
            if (!SPOON) return sendJson(res, 501, { error: "Spoonacular not configured (set SPOONACULAR_API_KEY in .env)." });
            try {
              const { query, number } = JSON.parse((await readBody(req)) || "{}");
              const u = new URL("https://api.spoonacular.com/recipes/complexSearch");
              u.searchParams.set("apiKey", SPOON);
              u.searchParams.set("number", String(Math.min(number || 20, 40)));
              u.searchParams.set("addRecipeInformation", "true");
              u.searchParams.set("addRecipeNutrition", "true");
              u.searchParams.set("fillIngredients", "true");
              if (query && query.trim()) u.searchParams.set("query", query.trim());
              else u.searchParams.set("sort", "popularity");
              await pipe(res, await fetch(u));
            } catch (e) { sendJson(res, 502, { error: "Spoonacular request failed: " + (e?.message || "unknown error") }); }
          });
        },
      },
    ],
  };
});
