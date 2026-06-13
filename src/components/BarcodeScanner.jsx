import { useState, useEffect, useRef } from "react";
import { C } from "../lib/theme";
import { errBox, inputStyle, miniAction } from "../styles";
import { Search } from "lucide-react";

export const BarcodeScanner = ({ onDetect }) => {
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
