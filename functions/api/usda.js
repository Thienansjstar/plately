// Cloudflare Pages Function — production equivalent of the /api/usda dev proxy.
// USDA FoodData Central food search. Key is optional (DEMO_KEY works at low rate
// limits); set USDA_FDC_API_KEY in the Cloudflare Pages env for higher limits.
const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export async function onRequestPost({ request, env }) {
  const USDA = env.USDA_FDC_API_KEY || "DEMO_KEY";
  let query, pageSize;
  try {
    ({ query, pageSize } = JSON.parse((await request.text()) || "{}"));
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }
  if (!query || !query.trim()) return json(200, { foods: [] });
  try {
    const upstream = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(USDA)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          pageSize: Math.min(pageSize || 25, 50),
          dataType: ["Branded", "SR Legacy", "Foundation", "Survey (FNDDS)"],
        }),
      },
    );
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return json(502, { error: "USDA request failed: " + (e?.message || "unknown error") });
  }
}
