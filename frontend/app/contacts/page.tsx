"use client";
import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import { Contact } from "@/types";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import PortAutoSuggest from "@/components/ui/PortAutoSuggest";

// ── Country list ─────────────────────────────────────────────
const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Angola","Argentina","Armenia","Australia","Austria",
  "Azerbaijan","Bahrain","Bangladesh","Belgium","Bolivia","Bosnia and Herzegovina","Brazil",
  "Bulgaria","Cambodia","Cameroon","Canada","Chile","China","Colombia","Congo","Croatia",
  "Cuba","Cyprus","Czech Republic","Denmark","Ecuador","Egypt","Ethiopia","Finland","France",
  "Germany","Ghana","Greece","Guatemala","Hong Kong","Hungary","India","Indonesia","Iran",
  "Iraq","Ireland","Israel","Italy","Ivory Coast","Japan","Jordan","Kazakhstan","Kenya",
  "Kuwait","Lebanon","Libya","Luxembourg","Malaysia","Mexico","Morocco","Mozambique",
  "Myanmar","Netherlands","New Zealand","Nigeria","Norway","Oman","Pakistan","Panama",
  "Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Saudi Arabia",
  "Senegal","Serbia","Singapore","South Africa","South Korea","Spain","Sri Lanka","Sudan",
  "Sweden","Switzerland","Syria","Taiwan","Tanzania","Thailand","Tunisia","Turkey",
  "Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay",
  "Uzbekistan","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",
].sort();

const MODE_OPTIONS = ["AIR", "SEA", "ROAD", "AIR AND SEA"];

export default function ContactsPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({ email: "", dear_who: "", pol: "", pod: "", mode: "", country: "" });
  const [submitting, setSubmitting] = useState(false);

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
    onConfirm: () => {}
  });

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const saveContact = async (payload: typeof form) => {
    const { data } = await api.post("/contacts", payload);
    setContacts(prev => {
      const exists = prev.find(c => c.id === data.data.id);
      if (exists) return prev.map(c => c.id === data.data.id ? data.data : c);
      return [data.data, ...prev];
    });
    return data.data;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) {
      toast.error("Email is required.");
      return;
    }
    if (!form.country) {
      toast.error("Country (POL Country) is required.");
      return;
    }
    setSubmitting(true);
    try {
      if (form.mode === "AIR AND SEA") {
        // Create two entries — same everything but mode: AIR then SEA
        await saveContact({ ...form, mode: "AIR" });
        await saveContact({ ...form, mode: "SEA" });
        toast.success("Two contacts saved — one for AIR, one for SEA.");
      } else {
        await saveContact(form);
        toast.success("Contact saved successfully.");
      }
      setForm({ email: "", dear_who: "", pol: "", pod: "", mode: "", country: "" });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save contact.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Contact",
      message: "Are you sure you want to delete this contact from your address book? This action cannot be undone.",
      confirmText: "Delete",
      isDangerous: true,
      onConfirm: async () => {
        try {
          await api.delete(`/contacts/${id}`);
          setContacts(prev => prev.filter(c => c.id !== id));
          toast.success("Contact deleted.");
        } catch {
          toast.error("Failed to delete contact.");
        }
      }
    });
  };

  const handleExportExcel = async () => {
    try {
      const { exportContactsToExcel } = await import("@/lib/exportExcel");
      await exportContactsToExcel(filtered, "address_book.xlsx");
      toast.success("Address Book exported to Excel successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export contacts to Excel.");
    }
  };

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return !q || [c.email, c.dear_who, c.pol, c.pod, c.mode, c.country].some(v => v?.toLowerCase().includes(q));
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
                Country (POL Country) <span className="text-rose">*</span>
              </label>
              <select
                name="country"
                value={form.country}
                onChange={handleChange}
                className="select w-full"
              >
                <option value="">— Select Country —</option>
                {COUNTRIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                Mode
              </label>
              <select
                name="mode"
                value={form.mode}
                onChange={handleChange}
                className="select w-full"
              >
                <option value="">— Select Mode —</option>
                {MODE_OPTIONS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {form.mode === "AIR AND SEA" && (
                <p className="text-[10px] text-amber-400 mt-1.5">
                  ⚡ Two contacts will be created — one for AIR and one for SEA.
                </p>
              )}
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                Default POL <span className="text-muted/50">(optional)</span>
              </label>
              <PortAutoSuggest
                value={form.pol}
                onChange={(val) => setForm(prev => ({ ...prev, pol: val }))}
                placeholder="Shanghai"
                mode={form.mode === "AIR AND SEA" ? "AIR" : form.mode}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                Default POD <span className="text-muted/50">(optional)</span>
              </label>
              <PortAutoSuggest
                value={form.pod}
                onChange={(val) => setForm(prev => ({ ...prev, pod: val }))}
                placeholder="Rotterdam"
                mode={form.mode === "AIR AND SEA" ? "AIR" : form.mode}
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full mt-2">
              {submitting ? "Saving..." : form.mode === "AIR AND SEA" ? "Save 2 Contacts (AIR + SEA)" : "Save Contact"}
            </button>
          </form>
        </div>

        {/* ── Contacts Table ────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
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
              <button
                type="button"
                onClick={handleExportExcel}
                className="btn-secondary flex items-center gap-1.5 py-2 px-4 text-xs h-10 border-white/10 hover:border-white/20 active:scale-95 transition-all duration-200"
                title="Export to Excel"
              >
                <span>📥</span> Export Excel
              </button>
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
                    <th>NAME</th>
                    <th>COUNTRY</th>
                    <th>POL</th>
                    <th>POD</th>
                    <th>MODE</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-8 text-muted">Loading...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-muted">No contacts found.</td></tr>
                  ) : (
                    filtered.map((c) => (
                      <tr key={c.id}>
                        <td className="font-semibold text-primary">{c.email}</td>
                        <td>{c.dear_who || "—"}</td>
                        <td>{c.country || "—"}</td>
                        <td>{c.pol || "—"}</td>
                        <td>{c.pod || "—"}</td>
                        <td>
                          {c.mode ? (
                            <span className={[
                              "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                              c.mode === "AIR" ? "bg-sky-500/10 text-sky-400 border-sky-500/30" :
                              c.mode === "SEA" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                              "bg-emerald/10 text-emerald border-emerald/30"
                            ].join(" ")}>
                              {c.mode}
                            </span>
                          ) : "—"}
                        </td>
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
    </AppLayout>
  );
}
