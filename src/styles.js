import { C, FONT } from "./lib/theme";

export const cardStyle = { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: 14, marginBottom: 12, boxShadow: "0 1px 3px rgba(20,30,24,.04)" };
export const inputStyle = { padding: "10px 13px", borderRadius: 11, border: `1px solid ${C.line}`, background: C.surface, fontSize: 14, color: C.ink, fontFamily: FONT };
export const fieldInput = { width: 70, padding: "7px 10px", borderRadius: 9, border: `1px solid ${C.line}`, background: "#FAF9F3", fontSize: 14, fontWeight: 700, color: C.ink, textAlign: "right", fontFamily: FONT, fontVariantNumeric: "tabular-nums" };
export const navBtn = { background: "rgba(255,255,255,.14)", border: "none", color: "#fff", width: 34, height: 34, borderRadius: 99, display: "grid", placeItems: "center", cursor: "pointer" };
export const addBtn = { background: C.leafSoft, border: "none", width: 30, height: 30, borderRadius: 99, display: "grid", placeItems: "center", cursor: "pointer", color: C.ever, flexShrink: 0 };
export const trashBtn = { background: "none", border: "none", color: "#C2BCAD", cursor: "pointer", padding: 4, display: "grid", placeItems: "center", flexShrink: 0 };
export const ghostBtn = { background: C.surface, border: `1px solid ${C.line}`, color: C.inkSoft, width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", cursor: "pointer" };
export const tagStyle = { fontSize: 10.5, fontWeight: 700, color: C.ever2, background: C.leafSoft, padding: "3px 8px", borderRadius: 99 };
export const primaryBtn = { width: "100%", padding: "13px", borderRadius: 14, border: "none", background: C.ever, color: "#fff", fontWeight: 800, fontSize: 14.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 };
export const secondaryBtn = { width: "100%", padding: "12px", borderRadius: 13, border: `1.5px solid ${C.line}`, background: C.surface, color: C.ink, fontWeight: 800, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 };
export const miniAction = { flex: 1, padding: "10px", borderRadius: 12, border: `1px solid ${C.line}`, background: "#FAF9F3", color: C.ever, fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 };
export const miniSolid = { padding: "8px 14px", borderRadius: 10, border: "none", background: C.ever, color: "#fff", fontWeight: 800, fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 };
export const miniGhost = { padding: "8px 14px", borderRadius: 10, border: `1.5px solid ${C.ever}`, background: "#fff", color: C.ever, fontWeight: 800, fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 };
export const rowBtn = { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 4px", borderBottom: `1px solid ${C.line}`, background: "none", border: "none", borderTop: "none", borderLeft: "none", borderRight: "none", cursor: "pointer", gap: 10 };
export const tipStyle = { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 12, fontWeight: 700 };
export const errBox = { marginTop: 12, padding: "11px 13px", borderRadius: 12, background: C.apricotSoft, color: "#9A4A1E", fontSize: 12.5, fontWeight: 600, lineHeight: 1.4 };
