"use client";
// components/modals/HistoricalRFQModal.tsx
// ─────────────────────────────────────────────────────────────
//  Modal to log historical RFQs without triggering emails.
//  Uses the same ID generation logic (/api/rfq/generate).
// ─────────────────────────────────────────────────────────────
import { useState, ChangeEvent, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import EmailAutoSuggest from "@/components/ui/EmailAutoSuggest";
import CustomerAutoSuggest from "@/components/ui/CustomerAutoSuggest";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Shipment, Contact, Customer } from "@/types";

type FormState = {
  customer_name: string;
  pol: string;
  pod: string;
  commodity: string;
  term: string;
  dimension: string;
  container: string;
  mode: string;
  weight: string;
  pickup_address: string;
  delivery_address: string;
  note: string;
  refer_by: string;
  email: string;
  dear_who: string;
};

const INITIAL_FORM: FormState = {
  customer_name: "",
  pol: "", pod: "", commodity: "", term: "", dimension: "",
  container: "", mode: "", weight: "", pickup_address: "",
  delivery_address: "", note: "", refer_by: "", email: "", dear_who: ""
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (s: Shipment) => void;
}

export default function HistoricalRFQModal({ isOpen, onClose, onCreated }: Props) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    if (isOpen) {
      api.get("/contacts").then(res => setContacts(res.data.data)).catch(() => {});
      api.get("/customers").then(res => setCustomers(res.data.data)).catch(() => {});
    }
  }, [isOpen]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleClear = () => setForm(INITIAL_FORM);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      // 1. Generate RFQ and Log to Database ONLY (no email call)
      const genRes = await api.post("/rfq/generate", form);
      const newShipment = genRes.data.data;

      toast.success(`Historical RFQ ${newShipment.ref_no} saved successfully.`);
      
      onCreated(newShipment);
      handleClear();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "An error occurred while saving.");
    } finally {
      setSubmitting(false);
    }
  };

  const fields = [
    { label: "POL", name: "pol" },
    { label: "POD", name: "pod" },
    { label: "COMMODITY", name: "commodity" },
    { label: "TERM", name: "term" },
    { label: "DIMENSION", name: "dimension" },
    { label: "CONTAINER", name: "container" },
    { label: "MODE", name: "mode" },
    { label: "TOTAL WEIGHT (KG)", name: "weight" },
    { label: "NOTE", name: "note" },
    { label: "REFER BY", name: "refer_by" },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Historical RFQ" size="xl">
      <div className="space-y-6">
        <p className="text-xs text-muted">
          Use this form to log an RFQ that was already sent via email in the past. 
          This will generate a reference number and save it to the database, but <b>will not send any emails</b>.
        </p>

        {/* ── Main Form Container ────────────────────────────── */}
        <div className="space-y-8">
          
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted border-b border-white/[0.06] pb-2 mb-4">
              CUSTOMER GROUPING
            </h3>
            <div className="mb-4">
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                CUSTOMER NAME (Select existing or type new)
              </label>
              <CustomerAutoSuggest
                customers={customers}
                value={form.customer_name}
                onChange={(val) => setForm(prev => ({ ...prev, customer_name: val }))}
              />
              <p className="text-[10px] text-muted mt-1">Assigns a unique 5-digit ID to group this RFQ.</p>
            </div>
          </div>

          {/* Section 1: Cargo & Shipping Details */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted mb-4 border-b border-white/[0.06] pb-2">
              Shipping Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {fields.map((f) => (
                <div key={f.name}>
                  <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                    {f.label}
                  </label>
                  <input
                    name={f.name}
                    value={(form as any)[f.name]}
                    onChange={handleChange}
                    className="input w-full"
                    placeholder={`Enter ${f.label.toLowerCase()}...`}
                  />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                  PICK-UP ADDRESS
                </label>
                <textarea
                  name="pickup_address"
                  value={form.pickup_address}
                  onChange={handleChange}
                  className="input w-full h-20 resize-none py-2"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                  DELIVERY ADDRESS
                </label>
                <textarea
                  name="delivery_address"
                  value={form.delivery_address}
                  onChange={handleChange}
                  className="input w-full h-20 resize-none py-2"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Email Details */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted mb-4 border-b border-white/[0.06] pb-2">
              Recipient Contact (For Logging Only)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                  DEAR WHO (Name/Salutation)
                </label>
                <input
                  name="dear_who"
                  value={form.dear_who}
                  onChange={handleChange}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                  RECEIVER EMAIL
                </label>
                <EmailAutoSuggest
                  contacts={contacts}
                  currentPol={form.pol}
                  currentPod={form.pod}
                  currentMode={form.mode}
                  currentDearWho={form.dear_who}
                  value={form.email}
                  onChange={(email, dearWho) => {
                    setForm(prev => ({
                      ...prev,
                      email,
                      dear_who: dearWho || prev.dear_who
                    }));
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Action Buttons ────────────────────────────────── */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/[0.06]">
          <button onClick={onClose} className="btn-secondary px-6">
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={submitting} 
            className="btn-primary px-8"
          >
            {submitting ? "Saving..." : "Save Historical RFQ"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
