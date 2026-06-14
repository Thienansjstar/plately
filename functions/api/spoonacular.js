// Cloudflare Pages Function — production equivalent of the /api/spoonacular dev
// proxy. Recipe search via Spoonacular complexSearch (with full info + nutrition).
// Set SPOONACULAR_API_KEY in the Cloudflare Pages env.
const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export async function onRequestPost({ request, env }) {
  const SPOON = env.SPOONACULAR_API_KEY;
  if (!SPOON) return json(501, { error: "Spoonacular not configured (set SPOONACULAR_API_KEY)." });
  let query, number;
  try {
    ({ query, number } = JSON.parse((await request.text()) || "{}"));
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }
  try {
    const u = new URL("https://api.spoonacular.com/recipes/complexSearch");
    u.searchParams.set("apiKey", SPOON);
    u.searchParams.set("number", String(Math.min(number || 20, 40)));
    u.searchParams.set("addRecipeInformation", "true");
    u.searchParams.set("addRecipeNutrition", "true");
    u.searchParams.set("fillIngredients", "true");
    if (query && query.trim()) u.searchParams.set("query", query.trim());
    else u.searchParams.set("sort", "popularity");
    const upstream = await fetch(u);
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return json(502, { error: "Spoonacular request failed: " + (e?.message || "unknown error") });
  }
}
