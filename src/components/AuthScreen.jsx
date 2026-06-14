import { useState } from "react";
import { supabase } from "../lib/supabase";
import { C, FONT, BRAND, TAGLINE } from "../lib/theme";
import { primaryBtn, inputStyle, errBox } from "../styles";
import { centerFrame } from "./ui";
import { Utensils, Loader2, User, ArrowRight, ArrowLeft, Mail, Lock, Eye, EyeOff, KeyRound, CheckCircle2 } from "lucide-react";

const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// Map Supabase's terse error strings to something a person can act on.
const friendlyError = (msg = "") => {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Email or password is incorrect.";
  if (m.includes("already registered") || m.includes("already been registered")) return "An account with this email already exists — try signing in.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a moment and try again.";
  if (m.includes("password should be")) return "Password must be at least 6 characters.";
  return msg || "Something went wrong. Please try again.";
};

// A labelled input with a leading icon and an optional trailing adornment.
function Field({ icon: Icon, invalid, hint, trailing, ...props }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ position: "relative" }}>
        <Icon size={16} color={invalid ? C.fat : C.inkSoft} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input
          {...props}
          style={{ ...inputStyle, width: "100%", paddingLeft: 38, paddingRight: trailing ? 42 : 13, border: `1px solid ${invalid ? C.fat : C.line}` }}
        />
        {trailing}
      </div>
      {invalid && hint && <div style={{ fontSize: 11.5, color: C.fat, fontWeight: 600, margin: "5px 2px 0" }}>{hint}</div>}
    </div>
  );
}

export function AuthScreen() {
  const [mode, setMode] = useState("signin"); // signin | signup | reset
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [tried, setTried] = useState(false); // show validation only after a submit attempt

  const switchMode = (m) => { setMode(m); setErr(""); setInfo(""); setTried(false); };

  const badEmail = tried && !emailOk(email);
  const badPw = tried && mode === "signup" && pw.length < 6;

  const submit = async (e) => {
    e?.preventDefault();
    if (busy) return;
    setTried(true);
    if (!emailOk(email)) return;
    if (mode === "signup" && pw.length < 6) return;
    if (mode !== "reset" && !pw) return;
    if (!supabase) { setInfo("Preview mode — add your Supabase keys to .env to enable real accounts."); return; }

    setBusy(true); setErr(""); setInfo("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: pw,
          options: { data: { name: name.trim() || undefined } },
        });
        if (error) throw error;
        if (!data.session) setInfo("Account created. Check your email to confirm, then sign in.");
        // If a session is returned, onAuthStateChange swaps in the app automatically.
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
        if (error) throw error;
        setInfo("If an account exists for that email, a password-reset link is on its way.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
        if (error) throw error;
      }
    } catch (e2) {
      const msg = e2?.message || "";
      // If they tried to create an account that already exists, drop them onto
      // sign-in with the email kept — far less of a dead end than an error.
      if (mode === "signup" && (/already.*(registered|exists)/i.test(msg) || e2?.code === "user_already_exists")) {
        setMode("signin"); setErr(""); setTried(false);
        setInfo("You already have an account with this email — enter your password to sign in.");
      } else {
        setErr(friendlyError(msg));
      }
    } finally {
      setBusy(false);
    }
  };

  const heading = mode === "reset" ? "Reset your password" : mode === "signup" ? "Create your account" : "Welcome back";

  return centerFrame(
    <div className="pl-app" style={{ width: "100%", maxWidth: 400, padding: "0 22px" }}>
      <style>{`@keyframes plSpin { to { transform: rotate(360deg); } } .pl-spin { animation: plSpin .8s linear infinite; }
        .pl-app input:focus { outline: 2px solid ${C.leaf}; outline-offset: 0; }`}</style>

      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, margin: "0 auto 14px", display: "grid", placeItems: "center",
          background: `linear-gradient(150deg, ${C.ever2}, ${C.ever})`, boxShadow: "0 8px 22px rgba(20,60,48,.3)" }}>
          <Utensils size={28} color="#fff" />
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.ever, letterSpacing: -0.5 }}>{BRAND}</div>
        <div style={{ fontSize: 13.5, color: C.inkSoft, fontWeight: 600, marginTop: 2 }}>{TAGLINE}</div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 22, padding: 22, boxShadow: "0 8px 40px rgba(20,30,24,.10)" }}>
        {mode !== "reset" ? (
          <div className="flex" style={{ gap: 8, marginBottom: 18, background: C.line, padding: 4, borderRadius: 12 }}>
            {[["signin", "Sign in"], ["signup", "Create account"]].map(([k, lbl]) => (
              <button key={k} onClick={() => switchMode(k)}
                style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13.5,
                  background: mode === k ? C.surface : "transparent", color: mode === k ? C.ink : C.inkSoft, boxShadow: mode === k ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
                {lbl}
              </button>
            ))}
          </div>
        ) : (
          <button onClick={() => switchMode("signin")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.inkSoft, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16 }}>
            <ArrowLeft size={15} /> Back to sign in
          </button>
        )}

        <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 4 }}>{heading}</div>
        <div style={{ fontSize: 12.5, color: C.inkSoft, fontWeight: 600, marginBottom: 16, lineHeight: 1.4 }}>
          {mode === "reset" ? "Enter your email and we'll send a link to set a new password." : mode === "signup" ? "A few seconds to set up — your data syncs everywhere." : "Sign in to pick up where you left off."}
        </div>

        <form onSubmit={submit} noValidate>
          {mode === "signup" && (
            <Field icon={User} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
          )}
          <Field icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
            autoComplete="email" invalid={badEmail} hint="Enter a valid email address." />
          {mode !== "reset" && (
            <Field icon={Lock} type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)}
              placeholder={mode === "signup" ? "Create a password (6+ characters)" : "Password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              invalid={badPw} hint="Password must be at least 6 characters."
              trailing={
                <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? "Hide password" : "Show password"}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.inkSoft, display: "grid", placeItems: "center", padding: 4 }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              } />
          )}

          {mode === "signin" && (
            <div style={{ textAlign: "right", marginBottom: 14 }}>
              <button type="button" onClick={() => switchMode("reset")} style={{ background: "none", border: "none", color: C.ever2, fontWeight: 700, fontSize: 12.5, cursor: "pointer", padding: 0 }}>
                Forgot password?
              </button>
            </div>
          )}

          <button type="submit" disabled={busy} style={{ ...primaryBtn, marginTop: mode === "signin" ? 0 : 4, opacity: busy ? 0.6 : 1 }}>
            {busy ? <><Loader2 size={16} className="pl-spin" /> Please wait…</>
              : mode === "signup" ? <><User size={16} /> Create account</>
              : mode === "reset" ? <><KeyRound size={16} /> Send reset link</>
              : <><ArrowRight size={16} /> Sign in</>}
          </button>
        </form>

        {err && <div style={errBox}>{err}</div>}
        {info && (
          <div style={{ ...errBox, background: C.leafSoft, color: C.ever2, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{info}</span>
          </div>
        )}
      </div>

      <p style={{ fontSize: 11.5, color: C.inkSoft, textAlign: "center", margin: "16px 6px 0", lineHeight: 1.5 }}>
        Your data syncs securely to your account so it's available on any device.
      </p>
    </div>
  );
}
