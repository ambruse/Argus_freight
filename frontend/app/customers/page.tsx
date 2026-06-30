"use client";
import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

interface Customer {
  id: number;
  username: string;
  name: string;
  email_address: string | null;
  contact_number: string | null;
  customer_id: string | null;
  address: string | null;
  company: string | null;
  company_address: string | null;
  secondary_phone: string | null;
  created_at: string;
}

export default function CustomerBookPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal states for Admin Edit
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email_address: "",
    contact_number: "",
    address: "",
    company: "",
    company_address: "",
    secondary_phone: ""
  });
  const [saving, setSaving] = useState(false);

  // Modal states for Customer Details View
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailedCustomer, setDetailedCustomer] = useState<Customer | null>(null);

  const fetchCustomers = async () => {
    try {
      const { data } = await api.get("/customers");
      setCustomers(data.data || []);
    } catch {
      toast.error("Failed to load customer records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenDetails = (c: Customer) => {
    setDetailedCustomer(c);
    setIsDetailsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setSelectedCustomer(c);
    setEditForm({
      name: c.name || "",
      email_address: c.email_address || "",
      contact_number: c.contact_number || "",
      address: c.address || "",
      company: c.company || "",
      company_address: c.company_address || "",
      secondary_phone: c.secondary_phone || ""
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/customers/${selectedCustomer.id}`, editForm);
      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? data.data : c));
      toast.success("Customer details updated successfully.");
      setIsEditModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update customer details.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Customer) => {
    if (!confirm(`Are you sure you want to permanently delete the customer account for "${c.name}"? This will also remove their sandbox tables.`)) return;
    try {
      await api.delete(`/customers/${c.id}`);
      setCustomers(prev => prev.filter(item => item.id !== c.id));
      toast.success("Customer account removed.");
    } catch {
      toast.error("Failed to delete customer account.");
    }
  };

  const filteredCustomers = customers.filter(c => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.email_address && c.email_address.toLowerCase().includes(q)) ||
      (c.customer_id && c.customer_id.includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q)) ||
      c.username.toLowerCase().includes(q)
    );
  });

  const isAdmin = user?.role === "admin";

  return (
    <AppLayout
      title="Customer Book"
      subtitle="Directory of all registered client profiles and corporate addresses."
    >
      <div className="space-y-6 animate-fade-in mt-6">
        
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/5 border border-white/10 p-4 rounded-2xl">
          <div className="relative w-full sm:max-w-md">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">🔍</span>
            <input
              type="text"
              placeholder="Search by name, company, mail, customer ID..."
              className="input w-full pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-xs text-muted/80 tracking-wide font-medium">
            Showing {filteredCustomers.length} of {customers.length} customer records
          </div>
        </div>

        {/* List Grid / Table */}
        {loading ? (
          <div className="text-center py-20 text-muted">Loading customer directory...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-20 text-muted bg-white/5 rounded-2xl border border-white/5">
            No customer accounts found matching your search.
          </div>
        ) : (
          <div className="glass rounded-2xl border border-white/5 overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-muted uppercase text-[10px] tracking-widest font-semibold">
                    <th className="py-4 px-6">ID</th>
                    <th className="py-4 px-6">Customer Name</th>
                    <th className="py-4 px-6">Company</th>
                    <th className="py-4 px-6">Primary Email</th>
                    <th className="py-4 px-6">Primary Phone</th>
                    <th className="py-4 px-6">Secondary Phone</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-[13px] font-medium text-primary">
                  {filteredCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-6 text-gold font-bold">#{c.customer_id || "—"}</td>
                      <td className="py-3.5 px-6">
                        <div>
                          <div className="font-bold">{c.name}</div>
                          <div className="text-[10px] text-muted tracking-wider uppercase mt-0.5">@{c.username}</div>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-muted-foreground">{c.company || <span className="text-muted/40 font-normal italic">Empty</span>}</td>
                      <td className="py-3.5 px-6">{c.email_address || "—"}</td>
                      <td className="py-3.5 px-6">{c.contact_number || "—"}</td>
                      <td className="py-3.5 px-6">{c.secondary_phone || <span className="text-muted/40 font-normal italic">Empty</span>}</td>
                      <td className="py-3.5 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenDetails(c)}
                            className="px-2.5 py-1 text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-primary transition-all"
                            title="View Full Profile"
                          >
                            Details
                          </button>
                          {isAdmin ? (
                            <>
                              <button
                                onClick={() => handleOpenEdit(c)}
                                className="px-2.5 py-1 text-xs font-semibold bg-gold/10 hover:bg-gold/20 border border-gold/20 hover:border-gold/30 rounded-lg text-gold transition-all"
                                title="Edit Customer Details"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(c)}
                                className="px-2.5 py-1 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 rounded-lg text-rose-500 transition-all"
                                title="Delete Account"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <button
                              disabled
                              className="px-2.5 py-1 text-xs font-semibold bg-white/5 border border-white/5 rounded-lg text-muted/30 cursor-not-allowed"
                              title="Admin Privilege Required to Edit"
                            >
                              Edit (Locked)
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Details View Modal ────────────────────────────────── */}
        {isDetailsModalOpen && detailedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="glass w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl p-6 relative animate-zoom-in space-y-6">
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="absolute top-4 right-4 text-muted hover:text-primary transition-colors text-lg"
              >
                ✕
              </button>
              <div>
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                  <span>👤</span> Customer Profile Details
                </h3>
                <p className="text-xs text-muted mt-1">Full registration and supplementary settings for #{detailedCustomer.customer_id}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="block text-muted/60 font-semibold mb-1 uppercase tracking-wider text-[9px]">Full Name</span>
                  <span className="font-bold text-primary text-[13px]">{detailedCustomer.name}</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="block text-muted/60 font-semibold mb-1 uppercase tracking-wider text-[9px]">Username</span>
                  <span className="font-bold text-primary text-[13px]">@{detailedCustomer.username}</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="block text-muted/60 font-semibold mb-1 uppercase tracking-wider text-[9px]">Email Address</span>
                  <span className="font-bold text-primary text-[13px]">{detailedCustomer.email_address || "—"}</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="block text-muted/60 font-semibold mb-1 uppercase tracking-wider text-[9px]">Company Name</span>
                  <span className="font-bold text-primary text-[13px]">{detailedCustomer.company || <span className="italic text-muted/40 font-normal">Not Provided</span>}</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="block text-muted/60 font-semibold mb-1 uppercase tracking-wider text-[9px]">Primary Phone</span>
                  <span className="font-bold text-primary text-[13px]">{detailedCustomer.contact_number || "—"}</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="block text-muted/60 font-semibold mb-1 uppercase tracking-wider text-[9px]">Secondary Phone</span>
                  <span className="font-bold text-primary text-[13px]">{detailedCustomer.secondary_phone || <span className="italic text-muted/40 font-normal">Not Provided</span>}</span>
                </div>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-xs">
                <span className="block text-muted/60 font-semibold mb-1 uppercase tracking-wider text-[9px]">Personal Address</span>
                <span className="font-medium text-primary leading-relaxed text-[13px]">{detailedCustomer.address || <span className="italic text-muted/40 font-normal">Not Provided</span>}</span>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-xs">
                <span className="block text-muted/60 font-semibold mb-1 uppercase tracking-wider text-[9px]">Company Address</span>
                <span className="font-medium text-primary leading-relaxed text-[13px] whitespace-pre-line">{detailedCustomer.company_address || <span className="italic text-muted/40 font-normal">Not Provided</span>}</span>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="btn-secondary px-6 justify-center"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Admin Edit Modal ──────────────────────────────────── */}
        {isEditModalOpen && selectedCustomer && isAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="glass w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl p-6 relative animate-zoom-in space-y-6">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="absolute top-4 right-4 text-muted hover:text-primary transition-colors text-lg"
              >
                ✕
              </button>
              <div>
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                  <span>✏️</span> Edit Customer Profile
                </h3>
                <p className="text-xs text-muted mt-1">Admin override tool for customer record details.</p>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="input w-full"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      className="input w-full"
                      value={editForm.email_address}
                      onChange={(e) => setEditForm(prev => ({ ...prev, email_address: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                      Primary Phone *
                    </label>
                    <input
                      type="text"
                      required
                      className="input w-full"
                      value={editForm.contact_number}
                      onChange={(e) => setEditForm(prev => ({ ...prev, contact_number: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                      Secondary Phone
                    </label>
                    <input
                      type="text"
                      className="input w-full"
                      value={editForm.secondary_phone}
                      onChange={(e) => setEditForm(prev => ({ ...prev, secondary_phone: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                      Company Name
                    </label>
                    <input
                      type="text"
                      className="input w-full"
                      value={editForm.company}
                      onChange={(e) => setEditForm(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                      Personal Address
                    </label>
                    <input
                      type="text"
                      className="input w-full"
                      value={editForm.address}
                      onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                    Company Address
                  </label>
                  <textarea
                    className="input w-full min-h-[70px]"
                    value={editForm.company_address}
                    onChange={(e) => setEditForm(prev => ({ ...prev, company_address: e.target.value }))}
                    placeholder="Optional company address"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setIsEditModalOpen(false)}
                    className="btn-secondary flex-1 justify-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary flex-1 justify-center"
                  >
                    {saving ? "Saving Changes..." : "Save Overrides"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
