"use client";
import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

type CcRecipient = { id: number; name: string; email: string; multi_select: boolean };
type AdminUser = { id: number; username: string; role: string; email_address: string | null; has_password: boolean };
type CompulsoryEmail = { id: number; email: string; dear_who: string; mode: string; is_active: boolean };

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

  // ── CC Recipients (admin only) ─────────────────────────────
  const [ccList, setCcList] = useState<CcRecipient[]>([]);
  const [ccLoading, setCcLoading] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addMulti, setAddMulti] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMulti, setEditMulti] = useState(false);

  // ── Compulsory Emails (admin only) ─────────────────────────
  const [compulsoryList, setCompulsoryList] = useState<CompulsoryEmail[]>([]);
  const [ceLoading, setCeLoading] = useState(false);
  const [addCeEmail, setAddCeEmail] = useState("");
  const [addCeDearWho, setAddCeDearWho] = useState("");
  const [addCeMode, setAddCeMode] = useState("Air");
  const [addingCe, setAddingCe] = useState(false);

  // ── User SMTP Settings (admin only) ─────────────────────────
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserPassword, setEditUserPassword] = useState("");
  const [savingUserEmail, setSavingUserEmail] = useState(false);

  const [newOpUsername, setNewOpUsername] = useState("");
  const [newOpPassword, setNewOpPassword] = useState("");
  const [newOpEmail, setNewOpEmail] = useState("");
  const [newOpAppPassword, setNewOpAppPassword] = useState("");
  const [addingNewOp, setAddingNewOp] = useState(false);
  const [showAddOpForm, setShowAddOpForm] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("freight_token") : null;
    if (!token) return;

    api.get("/auth/email-settings")
      .then(res => {
        const email = res.data.data.email_address || "";
        setEmailAddress(email);
        setOriginalEmailAddress(email);
        setHasPassword(res.data.data.has_password || false);
      })
      .catch(err => { console.error("Failed to load email settings", err); });

    if (user?.role === "admin") {
      api.get("/cc-recipients")
        .then(res => setCcList(res.data.data))
        .catch(() => {});
      api.get("/auth/admin/users")
        .then(res => setAdminUsers(res.data.data))
        .catch(() => {});
      api.get("/compulsory-emails")
        .then(res => setCompulsoryList(res.data.data))
        .catch(() => {});
    }
  }, [user?.role]);

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

  // ── CC Recipients handlers ─────────────────────────────────
  const handleAddCc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addEmail.trim()) return;
    setAdding(true);
    try {
      const res = await api.post("/cc-recipients", { name: addName, email: addEmail, multi_select: addMulti });
      setCcList(prev => [...prev, res.data.data]);
      setAddName("");
      setAddEmail("");
      setAddMulti(false);
      toast.success("CC recipient added.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add CC recipient.");
    } finally {
      setAdding(false);
    }
  };

  const handleStartEdit = (r: CcRecipient) => {
    setEditId(r.id);
    setEditName(r.name);
    setEditEmail(r.email);
    setEditMulti(r.multi_select);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editName.trim() || !editEmail.trim()) return;
    setCcLoading(true);
    try {
      const res = await api.put(`/cc-recipients/${id}`, { name: editName, email: editEmail, multi_select: editMulti });
      setCcList(prev => prev.map(r => r.id === id ? res.data.data : r));
      setEditId(null);
      toast.success("CC recipient updated.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update CC recipient.");
    } finally {
      setCcLoading(false);
    }
  };

  const handleDeleteCc = async (id: number) => {
    if (!confirm("Remove this CC recipient?")) return;
    try {
      await api.delete(`/cc-recipients/${id}`);
      setCcList(prev => prev.filter(r => r.id !== id));
      toast.success("CC recipient removed.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to remove CC recipient.");
    }
  };

  // ── Compulsory Emails handlers ──────────────────────────────
  const handleAddCe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCeEmail.trim() || !addCeDearWho.trim() || !addCeMode) return;
    setAddingCe(true);
    try {
      const res = await api.post("/compulsory-emails", { email: addCeEmail, dear_who: addCeDearWho, mode: addCeMode, is_active: true });
      setCompulsoryList(prev => [...prev, res.data.data]);
      setAddCeEmail("");
      setAddCeDearWho("");
      setAddCeMode("Air");
      toast.success("Compulsory email added.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add compulsory email.");
    } finally {
      setAddingCe(false);
    }
  };

  const handleToggleCe = async (id: number, currentActive: boolean) => {
    try {
      const res = await api.put(`/compulsory-emails/${id}`, { is_active: !currentActive });
      setCompulsoryList(prev => prev.map(r => r.id === id ? res.data.data : r));
      toast.success(`Compulsory email turned ${!currentActive ? 'ON' : 'OFF'}.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to toggle compulsory email.");
    }
  };

  const handleDeleteCe = async (id: number) => {
    if (!confirm("Remove this compulsory email?")) return;
    try {
      await api.delete(`/compulsory-emails/${id}`);
      setCompulsoryList(prev => prev.filter(r => r.id !== id));
      toast.success("Compulsory email removed.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to remove compulsory email.");
    }
  };

  // ── User SMTP Settings handlers (admin only) ────────────────
  const handleStartEditUser = (u: AdminUser) => {
    setEditingUserId(u.id);
    setEditUserEmail(u.email_address || "");
    setEditUserPassword("");
  };

  const handleUpdateUserEmail = async (userId: number) => {
    if (!editUserEmail.trim()) {
      toast.error("Email address is required.");
      return;
    }
    setSavingUserEmail(true);
    try {
      await api.post("/auth/admin/update-user-email", {
        userId,
        email_address: editUserEmail,
        email_password: editUserPassword,
      });
      toast.success("User email settings verified and updated successfully.");
      setAdminUsers(prev => prev.map(u => u.id === userId ? {
        ...u,
        email_address: editUserEmail,
        has_password: editUserPassword ? true : u.has_password
      } : u));
      setEditingUserId(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update user email settings.");
    } finally {
      setSavingUserEmail(false);
    }
  };

  const handleCreateNewOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpUsername.trim() || !newOpPassword.trim() || !newOpEmail.trim() || !newOpAppPassword.trim()) {
      toast.error("All fields are required.");
      return;
    }
    setAddingNewOp(true);
    try {
      await api.post("/auth/admin/create-operator", {
        username: newOpUsername.trim(),
        password: newOpPassword,
        email_address: newOpEmail.trim(),
        email_password: newOpAppPassword.trim()
      });
      toast.success("New Operator created and SMTP verified successfully.");
      // Refresh list of users
      const usersRes = await api.get("/auth/admin/users");
      setAdminUsers(usersRes.data.data);
      // Reset form
      setNewOpUsername("");
      setNewOpPassword("");
      setNewOpEmail("");
      setNewOpAppPassword("");
      setShowAddOpForm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create new Operator.");
    } finally {
      setAddingNewOp(false);
    }
  };

  const handleRemoveUserCredentials = async (userId: number) => {
    if (!confirm("Are you sure you want to clear/remove SMTP credentials for this user? They will no longer be available for Sales selection.")) return;
    try {
      await api.post("/auth/admin/update-user-email", {
        userId,
        action: "remove"
      });
      toast.success("SMTP credentials cleared successfully.");
      setAdminUsers(prev => prev.map(u => u.id === userId ? {
        ...u,
        email_address: null,
        has_password: false
      } : u));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to remove credentials.");
    }
  };

  const handleDeleteUserAccount = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to permanently delete the user account "${username}"? This action cannot be undone.`)) return;
    try {
      await api.post("/auth/admin/delete-user", { userId });
      toast.success(`User "${username}" deleted successfully.`);
      setAdminUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete user account.");
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
        {user?.role !== "sales" && user?.role !== "customer" && (
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
        )}

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
        {/* CC Recipients Card — admin only */}
        {user?.role === "admin" && (
          <div className="glass p-6 rounded-2xl border border-white/5 shadow-card">
            <h2 className="text-lg font-bold text-primary mb-1 flex items-center gap-2">
              <span>📋</span> CC Recipients
            </h2>
            <p className="text-sm text-muted mb-1">Manage the email addresses shown as CC options when sending RFQs.</p>
            <div className="flex gap-4 text-xs text-muted/60 mb-5">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-blue/60 inline-block" /> Single-select (radio)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border-2 border-emerald/60 inline-block" /> Always includable (multi)
              </span>
            </div>

            {/* Current list */}
            <div className="space-y-2 mb-6">
              {ccList.length === 0 && (
                <p className="text-xs text-muted/50 italic">No CC recipients configured yet.</p>
              )}
              {ccList.map(r => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl"
                >
                  {editId === r.id ? (
                    // ── Inline edit mode ──────────────────────
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex gap-2">
                        <input
                          className="input flex-1 py-1.5 text-sm"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          placeholder="Name"
                        />
                        <input
                          className="input flex-1 py-1.5 text-sm"
                          value={editEmail}
                          onChange={e => setEditEmail(e.target.value)}
                          placeholder="Email"
                        />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                        <div
                          onClick={() => setEditMulti(v => !v)}
                          className={[
                            "relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer",
                            editMulti ? "bg-emerald/60" : "bg-white/10",
                          ].join(" ")}
                        >
                          <span className={[
                            "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow",
                            editMulti ? "translate-x-4" : "translate-x-0.5",
                          ].join(" ")} />
                        </div>
                        <span className="text-xs text-muted">Always includable (multi-select)</span>
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(r.id)}
                          disabled={ccLoading}
                          className="btn-primary px-3 py-1.5 text-xs"
                        >
                          {ccLoading ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="btn-secondary px-3 py-1.5 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // ── Display mode ──────────────────────────
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-primary">{r.name}</p>
                          {r.multi_select ? (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald/15 text-emerald border border-emerald/30">
                              Multi
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue/10 text-blue/70 border border-blue/20">
                              Radio
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted truncate">{r.email}</p>
                      </div>
                      <button
                        onClick={() => handleStartEdit(r)}
                        className="text-xs text-blue hover:underline px-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCc(r.id)}
                        className="text-xs text-rose hover:underline px-2"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Add new */}
            <form onSubmit={handleAddCc} className="space-y-3">
              <p className="text-xs font-semibold text-muted uppercase tracking-widest">Add New</p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="input text-sm py-2"
                  placeholder="Name"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  required
                />
                <input
                  className="input text-sm py-2"
                  type="email"
                  placeholder="email@example.com"
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  required
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                <div
                  onClick={() => setAddMulti(v => !v)}
                  className={[
                    "relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer",
                    addMulti ? "bg-emerald/60" : "bg-white/10",
                  ].join(" ")}
                >
                  <span className={[
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow",
                    addMulti ? "translate-x-4" : "translate-x-0.5",
                  ].join(" ")} />
                </div>
                <span className="text-xs text-muted">Always includable (multi-select)</span>
              </label>
              <button
                type="submit"
                disabled={adding}
                className="btn-primary w-full justify-center"
              >
                {adding ? "Adding..." : "+ Add CC Recipient"}
              </button>
            </form>
          </div>
        )}

        {/* Compulsory Emails Card — admin only */}
        {user?.role === "admin" && (
          <div className="glass p-6 rounded-2xl border border-white/5 shadow-card">
            <h2 className="text-lg font-bold text-primary mb-1 flex items-center gap-2">
              <span>📧</span> Compulsory Emails
            </h2>
            <p className="text-sm text-muted mb-6">Manage compulsory emails sent during RFQ creation based on Mode.</p>
            
            <div className="space-y-2 mb-6">
              {compulsoryList.length === 0 && (
                <p className="text-xs text-muted/50 italic">No compulsory emails configured yet.</p>
              )}
              {compulsoryList.map(ce => (
                <div key={ce.id} className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-primary">{ce.dear_who}</p>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue/10 text-blue/70 border border-blue/20">
                        {ce.mode}
                      </span>
                    </div>
                    <p className="text-xs text-muted truncate">{ce.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleCe(ce.id, ce.is_active)}
                      className={["px-2 py-1 text-xs rounded border transition-colors", ce.is_active ? "border-emerald/30 bg-emerald/10 text-emerald" : "border-white/10 bg-white/5 text-muted"].join(" ")}
                    >
                      {ce.is_active ? "ON" : "OFF"}
                    </button>
                    <button
                      onClick={() => handleDeleteCe(ce.id)}
                      className="text-xs text-rose hover:underline px-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddCe} className="space-y-3">
              <p className="text-xs font-semibold text-muted uppercase tracking-widest">Add New</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  className="input text-sm py-2"
                  placeholder="Dear Who"
                  value={addCeDearWho}
                  onChange={e => setAddCeDearWho(e.target.value)}
                  required
                />
                <input
                  className="input text-sm py-2"
                  type="email"
                  placeholder="Email"
                  value={addCeEmail}
                  onChange={e => setAddCeEmail(e.target.value)}
                  required
                />
                <select
                  className="select text-sm py-2"
                  value={addCeMode}
                  onChange={e => setAddCeMode(e.target.value)}
                  required
                >
                  <option value="Air">Air</option>
                  <option value="Sea">Sea</option>
                  <option value="Road">Road</option>
                </select>
              </div>
              <button type="submit" disabled={addingCe} className="btn-primary w-full justify-center">
                {addingCe ? "Adding..." : "+ Add Compulsory Email"}
              </button>
            </form>
          </div>
        )}

        {/* User SMTP Settings Card — admin only */}
        {user?.role === "admin" && (
          <div className="glass p-6 rounded-2xl border border-white/5 shadow-card">
            <h2 className="text-lg font-bold text-primary mb-1 flex items-center gap-2">
              <span>🔑</span> User SMTP Credentials
            </h2>
            <p className="text-sm text-muted mb-6">Manage and verify SMTP/IMAP credentials for all operators and users.</p>

            {/* Add Operator Form */}
            <div className="mb-6">
              {!showAddOpForm ? (
                <button
                  onClick={() => setShowAddOpForm(true)}
                  className="btn-primary py-2 text-xs"
                >
                  + Add New Operator & SMTP
                </button>
              ) : (
                <form onSubmit={handleCreateNewOperator} className="glass p-4 rounded-xl border border-white/5 space-y-3 animate-slide-up">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-white/5 pb-1">
                    Add New Operator Account
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider font-semibold text-muted mb-1">
                        Username
                      </label>
                      <input
                        className="input py-1 px-3 text-xs w-full"
                        value={newOpUsername}
                        onChange={e => setNewOpUsername(e.target.value)}
                        placeholder="e.g. op_username"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider font-semibold text-muted mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        className="input py-1 px-3 text-xs w-full"
                        value={newOpPassword}
                        onChange={e => setNewOpPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider font-semibold text-muted mb-1">
                        SMTP/IMAP Email
                      </label>
                      <input
                        type="email"
                        className="input py-1 px-3 text-xs w-full"
                        value={newOpEmail}
                        onChange={e => setNewOpEmail(e.target.value)}
                        placeholder="e.g. op@argusshipping.co"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider font-semibold text-muted mb-1">
                        App Password
                      </label>
                      <input
                        type="password"
                        className="input py-1 px-3 text-xs w-full"
                        value={newOpAppPassword}
                        onChange={e => setNewOpAppPassword(e.target.value)}
                        placeholder="e.g. gnji iagc lcfp zpyg"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowAddOpForm(false)}
                      className="btn-secondary py-1 px-3 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addingNewOp}
                      className="btn-primary py-1 px-3 text-xs"
                    >
                      {addingNewOp ? "Verifying..." : "Verify & Create"}
                    </button>
                  </div>
                </form>
              )}
            </div>
            
            <div className="space-y-4">
              {adminUsers.length === 0 && (
                <p className="text-xs text-muted/50 italic">No users found.</p>
              )}
              {adminUsers.map(u => (
                <div
                  key={u.id}
                  className="flex flex-col gap-3 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-primary">{u.username}</span>
                      <span className="ml-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue/10 text-blue/70 border border-blue/20">
                        {u.role}
                      </span>
                    </div>
                    {editingUserId !== u.id && (
                      <div className="flex gap-3 flex-wrap">
                        <button
                          onClick={() => handleStartEditUser(u)}
                          className="text-xs text-blue hover:underline font-semibold"
                        >
                          Manage Credentials
                        </button>
                        {u.email_address && (
                          <button
                            onClick={() => handleRemoveUserCredentials(u.id)}
                            className="text-xs text-rose hover:underline font-semibold"
                          >
                            Remove Credentials
                          </button>
                        )}
                        {u.username !== user?.username && (
                          <button
                            onClick={() => handleDeleteUserAccount(u.id, u.username)}
                            className="text-xs text-rose/60 hover:underline hover:text-rose font-semibold"
                          >
                            Delete Account
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {editingUserId === u.id ? (
                    <div className="space-y-3 pt-2 border-t border-white/5 animate-slide-up">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          className="input w-full py-1.5 text-xs"
                          value={editUserEmail}
                          onChange={e => setEditUserEmail(e.target.value)}
                          placeholder="e.g. operator@argusshipping.co"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1 flex items-center gap-1">
                          App Password {u.has_password && <span className="text-[9px] text-emerald font-semibold normal-case">(Configured)</span>}
                        </label>
                        <input
                          type="password"
                          className="input w-full py-1.5 text-xs"
                          value={editUserPassword}
                          onChange={e => setEditUserPassword(e.target.value)}
                          placeholder={u.has_password ? "••••••••" : "Enter app password"}
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleUpdateUserEmail(u.id)}
                          disabled={savingUserEmail}
                          className="btn-primary px-3 py-1.5 text-xs flex-1 justify-center"
                        >
                          {savingUserEmail ? "Verifying..." : "Verify & Save"}
                        </button>
                        <button
                          onClick={() => setEditingUserId(null)}
                          disabled={savingUserEmail}
                          className="btn-secondary px-3 py-1.5 text-xs flex-1 justify-center"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs space-y-1">
                      <p className="text-muted">
                        <span className="font-medium">Email:</span> {u.email_address || <span className="italic opacity-60">Not configured</span>}
                      </p>
                      <p className="text-muted">
                        <span className="font-medium">App Password:</span> {u.has_password ? "••••••••" : <span className="italic opacity-60">Not configured</span>}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
