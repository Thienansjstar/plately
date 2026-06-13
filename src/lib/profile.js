// User-profile domain logic: unit conversion, calorie/macro estimation, and the
// dedicated `profiles` table mirror in Supabase. The app's canonical store stays
// the app_state jsonb blob; this table is a structured, queryable copy of the
// person's identity + body stats so user info lives in the database in its own right.
import { supabase } from "./supabase";

export const ACTIVITY = [
  { key: "sedentary", label: "Sedentary", sub: "Little or no exercise", factor: 1.2 },
  { key: "light", label: "Lightly active", sub: "Exercise 1–3 days/week", factor: 1.375 },
  { key: "moderate", label: "Moderately active", sub: "Exercise 3–5 days/week", factor: 1.55 },
  { key: "active", label: "Very active", sub: "Exercise 6–7 days/week", factor: 1.725 },
  { key: "athlete", label: "Athlete", sub: "Hard training, physical job", factor: 1.9 },
];

export const GOAL_TYPES = [
  { key: "lose", label: "Lose weight", sub: "−500 kcal/day", adjust: -500 },
  { key: "maintain", label: "Maintain", sub: "Stay where I am", adjust: 0 },
  { key: "gain", label: "Build muscle", sub: "+350 kcal/day", adjust: 350 },
];

export const SEXES = [
  { key: "female", label: "Female" },
  { key: "male", label: "Male" },
  { key: "other", label: "Other" },
];

/* ---- unit conversions (weights stored in the user's chosen unit; height in cm) ---- */
export const lbToKg = (lb) => +lb * 0.45359237;
export const kgToLb = (kg) => +kg / 0.45359237;
export const cmToFtIn = (cm) => { const t = Math.round(+cm / 2.54); return { ft: Math.floor(t / 12), in: t % 12 }; };
export const ftInToCm = (ft, inch) => Math.round(((+ft || 0) * 12 + (+inch || 0)) * 2.54);
export const weightUnit = (units) => (units === "metric" ? "kg" : "lb");

// Profile shape layered on top of the existing seed profile. New accounts fill
// these in during onboarding; `onboarded` flips true once they finish or skip.
export const profileDefaults = {
  name: "", units: "imperial", sex: "", age: "", heightCm: 0,
  activity: "moderate", goalType: "maintain", onboarded: false,
};

// Mifflin–St Jeor BMR → TDEE → goal-adjusted daily calories, with a balanced
// 30/40/30 protein/carb/fat split. Returns null until enough stats are entered.
export function recommendedTargets(p) {
  const kg = p.units === "metric" ? +p.startWeight : lbToKg(+p.startWeight);
  const cm = +p.heightCm, age = +p.age;
  if (!kg || !cm || !age) return null;
  const base = 10 * kg + 6.25 * cm - 5 * age;
  const bmr = p.sex === "male" ? base + 5 : p.sex === "female" ? base - 161 : base - 78;
  const factor = (ACTIVITY.find((a) => a.key === p.activity) || ACTIVITY[2]).factor;
  const adjust = (GOAL_TYPES.find((g) => g.key === p.goalType) || GOAL_TYPES[1]).adjust;
  const kcal = Math.max(1200, Math.round((bmr * factor + adjust) / 10) * 10);
  return {
    kcal,
    protein: Math.round((kcal * 0.3) / 4),
    carbs: Math.round((kcal * 0.4) / 4),
    fat: Math.round((kcal * 0.3) / 9),
  };
}

// Mirror the profile into the dedicated `profiles` table. Best-effort: if the
// table doesn't exist yet (migration not run), this quietly no-ops — the same
// data still lives in the app_state blob, so nothing is lost.
export async function saveProfileToDB(userId, email, profile, goals) {
  if (!supabase || !userId) return;
  try {
    const { error } = await supabase.from("profiles").upsert({
      user_id: userId,
      email: email || null,
      name: profile.name || null,
      sex: profile.sex || null,
      age: +profile.age || null,
      height_cm: +profile.heightCm || null,
      units: profile.units || "imperial",
      start_weight: +profile.startWeight || null,
      goal_weight: +profile.goalWeight || null,
      activity: profile.activity || null,
      goal_type: profile.goalType || null,
      goal_kcal: goals?.kcal ?? null,
      goal_protein: goals?.protein ?? null,
      goal_carbs: goals?.carbs ?? null,
      goal_fat: goals?.fat ?? null,
      onboarded: !!profile.onboarded,
      updated_at: new Date().toISOString(),
    });
    if (error && import.meta.env.DEV) console.warn("[profiles] save skipped:", error.message);
  } catch { /* offline or table absent — app_state still holds the data */ }
}
