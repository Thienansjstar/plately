import { uid, todayISO, addDays } from "../lib/helpers";

export const MEALS = [
  { key: "breakfast", label: "Breakfast", emoji: "🌅" },
  { key: "lunch", label: "Lunch", emoji: "🥗" },
  { key: "dinner", label: "Dinner", emoji: "🍽️" },
  { key: "snack", label: "Snacks", emoji: "🍎" },
];

export const GOAL_TAGS = ["High protein", "Low carb", "Balanced", "Vegetarian", "Quick"];



// Searchable food database (per listed serving)
export const FOODS = [
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
export const CAT = {
  Produce: { emoji: "🥦", words: ["spinach", "broccoli", "banana", "berry", "blueberr", "lemon", "lime", "garlic", "onion", "pepper", "avocado", "tomato", "potato", "lettuce", "romaine", "cucumber", "asparagus", "parsley", "corn"] },
  Protein: { emoji: "🍗", words: ["chicken", "salmon", "shrimp", "tofu", "turkey", "steak", "beef", "egg", "bean", "chickpea"] },
  Dairy: { emoji: "🧀", words: ["yogurt", "milk", "cheese", "feta", "parmesan", "cheddar", "butter"] },
  Pantry: { emoji: "🫙", words: ["rice", "oat", "pasta", "spaghetti", "bread", "oil", "peanut", "soy", "honey", "maple", "syrup", "granola", "chia", "sesame", "crouton", "salsa", "teriyaki", "caesar", "dressing", "powder"] },
};
export const categoryOf = (name) => {
  const n = name.toLowerCase();
  for (const [cat, { words }] of Object.entries(CAT)) if (words.some((w) => n.includes(w))) return cat;
  return "Other";
};
export const CAT_ORDER = ["Produce", "Protein", "Dairy", "Pantry", "Other"];
export const catEmoji = (c) => (CAT[c] ? CAT[c].emoji : "🛒");

// fictional delivery partners (rename / replace with real integrations when you ship)
export const PROVIDERS = [
  { id: "carthop", name: "CartHop", emoji: "🛒" },
  { id: "freshdash", name: "FreshDash", emoji: "🚚" },
  { id: "pantryrun", name: "PantryRun", emoji: "🧺" },
];

/* ---- initial weight history (relative to today so it always looks current) ---- */
export const seedWeights = () => {
  const out = [];
  const base = 178;
  for (let i = 28; i >= 0; i -= 4) {
    out.push({ date: addDays(todayISO(), -i), weight: +(base - (28 - i) * 0.22 + (Math.random() - 0.5) * 0.8).toFixed(1) });
  }
  return out;
};

export const seedDiary = () => {
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

// Recipes are no longer seeded (they come from Spoonacular), so the demo plan
// starts empty — there are no built-in recipe IDs to reference.
export const seedPlan = () => ({});

export const initialState = {
  goals: { kcal: 2100, protein: 150, carbs: 210, fat: 65 },
  profile: { name: "You", units: "imperial", startWeight: 178, goalWeight: 168 },
  diary: seedDiary(),
  plan: seedPlan(),
  weights: seedWeights(),
  grocery: [], // {id, name, qty, unit, checked, source}
  connected: [], // provider ids "connected" in this demo
  recipes: [], // user-created recipes
  recipeCache: [], // Spoonacular recipes the user has referenced (for plan lookups)
};

// Pastel card backgrounds + a starter emoji set for the recipe builder.
export const RECIPE_BGS = ["#EAF3DA", "#FBE6D6", "#E7EEF6", "#F3E9D9", "#F0ECF6", "#E6F1EF"];
export const RECIPE_EMOJIS = ["🍽️", "🥗", "🍳", "🥣", "🍲", "🍜", "🥙", "🌯", "🍝", "🍛", "🥘", "🍱", "🐟", "🍗", "🥩", "🍤", "🍚", "🥦", "🫐", "🥤", "🍪", "🥞"];
