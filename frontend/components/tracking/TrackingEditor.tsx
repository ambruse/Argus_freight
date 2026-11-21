"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import CountryAutoSuggest from "@/components/ui/CountryAutoSuggest";
import SearchComboBox from "@/components/ui/SearchComboBox";
import { availablePorts } from "@/lib/portCatalog";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { apiError, DATE_FIELDS, FINANCIAL_FIELDS, NUMERIC_FIELDS, TRACKING_STAGES, TrackingRecord } from "./model";
import { StageProgress } from "./TrackingStage";

type Values = Record<string, string>;
type Field = [key: string, label: string, type?: string];
const REQUIRED_NEW = ["customer_name", "mode", "pol_country", "pol_city", "pol_port", "pod_country", "pod_city", "pod_port", "commodity", "cargo_type", "package_count", "package_type", "gross_weight", "chargeable_weight", "weight_unit", "cargo_volume", "etd", "eta"];
const identification: Field[] = [["cust_req_no", "Customer request number"], ["customer_name", "Customer name"], ["customer_email", "Customer email", "email"], ["customer_phone", "Customer phone", "tel"], ["customer_id", "Existing customer ID (optional)"], ["shipment_type", "Shipment type"], ["booking_reference", "Booking reference"], ["carrier", "Carrier name"], ["carrier_booking_number", "Carrier booking number"], ["house_bl_number", "House BL / AWB"], ["master_bl_number", "Master BL / AWB"], ["bl_number", "Public lookup BL / AWB"], ["do_number", "DO number"], ["so_number", "SO number"], ["box_no", "Box / package reference"]];
const routing: Field[] = [["place_of_receipt", "Place of receipt"], ["final_delivery_location", "Final delivery location"], ["transit_country", "Transit country"], ["transshipment_port", "Transshipment port"], ["transit_stops", "Additional transit stops"], ["route_notes", "Route notes"]];
const cargo: Field[] = [["commodity", "Commodity / description"], ["cargo_type", "Cargo type"], ["package_count", "Number of packages", "number"], ["package_type", "Package type"], ["gross_weight", "Gross weight", "number"], ["chargeable_weight", "Chargeable weight", "number"], ["cargo_volume", "Cargo volume (CBM)", "number"], ["net_weight", "Net weight", "number"], ["dimension", "Dimensions (include units)"], ["hs_code", "HS code"], ["special_handling", "Special handling instructions"], ["cargo_remarks", "Cargo remarks"]];
const schedule: Field[] = [["etd", "Estimated departure (ETD)", "date"], ["eta", "Estimated arrival (ETA)", "date"], ["actual_departure", "Actual departure (ATD)", "date"], ["actual_arrival", "Actual arrival (ATA)", "date"], ["booking_date", "Booking date", "date"], ["cargo_ready_date", "Cargo ready date", "date"], ["pickup_date", "Pickup date", "date"], ["customs_clearance_date", "Customs clearance date", "date"], ["warehouse_arrival_date", "Warehouse arrival date", "date"], ["delivery_date", "Delivery date", "date"]];
const tracking: Field[] = [["current_location", "Current reported location"], ["current_country", "Current country"], ["last_known_facility", "Last known facility"], ["tracking_remarks", "Tracking remarks"], ["next_milestone", "Next expected milestone"], ["next_update", "Next expected update", "date"], ["delay_reason", "Delay reason"]];
const sea: Field[] = [["container_number", "Container number"], ["container_count", "Number of containers", "number"], ["container_type", "Container type"], ["container_size", "Container size"], ["vessel_name", "Vessel name"], ["voyage_number", "Voyage number"]];
const air: Field[] = [["flight_number", "Flight number"]];
const road: Field[] = [["vehicle_number", "Vehicle number"], ["border_crossing", "Border crossing"]];
const finances: Field[] = [["cost", "Shipment cost (QAR)", "number"], ["customer_charge", "Customer charge (QAR)", "number"], ["profit", "Estimated profit (QAR)", "number"], ["actual_profit", "Actual profit (QAR)", "number"]];
const allKeys = [...identification, ...routing, ...cargo, ...schedule, ...tracking, ...sea, ...air, ...road, ...finances].map(f => f[0]).concat(["mode", "track_status", "weight_unit", "dangerous_goods", "public_message", "internal_notes", "pol_country", "pol_city", "pol_port", "pol_code", "pod_country", "pod_city", "pod_port", "pod_code"]);
function initialValues(row?: TrackingRecord | null): Values {
  const values: Values = { mode: "SEA", track_status: "Confirmed", weight_unit: "KG", dangerous_goods: "false" };
  if (!row) return values;
  for (const key of allKeys) if (row[key] !== null && row[key] !== undefined) values[key] = DATE_FIELDS.includes(key) ? String(row[key]).slice(0, 10) : String(row[key]);
  values.dangerous_goods = row.dangerous_goods === true || row.dangerous_goods === 1 || row.dangerous_goods === "1" ? "true" : "false";
  values.mode = /air/i.test(row.mode || "") ? "AIR" : /road|land/i.test(row.mode || "") ? "Road" : "SEA";
  for (const key of ["gross_weight", "chargeable_weight"]) {
    const match = values[key]?.match(/^\s*(\d+(?:\.\d+)?)\s*(KG|KGS|LB|LBS)?\s*$/i);
    if (match) { values[key] = match[1]; if (match[2] && !row.weight_unit) values.weight_unit = /^lb/i.test(match[2]) ? "LB" : "KG"; }
  }
  return values;
}

export default function TrackingEditor({ record, role, initialMethod = "existing", onClose, onSaved }: { record?: TrackingRecord | null; role: string; initialMethod?: "existing" | "new"; onClose: () => void; onSaved: () => void }) {
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
  const [volume, setVolume] = useState({ length: "", width: "", height: "", qty: "1", divisor: "" });
  const dialog = useRef<HTMLDivElement>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline.current);
  const isNew = !record && method === "new";
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
    if (isNew) REQUIRED_NEW.forEach(key => { if (!form[key]?.trim()) nextErrors[key] = "This field is required for a new shipment."; });
    NUMERIC_FIELDS.forEach(key => { if (form[key] && (!Number.isFinite(Number(form[key])) || Number(form[key]) < 0 && !["profit", "actual_profit"].includes(key))) nextErrors[key] = "Enter a valid number."; });
    if (form.eta && form.etd && form.eta < form.etd) nextErrors.eta = "ETA cannot be before ETD.";
    if (isNew && Number(form.package_count) < 1) nextErrors.package_count = "Enter at least one package.";
    if (form.actual_arrival && form.actual_departure && form.actual_arrival < form.actual_departure) nextErrors.actual_arrival = "Actual arrival cannot be before actual departure.";
    if (!isNew && !selected) { setError("Select an existing confirmed shipment first."); return; }
    if (isNew && !approved) { setError("Confirm that this booking is commercially approved before creating it."); return; }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setError("Review the highlighted fields before saving."); return; }
    const payload: Record<string, unknown> = {};
    allKeys.forEach(key => {
      if (FINANCIAL_FIELDS.includes(key) && role !== "admin") return;
      if (isNew ? form[key] !== undefined && form[key] !== "" : form[key] !== baseline.current[key]) {
        payload[key] = key === "dangerous_goods" ? form[key] === "true" : NUMERIC_FIELDS.includes(key) ? form[key] === "" ? null : Number(form[key]) : form[key] || null;
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
  const field = ([key, label, type = "text"]: Field) => <label key={key} className="block text-xs text-muted">{label}{isNew && REQUIRED_NEW.includes(key) && <span className="text-gold"> *</span>}<input className="input w-full mt-1" type={type} readOnly={!isNew && ["cust_req_no", "customer_id"].includes(key)} value={form[key] || ""} onChange={e => set(key, e.target.value)} required={isNew && REQUIRED_NEW.includes(key)} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `error-${key}` : undefined} {...(type === "number" ? { step: ["package_count", "container_count"].includes(key) ? "1" : "any", min: ["profit", "actual_profit"].includes(key) ? undefined : "0" } : {})} />{errors[key] && <span id={`error-${key}`} className="text-rose block mt-1">{errors[key]}</span>}</label>;
  const section = (title: string, description: string, children: React.ReactNode) => <section className="border border-white/10 bg-surface-1 rounded-xl p-4 sm:p-5 space-y-4"><div><h3 className="text-primary font-semibold">{title}</h3><p className="text-xs text-muted mt-1">{description}</p></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div></section>;
  const endpoint = (prefix: "pol" | "pod") => {
    const ports = form.mode === "Road" ? [] : availablePorts(form[`${prefix}_country`], form.mode);
    const options = ports.map(port => ({ value: port.port_name, label: `${port.city} · ${port.port_name}`, searchText: port.aliases.join(" ") }));
    return <div className="space-y-3 rounded-lg border border-white/10 p-4"><h4 className="font-medium text-primary">{prefix === "pol" ? "Port of loading · Origin" : "Port of discharge · Destination"}</h4><label className="block text-xs text-muted">Country{isNew ? " *" : ""}<CountryAutoSuggest label={`${prefix.toUpperCase()} country`} value={form[`${prefix}_country`] || ""} onChange={value => { setForm(prev => ({ ...prev, [`${prefix}_country`]: value, [`${prefix}_city`]: "", [`${prefix}_port`]: "", [`${prefix}_code`]: "" })); }} required={isNew} /></label><label className="block text-xs text-muted">{form.mode === "AIR" ? "Airport" : form.mode === "Road" ? "Terminal / pickup or delivery point" : "Port / terminal"}{isNew ? " *" : ""}<SearchComboBox label={`${prefix.toUpperCase()} location`} options={options} value={form[`${prefix}_port`] || ""} required={isNew} allowCustom onChange={value => { const match = ports.find(port => port.port_name === value); setForm(prev => ({ ...prev, [`${prefix}_port`]: value, ...(match ? { [`${prefix}_city`]: match.city } : {}), [`${prefix}_code`]: "" })); }} /></label>{field([`${prefix}_city`, "City"])}{field([`${prefix}_code`, "Verified location code (optional)"])}<p className="text-xs text-muted">Use the existing location catalog or enter a location manually. Codes are optional and must be verified.</p></div>;
  };
  return <Modal isOpen onClose={close} title={record ? `Edit shipment · ${record.ref_no}` : "Add shipment to tracking"} size="xl" footer={<><span className="mr-auto text-xs text-muted">{dirty ? "Unsaved changes" : "No unsaved edits"}</span><button type="button" className="btn-secondary" onClick={close} disabled={saving}>Cancel</button><button type="submit" form="tracking-editor" className="btn-primary" disabled={saving || selecting || (!isNew && !selected)}>{saving ? "Saving…" : isNew ? "Create confirmed shipment" : "Save tracking"}</button></>}><div ref={dialog} role="dialog" aria-modal="true" aria-label="Shipment tracking editor"><form id="tracking-editor" onSubmit={save} className="space-y-5">
    {!record && <section className="rounded-xl border border-gold/20 bg-gold/5 p-4"><div className="flex flex-wrap gap-2 mb-4"><button type="button" onClick={() => changeMethod("existing")} className={method === "existing" ? "btn-primary" : "btn-secondary"}>Use existing confirmed shipment</button><button type="button" onClick={() => changeMethod("new")} className={method === "new" ? "btn-primary" : "btn-secondary"}>Create new confirmed shipment</button></div>{method === "existing" ? <><p className="text-xs text-muted mb-3">Recommended. Complete the original record without creating a duplicate shipment.</p><label className="text-xs text-muted">Search reference, customer, request number or BL / AWB<input className="input w-full mt-1" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search confirmed shipments…" /></label><div className="max-h-48 overflow-y-auto mt-2 space-y-1" aria-live="polite">{searching ? <p className="text-xs text-muted p-2">Searching…</p> : matches.map(row => <button type="button" disabled={selecting} key={row.ref_no} className={`w-full text-left p-3 rounded-lg text-sm ${selected?.ref_no === row.ref_no ? "bg-gold/15 text-gold" : "bg-surface-2 text-primary hover:bg-surface-3"}`} onClick={() => choose(row)}><strong>{row.ref_no}</strong><span className="text-muted ml-3">{row.customer_name || row.cust_req_no || "Customer not set"}</span><span className="block text-xs mt-1">{row.pol || "Origin not set"} → {row.pod || "Destination not set"} · {row.track_status || "No stage"}</span></button>)}{!searching && !matches.length && <p className="text-xs text-muted p-3">No eligible shipments match this search.</p>}</div>{selected && <p className="text-xs text-emerald mt-3">Selected {selected.ref_no}. Existing tracking information is loaded below.</p>}</> : <><p className="text-sm text-primary">A unique reference will be generated on save.</p><label className="flex items-start gap-2 text-sm text-muted mt-3"><input type="checkbox" className="mt-1" checked={approved} onChange={e => setApproved(e.target.checked)} required={isNew} />I confirm this booking is commercially approved and should be created with business status Confirmed.</label></>}</section>}
    {(record || selected || isNew) && <>
      {section("01 · Shipment identification", "Reference and customer details. Commercial status remains Confirmed.", <>{record && <div className="text-sm"><span className="block text-muted text-xs mb-1">Shipment reference</span><strong className="text-gold">{record.ref_no}</strong></div>}<label className="block text-xs text-muted">Transport mode *<select className="input w-full mt-1" value={form.mode} onChange={e => set("mode", e.target.value)}><option value="SEA">Sea Freight</option><option value="AIR">Air Freight</option><option value="Road">Road Freight</option></select></label>{identification.map(field)}</>)}
      <section className="border border-white/10 bg-surface-1 rounded-xl p-4 sm:p-5"><h3 className="font-semibold text-primary mb-1">02 · Route and locations</h3><p className="text-xs text-muted mb-4">Set countries first to narrow location suggestions. Unknown locations can be entered manually.</p><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{endpoint("pol")}{endpoint("pod")}</div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">{routing.map(field)}</div></section>
      {section("03 · Cargo and transport", "Enter declared values with explicit units. Chargeable weight is saved independently.", <>{cargo.map(field)}<label className="block text-xs text-muted">Weight unit *<select className="input w-full mt-1" value={form.weight_unit} onChange={e => set("weight_unit", e.target.value)}><option value="KG">Kilograms (KG)</option><option value="LB">Pounds (LB)</option></select></label><label className="flex items-center gap-2 text-sm text-primary"><input type="checkbox" checked={form.dangerous_goods === "true"} onChange={e => set("dangerous_goods", String(e.target.checked))} />Dangerous goods</label>{(form.mode === "SEA" ? sea : form.mode === "AIR" ? air : road).map(field)}{form.mode === "AIR" && <details className="sm:col-span-2 lg:col-span-3 rounded-lg border border-white/10 p-3"><summary className="cursor-pointer text-sm text-gold">Calculate air volumetric weight</summary><p className="text-xs text-muted mt-2">Centimetres and a carrier-confirmed divisor are required. No divisor is assumed. Calculated result is in KG.</p><div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">{([ ["length", "Length (cm)"], ["width", "Width (cm)"], ["height", "Height (cm)"], ["qty", "Packages"], ["divisor", "Carrier divisor"] ] as const).map(([key, label]) => <label key={key} className="text-xs text-muted">{label}<input type="number" min="0.001" step="any" className="input w-full mt-1" value={volume[key]} onChange={e => setVolume(prev => ({ ...prev, [key]: e.target.value }))} /></label>)}</div><button type="button" className="btn-secondary mt-3" disabled={Object.values(volume).some(value => !Number.isFinite(Number(value)) || Number(value) <= 0)} onClick={() => { const kg = Number(volume.length) * Number(volume.width) * Number(volume.height) * Number(volume.qty) / Number(volume.divisor); const gross = Number(form.gross_weight || 0) * (form.weight_unit === "LB" ? 0.45359237 : 1); const chargeable = Math.max(kg, gross); set("chargeable_weight", (form.weight_unit === "LB" ? chargeable / 0.45359237 : chargeable).toFixed(2)); toast.success(`Volumetric weight: ${kg.toFixed(2)} KG. Chargeable weight updated.`); }}>Apply chargeable weight</button></details>}</>)}
      {section("04 · Schedule", "Schedule dates are calendar dates; overdue ETA uses Qatar’s current date. Estimated and actual dates are stored separately.", schedule.map(field))}
      <section className="border border-white/10 bg-surface-1 rounded-xl p-4 sm:p-5"><h3 className="font-semibold text-primary">05 · Tracking progress and messages</h3><p className="text-xs text-muted mt-1">Publish staff-reported information. Leave unknown locations empty.</p><StageProgress stage={form.track_status} /><label className="block text-xs text-muted max-w-sm">Tracking stage<select className="input w-full mt-1" value={form.track_status} onChange={e => set("track_status", e.target.value)}>{TRACKING_STAGES.map(stage => <option key={stage}>{stage}</option>)}</select></label><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">{tracking.map(field)}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">{([ ["public_message", "Customer-facing tracking message", "Visible on public tracking"], ["internal_notes", "Internal staff notes", "Restricted to authorized staff"] ] as const).map(([key, label, hint]) => <label key={key} className="text-xs text-muted">{label}<textarea className="input w-full mt-1 min-h-24" value={form[key] || ""} onChange={e => set(key, e.target.value)} /><span className={key === "public_message" ? "text-gold" : "text-muted"}>{hint}</span></label>)}</div></section>
      {role === "admin" && section("06 · Internal financial information", "Restricted financial fields. These values are excluded from public tracking.", finances.map(field))}
    </>}
    {error && <div role="alert" className="rounded-lg border border-rose/30 bg-rose/10 p-4 text-sm text-rose">{error}</div>}
  </form></div></Modal>;
}
