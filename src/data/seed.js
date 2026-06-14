import { uid, todayISO, addDays } from "../lib/helpers";

export const MEALS = [
  { key: "breakfast", label: "Breakfast", emoji: "🌅" },
  { key: "lunch", label: "Lunch", emoji: "🥗" },
  { key: "dinner", label: "Dinner", emoji: "🍽️" },
  { key: "snack", label: "Snacks", emoji: "🍎" },
];

export const GOAL_TAGS = ["High protein", "Low carb", "Balanced", "Vegetarian", "Quick"];


// Recipes: per-serving macros + scalable ingredients
export const RECIPES = [
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

export const seedPlan = () => {
  const t = todayISO();
  return {
    [t]: { breakfast: ["r1"], lunch: ["r4"], dinner: ["r5"], snack: ["r11"] },
    [addDays(t, 1)]: { breakfast: ["r3"], lunch: ["r12"], dinner: ["r10"], snack: [] },
    [addDays(t, 2)]: { breakfast: ["r2"], lunch: ["r6"], dinner: ["r9"], snack: [] },
  };
};

export const initialState = {
  goals: { kcal: 2100, protein: 150, carbs: 210, fat: 65 },
  profile: { name: "You", units: "imperial", startWeight: 178, goalWeight: 168 },
  diary: seedDiary(),
  plan: seedPlan(),
  weights: seedWeights(),
  grocery: [], // {id, name, qty, unit, checked, source}
  connected: [], // provider ids "connected" in this demo
  recipes: [], // user-created recipes (merged with the seed RECIPES at runtime)
};

// Pastel card backgrounds + a starter emoji set for the recipe builder.
export const RECIPE_BGS = ["#EAF3DA", "#FBE6D6", "#E7EEF6", "#F3E9D9", "#F0ECF6", "#E6F1EF"];
export const RECIPE_EMOJIS = ["🍽️", "🥗", "🍳", "🥣", "🍲", "🍜", "🥙", "🌯", "🍝", "🍛", "🥘", "🍱", "🐟", "🍗", "🥩", "🍤", "🍚", "🥦", "🫐", "🥤", "🍪", "🥞"];
