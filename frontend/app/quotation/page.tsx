"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import CustomerAutoSuggest from "@/components/ui/CustomerAutoSuggest";
import PortAutoSuggest from "@/components/ui/PortAutoSuggest";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import { Customer } from "@/types";

interface QuotationRecord {
  id: number;
  q_no: string;
  pol: string | null;
  pod: string | null;
  commodity: string | null;
  pod_pcode: string | null;
  pol_pcode: string | null;
  freight: string;
  zone: string | null;
  trans: string;
  total_rate: string;
  sales_p: string | null;
  operator: string | null;
  customer_name: string | null;
  transit_time: string | null;
  validity: string | null;
  created_date: string;
  created_at: string;
  creator_username: string | null;
  mode: string | null;
  carrier_name: string | null;
  currency: string | null;
  approval_status: string;
  shipment_ref?: string | null;
}

interface FormState {
  customer_name: string;
  sales_p: string;
  operator: string;
  pol: string;
  pol_pcode: string;
  pod: string;
  pod_pcode: string;
  commodity: string;
  freight: string;
  zone: string;
  trans: string;
  transit_time: string;
  validity: string;
  mode: string;
  carrier_name: string;
  currency: string;
}

const INITIAL_FORM: FormState = {
  customer_name: "",
  sales_p: "",
  operator: "",
  pol: "",
  pol_pcode: "",
  pod: "",
  pod_pcode: "",
  commodity: "",
  freight: "",
  zone: "Zone-1",
  trans: "",
  transit_time: "",
  validity: "",
  mode: "OCEAN",
  carrier_name: "",
  currency: "QAR",
};

const AIRLINES = [
  { country: "Turkey", name: "Turksih Aline", code: "TK" },
  {country: "Qatar", name: "Qatar Airways", code: "QR"},
  { country: "Germany", name: "Lufthansa", code: "LH" },
  { country: "UK", name: "British Airways", code: "BA" },
  { country: "France", name: "Air France", code: "AF" },
  { country: "Spain", name: "Iberia", code: "IB" },
  { country: "Italy", name: "ITA Airways", code: "AZ" },
  { country: "UAE", name: "Emirates", code: "EK" },
  { country: "UAE", name: "Etihad Airways", code: "EY" },
  { country: "UAE", name: "Flydubai", code: "FZ" },
  { country: "UAE", name: "Air Arabia", code: "G9" },
  { country: "Saudi Arabia", name: "Saudia", code: "SV" },
  { country: "Saudi Arabia", name: "Flynas", code: "XY" },
  { country: "Bahrain", name: "Gulf Air", code: "GF" },
  { country: "India", name: "Air India", code: "AI" },
  { country: "India", name: "IndiGo", code: "6E" },
  { country: "India", name: "Air India Express", code: "IX" },
  { country: "India", name: "Akasa Air", code: "QP" },
  { country: "Philippines", name: "Philippine Airlines", code: "PR" },
  { country: "Indonesia", name: "Garuda Indonesia", code: "GA" },
  { country: "US", name: "American Airlines", code: "AA" }
  
];

export default function QuotationPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Set default validity date to 3 days from now (YYYY-MM-DD)
  useEffect(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    const yyyy = defaultDate.getFullYear();
    const mm = String(defaultDate.getMonth() + 1).padStart(2, "0");
    const dd = String(defaultDate.getDate()).padStart(2, "0");
    setForm((prev) => ({ ...prev, validity: `${yyyy}-${mm}-${dd}` }));
  }, []);

  // Fetch customers and historical quotations
  useEffect(() => {
    if (!user) return;
    
    const isAuthorized = ["admin", "operator", "sales"].includes(user.role);
    if (!isAuthorized) {
      setFetching(false);
      return;
    }

    Promise.all([
      api.get("/customers").then((res) => setCustomers(res.data.data)).catch(() => {}),
      api.get("/quotation").then((res) => setQuotations(res.data.data)).catch(() => {}),
    ]).finally(() => {
      setFetching(false);
    });
  }, [user]);

  if (!user || fetching) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold"></div>
        </div>
      </AppLayout>
    );
  }

  // Guard access
  const isAuthorized = ["admin", "operator", "sales"].includes(user.role);
  if (!isAuthorized) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h1>
          <p className="text-muted text-sm">
            You do not have permission to view the Quotation Generator.
          </p>
        </div>
      </AppLayout>
    );
  }

  // Handle POL Port selection
  const handlePolChange = (val: string) => {
    setForm((prev) => {
      const next = { ...prev, pol: val };
      const match = val.match(/\(([^)]+)\)\s*$/);
      if (match && match[1]) {
        next.pol_pcode = match[1].trim();
      }
      return next;
    });
  };

  // Handle POD Port selection
  const handlePodChange = (val: string) => {
    setForm((prev) => {
      const next = { ...prev, pod: val };
      const match = val.match(/\(([^)]+)\)\s*$/);
      if (match && match[1]) {
        next.pod_pcode = match[1].trim();
      }
      return next;
    });
  };

  // Currency conversions
  const freightNum = parseFloat(form.freight) || 0;
  const transNum = parseFloat(form.trans) || 0;
  const isUsdSelected = form.currency === "USD";

  const freightQar = isUsdSelected ? freightNum * 3.65 : freightNum;
  const freightUsd = isUsdSelected ? freightNum : freightNum / 3.65;
  const autoCalculatedTotal = 400 + transNum + freightQar;

  // Format currency preview helper
  const previewFormat = (num: number) => {
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.customer_name) return toast.error("Customer name is required.");
    if (!form.pol) return toast.error("POL is required.");
    if (!form.pod) return toast.error("POD is required.");
    if (!form.freight) return toast.error("Freight rate is required.");
    if (!form.trans) return toast.error("Trans rate is required.");
    if (form.mode === "AIR" && !form.carrier_name) return toast.error("Airline selection is required.");
    if (form.mode !== "AIR" && !form.carrier_name) return toast.error("Carrier name is required.");

    setLoading(true);
    try {
      const { data } = await api.post("/quotation/generate", form);
      if (data.success) {
        toast.success(data.message || "Quotation generated successfully!");
        
        // Refresh quotations list
        const listRes = await api.get("/quotation");
        setQuotations(listRes.data.data);

        // Reset form except defaults
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 3);
        const yyyy = defaultDate.getFullYear();
        const mm = String(defaultDate.getMonth() + 1).padStart(2, "0");
        const dd = String(defaultDate.getDate()).padStart(2, "0");

        setForm({
          ...INITIAL_FORM,
          validity: `${yyyy}-${mm}-${dd}`,
        });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "An error occurred during quotation generation.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (id: number) => {
    const token = localStorage.getItem("freight_token");
    if (!token) return toast.error("Authentication expired. Please log in again.");
    
    // Trigger download in new window/tab
    window.open(`/api/quotation/download/${id}?token=${encodeURIComponent(token)}`, "_blank");
  };

  const handleModeChange = (selectedMode: string) => {
    setForm((prev) => ({
      ...prev,
      mode: selectedMode,
      carrier_name: "", // Clear previous selection
    }));
  };

  return (
    <AppLayout>
      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary font-outfit">
              Quotation Generator
            </h1>
            <p className="text-xs text-muted mt-1">
              Generate premium PDF Quotations from standard word templates automatically.
            </p>
          </div>
          <div className="text-xs px-3 py-1 bg-white/5 rounded-full border border-white/10 font-mono text-[#F5B037]">
            Authorized Role: <span className="capitalize font-semibold">{user.role}</span>
          </div>
        </div>

        {/* Generator Form and Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Form Column */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleGenerate} className="space-y-6">
              
              {/* Card 1: Client & Operator */}
              <div className="glass rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F5B037] border-b border-white/5 pb-2">
                  Client & Personnel Info
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">Customer Name</label>
                    <CustomerAutoSuggest
                      customers={customers}
                      value={form.customer_name}
                      onChange={(val) => setForm((prev) => ({ ...prev, customer_name: val }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">Sales Person</label>
                    <input
                      type="text"
                      name="sales_p"
                      value={form.sales_p}
                      onChange={(e) => setForm((prev) => ({ ...prev, sales_p: e.target.value }))}
                      placeholder="e.g. John Doe"
                      className="input w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">Operator</label>
                    <input
                      type="text"
                      name="operator"
                      value={form.operator}
                      onChange={(e) => setForm((prev) => ({ ...prev, operator: e.target.value }))}
                      placeholder="e.g. Jabir"
                      className="input w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Port & Cargo Details */}
              <div className="glass rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F5B037] border-b border-white/5 pb-2">
                  Route & Cargo Info
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">Port of Loading (POL)</label>
                    <PortAutoSuggest
                      value={form.pol}
                      onChange={handlePolChange}
                      placeholder="Search loading port..."
                      mode={form.mode}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">POL Port Code</label>
                    <input
                      type="text"
                      name="pol_pcode"
                      value={form.pol_pcode}
                      onChange={(e) => setForm((prev) => ({ ...prev, pol_pcode: e.target.value }))}
                      placeholder="e.g. CNSHA"
                      className="input w-full font-mono uppercase"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">Port of Discharge (POD)</label>
                    <PortAutoSuggest
                      value={form.pod}
                      onChange={handlePodChange}
                      placeholder="Search discharge port..."
                      mode={form.mode}
                      isPod={true}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">POD Port Code</label>
                    <input
                      type="text"
                      name="pod_pcode"
                      value={form.pod_pcode}
                      onChange={(e) => setForm((prev) => ({ ...prev, pod_pcode: e.target.value }))}
                      placeholder="e.g. QADOH"
                      className="input w-full font-mono uppercase"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">Mode</label>
                    <select
                      value={form.mode}
                      onChange={(e) => handleModeChange(e.target.value)}
                      className="select w-full"
                    >
                      <option value="OCEAN">OCEAN</option>
                      <option value="AIR">AIR</option>
                      <option value="LAND">LAND</option>
                    </select>
                  </div>
                  
                  {form.mode === "AIR" ? (
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted uppercase">Airline Selection</label>
                      <select
                        value={form.carrier_name}
                        onChange={(e) => setForm((prev) => ({ ...prev, carrier_name: e.target.value }))}
                        className="select w-full"
                      >
                        <option value="">-- Select Airline --</option>
                        {AIRLINES.map((airline, idx) => (
                          <option key={idx} value={`${airline.name} (${airline.code})`}>
                            {airline.country}: {airline.name} ({airline.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted uppercase">
                        {form.mode === "LAND" ? "Truck Name / Details" : "Carrier Name"}
                      </label>
                      <input
                        type="text"
                        name="carrier_name"
                        value={form.carrier_name}
                        onChange={(e) => setForm((prev) => ({ ...prev, carrier_name: e.target.value }))}
                        placeholder={form.mode === "LAND" ? "e.g. Volvo Truck" : "e.g. Maersk"}
                        className="input w-full"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">Commodity Description</label>
                    <input
                      type="text"
                      name="commodity"
                      value={form.commodity}
                      onChange={(e) => setForm((prev) => ({ ...prev, commodity: e.target.value }))}
                      placeholder="e.g. General Cargo"
                      className="input w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">Transit Time (TT)</label>
                    <input
                      type="text"
                      name="transit_time"
                      value={form.transit_time}
                      onChange={(e) => setForm((prev) => ({ ...prev, transit_time: e.target.value }))}
                      placeholder="e.g. 15 Days"
                      className="input w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Rates & Validity */}
              <div className="glass rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F5B037] border-b border-white/5 pb-2">
                  Financials & Validity
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">Currency</label>
                    <select
                      value={form.currency}
                      onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
                      className="select w-full"
                    >
                      <option value="QAR">QAR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">Freight Rate</label>
                    <input
                      type="number"
                      step="any"
                      name="freight"
                      value={form.freight}
                      onChange={(e) => setForm((prev) => ({ ...prev, freight: e.target.value }))}
                      placeholder="0.00"
                      className="input w-full font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">Zone</label>
                    <input
                      type="text"
                      name="zone"
                      value={form.zone}
                      onChange={(e) => setForm((prev) => ({ ...prev, zone: e.target.value }))}
                      className="input w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">Trans Rate (QAR)</label>
                    <input
                      type="number"
                      step="any"
                      name="trans"
                      value={form.trans}
                      onChange={(e) => setForm((prev) => ({ ...prev, trans: e.target.value }))}
                      placeholder="0.00"
                      className="input w-full font-mono"
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[11px] font-semibold text-muted uppercase">Validity Until</label>
                    <input
                      type="date"
                      name="validity"
                      value={form.validity}
                      onChange={(e) => setForm((prev) => ({ ...prev, validity: e.target.value }))}
                      className="input w-full font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 py-3 text-sm font-semibold tracking-wider uppercase flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Generating PDF...
                    </>
                  ) : (
                    "Generate Quotation"
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass rounded-2xl p-6 space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full blur-2xl"></div>
              
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#F5B037] border-b border-white/5 pb-2">
                Live Preview
              </h2>

              <div className="space-y-4 text-xs font-mono text-muted">
                
                <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                  <span>Date:</span>
                  <span className="text-primary font-semibold">
                    {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-")}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                  <span>Q.NO Sequence:</span>
                  <span className="text-primary font-semibold">
                    {new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}{String(new Date().getDate()).padStart(2, '0')}XXX
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                  <span>Validity:</span>
                  <span className="text-primary font-semibold">
                    {form.validity ? form.validity.split("-").reverse().join("-") : "—"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                  <span>Mode:</span>
                  <span className="text-primary font-semibold uppercase">{form.mode}</span>
                </div>

                <div className="flex justify-between items-start py-1.5 border-b border-white/[0.03]">
                  <span>
                    {form.mode === "AIR" ? "AIRLINE" : (form.mode === "LAND" ? "TRUCK" : "CARRIER")}:
                  </span>
                  <span className="text-primary font-semibold text-right max-w-[70%] truncate">
                    {form.carrier_name || "—"}
                  </span>
                </div>

                <div className="flex justify-between items-start py-1.5 border-b border-white/[0.03]">
                  <span>POL:</span>
                  <span className="text-primary font-semibold text-right max-w-[70%] truncate">
                    {form.pol || "—"} {form.pol_pcode ? `(${form.pol_pcode})` : ""}
                  </span>
                </div>

                <div className="flex justify-between items-start py-1.5 border-b border-white/[0.03]">
                  <span>POD:</span>
                  <span className="text-primary font-semibold text-right max-w-[70%] truncate">
                    {form.pod || "—"} {form.pod_pcode ? `(${form.pod_pcode})` : ""}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                  <span>Freight (QAR):</span>
                  <span className="text-primary font-semibold">
                    QAR {previewFormat(freightQar)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                  <span>Freight (USD):</span>
                  <span className="text-primary font-semibold">
                    USD {previewFormat(freightUsd)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                  <span>Trans (QAR):</span>
                  <span className="text-primary font-semibold">
                    QAR {previewFormat(transNum)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 bg-white/5 px-3 rounded-lg border border-white/5 mt-2">
                  <span className="text-gold font-bold text-xs uppercase font-outfit">Total Rate (QAR):</span>
                  <span className="text-gold font-bold text-sm font-mono">
                    QAR {previewFormat(autoCalculatedTotal)}
                  </span>
                </div>

                <div className="text-[10px] text-muted text-center italic mt-4">
                  Formula: 400 (Fixed Fee) + TRANS (QAR) + FREIGHT (QAR)
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Historical List Table */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#F5B037] border-b border-white/5 pb-2">
            Quotation History
          </h2>
          <div className="overflow-x-auto">
            {quotations.length === 0 ? (
              <p className="text-center text-muted text-xs py-8">
                No quotations have been generated yet.
              </p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-muted uppercase tracking-wider text-[10px] font-semibold">
                    <th className="py-3 px-4">Q.NO</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Route</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Carrier/Airline</th>
                    <th className="py-3 px-4 text-right">Freight</th>
                    <th className="py-3 px-4 text-right">Trans</th>
                    <th className="py-3 px-4 text-right">Total (QAR)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {quotations.map((q) => {
                    const isDownloadAllowed = user.role === 'admin' || q.approval_status === 'Approved';
                    return (
                      <tr key={q.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-semibold text-primary">{q.q_no}</td>
                        <td className="py-3 px-4 text-muted">
                          {new Date(q.created_at).toLocaleDateString("en-GB").replace(/\//g, "-")}
                        </td>
                        <td className="py-3 px-4 font-outfit text-primary font-medium">
                          {q.customer_name || "—"}
                        </td>
                        <td className="py-3 px-4 text-muted">
                          {q.pol_pcode || "—"} ➔ {q.pod_pcode || "—"}
                        </td>
                        <td className="py-3 px-4 text-muted uppercase">{q.mode || "OCEAN"}</td>
                        <td className="py-3 px-4 text-muted truncate max-w-[120px]" title={q.carrier_name || ""}>
                          {q.carrier_name || "—"}
                        </td>
                        <td className="py-3 px-4 text-right text-muted">
                          {previewFormat(parseFloat(q.freight))} {q.currency || "QAR"}
                        </td>
                        <td className="py-3 px-4 text-right text-muted">
                          {previewFormat(parseFloat(q.trans))}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-gold">
                          {previewFormat(parseFloat(q.total_rate))}
                        </td>
                        <td className="py-3 px-4 text-center font-outfit">
                          {q.approval_status === 'Approved' ? (
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Approved
                            </span>
                          ) : q.approval_status === 'Disapproved' ? (
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Disapproved
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isDownloadAllowed ? (
                            <button
                              onClick={() => handleDownload(q.id)}
                              className="btn-secondary px-3 py-1.5 text-[10px] uppercase font-semibold tracking-wider font-outfit"
                            >
                              Download
                            </button>
                          ) : (
                            <button
                              disabled
                              className="px-3 py-1.5 text-[10px] uppercase font-semibold tracking-wider font-outfit bg-white/5 text-muted border border-white/5 cursor-not-allowed rounded-lg flex items-center gap-1 mx-auto"
                              title="Pending Admin approval"
                            >
                              🔒 Locked
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
