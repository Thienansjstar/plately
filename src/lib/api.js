import { uid } from "./helpers";

export async function callClaude(userContent, system, maxTokens = 1024) {
  // Posts to the local dev proxy (see vite.config.js), which injects the API
  // key and the anthropic-version header server-side.
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const e = await res.json();
      msg = (typeof e?.error === "string" ? e.error : e?.error?.message) || msg;
    } catch {}
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

// Reads nutrition for a scanned/typed barcode from Open Food Facts (free, no key,
// CORS-enabled). Prefers per-serving values, falls back to per-100g.
export async function lookupBarcode(code) {
  const clean = String(code || "").replace(/\D/g, "");
  if (!clean) { const e = new Error("empty barcode"); e.code = "empty"; throw e; }
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=product_name,brands,nutriments,serving_size`
  );
  if (!res.ok) throw new Error(`lookup failed (${res.status})`);
  const data = await res.json();
  if (data.status !== 1 || !data.product) {
    const e = new Error("not found"); e.code = "notfound"; throw e;
  }
  const p = data.product, n = p.nutriments || {};
  const num = (v) => (v == null || Number.isNaN(+v) ? null : +v);
  const hasServing = num(n["energy-kcal_serving"]) != null || num(n["proteins_serving"]) != null;
  const pick = (base) => {
    const sv = num(n[`${base}_serving`]);
    if (hasServing && sv != null) return sv;
    const hg = num(n[`${base}_100g`]);
    return hg != null ? hg : 0;
  };
  const kcal = hasServing
    ? (num(n["energy-kcal_serving"]) ?? num(n["energy-kcal_100g"]) ?? 0)
    : (num(n["energy-kcal_100g"]) ?? 0);
  const name = [p.brands, p.product_name].filter(Boolean).join(" — ").trim() || `Item ${clean}`;
  return {
    id: uid(),
    name,
    qty: hasServing ? (p.serving_size || "1 serving") : "per 100 g",
    kcal: Math.max(0, Math.round(kcal)),
    protein: Math.max(0, Math.round(pick("proteins"))),
    carbs: Math.max(0, Math.round(pick("carbohydrates"))),
    fat: Math.max(0, Math.round(pick("fat"))),
    barcode: clean,
  };
}

// Food search via USDA FoodData Central (through the dev proxy). Branded foods
// carry per-serving labelNutrients; generic foods report per-100g foodNutrients.
export async function searchUSDA(query) {
  const res = await fetch("/api/usda", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, pageSize: 25 }),
  });
  if (!res.ok) throw new Error(`USDA search failed (${res.status})`);
  const data = await res.json();
  const foods = Array.isArray(data.foods) ? data.foods : [];
  const num = (v) => (v == null || Number.isNaN(+v) ? 0 : +v);
  const byNum = (arr, ids) => {
    const hit = (arr || []).find((n) => ids.includes(String(n.nutrientNumber)) || ids.includes(String(n.nutrientId)));
    return hit ? num(hit.value) : 0;
  };
  return foods
    .map((f) => {
      const ln = f.labelNutrients;
      let kcal, protein, carbs, fat, serving;
      if (ln && (ln.calories || ln.protein)) {
        kcal = num(ln.calories?.value);
        protein = num(ln.protein?.value);
        carbs = num(ln.carbohydrates?.value);
        fat = num(ln.fat?.value);
        serving = f.householdServingFullText || (f.servingSize ? `${f.servingSize} ${f.servingSizeUnit || ""}`.trim() : "1 serving");
      } else {
        kcal = byNum(f.foodNutrients, ["208", "1008"]);
        protein = byNum(f.foodNutrients, ["203", "1003"]);
        carbs = byNum(f.foodNutrients, ["205", "1005"]);
        fat = byNum(f.foodNutrients, ["204", "1004"]);
        serving = "100 g";
      }
      const brand = f.brandName || f.brandOwner;
      const desc = (f.description || "").trim();
      const niceDesc = desc ? desc.charAt(0) + desc.slice(1).toLowerCase() : "Food";
      return {
        id: "usda-" + (f.fdcId || uid()),
        name: [brand, niceDesc].filter(Boolean).join(" — "),
        serving,
        kcal: Math.round(kcal),
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
        source: "USDA",
      };
    })
    .filter((f) => f.kcal || f.protein || f.carbs || f.fat);
}

// Recipe search via Spoonacular (through the dev proxy). complexSearch is asked
// for full info + per-serving nutrition, so each result maps straight to our
// recipe shape — no second detail fetch needed.
const RECIPE_BGS = ["#EAF3DA", "#FBE6D6", "#E7EEF6", "#F3E9D9", "#F0ECF6", "#E6F1EF"];
const spoonNutrient = (nutrients, name) => {
  const hit = (nutrients || []).find((n) => n.name === name);
  return hit ? Math.max(0, Math.round(hit.amount)) : 0;
};
const mapSpoonRecipe = (r) => {
  const nutrients = r.nutrition?.nutrients || [];
  const ingredients = (r.extendedIngredients || []).map((i) => ({
    name: i.nameClean || i.name || i.originalName || "",
    qty: +(i.measures?.us?.amount ?? i.amount ?? 0) || 0,
    unit: i.measures?.us?.unitShort || i.unit || "",
  })).filter((i) => i.name);
  const tags = [...new Set([...(r.diets || []), ...(r.dishTypes || [])])]
    .map((t) => t.replace(/\b\w/g, (c) => c.toUpperCase()));
  return {
    id: `sp_${r.id}`,
    spoonId: r.id,
    name: r.title || "Recipe",
    image: r.image || "",
    emoji: "🍽️",
    bg: RECIPE_BGS[r.id % RECIPE_BGS.length],
    tags,
    servings: Math.max(1, r.servings || 1),
    minutes: Math.max(0, r.readyInMinutes || 0),
    kcal: spoonNutrient(nutrients, "Calories"),
    protein: spoonNutrient(nutrients, "Protein"),
    carbs: spoonNutrient(nutrients, "Carbohydrates"),
    fat: spoonNutrient(nutrients, "Fat"),
    ingredients,
    source: "spoonacular",
  };
};
export async function searchSpoonacular(query, number = 20) {
  const res = await fetch("/api/spoonacular", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, number }),
  });
  if (!res.ok) {
    let msg = `Recipe search failed (${res.status})`;
    try { const e = await res.json(); msg = (typeof e?.error === "string" ? e.error : e?.message) || msg; } catch {}
    const err = new Error(msg); err.status = res.status; throw err;
  }
  const data = await res.json();
  return (Array.isArray(data.results) ? data.results : []).map(mapSpoonRecipe);
}

// Natural-language parsing via Nutritionix (through the dev proxy) — used as a
// fallback when the Claude estimate is unavailable or fails.
export async function parseNutritionix(text) {
  const res = await fetch("/api/nutritionix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: text }),
  });
  if (!res.ok) {
    let msg = `Nutritionix failed (${res.status})`;
    try { const e = await res.json(); msg = (typeof e?.error === "string" ? e.error : e?.message) || msg; } catch {}
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const foods = Array.isArray(data.foods) ? data.foods : [];
  if (!foods.length) throw new Error("no items");
  return foods.map((f) => ({
    id: uid(),
    name: f.food_name ? f.food_name.charAt(0).toUpperCase() + f.food_name.slice(1) : "Item",
    qty: `${f.serving_qty || 1} ${f.serving_unit || "serving"}`,
    kcal: Math.max(0, Math.round(f.nf_calories || 0)),
    protein: Math.max(0, Math.round(f.nf_protein || 0)),
    carbs: Math.max(0, Math.round(f.nf_total_carbohydrate || 0)),
    fat: Math.max(0, Math.round(f.nf_total_fat || 0)),
  }));
}
