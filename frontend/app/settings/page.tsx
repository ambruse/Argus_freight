"use client";
import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

export default function SettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [emailAddress, setEmailAddress] = useState("");
  const [originalEmailAddress, setOriginalEmailAddress] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  useEffect(() => {
    // Fetch current email settings
    const token = typeof window !== "undefined" ? localStorage.getItem("freight_token") : null;
    if (!token) return;

    api.get("/auth/email-settings")
      .then(res => {
        const email = res.data.data.email_address || "";
        setEmailAddress(email);
        setOriginalEmailAddress(email);
        setHasPassword(res.data.data.has_password || false);
      })
      .catch(err => {
        console.error("Failed to load email settings", err);
      });
  }, []);

  const handleUpdateEmailSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmail(true);
    try {
      await api.post("/auth/email-settings", {
        email_address: emailAddress,
        email_password: emailPassword,
      });
      toast.success("Email credentials verified and updated successfully.");
      setOriginalEmailAddress(emailAddress);
      setEmailPassword("");
      setHasPassword(true);
      setIsEditingEmail(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update email settings.");
    } finally {
      setSavingEmail(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      toast.success("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      title="Settings"
      subtitle="Manage your account preferences and security."
    >
      <div className="max-w-xl mx-auto space-y-6 animate-fade-in mt-10">
        
        {/* Profile Card */}
        <div className="glass p-6 rounded-2xl border border-white/5">
          <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <span>👤</span> Account Details
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-widest mb-1.5">
                Username
              </label>
              <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-primary font-medium">
                {user?.username}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-widest mb-1.5">
                Role
              </label>
              <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-primary font-medium capitalize">
                {user?.role}
              </div>
            </div>
          </div>
        </div>

        {/* Email Settings Card */}
        <div className="glass p-6 rounded-2xl border border-white/5 shadow-card">
          <h2 className="text-lg font-bold text-primary mb-1 flex items-center gap-2">
            <span>✉️</span> Email Settings
          </h2>
          <p className="text-sm text-muted mb-6">Manage SMTP/IMAP credentials for sending RFQs and receiving replies.</p>
          
          <form onSubmit={handleUpdateEmailSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-widest mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                disabled={!isEditingEmail}
                className="input w-full disabled:opacity-60 disabled:cursor-not-allowed"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="e.g. user@example.com"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                App Password {hasPassword && <span className="text-[10px] text-emerald font-semibold normal-case">(Configured)</span>}
              </label>
              <input
                type="password"
                disabled={!isEditingEmail}
                className="input w-full disabled:opacity-60 disabled:cursor-not-allowed"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder={hasPassword ? "••••••••" : "Enter app password"}
              />
              <p className="text-[10px] text-muted mt-1">
                For Gmail, use a 16-character Google App Password (not your main password).
              </p>
            </div>

            <div className="pt-2">
              {!isEditingEmail ? (
                <button
                  type="button"
                  onClick={() => setIsEditingEmail(true)}
                  className="btn-primary w-full justify-center"
                >
                  Change Email Settings
                </button>
              ) : (
                <div className="flex gap-3 animate-slide-up">
                  <button
                    type="button"
                    disabled={savingEmail}
                    onClick={() => {
                      setIsEditingEmail(false);
                      setEmailAddress(originalEmailAddress);
                      setEmailPassword("");
                    }}
                    className="btn-secondary flex-1 justify-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEmail}
                    className="btn-primary flex-1 justify-center"
                  >
                    {savingEmail ? "Verifying..." : "Update Settings"}
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="glass p-6 rounded-2xl border border-white/5 shadow-card">
          <h2 className="text-lg font-bold text-primary mb-1 flex items-center gap-2">
            <span>🔒</span> Change Password
          </h2>
          <p className="text-sm text-muted mb-6">Ensure your account uses a strong password.</p>
          
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-widest mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                required
                className="input w-full"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-widest mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  className="input w-full"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-widest mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  className="input w-full"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Retype new password"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>

      </div>
    </AppLayout>
  );
}
