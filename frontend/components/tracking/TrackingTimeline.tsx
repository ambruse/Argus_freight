"use client";
import { FormEvent, useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { apiError, displayDate, TrackingEvent, TrackingRecord } from "./model";
import { StageBadge } from "./TrackingStage";

const blank = { event_title: "", event_description: "", location_name: "", location_country: "", event_time: "", is_public: true, correction_reason: "" };
export default function TrackingTimeline({ record, role, onClose, onSaved }: { record: TrackingRecord; role: string; onClose: () => void; onSaved: () => void }) {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [audits, setAudits] = useState<Record<string, any>[]>([]);
  const [form, setForm] = useState(blank);
  const dirty = adding && JSON.stringify(form) !== JSON.stringify(blank);
  const load = async () => { setLoading(true); try { const { data } = await api.get(`/shipments/${encodeURIComponent(record.ref_no)}/tracking/events`); setEvents(data.data || data.events || []); } catch (err) { setError(apiError(err, "Could not load tracking events.")); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [record.ref_no]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const handler = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } }; window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler); }, [dirty]);
  const close = () => { if (!saving && (!dirty || window.confirm("Discard the unsaved tracking event?"))) onClose(); };
  const openAudit = async () => {
    setAuditOpen(true); setAuditLoading(true); setError("");
    try { const { data } = await api.get(`/shipments/${encodeURIComponent(record.ref_no)}/tracking/audit`); setAudits(data.data || []); }
    catch (err) { setError(apiError(err, "Could not load the change audit.")); }
    finally { setAuditLoading(false); }
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const { correction_reason, ...eventFields } = form;
      const payload = { ...eventFields, event_time: new Date(`${form.event_time}:00Z`).toISOString(), ...(editing ? { correction_reason } : {}) };
      if (editing) await api.patch(`/shipments/${encodeURIComponent(record.ref_no)}/tracking/events/${editing}`, payload);
      else await api.post(`/shipments/${encodeURIComponent(record.ref_no)}/tracking/events`, payload);
      toast.success(editing ? "Event correction recorded." : "Tracking event recorded."); setForm(blank); setAdding(false); setEditing(null); await load(); onSaved();
    } catch (err) { setError(apiError(err, "Could not save the event.")); } finally { setSaving(false); }
  };
  return <Modal isOpen onClose={close} title={`Tracking history · ${record.ref_no}`} size="lg"><div className="flex flex-wrap items-center justify-between gap-3 mb-5"><StageBadge stage={record.track_status} /><div className="flex flex-wrap gap-2">{role === "admin" && <button type="button" className="btn-secondary" disabled={adding || auditLoading} onClick={() => auditOpen ? setAuditOpen(false) : openAudit()}>{auditOpen ? "View event timeline" : "View change audit"}</button>}<button type="button" className="btn-secondary" disabled={adding || auditOpen} onClick={() => { setForm(blank); setEditing(null); setAdding(true); }}>+ Record event</button></div></div><p className="text-xs text-muted mb-4">Event times are shown in UTC. Recording an observation does not change the shipment’s current stage. Use Update Tracking to change progress.</p>{error && <p role="alert" className="text-rose text-sm p-3 mb-3 rounded-lg bg-rose/10">{error}</p>}
    {adding && <form onSubmit={save} className="rounded-xl border border-gold/20 bg-gold/5 p-4 mb-6 space-y-4"><h3 className="font-medium text-primary">{editing ? "Correct event with audit trail" : "Record shipment event"}</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{([ ["event_title", "Event title", "text"], ["event_time", "Occurred at (UTC)", "datetime-local"], ["location_name", "Reported location", "text"], ["location_country", "Country", "text"] ] as const).map(([key, label, type]) => <label key={key} className="block text-xs text-muted">{label}{["event_title", "event_time"].includes(key) && " *"}<input className="input w-full mt-1" required={["event_title", "event_time"].includes(key)} type={type} value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} /></label>)}</div><label className="block text-xs text-muted">Description<textarea className="input w-full mt-1 min-h-20" value={form.event_description} onChange={e => setForm(prev => ({ ...prev, event_description: e.target.value }))} /></label>{editing && <label className="block text-xs text-muted">Reason for correction *<input className="input w-full mt-1" required value={form.correction_reason} onChange={e => setForm(prev => ({ ...prev, correction_reason: e.target.value }))} /></label>}<label className="flex items-center gap-2 text-sm text-primary"><input type="checkbox" checked={form.is_public} onChange={e => setForm(prev => ({ ...prev, is_public: e.target.checked }))} />Visible to customer on public tracking</label><div className="flex gap-2"><button className="btn-primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save correction" : "Save event"}</button><button className="btn-secondary" type="button" disabled={saving} onClick={() => { if (!dirty || window.confirm("Discard the unsaved event?")) { setAdding(false); setEditing(null); setForm(blank); } }}>Cancel</button></div></form>}
    {auditOpen ? <section aria-label="Administrative change audit"><p className="text-xs text-muted mb-3">Latest 500 administrative changes. Original event values and correction reasons are retained in this private audit.</p>{auditLoading ? <p role="status" className="p-8 text-muted text-center">Loading audit…</p> : !audits.length ? <p className="p-8 text-muted text-center">No recorded administrative changes.</p> : <ol className="space-y-3">{audits.map(item => <li key={item.id} className="rounded-lg border border-white/10 p-4"><p className="font-medium text-primary text-sm">{String(item.field_name).replace(/_/g, " ")}</p><p className="text-xs text-muted mt-1">{displayDate(item.created_at, true)} UTC · Staff ID {item.created_by}</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">{[["previous_value", "Previous value"], ["new_value", "New value"]].map(([key, label]) => <div key={key}><p className="text-[10px] text-muted uppercase">{label}</p><pre className="text-xs text-primary bg-surface-2 rounded p-2 mt-1 whitespace-pre-wrap break-all">{typeof item[key] === "object" ? JSON.stringify(item[key], null, 2) : String(item[key] ?? "Not set")}</pre></div>)}</div></li>)}</ol>}</section> : loading ? <p role="status" className="p-8 text-muted text-center">Loading tracking history…</p> : !events.length ? <div className="p-8 border border-dashed border-white/15 rounded-xl text-center"><h3 className="text-primary">No recorded tracking events</h3><p className="text-sm text-muted mt-2">Legacy shipment history has not been reconstructed. Record a verified event to start the history.</p></div> : <ol className="space-y-4">{[...events].sort((a, b) => a.event_time.localeCompare(b.event_time)).map(event => <li key={event.id} className="border-l-2 border-gold/40 pl-4 py-1"><div className="flex justify-between gap-3"><div><p className="font-medium text-primary">{event.event_title} {!event.is_public && <span className="ml-2 text-xs text-amber">Internal</span>}</p><p className="text-xs text-muted mt-1">{displayDate(event.event_time, true)} UTC{event.location_name ? ` · ${event.location_name}` : ""}{event.location_country ? `, ${event.location_country}` : ""}</p></div>{role === "admin" && <button className="text-xs text-gold self-start" disabled={adding} onClick={() => { setEditing(event.id); setAdding(true); setForm({ event_title: event.event_title, event_description: event.event_description || "", location_name: event.location_name || "", location_country: event.location_country || "", event_time: event.event_time.replace(" ", "T").slice(0, 16), is_public: !!event.is_public, correction_reason: "" }); }}>Correct</button>}</div>{event.event_description && <p className="text-sm text-muted mt-2 whitespace-pre-wrap">{event.event_description}</p>}<p className="text-[11px] text-muted mt-2">Recorded {displayDate(event.created_at, true)} UTC{event.source ? ` · ${event.source}` : ""}</p></li>)}</ol>}
  </Modal>;
}
