// Cloudflare Pages Function — production equivalent of the /api/edamam dev proxy.
// Edamam Recipe Search API v2 — the recipe fallback when Spoonacular's quota is
// exhausted. Set EDAMAM_APP_ID and EDAMAM_APP_KEY in the Cloudflare Pages env.
const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export async function onRequestPost({ request, env }) {
  // Trim env keys to tolerate accidental leading/trailing spaces in the CF dashboard.
  const getEnv = (name) => Object.entries(env).find(([k]) => k.trim() === name)?.[1];
  const ID = getEnv("EDAMAM_APP_ID"), KEY = getEnv("EDAMAM_APP_KEY");
  if (!ID || !KEY) return json(501, { error: "Edamam not configured (set EDAMAM_APP_ID and EDAMAM_APP_KEY)." });
  let query, number;
  try {
    ({ query, number } = JSON.parse((await request.text()) || "{}"));
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }
  try {
    const u = new URL("https://api.edamam.com/api/recipes/v2");
    u.searchParams.set("type", "public");
    u.searchParams.set("q", (query && query.trim()) || "healthy");
    u.searchParams.set("app_id", ID);
    u.searchParams.set("app_key", KEY);
    u.searchParams.set("to", String(Math.min(number || 20, 40)));
    const upstream = await fetch(u, { headers: { "Edamam-Account-User": ID } });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return json(502, { error: "Edamam request failed: " + (e?.message || "unknown error") });
  }
}
