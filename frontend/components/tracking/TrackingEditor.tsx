"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import CountryAutoSuggest from "@/components/ui/CountryAutoSuggest";
import SearchComboBox from "@/components/ui/SearchComboBox";
import { availablePorts } from "@/lib/portCatalog";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { apiError, DATE_FIELDS, TrackingRecord } from "./model";

type Values = Record<string, string>;
type Field = [key: string, label: string, type?: string];
const REQUIRED_NEW = ["mode", "pol_country", "pol_port", "pod_country", "pod_port", "commodity", "chargeable_weight", "etd", "eta"];
const CONTAINERS = ["20FT", "40FT", "45FT", "40FT Reefer"];
const allKeys = [...REQUIRED_NEW, "load_type", "container_type", "carrier", "bl_number", "cargo_volume", "weight_unit", "pol_city", "pod_city", "pol_code", "pod_code"];
function initialValues(row?: TrackingRecord | null): Values {
  const values: Values = { mode: "SEA", load_type: "LCL", weight_unit: "KG" };
  if (!row) return values;
  for (const key of allKeys) if (row[key] !== null && row[key] !== undefined) values[key] = DATE_FIELDS.includes(key) ? String(row[key]).slice(0, 10) : String(row[key]);
  values.mode = /air/i.test(row.mode || "") ? "AIR" : /road|land/i.test(row.mode || "") ? "Road" : "SEA";
  values.load_type = values.mode === "AIR" ? "" : row.load_type || "LCL";
  values.bl_number ||= String(row.do_number || "");
  for (const key of ["chargeable_weight"]) {
    const match = values[key]?.match(/^\s*(\d+(?:\.\d+)?)\s*(KG|KGS|LB|LBS)?\s*$/i);
    if (match) { values[key] = match[1]; if (match[2] && !row.weight_unit) values.weight_unit = /^lb/i.test(match[2]) ? "LB" : "KG"; }
  }
  for (const side of ["pol", "pod"]) values[`${side}_port`] ||= String(row[side] || "");
  return values;
}

export default function TrackingEditor({ record, initialMethod = "existing", onClose, onSaved }: { record?: TrackingRecord | null; role: string; initialMethod?: "existing" | "new"; onClose: () => void; onSaved: () => void }) {
  const [method, setMethod] = useState<"existing" | "new">(initialMethod);
  const [selected, setSelected] = useState<TrackingRecord | null>(record || null);
  const [form, setForm] = useState<Values>(() => initialValues(record));
  const baseline = useRef(initialValues(record));
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<TrackingRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Values>({});
  const [approved, setApproved] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline.current);
  const isNew = !record && method === "new";
  const isFCL = form.mode !== "AIR" && form.load_type === "FCL";
  const requiredFields = REQUIRED_NEW.filter(key => !isFCL || key !== "chargeable_weight");
  const close = () => { if (!saving && (!dirty || window.confirm("Discard unsaved shipment changes?"))) onClose(); };
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  useEffect(() => {
    const timer = setTimeout(() => dialog.current?.querySelector<HTMLElement>("input,select,button")?.focus(), 50);
    const focusTrap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = Array.from(dialog.current?.closest(".glass")?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]') || []).filter(control => control.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", focusTrap);
    return () => { clearTimeout(timer); document.removeEventListener("keydown", focusTrap); };
  }, []);
  useEffect(() => {
    if (record || method !== "existing") return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try { const { data } = await api.get("/shipments/tracking", { params: { q: search, page: 1, pageSize: 10 }, signal: controller.signal }); setMatches(data.data || []); }
      catch (err: any) { if (err.code !== "ERR_CANCELED") setError(apiError(err, "Could not search confirmed shipments.")); }
      finally { if (!controller.signal.aborted) setSearching(false); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [method, search, record]);
  const set = (key: string, value: string) => { setForm(prev => ({ ...prev, [key]: value })); setErrors(prev => ({ ...prev, [key]: "" })); };
  const choose = async (row: TrackingRecord) => {
    if (dirty && !window.confirm("Discard unsaved changes and select another shipment?")) return;
    setSelecting(true); setError("");
    try { const { data } = await api.get(`/shipments/tracking/${encodeURIComponent(row.ref_no)}`); setSelected(data.data); const values = initialValues(data.data); baseline.current = values; setForm(values); }
    catch (err) { setError(apiError(err, "Could not load shipment details.")); }
    finally { setSelecting(false); }
  };
  const changeMethod = (next: "existing" | "new") => {
    if (dirty && !window.confirm("Discard unsaved changes and switch creation method?")) return;
    setMethod(next); setSelected(null); const values = initialValues(); baseline.current = values; setForm(values); setError(""); setErrors({}); setApproved(false);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Values = {};
    if (isNew) requiredFields.forEach(key => { if (!form[key]?.trim()) nextErrors[key] = "This field is required for a new shipment."; });
    if (isFCL && !CONTAINERS.includes(form.container_type)) nextErrors.container_type = "Choose a container type.";
    if (!isFCL && form.chargeable_weight && (!Number.isFinite(Number(form.chargeable_weight)) || Number(form.chargeable_weight) < 0)) nextErrors.chargeable_weight = "Enter a valid chargeable weight.";
    if (!isFCL && form.cargo_volume && (!Number.isFinite(Number(form.cargo_volume)) || Number(form.cargo_volume) < 0)) nextErrors.cargo_volume = "Enter a valid CBM value.";
    if (form.eta && form.etd && form.eta < form.etd) nextErrors.eta = "ETA cannot be before ETD.";
    if (!isNew && !selected) { setError("Select an existing confirmed shipment first."); return; }
    if (isNew && !approved) { setError("Confirm that this booking is commercially approved before creating it."); return; }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setError("Review the highlighted fields before saving."); return; }
    const payload: Record<string, unknown> = {};
    allKeys.forEach(key => {
      if (isFCL && ["chargeable_weight", "cargo_volume"].includes(key) || !isFCL && key === "container_type") return;
      if (isNew ? form[key] !== undefined && form[key] !== "" : form[key] !== baseline.current[key]) {
        const target = key === "bl_number" && !(record || selected)?.bl_number && (record || selected)?.do_number ? "do_number" : key;
        payload[target] = ["chargeable_weight", "cargo_volume"].includes(key) ? form[key] === "" ? null : Number(form[key]) : form[key] || null;
      }
    });
    setSaving(true); setError("");
    try {
      if (record) await api.patch(`/shipments/${encodeURIComponent(record.ref_no)}/tracking`, payload);
      else await api.post("/shipments/tracking", { ...payload, method, ...(selected ? { ref_no: selected.ref_no } : {}) });
      toast.success(isNew ? "Confirmed shipment created." : "Shipment tracking saved."); onSaved(); onClose();
    } catch (err: any) { setError(apiError(err, "Could not save tracking. Your changes have been kept.")); const fieldErrors = err.response?.data?.errors; if (fieldErrors && !Array.isArray(fieldErrors) && typeof fieldErrors === "object") setErrors(fieldErrors); }
    finally { setSaving(false); }
  };
  const field = ([key, label, type = "text"]: Field) => <label key={key} className="block text-xs text-muted">{label}{isNew && requiredFields.includes(key) && <span className="text-gold"> *</span>}<input className="input w-full mt-1" type={type} value={form[key] || ""} onChange={e => set(key, e.target.value)} required={isNew && requiredFields.includes(key)} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `error-${key}` : undefined} {...(type === "number" ? { step: "any", min: "0" } : {})} />{errors[key] && <span id={`error-${key}`} className="text-rose block mt-1">{errors[key]}</span>}</label>;
  const endpoint = (prefix: "pol" | "pod") => {
    const ports = form.mode === "Road" ? [] : availablePorts(form[`${prefix}_country`], form.mode);
    const options = ports.map(port => ({ value: port.port_name, label: `${port.city} · ${port.port_name}`, searchText: port.aliases.join(" ") }));
    return <div className="space-y-4">
      <label className="block text-xs text-muted">{prefix.toUpperCase()} country{isNew ? " *" : ""}<CountryAutoSuggest label={`${prefix.toUpperCase()} country`} value={form[`${prefix}_country`] || ""} onChange={value => setForm(prev => ({ ...prev, [`${prefix}_country`]: value, [`${prefix}_city`]: "", [`${prefix}_port`]: "", [`${prefix}_code`]: "" }))} required={isNew} /></label>
      <label className="block text-xs text-muted">{prefix.toUpperCase()}{isNew ? " *" : ""}<SearchComboBox label={prefix.toUpperCase()} options={options} value={form[`${prefix}_port`] || ""} required={isNew} allowCustom onChange={value => { const match = ports.find(port => port.port_name === value); setForm(prev => ({ ...prev, [`${prefix}_port`]: value, [`${prefix}_city`]: match?.city || "", [`${prefix}_code`]: "" })); }} /></label>
      {(errors[`${prefix}_country`] || errors[`${prefix}_port`]) && <p className="text-xs text-rose" role="alert">Choose a country and enter a {prefix.toUpperCase()} location.</p>}
    </div>;
  };
  return <Modal isOpen onClose={close} title={record ? `Edit shipment · ${record.ref_no}` : "Add shipment to tracking"} size="xl" footer={<><span className="mr-auto text-xs text-muted">{dirty ? "Unsaved changes" : "No unsaved edits"}</span><button type="button" className="btn-secondary" onClick={close} disabled={saving}>Cancel</button><button type="submit" form="tracking-editor" className="btn-primary" disabled={saving || selecting || (!isNew && !selected)}>{saving ? "Saving…" : isNew ? "Create confirmed shipment" : "Save tracking"}</button></>}><div ref={dialog} role="dialog" aria-modal="true" aria-label="Shipment tracking editor"><form id="tracking-editor" onSubmit={save} className="space-y-5">
    {!record && <section className="rounded-xl border border-gold/20 bg-gold/5 p-4"><div className="flex flex-wrap gap-2 mb-4"><button type="button" onClick={() => changeMethod("existing")} className={method === "existing" ? "btn-primary" : "btn-secondary"}>Use existing confirmed shipment</button><button type="button" onClick={() => changeMethod("new")} className={method === "new" ? "btn-primary" : "btn-secondary"}>Create new confirmed shipment</button></div>{method === "existing" ? <><p className="text-xs text-muted mb-3">Recommended. Complete the original record without creating a duplicate shipment.</p><label className="text-xs text-muted">Search reference, customer, request number or BL / AWB<input className="input w-full mt-1" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search confirmed shipments…" /></label><div className="max-h-48 overflow-y-auto mt-2 space-y-1" aria-live="polite">{searching ? <p className="text-xs text-muted p-2">Searching…</p> : matches.map(row => <button type="button" disabled={selecting} key={row.ref_no} className={`w-full text-left p-3 rounded-lg text-sm ${selected?.ref_no === row.ref_no ? "bg-gold/15 text-gold" : "bg-surface-2 text-primary hover:bg-surface-3"}`} onClick={() => choose(row)}><strong>{row.ref_no}</strong><span className="text-muted ml-3">{row.customer_name || row.cust_req_no || "Customer not set"}</span><span className="block text-xs mt-1">{row.pol || "Origin not set"} → {row.pod || "Destination not set"} · {row.track_status || "No stage"}</span></button>)}{!searching && !matches.length && <p className="text-xs text-muted p-3">No eligible shipments match this search.</p>}</div>{selected && <p className="text-xs text-emerald mt-3">Selected {selected.ref_no}. Existing tracking information is loaded below.</p>}</> : <><p className="text-sm text-primary">The shipment reference and customer request number are generated automatically on save.</p><label className="flex items-start gap-2 text-sm text-muted mt-3"><input type="checkbox" className="mt-1" checked={approved} onChange={e => setApproved(e.target.checked)} required={isNew} />I confirm this booking is commercially approved and should be created with business status Confirmed.</label></>}</section>}
    {(record || selected || isNew) && <>
      <section className="border border-white/10 bg-surface-1 rounded-xl p-4 sm:p-5 space-y-5">
        <h3 className="font-semibold text-primary">Shipping details</h3>
        {(record || selected) && <p className="text-xs text-muted">Shipment: {(record || selected)?.ref_no} · Customer request: {(record || selected)?.cust_req_no || "Not recorded"}</p>}
        <label className="block text-xs text-muted">Mode *<select className="input w-full mt-1" value={form.mode} onChange={e => { const mode = e.target.value; setForm(prev => ({ ...prev, mode, load_type: mode === "AIR" ? "" : prev.load_type || "LCL" })); setErrors({}); }}><option value="SEA">Sea Freight</option><option value="AIR">Air Freight</option><option value="Road">Road Freight</option></select></label>
        {form.mode !== "AIR" && <label className="block text-xs text-muted">Load type<select className="input w-full mt-1" value={form.load_type || "LCL"} onChange={e => set("load_type", e.target.value)}><option value="LCL">LCL</option><option value="FCL">FCL</option></select></label>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">{endpoint("pol")}{endpoint("pod")}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {field(["commodity", "Commodity"])}
          {field(["carrier", "Carrier"])}
          {field(["bl_number", "BL / DO Number"])}
          {isFCL ? <label className="block text-xs text-muted">Container type *<select className="input w-full mt-1" value={form.container_type || ""} onChange={e => set("container_type", e.target.value)} required aria-invalid={!!errors.container_type} aria-describedby={errors.container_type ? "error-container_type" : undefined}><option value="">Select container type</option>{CONTAINERS.map(container => <option key={container} value={container}>{container}</option>)}</select>{errors.container_type && <span id="error-container_type" className="text-rose block mt-1">{errors.container_type}</span>}</label> : <>{field(["chargeable_weight", `Chargeable weight (${form.weight_unit || "KG"})`, "number"])}{field(["cargo_volume", "CBM (m³)", "number"])}</>}
          {field(["eta", "ETA", "date"])}
          {field(["etd", "ETD", "date"])}
        </div>
      </section>
    </>}
    {error && <div role="alert" className="rounded-lg border border-rose/30 bg-rose/10 p-4 text-sm text-rose">{error}</div>}
  </form></div></Modal>;
}
