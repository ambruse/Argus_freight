"use client";
// app/register/page.tsx
// ─────────────────────────────────────────────────────────────
//  Premium Register Page — variable-driven and glassmorphic.
// ─────────────────────────────────────────────────────────────
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import api from "@/lib/api";
import { authStorage } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();

  const [newUsername,     setNewUsername]     = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role,            setRole]            = useState("operator");
  const [name,            setName]            = useState("");
  const [emailAddress,    setEmailAddress]    = useState("");
  const [contactNumber,   setContactNumber]   = useState("");
  const [isRoleLocked,    setIsRoleLocked]    = useState(false);

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsername,  setAdminUsername]  = useState("");
  const [adminPassword,  setAdminPassword]  = useState("");
  const [loading,        setLoading]        = useState(false);
  const [theme,          setTheme]          = useState<"dark" | "light">("dark");

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
    if (authStorage.isAuthenticated()) router.replace("/dashboard");
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("role") === "customer") {
        setRole("customer");
        setIsRoleLocked(true);
      }
    }
  }, [router]);

  const handleInitialSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match."); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters."); return; }

    if (role === "customer") {
      setLoading(true);
      try {
        await api.post("/auth/register", { newUsername, newPassword, role, name, email_address: emailAddress, contact_number: contactNumber });
        toast.success("Account created successfully!");
        router.push("/login");
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Registration failed.");
      } finally {
        setLoading(false);
      }
    } else {
      setShowAdminModal(true);
    }
  };

  const handleFinalRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!adminUsername || !adminPassword) { toast.error("Admin credentials are required."); return; }
    setLoading(true);
    try {
      await api.post("/auth/register", { newUsername, newPassword, role, adminUsername, adminPassword });
      toast.success("Account created successfully!");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-10"
      style={{ background: "var(--login-right-bg)" }}
    >
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full pointer-events-none opacity-10"
        style={{ background: "radial-gradient(circle, rgba(245,176,55,0.50) 0%, transparent 70%)", filter: "blur(80px)" }}
      />
      <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />

      <div className="w-full max-w-md px-4 animate-fade-in z-10 login-glass-card">
        {/* Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-2xl blur-lg opacity-40"
              style={{ background: "radial-gradient(circle, rgba(245,176,55,0.60) 0%, transparent 70%)" }}
            />
            <img
              src={theme === "light" ? "/light-logo.png" : "/logo.png"}
              alt="ARGUS Shipping"
              className="relative w-auto h-14 object-contain"
            />
          </div>
          <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}>Create Account</h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>Fill in your details to get started</p>
        </div>

        {/* Top gold line */}
        <div className="h-[1px] w-full mb-6 rounded-full"
          style={{ background: "linear-gradient(90deg, transparent, var(--border-gold-glow), transparent)" }}
        />

        <form onSubmit={handleInitialSubmit} className="space-y-4">
          <div className="mb-2">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>New User Details</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", opacity: 0.85 }}>Fill in the details for the new account.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", opacity: 0.8 }}>Username</label>
            <input type="text" required value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="input w-full" placeholder="Choose a username" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", opacity: 0.8 }}>Password</label>
            <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input w-full" placeholder="At least 6 characters" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", opacity: 0.8 }}>Confirm Password</label>
            <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input w-full" placeholder="Repeat password" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", opacity: 0.8 }}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input w-full disabled:opacity-75 disabled:cursor-not-allowed"
              disabled={isRoleLocked}
            >
              <option value="operator">Operator</option>
              <option value="calling_agent">Calling Agent</option>
              <option value="admin">Admin</option>
              <option value="sales">Sales</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          {role === "customer" && (
            <>
              <div className="space-y-1.5 animate-slide-up">
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", opacity: 0.8 }}>Full Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input w-full" placeholder="e.g. John Doe" />
              </div>
              <div className="space-y-1.5 animate-slide-up">
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", opacity: 0.8 }}>Mail Address</label>
                <input type="email" required value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} className="input w-full" placeholder="e.g. john@example.com" />
              </div>
              <div className="space-y-1.5 animate-slide-up">
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", opacity: 0.8 }}>Contact Number</label>
                <input type="text" required value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} className="input w-full" placeholder="e.g. +974 30512233" />
              </div>
            </>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-2">
            {role === "customer"
              ? (loading ? "Creating Account…" : "Register →")
              : "Proceed to Authorization →"}
          </button>

          <div className="text-center mt-4 pt-4" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
            <Link href="/login" className="text-[12px] font-semibold transition-colors hover:underline"
              style={{ color: "var(--sidebar-avatar-text)" }}
            >
              Already have an account? Sign In
            </Link>
          </div>
        </form>
      </div>

      {/* Admin Authorization Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: "rgba(4,8,16,0.85)", backdropFilter: "blur(8px)" }}
        >
          <div className="w-full max-w-sm rounded-2xl overflow-hidden flex flex-col animate-scale-in"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border-gold)",
              boxShadow: "0 8px 48px rgba(0,0,0,0.50)",
            }}
          >
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: "1px solid var(--sidebar-border)" }}
            >
              <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}>Admin Authorization Required</h2>
              <button onClick={() => setShowAdminModal(false)}
                className="text-xl leading-none transition-colors"
                style={{ color: "var(--text-muted)", opacity: 0.6 }}
              >
                ×
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                An existing Administrator must authorize the creation of this new account.
              </p>

              <form onSubmit={handleFinalRegister} className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", opacity: 0.8 }}>Admin Username</label>
                  <input type="text" required className="input w-full mt-1" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} autoFocus />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", opacity: 0.8 }}>Admin Password</label>
                  <input type="password" required className="input w-full mt-1" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowAdminModal(false)} className="btn-secondary" disabled={loading}>Cancel</button>
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? "Authorizing…" : "Authorize & Create"}
                  </button>
                </div>
              </form>
            </div>
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
  );
}
