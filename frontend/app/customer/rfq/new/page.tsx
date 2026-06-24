"use client";
// app/customer/rfq/new/page.tsx
// ─────────────────────────────────────────────────────────────
//  Customer Request Quote Page
// ─────────────────────────────────────────────────────────────
import { useState, useRef, ChangeEvent, DragEvent, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PortAutoSuggest from "@/components/ui/PortAutoSuggest";
import ContainerInput from "@/components/ui/ContainerInput";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import { MAJOR_PORTS } from "@/lib/ports";

type FormState = {
  pol: string;
  pol_country: string;
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
};

const INITIAL_FORM: FormState = {
  pol: "", pol_country: "", pod: "", commodity: "", term: "", dimension: "",
  container: "", mode: "", weight: "", pickup_address: "",
  delivery_address: "", note: "", refer_by: ""
};

export default function CustomerNewRFQPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [files, setFiles] = useState<File[]>([]);
  
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [termSelect, setTermSelect] = useState("");

  useEffect(() => {
    if (["EXW", "FOB", "DDU"].includes(form.term)) {
      setTermSelect(form.term);
    } else if (form.term === "") {
      setTermSelect("");
    } else {
      setTermSelect("other");
    }
  }, [form.term]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => {
      const nextForm = { ...prev, [name]: value };
      if (name === "mode" && value.toLowerCase() === "air") {
        nextForm.container = "";
      }
      return nextForm;
    });
  };

  // ── File Handling ───────────────────────────────────────────
  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ── Form Actions ────────────────────────────────────────────
  const handleClear = () => {
    setForm(INITIAL_FORM);
    setFiles([]);
  };

  const { user } = useAuth();

  const handleSend = async () => {
    // 1. Validations
    if (!form.mode) {
      toast.error("MODE is compulsory.");
      return;
    }
    if (!form.pol_country) {
      toast.error("POL Country is compulsory.");
      return;
    }
    if (!form.pol?.trim()) {
      toast.error("POL is compulsory.");
      return;
    }
    if (!form.pod?.trim()) {
      toast.error("POD is compulsory.");
      return;
    }
    if (!form.commodity?.trim()) {
      toast.error("Commodity is compulsory.");
      return;
    }
    if (!form.term?.trim()) {
      toast.error("TERM is compulsory.");
      return;
    }

    // Dimension, Container, Weight logic
    const isContainerEmpty = !form.container?.trim();
    const isDimensionEmpty = !form.dimension?.trim();
    const isWeightEmpty = !form.weight?.toString().trim();

    if (isContainerEmpty) {
      if (isDimensionEmpty) {
        toast.error("Dimension is compulsory when Container is empty.");
        return;
      }
      if (isWeightEmpty) {
        toast.error("Total Weight is compulsory when Container is empty.");
        return;
      }
    }
    if (isDimensionEmpty) {
      if (isContainerEmpty) {
        toast.error("Container is compulsory when Dimension is empty.");
        return;
      }
    }

    if (form.term === "EXW" && !form.pickup_address?.trim()) {
      toast.error("Pick-up Address is compulsory for EXW term.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Generate RFQ in DB
      const payload = {
        ...form
      };

      const genRes = await api.post("/rfq/customer-generate", payload);
      const ref_no = genRes.data.data.ref_no;

      // 2. Upload Files if selected
      if (files.length > 0) {
        for (const f of files) {
          const formData = new FormData();
          formData.append("file", f);
          await api.post(`/files/${ref_no}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      }

      // 3. Dispatch Email through assigned Operator SMTP
      await api.post(`/rfq/customer-send-email/${ref_no}`);

      toast.success("Quote Request submitted successfully! The assigned Operator will follow up with you.");
      handleClear();

    } catch (err: any) {
      toast.error(err?.response?.data?.message || "An error occurred while submitting the Quote Request.");
    } finally {
      setSubmitting(false);
    }
  };

  const polCountries = Array.from(new Set(MAJOR_PORTS.map(p => p.country))).sort();

  // Container structured UI only for Sea / Road
  const isContainerMode = ["sea", "road"].includes(form.mode?.toLowerCase() ?? "");

  const fields = [
    { label: "MODE", name: "mode" },
    { label: "POL COUNTRY", name: "pol_country" },
    { label: "POL", name: "pol" },
    { label: "POD", name: "pod" },
    { label: "COMMODITY", name: "commodity" },
    { label: "TERM", name: "term" },
    { label: "DIMENSION", name: "dimension" },
    // Container shown as structured block below for Sea/Road; plain input otherwise
    ...(isContainerMode ? [] : [{ label: "CONTAINER", name: "container" }]),
    { label: "TOTAL WEIGHT (KG)", name: "weight" },
    { label: "NOTE", name: "note" },
    { label: "REFER BY", name: "refer_by" },
  ];

  return (
    <AppLayout
      title="Request Quote"
      subtitle="Draft a new request for quotation and submit it to the operations team."
    >
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* ── Main Form Container ────────────────────────────── */}
        <div className="glass rounded-2xl p-6 shadow-card space-y-8 animate-fade-in">
          
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
                      country={f.name === "pol" ? form.pol_country : undefined}
                    />
                  ) : f.name === "pol_country" ? (
                    <select
                      name="pol_country"
                      value={form.pol_country}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm(prev => ({ 
                          ...prev, 
                          pol_country: val,
                          pol: "" // clear POL when country changes to avoid mismatch
                        }));
                      }}
                      className="select w-full"
                    >
                      <option value="">— Select POL Country —</option>
                      {polCountries.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
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
                  ) : f.name === "term" ? (
                    <div className="space-y-2">
                      <select
                        value={termSelect}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTermSelect(val);
                          if (val !== "other") {
                            setForm(prev => ({ ...prev, term: val }));
                          } else {
                            setForm(prev => ({ ...prev, term: "" }));
                          }
                        }}
                        className="select w-full"
                      >
                        <option value="">— Select term —</option>
                        <option value="EXW">EXW</option>
                        <option value="FOB">FOB</option>
                        <option value="DDU">DDU</option>
                        <option value="other">Other</option>
                      </select>
                      {termSelect === "other" && (
                        <input
                          type="text"
                          value={form.term}
                          onChange={(e) => setForm(prev => ({ ...prev, term: e.target.value }))}
                          placeholder="Enter custom term (e.g. CIF, DDP)..."
                          className="input w-full mt-2"
                        />
                      )}
                    </div>
                  ) : (
                    <input
                      name={f.name}
                      value={(form as any)[f.name]}
                      onChange={handleChange}
                      className="input w-full"
                      placeholder={`Enter ${f.label.toLowerCase()}...`}
                      disabled={f.name === "container" && form.mode?.toLowerCase() === "air"}
                    />
                  )}
                </div>
              ))}

              {/* ── Structured Container Input (Sea / Road only) ── */}
              {isContainerMode && (
                <div className="md:col-span-2">
                  <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-1.5">
                    CONTAINER
                  </label>
                  <ContainerInput
                    onChange={(val) => setForm(prev => ({ ...prev, container: val }))}
                  />
                </div>
              )}

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

          {/* Section 2: Attachments */}
          <div className="relative z-0">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted mb-4 border-b border-white/[0.06] pb-2">
              Attachments ({files.length})
            </h3>
            <div
              className={`drop-zone ${dragOver ? "drag-over" : ""} ${files.length > 0 ? "border-blue/50 bg-blue/5" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={onFileChange}
              />
              <div className="space-y-2 pointer-events-none">
                <p className="text-3xl">📄</p>
                <p className="text-sm font-semibold text-primary">
                  Click or drag & drop to attach files 
                </p>
                <p className="text-xs text-muted/60">PDF, Excel, Word, or images</p>
              </div>
            </div>

            {/* List of files */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted mb-2">Attached Files:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {files.map((f, index) => (
                    <div 
                      key={`${f.name}-${index}`}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm shrink-0">📎</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-primary truncate" title={f.name}>
                            {f.name}
                          </p>
                          <p className="text-[10px] text-muted">
                            {(f.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(index);
                        }}
                        className="text-muted hover:text-rose p-1 transition-colors text-sm"
                        title="Remove file"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Action Buttons ────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-6 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={handleClear}
              className="btn-secondary"
              disabled={submitting}
            >
              Clear Form
            </button>
            <button
              type="button"
              onClick={handleSend}
              className="btn-primary px-8"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Quote Request"}
            </button>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
