"use client";
// app/login/page.tsx
// ─────────────────────────────────────────────────────────────
//  Sleek glassmorphism login page with JWT auth.
// ─────────────────────────────────────────────────────────────
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { authStorage } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") as "dark" | "light") || "dark";
    setTheme(savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.className = newTheme;
  };

  // Already authenticated → redirect
  useEffect(() => {
    if (authStorage.isAuthenticated()) router.replace("/dashboard");
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Please enter your username and password.");
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      toast.success("Welcome back!");
      router.replace("/dashboard");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Login failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface bg-grid relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-blue-bright/8 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md px-4 animate-fade-in">
        {/* Logo / Brand */}
        <div className="text-center mb-8 flex flex-col items-center">
          <img 
            src={theme === "light" ? "/light-logo.png" : "/logo.png"} 
            alt="ARGUS Shipping" 
            className="w-auto h-20 object-contain mb-4"
          />
          <h1 className="text-3xl font-bold text-primary">ARGUS Shipping</h1>
          <p className="text-muted text-sm mt-1">Cargo & RFQ Management Platform</p>
        </div>

        {/* Login Card */}
        <form
          onSubmit={handleSubmit}
          className="glass rounded-2xl p-8 shadow-card space-y-5"
        >
          <div>
            <p className="text-sm font-semibold text-primary mb-1">Sign In</p>
            <p className="text-xs text-muted">Enter your credentials to access the system.</p>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wider" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="input"
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wider" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input pr-12"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors text-xs"
                tabIndex={-1}
              >
                {showPass ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                </svg>
                Signing in…
              </span>
            ) : (
              "Sign In →"
            )}
          </button>

          <div className="text-center pt-2 border-t border-white/5 mt-4">
            <Link href="/register" className="text-xs font-medium text-blue hover:text-blue-bright transition-colors">
              Don't have an account? Register Now
            </Link>
          </div>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-faint mt-6">
          © {new Date().getFullYear()} FreightOS · All rights reserved
        </p>
      </div>

      {/* Floating Theme Toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed bottom-6 left-6 z-50 flex items-center justify-center w-12 h-12 rounded-full glass border border-white/10 text-primary shadow-xl hover:bg-white/5 active:scale-95 transition-all"
        title="Toggle Theme"
      >
        <span className="text-lg">{theme === "dark" ? "☀️" : "🌙"}</span>
      </button>
    </div>
  );
}
