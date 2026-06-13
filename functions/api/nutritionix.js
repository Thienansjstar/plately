// Cloudflare Pages Function — production equivalent of the /api/nutritionix dev
// proxy. Natural-language nutrient lookup (AI-logging fallback). Optional:
// set NUTRITIONIX_APP_ID and NUTRITIONIX_APP_KEY in the Cloudflare Pages env.
const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export async function onRequestPost({ request, env }) {
  if (!env.NUTRITIONIX_APP_ID || !env.NUTRITIONIX_APP_KEY) {
    return json(501, { error: "Nutritionix not configured (set NUTRITIONIX_APP_ID and NUTRITIONIX_APP_KEY)." });
  }
  try {
    const upstream = await fetch("https://trackapi.nutritionix.com/v2/natural/nutrients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-id": env.NUTRITIONIX_APP_ID,
        "x-app-key": env.NUTRITIONIX_APP_KEY,
      },
      body: await request.text(),
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return json(502, { error: "Nutritionix request failed: " + (e?.message || "unknown error") });
  }
}
