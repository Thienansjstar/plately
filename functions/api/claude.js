// Cloudflare Pages Function — production equivalent of the /api/claude dev proxy.
// Forwards chat/vision requests to Anthropic with the key kept server-side.
// Set ANTHROPIC_API_KEY in: Cloudflare Pages → Settings → Environment variables.
const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) {
    return json(500, { error: "Missing ANTHROPIC_API_KEY. Set it in the Cloudflare Pages project settings." });
  }
  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: await request.text(),
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return json(502, { error: "Upstream request failed: " + (e?.message || "unknown error") });
  }
}
