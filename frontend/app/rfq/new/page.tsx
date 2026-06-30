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
import ContainerInput from "@/components/ui/ContainerInput";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import { Contact, Customer } from "@/types";
import { MAJOR_PORTS } from "@/lib/ports";



type FormState = {
  customer_name: string;
  customer_email: string;
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
  email: string;
  dear_who: string;
  cc_emails: string[];
};

type CcRecipient = { id: number; name: string; email: string; multi_select: boolean };
type CompulsoryEmail = { id: number; email: string; dear_who: string; mode: string; is_active: boolean };

const INITIAL_FORM: FormState = {
  customer_name: "",
  customer_email: "",
  pol: "", pol_country: "", pod: "", commodity: "", term: "", dimension: "",
  container: "",
  mode: "", weight: "", pickup_address: "",
  delivery_address: "", note: "", refer_by: "", email: "", dear_who: "",
  cc_emails: []
};


export default function NewRFQPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [files, setFiles] = useState<File[]>([]);
  
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isAutoReceiverPreview, setIsAutoReceiverPreview] = useState(false);
  
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ccOptions, setCcOptions] = useState<CcRecipient[]>([]);
  const [operators, setOperators] = useState<{ username: string; email_address: string | null }[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<CcRecipient | null>(null);
  const [compulsoryEmails, setCompulsoryEmails] = useState<CompulsoryEmail[]>([]);

  useEffect(() => {
    api.get("/contacts").then(res => setContacts(res.data.data)).catch(() => {});
    api.get("/customers").then(res => setCustomers(res.data.data)).catch(() => {});
    api.get("/cc-recipients").then(res => setCcOptions(res.data.data)).catch(() => {});
    api.get("/auth/operators").then(res => setOperators(res.data.data)).catch(() => {});
    api.get("/compulsory-emails").then(res => setCompulsoryEmails(res.data.data)).catch(() => {});
  }, []);

  const [termSelect, setTermSelect] = useState("");

  useEffect(() => {
    if (["EXW", "FOB", "CIF", "DDP", "FCA"].includes(form.term)) {
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
        // Clear container when switching to Air
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "SELECT"
      ) {
        e.preventDefault();
        // Find all focusable form controls in this outer container
        const formElements = Array.from(
          e.currentTarget.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
            "input:not([disabled]), select:not([disabled]), textarea:not([disabled])"
          )
        );
        
        const index = formElements.indexOf(target as any);
        if (index > -1 && index < formElements.length - 1) {
          formElements[index + 1].focus();
        }
      }
    }
  };

  // ── Form Actions ────────────────────────────────────────────
  const handleClear = () => {
    setForm(INITIAL_FORM);
    setFiles([]);
    setSelectedOperator(null);
  };

  const { user } = useAuth();
  const isSales = user?.role === "sales";

  const normalOperators = operators.map((op, idx) => ({
    id: idx,
    name: op.username,
    email: op.email_address || "",
    multi_select: false
  }));

  const getSalesRecipients = () => {
    if (!form.mode || !form.pol_country) return [];
    
    const recipientsList: { email: string; dear_who: string }[] = [];

    // 1. Get from address book where POL_Country & MODE are same
    const matched = contacts.filter(c => 
      c.mode?.toLowerCase() === form.mode.toLowerCase() &&
      c.country?.toLowerCase() === form.pol_country.toLowerCase()
    );

    matched.forEach(c => {
      if (c.email && c.dear_who) {
        recipientsList.push({ email: c.email.trim(), dear_who: c.dear_who.trim() });
      }
    });

    // 2. Add compulsory recipients based on Mode
    const lowerMode = form.mode.toLowerCase();
    compulsoryEmails.forEach(ce => {
      if (ce.is_active && ce.mode.toLowerCase() === lowerMode) {
        recipientsList.push({ email: ce.email, dear_who: ce.dear_who });
      }
    });

    // 3. De-duplicate by email (case-insensitive)
    const unique: { email: string; dear_who: string }[] = [];
    const seen = new Set<string>();
    recipientsList.forEach(r => {
      const emailLower = r.email.toLowerCase();
      if (!seen.has(emailLower)) {
        seen.add(emailLower);
        unique.push(r);
      }
    });

    return unique;
  };

  const handleSend = async () => {
    const targetPol = form.pol_country ? `${form.pol_country}, ${form.pol}` : form.pol;
    let resolvedRecipients: { email: string; dear_who: string }[] = [];

    if (isSales) {
      // 1. Validations
      if (!form.customer_name?.trim()) {
        toast.error("Customer Name is compulsory.");
        return;
      }

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

      if (!selectedOperator) {
        toast.error("Please select an Operator.");
        return;
      }

      // Resolve Recipients
      resolvedRecipients = getSalesRecipients();
      if (resolvedRecipients.length === 0) {
        toast.error(`No matching agents found in the address book for mode "${form.mode}" and country "${form.pol_country}".`);
        return;
      }
    } else {
      // Admin/Operator validation
      if (!form.dear_who || !form.email) {
        toast.error("Please provide Receiver Email and Dear Who.");
        return;
      }
      resolvedRecipients = [{ email: form.email, dear_who: form.dear_who }];
    }

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(-2);
    
    const randomLetters = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      return chars[Math.floor(Math.random() * 26)] + chars[Math.floor(Math.random() * 26)];
    };
    
    const xx1 = randomLetters();
    const xx2 = randomLetters();
    const basePrefix = `${dd}${xx1}${mm}${xx2}${yy}`;

    setSubmitting(true);
    try {
      // Send to each recipient separately so it logs as multiple sends in RFQ sent
      let index = 0;
      for (const recipient of resolvedRecipients) {
        const nn = String(index + 1).padStart(2, "0");
        const customRef = `${basePrefix}-${nn}`;
        // 1. Generate RFQ and Log to Database
        const payload = {
          ...form,
          email: recipient.email,
          dear_who: recipient.dear_who,
          pol: targetPol,
          operator: isSales && selectedOperator ? selectedOperator.name : undefined,
          ref_no: customRef,
        };

        const genRes = await api.post("/rfq/generate", payload);
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

        // 3. Send Email
        const actualCcEmails = form.cc_emails;

        await api.post(`/rfq/${ref_no}/send-email`, {
          cc: actualCcEmails.length > 0 ? actualCcEmails.join(", ") : undefined,
        });
        index++;
      }

      toast.success(isSales 
        ? `RFQs successfully generated and emailed to ${resolvedRecipients.length} agents.`
        : `RFQ successfully generated and emailed.`
      );
      
      // Clear form
      if (!isSales) {
        setForm(prev => ({
          ...prev,
          email: "",
          dear_who: ""
        }));
      }
      setFiles([]);

    } catch (err: any) {
      toast.error(err?.response?.data?.message || "An error occurred while sending the RFQ.");
    } finally {
      setSubmitting(false);
    }
  };

  const getOperatorAutoRecipients = () => {
    if (!form.mode || !form.pol_country) return [];
    
    const recipientsList: { email: string; dear_who: string }[] = [];

    // 1. Get from address book where POL_Country & MODE are same
    const matched = contacts.filter(c => 
      c.mode?.toLowerCase() === form.mode.toLowerCase() &&
      c.country?.toLowerCase() === form.pol_country.toLowerCase()
    );

    matched.forEach(c => {
      if (c.email && c.dear_who) {
        recipientsList.push({ email: c.email.trim(), dear_who: c.dear_who.trim() });
      }
    });

    // 2. Add compulsory recipients based on Mode
    const lowerMode = form.mode.toLowerCase();
    compulsoryEmails.forEach(ce => {
      if (ce.is_active && ce.mode.toLowerCase() === lowerMode) {
        recipientsList.push({ email: ce.email, dear_who: ce.dear_who });
      }
    });

    // 3. De-duplicate by email (case-insensitive)
    const unique: { email: string; dear_who: string }[] = [];
    const seen = new Set<string>();
    recipientsList.forEach(r => {
      const emailLower = r.email.toLowerCase();
      if (!seen.has(emailLower)) {
        seen.add(emailLower);
        unique.push(r);
      }
    });

    return unique;
  };

  const handleAutoReceiverSend = () => {
    // 1. Validations
    if (!form.customer_name?.trim()) {
      toast.error("Customer Name is compulsory.");
      return;
    }
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

    // 2. Resolve Recipients from Address Book where POL_Country & MODE are same
    const unique = getOperatorAutoRecipients();

    if (unique.length === 0) {
      toast.error(`No matching agents found in the address book for mode "${form.mode}" and country "${form.pol_country}".`);
      return;
    }

    // Open Preview Modal in Auto-Receiver Mode
    setIsAutoReceiverPreview(true);
    setPreviewIndex(0);
    setPreviewOpen(true);
  };

  const handleConfirmAutoSend = async () => {
    const unique = getOperatorAutoRecipients();
    if (unique.length === 0) return;

    const targetPol = form.pol_country ? `${form.pol_country}, ${form.pol}` : form.pol;

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(-2);
    
    const randomLetters = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      return chars[Math.floor(Math.random() * 26)] + chars[Math.floor(Math.random() * 26)];
    };
    
    const xx1 = randomLetters();
    const xx2 = randomLetters();
    const basePrefix = `${dd}${xx1}${mm}${xx2}${yy}`;

    setSubmitting(true);
    try {
      let index = 0;
      for (const recipient of unique) {
        const nn = String(index + 1).padStart(2, "0");
        const customRef = `${basePrefix}-${nn}`;
        // 1. Generate RFQ and Log to Database
        const payload = {
          ...form,
          email: recipient.email,
          dear_who: recipient.dear_who,
          pol: targetPol,
          ref_no: customRef,
        };

        const genRes = await api.post("/rfq/generate", payload);
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

        // 3. Send Email
        const actualCcEmails = form.cc_emails;
        await api.post(`/rfq/${ref_no}/send-email`, {
          cc: actualCcEmails.length > 0 ? actualCcEmails.join(", ") : undefined,
        });
        index++;
      }

      toast.success(`RFQs successfully generated and emailed to ${unique.length} matching agents.`);
      
      // Close modal & clear auto-receiver preview state
      setPreviewOpen(false);
      setIsAutoReceiverPreview(false);

      // Clear form operator fields & files
      setForm(prev => ({
        ...prev,
        email: "",
        dear_who: ""
      }));
      setFiles([]);

    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "An error occurred while generating or sending the RFQ.");
    } finally {
      setSubmitting(false);
    }
  };

  // Get unique countries dynamically sorted alphabetically
  const polCountries = Array.from(new Set(MAJOR_PORTS.map(p => p.country))).sort();

  // ── Field Configurations ────────────────────────────────────
  // Container is rendered as a dedicated block for Sea / Road
  const isContainerMode = ["sea", "road"].includes(form.mode?.toLowerCase() ?? "");

  const fields = [
    { label: "MODE", name: "mode" },
    { label: "POL COUNTRY", name: "pol_country" },
    { label: "POL", name: "pol" },
    { label: "POD", name: "pod" },
    { label: "COMMODITY", name: "commodity" },
    { label: "TERM", name: "term" },
    { label: "DIMENSION", name: "dimension" },
    { label: "TOTAL WEIGHT (KG)", name: "weight" },
    { label: "NOTE", name: "note" },
    { label: "REFER BY", name: "refer_by" },
  ];

  // Find resolved contacts for preview/send
  const resolvedRecipientsPreview = isSales 
    ? getSalesRecipients() 
    : (isAutoReceiverPreview ? getOperatorAutoRecipients() : []);
  const activeRecipient = (isSales || isAutoReceiverPreview) && resolvedRecipientsPreview.length > 0
    ? (resolvedRecipientsPreview[previewIndex] || { email: "(No matching contact)", dear_who: "Sir/Madam" })
    : { email: form.email || "(No email specified)", dear_who: form.dear_who || "Sir/Madam" };
  const displayPol = form.pol_country ? `${form.pol_country}, ${form.pol}` : form.pol;

  const displayCcEmails = form.cc_emails;

  return (
    <AppLayout
      title="Create New RFQ"
      subtitle="Draft a new request for quotation and dispatch it to a client."
    >
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* ── Main Form Container ────────────────────────────── */}
        <div className="glass rounded-2xl p-6 shadow-card space-y-8 animate-fade-in" onKeyDown={handleKeyDown}>
          
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
                      country={f.name === "pol" ? form.pol_country : undefined}
                      isPod={f.name === "pod"}
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
                            // Clear so user can type a custom one
                            setForm(prev => ({ ...prev, term: "" }));
                          }
                        }}
                        className="select w-full"
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
                          value={form.term}
                          onChange={(e) => setForm(prev => ({ ...prev, term: e.target.value }))}
                          placeholder="Enter custom term (e.g. DDU, CIP)..."
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

          {/* Section 2: Contact & Email Details */}
          <div className="relative z-10">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted mb-4 border-b border-white/[0.06] pb-2">
              Recipient Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {!isSales && (
                <>
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
                      compulsoryEmails={compulsoryEmails}
                      currentPolCountry={form.pol_country}
                      currentMode={form.mode}
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
                </>
              )}
              <div className="md:col-span-2">
                {isSales ? (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-2">
                        SELECT OPERATOR *
                      </label>
                      {(() => {
                        const normal = normalOperators;
                        const handleOperatorClick = (recipient: CcRecipient) => {
                          setSelectedOperator(prev => prev?.id === recipient.id ? null : recipient);
                        };
                        return (
                          <div className="flex flex-wrap gap-2">
                            {normal.map(recipient => {
                              const selected = selectedOperator?.id === recipient.id;
                              return (
                                <button key={recipient.id} type="button" onClick={() => handleOperatorClick(recipient)} className={["flex flex-col items-start px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 select-none min-w-[160px]", selected ? "bg-blue/20 border-blue/60 shadow-[0_0_12px_rgba(59,120,200,0.3)]" : "bg-white/[0.04] border-white/10 hover:border-white/25"].join(" ")}>
                                  <div className="flex items-center gap-2">
                                    <span className={["w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200", selected ? "border-blue bg-blue/20" : "border-white/20"].join(" ")}>{selected && <span className="w-1.5 h-1.5 rounded-full bg-blue block" />}</span>
                                    <span className={selected ? "text-blue" : "text-primary"}>{recipient.name}</span>
                                  </div>
                                  <span className="text-[10px] text-muted pl-5 mt-0.5">{recipient.email}</span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-2">CC</label>
                      {(() => {
                        const extras = ccOptions.filter(r => r.multi_select);
                        const handleCcClick = (recipient: CcRecipient) => {
                          setForm(prev => ({ ...prev, cc_emails: prev.cc_emails.includes(recipient.email) ? prev.cc_emails.filter(e => e !== recipient.email) : [...prev.cc_emails, recipient.email] }));
                        };
                        return (
                          <div className="flex flex-wrap gap-2">
                            {extras.map(recipient => {
                              const selected = form.cc_emails.includes(recipient.email);
                              return (
                                <button key={recipient.id} type="button" onClick={() => handleCcClick(recipient)} className={["flex flex-col items-start px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 select-none min-w-[160px]", selected ? "bg-emerald/15 border-emerald/50 shadow-[0_0_12px_rgba(52,211,153,0.2)]" : "bg-white/[0.04] border-white/10 hover:border-white/25"].join(" ")}>
                                  <div className="flex items-center gap-2">
                                    <span className={["w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200", selected ? "border-emerald bg-emerald/20" : "border-white/20"].join(" ")}>{selected && <svg className="w-2 h-2 text-emerald" fill="none" viewBox="0 0 10 10"><path d="M1.5 5.5L4 8l4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}</span>
                                    <span className={selected ? "text-emerald" : "text-primary"}>{recipient.name}</span>
                                  </div>
                                  <span className="text-[10px] text-muted pl-5 mt-0.5">{recipient.email}</span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <>
                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-muted mb-2">
                      CC (Carbon Copy)
                      <span className="ml-2 normal-case font-normal text-muted/60">
                        — select one recipient&nbsp;
                        <span className="text-emerald/80">+ optional extras</span>
                      </span>
                    </label>

                    {(() => {
                      const seenEmails = new Set();
                      const normal = [
                        ...normalOperators,
                        ...ccOptions.filter(r => !r.multi_select)
                      ].filter(item => {
                        const emailLower = item.email?.toLowerCase().trim();
                        if (!emailLower) return false;
                        if (seenEmails.has(emailLower)) return false;
                        seenEmails.add(emailLower);
                        return true;
                      });
                      const extras = ccOptions.filter(r => r.multi_select);

                      const handleChipClick = (recipient: CcRecipient) => {
                        if (recipient.multi_select) {
                          setForm(prev => ({
                            ...prev,
                            cc_emails: prev.cc_emails.includes(recipient.email)
                              ? prev.cc_emails.filter(e => e !== recipient.email)
                              : [...prev.cc_emails, recipient.email],
                          }));
                        } else {
                          const normalEmails = normal.map(r => r.email);
                          setForm(prev => {
                            const withoutNormals = prev.cc_emails.filter(e => !normalEmails.includes(e));
                            if (prev.cc_emails.includes(recipient.email)) {
                              return { ...prev, cc_emails: withoutNormals };
                            }
                            return { ...prev, cc_emails: [...withoutNormals, recipient.email] };
                          });
                        }
                      };

                      return (
                        <div className="space-y-3">
                          {normal.length > 0 && (
                            <div>
                              <p className="text-[10px] text-muted/50 uppercase tracking-widest mb-1.5">Choose one</p>
                              <div className="flex flex-wrap gap-2">
                                {normal.map(recipient => {
                                  const selected = form.cc_emails.includes(recipient.email);
                                  return (
                                    <button
                                      key={recipient.email}
                                      type="button"
                                      onClick={() => handleChipClick(recipient)}
                                      className={[
                                        "flex flex-col items-start px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 select-none min-w-[160px]",
                                        selected
                                          ? "bg-blue/20 border-blue/60 shadow-[0_0_12px_rgba(59,120,200,0.3)]"
                                          : "bg-white/[0.04] border-white/10 hover:border-white/25",
                                      ].join(" ")}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className={[
                                          "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200",
                                          selected ? "border-blue bg-blue/20" : "border-white/20",
                                        ].join(" ")}>
                                          {selected && <span className="w-1.5 h-1.5 rounded-full bg-blue block" />}
                                        </span>
                                        <span className={selected ? "text-blue" : "text-primary"}>
                                          {recipient.name}
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-muted pl-5 mt-0.5">{recipient.email}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {extras.length > 0 && (
                            <div>
                              <p className="text-[10px] text-muted/50 uppercase tracking-widest mb-1.5">Always includable</p>
                              <div className="flex flex-wrap gap-2">
                                {extras.map(recipient => {
                                  const selected = form.cc_emails.includes(recipient.email);
                                  return (
                                    <button
                                      key={recipient.id}
                                      type="button"
                                      onClick={() => handleChipClick(recipient)}
                                      className={[
                                        "flex flex-col items-start px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 select-none min-w-[160px]",
                                        selected
                                          ? "bg-emerald/15 border-emerald/50 shadow-[0_0_12px_rgba(52,211,153,0.2)]"
                                          : "bg-white/[0.04] border-white/10 hover:border-white/25",
                                      ].join(" ")}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className={[
                                          "w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200",
                                          selected ? "border-emerald bg-emerald/20" : "border-white/20",
                                        ].join(" ")}>
                                          {selected && (
                                            <svg className="w-2 h-2 text-emerald" fill="none" viewBox="0 0 10 10">
                                              <path d="M1.5 5.5L4 8l4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                          )}
                                        </span>
                                        <span className={selected ? "text-emerald" : "text-primary"}>
                                          {recipient.name}
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-muted pl-5 mt-0.5">{recipient.email}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {ccOptions.length === 0 && (
                      <p className="text-xs text-muted/50 italic">No CC recipients configured yet.</p>
                    )}
                  </>
                )}

                {form.cc_emails.length > 0 && (
                  <p className="text-[10px] text-muted/60 mt-2">
                    CC: {form.cc_emails.join(", ")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Attachments */}
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
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/[0.06]">
            <button onClick={handleClear} className="btn-secondary px-6">
              Clear Form
            </button>
            <button 
              onClick={() => {
                setIsAutoReceiverPreview(false);
                setPreviewIndex(0);
                setPreviewOpen(true);
              }} 
              className="btn-secondary px-6"
            >
              Preview RFQ
            </button>
            {!isSales && (
              <button 
                type="button"
                onClick={handleAutoReceiverSend} 
                disabled={submitting} 
                className="btn-secondary px-6 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all duration-200"
              >
                {submitting ? "Sending..." : "Auto Receiver"}
              </button>
            )}
            <button 
              onClick={handleSend} 
              disabled={submitting || (!isSales && (!form.email || !form.dear_who))} 
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
        onClose={() => {
          setPreviewOpen(false);
          setIsAutoReceiverPreview(false);
        }} 
        title="Email Preview"
        size="lg"
      >
        {(isSales || isAutoReceiverPreview) && resolvedRecipientsPreview.length > 1 && (
          <div className="flex items-center justify-between mb-4 bg-white/[0.04] p-3 rounded-xl border border-white/[0.06]">
            <button
              onClick={() => setPreviewIndex(prev => Math.max(0, prev - 1))}
              disabled={previewIndex === 0}
              className="btn-secondary text-xs px-3 py-1 disabled:opacity-40"
            >
              ← Previous Email
            </button>
            <span className="text-xs font-semibold text-primary">
              Email {previewIndex + 1} of {resolvedRecipientsPreview.length}
            </span>
            <button
              onClick={() => setPreviewIndex(prev => Math.min(resolvedRecipientsPreview.length - 1, prev + 1))}
              disabled={previewIndex === resolvedRecipientsPreview.length - 1}
              className="btn-secondary text-xs px-3 py-1 disabled:opacity-40"
            >
              Next Email →
            </button>
          </div>
        )}

        <div className="p-6 bg-surface-4 rounded-xl border border-white/[0.05] font-sans text-sm text-primary space-y-4 whitespace-pre-wrap">
          <p><b>To:</b> {activeRecipient.email}</p>
          {displayCcEmails.length > 0 && <p><b>CC:</b> {displayCcEmails.join(", ")}</p>}
          <hr className="border-white/[0.06] my-2" />
          <p>Dear {activeRecipient.dear_who},</p>
          <p>Kindly provide a Quotation for the following Shipment.</p>
          
          <div className="pl-4 border-l-2 border-blue/50 space-y-1 my-4 py-2">
            {[
              { l: "POL", v: displayPol },
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
          
          {files.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/[0.05] text-xs text-muted space-y-1">
              <p className="font-semibold text-primary">Attachments ({files.length}):</p>
              {files.map((f, index) => (
                <div key={`${f.name}-${index}`} className="flex items-center gap-1.5 pl-2">
                  <span>📎</span>
                  <span>{f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button 
            onClick={() => {
              setPreviewOpen(false);
              setIsAutoReceiverPreview(false);
            }} 
            className="btn-secondary px-6"
          >
            Close Preview
          </button>
          {isAutoReceiverPreview && (
            <button 
              onClick={handleConfirmAutoSend} 
              disabled={submitting} 
              className="btn-primary px-8"
            >
              {submitting ? "Sending..." : "Send Auto RFQs"}
            </button>
          )}
        </div>
      </Modal>

    </AppLayout>
  );
}
