"use client";
// components/modals/HistoricalRFQModal.tsx
// ─────────────────────────────────────────────────────────────
//  Modal to log historical RFQs without triggering emails.
//  Behaves/looks exactly like AddShipmentModal but without
//  the Tracking Info section.
// ─────────────────────────────────────────────────────────────
import { useState, FormEvent, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import api from "@/lib/api";
import { Shipment } from "@/types";
import toast from "react-hot-toast";

interface Props {
  isOpen:    boolean;
  onClose:   () => void;
  onCreated: (s: Shipment) => void;
}

const MODES  = ["SEA", "AIR", "LAND", "RAIL"];

const INITIAL = {
  ref_no: "", refer_by: "", pol: "", pod: "",
  commodity: "", term: "FOB", mode: "SEA",
  container: "", weight: "", dimension: "",
  dear_who: "", email: "",
  pickup_address: "", delivery_address: "",
  note: "",
};

export default function HistoricalRFQModal({ isOpen, onClose, onCreated }: Props) {
  const [form,    setForm]    = useState<typeof INITIAL>(INITIAL);
  const [saving,  setSaving]  = useState(false);
  const [termSelect, setTermSelect] = useState("FOB");

  useEffect(() => {
    if (form.term && ["FOB", "EXW", "CIF", "DDP", "FCA"].includes(form.term)) {
      setTermSelect(form.term);
    } else if (!form.term) {
      setTermSelect("");
    } else {
      setTermSelect("other");
    }
  }, [form.term]);

  const set = (k: keyof typeof INITIAL) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post("/rfq/generate", form);
      toast.success(`Historical RFQ ${data.data.ref_no} saved successfully.`);
      onCreated(data.data);
      setForm(INITIAL);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save historical RFQ.");
    } finally {
      setSaving(false);
    }
  };

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="text-[10px] uppercase tracking-widest font-semibold text-muted block mb-1">
      {children}
    </label>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Historical RFQ"
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary" type="button">Cancel</button>
          <button form="add-historical-form" type="submit" className="btn-emerald" disabled={saving}>
            {saving ? "Saving…" : "✓ Save Historical RFQ"}
          </button>
        </>
      }
    >
      <form id="add-historical-form" onSubmit={handleSubmit}>
        {/* REF NO hint */}
        <div className="mb-5 p-3 rounded-xl bg-blue/5 border border-blue/10 text-xs text-blue/80">
          💡 Leave <strong>REF NO</strong> blank to auto-generate (e.g. ARG-2408261).
        </div>

        {/* ── Section: Identity ─────────────────────────── */}
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted mb-3">Identity</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div>
            <Label>REF NO (optional)</Label>
            <input className="input" value={form.ref_no || ""} onChange={set("ref_no")} placeholder="Auto-generate" />
          </div>
          <div>
            <Label>Referred By</Label>
            <input className="input" value={form.refer_by || ""} onChange={set("refer_by")} />
          </div>
          <div>
            <Label>Dear Who</Label>
            <input className="input" value={form.dear_who || ""} onChange={set("dear_who")} />
          </div>
          <div className="md:col-span-2">
            <Label>Email</Label>
            <input className="input" type="email" value={form.email || ""} onChange={set("email")} />
          </div>
        </div>

        {/* ── Section: Route ────────────────────────────── */}
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted mb-3 pt-3 border-t border-white/[0.05]">Route & Cargo</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div>
            <Label>POL *</Label>
            <input className="input" required value={form.pol || ""} onChange={set("pol")} placeholder="Port of Loading" />
          </div>
          <div>
            <Label>POD *</Label>
            <input className="input" required value={form.pod || ""} onChange={set("pod")} placeholder="Port of Discharge" />
          </div>
          <div>
            <Label>Mode</Label>
            <select className="select" value={form.mode || "SEA"} onChange={set("mode")}>
              {MODES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label>Term</Label>
            <select
              className="select"
              value={termSelect}
              onChange={(e) => {
                const val = e.target.value;
                setTermSelect(val);
                if (val !== "other") {
                  setForm(f => ({ ...f, term: val }));
                } else {
                  setForm(f => ({ ...f, term: "" }));
                }
              }}
            >
              <option value="">— Select term —</option>
              <option value="FOB">FOB</option>
              <option value="EXW">EXW</option>
              <option value="CIF">CIF</option>
              <option value="DDP">DDP</option>
              <option value="FCA">FCA</option>
              <option value="other">Other Terms</option>
            </select>
            {termSelect === "other" && (
              <input
                type="text"
                className="input mt-2 animate-fade-in"
                value={form.term || ""}
                onChange={(e) => setForm(f => ({ ...f, term: e.target.value }))}
                placeholder="Enter custom term (e.g. DDU, CIP)..."
              />
            )}
          </div>
          <div>
            <Label>Commodity</Label>
            <input className="input" value={form.commodity || ""} onChange={set("commodity")} />
          </div>
          <div>
            <Label>Container</Label>
            <input className="input" value={form.container || ""} onChange={set("container")} placeholder="e.g. 20ft GP" />
          </div>
          <div>
            <Label>Weight (kg)</Label>
            <input className="input" type="number" min="0" value={form.weight || ""} onChange={set("weight")} />
          </div>
          <div>
            <Label>Dimension</Label>
            <input className="input" value={form.dimension || ""} onChange={set("dimension")} />
          </div>
        </div>

        {/* ── Addresses & Note ──────────────────────────── */}
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted mb-3 pt-3 border-t border-white/[0.05]">Addresses & Notes</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label>Pickup Address</Label>
            <textarea className="input min-h-[60px]" value={form.pickup_address || ""} onChange={set("pickup_address")} />
          </div>
          <div className="md:col-span-2">
            <Label>Delivery Address</Label>
            <textarea className="input min-h-[60px]" value={form.delivery_address || ""} onChange={set("delivery_address")} />
          </div>
        </div>
        <div>
          <Label>Note</Label>
          <textarea className="input resize-none" rows={2} value={form.note || ""} onChange={set("note")} />
        </div>
      </form>
    </Modal>
  );
}
