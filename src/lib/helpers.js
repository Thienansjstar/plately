// Pure helpers: dates, ids, nutrition math, JSON extraction.

export const pad = (n) => String(n).padStart(2, "0");
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
export const todayISO = () => toISO(new Date());
export const addDays = (iso, n) => { const d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
export const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const niceDate = (iso) => { const d = fromISO(iso); return `${WD[d.getDay()]}, ${MO[d.getMonth()]} ${d.getDate()}`; };
export const shortDate = (iso) => { const d = fromISO(iso); return `${MO[d.getMonth()]} ${d.getDate()}`; };
export const mondayOf = (iso) => { const d = fromISO(iso); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return toISO(d); };
export const relDay = (iso) => {
  const t = todayISO();
  if (iso === t) return "Today";
  if (iso === addDays(t, -1)) return "Yesterday";
  if (iso === addDays(t, 1)) return "Tomorrow";
  return niceDate(iso);
};
export const mealByHour = () => {
  const h = new Date().getHours();
  if (h < 10.5) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
};

export const uid = () => Math.random().toString(36).slice(2, 10);
export const sumEntries = (arr = []) =>
  arr.reduce((a, e) => ({ kcal: a.kcal + e.kcal, protein: a.protein + e.protein, carbs: a.carbs + e.carbs, fat: a.fat + e.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 });

export const dayTotals = (day = {}) => {
  const all = MEALS.flatMap((m) => day[m.key] || []);
  return sumEntries(all);
};

export const recipeToEntry = (r) => ({ id: uid(), name: r.name, qty: "1 serving", kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat });

export const fmtQty = (q) => {
  if (Number.isInteger(q)) return String(q);
  const frac = { 0.25: "¼", 0.5: "½", 0.75: "¾", 0.33: "⅓", 0.67: "⅔" };
  const whole = Math.floor(q);
  const rem = +(q - whole).toFixed(2);
  if (frac[rem]) return whole ? `${whole}${frac[rem]}` : frac[rem];
  return String(+q.toFixed(2));
};

export const extractJSON = (text) => {
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
