"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import CountryAutoSuggest from "@/components/ui/CountryAutoSuggest";
import SearchComboBox from "@/components/ui/SearchComboBox";
import { findCountry } from "@/lib/portCatalog";
import "./freight-dashboard.css";

type Location = { id: string; name: string; country: string; country_name: string; port_name: string; mode: string | null; aliases: string[]; active: boolean };
type Catalog = { locations: Location[]; containers: { code: string; label: string; active: boolean }[]; currencies: string[]; services: string[]; bases: string[] };
type Details = { inclusions: string[]; exclusions: string[]; carrier: string; transit_time: string; remarks: string; quotation_reference: string; surcharge_details: string };
type Rate = { id: string; version: number; operator: string; origin: string; destination: string; origin_id: string; destination_id: string; container_type: string; service: string; basis: string; currency: string; valid_from: string; valid_until: string; base_minor: number; surcharge_minor: number | null; total_minor: number | null; customer_minor: number | null; markup_bps: number; charges_confirmed: boolean; status: string; position?: number; best_minor?: number; details: Details };
type History = { revisions: (Rate & { rate_id: string; created_at: string })[]; audits: { action: string; version: number; created_at: string; details: { reason?: string } }[]; approvals: { version: number; decision: string; reason: string; comparison_date: string; markup_bps: number }[]; attachments: { id: string; version: number; filename: string }[] };
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Qatar", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const blank = () => ({ origin_id: "", destination_id: "", origin_country: "", destination_country: "", container_type: "40HQ", service: "FCL", basis: "PORT_TO_PORT", currency: "USD", valid_from: today(), valid_until: "", price: "", surcharge: "", charges_confirmed: false, inclusions: "Ocean freight", exclusions: "", carrier: "", transit_time: "", remarks: "", quotation_reference: "", surcharge_details: "" });
const amount = (minor: number | null, currency: string) => minor == null ? "Unconfirmed" : `${currency} ${(Number(minor)/100).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const errorMessage = (error: unknown) => (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Unable to complete this action. Please try again.";
const splitTerms = (value: string) => value.split(",").map(v => v.trim()).filter(Boolean);
const timestamp = (value: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Qatar", dateStyle: "medium", timeStyle: "short" }).format(new Date(value.includes("T") ? value : value.replace(" ","T") + "Z"));

export default function FreightDashboard({ admin = false }: { admin?: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const allowed = user?.role === "admin" || (!admin && user?.role === "operator");
  const [catalog, setCatalog] = useState<Catalog>({ locations: [], containers: [], currencies: [], services: [], bases: [] });
  const [rates, setRates] = useState<Rate[]>([]);
  const [filters, setFilters] = useState({ origin: "", destination: "", container: "", operator: "", status: "", date: "", from: "", until: "", sort: "newest" });
  const [offset, setOffset] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [hasWhatsApp, setHasWhatsApp] = useState<boolean | null>(null);
  const [form, setForm] = useState(blank);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Rate | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [historySearch, setHistorySearch] = useState("");
  const [decision, setDecision] = useState<{ rate: Rate; action: string } | null>(null);
  const [reason, setReason] = useState("");
  const [markup, setMarkup] = useState("0");
  const [equipment, setEquipment] = useState({ code: "", label: "", active: true });
  const [location, setLocation] = useState({ id: "", name: "", country: "", aliases: "", active: true });
  useEffect(() => {
    const target = decision ? "fr-decision" : history ? "fr-history" : formOpen ? "fr-form" : null;
    if (target) document.getElementById(target)?.focus();
  }, [decision, history, formOpen]);
  const loadCatalog = useCallback(() => api.get("/freight-rates/catalog").then(r => setCatalog(r.data)), []);
  useEffect(() => { if (allowed) { loadCatalog().catch(e => setError(errorMessage(e))); api.get("/freight-rates/contact-settings").then(r => setHasWhatsApp(!!r.data.national_number)).catch(() => setHasWhatsApp(false)); } }, [allowed, loadCatalog]);
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController(); setBusy(true);
    const timer = setTimeout(() => {
      api.get("/freight-rates", { params: { ...filters, date: filters.date || today(), offset }, signal: controller.signal })
        .then(r => { setRates(r.data.rates); setNextOffset(r.data.nextOffset); })
        .catch(e => { if (!controller.signal.aborted) { setRates([]); setError(errorMessage(e)); } })
        .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    },250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [allowed, filters, offset, reload]);
  useEffect(() => { const timer = setInterval(() => setReload(n => n+1),60000); return () => clearInterval(timer); }, []);
  const updateFilter = (key: string, value: string) => { setOffset(0); setFilters(f => ({ ...f, [key]: value })); };
  const update = (key: string, value: string | boolean) => setForm(f => ({ ...f, [key]: value }));
  function edit(rate: Rate) {
    setEditing(rate); setFile(null); setFormOpen(true); setError(""); setNotice("");
    setForm({ ...blank(), ...rate.details, inclusions: rate.details.inclusions.join(", "), exclusions: rate.details.exclusions.join(", "),
      origin_id: rate.origin_id, destination_id: rate.destination_id, container_type: rate.container_type, service: rate.service, basis: rate.basis,
      origin_country: findCountry(catalog.locations.find(l => l.id === rate.origin_id)?.country || "")?.name || "",
      destination_country: findCountry(catalog.locations.find(l => l.id === rate.destination_id)?.country || "")?.name || "",
      currency: rate.currency, valid_from: rate.valid_from, valid_until: rate.valid_until, price: (rate.base_minor/100).toFixed(2),
      surcharge: rate.surcharge_minor == null ? "" : (rate.surcharge_minor/100).toFixed(2), charges_confirmed: !!rate.charges_confirmed });
  }
  async function uploadFile(id: string, version: number, attachment: File) {
    const data = new FormData(); data.append("file",attachment); data.append("version",String(version));
    await api.post(`/freight-rates/${id}/attachments`,data,{ headers: { "Content-Type": "multipart/form-data" } });
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const body = { ...form, inclusions: splitTerms(form.inclusions), exclusions: splitTerms(form.exclusions), version: editing?.version };
      const response = editing ? await api.put(`/freight-rates/${editing.id}`,body) : await api.post("/freight-rates",body);
      const saved = response.data;
      setFormOpen(false); setEditing(null); setReload(n => n+1); setNotice(`Revision ${saved.version} saved. The cheapest eligible rates appear automatically.`);
      if (file) {
        try { await uploadFile(saved.id,saved.version,file); }
        catch (e) { setError(`Rate was saved, but attachment upload failed: ${errorMessage(e)} Use History to retry.`); }
      }
      setFile(null);
    } catch (e) { setError(errorMessage(e)); } finally { setSaving(false); }
  }
  async function submitDecision(event: FormEvent) {
    event.preventDefault(); if (!decision) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const result = await api.post(`/freight-rates/${decision.rate.id}/decision`, { action: decision.action, version: decision.rate.version, date: filters.date || today(), markup_bps: Math.round(Number(markup)*100), reason });
      setNotice(`Rate ${result.data.status}. Public rates are recalculated immediately.`); setDecision(null); setReload(n => n+1);
    } catch (e) { setError(errorMessage(e)); setReload(n => n+1); } finally { setSaving(false); }
  }
  async function showHistory(rate: Rate) {
    setError("");
    try { const { data } = await api.get(`/freight-rates/${rate.id}/history`); setHistory(data); setHistorySearch(""); }
    catch (e) { setError(errorMessage(e)); }
  }
  async function download(id: string, filename: string) {
    try {
      const { data } = await api.get(`/freight-rates/attachments/${id}`,{ responseType: "blob" });
      const url = URL.createObjectURL(data); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
    } catch (e) { setError(errorMessage(e)); }
  }
  async function configure(event: FormEvent, type: string) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await api.post(`/freight-rates/config/${type}`,type === "containers" ? equipment : { ...location, aliases: splitTerms(location.aliases) });
      await loadCatalog(); setReload(n => n+1); setNotice("Configuration saved.");
    } catch (e) { setError(errorMessage(e)); } finally { setSaving(false); }
  }
  function choose(rate: Rate, action: string) { setDecision({ rate, action }); setReason(""); setMarkup(String(rate.markup_bps/100)); setNotice(""); }
  const input = (label: string, key: keyof ReturnType<typeof blank>, type = "text", required = false) => <label>{label}<input type={type} required={required} maxLength={500} step={type === "number" ? ".01" : undefined} min={type === "number" ? "0" : undefined} value={String(form[key])} onChange={e => update(key,e.target.value)} /></label>;
  const select = (label: string, key: keyof ReturnType<typeof blank>, choices: { value: string; label: string }[]) => <label>{label}<select required value={String(form[key])} onChange={e => update(key,e.target.value)}><option value="">Select…</option>{choices.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>;
  return <AppLayout title={admin ? "Freight Rate Comparison" : "My Freight Rates"} subtitle="Weekly prices · Asia/Qatar" action={allowed ? <button className="fr-button" onClick={() => { setEditing(null); setForm(blank()); setFile(null); setFormOpen(true); }}>+ Add New Rate</button> : undefined}>
    <div className="fr-dashboard">
      {authLoading ? <p>Checking access…</p> : !allowed ? <p role="alert">{admin ? "Administrator" : "Operator"} access is required. <a href="/login">Log in</a></p> : <>
        {error && <div className="fr-alert" role="alert">{error}<button onClick={() => setError("")}>Dismiss</button></div>}
        {notice && <p role="status" className="fr-notice">{notice}</p>}
        {hasWhatsApp === false && <p className="fr-notice">Add your business WhatsApp number in <a href="/settings" className="underline">Settings</a> so customers can request quotes for your rates.</p>}
        {formOpen && <section id="fr-form" tabIndex={-1} className="fr-card" aria-label="Add or revise freight rate"><h2>{editing ? `Revise rate · version ${editing.version}` : "Add New Rate"}</h2>
          <p>Enter the cost per container. All mandatory charges must be known before ranking or publication. Eligible prices are published automatically; edits take effect immediately.</p>
          <form onSubmit={save}><div className="fr-grid">
            {input("Valid From", "valid_from", "date", true)}{input("Valid Until", "valid_until", "date", true)}
          </div><div className="fr-route-grid">
            {(["origin","destination"] as const).map(side => <div className="fr-route-fields" key={side}>
              <label>{side === "origin" ? "Origin Country" : "Destination Country"}<CountryAutoSuggest strict required label={side === "origin" ? "Origin Country" : "Destination Country"}
                value={form[`${side}_country`]} onChange={value => setForm(f => ({ ...f, [`${side}_country`]:value, [`${side}_id`]:"" }))} /></label>
              <label>{side === "origin" ? "POL · Origin Port" : "POD · Destination Port"}<SearchComboBox key={form[`${side}_country`]} required
                label={side === "origin" ? "POL · Origin Port" : "POD · Destination Port"} value={form[`${side}_id`]} onChange={value => {
                  const port = catalog.locations.find(l => l.id === value);
                  setForm(f => ({ ...f, [`${side}_id`]:value, ...(port ? { [`${side}_country`]:findCountry(port.country)?.name || port.country_name } : {}) }));
                }} placeholder="Type a port name…" emptyMessage="No seaports match this country and search."
                options={catalog.locations.filter(l => l.active && l.mode !== "AIR" && (!form[`${side}_country`] || l.country === findCountry(form[`${side}_country`])?.code)).map(l => ({ value:l.id,label:l.port_name || l.name,description:l.country_name,kind:l.mode === "SEA" ? "Seaport" : "Location",searchText:[l.id,...l.aliases].join(" ") }))} />
              </label>
            </div>)}
          </div><p className="fr-route-help">Choose a country, then search its ports. Container freight uses seaports.</p><div className="fr-grid">
            {select("Container", "container_type",catalog.containers.filter(c => c.active).map(c => ({ value:c.code,label:`${c.code} · ${c.label}` })))}
            {input("Freight rate", "price", "number", true)}{select("Currency", "currency",catalog.currencies.map(value => ({value,label:value})))}
            {select("Freight service", "service",catalog.services.map(value => ({value,label:value.replaceAll("_"," ")})))}
            {select("Shipment basis", "basis",catalog.bases.map(value => ({value,label:value.replaceAll("_"," ")})))}
            {input("Mandatory surcharges (same currency)", "surcharge", "number")}
            {input("Included charges (comma separated)", "inclusions", "text", true)}{input("Excluded charges (comma separated)", "exclusions")}{input("Surcharge details", "surcharge_details")}
          </div>
          <label className="fr-check"><input type="checkbox" checked={form.charges_confirmed} onChange={e => update("charges_confirmed",e.target.checked)} /> All mandatory charges for this service and basis are included in the total; enter 0 explicitly if there are no surcharges. Exclusions above are outside this service scope.</label>
          <details className="fr-extra"><summary>Carrier, transit time, references and attachments</summary><div className="fr-grid">
            {input("Carrier / shipping line (private)", "carrier")}{input("Transit time", "transit_time")}{input("Quotation reference (private)", "quotation_reference")}{input("Remarks (private)", "remarks")}
            <label>Supplier quote attachment · PDF up to 5 MB<input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} /></label>
          </div></details><div className="fr-actions"><button disabled={saving} type="submit">{saving ? "Saving…" : "Save rate"}</button><button type="button" disabled={saving} onClick={() => setFormOpen(false)}>Cancel</button></div></form>
        </section>}
        <section className="fr-card"><h2>{admin ? "Compare operator offers" : "My submissions & history"}</h2>
          <p>{admin ? "BEST RATE compares confirmed procurement totals within identical ports, equipment, service, terms and currency. Differences show potential savings against that group’s lowest cost. The cheapest eligible customer price is published automatically. You can archive inaccurate offers or configure an explicit commercial markup." : "Your eligible rates compete automatically. The best price is public; supplier details and revision history remain private. Edits update the comparison immediately."}</p>
          <div className="fr-grid fr-filters">
            {[['origin','Search Origin'],['destination','Search Destination'],...(admin ? [['operator','Operator']] : [])].map(([key,label]) => <label key={key}>{label}<input type="search" value={filters[key as keyof typeof filters]} onChange={e => updateFilter(key,e.target.value)} /></label>)}
            <label>Equipment<select value={filters.container} onChange={e => updateFilter("container",e.target.value)}><option value="">All equipment</option>{catalog.containers.map(c => <option key={c.code}>{c.code}</option>)}</select></label>
            <label>Compare on date<input type="date" value={filters.date || today()} onChange={e => updateFilter("date",e.target.value)} /></label>
            <label>Status<select value={filters.status} onChange={e => updateFilter("status",e.target.value)}><option value="">All statuses</option>{["active","withdrawn","archived","rejected"].map(s => <option key={s}>{s}</option>)}</select></label>
            <label>Validity overlaps from<input type="date" value={filters.from} onChange={e => updateFilter("from",e.target.value)} /></label>
            <label>Validity overlaps until<input type="date" value={filters.until} onChange={e => updateFilter("until",e.target.value)} /></label>
            <label>Sort<select value={filters.sort} onChange={e => updateFilter("sort",e.target.value)}><option value="newest">Recently updated</option><option value="route">Route</option><option value="price">Currency / price</option></select></label>
          </div>
          <div className="fr-table-scroll" tabIndex={0} role="region" aria-label="Freight submissions" aria-busy={busy}><table><thead><tr>{[...(admin ? ['Operator'] : []),'Route / basis','Equipment','Procurement total','Validity','Status',...(admin ? ['Comparison'] : []),'Actions'].map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>
            {rates.map(rate => <tr key={rate.id} className={admin && Number(rate.position) === 1 ? "fr-best" : ""}>
              {admin && <td>{rate.operator}</td>}<td><strong>{rate.origin} → {rate.destination}</strong><small>{rate.service} · {rate.basis.replaceAll("_"," ")}</small><details><summary>Terms & charges</summary><p>Base: {amount(rate.base_minor,rate.currency)}<br />Surcharges: {amount(rate.surcharge_minor,rate.currency)}<br />Includes: {rate.details.inclusions.join(", ")}<br />Excludes: {rate.details.exclusions.join(", ") || "None"}<br />{rate.details.surcharge_details}<br />Carrier: {rate.details.carrier || "—"}<br />Reference: {rate.details.quotation_reference || "—"}</p></details></td>
              <td>{rate.container_type}</td><td>{amount(rate.total_minor,rate.currency)}{rate.status === "active" && <small>Customer: {amount(rate.customer_minor,rate.currency)}<br />Markup: {rate.markup_bps/100}%</small>}</td>
              <td>{rate.valid_from}<small>through {rate.valid_until}</small></td><td>{rate.status}<small>revision {rate.version}</small></td>
              {admin && <td>{Number(rate.position) === 1 ? <strong className="fr-best-label">BEST RATE</strong> : rate.position ? `+${amount(Number(rate.total_minor)-Number(rate.best_minor),rate.currency)}` : "Not eligible on date"}</td>}
              <td><div className="fr-row-actions">{rate.status !== "archived" && <><button onClick={() => edit(rate)}>Edit</button><button onClick={() => choose(rate,"withdraw")} disabled={rate.status === "withdrawn"}>Withdraw</button></>}<button onClick={() => showHistory(rate)}>History</button>
                {admin && rate.status !== "archived" && <><button onClick={() => choose(rate,"markup")}>Set markup</button><button onClick={() => choose(rate,"archive")}>Archive</button></>}
              </div></td>
            </tr>)}
          </tbody></table>{!rates.length && <p className="fr-empty">{busy ? "Loading submissions…" : "No matching submissions."}</p>}</div>
          <div className="fr-actions"><button disabled={busy || offset === 0} onClick={() => setOffset(Math.max(0,offset-50))}>Previous</button><span>Page {Math.floor(offset/50)+1}</span><button disabled={busy || nextOffset == null} onClick={() => setOffset(nextOffset || 0)}>Next</button><button onClick={() => setReload(n => n+1)}>Refresh</button></div>
        </section>
        {decision && <section id="fr-decision" tabIndex={-1} className="fr-card" aria-label="Review publication decision"><h2>{decision.action === "markup" ? "Change commercial markup" : decision.action} · {decision.rate.origin} → {decision.rate.destination}</h2>
          <p>Revision {decision.rate.version} · {amount(decision.rate.total_minor,decision.rate.currency)} · comparison date {filters.date || today()}. Changes take effect immediately for this revision.</p>
          <form onSubmit={submitDecision}><div className="fr-grid">{decision.action === "markup" && <label>Explicit commercial markup (%) · 0 means none<input type="number" min="0" max="100" step=".01" required value={markup} onChange={e => setMarkup(e.target.value)} /><small>Customer price: {amount(Math.ceil(Number(decision.rate.total_minor)*(10000+Math.round(Number(markup)*100))/10000),decision.rate.currency)}</small></label>}<label>Decision note<input maxLength={500} value={reason} onChange={e => setReason(e.target.value)} required={decision.action === "archive"} /></label></div>
            <div className="fr-actions"><button disabled={saving}>Confirm {decision.action}</button><button type="button" disabled={saving} onClick={() => setDecision(null)}>Cancel</button></div></form>
        </section>}
        {history && <section id="fr-history" tabIndex={-1} className="fr-card"><div className="fr-actions"><h2>Submission history</h2><button onClick={() => setHistory(null)}>Close history</button></div><label>Search revisions<input type="search" value={historySearch} onChange={e => setHistorySearch(e.target.value)} /></label>
          {history.revisions.filter(r => JSON.stringify(r).toLowerCase().includes(historySearch.toLowerCase())).map(r => <details key={r.version}><summary>Revision {r.version} · {amount(r.total_minor,r.currency)} · {timestamp(r.created_at)}</summary><p>{r.origin_id} → {r.destination_id} · {r.container_type} · {r.valid_from} to {r.valid_until}<br />{r.service} · {r.basis}<br />Includes: {r.details.inclusions.join(", ")}<br />Excludes: {r.details.exclusions.join(", ") || "None"}<br />Carrier: {r.details.carrier || "—"} · {r.details.quotation_reference}<br />{r.details.remarks}</p></details>)}
          <h3>Decisions & audit trail</h3>{history.audits.map((a,i) => <p key={i}>Revision {a.version} · {a.action} · {timestamp(a.created_at)} {a.details.reason && `— ${a.details.reason}`}</p>)}
          {history.approvals.map((a,i) => <p key={i}>{a.decision} · revision {a.version} · compared {a.comparison_date} · markup {a.markup_bps/100}% · {a.reason}</p>)}
          <h3>Private attachments</h3>{history.attachments.map(a => <p key={a.id}><button onClick={() => download(a.id,a.filename)}>{a.filename} · revision {a.version}</button></p>)}
          <label>Add PDF to current active revision<input type="file" accept="application/pdf" disabled={saving} onChange={async e => {
            const attachment = e.target.files?.[0], revision = history.revisions[0]; if (!attachment || !revision) return;
            setSaving(true);
            try { await uploadFile(revision.rate_id,revision.version,attachment); setNotice("Attachment uploaded. Reopen History to see it."); setHistory(null); }
            catch (err) { setError(errorMessage(err)); } finally { setSaving(false); }
          }} /></label>
        </section>}
        {admin && <section className="fr-card"><details><summary>Equipment & location configuration</summary><p>Disable inaccurate equipment or locations to immediately hide their offers. Use verified facility IDs; do not merge distinct ports.</p>
          <form onSubmit={e => configure(e,"containers")}><h3>Equipment</h3><div className="fr-grid"><label>Code<input required list="fr-equipment" value={equipment.code} onChange={e => { const c = catalog.containers.find(c => c.code === e.target.value); setEquipment(c ? { ...c, active: !!c.active } : { ...equipment,code:e.target.value }); }} /><datalist id="fr-equipment">{catalog.containers.map(c => <option key={c.code}>{c.code}</option>)}</datalist></label><label>Label<input required value={equipment.label} onChange={e => setEquipment({ ...equipment,label:e.target.value })} /></label><label className="fr-check"><input type="checkbox" checked={equipment.active} onChange={e => setEquipment({ ...equipment,active:e.target.checked })} />Active</label></div><button disabled={saving}>Save equipment</button></form>
          <form onSubmit={e => configure(e,"locations")}><h3>Locations</h3><div className="fr-grid"><label>Stable facility ID / UN/LOCODE<input required list="fr-locations-config" value={location.id} onChange={e => { const l = catalog.locations.find(l => l.id === e.target.value); setLocation(l ? { ...l, aliases:l.aliases.join(", "),active:!!l.active } : { ...location,id:e.target.value }); }} /><datalist id="fr-locations-config">{catalog.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</datalist></label>
            {([['name','Facility name'],['country','Country (2-letter code)'],['aliases','Search aliases, comma separated']] as const).map(([key,label]) => <label key={key}>{label}<input required={key !== 'aliases'} value={location[key]} onChange={e => setLocation({ ...location,[key]:e.target.value })} /></label>)}<label className="fr-check"><input type="checkbox" checked={location.active} onChange={e => setLocation({ ...location,active:e.target.checked })} />Active</label></div><button disabled={saving}>Save location</button></form>
        </details></section>}
      </>}
    </div>
  </AppLayout>;
}
