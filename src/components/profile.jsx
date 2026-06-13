import { useState, useMemo } from "react";
import { C, FONT, BRAND } from "../lib/theme";
import { primaryBtn, secondaryBtn, inputStyle } from "../styles";
import { centerFrame } from "./ui";
import {
  ACTIVITY, GOAL_TYPES, SEXES, recommendedTargets, cmToFtIn, ftInToCm, weightUnit,
} from "../lib/profile";
import { Utensils, ArrowRight, ArrowLeft, Check, Sparkles, Flame } from "lucide-react";

/* ---- small building blocks shared by onboarding + the profile editor ---- */

const labelStyle = { fontSize: 12.5, fontWeight: 800, color: C.inkSoft, letterSpacing: 0.2, margin: "0 2px 7px" };
const fullInput = { ...inputStyle, width: "100%" };

function Segmented({ options, value, onChange, cols }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols || options.length}, 1fr)`, gap: 6, background: C.line, padding: 4, borderRadius: 12 }}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button key={o.key} type="button" onClick={() => onChange(o.key)}
            style={{ padding: "9px 6px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
              background: active ? C.surface : "transparent", color: active ? C.ink : C.inkSoft,
              boxShadow: active ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ChoiceList({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button key={o.key} type="button" onClick={() => onChange(o.key)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left", padding: "12px 14px",
              borderRadius: 13, border: `1.5px solid ${active ? C.ever : C.line}`, background: active ? C.leafSoft : C.surface, cursor: "pointer" }}>
            <span>
              <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: C.ink }}>{o.label}</span>
              {o.sub && <span style={{ display: "block", fontSize: 11.5, color: C.inkSoft, fontWeight: 600, marginTop: 1 }}>{o.sub}</span>}
            </span>
            <span style={{ width: 22, height: 22, borderRadius: 99, border: `2px solid ${active ? C.ever : C.line}`,
              background: active ? C.ever : "transparent", display: "grid", placeItems: "center", flexShrink: 0 }}>
              {active && <Check size={13} color="#fff" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Labeled({ label, children }) {
  return <div style={{ marginBottom: 14 }}><div style={labelStyle}>{label}</div>{children}</div>;
}

/* ---- HeightInput: ft/in for imperial, cm for metric; writes back heightCm ---- */
function HeightInput({ units, heightCm, onChange }) {
  if (units === "metric") {
    return (
      <input value={heightCm || ""} onChange={(e) => onChange(+e.target.value.replace(/[^\d]/g, "") || 0)}
        inputMode="numeric" placeholder="Height in cm" style={fullInput} />
    );
  }
  const { ft, in: inch } = cmToFtIn(heightCm || 0);
  const set = (nf, ni) => onChange(ftInToCm(nf, ni));
  return (
    <div className="flex" style={{ gap: 8 }}>
      <div style={{ flex: 1, position: "relative" }}>
        <input value={heightCm ? ft : ""} onChange={(e) => set(+e.target.value.replace(/[^\d]/g, "") || 0, inch)}
          inputMode="numeric" placeholder="Feet" style={fullInput} />
        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: C.inkSoft }}>ft</span>
      </div>
      <div style={{ flex: 1, position: "relative" }}>
        <input value={heightCm ? inch : ""} onChange={(e) => set(ft, +e.target.value.replace(/[^\d]/g, "") || 0)}
          inputMode="numeric" placeholder="Inches" style={fullInput} />
        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: C.inkSoft }}>in</span>
      </div>
    </div>
  );
}

/**
 * ProfileFields — the editable body-stats form, driven entirely by props so it
 * can back both the onboarding draft and the live profile editor.
 *   value:    the profile object ({ name, units, sex, age, heightCm, startWeight, goalWeight, activity, goalType })
 *   onChange: (patch) => merge patch into the profile
 *   compact:  hide the name field (used where the name is shown elsewhere)
 */
export function ProfileFields({ value, onChange, compact }) {
  const wu = weightUnit(value.units);
  const num = (v) => v === "" || v == null ? "" : v;
  return (
    <div>
      {!compact && (
        <Labeled label="Name">
          <input value={value.name || ""} onChange={(e) => onChange({ name: e.target.value })} placeholder="Your name" autoComplete="name" style={fullInput} />
        </Labeled>
      )}

      <Labeled label="Units">
        <Segmented value={value.units || "imperial"} onChange={(u) => onChange({ units: u })}
          options={[{ key: "imperial", label: "lb / ft" }, { key: "metric", label: "kg / cm" }]} />
      </Labeled>

      <Labeled label="Sex">
        <Segmented value={value.sex || ""} onChange={(s) => onChange({ sex: s })} options={SEXES} />
      </Labeled>

      <div className="flex" style={{ gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Labeled label="Age">
            <input value={num(value.age)} onChange={(e) => onChange({ age: +e.target.value.replace(/[^\d]/g, "") || "" })}
              inputMode="numeric" placeholder="Years" style={fullInput} />
          </Labeled>
        </div>
        <div style={{ flex: 1.3 }}>
          <Labeled label="Height">
            <HeightInput units={value.units} heightCm={value.heightCm} onChange={(cm) => onChange({ heightCm: cm })} />
          </Labeled>
        </div>
      </div>

      <div className="flex" style={{ gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Labeled label="Current weight">
            <div style={{ position: "relative" }}>
              <input value={num(value.startWeight)} onChange={(e) => onChange({ startWeight: +e.target.value.replace(/[^\d.]/g, "") || "" })}
                inputMode="decimal" placeholder={wu} style={fullInput} />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: C.inkSoft }}>{wu}</span>
            </div>
          </Labeled>
        </div>
        <div style={{ flex: 1 }}>
          <Labeled label="Goal weight">
            <div style={{ position: "relative" }}>
              <input value={num(value.goalWeight)} onChange={(e) => onChange({ goalWeight: +e.target.value.replace(/[^\d.]/g, "") || "" })}
                inputMode="decimal" placeholder={wu} style={fullInput} />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: C.inkSoft }}>{wu}</span>
            </div>
          </Labeled>
        </div>
      </div>

      <Labeled label="Activity level">
        <ChoiceList options={ACTIVITY} value={value.activity} onChange={(a) => onChange({ activity: a })} />
      </Labeled>

      <Labeled label="Your goal">
        <ChoiceList options={GOAL_TYPES} value={value.goalType} onChange={(g) => onChange({ goalType: g })} />
      </Labeled>
    </div>
  );
}

// A live preview of the calories/macros derived from the entered stats.
export function TargetPreview({ profile }) {
  const t = useMemo(() => recommendedTargets(profile), [profile]);
  if (!t) {
    return (
      <div style={{ background: "#FAF9F3", border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, fontSize: 12.5, color: C.inkSoft, fontWeight: 600, lineHeight: 1.45 }}>
        Add your sex, age, height and current weight and {BRAND} will suggest a daily calorie target.
      </div>
    );
  }
  return (
    <div style={{ background: C.ever, borderRadius: 16, padding: 16, color: "#fff" }}>
      <div className="flex items-center" style={{ gap: 8, marginBottom: 10 }}>
        <Flame size={16} color={C.apricot} />
        <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: 0.3, opacity: 0.85 }}>SUGGESTED DAILY TARGET</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{t.kcal.toLocaleString()} <span style={{ fontSize: 14, opacity: 0.75 }}>kcal</span></div>
      <div className="flex" style={{ gap: 14, marginTop: 12 }}>
        {[["Protein", t.protein], ["Carbs", t.carbs], ["Fat", t.fat]].map(([l, v]) => (
          <div key={l}>
            <div style={{ fontSize: 16, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{v}g</div>
            <div style={{ fontSize: 10.5, opacity: 0.7, fontWeight: 700 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * OnboardingScreen — shown once, right after a new account is created.
 * Two steps: (1) about-you stats, (2) activity + goal with a live target preview.
 * onComplete(profilePatch, goals) hands the collected info back to the app, which
 * writes it to state (and the database). onSkip fills sensible defaults.
 */
export function OnboardingScreen({ initialName = "", onComplete }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState({
    name: initialName, units: "imperial", sex: "", age: "", heightCm: 0,
    startWeight: "", goalWeight: "", activity: "moderate", goalType: "maintain",
  });
  const patch = (d) => setP((prev) => ({ ...prev, ...d }));

  const step0Ok = p.name.trim() && p.sex && +p.age > 0 && +p.heightCm > 0 && +p.startWeight > 0;

  const finish = (skip) => {
    const targets = recommendedTargets(p);
    const profilePatch = {
      name: p.name.trim() || "You", units: p.units, sex: p.sex, age: +p.age || "",
      heightCm: +p.heightCm || 0, startWeight: +p.startWeight || 0, goalWeight: +p.goalWeight || +p.startWeight || 0,
      activity: p.activity, goalType: p.goalType, onboarded: true,
    };
    onComplete(profilePatch, skip ? null : targets, +p.startWeight || 0);
  };

  return centerFrame(
    <div className="pl-app" style={{ width: "100%", maxWidth: 440, height: "100vh", maxHeight: 920, background: C.canvas, display: "flex", flexDirection: "column", boxShadow: "0 8px 60px rgba(0,0,0,.18)" }}>
      <style>{`.pl-app input:focus { outline: 2px solid ${C.leaf}; outline-offset: 0; }`}</style>

      {/* header */}
      <div style={{ padding: "22px 22px 14px" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <div className="flex items-center" style={{ gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: `linear-gradient(150deg, ${C.ever2}, ${C.ever})` }}>
              <Utensils size={19} color="#fff" />
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.ever }}>{BRAND}</div>
          </div>
          {step === 0 && (
            <button onClick={() => finish(true)} style={{ background: "none", border: "none", color: C.inkSoft, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Skip</button>
          )}
        </div>
        {/* progress */}
        <div className="flex" style={{ gap: 6 }}>
          {[0, 1].map((i) => (
            <div key={i} style={{ flex: 1, height: 5, borderRadius: 99, background: i <= step ? C.ever : C.line, transition: "background .3s" }} />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "6px 22px 22px" }}>
        {step === 0 ? (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.ink, letterSpacing: -0.3, marginBottom: 4 }}>Let's set up your profile</div>
            <p style={{ fontSize: 13, color: C.inkSoft, fontWeight: 600, marginBottom: 18, lineHeight: 1.45 }}>
              A few details so {BRAND} can tailor your calorie and macro targets. You can change these any time.
            </p>
            <ProfileFields value={p} onChange={patch} />
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.ink, letterSpacing: -0.3, marginBottom: 4 }}>Here's your plan</div>
            <p style={{ fontSize: 13, color: C.inkSoft, fontWeight: 600, marginBottom: 18, lineHeight: 1.45 }}>
              Based on your stats. You can fine-tune everything later in Settings.
            </p>
            <div style={{ marginBottom: 16 }}><TargetPreview profile={p} /></div>
          </div>
        )}
      </div>

      {/* footer */}
      <div style={{ padding: "12px 22px calc(18px + env(safe-area-inset-bottom))", borderTop: `1px solid ${C.line}`, background: C.surface }}>
        {step === 0 ? (
          <button disabled={!step0Ok} onClick={() => setStep(1)} style={{ ...primaryBtn, opacity: step0Ok ? 1 : 0.45 }}>
            Continue <ArrowRight size={17} />
          </button>
        ) : (
          <div className="flex" style={{ gap: 10 }}>
            <button onClick={() => setStep(0)} style={{ ...secondaryBtn, flex: 0.5 }}><ArrowLeft size={16} /> Back</button>
            <button onClick={() => finish(false)} style={{ ...primaryBtn, flex: 1 }}><Sparkles size={17} /> Start using {BRAND}</button>
          </div>
        )}
      </div>
    </div>
  );
}
