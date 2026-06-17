"use client";
import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import { Contact } from "@/types";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

export default function ContactsPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({ email: "", dear_who: "", pol: "", pod: "", mode: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchContacts = async () => {
    try {
      const { data } = await api.get("/contacts");
      setContacts(data.data);
    } catch {
      toast.error("Failed to load contacts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContacts(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) {
      toast.error("Email is required.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/contacts", form);
      // Replace if exists, else append
      setContacts(prev => {
        const exists = prev.find(c => c.id === data.data.id);
        if (exists) return prev.map(c => c.id === data.data.id ? data.data : c);
        return [data.data, ...prev];
      });
      toast.success("Contact saved successfully.");
      setForm({ email: "", dear_who: "", pol: "", pod: "", mode: "" });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save contact.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      await api.delete(`/contacts/${id}`);
      setContacts(prev => prev.filter(c => c.id !== id));
      toast.success("Contact deleted.");
    } catch {
      toast.error("Failed to delete contact.");
    }
  };

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return !q || [c.email, c.dear_who, c.pol, c.pod].some(v => v?.toLowerCase().includes(q));
  });

  return (
    <AppLayout
      title="Address Book"
      subtitle="Manage your recurring recipients for faster RFQ generation."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── Add Contact Form ──────────────────────────────── */}
        <div className="glass rounded-2xl p-6 shadow-card h-fit space-y-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted border-b border-white/[0.06] pb-2">
            Add / Update Contact
          </h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                Email Address *
              </label>
              <input
                name="email" type="email" required
                value={form.email} onChange={handleChange}
                className="input w-full"
                placeholder="receiver@example.com"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                Dear Who (Name)
              </label>
              <input
                name="dear_who"
                value={form.dear_who} onChange={handleChange}
                className="input w-full"
                placeholder="Mr. Smith"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                Default POL
              </label>
              <input
                name="pol"
                value={form.pol} onChange={handleChange}
                className="input w-full"
                placeholder="Shanghai"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                Default POD
              </label>
              <input
                name="pod"
                value={form.pod} onChange={handleChange}
                className="input w-full"
                placeholder="Rotterdam"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                Mode
              </label>
              <input
                name="mode"
                value={form.mode} onChange={handleChange}
                className="input w-full"
                placeholder="SEA, AIR, etc."
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full mt-2">
              {submitting ? "Saving..." : "Save Contact"}
            </button>
          </form>
        </div>

        {/* ── Contacts Table ────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative w-72">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm"></span>
              <input
                type="text"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9"
              />
            </div>
            <span className="text-xs text-muted">
              {loading ? "Loading…" : `${filtered.length} contacts`}
            </span>
          </div>

          <div className="glass rounded-2xl overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>EMAIL</th>
                    <th>NAME (DEAR WHO)</th>
                    <th>POL</th>
                    <th>POD</th>
                    <th>MODE</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-8 text-muted">Loading...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-muted">No contacts found.</td></tr>
                  ) : (
                    filtered.map((c) => (
                      <tr key={c.id}>
                        <td className="font-semibold text-primary">{c.email}</td>
                        <td>{c.dear_who || "—"}</td>
                        <td>{c.pol || "—"}</td>
                        <td>{c.pod || "—"}</td>
                        <td>{c.mode || "—"}</td>
                        <td>
                          {user?.role === "admin" && (
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="text-muted hover:text-rose p-1.5 rounded hover:bg-rose/10 transition-colors"
                              title="Delete Contact"
                            >
                              🗑
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
