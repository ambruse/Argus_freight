"use client";
// app/login/page.tsx
// ─────────────────────────────────────────────────────────────
//  Premium split-screen login — navy/gold brand.
// ─────────────────────────────────────────────────────────────
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { authStorage } from "@/lib/auth";
import { freightReturnPath as resolveFreightReturn } from "@/lib/freightReturn";

// Preserve only the known freight quote destination, never an external redirect.
function freightReturnPath() {
  return resolveFreightReturn(window.location.search, window.location.origin);
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [theme,    setTheme]    = useState<"dark" | "light">("dark");
  const [error,    setError]    = useState("");

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail,     setForgotEmail]     = useState("");
  const [forgotLoading,   setForgotLoading]   = useState(false);
  const [forgotSent,      setForgotSent]      = useState(false);
  const [forgotMessage,   setForgotMessage]   = useState("");
  const [forgotError,     setForgotError]     = useState("");

  useEffect(() => {
    const sync = () => {
      const saved = (localStorage.getItem("theme") as "dark" | "light") || "dark";
      setTheme(saved);
      if (saved === "light") {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      } else {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      }
    };
    sync();
    window.addEventListener("themeChanged", sync);
    return () => window.removeEventListener("themeChanged", sync);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", next);
    window.dispatchEvent(new Event("themeChanged"));
  };

  useEffect(() => {
    if (authStorage.isAuthenticated()) {
      const user = authStorage.getUser();
      router.replace(freightReturnPath() || (user?.role === "sales" ? "/rfq/new" : "/dashboard"));
    }
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please enter your username or email address and password.");
      return;
    }
    setLoading(true);
    try {
      const data = await login(username.trim(), password);
      toast.success("Welcome back!");
      router.replace(freightReturnPath() || (data.user?.role === "sales" ? "/rfq/new" : "/dashboard"));
    } catch (err: any) {
      setError(err.response?.data?.message || "Username or password is incorrect.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotMessage("");
    if (!forgotEmail.trim()) {
      setForgotError("Please enter your email address.");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to process request");
      }
      setForgotSent(true);
      setForgotMessage(data.message || "If an account exists with this email address, a password reset link and token have been sent.");
    } catch (err: any) {
      setForgotError(err.message || "Unable to send reset email. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden" style={{ background: "var(--surface)" }}>
      {/* ── SPLIT PANELS ──────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

      {/* ── LEFT PANEL — Brand ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col overflow-hidden"
        style={{
          backgroundColor: theme === "light" ? "#f8f5ee" : "#0a1020",
          backgroundImage: theme === "light"
            ? "linear-gradient(145deg, rgba(250,248,244,0.76) 0%, rgba(244,241,235,0.82) 48%, rgba(237,233,224,0.87) 100%), url('/images/login-logistics-background.png')"
            : "linear-gradient(145deg, rgba(6,10,22,0.78) 0%, rgba(12,20,40,0.84) 48%, rgba(10,15,30,0.88) 100%), url('/images/login-logistics-background.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Animated aurora blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-[600px] h-[600px] rounded-full opacity-20 animate-float"
            style={{
              top: "-10%", left: "-15%",
              background: "radial-gradient(circle, rgba(245,176,55,0.35) 0%, transparent 65%)",
              filter: "blur(60px)",
              animationDelay: "0s",
            }}
          />
          <div className="absolute w-[400px] h-[400px] rounded-full opacity-15"
            style={{
              bottom: "5%", right: "-10%",
              background: "radial-gradient(circle, rgba(56,189,248,0.25) 0%, transparent 65%)",
              filter: "blur(60px)",
              animation: "float 6s ease-in-out infinite",
              animationDelay: "2s",
            }}
          />
          <div className="absolute w-[300px] h-[300px] rounded-full opacity-10"
            style={{
              top: "50%", left: "40%",
              background: "radial-gradient(circle, rgba(139,92,246,0.30) 0%, transparent 65%)",
              filter: "blur(50px)",
              animation: "float 5s ease-in-out infinite",
              animationDelay: "1s",
            }}
          />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-14 py-12">
          {/* Logo + name */}

          {/* Hero text */}
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
                style={{
                  background: "rgba(245,176,55,0.08)",
                  border: "1px solid rgba(245,176,55,0.20)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
                <span className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--sidebar-avatar-text)" }}
                >
                  Platform Online
                </span>
              </div>

              <h2 className="text-5xl font-black leading-[1.1] mb-6"
                style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
              >
                Smarter Freight,{" "}
                <span style={{
                  background: "linear-gradient(135deg, #F5B037 0%, #F5E070 50%, #D4831A 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>
                  Faster Quotes.
                </span>
              </h2>

              <p className="text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
                The all-in-one RFQ and cargo management platform for modern freight forwarders. Automate, track, and close deals faster.
              </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2.5 mt-8 animate-slide-up" style={{ animationDelay: "0.2s" }}>
              {["RFQ Automation", "Live Tracking", "Multi-Operator", "Smart Reports", "Customer Portal"].map(f => (
                <span key={f} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                  style={{
                    background: "rgba(245,176,55,0.06)",
                    border: "1px solid rgba(245,176,55,0.14)",
                    color: "var(--sidebar-avatar-text)",
                  }}
                >
                  <span className="w-1 h-1 rounded-full" style={{ background: "rgba(245,176,55,0.60)" }} />
                  {f}
                </span>
              ))}
            </div>

            {/* Stats row */}
            <div className="flex gap-8 mt-10 animate-slide-up" style={{ animationDelay: "0.3s" }}>
              {[
                { value: "99.9%", label: "Uptime" },
                { value: "< 2 min", label: "Quote Time" },
                { value: "256-bit", label: "Encryption" },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-2xl font-black" style={{ color: "var(--sidebar-avatar-text)", fontFamily: "'Outfit', sans-serif" }}>
                    {s.value}
                  </p>
                  <p className="text-[11px] uppercase tracking-wider mt-0.5" style={{ color: "var(--text-muted)", opacity: 0.8 }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-[11px]" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
            © {new Date().getFullYear()} ARGUS Shipping · All rights reserved
          </p>
        </div>

        {/* Right edge fade */}
        <div className="absolute top-0 right-0 bottom-0 w-24 pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, var(--surface))" }}
        />
      </div>

      {/* ── RIGHT PANEL — Login Form ────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 relative overflow-hidden"
        style={{
          backgroundColor: "var(--surface)",
          backgroundImage: theme === "light"
            ? "linear-gradient(145deg, rgba(250,248,244,0.84) 0%, rgba(244,241,235,0.91) 100%), url('/images/login-logistics-background.png')"
            : "linear-gradient(145deg, rgba(8,12,20,0.88) 0%, rgba(12,18,32,0.93) 100%), url('/images/login-logistics-background.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Subtle bg glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none opacity-10"
          style={{ background: "radial-gradient(circle, rgba(245,176,55,0.40) 0%, transparent 70%)", filter: "blur(80px)" }}
        />

        <div className="relative w-full max-w-[400px] animate-fade-in login-glass-card">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center mb-6">
            <img src={theme === "light" ? "/images/logo.png" : "/images/logo.png"} alt="ARGUS Shipping" className="h-10 w-auto object-contain" />
          </div>

          {/* Top gold line */}
          <div className="h-[1px] w-full mb-6 rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, var(--border-gold-glow), transparent)" }}
          />

          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1"
              style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
            >
              Sign in
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Enter your credentials to continue
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl p-3.5 mb-5 flex items-start gap-3 animate-fade-in"
              style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.20)" }}
            >
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="#F43F5E" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-xs leading-relaxed" style={{ color: "#F43F5E" }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username or Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-muted)", opacity: 0.8 }} htmlFor="login-username"
              >
                Username or Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: "var(--sidebar-avatar-text)", opacity: 0.6 }}
                >
                  
                </span>
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. admin or user@gmail.com"
                  className="input pl-9"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-muted)", opacity: 0.8 }} htmlFor="login-password"
              >
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: "var(--sidebar-avatar-text)", opacity: 0.6 }}
                >
                  
                </span>
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-9 pr-16"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider transition-colors"
                  style={{ color: "var(--text-muted)", opacity: 0.6 }}
                  tabIndex={-1}
                >
                  {showPass ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            {/* Actions beneath password */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setForgotError("");
                  setForgotMessage("");
                  setForgotSent(false);
                  setForgotEmail(username.includes("@") ? username : "");
                  setShowForgotModal(true);
                }}
                className="text-[12px] font-semibold transition-colors hover:underline"
                style={{ color: "var(--sidebar-avatar-text)" }}
              >
                Forgot Password?
              </button>
              <button
                type="button"
                onClick={() => { const next = freightReturnPath(); router.push("/register?role=customer" + (next ? `&next=${encodeURIComponent(next)}` : "")); }}
                className="text-[12px] font-semibold transition-colors hover:underline"
                style={{ color: "var(--text-muted)" }}
              >
                Register as Customer →
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 mt-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In
                  <span>→</span>
                </span>
              )}
            </button>
          </form>

          <p className="text-center text-[11px] mt-8" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
            © {new Date().getFullYear()} ARGUS Shipping · Secure Login
          </p>
        </div>

        {/* ── FORGOT PASSWORD MODAL ─────────────────────────── */}
        {showForgotModal && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(8px)" }}
          >
            <div
              className="relative w-full max-w-md rounded-2xl p-6 sm:p-8 animate-fade-in"
              style={{
                background: "var(--surface-1, #151b2e)",
                border: "1px solid var(--border-gold, rgba(245,176,55,0.30))",
                boxShadow: "0 20px 60px rgba(0,0,0,0.60)",
              }}
            >
              {/* Top Accent Line */}
              <div
                className="h-[1.5px] w-full mb-6 rounded-full"
                style={{ background: "linear-gradient(90deg, transparent, var(--border-gold-glow, #F5B037), transparent)" }}
              />

              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3
                    className="text-xl font-bold"
                    style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
                  >
                    Reset Your Password
                  </h3>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Enter your email to receive a secure reset link & token
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="p-1.5 rounded-lg text-lg transition-opacity hover:opacity-100 opacity-60"
                  style={{ color: "var(--text-muted)" }}
                >
                  ✕
                </button>
              </div>

              {/* Error Message */}
              {forgotError && (
                <div
                  className="rounded-xl p-3.5 mb-4 flex items-start gap-3 animate-fade-in"
                  style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.20)" }}
                >
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="#F43F5E" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <p className="text-xs leading-relaxed" style={{ color: "#F43F5E" }}>{forgotError}</p>
                </div>
              )}

              {/* Success Message (Generic to prevent enumeration) */}
              {forgotSent ? (
                <div className="space-y-4 animate-fade-in py-2">
                  <div
                    className="rounded-xl p-4 flex items-start gap-3"
                    style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}
                  >
                    <svg className="w-5 h-5 shrink-0 text-emerald mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-xs font-semibold text-emerald mb-1">Check Your Inbox</p>
                      <p className="text-xs leading-relaxed text-[#cbd5e1]">
                        {forgotMessage}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg text-[11px]" style={{ background: "rgba(245,176,55,0.06)", color: "var(--text-muted)" }}>
                    💡 Tokens expire in <strong>30 minutes</strong>. If you already received a token or reset link, you can proceed directly to the reset page.
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(false);
                        router.push(`/reset-password?email=${encodeURIComponent(forgotEmail)}`);
                      }}
                      className="btn-primary w-full justify-center py-2.5 text-xs font-bold"
                    >
                      Enter Reset Token Manually →
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="btn-secondary w-full justify-center py-2.5 text-xs"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      Account Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. user@example.com"
                      className="input"
                      disabled={forgotLoading}
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      disabled={forgotLoading}
                      className="btn-secondary flex-1 justify-center py-2.5 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="btn-primary flex-1 justify-center py-2.5 text-xs"
                    >
                      {forgotLoading ? (
                        <span className="flex items-center gap-1.5">
                          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                          </svg>
                          Sending…
                        </span>
                      ) : (
                        "Send Reset Link"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 active:scale-95"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-gold)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.20)",
            color: "var(--sidebar-avatar-text)",
            fontSize: "18px",
          }}
          title="Toggle Theme"
        >
          {theme === "dark" ? "☀" : "🌙"}
        </button>
      </div>
      </div> {/* end split panels */}
    </div>
  );
}
