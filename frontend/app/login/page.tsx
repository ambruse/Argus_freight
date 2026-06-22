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

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [theme,    setTheme]    = useState<"dark" | "light">("dark");
  const [error,    setError]    = useState("");

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
      router.replace(user?.role === "sales" ? "/rfq/new" : "/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please enter your username and password.");
      return;
    }
    setLoading(true);
    try {
      const data = await login(username.trim(), password);
      toast.success("Welcome back!");
      router.replace(data.user?.role === "sales" ? "/rfq/new" : "/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Username or password is incorrect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: "var(--surface)" }}>

      {/* ── LEFT PANEL — Brand ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col overflow-hidden"
        style={{ background: "var(--login-left-bg)" }}
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
          <div className="flex items-center gap-4 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl blur-lg opacity-50"
                style={{ background: "radial-gradient(circle, rgba(245,176,55,0.60) 0%, transparent 70%)" }}
              />
              <img
                src={theme === "light" ? "/light-logo.png" : "/logo.png"}
                alt="ARGUS"
                className="relative h-12 w-auto object-contain"
              />
            </div>
            <div>
              <p className="font-black text-2xl tracking-tight"
                style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
              >
                ARGUS
              </p>
              <p className="text-[11px] uppercase tracking-[0.20em] mt-0.5"
                style={{ color: "var(--sidebar-text-gold)" }}
              >
                Shipping & Cargo
              </p>
            </div>
          </div>

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
        style={{ background: "var(--login-right-bg)" }}
      >
        {/* Subtle bg glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none opacity-10"
          style={{ background: "radial-gradient(circle, rgba(245,176,55,0.40) 0%, transparent 70%)", filter: "blur(80px)" }}
        />

        <div className="relative w-full max-w-[400px] animate-fade-in login-glass-card">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <img src={theme === "light" ? "/light-logo.png" : "/logo.png"} alt="ARGUS" className="h-10 w-auto" />
            <p className="font-black text-xl" style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}>ARGUS</p>
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
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-muted)", opacity: 0.8 }} htmlFor="login-username"
              >
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: "var(--sidebar-avatar-text)", opacity: 0.6 }}
                >
                  ◎
                </span>
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="your username"
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
                  ⬡
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

            {/* Register link */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push("/register?role=customer")}
                className="text-[12px] font-semibold transition-colors hover:underline"
                style={{ color: "var(--sidebar-avatar-text)" }}
              >
                New here? Register as Customer →
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
    </div>
  );
}
