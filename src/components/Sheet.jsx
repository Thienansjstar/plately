import { C } from "../lib/theme";
import { X } from "lucide-react";

export const Sheet = ({ open, onClose, children, title, big }) => {
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
