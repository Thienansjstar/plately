import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dev-server proxy: keeps API keys server-side and handles CORS. The client
// posts to /api/* and we forward to the real services with keys from .env.
//   /api/claude      -> Anthropic (meal/label photo scan, AI logging)
//   /api/usda        -> USDA FoodData Central (food search)
//   /api/nutritionix -> Nutritionix natural-language (AI-logging fallback)
// Open Food Facts (barcode) is called directly from the client — no key, CORS OK.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const ANTHROPIC = env.ANTHROPIC_API_KEY;
  const USDA = env.USDA_FDC_API_KEY || "DEMO_KEY"; // DEMO_KEY works at low rate limits
  const NIX_ID = env.NUTRITIONIX_APP_ID;
  const NIX_KEY = env.NUTRITIONIX_APP_KEY;

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
        },
      },
    ],
  };
});
