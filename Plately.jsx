import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Home, CalendarDays, BookOpen, ShoppingCart, TrendingUp, Settings,
  Plus, Minus, X, Search, Mic, Camera, ChevronLeft, ChevronRight, ChevronDown,
  Check, CheckCircle2, Share2, Download, Flame, Trash2, Sparkles, Loader2,
  Pencil, Users, Send, Copy, Target, User, ArrowRight, RefreshCw, Link2,
  Clock, ScanLine, Utensils,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Cell,
} from "recharts";
import { createClient } from "@supabase/supabase-js";

/* ============================================================================
   SUPABASE — accounts + cloud sync. Configured via VITE_SUPABASE_* in .env.
   If unset, `supabase` is null and the app runs in local-only mode (no login).
============================================================================ */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

/* ============================================================================
   BRAND  — change these two lines to rebrand the whole app.
   (Run a USPTO + App Store name search before you ship under any name.)
============================================================================ */
const BRAND = "Plately";
const TAGLINE = "Plan it. Track it. Thrive.";

/* ---- Palette (evergreen + lime energy + warm apricot for fuel) ---- */
const C = {
  canvas: "#F6F4EC",
  surface: "#FFFFFF",
  ink: "#19241E",
  inkSoft: "#5C6B61",
  line: "#E7E3D7",
  ever: "#143C30",      // deep evergreen (headers / primary)
  ever2: "#1E5544",
  leaf: "#86BF3E",      // lime energy (accent / success)
  leafSoft: "#EAF3DA",
  apricot: "#EF8C4B",   // warm "fuel" accent (calories)
  apricotSoft: "#FBE6D6",
  protein: "#2E8B8B",   // teal
  carbs: "#E0A93B",     // gold
  fat: "#D86A6A",       // coral
};

const FONT = "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/* ============================================================================
   DATE HELPERS
============================================================================ */
const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
const todayISO = () => toISO(new Date());
const addDays = (iso, n) => { const d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const niceDate = (iso) => { const d = fromISO(iso); return `${WD[d.getDay()]}, ${MO[d.getMonth()]} ${d.getDate()}`; };
const shortDate = (iso) => { const d = fromISO(iso); return `${MO[d.getMonth()]} ${d.getDate()}`; };
const mondayOf = (iso) => { const d = fromISO(iso); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return toISO(d); };
const relDay = (iso) => {
  const t = todayISO();
  if (iso === t) return "Today";
  if (iso === addDays(t, -1)) return "Yesterday";
  if (iso === addDays(t, 1)) return "Tomorrow";
  return niceDate(iso);
};
const mealByHour = () => {
  const h = new Date().getHours();
  if (h < 10.5) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
};

/* ============================================================================
   SEED DATA
============================================================================ */
const MEALS = [
  { key: "breakfast", label: "Breakfast", emoji: "🌅" },
  { key: "lunch", label: "Lunch", emoji: "🥗" },
  { key: "dinner", label: "Dinner", emoji: "🍽️" },
  { key: "snack", label: "Snacks", emoji: "🍎" },
];

const GOAL_TAGS = ["High protein", "Low carb", "Balanced", "Vegetarian", "Quick"];

const uid = () => Math.random().toString(36).slice(2, 10);

// Recipes: per-serving macros + scalable ingredients
const RECIPES = [
  {
    id: "r1", name: "Greek Yogurt Power Bowl", emoji: "🥣", bg: "#EAF3DA",
    tags: ["High protein", "Quick", "Vegetarian"], servings: 1, minutes: 5,
    kcal: 360, protein: 28, carbs: 41, fat: 9,
    ingredients: [
      { name: "Greek yogurt", qty: 1, unit: "cup" },
      { name: "Blueberries", qty: 0.5, unit: "cup" },
      { name: "Granola", qty: 0.25, unit: "cup" },
      { name: "Honey", qty: 1, unit: "tsp" },
      { name: "Chia seeds", qty: 1, unit: "tsp" },
    ],
    steps: ["Spoon yogurt into a bowl.", "Top with blueberries and granola.", "Drizzle honey and sprinkle chia."],
  },
  {
    id: "r2", name: "Veggie Egg Scramble", emoji: "🍳", bg: "#FBE6D6",
    tags: ["High protein", "Low carb", "Vegetarian", "Quick"], servings: 1, minutes: 12,
    kcal: 290, protein: 21, carbs: 8, fat: 19,
    ingredients: [
      { name: "Eggs", qty: 3, unit: "" },
      { name: "Spinach", qty: 1, unit: "cup" },
      { name: "Bell pepper", qty: 0.5, unit: "" },
      { name: "Cheddar cheese", qty: 1, unit: "slice" },
      { name: "Olive oil", qty: 1, unit: "tsp" },
    ],
    steps: ["Heat oil in a pan.", "Sauté pepper and spinach 2 min.", "Add beaten eggs; scramble.", "Fold in cheese."],
  },
  {
    id: "r3", name: "Overnight Oats & Berries", emoji: "🫐", bg: "#E7EEF6",
    tags: ["Balanced", "Vegetarian", "Quick"], servings: 1, minutes: 5,
    kcal: 380, protein: 14, carbs: 58, fat: 11,
    ingredients: [
      { name: "Rolled oats", qty: 0.5, unit: "cup" },
      { name: "Oat milk", qty: 0.75, unit: "cup" },
      { name: "Blueberries", qty: 0.5, unit: "cup" },
      { name: "Peanut butter", qty: 1, unit: "tbsp" },
      { name: "Maple syrup", qty: 1, unit: "tsp" },
    ],
    steps: ["Combine oats and oat milk in a jar.", "Stir in peanut butter and syrup.", "Top with berries; chill overnight."],
  },
  {
    id: "r4", name: "Grilled Chicken Caesar", emoji: "🥗", bg: "#EAF3DA",
    tags: ["High protein", "Low carb"], servings: 2, minutes: 20,
    kcal: 420, protein: 38, carbs: 14, fat: 23,
    ingredients: [
      { name: "Chicken breast", qty: 300, unit: "g" },
      { name: "Romaine lettuce", qty: 1, unit: "head" },
      { name: "Parmesan cheese", qty: 0.25, unit: "cup" },
      { name: "Caesar dressing", qty: 3, unit: "tbsp" },
      { name: "Croutons", qty: 0.5, unit: "cup" },
    ],
    steps: ["Season and grill chicken 6 min/side.", "Chop romaine; toss with dressing.", "Slice chicken over greens.", "Top with parmesan and croutons."],
  },
  {
    id: "r5", name: "Salmon Teriyaki Bowl", emoji: "🐟", bg: "#FBE6D6",
    tags: ["Balanced", "High protein"], servings: 2, minutes: 25,
    kcal: 520, protein: 34, carbs: 55, fat: 18,
    ingredients: [
      { name: "Salmon fillet", qty: 300, unit: "g" },
      { name: "Brown rice", qty: 1, unit: "cup" },
      { name: "Broccoli", qty: 2, unit: "cup" },
      { name: "Teriyaki sauce", qty: 3, unit: "tbsp" },
      { name: "Sesame seeds", qty: 1, unit: "tsp" },
    ],
    steps: ["Cook rice.", "Roast salmon and broccoli 15 min at 400°F.", "Glaze salmon with teriyaki.", "Assemble bowls; top with sesame."],
  },
  {
    id: "r6", name: "Black Bean Burrito Bowl", emoji: "🌯", bg: "#F3E9D9",
    tags: ["Vegetarian", "Balanced"], servings: 2, minutes: 18,
    kcal: 460, protein: 18, carbs: 68, fat: 13,
    ingredients: [
      { name: "Black beans", qty: 1, unit: "cup" },
      { name: "Brown rice", qty: 1, unit: "cup" },
      { name: "Corn", qty: 0.5, unit: "cup" },
      { name: "Avocado", qty: 1, unit: "" },
      { name: "Salsa", qty: 0.5, unit: "cup" },
      { name: "Lime", qty: 1, unit: "" },
    ],
    steps: ["Warm beans and rice.", "Layer into bowls.", "Top with corn, salsa, avocado.", "Squeeze lime over the top."],
  },
  {
    id: "r7", name: "Turkey & Sweet Potato Skillet", emoji: "🍠", bg: "#FBE6D6",
    tags: ["High protein", "Balanced"], servings: 3, minutes: 25,
    kcal: 410, protein: 32, carbs: 34, fat: 16,
    ingredients: [
      { name: "Ground turkey", qty: 450, unit: "g" },
      { name: "Sweet potato", qty: 2, unit: "" },
      { name: "Onion", qty: 1, unit: "" },
      { name: "Spinach", qty: 2, unit: "cup" },
      { name: "Olive oil", qty: 1, unit: "tbsp" },
    ],
    steps: ["Dice and sauté sweet potato 10 min.", "Add onion and turkey; brown.", "Wilt in spinach.", "Season and serve."],
  },
  {
    id: "r8", name: "Lemon Garlic Shrimp Pasta", emoji: "🍤", bg: "#E7EEF6",
    tags: ["Balanced"], servings: 2, minutes: 20,
    kcal: 540, protein: 30, carbs: 62, fat: 18,
    ingredients: [
      { name: "Shrimp", qty: 300, unit: "g" },
      { name: "Spaghetti", qty: 200, unit: "g" },
      { name: "Garlic", qty: 3, unit: "clove" },
      { name: "Lemon", qty: 1, unit: "" },
      { name: "Olive oil", qty: 2, unit: "tbsp" },
      { name: "Parsley", qty: 0.25, unit: "cup" },
    ],
    steps: ["Boil pasta.", "Sauté garlic in oil; add shrimp 3 min.", "Toss with pasta and lemon.", "Finish with parsley."],
  },
  {
    id: "r9", name: "Tofu Veggie Stir-Fry", emoji: "🍲", bg: "#EAF3DA",
    tags: ["Vegetarian", "Low carb"], servings: 2, minutes: 18,
    kcal: 330, protein: 22, carbs: 22, fat: 17,
    ingredients: [
      { name: "Firm tofu", qty: 300, unit: "g" },
      { name: "Broccoli", qty: 2, unit: "cup" },
      { name: "Bell pepper", qty: 1, unit: "" },
      { name: "Soy sauce", qty: 2, unit: "tbsp" },
      { name: "Sesame oil", qty: 1, unit: "tbsp" },
    ],
    steps: ["Press and cube tofu; pan-fry until golden.", "Add vegetables; stir-fry 5 min.", "Add soy sauce and sesame oil.", "Toss and serve."],
  },
  {
    id: "r10", name: "Steak & Roasted Veg", emoji: "🥩", bg: "#F3E9D9",
    tags: ["High protein", "Low carb"], servings: 2, minutes: 30,
    kcal: 480, protein: 40, carbs: 16, fat: 28,
    ingredients: [
      { name: "Sirloin steak", qty: 300, unit: "g" },
      { name: "Asparagus", qty: 1, unit: "bunch" },
      { name: "Cherry tomatoes", qty: 1, unit: "cup" },
      { name: "Olive oil", qty: 1, unit: "tbsp" },
      { name: "Garlic", qty: 2, unit: "clove" },
    ],
    steps: ["Roast veg with oil and garlic 18 min.", "Sear steak 4 min/side.", "Rest 5 min; slice.", "Plate with vegetables."],
  },
  {
    id: "r11", name: "Vanilla Protein Smoothie", emoji: "🥤", bg: "#FBE6D6",
    tags: ["Quick", "High protein"], servings: 1, minutes: 4,
    kcal: 300, protein: 30, carbs: 34, fat: 5,
    ingredients: [
      { name: "Protein powder", qty: 1, unit: "scoop" },
      { name: "Banana", qty: 1, unit: "" },
      { name: "Oat milk", qty: 1, unit: "cup" },
      { name: "Peanut butter", qty: 1, unit: "tbsp" },
    ],
    steps: ["Add everything to a blender.", "Blend until smooth.", "Pour and enjoy."],
  },
  {
    id: "r12", name: "Chickpea Mediterranean Salad", emoji: "🥙", bg: "#EAF3DA",
    tags: ["Vegetarian", "Balanced", "Quick"], servings: 2, minutes: 12,
    kcal: 390, protein: 15, carbs: 44, fat: 18,
    ingredients: [
      { name: "Chickpeas", qty: 1, unit: "cup" },
      { name: "Cucumber", qty: 1, unit: "" },
      { name: "Cherry tomatoes", qty: 1, unit: "cup" },
      { name: "Feta cheese", qty: 0.5, unit: "cup" },
      { name: "Olive oil", qty: 2, unit: "tbsp" },
      { name: "Lemon", qty: 1, unit: "" },
    ],
    steps: ["Chop cucumber and tomatoes.", "Combine with chickpeas and feta.", "Dress with oil and lemon.", "Season and toss."],
  },
];

// Searchable food database (per listed serving)
const FOODS = [
  { id: "f1", name: "Egg, large", serving: "1 egg", kcal: 72, protein: 6, carbs: 0, fat: 5 },
  { id: "f2", name: "Banana", serving: "1 medium", kcal: 105, protein: 1, carbs: 27, fat: 0 },
  { id: "f3", name: "Apple", serving: "1 medium", kcal: 95, protein: 0, carbs: 25, fat: 0 },
  { id: "f4", name: "Chicken breast, cooked", serving: "100 g", kcal: 165, protein: 31, carbs: 0, fat: 4 },
  { id: "f5", name: "White rice, cooked", serving: "1 cup", kcal: 205, protein: 4, carbs: 45, fat: 0 },
  { id: "f6", name: "Brown rice, cooked", serving: "1 cup", kcal: 218, protein: 5, carbs: 46, fat: 2 },
  { id: "f7", name: "Rolled oats, dry", serving: "0.5 cup", kcal: 150, protein: 5, carbs: 27, fat: 3 },
  { id: "f8", name: "Greek yogurt, plain", serving: "1 cup", kcal: 130, protein: 22, carbs: 8, fat: 0 },
  { id: "f9", name: "Almonds", serving: "28 g", kcal: 164, protein: 6, carbs: 6, fat: 14 },
  { id: "f10", name: "Peanut butter", serving: "1 tbsp", kcal: 94, protein: 4, carbs: 3, fat: 8 },
  { id: "f11", name: "Whole milk", serving: "1 cup", kcal: 149, protein: 8, carbs: 12, fat: 8 },
  { id: "f12", name: "Oat milk", serving: "1 cup", kcal: 120, protein: 3, carbs: 16, fat: 5 },
  { id: "f13", name: "Avocado", serving: "1/2 fruit", kcal: 120, protein: 1, carbs: 6, fat: 11 },
  { id: "f14", name: "Broccoli, cooked", serving: "1 cup", kcal: 55, protein: 4, carbs: 11, fat: 1 },
  { id: "f15", name: "Sweet potato, baked", serving: "1 medium", kcal: 112, protein: 2, carbs: 26, fat: 0 },
  { id: "f16", name: "Salmon, cooked", serving: "100 g", kcal: 208, protein: 22, carbs: 0, fat: 13 },
  { id: "f17", name: "Shrimp, cooked", serving: "100 g", kcal: 99, protein: 24, carbs: 0, fat: 1 },
  { id: "f18", name: "Firm tofu", serving: "100 g", kcal: 144, protein: 17, carbs: 3, fat: 9 },
  { id: "f19", name: "Black beans, cooked", serving: "0.5 cup", kcal: 114, protein: 8, carbs: 20, fat: 0 },
  { id: "f20", name: "Olive oil", serving: "1 tbsp", kcal: 119, protein: 0, carbs: 0, fat: 14 },
  { id: "f21", name: "Bread, whole wheat", serving: "1 slice", kcal: 80, protein: 4, carbs: 14, fat: 1 },
  { id: "f22", name: "Cheddar cheese", serving: "1 slice", kcal: 113, protein: 7, carbs: 0, fat: 9 },
  { id: "f23", name: "Whey protein", serving: "1 scoop", kcal: 120, protein: 24, carbs: 3, fat: 1 },
  { id: "f24", name: "Coffee, black", serving: "1 cup", kcal: 2, protein: 0, carbs: 0, fat: 0 },
  { id: "f25", name: "Latte, whole milk", serving: "12 oz", kcal: 180, protein: 9, carbs: 15, fat: 9 },
  { id: "f26", name: "Blueberries", serving: "0.5 cup", kcal: 42, protein: 1, carbs: 11, fat: 0 },
  { id: "f27", name: "Spinach, raw", serving: "1 cup", kcal: 7, protein: 1, carbs: 1, fat: 0 },
  { id: "f28", name: "Spaghetti, cooked", serving: "1 cup", kcal: 221, protein: 8, carbs: 43, fat: 1 },
  { id: "f29", name: "Ground turkey, cooked", serving: "100 g", kcal: 203, protein: 27, carbs: 0, fat: 10 },
  { id: "f30", name: "Sirloin steak, cooked", serving: "100 g", kcal: 244, protein: 27, carbs: 0, fat: 15 },
];

// Grocery categories
const CAT = {
  Produce: { emoji: "🥦", words: ["spinach", "broccoli", "banana", "berry", "blueberr", "lemon", "lime", "garlic", "onion", "pepper", "avocado", "tomato", "potato", "lettuce", "romaine", "cucumber", "asparagus", "parsley", "corn"] },
  Protein: { emoji: "🍗", words: ["chicken", "salmon", "shrimp", "tofu", "turkey", "steak", "beef", "egg", "bean", "chickpea"] },
  Dairy: { emoji: "🧀", words: ["yogurt", "milk", "cheese", "feta", "parmesan", "cheddar", "butter"] },
  Pantry: { emoji: "🫙", words: ["rice", "oat", "pasta", "spaghetti", "bread", "oil", "peanut", "soy", "honey", "maple", "syrup", "granola", "chia", "sesame", "crouton", "salsa", "teriyaki", "caesar", "dressing", "powder"] },
};
const categoryOf = (name) => {
  const n = name.toLowerCase();
  for (const [cat, { words }] of Object.entries(CAT)) if (words.some((w) => n.includes(w))) return cat;
  return "Other";
};
const CAT_ORDER = ["Produce", "Protein", "Dairy", "Pantry", "Other"];
const catEmoji = (c) => (CAT[c] ? CAT[c].emoji : "🛒");

// fictional delivery partners (rename / replace with real integrations when you ship)
const PROVIDERS = [
  { id: "carthop", name: "CartHop", emoji: "🛒" },
  { id: "freshdash", name: "FreshDash", emoji: "🚚" },
  { id: "pantryrun", name: "PantryRun", emoji: "🧺" },
];

/* ---- initial weight history (relative to today so it always looks current) ---- */
const seedWeights = () => {
  const out = [];
  const base = 178;
  for (let i = 28; i >= 0; i -= 4) {
    out.push({ date: addDays(todayISO(), -i), weight: +(base - (28 - i) * 0.22 + (Math.random() - 0.5) * 0.8).toFixed(1) });
  }
  return out;
};

const seedDiary = () => {
  const t = todayISO();
  return {
    [t]: {
      breakfast: [
        { id: uid(), name: "Greek yogurt, plain", qty: "1 cup", kcal: 130, protein: 22, carbs: 8, fat: 0 },
        { id: uid(), name: "Blueberries", qty: "0.5 cup", kcal: 42, protein: 1, carbs: 11, fat: 0 },
        { id: uid(), name: "Coffee, black", qty: "1 cup", kcal: 2, protein: 0, carbs: 0, fat: 0 },
      ],
      lunch: [
        { id: uid(), name: "Grilled Chicken Caesar", qty: "1 serving", kcal: 420, protein: 38, carbs: 14, fat: 23 },
      ],
      dinner: [],
      snack: [
        { id: uid(), name: "Almonds", qty: "28 g", kcal: 164, protein: 6, carbs: 6, fat: 14 },
      ],
    },
  };
};

const seedPlan = () => {
  const t = todayISO();
  return {
    [t]: { breakfast: ["r1"], lunch: ["r4"], dinner: ["r5"], snack: ["r11"] },
    [addDays(t, 1)]: { breakfast: ["r3"], lunch: ["r12"], dinner: ["r10"], snack: [] },
    [addDays(t, 2)]: { breakfast: ["r2"], lunch: ["r6"], dinner: ["r9"], snack: [] },
  };
};

const initialState = {
  goals: { kcal: 2100, protein: 150, carbs: 210, fat: 65 },
  profile: { name: "You", units: "imperial", startWeight: 178, goalWeight: 168 },
  diary: seedDiary(),
  plan: seedPlan(),
  weights: seedWeights(),
  grocery: [], // {id, name, qty, unit, checked, source}
  connected: [], // provider ids "connected" in this demo
};

/* ============================================================================
   PURE HELPERS
============================================================================ */
const sumEntries = (arr = []) =>
  arr.reduce((a, e) => ({ kcal: a.kcal + e.kcal, protein: a.protein + e.protein, carbs: a.carbs + e.carbs, fat: a.fat + e.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 });

const dayTotals = (day = {}) => {
  const all = MEALS.flatMap((m) => day[m.key] || []);
  return sumEntries(all);
};

const recipeToEntry = (r) => ({ id: uid(), name: r.name, qty: "1 serving", kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat });

const fmtQty = (q) => {
  if (Number.isInteger(q)) return String(q);
  const frac = { 0.25: "¼", 0.5: "½", 0.75: "¾", 0.33: "⅓", 0.67: "⅔" };
  const whole = Math.floor(q);
  const rem = +(q - whole).toFixed(2);
  if (frac[rem]) return whole ? `${whole}${frac[rem]}` : frac[rem];
  return String(+q.toFixed(2));
};

const extractJSON = (text) => {
  if (!text) return null;
  let t = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const firstObj = t.indexOf("{"), firstArr = t.indexOf("[");
  let start = -1, open = "{", close = "}";
  if (firstArr !== -1 && (firstArr < firstObj || firstObj === -1)) { start = firstArr; open = "["; close = "]"; }
  else if (firstObj !== -1) { start = firstObj; }
  if (start === -1) return null;
  let depth = 0, end = -1;
  for (let i = start; i < t.length; i++) {
    if (t[i] === open) depth++;
    else if (t[i] === close) { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return null;
  try { return JSON.parse(t.slice(start, end + 1)); } catch { return null; }
};

async function callClaude(userContent, system, maxTokens = 1024) {
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
async function lookupBarcode(code) {
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
async function searchUSDA(query) {
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

// Natural-language parsing via Nutritionix (through the dev proxy) — used as a
// fallback when the Claude estimate is unavailable or fails.
async function parseNutritionix(text) {
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

/* ============================================================================
   SMALL UI PRIMITIVES
============================================================================ */
const Ring = ({ size = 132, stroke = 12, pct = 0, color = C.apricot, track = "#FFFFFF33", children }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - clamped)} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
};

const MacroBar = ({ label, val, goal, color }) => {
  const pct = goal ? Math.min(1, val / goal) : 0;
  return (
    <div style={{ flex: 1 }}>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3 }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums" }}>
          {Math.round(val)}<span style={{ color: C.inkSoft, fontWeight: 600 }}>/{goal}g</span>
        </span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: C.line, overflow: "hidden" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: color, borderRadius: 99, transition: "width .5s" }} />
      </div>
    </div>
  );
};

const Pill = ({ active, children, onClick, color = C.ever }) => (
  <button onClick={onClick}
    style={{
      padding: "7px 14px", borderRadius: 99, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
      border: `1.5px solid ${active ? color : C.line}`, background: active ? color : C.surface,
      color: active ? "#fff" : C.inkSoft, cursor: "pointer", transition: "all .15s",
    }}>
    {children}
  </button>
);

const Sheet = ({ open, onClose, children, title, big }) => {
  if (!open) return null;
  return (
    <div onClick={onClose}
      style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(20,30,24,.45)", display: "flex", alignItems: "flex-end", backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          background: C.canvas, width: "100%", borderTopLeftRadius: 26, borderTopRightRadius: 26,
          maxHeight: big ? "92%" : "82%", display: "flex", flexDirection: "column",
          boxShadow: "0 -10px 40px rgba(0,0,0,.25)", animation: "plSheet .28s cubic-bezier(.16,1,.3,1)",
        }}>
        <div style={{ padding: "14px 18px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.ink }}>{title}</div>
          <button onClick={onClose} style={{ border: "none", background: C.surface, borderRadius: 99, width: 32, height: 32, display: "grid", placeItems: "center", cursor: "pointer", color: C.inkSoft }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: "4px 18px 24px" }}>{children}</div>
      </div>
    </div>
  );
};

/* ============================================================================
   BARCODE SCANNER — live camera scan via the native BarcodeDetector API, with a
   manual-entry fallback for browsers that don't support it (Safari/Firefox).
============================================================================ */
const BarcodeScanner = ({ onDetect }) => {
  const videoRef = useRef(null);
  const cbRef = useRef(onDetect);
  cbRef.current = onDetect;
  const [supported] = useState(() => typeof window !== "undefined" && "BarcodeDetector" in window);
  const [camErr, setCamErr] = useState("");
  const [manual, setManual] = useState("");

  useEffect(() => {
    if (!supported) return;
    let stream, timer, stopped = false, detector, busy = false, last = null;
    (async () => {
      try {
        detector = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
        });
      } catch { setCamErr("Live scanning isn't available here — enter the number below."); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        const v = videoRef.current;
        if (v) { v.srcObject = stream; await v.play().catch(() => {}); }
      } catch { setCamErr("Camera unavailable — enter the barcode number below."); return; }
      timer = setInterval(async () => {
        if (stopped || busy) return;
        const v = videoRef.current;
        if (!v || v.readyState < 2) return;
        busy = true;
        try {
          const codes = await detector.detect(v);
          if (codes && codes.length) {
            const c = codes[0].rawValue;
            if (c && c !== last) { last = c; cbRef.current && cbRef.current(c); }
          }
        } catch {} finally { busy = false; }
      }, 350);
    })();
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [supported]);

  const submitManual = () => { if (manual.trim()) cbRef.current && cbRef.current(manual.trim()); };

  return (
    <div>
      {supported && !camErr && (
        <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: `1px solid ${C.line}`, background: "#000", aspectRatio: "4 / 3" }}>
          <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
            <div style={{ width: "78%", height: 84, border: "2px solid rgba(255,255,255,.9)", borderRadius: 12, boxShadow: "0 0 0 9999px rgba(0,0,0,.18)" }} />
          </div>
          <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", color: "#fff", fontSize: 12, fontWeight: 600, textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>
            Point your camera at a barcode
          </div>
        </div>
      )}
      {camErr && <div style={errBox}>{camErr}</div>}
      {!supported && !camErr && (
        <div style={{ ...errBox, background: C.leafSoft, color: C.ever2 }}>
          Live camera scanning isn't supported in this browser. Type the barcode number below instead.
        </div>
      )}
      <div className="flex" style={{ gap: 8, marginTop: 12 }}>
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value.replace(/[^\d]/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && submitManual()}
          placeholder="Enter barcode number"
          inputMode="numeric"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={submitManual} disabled={!manual.trim()} style={{ ...miniAction, flex: "0 0 auto", padding: "10px 16px", opacity: manual.trim() ? 1 : 0.5 }}>
          <Search size={15} /> Look up
        </button>
      </div>
    </div>
  );
};

/* ============================================================================
   MAIN APP
============================================================================ */
function MainApp({ session }) {
  const userId = session?.user?.id || null;
  const [state, setState] = useState(initialState);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("today");
  const [toast, setToast] = useState(null);

  // Today
  const [selDate, setSelDate] = useState(todayISO());
  // Plan
  const [weekStart, setWeekStart] = useState(mondayOf(todayISO()));
  // Recipes
  const [recipeFilter, setRecipeFilter] = useState("All");
  const [recipeSearch, setRecipeSearch] = useState("");

  // modal: { type, ... }
  const [modal, setModal] = useState(null);

  // transient inputs (lifted to avoid focus loss)
  const [foodSearch, setFoodSearch] = useState("");
  const [foodResults, setFoodResults] = useState([]);
  const [foodBusy, setFoodBusy] = useState(false);
  const [manual, setManual] = useState({ name: "", qty: "1 serving", kcal: "", protein: "", carbs: "", fat: "" });

  // Debounced USDA FoodData Central search while the Add modal is open.
  useEffect(() => {
    if (modal?.type !== "add") return;
    const q = foodSearch.trim();
    if (q.length < 2) { setFoodResults([]); setFoodBusy(false); return; }
    setFoodBusy(true);
    const t = setTimeout(async () => {
      try { setFoodResults(await searchUSDA(q)); }
      catch { setFoodResults([]); }
      finally { setFoodBusy(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [foodSearch, modal?.type]);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResults, setAiResults] = useState(null);
  const [aiError, setAiError] = useState("");
  const [listening, setListening] = useState(false);
  const [scanMode, setScanMode] = useState("meal");
  const [scanImg, setScanImg] = useState(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState("");
  const [newItem, setNewItem] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [goalDraft, setGoalDraft] = useState(state.goals);
  const recogRef = useRef(null);
  const fileRef = useRef(null);
  const saveTimer = useRef(null);

  const flash = (msg) => { setToast(msg); clearTimeout(window.__t); window.__t = setTimeout(() => setToast(null), 2200); };

  /* ---- font injection ---- */
  useEffect(() => {
    const id = "pl-font";
    if (!document.getElementById(id)) {
      const l = document.createElement("link");
      l.id = id; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  const storageKey = userId ? `plately:state:${userId}` : "plately:state:v1";

  /* ---- load persisted state: localStorage cache first, then Supabase (authoritative) ---- */
  useEffect(() => {
    let cancel = false;
    const apply = (parsed) => {
      if (cancel || !parsed) return;
      setState({ ...initialState, ...parsed });
      if (parsed.goals) setGoalDraft(parsed.goals);
    };
    (async () => {
      setLoaded(false);
      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) apply(JSON.parse(cached));
      } catch { /* no cache */ }
      if (supabase && userId) {
        try {
          const { data, error } = await supabase.from("app_state").select("data").eq("user_id", userId).maybeSingle();
          if (!cancel && !error && data?.data) {
            apply(data.data);
          } else if (!cancel && !error && !data) {
            // First sign-in for this account — seed the display name from auth metadata.
            const nm = session?.user?.user_metadata?.name;
            if (nm) setState((s) => ({ ...s, profile: { ...s.profile, name: nm } }));
          }
        } catch { /* offline — keep cached/in-memory state */ }
      }
      if (!cancel) setLoaded(true);
    })();
    return () => { cancel = true; };
  }, [userId]);

  /* ---- persist (debounced): localStorage always, Supabase when signed in ---- */
  useEffect(() => {
    if (!loaded) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* quota */ }
      if (supabase && userId) {
        try {
          await supabase.from("app_state").upsert({ user_id: userId, data: state, updated_at: new Date().toISOString() });
        } catch { /* offline — will resync on next change */ }
      }
    }, 700);
  }, [state, loaded, userId, storageKey]);

  const mutate = (fn) => setState((prev) => { const next = JSON.parse(JSON.stringify(prev)); fn(next); return next; });
  const recipeById = (id) => RECIPES.find((r) => r.id === id);

  /* ---- diary actions ---- */
  const ensureDay = (s, d) => { if (!s.diary[d]) s.diary[d] = { breakfast: [], lunch: [], dinner: [], snack: [] }; };
  const addEntry = (date, meal, entry) => mutate((s) => { ensureDay(s, date); s.diary[date][meal].push({ ...entry, id: uid() }); });
  const removeEntry = (date, meal, id) => mutate((s) => { ensureDay(s, date); s.diary[date][meal] = s.diary[date][meal].filter((e) => e.id !== id); });

  const logPlannedDay = (date) => {
    const plan = state.plan[date];
    if (!plan) return;
    mutate((s) => {
      ensureDay(s, date);
      MEALS.forEach((m) => {
        (plan[m.key] || []).forEach((rid) => { const r = recipeById(rid); if (r) s.diary[date][m.key].push(recipeToEntry(r)); });
      });
    });
    flash("Logged your planned meals");
  };

  /* ---- plan actions ---- */
  const addToPlan = (date, meal, recipeId) => { mutate((s) => { if (!s.plan[date]) s.plan[date] = { breakfast: [], lunch: [], dinner: [], snack: [] }; s.plan[date][meal].push(recipeId); }); };
  const removeFromPlan = (date, meal, idx) => mutate((s) => { s.plan[date][meal].splice(idx, 1); });

  /* ---- grocery ---- */
  const buildGroceryFromWeek = () => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const map = {}; // key name|unit -> {name, qty, unit}
    days.forEach((d) => {
      const plan = state.plan[d]; if (!plan) return;
      MEALS.forEach((m) => (plan[m.key] || []).forEach((rid) => {
        const r = recipeById(rid); if (!r) return;
        r.ingredients.forEach((ing) => {
          const key = `${ing.name.toLowerCase()}|${ing.unit}`;
          if (!map[key]) map[key] = { name: ing.name, qty: 0, unit: ing.unit };
          map[key].qty += ing.qty;
        });
      }));
    });
    mutate((s) => {
      const manualItems = s.grocery.filter((g) => g.source === "manual");
      const autoItems = Object.values(map).map((m) => ({ id: uid(), name: m.name, qty: +m.qty.toFixed(2), unit: m.unit, checked: false, source: "plan" }));
      s.grocery = [...autoItems, ...manualItems];
    });
    flash("Grocery list built from your week");
  };
  const toggleGrocery = (id) => mutate((s) => { const it = s.grocery.find((g) => g.id === id); if (it) it.checked = !it.checked; });
  const addGrocery = (name) => { if (!name.trim()) return; mutate((s) => s.grocery.push({ id: uid(), name: name.trim(), qty: 1, unit: "", checked: false, source: "manual" })); setNewItem(""); };
  const removeGrocery = (id) => mutate((s) => { s.grocery = s.grocery.filter((g) => g.id !== id); });
  const clearChecked = () => mutate((s) => { s.grocery = s.grocery.filter((g) => !g.checked); });

  /* ---- weight ---- */
  const logWeight = () => {
    const w = parseFloat(weightInput);
    if (!w || w <= 0) return;
    mutate((s) => {
      const t = todayISO();
      const existing = s.weights.find((x) => x.date === t);
      if (existing) existing.weight = w; else s.weights.push({ date: t, weight: w });
      s.weights.sort((a, b) => (a.date < b.date ? -1 : 1));
    });
    setWeightInput("");
    flash("Weight logged");
  };

  /* ---- share ---- */
  const share = async (title, text) => {
    try {
      if (navigator.share) { await navigator.share({ title, text }); flash("Shared"); return; }
    } catch { /* user cancelled or unsupported */ }
    try { await navigator.clipboard.writeText(text); flash("Copied to clipboard"); }
    catch { flash("Copy not available here"); }
  };
  const shareRecipe = (r) => {
    const ing = r.ingredients.map((i) => `• ${fmtQty(i.qty)}${i.unit ? " " + i.unit : ""} ${i.name}`).join("\n");
    const steps = r.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
    share(r.name, `${r.name} — via ${BRAND}\n${r.kcal} kcal · ${r.protein}P / ${r.carbs}C / ${r.fat}F per serving\n\nIngredients\n${ing}\n\nSteps\n${steps}`);
  };
  const shareGrocery = () => {
    if (!state.grocery.length) { flash("Your list is empty"); return; }
    const byCat = {};
    state.grocery.forEach((g) => { (byCat[categoryOf(g.name)] ||= []).push(g); });
    const txt = CAT_ORDER.filter((c) => byCat[c]).map((c) =>
      `${c}\n` + byCat[c].map((g) => `• ${g.name}${g.unit || (g.qty && g.qty !== 1) ? ` (${fmtQty(g.qty)}${g.unit ? " " + g.unit : ""})` : ""}`).join("\n")
    ).join("\n\n");
    share(`${BRAND} grocery list`, `${BRAND} grocery list\n\n${txt}`);
  };

  /* ---- export report ---- */
  const downloadReport = () => {
    const rows = [["Date", "Weight", "Calories", "Protein_g", "Carbs_g", "Fat_g", "Goal_kcal", "Goal_P", "Goal_C", "Goal_F"]];
    const dates = new Set([...state.weights.map((w) => w.date), ...Object.keys(state.diary)]);
    [...dates].sort().forEach((d) => {
      const w = state.weights.find((x) => x.date === d);
      const t = dayTotals(state.diary[d]);
      rows.push([d, w ? w.weight : "", state.diary[d] ? Math.round(t.kcal) : "", state.diary[d] ? Math.round(t.protein) : "",
        state.diary[d] ? Math.round(t.carbs) : "", state.diary[d] ? Math.round(t.fat) : "",
        state.goals.kcal, state.goals.protein, state.goals.carbs, state.goals.fat]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${BRAND.toLowerCase()}-progress-report.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    flash("Progress report downloaded");
  };

  /* ---- AI: natural-language / voice logging ---- */
  const runAILog = async () => {
    if (!aiText.trim()) return;
    const text = aiText.trim();
    setAiBusy(true); setAiError(""); setAiResults(null);
    try {
      const sys = `You are a careful nutrition estimator for a food-logging app. The user describes what they ate in plain language. Return ONLY a JSON array (no prose, no markdown fences). Each element: {"name": string, "qty": string (e.g. "1 cup", "2 eggs", "1 serving"), "kcal": number, "protein": number, "carbs": number, "fat": number}. Use realistic values for typical servings. Round to whole numbers. If a quantity is unclear, assume one normal serving.`;
      const txt = await callClaude(text, sys, 1024);
      const parsed = extractJSON(txt);
      if (!Array.isArray(parsed) || !parsed.length) throw new Error("no items");
      setAiResults(parsed.map((p) => ({
        id: uid(), name: String(p.name || "Item"), qty: String(p.qty || "1 serving"),
        kcal: Math.max(0, Math.round(+p.kcal || 0)), protein: Math.max(0, Math.round(+p.protein || 0)),
        carbs: Math.max(0, Math.round(+p.carbs || 0)), fat: Math.max(0, Math.round(+p.fat || 0)),
      })));
    } catch (primaryErr) {
      // Fall back to Nutritionix natural-language parsing.
      try {
        const items = await parseNutritionix(text);
        setAiResults(items);
      } catch (fallbackErr) {
        const noClaude = /api[_ ]?key/i.test(primaryErr?.message || "");
        const noNix = /not configured/i.test(fallbackErr?.message || "");
        if (noClaude && noNix) {
          setAiError("Natural-language logging needs either an Anthropic API key or Nutritionix keys in .env. Add one and restart the dev server.");
        } else {
          setAiError("Couldn't estimate that automatically. You can add items manually, or rephrase and try again.");
        }
      }
    } finally { setAiBusy(false); }
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setAiError("Voice input isn't available in this preview — type below instead. (Mic works in the published app.)"); return; }
    try {
      const rec = new SR();
      rec.lang = "en-US"; rec.interimResults = true; rec.continuous = false;
      rec.onresult = (e) => { const t = Array.from(e.results).map((r) => r[0].transcript).join(" "); setAiText(t); };
      rec.onend = () => setListening(false);
      rec.onerror = () => { setListening(false); setAiError("Microphone unavailable here — type below instead."); };
      recogRef.current = rec; setListening(true); setAiError(""); rec.start();
    } catch { setListening(false); setAiError("Microphone unavailable here — type below instead."); }
  };
  const stopVoice = () => { try { recogRef.current && recogRef.current.stop(); } catch {} setListening(false); };

  const commitAIResults = () => {
    const { date, meal } = modal;
    mutate((s) => { ensureDay(s, date); aiResults.forEach((r) => s.diary[date][meal].push({ ...r, id: uid() })); });
    closeModal(); flash(`Logged ${aiResults.length} item${aiResults.length > 1 ? "s" : ""}`);
  };

  /* ---- AI: photo scan (meal or product label) ---- */
  const onPickImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setScanImg({ dataUrl: reader.result, media: file.type || "image/jpeg" }); setScanResult(null); setScanError(""); };
    reader.readAsDataURL(file);
  };
  const runScan = async () => {
    if (!scanImg) return;
    setScanBusy(true); setScanError(""); setScanResult(null);
    try {
      const b64 = scanImg.dataUrl.split(",")[1];
      const sys = scanMode === "product"
        ? `You read packaged-food labels. Identify the product and read its Nutrition Facts. Return ONLY JSON (no markdown): {"name": string, "qty": string (the serving size shown), "kcal": number, "protein": number, "carbs": number, "fat": number}. If the label isn't fully legible, give your best estimate.`
        : `You estimate nutrition from a photo of a prepared meal. Identify the dish and estimate one plate/serving. Return ONLY JSON (no markdown): {"name": string, "qty": "1 serving", "kcal": number, "protein": number, "carbs": number, "fat": number}.`;
      const txt = await callClaude(
        [
          { type: "image", source: { type: "base64", media_type: scanImg.media, data: b64 } },
          { type: "text", text: scanMode === "product" ? "Read this product label and return the JSON." : "Identify this meal and return the JSON." },
        ], sys, 700);
      const p = extractJSON(txt);
      if (!p || typeof p !== "object") throw new Error("parse");
      setScanResult({
        id: uid(), name: String(p.name || "Scanned item"), qty: String(p.qty || "1 serving"),
        kcal: Math.max(0, Math.round(+p.kcal || 0)), protein: Math.max(0, Math.round(+p.protein || 0)),
        carbs: Math.max(0, Math.round(+p.carbs || 0)), fat: Math.max(0, Math.round(+p.fat || 0)),
      });
    } catch (e) {
      if (/api[_ ]?key/i.test(e?.message || "")) {
        setScanError("AI photo scan needs an Anthropic API key. Add it to the .env file and restart the dev server.");
      } else {
        setScanError("Couldn't read that image. Try a clearer, closer photo — or add the item manually.");
      }
    } finally { setScanBusy(false); }
  };

  // Barcode flow: a scanned/typed code -> Open Food Facts lookup -> editable result.
  const runBarcode = async (code) => {
    if (scanBusy) return;
    setScanBusy(true); setScanError("");
    try {
      const result = await lookupBarcode(code);
      setScanResult(result);
    } catch (e) {
      if (e?.code === "notfound") {
        setScanError(`No product found for barcode ${String(code).replace(/\D/g, "")}. Try the label-photo tab or add it manually.`);
      } else if (e?.code === "empty") {
        setScanError("Enter a barcode number to look up.");
      } else {
        setScanError("Couldn't reach the product database. Check your connection and try again.");
      }
    } finally { setScanBusy(false); }
  };
  const commitScan = () => {
    const { date, meal } = modal;
    addEntry(date, meal, scanResult);
    closeModal(); flash("Logged from scan");
  };

  /* ---- delivery sync (simulated) ---- */
  const [syncState, setSyncState] = useState({ provider: null, status: "idle" }); // idle|connecting|sending|done
  const connectProvider = (p) => {
    setSyncState({ provider: p, status: "connecting" });
    setTimeout(() => {
      mutate((s) => { if (!s.connected.includes(p.id)) s.connected.push(p.id); });
      setSyncState({ provider: p, status: "connected" });
    }, 1100);
  };
  const sendToProvider = (p) => {
    setSyncState({ provider: p, status: "sending" });
    setTimeout(() => setSyncState({ provider: p, status: "done" }), 1400);
  };

  /* ---- modal helpers ---- */
  const openAdd = (date, meal) => { setFoodSearch(""); setManual({ name: "", qty: "1 serving", kcal: "", protein: "", carbs: "", fat: "" }); setModal({ type: "add", date, meal }); };
  const openAI = (date, meal) => { setAiText(""); setAiResults(null); setAiError(""); setModal({ type: "ai", date, meal }); };
  const openScan = (date, meal) => { setScanImg(null); setScanResult(null); setScanError(""); setScanMode("meal"); setModal({ type: "scan", date, meal }); };
  const openRecipe = (id) => setModal({ type: "recipe", id });
  const openPlanPicker = (date, meal) => { setRecipeFilter("All"); setRecipeSearch(""); setModal({ type: "planpick", date, meal }); };
  const openDelivery = () => { setSyncState({ provider: null, status: "idle" }); setModal({ type: "delivery" }); };
  const openQuickAdd = () => setModal({ type: "quick" });
  const closeModal = () => { setModal(null); stopVoice(); };

  const todayDiary = state.diary[selDate] || { breakfast: [], lunch: [], dinner: [], snack: [] };
  const totals = dayTotals(todayDiary);
  const remaining = Math.round(state.goals.kcal - totals.kcal);

  /* =========================================================================
     SCREEN: TODAY
  ========================================================================= */
  const renderToday = () => {
    const planExists = !!state.plan[selDate] && MEALS.some((m) => (state.plan[selDate][m.key] || []).length);
    return (
      <div>
        {/* evergreen hero */}
        <div style={{ background: `linear-gradient(160deg, ${C.ever} 0%, ${C.ever2} 100%)`, padding: "16px 18px 26px", color: "#fff", position: "relative" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <button onClick={() => setSelDate(addDays(selDate, -1))} style={navBtn}><ChevronLeft size={20} /></button>
            <button onClick={() => setSelDate(todayISO())} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{relDay(selDate)}</div>
              <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 600 }}>{niceDate(selDate)}</div>
            </button>
            <button onClick={() => setSelDate(addDays(selDate, 1))} style={navBtn}><ChevronRight size={20} /></button>
          </div>

          <div className="flex items-center" style={{ gap: 18 }}>
            <Ring pct={totals.kcal / state.goals.kcal} color={C.apricot} track="rgba(255,255,255,.18)">
              <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{Math.abs(remaining)}</div>
              <div style={{ fontSize: 10, opacity: 0.75, fontWeight: 700, letterSpacing: 0.5, marginTop: 2 }}>{remaining >= 0 ? "KCAL LEFT" : "OVER"}</div>
            </Ring>
            <div style={{ flex: 1 }}>
              <div className="flex justify-between" style={{ fontSize: 12, marginBottom: 10, opacity: 0.85 }}>
                <span><b style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(totals.kcal)}</b> eaten</span>
                <span><b style={{ fontVariantNumeric: "tabular-nums" }}>{state.goals.kcal}</b> goal</span>
              </div>
              <MacroRow totals={totals} goals={state.goals} light />
            </div>
          </div>

          {planExists && (
            <button onClick={() => logPlannedDay(selDate)}
              style={{ marginTop: 16, width: "100%", padding: "11px", borderRadius: 14, border: "none", cursor: "pointer",
                background: C.leaf, color: C.ever, fontWeight: 800, fontSize: 13.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Sparkles size={16} /> Log {relDay(selDate).toLowerCase()}’s planned meals
            </button>
          )}
        </div>

        {/* quick actions */}
        <div className="flex" style={{ gap: 10, padding: "16px 18px 4px" }}>
          <QuickAction icon={<Sparkles size={18} />} label="Describe" sub="or speak it" onClick={() => openAI(selDate, mealByHour())} />
          <QuickAction icon={<Camera size={18} />} label="Scan" sub="meal or label" onClick={() => openScan(selDate, mealByHour())} />
          <QuickAction icon={<Search size={18} />} label="Search" sub="food database" onClick={() => openAdd(selDate, mealByHour())} />
        </div>

        {/* meals */}
        <div style={{ padding: "8px 18px 24px" }}>
          {MEALS.map((m) => {
            const items = todayDiary[m.key] || [];
            const mt = sumEntries(items);
            return (
              <div key={m.key} style={cardStyle}>
                <div className="flex items-center justify-between" style={{ marginBottom: items.length ? 10 : 0 }}>
                  <div className="flex items-center" style={{ gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{m.emoji}</span>
                    <span style={{ fontWeight: 800, color: C.ink, fontSize: 15 }}>{m.label}</span>
                    {items.length > 0 && <span style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>· {Math.round(mt.kcal)} kcal</span>}
                  </div>
                  <button onClick={() => openAdd(selDate, m.key)} style={addBtn}><Plus size={16} /></button>
                </div>
                {items.map((e) => (
                  <div key={e.id} className="flex items-center justify-between" style={{ padding: "8px 0", borderTop: `1px solid ${C.line}` }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</div>
                      <div style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600 }}>{e.qty} · {e.protein}P / {e.carbs}C / {e.fat}F</div>
                    </div>
                    <div className="flex items-center" style={{ gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{e.kcal}</span>
                      <button onClick={() => removeEntry(selDate, m.key, e.id)} style={trashBtn}><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* =========================================================================
     SCREEN: PLAN
  ========================================================================= */
  const renderPlan = () => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const weekKcal = days.reduce((sum, d) => {
      const p = state.plan[d]; if (!p) return sum;
      return sum + MEALS.reduce((s, m) => s + (p[m.key] || []).reduce((a, rid) => a + (recipeById(rid)?.kcal || 0), 0), 0);
    }, 0);
    return (
      <div>
        <Header title="Meal planner" subtitle={`${shortDate(weekStart)} – ${shortDate(addDays(weekStart, 6))}`} />
        <div className="flex items-center justify-between" style={{ padding: "0 18px 12px" }}>
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} style={ghostBtn}><ChevronLeft size={18} /></button>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft }}>
            Planned this week: <b style={{ color: C.ever, fontVariantNumeric: "tabular-nums" }}>{Math.round(weekKcal).toLocaleString()}</b> kcal
          </div>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} style={ghostBtn}><ChevronRight size={18} /></button>
        </div>

        <div style={{ padding: "0 18px 14px" }}>
          {days.map((d) => {
            const p = state.plan[d] || {};
            const dk = MEALS.reduce((s, m) => s + (p[m.key] || []).reduce((a, rid) => a + (recipeById(rid)?.kcal || 0), 0), 0);
            const isToday = d === todayISO();
            return (
              <div key={d} style={{ ...cardStyle, padding: 0, overflow: "hidden", border: isToday ? `1.5px solid ${C.leaf}` : `1px solid ${C.line}` }}>
                <div className="flex items-center justify-between" style={{ padding: "11px 14px", background: isToday ? C.leafSoft : "#FAF9F3" }}>
                  <div style={{ fontWeight: 800, color: C.ink, fontSize: 14 }}>{relDay(d)}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, fontVariantNumeric: "tabular-nums" }}>{Math.round(dk)} kcal</div>
                </div>
                <div style={{ padding: "4px 14px 12px" }}>
                  {MEALS.map((m) => (
                    <div key={m.key} style={{ padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: 11, fontWeight: 800, color: C.inkSoft, letterSpacing: 0.4, textTransform: "uppercase" }}>{m.label}</span>
                        <button onClick={() => openPlanPicker(d, m.key)} style={{ ...addBtn, width: 24, height: 24 }}><Plus size={14} /></button>
                      </div>
                      {(p[m.key] || []).map((rid, idx) => {
                        const r = recipeById(rid); if (!r) return null;
                        return (
                          <div key={idx} className="flex items-center justify-between" style={{ marginTop: 6 }}>
                            <button onClick={() => openRecipe(r.id)} className="flex items-center" style={{ gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0, minWidth: 0 }}>
                              <span style={{ fontSize: 16 }}>{r.emoji}</span>
                              <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                            </button>
                            <button onClick={() => removeFromPlan(d, m.key, idx)} style={trashBtn}><X size={14} /></button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "0 18px 24px" }}>
          <button onClick={() => { buildGroceryFromWeek(); setTab("grocery"); }}
            style={primaryBtn}><ShoppingCart size={17} /> Build grocery list from this week</button>
        </div>
      </div>
    );
  };

  /* =========================================================================
     SCREEN: RECIPES
  ========================================================================= */
  const renderRecipes = () => {
    const q = recipeSearch.trim().toLowerCase();
    const list = RECIPES.filter((r) =>
      (recipeFilter === "All" || r.tags.includes(recipeFilter)) &&
      (!q || r.name.toLowerCase().includes(q) || r.tags.join(" ").toLowerCase().includes(q)));
    return (
      <div>
        <Header title="Recipes" subtitle="Tasty, goal-friendly meals" />
        <div style={{ padding: "0 18px 10px" }}>
          <SearchInput value={recipeSearch} onChange={setRecipeSearch} placeholder="Search recipes" />
        </div>
        <div className="flex" style={{ gap: 8, padding: "0 18px 12px", overflowX: "auto" }}>
          {["All", ...GOAL_TAGS].map((t) => <Pill key={t} active={recipeFilter === t} onClick={() => setRecipeFilter(t)}>{t}</Pill>)}
        </div>
        <div style={{ padding: "0 18px 24px" }}>
          {list.map((r) => (
            <button key={r.id} onClick={() => openRecipe(r.id)} style={{ ...cardStyle, width: "100%", textAlign: "left", cursor: "pointer", display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: r.bg, display: "grid", placeItems: "center", fontSize: 28, flexShrink: 0 }}>{r.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: C.ink, fontSize: 15 }}>{r.name}</div>
                <div className="flex items-center" style={{ gap: 8, marginTop: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.apricot, fontVariantNumeric: "tabular-nums" }}>{r.kcal} kcal</span>
                  <span style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600 }}>· {r.protein}P / {r.carbs}C / {r.fat}F</span>
                  <span className="flex items-center" style={{ gap: 3, fontSize: 11.5, color: C.inkSoft, fontWeight: 600 }}><Clock size={11} />{r.minutes}m</span>
                </div>
                <div className="flex" style={{ gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                  {r.tags.slice(0, 3).map((t) => <span key={t} style={tagStyle}>{t}</span>)}
                </div>
              </div>
            </button>
          ))}
          {!list.length && <Empty text="No recipes match that filter." />}
        </div>
      </div>
    );
  };

  /* =========================================================================
     SCREEN: GROCERY
  ========================================================================= */
  const renderGrocery = () => {
    const byCat = {};
    state.grocery.forEach((g) => { (byCat[categoryOf(g.name)] ||= []).push(g); });
    const total = state.grocery.length;
    const done = state.grocery.filter((g) => g.checked).length;
    return (
      <div>
        <Header title="Shop" subtitle={total ? `${done}/${total} gathered` : "Your grocery list"} />
        <div className="flex" style={{ gap: 8, padding: "0 18px 12px" }}>
          <input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGrocery(newItem)}
            placeholder="Add an item…" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={() => addGrocery(newItem)} style={{ ...addBtn, width: 40, height: 40, background: C.ever }}><Plus size={18} color="#fff" /></button>
        </div>

        {!total && (
          <div style={{ padding: "0 18px" }}>
            <Empty text="Nothing here yet. Plan some meals, then build your list — or add items above." />
            <button onClick={() => { buildGroceryFromWeek(); }} style={{ ...primaryBtn, marginTop: 4 }}><RefreshCw size={16} /> Build from this week’s plan</button>
          </div>
        )}

        {total > 0 && (
          <div style={{ padding: "0 18px 8px" }}>
            {CAT_ORDER.filter((c) => byCat[c]).map((c) => (
              <div key={c} style={{ marginBottom: 14 }}>
                <div className="flex items-center" style={{ gap: 7, margin: "4px 2px 8px" }}>
                  <span style={{ fontSize: 16 }}>{catEmoji(c)}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.inkSoft, letterSpacing: 0.4, textTransform: "uppercase" }}>{c}</span>
                </div>
                <div style={{ ...cardStyle, padding: "4px 14px" }}>
                  {byCat[c].map((g) => (
                    <div key={g.id} className="flex items-center justify-between" style={{ padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
                      <button onClick={() => toggleGrocery(g.id)} className="flex items-center" style={{ gap: 11, background: "none", border: "none", cursor: "pointer", padding: 0, flex: 1, minWidth: 0 }}>
                        <span style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${g.checked ? C.leaf : C.line}`, background: g.checked ? C.leaf : "transparent", display: "grid", placeItems: "center", flexShrink: 0 }}>
                          {g.checked && <Check size={14} color="#fff" />}
                        </span>
                        <span style={{ textAlign: "left", fontSize: 14, fontWeight: 600, color: g.checked ? C.inkSoft : C.ink, textDecoration: g.checked ? "line-through" : "none" }}>
                          {g.name}{(g.unit || (g.qty && g.qty !== 1)) ? <span style={{ color: C.inkSoft, fontWeight: 600 }}> · {fmtQty(g.qty)}{g.unit ? " " + g.unit : ""}</span> : null}
                        </span>
                      </button>
                      <button onClick={() => removeGrocery(g.id)} style={trashBtn}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex" style={{ gap: 10, marginTop: 6 }}>
              <button onClick={shareGrocery} style={{ ...secondaryBtn, flex: 1 }}><Share2 size={16} /> Share</button>
              {done > 0 && <button onClick={clearChecked} style={{ ...secondaryBtn, flex: 1 }}><Check size={16} /> Clear done</button>}
            </div>
            <button onClick={openDelivery} style={{ ...primaryBtn, marginTop: 10 }}><Send size={16} /> Send to grocery delivery</button>
            <p style={{ fontSize: 11, color: C.inkSoft, textAlign: "center", marginTop: 8 }}>
              Delivery partners are simulated in this preview.
            </p>
          </div>
        )}
      </div>
    );
  };

  /* =========================================================================
     SCREEN: PROGRESS
  ========================================================================= */
  const renderProgress = () => {
    const wData = state.weights.map((w) => ({ ...w, label: shortDate(w.date) }));
    const last7 = Array.from({ length: 7 }, (_, i) => addDays(todayISO(), -(6 - i))).map((d) => {
      const t = dayTotals(state.diary[d]);
      return { label: WD[fromISO(d).getDay()], kcal: state.diary[d] ? Math.round(t.kcal) : 0 };
    });
    const cur = state.weights.length ? state.weights[state.weights.length - 1].weight : state.profile.startWeight;
    const start = state.profile.startWeight, goal = state.profile.goalWeight;
    const lost = +(start - cur).toFixed(1);
    const unit = state.profile.units === "imperial" ? "lb" : "kg";
    const toGoal = +(cur - goal).toFixed(1);
    return (
      <div>
        <Header title="Progress" subtitle="Trends & reports" />
        <div style={{ padding: "0 18px 24px" }}>
          {/* stat tiles */}
          <div className="flex" style={{ gap: 10, marginBottom: 14 }}>
            <Stat label="Current" value={`${cur}`} unit={unit} />
            <Stat label={lost >= 0 ? "Lost" : "Gained"} value={`${Math.abs(lost)}`} unit={unit} accent={C.leaf} />
            <Stat label="To goal" value={`${Math.abs(toGoal)}`} unit={unit} accent={C.apricot} />
          </div>

          {/* weight chart */}
          <div style={{ ...cardStyle }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <span style={{ fontWeight: 800, color: C.ink, fontSize: 14 }}>Weight</span>
              <span style={{ fontSize: 11, color: C.inkSoft, fontWeight: 700 }}>Goal {goal} {unit}</span>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={wData} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.ever2} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={C.ever2} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.inkSoft }} tickLine={false} axisLine={false} />
                <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 10, fill: C.inkSoft }} tickLine={false} axisLine={false} width={34} />
                <Tooltip contentStyle={tipStyle} labelStyle={{ color: C.inkSoft, fontSize: 11 }} />
                <ReferenceLine y={goal} stroke={C.apricot} strokeDasharray="4 4" />
                <Area type="monotone" dataKey="weight" stroke={C.ever2} strokeWidth={2.5} fill="url(#wg)" dot={{ r: 3, fill: C.ever2 }} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex" style={{ gap: 8, marginTop: 8 }}>
              <input value={weightInput} onChange={(e) => setWeightInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && logWeight()}
                inputMode="decimal" placeholder={`Today’s weight (${unit})`} style={{ ...inputStyle, flex: 1 }} />
              <button onClick={logWeight} style={{ ...addBtn, width: 40, height: 40, background: C.ever }}><Plus size={18} color="#fff" /></button>
            </div>
          </div>

          {/* calories last 7 days */}
          <div style={{ ...cardStyle }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <span style={{ fontWeight: 800, color: C.ink, fontSize: 14 }}>Calories · last 7 days</span>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={last7} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.inkSoft }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.inkSoft }} tickLine={false} axisLine={false} width={34} />
                <Tooltip contentStyle={tipStyle} cursor={{ fill: C.leafSoft }} />
                <ReferenceLine y={state.goals.kcal} stroke={C.ever2} strokeDasharray="4 4" />
                <Bar dataKey="kcal" radius={[6, 6, 0, 0]}>
                  {last7.map((d, i) => <Cell key={i} fill={d.kcal > state.goals.kcal ? C.apricot : C.leaf} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <button onClick={downloadReport} style={primaryBtn}><Download size={17} /> Download progress report (CSV)</button>
          <button onClick={() => setModal({ type: "settings" })} style={{ ...secondaryBtn, marginTop: 10 }}><Settings size={16} /> Goals & settings</button>
        </div>
      </div>
    );
  };

  /* =========================================================================
     MODALS
  ========================================================================= */
  const renderAddModal = () => {
    const q = foodSearch.trim().toLowerCase();
    const local = q ? FOODS.filter((f) => f.name.toLowerCase().includes(q)) : FOODS.slice(0, 8);
    const localNames = new Set(local.map((f) => f.name.toLowerCase()));
    const remote = foodResults.filter((f) => !localNames.has(f.name.toLowerCase()));
    const results = [...local, ...remote].slice(0, 40);
    const mealLabel = MEALS.find((m) => m.key === modal.meal)?.label;
    const canManual = manual.name.trim() && manual.kcal !== "";
    return (
      <Sheet open title={`Add to ${mealLabel}`} onClose={closeModal} big>
        <div className="flex" style={{ gap: 8, marginBottom: 12 }}>
          <button onClick={() => { closeModal(); openAI(modal.date, modal.meal); }} style={miniAction}><Sparkles size={15} /> Describe / speak</button>
          <button onClick={() => { closeModal(); openScan(modal.date, modal.meal); }} style={miniAction}><Camera size={15} /> Scan</button>
        </div>
        <SearchInput value={foodSearch} onChange={setFoodSearch} placeholder="Search foods (USDA database)" />
        <div style={{ marginTop: 10 }}>
          {results.map((f) => (
            <button key={f.id} onClick={() => { addEntry(modal.date, modal.meal, { name: f.name, qty: f.serving, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat }); flash(`Added ${f.name}`); }}
              style={{ ...rowBtn }}>
              <div style={{ minWidth: 0 }}>
                <div className="flex items-center" style={{ gap: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                  {f.source === "USDA" && <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 800, color: C.ever2, background: C.leafSoft, borderRadius: 5, padding: "1px 5px", letterSpacing: 0.3 }}>USDA</span>}
                </div>
                <div style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600 }}>{f.serving} · {f.protein}P / {f.carbs}C / {f.fat}F</div>
              </div>
              <div className="flex items-center" style={{ gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{f.kcal}</span>
                <span style={{ ...addBtn, background: C.leafSoft }}><Plus size={15} color={C.ever} /></span>
              </div>
            </button>
          ))}
          {foodBusy && (
            <div className="flex items-center" style={{ gap: 8, padding: "10px 4px", color: C.inkSoft, fontSize: 12.5, fontWeight: 600 }}>
              <Loader2 size={15} className="pl-spin" /> Searching USDA database…
            </div>
          )}
          {!foodBusy && q.length >= 2 && !results.length && (
            <div style={{ padding: "10px 4px", color: C.inkSoft, fontSize: 12.5, fontWeight: 600 }}>No matches — try the quick-add below.</div>
          )}
        </div>

        <div style={{ marginTop: 16, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.inkSoft, letterSpacing: 0.3, marginBottom: 10 }}>QUICK ADD CUSTOM</div>
          <input value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} placeholder="Name" style={{ ...inputStyle, width: "100%", marginBottom: 8 }} />
          <input value={manual.qty} onChange={(e) => setManual({ ...manual, qty: e.target.value })} placeholder="Serving (e.g. 1 cup)" style={{ ...inputStyle, width: "100%", marginBottom: 8 }} />
          <div className="flex" style={{ gap: 8, marginBottom: 12 }}>
            {["kcal", "protein", "carbs", "fat"].map((k) => (
              <input key={k} value={manual[k]} onChange={(e) => setManual({ ...manual, [k]: e.target.value.replace(/[^\d.]/g, "") })}
                inputMode="numeric" placeholder={k === "kcal" ? "kcal" : k[0].toUpperCase()} style={{ ...inputStyle, width: 0, flex: 1, textAlign: "center" }} />
            ))}
          </div>
          <button disabled={!canManual} onClick={() => {
            addEntry(modal.date, modal.meal, { name: manual.name.trim(), qty: manual.qty || "1 serving", kcal: +manual.kcal || 0, protein: +manual.protein || 0, carbs: +manual.carbs || 0, fat: +manual.fat || 0 });
            flash("Added"); closeModal();
          }} style={{ ...primaryBtn, opacity: canManual ? 1 : 0.45 }}>Add to {mealLabel}</button>
        </div>
      </Sheet>
    );
  };

  const renderAIModal = () => {
    const mealLabel = MEALS.find((m) => m.key === modal.meal)?.label;
    return (
      <Sheet open title="Describe what you ate" onClose={closeModal} big>
        <p style={{ fontSize: 13, color: C.inkSoft, marginBottom: 12, lineHeight: 1.45 }}>
          Speak or type naturally — “two scrambled eggs, a slice of toast and a flat white.” {BRAND} estimates the macros for you.
        </p>
        <div style={{ position: "relative" }}>
          <textarea value={aiText} onChange={(e) => setAiText(e.target.value)} rows={3} placeholder="What did you eat?"
            style={{ ...inputStyle, width: "100%", resize: "none", paddingRight: 48, lineHeight: 1.4 }} />
          <button onClick={listening ? stopVoice : startVoice}
            style={{ position: "absolute", right: 8, bottom: 8, width: 36, height: 36, borderRadius: 99, border: "none", cursor: "pointer",
              background: listening ? C.fat || "#D86A6A" : C.leafSoft, color: listening ? "#fff" : C.ever, display: "grid", placeItems: "center" }}>
            <Mic size={17} />
          </button>
        </div>
        {listening && <div style={{ fontSize: 12, color: C.ever2, fontWeight: 700, marginTop: 8 }}>● Listening… tap the mic to stop</div>}

        {!aiResults && (
          <button disabled={!aiText.trim() || aiBusy} onClick={runAILog} style={{ ...primaryBtn, marginTop: 12, opacity: !aiText.trim() || aiBusy ? 0.5 : 1 }}>
            {aiBusy ? <><Loader2 size={16} className="pl-spin" /> Estimating…</> : <><Sparkles size={16} /> Estimate macros</>}
          </button>
        )}
        {aiError && <div style={errBox}>{aiError}</div>}

        {aiResults && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.inkSoft, marginBottom: 8 }}>REVIEW & EDIT</div>
            {aiResults.map((r, i) => (
              <div key={r.id} style={{ ...cardStyle, padding: 12 }}>
                <div className="flex items-center justify-between">
                  <input value={r.name} onChange={(e) => setAiResults(aiResults.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    style={{ border: "none", background: "transparent", fontSize: 14, fontWeight: 700, color: C.ink, flex: 1, outline: "none" }} />
                  <button onClick={() => setAiResults(aiResults.filter((_, j) => j !== i))} style={trashBtn}><Trash2 size={14} /></button>
                </div>
                <div style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600, marginBottom: 8 }}>{r.qty}</div>
                <div className="flex" style={{ gap: 8 }}>
                  {[["kcal", "kcal"], ["protein", "P"], ["carbs", "C"], ["fat", "F"]].map(([k, lbl]) => (
                    <div key={k} style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: C.inkSoft, fontWeight: 700, textAlign: "center", marginBottom: 2 }}>{lbl}</div>
                      <input value={r[k]} onChange={(e) => setAiResults(aiResults.map((x, j) => j === i ? { ...x, [k]: +e.target.value.replace(/[^\d]/g, "") || 0 } : x))}
                        inputMode="numeric" style={{ ...inputStyle, width: "100%", textAlign: "center", padding: "6px 4px", fontSize: 13 }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <p style={{ fontSize: 11, color: C.inkSoft, margin: "6px 2px 10px", lineHeight: 1.4 }}>
              Estimates are approximate. Adjust anything that looks off before logging.
            </p>
            <button onClick={commitAIResults} style={primaryBtn}><Check size={16} /> Log {aiResults.length} item{aiResults.length > 1 ? "s" : ""} to {mealLabel}</button>
          </div>
        )}
      </Sheet>
    );
  };

  const renderScanModal = () => {
    const mealLabel = MEALS.find((m) => m.key === modal.meal)?.label;
    return (
      <Sheet open title="Scan" onClose={closeModal} big>
        <div className="flex" style={{ gap: 8, marginBottom: 14, background: C.line, padding: 4, borderRadius: 12 }}>
          {[["meal", "Meal", "🍽️"], ["product", "Label", "🏷️"], ["barcode", "Barcode", "📷"]].map(([k, lbl, em]) => (
            <button key={k} onClick={() => { setScanMode(k); setScanResult(null); setScanError(""); setScanImg(null); }}
              style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
                background: scanMode === k ? C.surface : "transparent", color: scanMode === k ? C.ink : C.inkSoft, boxShadow: scanMode === k ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
              {em} {lbl}
            </button>
          ))}
        </div>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => onPickImage(e.target.files?.[0])} />

        {scanMode === "barcode" ? (
          !scanResult && (
            <div>
              <BarcodeScanner onDetect={runBarcode} />
              {scanBusy && (
                <div className="flex items-center" style={{ gap: 8, justifyContent: "center", marginTop: 12, color: C.inkSoft, fontSize: 13, fontWeight: 600 }}>
                  <Loader2 size={16} className="pl-spin" /> Looking up product…
                </div>
              )}
            </div>
          )
        ) : !scanImg ? (
          <button onClick={() => fileRef.current?.click()}
            style={{ width: "100%", padding: "32px 16px", borderRadius: 18, border: `2px dashed ${C.line}`, background: "#FAF9F3", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: C.inkSoft }}>
            <div style={{ width: 56, height: 56, borderRadius: 99, background: C.leafSoft, display: "grid", placeItems: "center" }}>
              {scanMode === "product" ? <ScanLine size={26} color={C.ever} /> : <Camera size={26} color={C.ever} />}
            </div>
            <div style={{ fontWeight: 800, color: C.ink, fontSize: 14 }}>{scanMode === "product" ? "Snap the nutrition label" : "Take a photo of your meal"}</div>
            <div style={{ fontSize: 12 }}>Camera on mobile · upload on desktop</div>
          </button>
        ) : (
          <div>
            <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: `1px solid ${C.line}` }}>
              <img src={scanImg.dataUrl} alt="scan" style={{ width: "100%", maxHeight: 230, objectFit: "cover", display: "block" }} />
              <button onClick={() => { setScanImg(null); setScanResult(null); }} style={{ position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 99, border: "none", background: "rgba(0,0,0,.55)", color: "#fff", cursor: "pointer", display: "grid", placeItems: "center" }}><X size={16} /></button>
            </div>
            {!scanResult && (
              <button disabled={scanBusy} onClick={runScan} style={{ ...primaryBtn, marginTop: 12, opacity: scanBusy ? 0.55 : 1 }}>
                {scanBusy ? <><Loader2 size={16} className="pl-spin" /> Reading image…</> : <><Sparkles size={16} /> Identify & estimate</>}
              </button>
            )}
          </div>
        )}
        {scanError && <div style={errBox}>{scanError}</div>}

        {scanResult && (
          <div style={{ marginTop: 14 }}>
            <div style={{ ...cardStyle, padding: 14 }}>
              <input value={scanResult.name} onChange={(e) => setScanResult({ ...scanResult, name: e.target.value })}
                style={{ border: "none", background: "transparent", fontSize: 16, fontWeight: 800, color: C.ink, width: "100%", outline: "none", marginBottom: 4 }} />
              <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 10 }}>{scanResult.qty}</div>
              <div className="flex" style={{ gap: 8 }}>
                {[["kcal", "kcal"], ["protein", "P"], ["carbs", "C"], ["fat", "F"]].map(([k, lbl]) => (
                  <div key={k} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: C.inkSoft, fontWeight: 700, marginBottom: 3 }}>{lbl}</div>
                    <input value={scanResult[k]} onChange={(e) => setScanResult({ ...scanResult, [k]: +e.target.value.replace(/[^\d]/g, "") || 0 })}
                      inputMode="numeric" style={{ ...inputStyle, width: "100%", textAlign: "center", padding: "6px 4px" }} />
                  </div>
                ))}
              </div>
            </div>
            <p style={{ fontSize: 11, color: C.inkSoft, margin: "6px 2px 10px" }}>{scanMode === "barcode" ? "From Open Food Facts — adjust if needed." : "Estimate from image — adjust if needed."}</p>
            <button onClick={commitScan} style={primaryBtn}><Check size={16} /> Log to {mealLabel}</button>
          </div>
        )}
      </Sheet>
    );
  };

  const renderRecipeModal = () => {
    const r = recipeById(modal.id); if (!r) return null;
    return (
      <Sheet open title={r.name} onClose={closeModal} big>
        <div style={{ height: 120, borderRadius: 18, background: r.bg, display: "grid", placeItems: "center", fontSize: 56, marginBottom: 14 }}>{r.emoji}</div>
        <div className="flex" style={{ gap: 8, marginBottom: 14 }}>
          {[["kcal", r.kcal, C.apricot], ["Protein", r.protein + "g", C.protein], ["Carbs", r.carbs + "g", C.carbs], ["Fat", r.fat + "g", C.fat]].map(([l, v, col]) => (
            <div key={l} style={{ flex: 1, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: col, fontVariantNumeric: "tabular-nums" }}>{v}</div>
              <div style={{ fontSize: 10, color: C.inkSoft, fontWeight: 700 }}>{l}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center" style={{ gap: 6, marginBottom: 14, color: C.inkSoft, fontSize: 12.5, fontWeight: 600 }}>
          <Users size={14} /> {r.servings} serving{r.servings > 1 ? "s" : ""} · <Clock size={14} /> {r.minutes} min · per-serving macros
        </div>

        <SectionTitle>Ingredients</SectionTitle>
        <div style={{ ...cardStyle, padding: "4px 14px" }}>
          {r.ingredients.map((i, idx) => (
            <div key={idx} className="flex items-center justify-between" style={{ padding: "8px 0", borderBottom: idx < r.ingredients.length - 1 ? `1px solid ${C.line}` : "none" }}>
              <span style={{ fontSize: 14, color: C.ink, fontWeight: 600 }}>{i.name}</span>
              <span style={{ fontSize: 13, color: C.inkSoft, fontWeight: 700 }}>{fmtQty(i.qty)}{i.unit ? " " + i.unit : ""}</span>
            </div>
          ))}
        </div>

        <SectionTitle>Method</SectionTitle>
        <div style={{ marginBottom: 14 }}>
          {r.steps.map((s, idx) => (
            <div key={idx} className="flex" style={{ gap: 12, marginBottom: 10 }}>
              <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 99, background: C.ever, color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800 }}>{idx + 1}</span>
              <span style={{ fontSize: 14, color: C.ink, lineHeight: 1.45 }}>{s}</span>
            </div>
          ))}
        </div>

        <div className="flex" style={{ gap: 8 }}>
          <button onClick={() => { addEntry(todayISO(), mealByHour(), recipeToEntry(r)); flash("Logged to today"); closeModal(); }} style={{ ...primaryBtn, flex: 1 }}><Plus size={16} /> Log now</button>
          <button onClick={() => shareRecipe(r)} style={{ ...addBtn, width: 46, height: 46, background: C.leafSoft }}><Share2 size={18} color={C.ever} /></button>
        </div>
        <button onClick={() => { closeModal(); openPlanPicker(todayISO(), mealByHour()); }} style={{ ...secondaryBtn, marginTop: 10 }}><CalendarDays size={16} /> Add to a meal plan</button>
      </Sheet>
    );
  };

  const renderPlanPick = () => {
    const q = recipeSearch.trim().toLowerCase();
    const list = RECIPES.filter((r) =>
      (recipeFilter === "All" || r.tags.includes(recipeFilter)) &&
      (!q || r.name.toLowerCase().includes(q)));
    const mealLabel = MEALS.find((m) => m.key === modal.meal)?.label;
    return (
      <Sheet open title={`Add to ${mealLabel} · ${relDay(modal.date)}`} onClose={closeModal} big>
        <SearchInput value={recipeSearch} onChange={setRecipeSearch} placeholder="Search recipes" />
        <div className="flex" style={{ gap: 8, padding: "10px 0", overflowX: "auto" }}>
          {["All", ...GOAL_TAGS].map((t) => <Pill key={t} active={recipeFilter === t} onClick={() => setRecipeFilter(t)}>{t}</Pill>)}
        </div>
        {list.map((r) => (
          <button key={r.id} onClick={() => { addToPlan(modal.date, modal.meal, r.id); flash(`Added ${r.name} to plan`); closeModal(); }} style={rowBtn}>
            <div className="flex items-center" style={{ gap: 10, minWidth: 0 }}>
              <span style={{ width: 40, height: 40, borderRadius: 11, background: r.bg, display: "grid", placeItems: "center", fontSize: 21 }}>{r.emoji}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                <div style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600 }}>{r.kcal} kcal · {r.protein}P/{r.carbs}C/{r.fat}F</div>
              </div>
            </div>
            <span style={{ ...addBtn, background: C.leafSoft }}><Plus size={15} color={C.ever} /></span>
          </button>
        ))}
      </Sheet>
    );
  };

  const renderDelivery = () => {
    const { provider, status } = syncState;
    const count = state.grocery.filter((g) => !g.checked).length;
    return (
      <Sheet open title="Grocery delivery" onClose={closeModal}>
        {status === "done" ? (
          <div style={{ textAlign: "center", padding: "18px 8px" }}>
            <div style={{ width: 64, height: 64, borderRadius: 99, background: C.leafSoft, display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
              <CheckCircle2 size={34} color={C.ever} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 17, color: C.ink }}>Sent to {provider.name}</div>
            <p style={{ fontSize: 13, color: C.inkSoft, marginTop: 6, lineHeight: 1.45 }}>
              {count} item{count !== 1 ? "s" : ""} added to your {provider.name} cart. <br />(Simulated — wire up the real partner API to check out.)
            </p>
            <button onClick={closeModal} style={{ ...primaryBtn, marginTop: 16 }}>Done</button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: C.inkSoft, marginBottom: 14, lineHeight: 1.45 }}>
              Choose a delivery partner to send your {count} unchecked item{count !== 1 ? "s" : ""}.
            </p>
            {PROVIDERS.map((p) => {
              const connected = state.connected.includes(p.id);
              const busyConnect = provider?.id === p.id && status === "connecting";
              const busySend = provider?.id === p.id && status === "sending";
              return (
                <div key={p.id} style={{ ...cardStyle, padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 26 }}>{p.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: C.ink, fontSize: 14.5 }}>{p.name}</div>
                    <div style={{ fontSize: 11.5, color: connected ? C.ever2 : C.inkSoft, fontWeight: 700 }}>{connected ? "Connected" : "Not connected"}</div>
                  </div>
                  {connected ? (
                    <button disabled={busySend} onClick={() => sendToProvider(p)}
                      style={{ ...miniSolid, opacity: busySend ? 0.6 : 1 }}>
                      {busySend ? <Loader2 size={14} className="pl-spin" /> : <Send size={14} />} Send
                    </button>
                  ) : (
                    <button disabled={busyConnect} onClick={() => connectProvider(p)} style={{ ...miniGhost, opacity: busyConnect ? 0.6 : 1 }}>
                      {busyConnect ? <Loader2 size={14} className="pl-spin" /> : <Link2 size={14} />} Connect
                    </button>
                  )}
                </div>
              );
            })}
            <p style={{ fontSize: 11, color: C.inkSoft, textAlign: "center", marginTop: 6 }}>Partners shown are placeholders for the prototype.</p>
          </div>
        )}
      </Sheet>
    );
  };

  const renderSettings = () => {
    const macroKcal = goalDraft.protein * 4 + goalDraft.carbs * 4 + goalDraft.fat * 9;
    const setG = (k, v) => setGoalDraft({ ...goalDraft, [k]: Math.max(0, +String(v).replace(/[^\d]/g, "") || 0) });
    return (
      <Sheet open title="Goals & settings" onClose={closeModal} big>
        <SectionTitle>Daily targets</SectionTitle>
        <div style={{ ...cardStyle }}>
          <Field label="Calories" suffix="kcal">
            <input value={goalDraft.kcal} onChange={(e) => setG("kcal", e.target.value)} inputMode="numeric" style={fieldInput} />
          </Field>
          {[["protein", "Protein", C.protein], ["carbs", "Carbs", C.carbs], ["fat", "Fat", C.fat]].map(([k, lbl, col]) => (
            <Field key={k} label={<span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: col, marginRight: 7 }} />{lbl}</span>} suffix="g">
              <input value={goalDraft[k]} onChange={(e) => setG(k, e.target.value)} inputMode="numeric" style={fieldInput} />
            </Field>
          ))}
          <div style={{ fontSize: 11.5, color: C.inkSoft, padding: "10px 2px 2px", fontWeight: 600 }}>
            Macros add up to <b style={{ color: macroKcal > goalDraft.kcal ? C.apricot : C.ever }}>{macroKcal} kcal</b>
            {Math.abs(macroKcal - goalDraft.kcal) > 60 && <span> — {macroKcal > goalDraft.kcal ? "above" : "below"} your calorie target</span>}
          </div>
        </div>
        <button onClick={() => { mutate((s) => { s.goals = { ...goalDraft }; }); flash("Goals saved"); }} style={{ ...primaryBtn, marginBottom: 18 }}>Save targets</button>

        <SectionTitle>Macro presets</SectionTitle>
        <div className="flex" style={{ gap: 8, marginBottom: 18 }}>
          {[
            { n: "Balanced", p: 0.3, c: 0.4, f: 0.3 },
            { n: "High protein", p: 0.4, c: 0.35, f: 0.25 },
            { n: "Low carb", p: 0.35, c: 0.2, f: 0.45 },
          ].map((preset) => (
            <button key={preset.n} onClick={() => setGoalDraft({
              kcal: goalDraft.kcal,
              protein: Math.round((goalDraft.kcal * preset.p) / 4),
              carbs: Math.round((goalDraft.kcal * preset.c) / 4),
              fat: Math.round((goalDraft.kcal * preset.f) / 9),
            })} style={{ ...secondaryBtn, flex: 1, fontSize: 12, padding: "10px 4px" }}>{preset.n}</button>
          ))}
        </div>

        <SectionTitle>Profile</SectionTitle>
        <div style={{ ...cardStyle }}>
          <Field label="Units">
            <div className="flex" style={{ gap: 6 }}>
              {[["imperial", "lb / oz"], ["metric", "kg / g"]].map(([k, lbl]) => (
                <button key={k} onClick={() => mutate((s) => { s.profile.units = k; })}
                  style={{ padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${state.profile.units === k ? C.ever : C.line}`, background: state.profile.units === k ? C.ever : "#fff", color: state.profile.units === k ? "#fff" : C.inkSoft, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>{lbl}</button>
              ))}
            </div>
          </Field>
          <Field label="Start weight" suffix={state.profile.units === "imperial" ? "lb" : "kg"}>
            <input value={state.profile.startWeight} onChange={(e) => mutate((s) => { s.profile.startWeight = +e.target.value.replace(/[^\d.]/g, "") || 0; })} inputMode="decimal" style={fieldInput} />
          </Field>
          <Field label="Goal weight" suffix={state.profile.units === "imperial" ? "lb" : "kg"}>
            <input value={state.profile.goalWeight} onChange={(e) => mutate((s) => { s.profile.goalWeight = +e.target.value.replace(/[^\d.]/g, "") || 0; })} inputMode="decimal" style={fieldInput} />
          </Field>
        </div>

        <button onClick={downloadReport} style={{ ...secondaryBtn, marginTop: 18 }}><Download size={16} /> Export progress report (CSV)</button>

        {supabase && session && (
          <>
            <SectionTitle>Account</SectionTitle>
            <div className="flex items-center justify-between" style={{ ...cardStyle, padding: 14 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user?.email}</div>
                <div style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600 }}>Synced to your account</div>
              </div>
              <button onClick={() => supabase.auth.signOut()} style={{ ...miniGhost, flexShrink: 0 }}>Sign out</button>
            </div>
          </>
        )}

        <div style={{ marginTop: 20, padding: 14, background: "#FAF9F3", borderRadius: 14, border: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.ink, marginBottom: 6 }}>About this preview</div>
          <p style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.5 }}>
            {BRAND} is a prototype. Nutrition figures — especially AI estimates from text and photos — are approximate and not medical advice.
            Talk to a healthcare professional before making significant dietary changes.
          </p>
        </div>
      </Sheet>
    );
  };

  const renderQuick = () => (
    <Sheet open title="Quick add" onClose={closeModal}>
      <p style={{ fontSize: 13, color: C.inkSoft, marginBottom: 14 }}>Log to {relDay(selDate)} · {MEALS.find((m) => m.key === mealByHour())?.label}</p>
      {[
        { icon: <Sparkles size={20} color={C.ever} />, t: "Describe or speak it", s: "Natural-language logging", fn: () => { closeModal(); openAI(selDate, mealByHour()); } },
        { icon: <Camera size={20} color={C.ever} />, t: "Scan a meal or label", s: "Photo → estimated macros", fn: () => { closeModal(); openScan(selDate, mealByHour()); } },
        { icon: <Search size={20} color={C.ever} />, t: "Search food database", s: "Find & add foods", fn: () => { closeModal(); openAdd(selDate, mealByHour()); } },
        { icon: <BookOpen size={20} color={C.ever} />, t: "Browse recipes", s: "Log a saved recipe", fn: () => { closeModal(); setTab("recipes"); } },
      ].map((o, i) => (
        <button key={i} onClick={o.fn} style={{ ...cardStyle, width: "100%", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", textAlign: "left" }}>
          <span style={{ width: 44, height: 44, borderRadius: 13, background: C.leafSoft, display: "grid", placeItems: "center" }}>{o.icon}</span>
          <div>
            <div style={{ fontWeight: 800, color: C.ink, fontSize: 15 }}>{o.t}</div>
            <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>{o.s}</div>
          </div>
          <ArrowRight size={18} color={C.inkSoft} style={{ marginLeft: "auto" }} />
        </button>
      ))}
    </Sheet>
  );

  /* =========================================================================
     LAYOUT SHELL
  ========================================================================= */
  const tabs = [
    { key: "today", label: "Today", icon: Home },
    { key: "plan", label: "Plan", icon: CalendarDays },
    { key: "recipes", label: "Recipes", icon: BookOpen },
    { key: "grocery", label: "Shop", icon: ShoppingCart },
    { key: "progress", label: "Progress", icon: TrendingUp },
  ];

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "#E9E6DC", fontFamily: FONT, padding: 0 }}>
      <style>{`
        @keyframes plSheet { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes plSpin { to { transform: rotate(360deg); } }
        @keyframes plToast { from { opacity:0; transform: translate(-50%, 10px);} to {opacity:1; transform: translate(-50%,0);} }
        .pl-spin { animation: plSpin .8s linear infinite; }
        .pl-app *::-webkit-scrollbar { width: 0; height: 0; }
        .pl-app input:focus, .pl-app textarea:focus { outline: 2px solid ${C.leaf}; outline-offset: 0; }
        .pl-app button:focus-visible { outline: 2px solid ${C.leaf}; outline-offset: 2px; }
      `}</style>

      <div className="pl-app" style={{
        width: "100%", maxWidth: 430, height: "100vh", maxHeight: 920, background: C.canvas, position: "relative",
        overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 8px 60px rgba(0,0,0,.18)", color: C.ink,
      }}>
        {/* status bar / brand for non-Today screens */}
        {tab !== "today" && (
          <div style={{ height: 6, background: `linear-gradient(90deg, ${C.ever}, ${C.ever2})` }} />
        )}

        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
          {tab === "today" && renderToday()}
          {tab === "plan" && renderPlan()}
          {tab === "recipes" && renderRecipes()}
          {tab === "grocery" && renderGrocery()}
          {tab === "progress" && renderProgress()}
        </div>

        {/* bottom tab bar */}
        <div style={{ position: "relative", flexShrink: 0, background: C.surface, borderTop: `1px solid ${C.line}`, paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex items-center justify-between" style={{ padding: "8px 6px 10px" }}>
            {tabs.slice(0, 2).map((t) => <TabBtn key={t.key} t={t} active={tab === t.key} onClick={() => setTab(t.key)} />)}
            <div style={{ width: 56 }} />
            {tabs.slice(3).map((t) => <TabBtn key={t.key} t={t} active={tab === t.key} onClick={() => setTab(t.key)} />)}
          </div>
          {/* center FAB */}
          <button onClick={openQuickAdd}
            style={{ position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)", width: 56, height: 56, borderRadius: 99,
              background: `linear-gradient(150deg, ${C.ever2}, ${C.ever})`, border: "4px solid " + C.canvas, color: "#fff", cursor: "pointer",
              display: "grid", placeItems: "center", boxShadow: "0 6px 18px rgba(20,60,48,.4)" }}>
            <Plus size={26} />
          </button>
          <button onClick={() => setTab("recipes")} style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", fontSize: 9.5, fontWeight: 700, color: C.inkSoft, background: "none", border: "none", marginTop: 44, pointerEvents: "none" }}>Add</button>
        </div>

        {/* modals */}
        {modal?.type === "add" && renderAddModal()}
        {modal?.type === "ai" && renderAIModal()}
        {modal?.type === "scan" && renderScanModal()}
        {modal?.type === "recipe" && renderRecipeModal()}
        {modal?.type === "planpick" && renderPlanPick()}
        {modal?.type === "delivery" && renderDelivery()}
        {modal?.type === "settings" && renderSettings()}
        {modal?.type === "quick" && renderQuick()}

        {/* toast */}
        {toast && (
          <div style={{ position: "absolute", bottom: 92, left: "50%", transform: "translateX(-50%)", background: C.ink, color: "#fff",
            padding: "10px 18px", borderRadius: 99, fontSize: 13, fontWeight: 700, zIndex: 99, whiteSpace: "nowrap",
            animation: "plToast .25s ease", boxShadow: "0 6px 20px rgba(0,0,0,.3)" }}>{toast}</div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   AUTH GATE — wraps the app. With Supabase configured, shows the login screen
   until there's a session. Without it, renders straight through (local mode).
============================================================================ */
const centerFrame = (children) => (
  <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "#E9E6DC", fontFamily: FONT }}>
    {children}
  </div>
);

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out

  useEffect(() => {
    if (!supabase) { setSession(null); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (supabase && session === undefined) {
    return centerFrame(<Loader2 size={28} className="pl-spin" color={C.ever} />);
  }
  if (supabase && !session) return <AuthScreen />;
  return <MainApp session={session} />;
}

function AuthScreen() {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const submit = async (e) => {
    e?.preventDefault();
    if (!email.trim() || !pw || busy) return;
    setBusy(true); setErr(""); setInfo("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: pw,
          options: { data: { name: name.trim() || undefined } },
        });
        if (error) throw error;
        if (!data.session) setInfo("Account created. Check your email to confirm, then sign in.");
        // If a session is returned, onAuthStateChange swaps in the app automatically.
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
        if (error) throw error;
      }
    } catch (e2) {
      setErr(e2?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return centerFrame(
    <div className="pl-app" style={{ width: "100%", maxWidth: 400, padding: "0 22px" }}>
      <style>{`@keyframes plSpin { to { transform: rotate(360deg); } } .pl-spin { animation: plSpin .8s linear infinite; }
        .pl-app input:focus { outline: 2px solid ${C.leaf}; outline-offset: 0; }`}</style>

      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, margin: "0 auto 14px", display: "grid", placeItems: "center",
          background: `linear-gradient(150deg, ${C.ever2}, ${C.ever})`, boxShadow: "0 8px 22px rgba(20,60,48,.3)" }}>
          <Utensils size={28} color="#fff" />
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.ever, letterSpacing: -0.5 }}>{BRAND}</div>
        <div style={{ fontSize: 13.5, color: C.inkSoft, fontWeight: 600, marginTop: 2 }}>{TAGLINE}</div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 22, padding: 22, boxShadow: "0 8px 40px rgba(20,30,24,.10)" }}>
        <div className="flex" style={{ gap: 8, marginBottom: 18, background: C.line, padding: 4, borderRadius: 12 }}>
          {[["signin", "Sign in"], ["signup", "Create account"]].map(([k, lbl]) => (
            <button key={k} onClick={() => { setMode(k); setErr(""); setInfo(""); }}
              style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13.5,
                background: mode === k ? C.surface : "transparent", color: mode === k ? C.ink : C.inkSoft, boxShadow: mode === k ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
              {lbl}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          {mode === "signup" && (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
              autoComplete="name" style={{ ...inputStyle, width: "100%", marginBottom: 10 }} />
          )}
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email"
            autoComplete="email" style={{ ...inputStyle, width: "100%", marginBottom: 10 }} />
          <input value={pw} onChange={(e) => setPw(e.target.value)} type="password"
            placeholder={mode === "signup" ? "Create a password (6+ characters)" : "Password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"} style={{ ...inputStyle, width: "100%", marginBottom: 14 }} />
          <button type="submit" disabled={busy || !email.trim() || !pw} style={{ ...primaryBtn, opacity: busy || !email.trim() || !pw ? 0.55 : 1 }}>
            {busy ? <><Loader2 size={16} className="pl-spin" /> Please wait…</> : (mode === "signup" ? <><User size={16} /> Create account</> : <><ArrowRight size={16} /> Sign in</>)}
          </button>
        </form>

        {err && <div style={errBox}>{err}</div>}
        {info && <div style={{ ...errBox, background: C.leafSoft, color: C.ever2 }}>{info}</div>}
      </div>

      <p style={{ fontSize: 11.5, color: C.inkSoft, textAlign: "center", margin: "16px 6px 0", lineHeight: 1.5 }}>
        Your data syncs securely to your account so it's available on any device.
      </p>
    </div>
  );
}

/* ============================================================================
   SUB-RENDER COMPONENTS (stateless — safe to define outside)
============================================================================ */
const MacroRow = ({ totals, goals, light }) => (
  <div className="flex" style={{ gap: 10 }}>
    <MacroMini label="Protein" val={totals.protein} goal={goals.protein} color={C.protein} light={light} />
    <MacroMini label="Carbs" val={totals.carbs} goal={goals.carbs} color={C.carbs} light={light} />
    <MacroMini label="Fat" val={totals.fat} goal={goals.fat} color={C.fat} light={light} />
  </div>
);
const MacroMini = ({ label, val, goal, color, light }) => {
  const pct = goal ? Math.min(1, val / goal) : 0;
  return (
    <div style={{ flex: 1 }}>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: light ? "rgba(255,255,255,.8)" : C.inkSoft }}>{label}</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: light ? "#fff" : C.ink, fontVariantNumeric: "tabular-nums" }}>{Math.round(val)}/{goal}g</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: light ? "rgba(255,255,255,.2)" : C.line, overflow: "hidden" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: color, borderRadius: 99, transition: "width .5s" }} />
      </div>
    </div>
  );
};

const QuickAction = ({ icon, label, sub, onClick }) => (
  <button onClick={onClick} style={{ flex: 1, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: "12px 6px", cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4, boxShadow: "0 1px 3px rgba(20,30,24,.04)" }}>
    <span style={{ width: 38, height: 38, borderRadius: 11, background: C.leafSoft, display: "grid", placeItems: "center", color: C.ever }}>{icon}</span>
    <span style={{ fontSize: 12.5, fontWeight: 800, color: C.ink }}>{label}</span>
    <span style={{ fontSize: 10, color: C.inkSoft, fontWeight: 600 }}>{sub}</span>
  </button>
);

const TabBtn = ({ t, active, onClick }) => {
  const Icon = t.icon;
  return (
    <button onClick={onClick} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "2px 0", color: active ? C.ever : "#9AA59C" }}>
      <Icon size={21} strokeWidth={active ? 2.6 : 2} />
      <span style={{ fontSize: 10, fontWeight: active ? 800 : 600 }}>{t.label}</span>
    </button>
  );
};

const Header = ({ title, subtitle }) => (
  <div style={{ padding: "18px 18px 12px" }}>
    <div style={{ fontSize: 24, fontWeight: 800, color: C.ink, letterSpacing: -0.4 }}>{title}</div>
    {subtitle && <div style={{ fontSize: 13, color: C.inkSoft, fontWeight: 600, marginTop: 2 }}>{subtitle}</div>}
  </div>
);

const SearchInput = ({ value, onChange, placeholder }) => (
  <div style={{ position: "relative" }}>
    <Search size={17} color="#9AA59C" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", padding: "11px 14px 11px 40px", borderRadius: 13, border: `1px solid ${C.line}`, background: C.surface, fontSize: 14, color: C.ink, fontFamily: FONT }} />
  </div>
);

const Stat = ({ label, value, unit, accent }) => (
  <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: "13px 10px", textAlign: "center" }}>
    <div style={{ fontSize: 22, fontWeight: 800, color: accent || C.ink, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}<span style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700 }}> {unit}</span></div>
    <div style={{ fontSize: 11, color: C.inkSoft, fontWeight: 700, marginTop: 5, letterSpacing: 0.2 }}>{label}</div>
  </div>
);

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 800, color: C.inkSoft, letterSpacing: 0.4, textTransform: "uppercase", margin: "16px 2px 8px" }}>{children}</div>
);

const Field = ({ label, suffix, children }) => (
  <div className="flex items-center justify-between" style={{ padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
    <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{label}</span>
    <div className="flex items-center" style={{ gap: 6 }}>
      {children}
      {suffix && <span style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700 }}>{suffix}</span>}
    </div>
  </div>
);

const Empty = ({ text }) => (
  <div style={{ textAlign: "center", padding: "30px 20px", color: C.inkSoft, fontSize: 13.5, fontWeight: 600, lineHeight: 1.5 }}>{text}</div>
);

/* ============================================================================
   SHARED STYLE OBJECTS
============================================================================ */
const cardStyle = { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: 14, marginBottom: 12, boxShadow: "0 1px 3px rgba(20,30,24,.04)" };
const inputStyle = { padding: "10px 13px", borderRadius: 11, border: `1px solid ${C.line}`, background: C.surface, fontSize: 14, color: C.ink, fontFamily: FONT };
const fieldInput = { width: 70, padding: "7px 10px", borderRadius: 9, border: `1px solid ${C.line}`, background: "#FAF9F3", fontSize: 14, fontWeight: 700, color: C.ink, textAlign: "right", fontFamily: FONT, fontVariantNumeric: "tabular-nums" };
const navBtn = { background: "rgba(255,255,255,.14)", border: "none", color: "#fff", width: 34, height: 34, borderRadius: 99, display: "grid", placeItems: "center", cursor: "pointer" };
const addBtn = { background: C.leafSoft, border: "none", width: 30, height: 30, borderRadius: 99, display: "grid", placeItems: "center", cursor: "pointer", color: C.ever, flexShrink: 0 };
const trashBtn = { background: "none", border: "none", color: "#C2BCAD", cursor: "pointer", padding: 4, display: "grid", placeItems: "center", flexShrink: 0 };
const ghostBtn = { background: C.surface, border: `1px solid ${C.line}`, color: C.inkSoft, width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", cursor: "pointer" };
const tagStyle = { fontSize: 10.5, fontWeight: 700, color: C.ever2, background: C.leafSoft, padding: "3px 8px", borderRadius: 99 };
const primaryBtn = { width: "100%", padding: "13px", borderRadius: 14, border: "none", background: C.ever, color: "#fff", fontWeight: 800, fontSize: 14.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 };
const secondaryBtn = { width: "100%", padding: "12px", borderRadius: 13, border: `1.5px solid ${C.line}`, background: C.surface, color: C.ink, fontWeight: 800, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 };
const miniAction = { flex: 1, padding: "10px", borderRadius: 12, border: `1px solid ${C.line}`, background: "#FAF9F3", color: C.ever, fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 };
const miniSolid = { padding: "8px 14px", borderRadius: 10, border: "none", background: C.ever, color: "#fff", fontWeight: 800, fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 };
const miniGhost = { padding: "8px 14px", borderRadius: 10, border: `1.5px solid ${C.ever}`, background: "#fff", color: C.ever, fontWeight: 800, fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 };
const rowBtn = { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 4px", borderBottom: `1px solid ${C.line}`, background: "none", border: "none", borderTop: "none", borderLeft: "none", borderRight: "none", cursor: "pointer", gap: 10 };
const tipStyle = { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 12, fontWeight: 700 };
const errBox = { marginTop: 12, padding: "11px 13px", borderRadius: 12, background: C.apricotSoft, color: "#9A4A1E", fontSize: 12.5, fontWeight: 600, lineHeight: 1.4 };
