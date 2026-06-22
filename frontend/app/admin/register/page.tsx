"use client";
import { useState, FormEvent, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

export default function AdminRegisterUserPage() {
  const { user: currentUser } = useAuth();
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("operator");
  const [name, setName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  // Admin Auth Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Users List State
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/auth/admin/users");
      setUsers(data.data || []);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInitialSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    
    if (role === "customer") {
      setLoading(true);
      try {
        await api.post("/auth/register", {
          newUsername,
          newPassword,
          role,
          name,
          email_address: emailAddress,
          contact_number: contactNumber
        });
        toast.success("Customer account created successfully!");
        fetchUsers();
        // Reset form
        setNewUsername("");
        setNewPassword("");
        setConfirmPassword("");
        setRole("operator");
        setName("");
        setEmailAddress("");
        setContactNumber("");
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
      fetchUsers();
      // Reset form
      setNewUsername("");
      setNewPassword("");
      setConfirmPassword("");
      setRole("operator");
      setShowAdminModal(false);
      setAdminPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStall = (userId: number, username: string, isStalledNow: boolean) => {
    const actionText = isStalledNow ? "activate" : "stall";
    const title = isStalledNow ? "Activate Account" : "Stall Account";
    const message = isStalledNow
      ? `Are you sure you want to activate the user account "${username}"?`
      : `Are you sure you want to stall the user account "${username}"? The user will be logged out immediately and blocked from logging in.`;
    
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText: isStalledNow ? "Activate" : "Stall User",
      cancelText: "Cancel",
      isDangerous: !isStalledNow,
      onConfirm: async () => {
        try {
          const { data } = await api.post("/auth/admin/toggle-stall", { userId });
          toast.success(data.message || `Account successfully ${isStalledNow ? "activated" : "stalled"}.`);
          fetchUsers();
        } catch (err: any) {
          toast.error(err.response?.data?.message || `Failed to ${actionText} user account.`);
        }
      }
    });
  };

  const handleDeleteUser = (userId: number, username: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Account",
      message: `Are you sure you want to permanently delete the user account "${username}"? This action cannot be undone and will delete their login credentials.`,
      confirmText: "Delete Account",
      cancelText: "Cancel",
      isDangerous: true,
      onConfirm: async () => {
        try {
          const { data } = await api.post("/auth/admin/delete-user", { userId });
          toast.success(data.message || `User account "${username}" deleted successfully.`);
          fetchUsers();
        } catch (err: any) {
          toast.error(err.response?.data?.message || "Failed to delete user account.");
        }
      }
    });
  };

  // Client-side filtering
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <AppLayout title="Register User" subtitle="Create new accounts for Operators, Sales, or Admins.">
      <div className="space-y-10 relative z-10 animate-fade-in pb-12">
        
        {/* Registration Form Container */}
        <div className="max-w-md mx-auto">
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
                <option value="calling_agent">Calling Agent</option>
                <option value="admin">Admin</option>
                <option value="sales">Sales</option>
                <option value="customer">Customer</option>
              </select>
            </div>

            {role === "customer" && (
              <>
                <div className="space-y-1.5 animate-slide-up">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input w-full"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="space-y-1.5 animate-slide-up">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider">Mail Address</label>
                  <input
                    type="email"
                    required
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="input w-full"
                    placeholder="e.g. john@example.com"
                  />
                </div>
                <div className="space-y-1.5 animate-slide-up">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider">Contact Number</label>
                  <input
                    type="text"
                    required
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="input w-full"
                    placeholder="e.g. +974 30512233"
                  />
                </div>
              </>
            )}

            <button type="submit" className="btn-primary w-full justify-center py-2.5 mt-2">
              {role === "customer" ? (loading ? "Creating Account..." : "Register Customer") : "Proceed to Authorization"}
            </button>
          </form>
        </div>

        {/* Registered Accounts Section */}
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-2xl shadow-card overflow-hidden">
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-sm font-semibold tracking-widest text-muted uppercase">
                  Registered Accounts ({filteredUsers.length})
                </h3>
                <p className="text-xs text-muted mt-0.5">Manage existing user roles and account statuses.</p>
              </div>
              
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Search username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input text-xs py-1.5 px-3 w-48"
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="input text-xs py-1.5 px-3"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="operator">Operator</option>
                  <option value="sales">Sales</option>
                  <option value="calling_agent">Calling Agent</option>
                  <option value="customer">Customer</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>USERNAME</th>
                    <th>ROLE</th>
                    <th>EMAIL / SMTP</th>
                    <th>STATUS</th>
                    <th className="text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted">
                        Loading accounts...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted">
                        No registered accounts found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelf = currentUser?.username === u.username;
                      return (
                        <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="font-semibold text-primary">
                            {u.username} {isSelf && <span className="text-[10px] text-blue font-normal">(You)</span>}
                          </td>
                          <td>
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border 
                              ${u.role === "admin" ? "bg-rose/10 text-rose border-rose/20" :
                                u.role === "operator" ? "bg-blue/10 text-blue border-blue/20" :
                                u.role === "sales" ? "bg-emerald/10 text-emerald border-emerald/20" :
                                u.role === "customer" ? "bg-indigo/10 text-indigo border-indigo/20" :
                                "bg-amber/10 text-amber border-amber/20"}`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td>
                            {u.email_address ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-primary">{u.email_address}</span>
                                {u.has_password ? (
                                  <span className="self-start text-[9px] px-1 py-0.2 rounded bg-blue/10 text-blue/80 border border-blue/20">SMTP Active</span>
                                ) : (
                                  <span className="self-start text-[9px] px-1 py-0.2 rounded bg-white/[0.04] text-muted border border-white/[0.06]">SMTP Missing Pass</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted/50 italic">Not Configured</span>
                            )}
                          </td>
                          <td>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border 
                              ${u.is_stalled 
                                ? "bg-rose/10 text-rose border-rose/20" 
                                : "bg-emerald/10 text-emerald border-emerald/20"}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${u.is_stalled ? "bg-rose" : "bg-emerald animate-pulse"}`} />
                              {u.is_stalled ? "Stalled" : "Active"}
                            </span>
                          </td>
                          <td className="text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleToggleStall(u.id, u.username, u.is_stalled)}
                                disabled={isSelf}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all duration-200 
                                  ${isSelf 
                                    ? "opacity-30 cursor-not-allowed border-white/5 text-muted" 
                                    : u.is_stalled 
                                      ? "bg-emerald/10 text-emerald border-emerald/20 hover:bg-emerald/20 active:scale-95" 
                                      : "bg-amber/10 text-amber border-amber/20 hover:bg-amber/20 active:scale-95"}`}
                              >
                                {u.is_stalled ? "Activate" : "Stall"}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.username)}
                                disabled={isSelf}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all duration-200 
                                  ${isSelf 
                                    ? "opacity-30 cursor-not-allowed border-white/5 text-muted" 
                                    : "bg-rose/10 text-rose border-rose/20 hover:bg-rose/20 active:scale-95"}`}
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Admin Auth Modal ────────────────────────────── */}
        {showAdminModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
            <div className="glass w-full max-w-sm rounded-2xl p-6 shadow-glow border border-white/[0.06]">
              <h2 className="text-lg font-bold text-primary mb-2">Admin Authorization</h2>
              <p className="text-xs text-muted mb-6">
                Please enter admin credentials to authorize creating this account.
              </p>

              <form onSubmit={handleFinalRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">Admin Username</label>
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="input w-full"
                    placeholder="Enter admin username"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">Admin Password</label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="input w-full"
                    placeholder="Enter admin password"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdminModal(false)}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold text-muted hover:text-primary hover:bg-white/[0.04] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 btn-primary py-2 justify-center"
                  >
                    {loading ? "Authorizing..." : "Authorize"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Custom Confirmation Modal ────────────────────── */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
            <div className="glass w-full max-w-sm rounded-2xl p-6 shadow-glow border border-white/[0.06] flex flex-col">
              <h2 className="text-lg font-bold text-primary mb-2">
                {confirmModal.title}
              </h2>
              <p className="text-xs text-muted mb-6 leading-relaxed">
                {confirmModal.message}
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold text-muted hover:text-primary hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/5"
                >
                  {confirmModal.cancelText || "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  }}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 flex justify-center items-center
                    ${confirmModal.isDangerous 
                      ? "bg-rose text-white hover:bg-rose-bright shadow-glow-rose" 
                      : "bg-blue text-white hover:bg-blue-bright shadow-glow-blue"}`}
                >
                  {confirmModal.confirmText || "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
