"use client";
// app/rfq/new/page.tsx
// ─────────────────────────────────────────────────────────────
//  Create New RFQ Page
//  Mirrors the Desktop Python UI with modern web design.
// ─────────────────────────────────────────────────────────────
import { useState, useRef, ChangeEvent, DragEvent, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Modal from "@/components/ui/Modal";
import EmailAutoSuggest from "@/components/ui/EmailAutoSuggest";
import CustomerAutoSuggest from "@/components/ui/CustomerAutoSuggest";
import PortAutoSuggest from "@/components/ui/PortAutoSuggest";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Contact, Customer } from "@/types";

type FormState = {
  customer_name: string;
  customer_email: string;
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
  customer_email: "",
  pol: "", pod: "", commodity: "", term: "", dimension: "",
  container: "", mode: "", weight: "", pickup_address: "",
  delivery_address: "", note: "", refer_by: "", email: "", dear_who: ""
};

export default function NewRFQPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [file, setFile] = useState<File | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    api.get("/contacts").then(res => setContacts(res.data.data)).catch(() => {});
    api.get("/customers").then(res => setCustomers(res.data.data)).catch(() => {});
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ── File Handling ───────────────────────────────────────────
  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  // ── Form Actions ────────────────────────────────────────────
  const handleClear = () => {
    setForm(INITIAL_FORM);
    setFile(null);
  };

  const handleSend = async () => {
    if (!form.dear_who || !form.email) {
      toast.error("Please provide Receiver Email and Dear Who.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Generate RFQ and Log to Database
      const genRes = await api.post("/rfq/generate", form);
      const ref_no = genRes.data.data.ref_no;

      // 2. Upload File if selected
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        await api.post(`/files/${ref_no}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      // 3. Send Email
      await api.post(`/rfq/${ref_no}/send-email`);

      toast.success(`RFQ ${ref_no} successfully generated and emailed.`);
      
      // Clear only recipient fields as requested in python script
      setForm(prev => ({ ...prev, email: "", dear_who: "" }));
      setFile(null);

    } catch (err: any) {
      toast.error(err?.response?.data?.message || "An error occurred while sending the RFQ.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Field Configurations ────────────────────────────────────
  const fields = [
    { label: "MODE", name: "mode" },
    { label: "POL", name: "pol" },
    { label: "POD", name: "pod" },
    { label: "COMMODITY", name: "commodity" },
    { label: "TERM", name: "term" },
    { label: "DIMENSION", name: "dimension" },
    { label: "CONTAINER", name: "container" },
    { label: "TOTAL WEIGHT (KG)", name: "weight" },
    { label: "NOTE", name: "note" },
    { label: "REFER BY", name: "refer_by" },
  ];

  return (
    <AppLayout
      title="Create New RFQ"
      subtitle="Draft a new request for quotation and dispatch it to a client."
    >
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* ── Main Form Container ────────────────────────────── */}
        <div className="glass rounded-2xl p-6 shadow-card space-y-8 animate-fade-in">
          
          <div className="glass rounded-2xl p-6 shadow-card relative z-30">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted border-b border-white/[0.06] pb-2 mb-4">
              CUSTOMER GROUPING
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
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
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                  CUSTOMER EMAIL
                </label>
                <input
                  name="customer_email"
                  value={form.customer_email}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="e.g. customer@example.com"
                />
                <p className="text-[10px] text-muted mt-1">Saves customer email for quotations.</p>
              </div>
            </div>
          </div>

          {/* Section 1: Cargo & Shipping Details */}
          <div className="relative z-20">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted mb-4 border-b border-white/[0.06] pb-2">
              Shipping Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {fields.map((f) => (
                <div key={f.name}>
                  <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                    {f.label}
                  </label>
                  {f.name === "pol" || f.name === "pod" ? (
                    <PortAutoSuggest
                      value={(form as any)[f.name]}
                      onChange={(val) => setForm(prev => ({ ...prev, [f.name]: val }))}
                      placeholder={`Select or type ${f.label.toLowerCase()}...`}
                      mode={form.mode}
                    />
                  ) : f.name === "mode" ? (
                    <select
                      name="mode"
                      value={form.mode}
                      onChange={handleChange}
                      className="select w-full"
                    >
                      <option value="">— Select mode —</option>
                      <option value="Road">Road</option>
                      <option value="Air">Air</option>
                      <option value="Sea">Sea</option>
                    </select>
                  ) : (
                    <input
                      name={f.name}
                      value={(form as any)[f.name]}
                      onChange={handleChange}
                      className="input w-full"
                      placeholder={`Enter ${f.label.toLowerCase()}...`}
                    />
                  )}
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
          <div className="relative z-10">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted mb-4 border-b border-white/[0.06] pb-2">
              Recipient Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                  DEAR WHO (Name/Salutation) *
                </label>
                <input
                  name="dear_who"
                  value={form.dear_who}
                  onChange={handleChange}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                  RECEIVER EMAIL *
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

          {/* Section 3: Attachment */}
          <div className="relative z-0">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted mb-4 border-b border-white/[0.06] pb-2">
              Attachment
            </h3>
            <div
              className={`drop-zone ${dragOver ? "drag-over" : ""} ${file ? "border-blue/50 bg-blue/5" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={onFileChange}
              />
              <div className="space-y-2 pointer-events-none">
                <p className="text-3xl">{file ? "📎" : "📄"}</p>
                <p className="text-sm font-semibold text-primary">
                  {file ? file.name : "Click or drag & drop to attach a file"}
                </p>
                {file && (
                  <p className="text-xs text-muted">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>
            </div>
            {file && (
              <button 
                onClick={() => setFile(null)} 
                className="text-xs text-rose mt-2 hover:underline"
              >
                Remove attachment
              </button>
            )}
          </div>

          {/* ── Action Buttons ────────────────────────────────── */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/[0.06]">
            <button onClick={handleClear} className="btn-secondary px-6">
              Clear Form
            </button>
            <button onClick={() => setPreviewOpen(true)} className="btn-secondary px-6">
              Preview RFQ
            </button>
            <button 
              onClick={handleSend} 
              disabled={submitting || !form.email || !form.dear_who} 
              className="btn-primary px-8"
            >
              {submitting ? "Sending..." : "Send RFQ"}
            </button>
          </div>

        </div>
      </div>

      {/* ── Preview Modal ──────────────────────────────────── */}
      <Modal 
        isOpen={previewOpen} 
        onClose={() => setPreviewOpen(false)} 
        title="Email Preview"
        size="lg"
      >
        <div className="p-6 bg-surface-4 rounded-xl border border-white/[0.05] font-sans text-sm text-primary space-y-4 whitespace-pre-wrap">
          <p>Dear {form.dear_who || "[Name]"},</p>
          <p>Kindly provide a Quotation for the following Shipment.</p>
          
          <div className="pl-4 border-l-2 border-blue/50 space-y-1 my-4 py-2">
            {[
              { l: "POL", v: form.pol },
              { l: "POD", v: form.pod },
              { l: "COMMODITY", v: form.commodity },
              { l: "TERM", v: form.term },
              { l: "DIMENSION", v: form.dimension },
              { l: "CONTAINER", v: form.container },
              { l: "MODE", v: form.mode },
              { l: "TOTAL WEIGHT", v: form.weight },
              { l: "PICK-UP ADDRESS", v: form.pickup_address },
              { l: "DELIVERY ADDRESS", v: form.delivery_address },
              { l: "NOTE", v: form.note },
            ].map(f => f.v ? (
              <p key={f.l}><b>{f.l}:</b> {f.v}</p>
            ) : null)}
          </div>

          <br />
          <p>Best regards,</p>
          <div className="text-[#3b78c8]">
            <b>Muhammed Jabir</b><br />
            PRICING AND OPERATION<br />
            ARGUS SHIPPING
          </div>
          <p>📞 +974 30512233</p>
          <p>📧 <a href="mailto:jabir@argusshipping.co" className="underline">jabir@argusshipping.co</a></p>
          <p>🌐 <a href="https://www.argusshipping.co" className="underline">www.argusshipping.co</a></p>
          <br />
          <div className="bg-yellow-400 text-red-600 p-2 text-xs leading-tight font-medium" style={{ backgroundColor: 'yellow', color: 'red' }}>
            Confidentiality Notice: This email and any attachments are confidential and may contain legally privileged information intended solely for the named recipient(s). Any unauthorized review, use, disclosure, copying, or distribution is strictly prohibited. If received in error, please notify the sender immediately and permanently delete the message.
          </div>
          
          {file && (
            <div className="mt-6 pt-4 border-t border-white/[0.05] text-xs text-muted flex items-center gap-2">
              <span>📎</span> Attached: {file.name}
            </div>
          )}
        </div>
        <div className="flex justify-end mt-6">
          <button onClick={() => setPreviewOpen(false)} className="btn-primary">
            Close Preview
          </button>
        </div>
      </Modal>

    </AppLayout>
  );
}
