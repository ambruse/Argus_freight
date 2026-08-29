"use client";
// app/reset-password/page.tsx
// ─────────────────────────────────────────────────────────────
//  Secure Password Reset page with token validation & password complexity checks.
// ─────────────────────────────────────────────────────────────
import { useState, FormEvent, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { encryptPassword } from "@/lib/crypto";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryToken = searchParams.get("token") || "";
  const queryEmail = searchParams.get("email") || "";

  const [token, setToken] = useState(queryToken);
  const [email, setEmail] = useState(queryEmail);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as "dark" | "light") || "dark";
    setTheme(saved);
  }, []);

  // Update token from query if it changes
  useEffect(() => {
    if (queryToken && !token) {
      setToken(queryToken);
    }
    if (queryEmail && !email) {
      setEmail(queryEmail);
    }
  }, [queryToken, queryEmail]);

  // Verify token on load if provided in URL
  useEffect(() => {
    const checkToken = async () => {
      if (!queryToken.trim()) return;
      setVerifying(true);
      setError("");
      try {
        const res = await fetch("/api/auth/verify-reset-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: queryToken.trim() }),
        });
        const data = await res.json();
        if (res.ok && data.valid) {
          setTokenValid(true);
          if (data.email) setEmail(data.email);
        } else {
          setTokenValid(false);
          setError(data.message || "This password reset token is invalid or has expired.");
        }
      } catch (err: any) {
        setTokenValid(false);
        setError("Unable to verify reset token. Please check your connection.");
      } finally {
        setVerifying(false);
      }
    };

    checkToken();
  }, [queryToken]);

  // Password complexity checks
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isComplexityMet = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && passwordsMatch;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token.trim()) {
      setError("Please provide a valid password reset token.");
      return;
    }

    if (!isComplexityMet) {
      setError("Please ensure your password meets all complexity requirements and matches confirmation.");
      return;
    }

    setLoading(true);
    try {
      // 2048-bit RSA-OAEP transit encryption to prevent Man-in-the-Middle eavesdropping
      const secureNewPassword = await encryptPassword(newPassword);
      const secureConfirmPassword = confirmPassword ? await encryptPassword(confirmPassword) : "";

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          newPassword: secureNewPassword,
          confirmPassword: secureConfirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to reset password.");
      }

      setSuccess(true);
      toast.success("Password reset successfully! Redirecting to login...", { duration: 5000 });
      setTimeout(() => {
        router.replace("/login");
      }, 2500);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while resetting your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden" style={{ background: "var(--surface)" }}>
      {/* ── TOP NAVBAR ──────────────────────────────────────── */}
      <nav
        className="relative z-50 flex items-center justify-between px-6 md:px-10 py-3 border-b"
        style={{
          background: "var(--sidebar-bg)",
          borderColor: "var(--sidebar-border)",
          backdropFilter: "blur(12px)",
        }}
      >
        <a href="/" className="flex items-center gap-2 shrink-0">
          <img src="/images/logo.png" alt="ARGUS" className="h-8 w-auto object-contain" />
        </a>

        <div className="hidden md:flex items-center gap-1">
          {[
            { label: "Home", href: "/" },
            { label: "Services", href: "/services.html" },
            { label: "Why Us", href: "/why-us.html" },
            { label: "Our Team", href: "/team.html" },
            { label: "Contact", href: "/contact.html" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors hover:text-amber-400"
              style={{ color: "var(--text-muted)" }}
            >
              {label}
            </a>
          ))}
        </div>

        <button
          onClick={() => router.push("/login")}
          className="text-[12px] font-semibold px-3 py-1 rounded-lg transition-colors hover:opacity-80"
          style={{
            background: "rgba(245,176,55,0.10)",
            border: "1px solid rgba(245,176,55,0.20)",
            color: "var(--sidebar-avatar-text)",
          }}
        >
          Back to Login
        </button>
      </nav>

      {/* ── SPLIT PANELS ──────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT PANEL — Brand ─────────────────────────────── */}
        <div
          className="hidden lg:flex lg:w-[50%] relative flex-col overflow-hidden"
          style={{ background: "var(--login-left-bg)" }}
        >
          <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
          <div className="relative z-10 flex flex-col justify-center h-full px-14 py-12 max-w-md mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 w-fit"
              style={{
                background: "rgba(245,176,55,0.08)",
                border: "1px solid rgba(245,176,55,0.20)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--sidebar-avatar-text)" }}
              >
                Security Center
              </span>
            </div>

            <h2
              className="text-4xl font-black leading-tight mb-4"
              style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
            >
              Secure Account <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #F5B037 0%, #F5E070 50%, #D4831A 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Password Reset
              </span>
            </h2>

            <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>
              Choose a strong, unique password to secure your freight operations, customer quote history, and sensitive logistics data.
            </p>

            <div className="space-y-3 p-4 rounded-xl" style={{ background: "rgba(245,176,55,0.05)", border: "1px solid rgba(245,176,55,0.15)" }}>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Password Tips</p>
              <ul className="text-xs space-y-1.5" style={{ color: "var(--text-muted)" }}>
                <li>✓ Use at least 8 characters with letters & numbers</li>
                <li>✓ Avoid reusing old passwords from other services</li>
                <li>✓ Tokens expire automatically after 30 minutes</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL — Reset Form ────────────────────────── */}
        <div
          className="flex-1 flex flex-col items-center justify-center px-6 py-10 relative overflow-y-auto"
          style={{ background: "var(--login-right-bg)" }}
        >
          <div className="relative w-full max-w-[430px] my-auto login-glass-card">
            {/* Top gold line */}
            <div
              className="h-[1.5px] w-full mb-6 rounded-full"
              style={{ background: "linear-gradient(90deg, transparent, var(--border-gold-glow, #F5B037), transparent)" }}
            />

            <div className="mb-6">
              <h1
                className="text-2xl font-bold mb-1"
                style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
              >
                Create New Password
              </h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {email ? `Resetting password for ${email}` : "Enter your reset token and new credentials"}
              </p>
            </div>

            {/* Verifying Banner */}
            {verifying && (
              <div className="rounded-xl p-3 mb-4 flex items-center gap-2.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20">
                <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                </svg>
                Verifying reset token…
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div
                className="rounded-xl p-3.5 mb-4 flex items-start gap-2.5 animate-fade-in"
                style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.20)" }}
              >
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="#F43F5E" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs leading-relaxed" style={{ color: "#F43F5E" }}>{error}</p>
                  {tokenValid === false && (
                    <button
                      type="button"
                      onClick={() => router.push("/login")}
                      className="text-[11px] underline font-semibold mt-1 text-rose-400"
                    >
                      Request a new password reset link →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Success State */}
            {success ? (
              <div className="space-y-4 py-4 animate-fade-in text-center">
                <div
                  className="w-14 h-14 mx-auto rounded-full flex items-center justify-center"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1.5px solid rgba(16,185,129,0.35)" }}
                >
                  <svg className="w-7 h-7 text-emerald" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#F0F0F0] mb-1">Password Changed!</h3>
                  <p className="text-xs text-[#94a3b8]">
                    Your password has been successfully updated. Redirecting you to the sign in page…
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.replace("/login")}
                  className="btn-primary w-full justify-center py-3 text-xs font-bold"
                >
                  Sign In Now →
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Reset Token Input (shown if not prefilled or invalid) */}
                {(!queryToken || tokenValid === false) && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      Reset Token
                    </label>
                    <input
                      type="text"
                      required
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Paste your 64-character reset token"
                      className="input font-mono text-xs"
                      disabled={loading || verifying}
                    />
                  </div>
                )}

                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new strong password"
                      className="input pr-16"
                      disabled={loading || verifying}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)", opacity: 0.6 }}
                      tabIndex={-1}
                    >
                      {showPass ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="input pr-16"
                      disabled={loading || verifying}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)", opacity: 0.6 }}
                      tabIndex={-1}
                    >
                      {showConfirm ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                </div>

                {/* Password Complexity Checklist */}
                <div
                  className="p-3 rounded-xl space-y-1.5 text-[11px]"
                  style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <p className="font-semibold uppercase tracking-wider text-[10px]" style={{ color: "var(--text-muted)" }}>
                    Password Requirements:
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <span className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald" : "text-[#64748b]"}`}>
                      {hasMinLength ? "✓" : "○"} 8+ characters
                    </span>
                    <span className={`flex items-center gap-1.5 ${hasUpperCase ? "text-emerald" : "text-[#64748b]"}`}>
                      {hasUpperCase ? "✓" : "○"} 1+ uppercase (A-Z)
                    </span>
                    <span className={`flex items-center gap-1.5 ${hasLowerCase ? "text-emerald" : "text-[#64748b]"}`}>
                      {hasLowerCase ? "✓" : "○"} 1+ lowercase (a-z)
                    </span>
                    <span className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald" : "text-[#64748b]"}`}>
                      {hasNumber ? "✓" : "○"} 1+ number (0-9)
                    </span>
                  </div>
                  {confirmPassword.length > 0 && (
                    <p className={`text-[11px] pt-1 flex items-center gap-1.5 ${passwordsMatch ? "text-emerald" : "text-rose-400"}`}>
                      {passwordsMatch ? "✓ Passwords match" : "✕ Passwords do not match"}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || verifying || !isComplexityMet}
                  className="btn-primary w-full justify-center py-3 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                      </svg>
                      Updating Password…
                    </span>
                  ) : (
                    "Reset Password & Sign In"
                  )}
                </button>

                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="text-xs transition-colors hover:underline"
                    style={{ color: "var(--text-muted)" }}
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0b0f19] text-[#cbd5e1]">
          <div className="flex items-center gap-3">
            <svg className="animate-spin w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
            </svg>
            <span className="text-sm">Loading security verification…</span>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
