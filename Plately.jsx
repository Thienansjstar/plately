import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Home, CalendarDays, BookOpen, ShoppingCart, TrendingUp, Settings,
  Plus, Minus, X, Search, Mic, Camera, ChevronLeft, ChevronRight, ChevronDown,
  Check, CheckCircle2, Share2, Download, Flame, Trash2, Sparkles, Loader2,
  Pencil, Users, Send, Copy, Target, User, ArrowRight, RefreshCw, Link2,
  Clock, ScanLine, Utensils, LogOut, ChefHat, PenLine,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Cell,
} from "recharts";

import { C, FONT, BRAND, TAGLINE } from "./src/lib/theme";
import {
  pad, toISO, fromISO, todayISO, addDays, WD, MO, niceDate, shortDate,
  mondayOf, relDay, mealByHour, uid, sumEntries, dayTotals, recipeToEntry,
  fmtQty, extractJSON,
} from "./src/lib/helpers";
import { callClaude, lookupBarcode, searchUSDA, parseNutritionix, searchRecipes } from "./src/lib/api";
import { supabase } from "./src/lib/supabase";
import {
  MEALS, GOAL_TAGS, FOODS, CAT, categoryOf, CAT_ORDER, catEmoji,
  PROVIDERS, seedWeights, seedDiary, seedPlan, initialState, RECIPE_BGS, RECIPE_EMOJIS,
} from "./src/data/seed";
import {
  cardStyle, inputStyle, fieldInput, navBtn, addBtn, trashBtn, ghostBtn,
  tagStyle, primaryBtn, secondaryBtn, miniAction, miniSolid, miniGhost,
  rowBtn, tipStyle, errBox,
} from "./src/styles";
import {
  Ring, MacroBar, Pill, MacroRow, MacroMini, QuickAction, TabBtn, Header,
  SearchInput, Stat, SectionTitle, Field, Empty, centerFrame, Avatar,
} from "./src/components/ui";
import { Sheet } from "./src/components/Sheet";
import { BarcodeScanner } from "./src/components/BarcodeScanner";
import { AuthScreen } from "./src/components/AuthScreen";
import { OnboardingScreen, ProfileFields, TargetPreview } from "./src/components/profile";
import { profileDefaults, recommendedTargets, saveProfileToDB } from "./src/lib/profile";

/* ============================================================================
   MAIN APP
============================================================================ */
function MainApp({ session }) {
  const userId = session?.user?.id || null;
  const email = session?.user?.email || "";
  const [state, setState] = useState(initialState);
  const [loaded, setLoaded] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [tab, setTab] = useState("today");
  const [toast, setToast] = useState(null);

  // Today
  const [selDate, setSelDate] = useState(todayISO());
  // Plan
  const [weekStart, setWeekStart] = useState(mondayOf(todayISO()));
  // Recipes
  const [recipeFilter, setRecipeFilter] = useState("All");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [spResults, setSpResults] = useState([]); // recipe search results (Spoonacular, or Edamam fallback)
  const [spBusy, setSpBusy] = useState(false);
  const [spError, setSpError] = useState("");
  const [spSource, setSpSource] = useState("spoonacular"); // which API served the current results
  const [logDraft, setLogDraft] = useState(null); // { date, meal, name, unit, kcal, protein, carbs, fat, servings, kind, source, back }
  const [editDraft, setEditDraft] = useState(null); // editing an existing diary entry
  const [scanServings, setScanServings] = useState(1);

  // modal: { type, ... }
  const [modal, setModal] = useState(null);

  // transient inputs (lifted to avoid focus loss)
  const [foodSearch, setFoodSearch] = useState("");
  const [foodResults, setFoodResults] = useState([]);
  const [foodBusy, setFoodBusy] = useState(false);
  const [manual, setManual] = useState({ name: "", qty: "1 serving", kcal: "", protein: "", carbs: "", fat: "" });

  // Debounced USDA FoodData Central search while the Add modal is open.
  useEffect(() => {
    if (modal?.type !== "add" && modal?.type !== "ingredientpick") return;
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

  // Debounced Spoonacular recipe search — runs on the Recipes screen and in the
  // plan / recipe-log pickers. An empty query returns popular recipes. Results
  // are cached per query for the session so reused searches are instant and
  // don't burn API quota.
  useEffect(() => {
    const onRecipes = tab === "recipes" && !modal;
    const inPicker = modal?.type === "planpick" || modal?.type === "recipelog";
    if (!onRecipes && !inPicker) return;
    const key = recipeSearch.trim().toLowerCase();
    const cached = spCacheRef.current.get(key);
    if (cached) { setSpResults(cached.results); setSpSource(cached.source); setSpBusy(false); setSpError(""); return; }
    setSpBusy(true); setSpError("");
    const t = setTimeout(async () => {
      try { const { results, source } = await searchRecipes(recipeSearch.trim()); spCacheRef.current.set(key, { results, source }); setSpResults(results); setSpSource(source); }
      catch (e) { setSpResults([]); setSpError(e?.message || "Couldn’t reach the recipe database."); }
      finally { setSpBusy(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [recipeSearch, tab, modal?.type]);
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
  const blankRecipe = () => ({ id: null, name: "", emoji: "🍽️", bg: "", tags: [], servings: 1, minutes: 15, kcal: "", protein: "", carbs: "", fat: "", ingredients: [{ name: "", qty: "", unit: "" }] });
  const [recipeDraft, setRecipeDraft] = useState(blankRecipe());
  const [builderBack, setBuilderBack] = useState(null); // modal to return to after the recipe builder closes
  const [ingPickMode, setIngPickMode] = useState("search"); // search | barcode | label (ingredient picker)
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; }); // log-history calendar
  const recogRef = useRef(null);
  const fileRef = useRef(null);
  const saveTimer = useRef(null);
  const spCacheRef = useRef(new Map()); // session cache of Spoonacular searches (query → results)

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
      // Ensure newer profile fields exist on accounts created before onboarding.
      setState({ ...initialState, ...parsed, profile: { ...profileDefaults, ...initialState.profile, ...(parsed.profile || {}) } });
      if (parsed.goals) setGoalDraft(parsed.goals);
    };
    (async () => {
      setLoaded(false);
      setNeedsOnboarding(false);
      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) apply(JSON.parse(cached));
      } catch { /* no cache */ }
      if (supabase && userId) {
        try {
          const { data, error } = await supabase.from("app_state").select("data").eq("user_id", userId).maybeSingle();
          if (!cancel && !error && data?.data) {
            apply(data.data);
            // An existing account that predates onboarding shouldn't be forced through it.
            if (!data.data.profile?.onboarded) setNeedsOnboarding(false);
          } else if (!cancel && !error && !data) {
            // Brand-new account: seed the display name from signup and run onboarding.
            const nm = session?.user?.user_metadata?.name;
            setState((s) => ({ ...s, profile: { ...profileDefaults, ...s.profile, name: nm || s.profile.name } }));
            setNeedsOnboarding(true);
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
          // Keep the structured profiles table in sync (best-effort).
          saveProfileToDB(userId, email, state.profile, state.goals);
        } catch { /* offline — will resync on next change */ }
      }
    }, 700);
  }, [state, loaded, userId, storageKey]);

  const mutate = (fn) => setState((prev) => { const next = JSON.parse(JSON.stringify(prev)); fn(next); return next; });
  // Recipes the user "owns": their own creations + any Spoonacular recipe they've
  // referenced (cached so plan/diary lookups survive a reload). Live search
  // results (spResults) are also consulted for on-screen lookups.
  const allRecipes = useMemo(() => [...(state.recipes || []), ...(state.recipeCache || [])], [state.recipes, state.recipeCache]);
  const recipeById = (id) => allRecipes.find((r) => r.id === id) || spResults.find((r) => r.id === id);
  const isCustomRecipe = (id) => (state.recipes || []).some((r) => r.id === id);
  // Persist a Spoonacular recipe so it can be resolved later (planning/logging).
  const cacheRecipe = (r) => {
    if (!r || isCustomRecipe(r.id)) return;
    mutate((s) => {
      if (!s.recipeCache) s.recipeCache = [];
      if (!s.recipeCache.some((x) => x.id === r.id)) s.recipeCache = [r, ...s.recipeCache].slice(0, 200);
    });
  };

  /* ---- recipe builder ---- */
  // An ingredient added from the database/scan carries per-unit macros + a qty
  // multiplier; the recipe's per-serving macros are then summed automatically.
  const ingHasMacros = (i) => (+i.kcal || 0) || (+i.protein || 0) || (+i.carbs || 0) || (+i.fat || 0);
  const anyIngMacros = (ings) => (ings || []).some(ingHasMacros);
  const macrosFromIngredients = (ings, servings) => {
    const s = Math.max(1, +servings || 1);
    const t = (ings || []).reduce((a, i) => {
      const q = +i.qty || 0;
      return {
        kcal: a.kcal + (+i.kcal || 0) * q, protein: a.protein + (+i.protein || 0) * q,
        carbs: a.carbs + (+i.carbs || 0) * q, fat: a.fat + (+i.fat || 0) * q,
      };
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
    return { kcal: Math.round(t.kcal / s), protein: Math.round(t.protein / s), carbs: Math.round(t.carbs / s), fat: Math.round(t.fat / s) };
  };
  const openRecipeBuilder = (existing, back = null) => {
    setBuilderBack(back);
    if (existing) {
      setRecipeDraft({
        ...existing,
        ingredients: existing.ingredients?.length
          ? existing.ingredients.map((i) => ({ name: i.name, qty: i.qty, unit: i.unit, kcal: i.kcal || 0, protein: i.protein || 0, carbs: i.carbs || 0, fat: i.fat || 0 }))
          : [{ name: "", qty: "", unit: "" }],
      });
    } else setRecipeDraft(blankRecipe());
    setModal({ type: "recipebuilder" });
  };
  // Leave the builder, returning to whatever opened it (e.g. the plan picker).
  const closeBuilder = () => { const b = builderBack; setBuilderBack(null); setModal(b || null); };
  // Open the ingredient picker (search the food database or scan a barcode),
  // keeping the recipe draft alive so we can return to it.
  const openIngredientPick = (mode = "search") => {
    setFoodSearch(""); setFoodResults([]); setScanResult(null); setScanError(""); setScanBusy(false); setScanImg(null);
    if (mode === "label") setScanMode("product");
    setIngPickMode(mode); setModal({ type: "ingredientpick" });
  };
  // Append a picked food/scan result as a macro-tracked ingredient, then return
  // to the builder. `f` may come from FOODS/USDA (`serving`) or a scan (`qty`).
  const addIngredientFromFood = (f) => {
    setRecipeDraft((d) => ({
      ...d,
      ingredients: [
        ...d.ingredients.filter((i) => i.name.trim() || ingHasMacros(i)),
        { name: f.name, qty: 1, unit: f.serving || f.qty || "serving", kcal: +f.kcal || 0, protein: +f.protein || 0, carbs: +f.carbs || 0, fat: +f.fat || 0 },
      ],
    }));
    setModal({ type: "recipebuilder" });
    flash(`Added ${f.name}`);
  };
  const saveRecipe = () => {
    const d = recipeDraft;
    if (!d.name.trim()) return;
    const macros = anyIngMacros(d.ingredients)
      ? macrosFromIngredients(d.ingredients, d.servings)
      : { kcal: +d.kcal || 0, protein: +d.protein || 0, carbs: +d.carbs || 0, fat: +d.fat || 0 };
    const clean = {
      id: d.id || `u_${uid()}`,
      name: d.name.trim(),
      emoji: d.emoji || "🍽️",
      bg: d.bg || RECIPE_BGS[Math.floor(Math.random() * RECIPE_BGS.length)],
      tags: d.tags,
      servings: Math.max(1, +d.servings || 1),
      minutes: Math.max(0, +d.minutes || 0),
      ...macros,
      ingredients: d.ingredients.map((i) => ({ name: i.name.trim(), qty: +i.qty || 0, unit: (i.unit || "").trim(), kcal: +i.kcal || 0, protein: +i.protein || 0, carbs: +i.carbs || 0, fat: +i.fat || 0 })).filter((i) => i.name),
      custom: true,
    };
    mutate((s) => {
      if (!s.recipes) s.recipes = [];
      const idx = s.recipes.findIndex((r) => r.id === clean.id);
      if (idx >= 0) s.recipes[idx] = clean; else s.recipes.unshift(clean);
    });
    closeBuilder();
    flash(d.id ? "Recipe updated" : "Recipe saved");
  };
  const deleteRecipe = (id) => {
    mutate((s) => { s.recipes = (s.recipes || []).filter((r) => r.id !== id); });
    closeModal();
    flash("Recipe deleted");
  };

  /* ---- onboarding: apply the new account's info + targets, and start empty ---- */
  const completeOnboarding = (profilePatch, goals, startWeight) => {
    mutate((s) => {
      s.profile = { ...s.profile, ...profilePatch };
      if (goals) s.goals = goals;
      // Fresh account: clear the demo seed data so they start with a clean slate.
      s.diary = {};
      s.plan = {};
      s.grocery = [];
      s.connected = [];
      s.weights = startWeight > 0 ? [{ date: todayISO(), weight: startWeight }] : [];
    });
    if (goals) setGoalDraft(goals);
    setNeedsOnboarding(false);
    flash(`Welcome to ${BRAND}!`);
  };

  // Merge a patch into the saved profile (used by the live profile editor).
  const patchProfile = (patch) => mutate((s) => { s.profile = { ...s.profile, ...patch }; });

  /* ---- diary actions ---- */
  const ensureDay = (s, d) => { if (!s.diary[d]) s.diary[d] = { breakfast: [], lunch: [], dinner: [], snack: [] }; };
  const addEntry = (date, meal, entry) => mutate((s) => { ensureDay(s, date); s.diary[date][meal].push({ ...entry, id: uid() }); });
  // Remember a food picked from search so it surfaces at the top next time
  // (most-recent first, deduped by name, capped).
  const recordRecentFood = (f) => mutate((s) => {
    const item = { id: f.id || `r_${uid()}`, name: f.name, serving: f.serving || f.qty || "1 serving", kcal: f.kcal || 0, protein: f.protein || 0, carbs: f.carbs || 0, fat: f.fat || 0, source: f.source };
    const rest = (s.recentFoods || []).filter((x) => x.name.toLowerCase() !== item.name.toLowerCase());
    s.recentFoods = [item, ...rest].slice(0, 12);
  });
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
  const addToPlan = (date, meal, recipeId) => { cacheRecipe(recipeById(recipeId)); mutate((s) => { if (!s.plan[date]) s.plan[date] = { breakfast: [], lunch: [], dinner: [], snack: [] }; s.plan[date][meal].push(recipeId); }); };
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
    share(r.name, `${r.name} — via ${BRAND}\n${r.kcal} kcal · ${r.protein}P / ${r.carbs}C / ${r.fat}F per serving\n\nIngredients\n${ing}`);
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
      const isLabel = scanMode === "product";
      const sys = isLabel
        ? `You read packaged-food labels. Identify the product and read its Nutrition Facts. Return ONLY JSON (no markdown): {"name": string, "qty": string (the serving size shown), "kcal": number, "protein": number, "carbs": number, "fat": number}. If the label isn't fully legible, give your best estimate.`
        : `You estimate nutrition from a photo of a prepared meal. Identify the dish, estimate the size of ONE standard serving, and estimate how many servings are visible in the photo. Return ONLY JSON (no markdown): {"name": string, "serving_size": string (describe one serving with an approximate amount, e.g. "1 cup cooked (~200 g)"), "servings_in_photo": number (how many servings the photo shows, e.g. 1, 1.5, 2), "kcal": number, "protein": number, "carbs": number, "fat": number}. The kcal/protein/carbs/fat must be for ONE serving only (not the whole photo). Round to whole numbers.`;
      const txt = await callClaude(
        [
          { type: "image", source: { type: "base64", media_type: scanImg.media, data: b64 } },
          { type: "text", text: isLabel ? "Read this product label and return the JSON." : "Identify this meal, the serving size, and how many servings are shown. Return the JSON." },
        ], sys, 700);
      const p = extractJSON(txt);
      if (!p || typeof p !== "object") throw new Error("parse");
      const servingsInPhoto = isLabel ? 1 : Math.max(0.5, Math.round((+p.servings_in_photo || 1) * 2) / 2);
      setScanServings(servingsInPhoto);
      setScanResult({
        id: uid(), name: String(p.name || "Scanned item"),
        qty: String((isLabel ? p.qty : p.serving_size) || "1 serving"),
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
      setScanServings(1);
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
    const s = Math.max(0.5, scanServings || 1);
    const base = { kcal: scanResult.kcal, protein: scanResult.protein, carbs: scanResult.carbs, fat: scanResult.fat };
    const entry = {
      name: scanResult.name,
      qty: s === 1 ? scanResult.qty : `${fmtServ(s)} × ${scanResult.qty}`,
      kcal: Math.round(base.kcal * s), protein: Math.round(base.protein * s),
      carbs: Math.round(base.carbs * s), fat: Math.round(base.fat * s),
      base, unit: scanResult.qty, servings: s,
    };
    addEntry(date, meal, entry);
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
  const openScan = (date, meal) => { setScanImg(null); setScanResult(null); setScanError(""); setScanMode("meal"); setScanServings(1); setModal({ type: "scan", date, meal }); };
  const openRecipe = (id) => { cacheRecipe(recipeById(id)); setModal({ type: "recipe", id }); };
  const openPlanPicker = (date, meal) => { setRecipeFilter("All"); setRecipeSearch(""); setModal({ type: "planpick", date, meal }); };
  const openRecipeLog = (date, meal) => { setRecipeFilter("All"); setRecipeSearch(""); setModal({ type: "recipelog", date, meal }); };
  // Universal "log with servings" confirm step. `item` carries per-serving macros;
  // `back` is the modal to return to (so list flows keep going).
  const openLogItem = (date, meal, item, kind, back = null) => {
    setLogDraft({
      date, meal, kind, back, name: item.name, unit: item.serving || item.qty || "1 serving", source: item.source,
      kcal: +item.kcal || 0, protein: +item.protein || 0, carbs: +item.carbs || 0, fat: +item.fat || 0, servings: 1,
    });
    setModal({ type: "logitem" });
  };
  // Edit an already-logged diary entry: change name, per-serving macros, servings,
  // meal, or day. Falls back to treating the logged totals as a single serving for
  // older entries that weren't saved with a per-serving base.
  const openEditEntry = (date, meal, entry) => {
    const base = entry.base || { kcal: entry.kcal || 0, protein: entry.protein || 0, carbs: entry.carbs || 0, fat: entry.fat || 0 };
    setEditDraft({
      id: entry.id, origDate: date, origMeal: meal, date, meal,
      name: entry.name, unit: entry.unit || entry.qty || "1 serving", servings: entry.servings || 1,
      kcal: base.kcal, protein: base.protein, carbs: base.carbs, fat: base.fat,
    });
    setModal({ type: "editentry" });
  };
  const fmtServ = (n) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)));
  // − / value / + control for choosing how many servings to log (0.5 steps).
  const servingStepper = (value, setValue) => {
    const set = (v) => setValue(Math.max(0.5, Math.round(v * 2) / 2));
    return (
      <div className="flex items-center justify-center" style={{ gap: 12 }}>
        <button onClick={() => set(value - 0.5)} style={{ ...addBtn, width: 42, height: 42, background: C.leafSoft }}><Minus size={18} color={C.ever} /></button>
        <input value={value} onChange={(e) => { const raw = e.target.value.replace(/[^\d.]/g, ""); setValue(raw === "" ? 1 : +raw); }}
          inputMode="decimal" style={{ ...inputStyle, width: 72, textAlign: "center", fontSize: 19, fontWeight: 800, padding: "8px 4px" }} />
        <button onClick={() => set(value + 0.5)} style={{ ...addBtn, width: 42, height: 42, background: C.leafSoft }}><Plus size={18} color={C.ever} /></button>
      </div>
    );
  };
  const openDelivery = () => { setSyncState({ provider: null, status: "idle" }); setModal({ type: "delivery" }); };
  const openQuickAdd = () => setModal({ type: "quick" });
  const openProfile = () => setModal({ type: "profile" });
  const openLogCalendar = () => { const d = new Date(); setCalMonth({ y: d.getFullYear(), m: d.getMonth() }); setModal({ type: "logcal" }); };
  const closeModal = () => { setModal(null); stopVoice(); };
  const avatarName = state.profile.name && state.profile.name !== "You" ? state.profile.name : email;

  const todayDiary = state.diary[selDate] || { breakfast: [], lunch: [], dinner: [], snack: [] };
  const totals = dayTotals(todayDiary);
  const remaining = Math.round(state.goals.kcal - totals.kcal);

  /* ---- logging streak + history ---- */
  // A day counts as "logged" once it holds at least one diary entry.
  const dayLogged = (iso) => { const d = state.diary[iso]; return !!d && MEALS.some((m) => (d[m.key] || []).length > 0); };
  // Consecutive logged days ending today; a not-yet-logged today doesn't break it.
  const logStreak = useMemo(() => {
    let n = 0, cursor = todayISO();
    if (!dayLogged(cursor)) cursor = addDays(cursor, -1);
    while (dayLogged(cursor)) { n++; cursor = addDays(cursor, -1); }
    return n;
  }, [state.diary]);
  // Mon–Sun of the week containing today, for the dashboard strip.
  const streakWeek = useMemo(() => {
    const start = mondayOf(todayISO());
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [state.diary]);

  /* =========================================================================
     SCREEN: TODAY
  ========================================================================= */
  const renderToday = () => {
    const planExists = !!state.plan[selDate] && MEALS.some((m) => (state.plan[selDate][m.key] || []).length);
    return (
      <div>
        {/* evergreen hero */}
        <div style={{ background: `linear-gradient(160deg, ${C.ever} 0%, ${C.ever2} 100%)`, padding: "16px 18px 26px", color: "#fff", position: "relative" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>
                {(() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; })()}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {state.profile.name && state.profile.name !== "You" ? state.profile.name : "Welcome back"}
              </div>
            </div>
            <Avatar name={avatarName} onClick={openProfile} light size={40} />
          </div>
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
            <div style={{ flex: 1, minWidth: 0 }}>
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

        {/* logging streak — tap a day to jump to it, or the header for full history */}
        <div style={{ padding: "16px 18px 0" }}>
          <div style={{ ...cardStyle, margin: 0, padding: "11px 14px", border: `1px solid ${C.line}` }}>
            <button onClick={openLogCalendar} className="flex items-center justify-between" style={{ width: "100%", marginBottom: 9, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
              <div className="flex items-center" style={{ gap: 8 }}>
                <span style={{ width: 28, height: 28, borderRadius: 9, background: logStreak ? "#FDEBD3" : C.line, display: "grid", placeItems: "center" }}>
                  <Flame size={16} color={logStreak ? C.apricot : C.inkSoft} />
                </span>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: C.ink, lineHeight: 1 }}>{logStreak} day{logStreak === 1 ? "" : "s"}</div>
                  <div style={{ fontSize: 10.5, color: C.inkSoft, fontWeight: 600, marginTop: 2 }}>{logStreak ? "logging streak" : "start your streak today"}</div>
                </div>
              </div>
              <span className="flex items-center" style={{ gap: 3, fontSize: 11.5, color: C.inkSoft, fontWeight: 700 }}>History <ChevronRight size={14} /></span>
            </button>
            <div className="flex" style={{ gap: 6, justifyContent: "space-between" }}>
              {streakWeek.map((iso) => {
                const logged = dayLogged(iso);
                const isToday = iso === todayISO();
                const isSel = iso === selDate;
                const future = iso > todayISO();
                const dow = (fromISO(iso).getDay() + 6) % 7; // Mon=0
                return (
                  <button key={iso} disabled={future} onClick={() => { setSelDate(iso); setTab("today"); }}
                    style={{ flex: 1, textAlign: "center", background: "none", border: "none", padding: 0, cursor: future ? "default" : "pointer", opacity: future ? 0.4 : 1 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: C.inkSoft, marginBottom: 3 }}>{["M", "T", "W", "T", "F", "S", "S"][dow]}</div>
                    <div style={{ width: 23, height: 23, borderRadius: 99, margin: "0 auto", display: "grid", placeItems: "center",
                      background: logged ? C.ever : "transparent", border: logged ? (isSel ? `2px solid ${C.leaf}` : "none") : `1.5px solid ${isSel ? C.leaf : (isToday ? C.leaf : C.line)}` }}>
                      {logged ? <Check size={13} color="#fff" /> : <span style={{ fontSize: 10.5, fontWeight: 700, color: isToday ? C.ever : C.inkSoft }}>{fromISO(iso).getDate()}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
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
                    <button onClick={() => openEditEntry(selDate, m.key, e)} style={{ minWidth: 0, flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</div>
                      <div style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600 }}>{e.qty} · {e.protein}P / {e.carbs}C / {e.fat}F</div>
                    </button>
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
        <Header title="Meal planner" subtitle={`${shortDate(weekStart)} – ${shortDate(addDays(weekStart, 6))}`} right={<Avatar name={avatarName} onClick={openProfile} />} />
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
                              {r.image
                                ? <img src={r.image} alt="" style={{ width: 22, height: 22, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                                : <span style={{ fontSize: 16 }}>{r.emoji}</span>}
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
    const onlyMine = recipeFilter === "My recipes";
    const customMatches = (state.recipes || []).filter((r) =>
      !q || r.name.toLowerCase().includes(q) || (r.tags || []).join(" ").toLowerCase().includes(q));
    // Recently used recipes (from the cache) — shown for quick reuse, filtered by
    // the query, and deduped against custom recipes + the live results below.
    const recents = onlyMine ? [] : (state.recipeCache || []).filter((r) =>
      (!q || r.name.toLowerCase().includes(q)) && !customMatches.some((c) => c.id === r.id));
    const recentIds = new Set(recents.map((r) => r.id));
    const popular = onlyMine ? [] : spResults.filter((r) => !recentIds.has(r.id) && !customMatches.some((c) => c.id === r.id));
    const hasCustom = (state.recipes || []).length > 0;
    const sectionHeader = (t) => <div style={{ fontSize: 11, fontWeight: 800, color: C.inkSoft, letterSpacing: 0.3, margin: "8px 2px 8px" }}>{t}</div>;
    const nothing = !customMatches.length && !recents.length && !popular.length;
    return (
      <div>
        <Header title="Recipes" subtitle="Search thousands of recipes" right={<Avatar name={avatarName} onClick={openProfile} />} />
        <div style={{ padding: "0 18px 10px" }}>
          <SearchInput value={recipeSearch} onChange={setRecipeSearch} placeholder="Search recipes (e.g. chicken pasta)" />
        </div>
        <div style={{ padding: "0 18px 12px" }}>
          <button onClick={() => openRecipeBuilder()} style={{ ...primaryBtn }}><ChefHat size={17} /> Create your own recipe</button>
        </div>
        {hasCustom && (
          <div className="flex" style={{ gap: 8, padding: "0 18px 12px", overflowX: "auto" }}>
            {["All", "My recipes"].map((t) => <Pill key={t} active={recipeFilter === t} onClick={() => setRecipeFilter(t)}>{t}</Pill>)}
          </div>
        )}
        <div style={{ padding: "0 18px 24px" }}>
          {customMatches.length > 0 && onlyMine === false && recents.length + popular.length > 0 && sectionHeader("MY RECIPES")}
          {customMatches.map((r) => recipeRow(r, () => openRecipe(r.id)))}
          {recents.length > 0 && sectionHeader("RECENTLY USED")}
          {recents.map((r) => recipeRow(r, () => openRecipe(r.id)))}
          {popular.length > 0 && sectionHeader(q ? "RESULTS" : "POPULAR")}
          {popular.length > 0 && !onlyMine && spSource === "edamam" && (
            <div style={{ fontSize: 11, color: C.inkSoft, fontWeight: 600, margin: "-2px 2px 8px" }}>Showing Edamam results (Spoonacular limit reached).</div>
          )}
          {popular.map((r) => recipeRow(r, () => openRecipe(r.id)))}
          {spBusy && !onlyMine && (
            <div className="flex items-center" style={{ gap: 8, padding: "12px 4px", color: C.inkSoft, fontSize: 13, fontWeight: 600 }}>
              <Loader2 size={16} className="pl-spin" /> Searching recipes…
            </div>
          )}
          {spError && !onlyMine && <div style={errBox}>{spError}</div>}
          {!spBusy && nothing && !spError && <Empty text={q ? "No recipes found — try another search." : "Search for a recipe above."} />}
        </div>
      </div>
    );
  };

  // Shared recipe list row (photo or emoji thumb + macros), used on the Recipes
  // screen and in the plan / log pickers.
  const recipeRow = (r, onClick) => (
    <button key={r.id} onClick={onClick} style={{ ...cardStyle, width: "100%", textAlign: "left", cursor: "pointer", display: "flex", gap: 12, alignItems: "center" }}>
      {r.image
        ? <img src={r.image} alt="" loading="lazy" style={{ width: 56, height: 56, borderRadius: 14, objectFit: "cover", flexShrink: 0, background: r.bg }} />
        : <div style={{ width: 56, height: 56, borderRadius: 14, background: r.bg, display: "grid", placeItems: "center", fontSize: 28, flexShrink: 0 }}>{r.emoji}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center" style={{ gap: 6 }}>
          <div style={{ fontWeight: 800, color: C.ink, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
          {r.custom && <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 800, color: C.ever2, background: C.leafSoft, borderRadius: 5, padding: "1px 5px", letterSpacing: 0.3 }}>YOURS</span>}
        </div>
        <div className="flex items-center" style={{ gap: 8, marginTop: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.apricot, fontVariantNumeric: "tabular-nums" }}>{r.kcal} kcal</span>
          <span style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600 }}>· {r.protein}P / {r.carbs}C / {r.fat}F</span>
          {r.minutes > 0 && <span className="flex items-center" style={{ gap: 3, fontSize: 11.5, color: C.inkSoft, fontWeight: 600 }}><Clock size={11} />{r.minutes}m</span>}
        </div>
        {(r.tags || []).length > 0 && (
          <div className="flex" style={{ gap: 5, marginTop: 6, flexWrap: "wrap" }}>
            {r.tags.slice(0, 3).map((t) => <span key={t} style={tagStyle}>{t}</span>)}
          </div>
        )}
      </div>
    </button>
  );

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
        <Header title="Shop" subtitle={total ? `${done}/${total} gathered` : "Your grocery list"} right={<Avatar name={avatarName} onClick={openProfile} />} />
        <div className="flex" style={{ gap: 8, padding: "0 18px 12px" }}>
          <input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGrocery(newItem)}
            placeholder="Add an item…" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={() => addGrocery(newItem)} style={{ ...addBtn, width: 40, height: 40, background: C.ever }}><Plus size={18} color="#fff" /></button>
        </div>

        {total > 0 && (
          <div style={{ padding: "0 18px 12px" }}>
            <button onClick={buildGroceryFromWeek} style={secondaryBtn}><RefreshCw size={16} /> Refresh from this week’s plan</button>
            <p style={{ fontSize: 11, color: C.inkSoft, fontWeight: 600, margin: "6px 2px 0", lineHeight: 1.4 }}>Rebuilds plan items from your week; your manually-added items are kept.</p>
          </div>
        )}

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
        <Header title="Progress" subtitle="Trends & reports" right={<Avatar name={avatarName} onClick={openProfile} />} />
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
    const recents = state.recentFoods || [];
    const showingRecents = !q;
    let results;
    if (q) {
      const local = FOODS.filter((f) => f.name.toLowerCase().includes(q));
      const localNames = new Set(local.map((f) => f.name.toLowerCase()));
      const remote = foodResults.filter((f) => !localNames.has(f.name.toLowerCase()));
      results = [...local, ...remote].slice(0, 40);
    } else {
      results = recents.length ? recents : FOODS.slice(0, 8);
    }
    const mealLabel = MEALS.find((m) => m.key === modal.meal)?.label;
    const canManual = manual.name.trim() && manual.kcal !== "";
    return (
      <Sheet open title={`Add to ${mealLabel}`} onClose={closeModal} big>
        <div className="flex" style={{ gap: 8, marginBottom: 12 }}>
          <button onClick={() => { closeModal(); openRecipeLog(modal.date, modal.meal); }} style={miniAction}><BookOpen size={15} /> Recipes</button>
          <button onClick={() => { closeModal(); openAI(modal.date, modal.meal); }} style={miniAction}><Sparkles size={15} /> Describe</button>
          <button onClick={() => { closeModal(); openScan(modal.date, modal.meal); }} style={miniAction}><Camera size={15} /> Scan</button>
        </div>
        <SearchInput value={foodSearch} onChange={setFoodSearch} placeholder="Search foods (USDA database)" />
        <div style={{ marginTop: 10 }}>
          {showingRecents && (
            <div style={{ fontSize: 11, fontWeight: 800, color: C.inkSoft, letterSpacing: 0.3, margin: "2px 2px 8px" }}>
              {recents.length ? "RECENT" : "POPULAR"}
            </div>
          )}
          {results.map((f) => (
            <button key={f.id} onClick={() => openLogItem(modal.date, modal.meal, f, "food", { type: "add", date: modal.date, meal: modal.meal })}
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
            const entry = { name: manual.name.trim(), qty: manual.qty || "1 serving", kcal: +manual.kcal || 0, protein: +manual.protein || 0, carbs: +manual.carbs || 0, fat: +manual.fat || 0 };
            recordRecentFood({ ...entry, serving: entry.qty });
            addEntry(modal.date, modal.meal, entry);
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
              <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 10 }}>1 serving = {scanResult.qty}</div>
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
            <p style={{ fontSize: 11, color: C.inkSoft, margin: "6px 2px 0" }}>
              {scanMode === "barcode" ? "From Open Food Facts — values are per serving; adjust if needed."
                : scanMode === "product" ? "Read from the label — values are per serving; adjust if needed."
                : "Estimated per serving. Plately also guessed how many servings are in your photo below — adjust if it looks off."}
            </p>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: C.inkSoft, textAlign: "center", margin: "14px 0 8px" }}>{scanMode === "meal" ? "Servings in photo" : "Servings"}</div>
            {servingStepper(scanServings, setScanServings)}
            {scanServings !== 1 && (
              <div style={{ fontSize: 12, color: C.ever2, fontWeight: 700, textAlign: "center", marginTop: 10 }}>
                Total: {Math.round(scanResult.kcal * scanServings)} kcal · {Math.round(scanResult.protein * scanServings)}P / {Math.round(scanResult.carbs * scanServings)}C / {Math.round(scanResult.fat * scanServings)}F
              </div>
            )}
            <button onClick={commitScan} style={{ ...primaryBtn, marginTop: 14 }}><Check size={16} /> Log to {mealLabel}</button>
          </div>
        )}
      </Sheet>
    );
  };

  const renderRecipeModal = () => {
    const r = recipeById(modal.id); if (!r) return null;
    return (
      <Sheet open title={r.name} onClose={closeModal} big>
        {r.image
          ? <img src={r.image} alt={r.name} style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 18, marginBottom: 14, background: r.bg }} />
          : <div style={{ height: 120, borderRadius: 18, background: r.bg, display: "grid", placeItems: "center", fontSize: 56, marginBottom: 14 }}>{r.emoji}</div>}
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

        <div className="flex" style={{ gap: 8 }}>
          <button onClick={() => openLogItem(todayISO(), mealByHour(), { name: r.name, serving: "1 serving", kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat }, "recipe")} style={{ ...primaryBtn, flex: 1 }}>
            <Plus size={16} /> Log to today
          </button>
          <button onClick={() => shareRecipe(r)} style={{ ...addBtn, width: 46, height: 46, background: C.leafSoft }}><Share2 size={18} color={C.ever} /></button>
        </div>
        <button onClick={() => { closeModal(); openPlanPicker(todayISO(), mealByHour()); }} style={{ ...secondaryBtn, marginTop: 10 }}><CalendarDays size={16} /> Add to a meal plan</button>
        {isCustomRecipe(r.id) && (
          <div className="flex" style={{ gap: 8, marginTop: 10 }}>
            <button onClick={() => openRecipeBuilder(r)} style={{ ...secondaryBtn, flex: 1 }}><PenLine size={16} /> Edit</button>
            <button onClick={() => deleteRecipe(r.id)} style={{ ...secondaryBtn, flex: 1, color: C.fat, borderColor: C.fat }}><Trash2 size={16} /> Delete</button>
          </div>
        )}
      </Sheet>
    );
  };

  const renderRecipeBuilder = () => {
    const d = recipeDraft;
    const upd = (patch) => setRecipeDraft({ ...d, ...patch });
    const num = (v) => String(v).replace(/[^\d.]/g, "");
    const toggleTag = (t) => upd({ tags: d.tags.includes(t) ? d.tags.filter((x) => x !== t) : [...d.tags, t] });
    const setIng = (i, patch) => upd({ ingredients: d.ingredients.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
    const addIng = () => upd({ ingredients: [...d.ingredients, { name: "", qty: "", unit: "" }] });
    const rmIng = (i) => upd({ ingredients: d.ingredients.filter((_, j) => j !== i) });
    const canSave = d.name.trim().length > 0;
    const autoMacros = anyIngMacros(d.ingredients);
    const perServing = macrosFromIngredients(d.ingredients, d.servings);
    return (
      <Sheet open title={d.id ? "Edit recipe" : "New recipe"} onClose={closeBuilder} big>
        {/* name + emoji */}
        <div className="flex" style={{ gap: 10, marginBottom: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: d.bg || C.leafSoft, display: "grid", placeItems: "center", fontSize: 30, flexShrink: 0 }}>{d.emoji}</div>
          <input value={d.name} onChange={(e) => upd({ name: e.target.value })} placeholder="Recipe name" style={{ ...inputStyle, flex: 1 }} />
        </div>
        <div className="flex" style={{ gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 4 }}>
          {RECIPE_EMOJIS.map((em) => (
            <button key={em} onClick={() => upd({ emoji: em })}
              style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, fontSize: 20, cursor: "pointer",
                border: `1.5px solid ${d.emoji === em ? C.ever : C.line}`, background: d.emoji === em ? C.leafSoft : C.surface }}>{em}</button>
          ))}
        </div>

        <SectionTitle>Tags</SectionTitle>
        <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
          {GOAL_TAGS.map((t) => <Pill key={t} active={d.tags.includes(t)} onClick={() => toggleTag(t)}>{t}</Pill>)}
        </div>

        <SectionTitle>Per serving</SectionTitle>
        <div style={{ ...cardStyle }}>
          <div className="flex" style={{ gap: 8, marginBottom: 8 }}>
            {[["servings", "Servings"], ["minutes", "Minutes"]].map(([k, lbl]) => (
              <div key={k} style={{ flex: 1 }}>
                <div style={{ fontSize: 10.5, color: C.inkSoft, fontWeight: 700, textAlign: "center", marginBottom: 3 }}>{lbl}</div>
                <input value={d[k]} onChange={(e) => upd({ [k]: num(e.target.value) })} inputMode="numeric" style={{ ...inputStyle, width: "100%", textAlign: "center" }} />
              </div>
            ))}
          </div>
          {autoMacros ? (
            <div className="flex" style={{ gap: 8 }}>
              {[["kcal", "kcal"], ["protein", "P"], ["carbs", "C"], ["fat", "F"]].map(([k, lbl]) => (
                <div key={k} style={{ flex: 1, textAlign: "center", background: C.leafSoft, borderRadius: 10, padding: "8px 4px" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.ever, fontVariantNumeric: "tabular-nums" }}>{perServing[k]}</div>
                  <div style={{ fontSize: 10, color: C.ever2, fontWeight: 700 }}>{lbl}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex" style={{ gap: 8 }}>
              {[["kcal", "kcal"], ["protein", "P"], ["carbs", "C"], ["fat", "F"]].map(([k, lbl]) => (
                <div key={k} style={{ flex: 1 }}>
                  <div style={{ fontSize: 10.5, color: C.inkSoft, fontWeight: 700, textAlign: "center", marginBottom: 3 }}>{lbl}</div>
                  <input value={d[k]} onChange={(e) => upd({ [k]: num(e.target.value) })} inputMode="numeric" placeholder="0" style={{ ...inputStyle, width: "100%", textAlign: "center", padding: "8px 4px" }} />
                </div>
              ))}
            </div>
          )}
          {autoMacros && <div style={{ fontSize: 10.5, color: C.inkSoft, fontWeight: 600, textAlign: "center", marginTop: 8 }}>Calculated from {d.servings || 1} serving{(+d.servings || 1) > 1 ? "s" : ""} of ingredients below</div>}
        </div>

        <SectionTitle>Ingredients</SectionTitle>
        {d.ingredients.map((ing, i) => {
          const tracked = ingHasMacros(ing);
          const q = +ing.qty || 0;
          return (
            <div key={i} style={{ marginBottom: 8 }}>
              <div className="flex items-center" style={{ gap: 6 }}>
                <input value={ing.name} onChange={(e) => setIng(i, { name: e.target.value })} placeholder="Ingredient" style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
                <input value={ing.qty} onChange={(e) => setIng(i, { qty: e.target.value.replace(/[^\d.]/g, "") })} inputMode="decimal" placeholder="Qty" style={{ ...inputStyle, width: 52, textAlign: "center", padding: "10px 4px" }} />
                <input value={ing.unit} onChange={(e) => setIng(i, { unit: e.target.value })} placeholder="unit" style={{ ...inputStyle, width: 60, padding: "10px 6px" }} />
                <button onClick={() => rmIng(i)} style={trashBtn}><X size={15} /></button>
              </div>
              {tracked && (
                <div style={{ fontSize: 10.5, color: C.ever2, fontWeight: 700, margin: "4px 0 0 2px" }}>
                  {Math.round((+ing.kcal || 0) * q)} kcal · {Math.round((+ing.protein || 0) * q)}P / {Math.round((+ing.carbs || 0) * q)}C / {Math.round((+ing.fat || 0) * q)}F
                </div>
              )}
            </div>
          );
        })}
        <div className="flex" style={{ gap: 8, marginTop: 2 }}>
          <button onClick={() => openIngredientPick("search")} style={{ ...secondaryBtn, flex: 1 }}><Search size={15} /> Database</button>
          <button onClick={() => openIngredientPick("barcode")} style={{ ...secondaryBtn, flex: 1 }}><ScanLine size={15} /> Scan</button>
        </div>
        <button onClick={addIng} style={{ ...secondaryBtn, marginTop: 8 }}><Plus size={15} /> Add manually</button>

        <button disabled={!canSave} onClick={saveRecipe} style={{ ...primaryBtn, marginTop: 18, opacity: canSave ? 1 : 0.45 }}>
          <Check size={17} /> {d.id ? "Save changes" : "Save recipe"}
        </button>
      </Sheet>
    );
  };

  // Ingredient picker for the recipe builder: search the food database or scan a
  // barcode, then add the result (with macros) back into the recipe draft.
  const renderIngredientPick = () => {
    const q = foodSearch.trim().toLowerCase();
    const local = q ? FOODS.filter((f) => f.name.toLowerCase().includes(q)) : FOODS.slice(0, 8);
    const localNames = new Set(local.map((f) => f.name.toLowerCase()));
    const remote = foodResults.filter((f) => !localNames.has(f.name.toLowerCase()));
    const results = [...local, ...remote].slice(0, 40);
    const back = () => setModal({ type: "recipebuilder" });
    return (
      <Sheet open title="Add ingredient" onClose={back} big>
        <div className="flex" style={{ gap: 8, marginBottom: 14, background: C.line, padding: 4, borderRadius: 12 }}>
          {[["search", "Database", "🔍"], ["barcode", "Barcode", "📷"], ["label", "Label", "🏷️"]].map(([k, lbl, em]) => (
            <button key={k} onClick={() => { setIngPickMode(k); setScanResult(null); setScanError(""); setScanImg(null); if (k === "label") setScanMode("product"); }}
              style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
                background: ingPickMode === k ? C.surface : "transparent", color: ingPickMode === k ? C.ink : C.inkSoft, boxShadow: ingPickMode === k ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
              {em} {lbl}
            </button>
          ))}
        </div>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => onPickImage(e.target.files?.[0])} />

        {ingPickMode === "search" && (
          <>
            <SearchInput value={foodSearch} onChange={setFoodSearch} placeholder="Search foods (USDA database)" />
            <div style={{ marginTop: 10 }}>
              {results.map((f) => (
                <button key={f.id} onClick={() => addIngredientFromFood(f)} style={{ ...rowBtn }}>
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
                <div style={{ padding: "10px 4px", color: C.inkSoft, fontSize: 12.5, fontWeight: 600 }}>No matches — try the barcode or label tab, or add it manually.</div>
              )}
            </div>
          </>
        )}

        {ingPickMode === "barcode" && !scanResult && (
          <div>
            <BarcodeScanner onDetect={runBarcode} />
            {scanBusy && (
              <div className="flex items-center" style={{ gap: 8, justifyContent: "center", marginTop: 12, color: C.inkSoft, fontSize: 13, fontWeight: 600 }}>
                <Loader2 size={16} className="pl-spin" /> Looking up product…
              </div>
            )}
          </div>
        )}

        {ingPickMode === "label" && !scanResult && (
          !scanImg ? (
            <button onClick={() => fileRef.current?.click()}
              style={{ width: "100%", padding: "32px 16px", borderRadius: 18, border: `2px dashed ${C.line}`, background: "#FAF9F3", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: C.inkSoft }}>
              <div style={{ width: 56, height: 56, borderRadius: 99, background: C.leafSoft, display: "grid", placeItems: "center" }}>
                <ScanLine size={26} color={C.ever} />
              </div>
              <div style={{ fontWeight: 800, color: C.ink, fontSize: 14 }}>Snap the nutrition label</div>
              <div style={{ fontSize: 12 }}>Camera on mobile · upload on desktop</div>
            </button>
          ) : (
            <div>
              <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: `1px solid ${C.line}` }}>
                <img src={scanImg.dataUrl} alt="label" style={{ width: "100%", maxHeight: 230, objectFit: "cover", display: "block" }} />
                <button onClick={() => { setScanImg(null); setScanResult(null); }} style={{ position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 99, border: "none", background: "rgba(0,0,0,.55)", color: "#fff", cursor: "pointer", display: "grid", placeItems: "center" }}><X size={16} /></button>
              </div>
              <button disabled={scanBusy} onClick={runScan} style={{ ...primaryBtn, marginTop: 12, opacity: scanBusy ? 0.55 : 1 }}>
                {scanBusy ? <><Loader2 size={16} className="pl-spin" /> Reading label…</> : <><Sparkles size={16} /> Identify & estimate</>}
              </button>
            </div>
          )
        )}

        {ingPickMode !== "search" && scanError && <div style={errBox}>{scanError}</div>}

        {ingPickMode !== "search" && scanResult && (
          <div style={{ marginTop: 4 }}>
            <div style={{ ...cardStyle, padding: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 4 }}>{scanResult.name}</div>
              <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 10 }}>{scanResult.qty} · {scanResult.protein}P / {scanResult.carbs}C / {scanResult.fat}F · {scanResult.kcal} kcal</div>
              <button onClick={() => addIngredientFromFood(scanResult)} style={primaryBtn}><Plus size={16} /> Add to recipe</button>
              <button onClick={() => { setScanResult(null); setScanImg(null); }} style={{ ...secondaryBtn, marginTop: 8 }}>{ingPickMode === "label" ? "Scan another label" : "Scan another"}</button>
            </div>
            <p style={{ fontSize: 11, color: C.inkSoft, margin: "6px 2px 0" }}>{ingPickMode === "label" ? "Estimated from the label" : "From Open Food Facts"} — quantity defaults to 1 serving; adjust it in the recipe.</p>
          </div>
        )}
      </Sheet>
    );
  };

  // Month calendar of logged days; tap a day to jump the Today view to it.
  const renderLogCalendar = () => {
    const { y, m } = calMonth;
    const first = new Date(y, m, 1);
    const lead = (first.getDay() + 6) % 7; // blanks before day 1 (Mon-first)
    const days = new Date(y, m + 1, 0).getDate();
    const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
    const step = (delta) => setCalMonth(({ y, m }) => { const d = new Date(y, m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
    const loggedCount = Array.from({ length: days }, (_, i) => toISO(new Date(y, m, i + 1))).filter(dayLogged).length;
    return (
      <Sheet open title="Logging history" onClose={closeModal} big>
        <div className="flex items-center" style={{ gap: 10, ...cardStyle, padding: 14, marginTop: 0 }}>
          <span style={{ width: 38, height: 38, borderRadius: 11, background: logStreak ? "#FDEBD3" : C.line, display: "grid", placeItems: "center" }}>
            <Flame size={20} color={logStreak ? C.apricot : C.inkSoft} />
          </span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, lineHeight: 1 }}>{logStreak} day{logStreak === 1 ? "" : "s"}</div>
            <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginTop: 3 }}>current logging streak</div>
          </div>
        </div>

        <div className="flex items-center justify-between" style={{ margin: "16px 2px 12px" }}>
          <button onClick={() => step(-1)} style={ghostBtn}><ChevronLeft size={18} /></button>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>{["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m]} {y}</div>
          <button onClick={() => step(1)} style={ghostBtn}><ChevronRight size={18} /></button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 700, color: C.inkSoft }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const iso = toISO(new Date(y, m, day));
            const logged = dayLogged(iso);
            const isToday = iso === todayISO();
            const future = iso > todayISO();
            return (
              <button key={i} disabled={future}
                onClick={() => { setSelDate(iso); setTab("today"); closeModal(); }}
                style={{ aspectRatio: "1", borderRadius: 10, cursor: future ? "default" : "pointer", display: "grid", placeItems: "center",
                  border: isToday ? `1.5px solid ${C.leaf}` : "1px solid transparent",
                  background: logged ? C.ever : "transparent", color: logged ? "#fff" : (future ? "#C9CDC6" : C.ink),
                  fontSize: 13, fontWeight: 700, opacity: future ? 0.5 : 1 }}>
                {day}
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600, textAlign: "center", marginTop: 14 }}>
          <b style={{ color: C.ever }}>{loggedCount}</b> day{loggedCount === 1 ? "" : "s"} logged this month · tap a day to view it
        </p>
      </Sheet>
    );
  };

  const renderPlanPick = () => {
    const q = recipeSearch.trim().toLowerCase();
    const customMatches = (state.recipes || []).filter((r) => !q || r.name.toLowerCase().includes(q));
    const recents = (state.recipeCache || []).filter((r) => (!q || r.name.toLowerCase().includes(q)) && !customMatches.some((c) => c.id === r.id));
    const recentIds = new Set(recents.map((r) => r.id));
    const popular = spResults.filter((r) => !recentIds.has(r.id) && !customMatches.some((c) => c.id === r.id));
    const mealLabel = MEALS.find((m) => m.key === modal.meal)?.label;
    const pick = (r) => { addToPlan(modal.date, modal.meal, r.id); flash(`Added ${r.name} to plan`); closeModal(); };
    const header = (t) => <div style={{ fontSize: 11, fontWeight: 800, color: C.inkSoft, letterSpacing: 0.3, margin: "8px 2px 8px" }}>{t}</div>;
    const nothing = !customMatches.length && !recents.length && !popular.length;
    return (
      <Sheet open title={`Add to ${mealLabel} · ${relDay(modal.date)}`} onClose={closeModal} big>
        <SearchInput value={recipeSearch} onChange={setRecipeSearch} placeholder="Search recipes" />
        <button onClick={() => openRecipeBuilder(null, { type: "planpick", date: modal.date, meal: modal.meal })} style={{ ...secondaryBtn, marginTop: 10 }}><ChefHat size={16} /> Create your own recipe</button>
        <div style={{ marginTop: 6 }}>
          {customMatches.length > 0 && (recents.length + popular.length > 0) && header("MY RECIPES")}
          {customMatches.map((r) => recipeRow(r, () => pick(r)))}
          {recents.length > 0 && header("RECENTLY USED")}
          {recents.map((r) => recipeRow(r, () => pick(r)))}
          {popular.length > 0 && header(q ? "RESULTS" : "POPULAR")}
          {popular.map((r) => recipeRow(r, () => pick(r)))}
          {spBusy && <div className="flex items-center" style={{ gap: 8, padding: "12px 4px", color: C.inkSoft, fontSize: 13, fontWeight: 600 }}><Loader2 size={16} className="pl-spin" /> Searching recipes…</div>}
          {spError && <div style={errBox}>{spError}</div>}
          {!spBusy && nothing && !spError && <div style={{ padding: "10px 4px", color: C.inkSoft, fontSize: 12.5, fontWeight: 600 }}>No recipes found.</div>}
        </div>
      </Sheet>
    );
  };

  // Confirm a log with a servings multiplier; scales macros and the meal choice.
  const renderLogItem = () => {
    const d = logDraft; if (!d) return null;
    const s = Math.max(0.5, d.servings || 1);
    const setServings = (v) => setLogDraft({ ...d, servings: v });
    const scaled = (v) => Math.round(v * s);
    const mealLabel = MEALS.find((m) => m.key === d.meal)?.label;
    const back = () => setModal(d.back || null);
    const logIt = () => {
      const entry = {
        name: d.name,
        qty: s === 1 ? d.unit : `${fmtServ(s)} × ${d.unit}`,
        kcal: scaled(d.kcal), protein: scaled(d.protein), carbs: scaled(d.carbs), fat: scaled(d.fat),
        // Keep the per-serving base so the entry can be re-scaled when edited.
        base: { kcal: d.kcal, protein: d.protein, carbs: d.carbs, fat: d.fat }, unit: d.unit, servings: s,
      };
      if (d.kind === "food") recordRecentFood({ name: d.name, serving: d.unit, kcal: d.kcal, protein: d.protein, carbs: d.carbs, fat: d.fat, source: d.source });
      addEntry(d.date, d.meal, entry);
      flash(`Logged ${d.name}`);
      setModal(d.back || null);
    };
    return (
      <Sheet open title="Log item" onClose={back}>
        <div style={{ ...cardStyle, padding: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 2 }}>{d.name}</div>
          <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 12 }}>{d.unit} each</div>
          <div className="flex" style={{ gap: 8 }}>
            {[["kcal", scaled(d.kcal), C.apricot], ["P", scaled(d.protein), C.protein], ["C", scaled(d.carbs), C.carbs], ["F", scaled(d.fat), C.fat]].map(([l, v, col]) => (
              <div key={l} style={{ flex: 1, textAlign: "center", background: "#FAF9F3", borderRadius: 10, padding: "8px 4px" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: col, fontVariantNumeric: "tabular-nums" }}>{v}</div>
                <div style={{ fontSize: 10, color: C.inkSoft, fontWeight: 700 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <SectionTitle>Servings</SectionTitle>
        {servingStepper(d.servings, setServings)}

        <SectionTitle>Meal</SectionTitle>
        <div className="flex" style={{ gap: 6, flexWrap: "wrap" }}>
          {MEALS.map((m) => (
            <Pill key={m.key} active={d.meal === m.key} onClick={() => setLogDraft({ ...d, meal: m.key })}>{m.emoji} {m.label}</Pill>
          ))}
        </div>

        <button onClick={logIt} style={{ ...primaryBtn, marginTop: 18 }}><Plus size={16} /> Log to {mealLabel}</button>
      </Sheet>
    );
  };

  // Edit an existing diary entry: name, per-serving macros, servings, meal, day.
  const renderEditEntry = () => {
    const d = editDraft; if (!d) return null;
    const s = Math.max(0.5, d.servings || 1);
    const set = (patch) => setEditDraft({ ...d, ...patch });
    const setNum = (k, v) => set({ [k]: Math.max(0, +String(v).replace(/[^\d.]/g, "") || 0) });
    const scaled = (v) => Math.round(v * s);
    const save = () => {
      const entry = {
        id: d.id, name: d.name.trim() || "Item",
        qty: s === 1 ? d.unit : `${fmtServ(s)} × ${d.unit}`,
        kcal: scaled(d.kcal), protein: scaled(d.protein), carbs: scaled(d.carbs), fat: scaled(d.fat),
        base: { kcal: d.kcal, protein: d.protein, carbs: d.carbs, fat: d.fat }, unit: d.unit, servings: s,
      };
      mutate((st) => {
        ensureDay(st, d.origDate); ensureDay(st, d.date);
        st.diary[d.origDate][d.origMeal] = st.diary[d.origDate][d.origMeal].filter((e) => e.id !== d.id);
        st.diary[d.date][d.meal].push(entry);
      });
      closeModal(); flash("Entry updated");
    };
    const del = () => { removeEntry(d.origDate, d.origMeal, d.id); closeModal(); flash("Entry removed"); };
    return (
      <Sheet open title="Edit entry" onClose={closeModal} big>
        <SectionTitle>Name</SectionTitle>
        <input value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Name" style={{ ...inputStyle, width: "100%" }} />

        <SectionTitle>Per serving</SectionTitle>
        <div style={{ ...cardStyle }}>
          <div className="flex" style={{ gap: 8 }}>
            {[["kcal", "kcal"], ["protein", "P"], ["carbs", "C"], ["fat", "F"]].map(([k, lbl]) => (
              <div key={k} style={{ flex: 1 }}>
                <div style={{ fontSize: 10.5, color: C.inkSoft, fontWeight: 700, textAlign: "center", marginBottom: 3 }}>{lbl}</div>
                <input value={d[k]} onChange={(e) => setNum(k, e.target.value)} inputMode="numeric" style={{ ...inputStyle, width: "100%", textAlign: "center", padding: "8px 4px" }} />
              </div>
            ))}
          </div>
        </div>

        <SectionTitle>Servings</SectionTitle>
        {servingStepper(d.servings, (v) => set({ servings: v }))}
        {s !== 1 && (
          <div style={{ fontSize: 12, color: C.ever2, fontWeight: 700, textAlign: "center", marginTop: 10 }}>
            Total: {scaled(d.kcal)} kcal · {scaled(d.protein)}P / {scaled(d.carbs)}C / {scaled(d.fat)}F
          </div>
        )}

        <SectionTitle>Meal</SectionTitle>
        <div className="flex" style={{ gap: 6, flexWrap: "wrap" }}>
          {MEALS.map((m) => (
            <Pill key={m.key} active={d.meal === m.key} onClick={() => set({ meal: m.key })}>{m.emoji} {m.label}</Pill>
          ))}
        </div>

        <SectionTitle>Day</SectionTitle>
        <div className="flex items-center justify-between" style={{ ...cardStyle, padding: "10px 12px" }}>
          <button onClick={() => set({ date: addDays(d.date, -1) })} style={ghostBtn}><ChevronLeft size={18} /></button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{relDay(d.date)}</div>
            <div style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600 }}>{niceDate(d.date)}</div>
          </div>
          <button onClick={() => set({ date: addDays(d.date, 1) })} style={ghostBtn}><ChevronRight size={18} /></button>
        </div>

        <button onClick={save} style={{ ...primaryBtn, marginTop: 18 }}><Check size={16} /> Save changes</button>
        <button onClick={del} style={{ ...secondaryBtn, marginTop: 10, color: C.fat, borderColor: C.fat }}><Trash2 size={16} /> Delete entry</button>
      </Sheet>
    );
  };

  // Pick a recipe to log straight into a diary meal (vs. the meal plan).
  const renderRecipeLog = () => {
    const q = recipeSearch.trim().toLowerCase();
    const customMatches = (state.recipes || []).filter((r) => !q || r.name.toLowerCase().includes(q));
    const list = [...customMatches, ...spResults];
    const mealLabel = MEALS.find((m) => m.key === modal.meal)?.label;
    return (
      <Sheet open title={`Log recipe to ${mealLabel} · ${relDay(modal.date)}`} onClose={closeModal} big>
        <SearchInput value={recipeSearch} onChange={setRecipeSearch} placeholder="Search recipes" />
        <div style={{ marginTop: 10 }}>
          {list.map((r) => recipeRow(r, () => { cacheRecipe(r); openLogItem(modal.date, modal.meal, { name: r.name, serving: "1 serving", kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat }, "recipe", { type: "recipelog", date: modal.date, meal: modal.meal }); }))}
          {spBusy && <div className="flex items-center" style={{ gap: 8, padding: "12px 4px", color: C.inkSoft, fontSize: 13, fontWeight: 600 }}><Loader2 size={16} className="pl-spin" /> Searching recipes…</div>}
          {spError && <div style={errBox}>{spError}</div>}
          {!spBusy && !list.length && !spError && <div style={{ padding: "10px 4px", color: C.inkSoft, fontSize: 12.5, fontWeight: 600 }}>No recipes found.</div>}
        </div>
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

  const renderProfile = () => {
    const targets = recommendedTargets(state.profile);
    const applyTargets = () => {
      if (!targets) { flash("Add your stats first"); return; }
      mutate((s) => { s.goals = { ...targets }; });
      setGoalDraft(targets);
      flash("Targets updated from your stats");
    };
    return (
      <Sheet open title="Profile" onClose={closeModal} big>
        {/* identity card */}
        <div className="flex items-center" style={{ gap: 14, ...cardStyle, padding: 16 }}>
          <Avatar name={avatarName} size={54} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{state.profile.name || "Your profile"}</div>
            {email && <div style={{ fontSize: 12.5, color: C.inkSoft, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>}
          </div>
        </div>

        <SectionTitle>Your details</SectionTitle>
        <div style={{ ...cardStyle, padding: 14 }}>
          <ProfileFields value={state.profile} onChange={patchProfile} />
        </div>

        <SectionTitle>Recommended targets</SectionTitle>
        <TargetPreview profile={state.profile} />
        <button onClick={applyTargets} style={{ ...secondaryBtn, marginTop: 10 }} disabled={!targets}>
          <Target size={16} /> Use these as my daily goals
        </button>
        <button onClick={() => { closeModal(); setModal({ type: "settings" }); }} style={{ ...secondaryBtn, marginTop: 10 }}>
          <Settings size={16} /> Goals &amp; settings
        </button>

        {supabase && session && (
          <>
            <SectionTitle>Account</SectionTitle>
            <button onClick={() => supabase.auth.signOut()}
              style={{ ...primaryBtn, background: C.fat, marginTop: 2 }}>
              <LogOut size={17} /> Log out
            </button>
            <p style={{ fontSize: 11.5, color: C.inkSoft, textAlign: "center", margin: "10px 6px 0", lineHeight: 1.5 }}>
              Signed in as {email}. Your data is saved to your account and syncs across devices.
            </p>
          </>
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

  // New accounts complete their profile before entering the app.
  if (loaded && needsOnboarding) {
    return <OnboardingScreen initialName={state.profile.name === "You" ? "" : state.profile.name} onComplete={completeOnboarding} />;
  }

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
        {modal?.type === "recipebuilder" && renderRecipeBuilder()}
        {modal?.type === "ingredientpick" && renderIngredientPick()}
        {modal?.type === "logcal" && renderLogCalendar()}
        {modal?.type === "planpick" && renderPlanPick()}
        {modal?.type === "recipelog" && renderRecipeLog()}
        {modal?.type === "logitem" && renderLogItem()}
        {modal?.type === "editentry" && renderEditEntry()}
        {modal?.type === "delivery" && renderDelivery()}
        {modal?.type === "settings" && renderSettings()}
        {modal?.type === "profile" && renderProfile()}
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
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out

  useEffect(() => {
    if (!supabase) { setSession(null); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Dev aid: visit /?auth to preview the login screen even when Supabase isn't
  // configured (the form is inert in this mode — see the guard in AuthScreen).
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const previewAuth = params.has("auth");
  // Dev aid: /?onboard previews the onboarding screen without needing an account.
  if (params.has("onboard")) return <OnboardingScreen onComplete={() => { window.location.href = "/"; }} />;

  if (supabase && session === undefined) {
    return centerFrame(<Loader2 size={28} className="pl-spin" color={C.ever} />);
  }
  // Show the auth screen only while there's no session — so ?auth (a preview aid)
  // doesn't trap you on the login page after you actually sign in.
  if (!session && (supabase || previewAuth)) return <AuthScreen />;
  return <MainApp session={session} />;
}

