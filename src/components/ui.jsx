import { C, FONT } from "../lib/theme";
import { Search } from "lucide-react";

export const Ring = ({ size = 132, stroke = 12, pct = 0, color = C.apricot, track = "#FFFFFF33", children }) => {
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

export const MacroBar = ({ label, val, goal, color }) => {
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

export const Pill = ({ active, children, onClick, color = C.ever }) => (
  <button onClick={onClick}
    style={{
      padding: "7px 14px", borderRadius: 99, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
      border: `1.5px solid ${active ? color : C.line}`, background: active ? color : C.surface,
      color: active ? "#fff" : C.inkSoft, cursor: "pointer", transition: "all .15s",
    }}>
    {children}
  </button>
);
export const centerFrame = (children) => (
  <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "#E9E6DC", fontFamily: FONT }}>
    {children}
  </div>
);
export const MacroRow = ({ totals, goals, light }) => (
  <div className="flex" style={{ gap: 8 }}>
    <MacroMini label="Protein" val={totals.protein} goal={goals.protein} color={C.protein} light={light} />
    <MacroMini label="Carbs" val={totals.carbs} goal={goals.carbs} color={C.carbs} light={light} />
    <MacroMini label="Fat" val={totals.fat} goal={goals.fat} color={C.fat} light={light} />
  </div>
);
export const MacroMini = ({ label, val, goal, color, light }) => {
  const pct = goal ? Math.min(1, val / goal) : 0;
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 4, gap: 4, flexWrap: "nowrap" }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: light ? "rgba(255,255,255,.8)" : C.inkSoft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{label}</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: light ? "#fff" : C.ink, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", flexShrink: 0 }}>{Math.round(val)}/{goal}g</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: light ? "rgba(255,255,255,.2)" : C.line, overflow: "hidden" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: color, borderRadius: 99, transition: "width .5s" }} />
      </div>
    </div>
  );
};

export const QuickAction = ({ icon, label, sub, onClick }) => (
  <button onClick={onClick} style={{ flex: 1, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: "12px 6px", cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4, boxShadow: "0 1px 3px rgba(20,30,24,.04)" }}>
    <span style={{ width: 38, height: 38, borderRadius: 11, background: C.leafSoft, display: "grid", placeItems: "center", color: C.ever }}>{icon}</span>
    <span style={{ fontSize: 12.5, fontWeight: 800, color: C.ink }}>{label}</span>
    <span style={{ fontSize: 10, color: C.inkSoft, fontWeight: 600 }}>{sub}</span>
  </button>
);

export const TabBtn = ({ t, active, onClick }) => {
  const Icon = t.icon;
  return (
    <button onClick={onClick} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "2px 0", color: active ? C.ever : "#9AA59C" }}>
      <Icon size={21} strokeWidth={active ? 2.6 : 2} />
      <span style={{ fontSize: 10, fontWeight: active ? 800 : 600 }}>{t.label}</span>
    </button>
  );
};

export const Header = ({ title, subtitle, right }) => (
  <div className="flex items-start justify-between" style={{ padding: "calc(env(safe-area-inset-top) + 18px) 18px 12px" }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: C.ink, letterSpacing: -0.4 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: C.inkSoft, fontWeight: 600, marginTop: 2 }}>{subtitle}</div>}
    </div>
    {right}
  </div>
);

// Round initials button used to open the profile. `light` styles it for a dark
// background (the Today hero); otherwise it sits on the light canvas.
export const Avatar = ({ name = "", onClick, light, size = 38 }) => {
  const initials = name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <button onClick={onClick} aria-label="Profile" style={{
      width: size, height: size, borderRadius: 99, cursor: "pointer", flexShrink: 0, display: "grid", placeItems: "center",
      fontWeight: 800, fontSize: size * 0.36, fontFamily: FONT,
      border: light ? "1.5px solid rgba(255,255,255,.55)" : `1.5px solid ${C.line}`,
      background: light ? "rgba(255,255,255,.16)" : C.leafSoft,
      color: light ? "#fff" : C.ever,
    }}>
      {initials || (light ? "🙂" : "🙂")}
    </button>
  );
};

export const SearchInput = ({ value, onChange, placeholder }) => (
  <div style={{ position: "relative" }}>
    <Search size={17} color="#9AA59C" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", padding: "11px 14px 11px 40px", borderRadius: 13, border: `1px solid ${C.line}`, background: C.surface, fontSize: 14, color: C.ink, fontFamily: FONT }} />
  </div>
);

export const Stat = ({ label, value, unit, accent }) => (
  <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: "13px 10px", textAlign: "center" }}>
    <div style={{ fontSize: 22, fontWeight: 800, color: accent || C.ink, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}<span style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700 }}> {unit}</span></div>
    <div style={{ fontSize: 11, color: C.inkSoft, fontWeight: 700, marginTop: 5, letterSpacing: 0.2 }}>{label}</div>
  </div>
);

export const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 800, color: C.inkSoft, letterSpacing: 0.4, textTransform: "uppercase", margin: "16px 2px 8px" }}>{children}</div>
);

export const Field = ({ label, suffix, children }) => (
  <div className="flex items-center justify-between" style={{ padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
    <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{label}</span>
    <div className="flex items-center" style={{ gap: 6 }}>
      {children}
      {suffix && <span style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700 }}>{suffix}</span>}
    </div>
  </div>
);

export const Empty = ({ text }) => (
  <div style={{ textAlign: "center", padding: "30px 20px", color: C.inkSoft, fontSize: 13.5, fontWeight: 600, lineHeight: 1.5 }}>{text}</div>
);

