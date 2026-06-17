"use client";
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import api from "@/lib/api";
import { authStorage } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("operator");

  // Admin Auth Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    if (authStorage.isAuthenticated()) router.replace("/dashboard");
  }, [router]);

  const handleInitialSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setShowAdminModal(true);
  };

  const handleFinalRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!adminUsername || !adminPassword) {
      toast.error("Admin credentials are required.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/register", {
        newUsername,
        newPassword,
        role,
        adminUsername,
        adminPassword,
      });
      toast.success("Account created successfully!");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface bg-grid relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-blue-bright/8 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md px-4 animate-fade-in z-10">
        <div className="text-center mb-8 flex flex-col items-center">
          <img 
            src={theme === "light" ? "/light-logo.png" : "/logo.png"} 
            alt="ARGUS Shipping" 
            className="w-auto h-16 object-contain mb-4"
          />
          <h1 className="text-2xl font-bold text-primary">Create Account</h1>
        </div>

        <form
          onSubmit={handleInitialSubmit}
          className="glass rounded-2xl p-8 shadow-card space-y-5"
        >
          <div>
            <p className="text-sm font-semibold text-primary mb-1">New User Details</p>
            <p className="text-xs text-muted">Fill in the details for the new account.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wider">Username</label>
            <input
              type="text"
              required
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="input w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wider">Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wider">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wider">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input w-full"
            >
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button type="submit" className="btn-primary w-full justify-center py-2.5 mt-2">
            Proceed to Authorization
          </button>

          <div className="text-center mt-4 pt-4 border-t border-white/5">
            <Link href="/login" className="text-xs font-medium text-blue hover:text-blue-bright transition-colors">
              Already have an account? Sign In
            </Link>
          </div>
        </form>
      </div>

      {/* Admin Authorization Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-1 w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <h2 className="font-semibold text-primary">Admin Authorization Required</h2>
              <button 
                onClick={() => setShowAdminModal(false)} 
                className="text-muted hover:text-primary transition-colors text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm text-muted mb-4">
                An existing Administrator must authorize the creation of this new account.
              </p>
              
              <form onSubmit={handleFinalRegister} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted uppercase tracking-wider">Admin Username</label>
                  <input
                    type="text"
                    required
                    className="input w-full mt-1"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted uppercase tracking-wider">Admin Password</label>
                  <input
                    type="password"
                    required
                    className="input w-full mt-1"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdminModal(false)}
                    className="btn-secondary"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? "Authorizing..." : "Authorize & Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
