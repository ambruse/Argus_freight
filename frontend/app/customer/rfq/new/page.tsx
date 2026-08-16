"use client";
// app/customer/rfq/new/page.tsx
// ─────────────────────────────────────────────────────────────
//  Customer Request Quote Page
// ─────────────────────────────────────────────────────────────
import { useState, useRef, ChangeEvent, DragEvent, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PortAutoSuggest from "@/components/ui/PortAutoSuggest";
import CountryAutoSuggest from "@/components/ui/CountryAutoSuggest";
import ContainerInput from "@/components/ui/ContainerInput";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import { MAJOR_PORTS, ALL_COUNTRIES } from "@/lib/ports";

type DimItem = {
  length: string;
  width: string;
  height: string;
  qty: string;
  weight: string;
};

type FormState = {
  pol: string;
  pol_country: string;
  pod: string;
  commodity: string;
  term: string;
  dimension: string;
  dim_length: string;
  dim_width: string;
  dim_height: string;
  dim_qty: string;
  dim_unit: string;
  dim_cbm: string;
  dim_items: DimItem[];
  container: string;
  mode: string;
  weight: string;
  weight_unit: string;
  pickup_address: string;
  delivery_address: string;
  note: string;
  operator: string;
  no_dimension?: boolean;
};

const INITIAL_FORM: FormState = {
  pol: "", pol_country: "", pod: "", commodity: "", term: "", dimension: "",
  dim_length: "", dim_width: "", dim_height: "", dim_qty: "1", dim_unit: "cm", dim_cbm: "",
  dim_items: [{ length: "", width: "", height: "", qty: "1", weight: "" }],
  container: "", mode: "", weight: "", weight_unit: "KG", pickup_address: "",
  delivery_address: "", note: "", operator: "", no_dimension: false
};

const formatDimensionAndWeight = (form: FormState) => {
  const isCbm = form.dim_unit === "cbm";
  let dimensionStr = "";
  if (form.no_dimension) {
    dimensionStr = "No Dimension";
  } else if (isCbm) {
    const cbmVal = parseFloat(form.dim_cbm || "0") || 0;
    dimensionStr = cbmVal > 0 ? `${form.dim_cbm?.trim()} CBM` : "";
  } else {
    const validDimItems = (form.dim_items || []).filter((item) => {
      const l = parseFloat(item.length || "0") || 0;
      const w = parseFloat(item.width || "0") || 0;
      const h = parseFloat(item.height || "0") || 0;
      return l * w * h > 0;
    });

    if (validDimItems.length === 1) {
      const item = validDimItems[0];
      const l = item.length?.trim() || "0";
      const w = item.width?.trim() || "0";
      const h = item.height?.trim() || "0";
      const qty = item.qty?.trim() || "1";
      dimensionStr = `${l}x${w}x${h} ${form.dim_unit || "cm"} (Qty: ${qty})`;
    } else if (validDimItems.length > 1) {
      const parts = validDimItems.map((item, idx) => {
        const l = item.length?.trim() || "0";
        const w = item.width?.trim() || "0";
        const h = item.height?.trim() || "0";
        const qty = item.qty?.trim() || "1";
        return `${idx + 1}) ${l}x${w}x${h} ${form.dim_unit || "cm"} (Qty: ${qty})`;
      });
      dimensionStr = `dimensions : ${parts.join("  ")}`;
    } else {
      dimensionStr = "";
    }
  }

  let weightStr = "";
  let totalWeight = 0;
  if (form.no_dimension || isCbm) {
    const wVal = parseFloat(form.weight) || 0;
    totalWeight = wVal;
    weightStr = wVal ? `${wVal} ${form.weight_unit || "KG"}` : "";
  } else {
    const validItems = (form.dim_items || []).filter((item) => {
      const l = parseFloat(item.length || "0") || 0;
      const w = parseFloat(item.width || "0") || 0;
      const h = parseFloat(item.height || "0") || 0;
      return l * w * h > 0;
    });

    if (validItems.length === 1) {
      const item = validItems[0];
      const wVal = parseFloat(item.weight || "") || 0;
      const qtyVal = parseFloat(item.qty || "") || 1;
      totalWeight = wVal * qtyVal;
      weightStr = totalWeight ? `${totalWeight.toFixed(2)} ${form.weight_unit || "KG"}` : "";
    } else if (validItems.length > 1) {
      const wParts: string[] = [];
      validItems.forEach((item, idx) => {
        const wVal = parseFloat(item.weight || "") || 0;
        const qtyVal = parseFloat(item.qty || "") || 1;
        const rowWeight = wVal * qtyVal;
        totalWeight += rowWeight;
        wParts.push(`${idx + 1}) ${rowWeight.toFixed(2)} ${form.weight_unit || "KG"}`);
      });
      weightStr = totalWeight ? `${wParts.join("  ")}   total ${form.weight_unit || "KG"} = ${totalWeight.toFixed(2)}` : "";
    } else {
      const wVal = parseFloat(form.weight || "") || 0;
      totalWeight = wVal;
      weightStr = wVal ? `${wVal} ${form.weight_unit || "KG"}` : "";
    }
  }

  const isLb = ["LB", "Pound"].includes(form.weight_unit || "KG");
  const weightInKg = totalWeight
    ? (isLb ? (totalWeight * 0.45359237).toFixed(2) : totalWeight.toFixed(2))
    : "";

  return { dimensionStr, weightStr, weightInKg };
};

export default function CustomerNewRFQPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [files, setFiles] = useState<File[]>([]);
  
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        nextForm.container = "";
      }
      return nextForm;
    });
  };

  const handleDimItemChange = (index: number, field: keyof DimItem, value: string) => {
    setForm(prev => {
      const newItems = [...(prev.dim_items || [])];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, dim_items: newItems };
    });
  };

  const addDimItem = () => {
    setForm(prev => ({
      ...prev,
      dim_items: [...(prev.dim_items || []), { length: "", width: "", height: "", qty: "1", weight: "" }]
    }));
  };

  const removeDimItem = (index: number) => {
    setForm(prev => ({
      ...prev,
      dim_items: (prev.dim_items || []).filter((_, i) => i !== index)
    }));
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

    // Dimension, Container, Weight logic using formatDimensionAndWeight
    const { dimensionStr, weightInKg } = formatDimensionAndWeight(form);

    const isContainerEmpty = !form.container?.trim();
    const isDimensionEmpty = !dimensionStr.trim();
    const isWeightEmpty = !weightInKg;

    if (!form.no_dimension) {
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
    }

    if (form.term === "EXW" && !form.pickup_address?.trim()) {
      toast.error("Pick-up Address is compulsory for EXW term.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Generate RFQ in DB
      const payload = {
        ...form,
        dimension: dimensionStr,
        weight: weightInKg
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

  const polCountries = ALL_COUNTRIES;

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
    { label: "WEIGHT", name: "weight" },
    { label: "NOTE", name: "note" },
    { label: "OPERATOR", name: "operator" },
  ];

  return (
    <AppLayout
      title="Request Quote"
      subtitle="Draft a new request for quotation and submit it to the operations team."
    >
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* ── Main Form Container ────────────────────────────── */}
        <div className="glass rounded-2xl p-4 sm:p-6 shadow-card space-y-8 animate-fade-in" onKeyDown={handleKeyDown}>
          
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
                    <CountryAutoSuggest
                      value={form.pol_country}
                      onChange={(val) => setForm(prev => ({ ...prev, pol_country: val, pol: "" }))}
                      placeholder="Search POL Country..."
                    />
                  ) : f.name === "mode" ? (
                    <select
                      name="mode"
                      value={form.mode}
                      onChange={handleChange}
                      className="select w-full min-h-[44px]"
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
                        className="select w-full min-h-[44px]"
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
                          className="input w-full mt-2 min-h-[44px]"
                        />
                      )}
                    </div>
                  ) : f.name === "dimension" ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <select
                          name="dim_unit"
                          value={form.dim_unit || "cm"}
                          onChange={handleChange}
                          className="select w-full text-xs min-h-[44px]"
                          disabled={form.no_dimension}
                        >
                          <option value="cm">cm (Centimeter)</option>
                          <option value="m">m (Meter)</option>
                          <option value="cbm">CBM (Cubic Meter)</option>
                        </select>
                        <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-xs text-muted hover:text-white select-none">
                          <input
                            type="checkbox"
                            checked={form.no_dimension || false}
                            onChange={(e) => setForm(prev => ({ ...prev, no_dimension: e.target.checked }))}
                            className="checkbox border-white/20 text-gold focus:ring-gold/30 rounded"
                          />
                          <span>NO DIMENSION</span>
                        </label>
                      </div>

                      {form.no_dimension ? (
                        <div className="p-3 text-center text-xs text-muted/60 italic bg-white/[0.02] border border-white/[0.04] rounded-xl">
                          No Dimension Checked
                        </div>
                      ) : form.dim_unit === "cbm" ? (
                        <div className="relative">
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            name="dim_cbm"
                            value={form.dim_cbm || ""}
                            onChange={handleChange}
                            className="input w-full pr-12 font-mono min-h-[44px]"
                            placeholder="Enter total CBM (e.g. 1.5)"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted pointer-events-none">CBM</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {(form.dim_items || []).map((item, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <div className="grid grid-cols-5 gap-2 flex-1">
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.length || ""}
                                    onChange={(e) => handleDimItemChange(idx, "length", e.target.value)}
                                    className="input w-full pr-7 text-center font-mono text-xs min-h-[44px]"
                                    placeholder="L"
                                  />
                                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-muted pointer-events-none">
                                    {form.dim_unit}
                                  </span>
                                </div>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.width || ""}
                                    onChange={(e) => handleDimItemChange(idx, "width", e.target.value)}
                                    className="input w-full pr-7 text-center font-mono text-xs min-h-[44px]"
                                    placeholder="W"
                                  />
                                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-muted pointer-events-none">
                                    {form.dim_unit}
                                  </span>
                                </div>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.height || ""}
                                    onChange={(e) => handleDimItemChange(idx, "height", e.target.value)}
                                    className="input w-full pr-7 text-center font-mono text-xs min-h-[44px]"
                                    placeholder="H"
                                  />
                                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-muted pointer-events-none">
                                    {form.dim_unit}
                                  </span>
                                </div>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.qty || ""}
                                    onChange={(e) => handleDimItemChange(idx, "qty", e.target.value)}
                                    className="input w-full pr-7 text-center font-mono text-xs min-h-[44px]"
                                    placeholder="Qty"
                                  />
                                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-muted pointer-events-none">
                                    pcs
                                  </span>
                                </div>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.weight || ""}
                                    onChange={(e) => handleDimItemChange(idx, "weight", e.target.value)}
                                    className="input w-full pr-8 text-center font-mono text-xs min-h-[44px]"
                                    placeholder="Weight"
                                  />
                                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-muted pointer-events-none">
                                    {form.weight_unit || "KG"}
                                  </span>
                                </div>
                              </div>
                              {idx === 0 ? (
                                <button
                                  type="button"
                                  onClick={addDimItem}
                                  className="btn btn-primary min-h-[44px] h-[44px] w-[44px] p-0 flex items-center justify-center font-bold text-lg"
                                >
                                  +
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => removeDimItem(idx)}
                                  className="btn btn-error min-h-[44px] h-[44px] w-[44px] p-0 flex items-center justify-center font-bold text-lg bg-red-600/20 hover:bg-red-600/40 text-red-500 border border-red-500/30"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {(() => {
                        const unit = form.dim_unit || "cm";
                        let cbmCalc = 0;
                        if (form.no_dimension) {
                          cbmCalc = 0;
                        } else if (unit === "cbm") {
                          cbmCalc = parseFloat(form.dim_cbm) || 0;
                        } else {
                          (form.dim_items || []).forEach(item => {
                            const l = parseFloat(item.length) || 0;
                            const w = parseFloat(item.width) || 0;
                            const h = parseFloat(item.height) || 0;
                            const qty = parseFloat(item.qty) || 1;
                            if (unit === "m") {
                              cbmCalc += l * w * h * qty;
                            } else {
                              cbmCalc += (l * w * h * qty) / 1000000;
                            }
                          });
                        }
                        const volWeightCalc = cbmCalc * 167;

                        let actWeight = 0;
                        if (form.no_dimension || unit === "cbm") {
                          actWeight = parseFloat(form.weight) || 0;
                        } else {
                          actWeight = (form.dim_items || []).reduce((acc, item) => {
                            const w = parseFloat(item.weight || "") || 0;
                            const q = parseFloat(item.qty || "") || 1;
                            return acc + (w * q);
                          }, 0);
                        }
                        const isLbWeight = ["LB", "Pound"].includes(form.weight_unit || "KG");
                        const actWeightKg = actWeight 
                          ? (isLbWeight ? (actWeight * 0.45359237) : actWeight)
                          : 0;

                        const chgWeightCalc = Math.max(actWeightKg, volWeightCalc);

                        if (form.no_dimension) return null;
                        if (!cbmCalc && !actWeight) return null;

                        return (
                          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] grid grid-cols-2 gap-3 text-xs">
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted">CBM</span>
                              <p className="font-mono font-bold text-gold text-sm">{cbmCalc.toFixed(4)} m³</p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted">Chargeable Weight</span>
                              <p className="font-mono font-bold text-blue text-sm">{chgWeightCalc.toFixed(2)} kg</p>
                            </div>
                            <div className="col-span-2 text-[9px] text-muted italic border-t border-white/[0.04] pt-1.5 mt-0.5">
                              Volumetric Weight: {volWeightCalc.toFixed(2)} kg | Actual Weight: {actWeightKg.toFixed(2)} kg
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : f.name === "weight" ? (
                    (form.no_dimension || form.dim_unit === "cbm") ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            name="weight"
                            value={form.weight || ""}
                            onChange={handleChange}
                            className="input w-full col-span-2 min-h-[44px]"
                            placeholder="Weight"
                          />
                          <select
                            name="weight_unit"
                            value={form.weight_unit || "KG"}
                            onChange={handleChange}
                            className="select w-full text-xs min-h-[44px]"
                          >
                            <option value="KG">KG</option>
                            <option value="LB">LB</option>
                            <option value="Pound">Pound</option>
                          </select>
                        </div>

                        {(() => {
                          const wVal = parseFloat(form.weight) || 0;
                          const qty = parseFloat(form.dim_qty) || 1;
                          const unit = form.weight_unit || "KG";
                          const totalWeight = wVal * qty;
                          
                          let totalWeightKg = totalWeight;
                          if (unit === "LB" || unit === "Pound") {
                            totalWeightKg = totalWeight * 0.45359237;
                          }

                          if (!wVal) return null;

                          return (
                            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[10px] text-muted flex justify-between">
                              <span>Total Weight: <strong className="text-primary">{totalWeight.toFixed(2)} {unit}</strong></span>
                              {(unit === "LB" || unit === "Pound") && (
                                <span>(<strong className="text-gold">{totalWeightKg.toFixed(2)} KG</strong>)</span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ) : null
                  ) : (
                    <input
                      name={f.name}
                      value={(form as any)[f.name]}
                      onChange={handleChange}
                      className="input w-full min-h-[44px]"
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
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={handleClear}
              className="btn-secondary w-full sm:w-auto justify-center min-h-[44px]"
              disabled={submitting}
            >
              Clear Form
            </button>
            <button
              type="button"
              onClick={handleSend}
              className="btn-primary w-full sm:w-auto justify-center min-h-[44px] px-8"
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
