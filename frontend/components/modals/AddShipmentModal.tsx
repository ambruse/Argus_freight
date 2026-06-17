"use client";
// components/modals/AddShipmentModal.tsx
// ─────────────────────────────────────────────────────────────
//  Form to create a new shipment (Direct Booking or RFQ).
//  If REF NO is blank, backend auto-generates ARG-XXXX.
// ─────────────────────────────────────────────────────────────
import { useState, FormEvent } from "react";
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
const TERMS  = ["FOB", "CIF", "EXW", "DAP", "DDP", "CFR", "FCA"];

const INITIAL: Partial<Shipment> & { note: string; profit: string } = {
  ref_no: "", refer_by: "", pol: "", pod: "",
  commodity: "", term: "FOB", mode: "SEA",
  container: "", weight: "", dimension: "",
  dear_who: "", email: "", carrier: "",
  etd: "", eta: "", cost: "", profit: "",
  pickup_address: "", delivery_address: "",
  note: "Direct Booking",
};

export default function AddShipmentModal({ isOpen, onClose, onCreated }: Props) {
  const [form,    setForm]    = useState<typeof INITIAL>(INITIAL);
  const [saving,  setSaving]  = useState(false);

  const set = (k: keyof typeof INITIAL) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, status: "Confirmed" };
      const { data } = await api.post("/shipments", payload);
      toast.success(`Shipment ${data.data.ref_no} created successfully!`);
      onCreated(data.data);
      setForm(INITIAL);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to create shipment.");
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
      title="Add Direct Shipment"
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary" type="button">Cancel</button>
          <button form="add-shipment-form" type="submit" className="btn-emerald" disabled={saving}>
            {saving ? "Saving…" : "✓ Create Shipment"}
          </button>
        </>
      }
    >
      <form id="add-shipment-form" onSubmit={handleSubmit}>
        {/* REF NO hint */}
        <div className="mb-5 p-3 rounded-xl bg-blue/5 border border-blue/10 text-xs text-blue/80">
          💡 Leave <strong>REF NO</strong> blank to auto-generate (e.g. ARG-1011).
        </div>

        {/* ── Section: Identity ─────────────────────────── */}
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted mb-3">Identity</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div>
            <Label>REF NO (optional)</Label>
            <input className="input" value={(form.ref_no as string) || ""} onChange={set("ref_no")} placeholder="Auto-generate" />
          </div>
          <div>
            <Label>Referred By</Label>
            <input className="input" value={(form.refer_by as string) || ""} onChange={set("refer_by")} />
          </div>
          <div>
            <Label>Dear Who</Label>
            <input className="input" value={(form.dear_who as string) || ""} onChange={set("dear_who")} />
          </div>
          <div className="md:col-span-2">
            <Label>Email</Label>
            <input className="input" type="email" value={(form.email as string) || ""} onChange={set("email")} />
          </div>
        </div>

        {/* ── Section: Route ────────────────────────────── */}
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted mb-3 pt-3 border-t border-white/[0.05]">Route & Cargo</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div>
            <Label>POL *</Label>
            <input className="input" required value={(form.pol as string) || ""} onChange={set("pol")} placeholder="Port of Loading" />
          </div>
          <div>
            <Label>POD *</Label>
            <input className="input" required value={(form.pod as string) || ""} onChange={set("pod")} placeholder="Port of Discharge" />
          </div>
          <div>
            <Label>Mode</Label>
            <select className="select" value={(form.mode as string) || "SEA"} onChange={set("mode")}>
              {MODES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label>Term</Label>
            <select className="select" value={(form.term as string) || "FOB"} onChange={set("term")}>
              {TERMS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <Label>Commodity</Label>
            <input className="input" value={(form.commodity as string) || ""} onChange={set("commodity")} />
          </div>
          <div>
            <Label>Container</Label>
            <input className="input" value={(form.container as string) || ""} onChange={set("container")} placeholder="e.g. 20ft GP" />
          </div>
          <div>
            <Label>Weight (kg)</Label>
            <input className="input" type="number" min="0" value={(form.weight as string) || ""} onChange={set("weight")} />
          </div>
          <div>
            <Label>Dimension</Label>
            <input className="input" value={(form.dimension as string) || ""} onChange={set("dimension")} />
          </div>
        </div>

        {/* ── Section: Tracking ─────────────────────────── */}
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted mb-3 pt-3 border-t border-white/[0.05]">Tracking Info</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div>
            <Label>Carrier</Label>
            <input className="input" value={(form.carrier as string) || ""} onChange={set("carrier")} />
          </div>
          <div>
            <Label>ETD</Label>
            <input className="input" type="date" value={(form.etd as string) || ""} onChange={set("etd")} />
          </div>
          <div>
            <Label>ETA</Label>
            <input className="input" type="date" value={(form.eta as string) || ""} onChange={set("eta")} />
          </div>
          <div>
            <Label>Cost (QAR)</Label>
            <input className="input" type="number" min="0" step="0.01" value={(form.cost as string) || ""} onChange={set("cost")} />
          </div>
          <div>
            <Label>Profit (QAR)</Label>
            <input className="input" type="number" min="0" step="0.01" value={(form.profit as string) || ""} onChange={set("profit")} />
          </div>
          <div>
            <Label>DO Number</Label>
            <input className="input" value={(form.do_number as string) || ""} onChange={set("do_number" as any)} />
          </div>
          <div>
            <Label>BL Number</Label>
            <input className="input" value={(form.bl_number as string) || ""} onChange={set("bl_number" as any)} />
          </div>
          <div>
            <Label>SO Number</Label>
            <input className="input" value={(form.so_number as string) || ""} onChange={set("so_number" as any)} />
          </div>
          <div>
            <Label>Box No.</Label>
            <input className="input" value={(form.box_no as string) || ""} onChange={set("box_no" as any)} />
          </div>
        </div>

        {/* ── Addresses & Note ──────────────────────────── */}
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted mb-3 pt-3 border-t border-white/[0.05]">Addresses & Notes</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label>Pickup Address</Label>
            <textarea className="input min-h-[60px]" value={(form.pickup_address as string) || ""} onChange={set("pickup_address")} />
          </div>
          <div className="md:col-span-2">
            <Label>Delivery Address</Label>
            <textarea className="input min-h-[60px]" value={(form.delivery_address as string) || ""} onChange={set("delivery_address")} />
          </div>
        </div>
        <div>
          <Label>Note</Label>
          <textarea className="input resize-none" rows={2} value={(form.note as string) || ""} onChange={set("note")} />
        </div>
      </form>
    </Modal>
  );
}
