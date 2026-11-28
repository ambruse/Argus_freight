"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownUp, ArrowRight, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, ExternalLink, Filter, Plus, RefreshCw, Search, Ship, X } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import toast from "react-hot-toast";
import TrackingEditor from "@/components/tracking/TrackingEditor";
import TrackingTimeline from "@/components/tracking/TrackingTimeline";
import { StageBadge, StageProgress } from "@/components/tracking/TrackingStage";
import { apiError, csvCell, displayDate, FINANCIAL_FIELDS, isOverdue, missingFields, TRACKING_STAGES, TrackingRecord, trackingUrl } from "@/components/tracking/model";

const cards = [["total", "Total confirmed"], ["confirmed", "Awaiting scheduling"], ["scheduled", "Scheduled"], ["in_transit", "In transit"], ["clearance", "Under clearance"], ["warehouse", "At warehouse"], ["delivered", "Delivered"], ["overdue", "Overdue ETA"]];
const columns = [["ref_no", "Shipment reference"], ["cust_req_no", "Customer request"], ["customer_name", "Customer"], ["pol", "POL"], ["pod", "POD"], ["pol_country", "POL country"], ["pod_country", "POD country"], ["mode", "Mode"], ["commodity", "Commodity"], ["carrier", "Carrier"], ["bl_number", "BL / AWB"], ["chargeable_weight", "Chargeable weight"], ["etd", "ETD"], ["eta", "ETA"], ["track_status", "Tracking stage"], ["updated_at", "Last updated"]];
const filterFields = [["ref_no", "Shipment reference"], ["customer_name", "Customer name"], ["cust_req_no", "Customer request"], ["bl_number", "BL / AWB number"], ["pol", "POL"], ["pod", "POD"], ["pol_country", "Origin country"], ["pod_country", "Destination country"], ["carrier", "Carrier"]];
type Filters = Record<string, string>;
type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

export default function ShipmentTrackingPage() {
  const { user, loading: authLoading } = useAuth();
  const allowed = !!user && ["admin", "operator", "tracker"].includes(user.role);
  const [rows, setRows] = useState<TrackingRecord[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filters, setFilters] = useState<Filters>({});
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("updated_at");
  const [order, setOrder] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [creationMethod, setCreationMethod] = useState<"existing" | "new">("existing");
  const [editor, setEditor] = useState<TrackingRecord | "new" | null>(null);
  const [detail, setDetail] = useState<TrackingRecord | null>(null);
  const [timeline, setTimeline] = useState<TrackingRecord | null>(null);
  const [quick, setQuick] = useState<TrackingRecord | "bulk" | null>(null);
  const [quickStage, setQuickStage] = useState("");
  const [quickEta, setQuickEta] = useState("");
  const [quickMessage, setQuickMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ ref_no: string; success: boolean; message?: string }[]>([]);
  const [exporting, setExporting] = useState(false);
  const [revision, setRevision] = useState(0);
  const request = useRef(0);
  useEffect(() => { if (allowed && new URLSearchParams(window.location.search).get("create") === "1") { setCreationMethod("new"); setEditor("new"); window.history.replaceState(null, "", window.location.pathname); } }, [allowed]);
  useEffect(() => { const timer = setTimeout(() => { setFilters(prev => ({ ...prev, q: query })); setPage(1); }, 350); return () => clearTimeout(timer); }, [query]);
  const reload = useCallback(() => { setRevision(value => value + 1); }, []);
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    const current = ++request.current;
    setLoading(true); setError("");
    api.get("/shipments/tracking", { params: { ...filters, page, pageSize, sort, order }, signal: controller.signal }).then(({ data }) => {
      if (current !== request.current) return;
      setRows(data.data || []); setSummary(data.summary || {}); setPagination(data.pagination || { page, pageSize, total: 0, totalPages: 0 }); setSelected([]);
    }).catch(err => { if (err.code !== "ERR_CANCELED" && current === request.current) { setRows([]); setError(apiError(err, "Could not load shipments. Try refreshing.")); } }).finally(() => { if (current === request.current && !controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [allowed, filters, page, pageSize, sort, order, revision]);
  const filter = (key: string, value: string) => { setFilters(prev => ({ ...prev, [key]: value })); setPage(1); };
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const openRecord = async (row: TrackingRecord, destination: "edit" | "detail") => {
    try { const { data } = await api.get(`/shipments/tracking/${encodeURIComponent(row.ref_no)}`); destination === "edit" ? setEditor(data.data) : setDetail(data.data); }
    catch (err) { toast.error(apiError(err, "Could not load shipment details.")); }
  };
  const copy = async (row: TrackingRecord) => { try { await navigator.clipboard.writeText(trackingUrl(row.ref_no)); toast.success("Public tracking link copied."); } catch { toast.error("Clipboard unavailable. Use Preview to open the tracking link."); } };
  const startQuick = (row: TrackingRecord | "bulk") => { setQuick(row); setQuickStage(row === "bulk" ? "" : row.track_status || "Confirmed"); setQuickEta(""); setQuickMessage(""); setBulkResults([]); };
  const saveQuick = async () => {
    if (!quick) return;
    const changes: Record<string, string> = {};
    if (quickStage) changes.track_status = quickStage;
    if (quickEta) changes.eta = quickEta;
    if (quickMessage.trim()) changes.public_message = quickMessage.trim();
    if (!Object.keys(changes).length) { toast.error("Choose a stage, ETA or message to update."); return; }
    setSaving(true);
    try {
      if (quick === "bulk") {
        const { data } = await api.post("/shipments/tracking/bulk", { references: selected, changes });
        const results = data.results || data.data || [];
        setBulkResults(results); toast.success(`${results.filter((result: any) => result.success).length} of ${selected.length} shipments updated.`);
      } else { await api.patch(`/shipments/${encodeURIComponent(quick.ref_no)}/tracking`, changes); toast.success("Tracking updated."); setQuick(null); }
      reload();
    } catch (err) { toast.error(apiError(err, "Could not update tracking.")); } finally { setSaving(false); }
  };
  const exportCsv = async () => {
    setExporting(true);
    try {
      const exported: TrackingRecord[] = []; let next = 1, pages = 1;
      do { const { data } = await api.get("/shipments/tracking", { params: { ...filters, page: next, pageSize: 100, sort, order } }); exported.push(...(data.data || [])); pages = data.pagination?.totalPages || 1; next++; } while (next <= pages);
      const csv = [columns.map(([, label]) => csvCell(label)).join(","), ...exported.map(row => columns.map(([key]) => csvCell(row[key])).join(","))].join("\r\n");
      const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })); const link = document.createElement("a"); link.href = url; link.download = `argus-tracking-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url); toast.success(`Exported ${exported.length} shipments.`);
    } catch (err) { toast.error(apiError(err, "Could not export shipments.")); } finally { setExporting(false); }
  };
  if (authLoading) return <AppLayout title="Shipment Tracking Management"><p className="p-8 text-muted">Checking access…</p></AppLayout>;
  if (!allowed) return <AppLayout title="Shipment Tracking Management"><div role="alert" className="p-8 rounded-xl border border-white/10 text-muted">Shipment tracking management is available to authorized operations staff.</div></AppLayout>;
  return <AppLayout title="Shipment Tracking Management" subtitle="Operations · Confirmed cargo, schedules and customer updates" action={<button className="btn-primary flex items-center gap-2" onClick={() => { setCreationMethod("existing"); setEditor("new"); }}><Plus size={16} />Add Shipment to Tracking</button>}>
    <div className="space-y-6 pb-8">
      <section className="rounded-2xl border border-gold/20 bg-gradient-to-r from-gold/10 to-surface-1 p-5 sm:p-6"><div className="flex items-start gap-4"><div className="p-3 rounded-xl bg-gold/10 text-gold"><Ship size={24} /></div><div><p className="text-xs font-medium tracking-widest uppercase text-gold mb-2">Operations workspace</p><h2 className="text-xl font-semibold text-primary">Every shipment. One clear view.</h2><p className="text-sm text-muted mt-2 max-w-2xl">Manage confirmed cargo, publish verified milestones and keep customers informed. {user.role === "operator" ? "Showing shipments assigned to you." : "Showing eligible confirmed shipments across operations."}</p></div></div></section>
      <section aria-label="Shipment summary" className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">{cards.map(([key, label]) => <div key={key} className={`rounded-xl border p-4 ${key === "overdue" && summary[key] ? "border-rose/30 bg-rose/5" : "border-white/10 bg-surface-1"}`}><p className="text-xs text-muted leading-5 min-h-10">{label}</p><p className={`text-2xl font-semibold mt-2 tabular-nums ${key === "overdue" && summary[key] ? "text-rose" : "text-primary"}`}>{loading && !rows.length ? "—" : (summary[key] || 0).toLocaleString()}</p></div>)}</section>
      <section className="rounded-2xl border border-white/10 bg-surface-1 overflow-hidden" aria-label="Confirmed shipment list">
        <div className="p-4 sm:p-5 border-b border-white/10 space-y-4"><div className="flex flex-wrap items-center gap-3"><label className="relative flex-1 min-w-48"><span className="sr-only">Search confirmed shipments</span><Search size={16} className="absolute left-3 top-3.5 text-muted" /><input className="input w-full pl-10" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search references, customers or BL / AWB…" /></label><button className="btn-secondary flex items-center gap-2" aria-expanded={showFilters} aria-controls="tracking-filters" onClick={() => setShowFilters(!showFilters)}><Filter size={15} />Filters {activeFilters > 0 && <span className="text-gold">({activeFilters})</span>}<ChevronDown size={14} /></button><button className="btn-secondary flex items-center gap-2" onClick={exportCsv} disabled={exporting || loading}><Download size={15} />{exporting ? "Exporting…" : "Export CSV"}</button><button className="btn-secondary" aria-label="Refresh shipments" disabled={loading} onClick={reload}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></button></div>
          {showFilters && <div id="tracking-filters" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">{filterFields.map(([key, label]) => <label key={key} className="text-xs text-muted">{label}<input className="input w-full mt-1" value={filters[key] || ""} onChange={e => filter(key, e.target.value)} /></label>)}<label className="text-xs text-muted">Transport mode<select className="input w-full mt-1" value={filters.mode || ""} onChange={e => filter("mode", e.target.value)}><option value="">All modes</option><option value="SEA">Sea Freight</option><option value="AIR">Air Freight</option><option value="Road">Road Freight</option></select></label><label className="text-xs text-muted">Tracking stage<select className="input w-full mt-1" value={filters.track_status || ""} onChange={e => filter("track_status", e.target.value)}><option value="">All stages</option>{TRACKING_STAGES.map(stage => <option key={stage}>{stage}</option>)}</select></label>{[["etd_from", "ETD from"], ["etd_to", "ETD to"], ["eta_from", "ETA from"], ["eta_to", "ETA to"]].map(([key, label]) => <label key={key} className="text-xs text-muted">{label}<input type="date" className="input w-full mt-1" value={filters[key] || ""} onChange={e => filter(key, e.target.value)} /></label>)}<label className="text-xs text-muted">Recently updated<select className="input w-full mt-1" value={filters.recent_days || ""} onChange={e => filter("recent_days", e.target.value)}><option value="">Any time</option><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></label><label className="text-sm text-muted flex items-center gap-2"><input type="checkbox" checked={filters.overdue === "true"} onChange={e => filter("overdue", e.target.checked ? "true" : "")} />Overdue ETA only</label><button className="btn-secondary flex items-center justify-center gap-2" onClick={() => { setFilters({}); setQuery(""); setPage(1); }}><X size={14} />Reset filters</button><p className="text-xs text-muted self-center">Overdue means ETA is before today in Qatar, excluding delivered shipments and missing ETA.</p></div>}
          {selected.length > 0 && <div className="flex flex-wrap items-center gap-3 rounded-lg bg-gold/10 p-3"><span className="text-sm text-primary">{selected.length} selected on this page</span><button className="btn-secondary text-xs" onClick={() => startQuick("bulk")}>Bulk update tracking</button><button className="text-xs text-muted" onClick={() => setSelected([])}>Clear selection</button></div>}
        </div>
        {error && <div role="alert" className="m-4 p-4 rounded-lg bg-rose/10 text-rose text-sm">{error} <button className="underline" onClick={reload}>Retry</button></div>}
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Shipment table, scroll horizontally for more columns"><table className="w-full text-sm text-left whitespace-nowrap"><caption className="sr-only">Confirmed shipments with operational tracking data and actions</caption><thead className="text-xs text-muted bg-surface-2"><tr><th className="p-3"><input type="checkbox" aria-label="Select all shipments on this page" disabled={!rows.length || loading} checked={!!rows.length && selected.length === rows.length} onChange={e => setSelected(e.target.checked ? rows.map(row => row.ref_no) : [])} /></th>{columns.map(([key, label]) => <th key={key} className={`px-4 py-3 font-medium ${key === "ref_no" ? "sticky left-0 z-10 bg-surface-2" : ""}`} aria-sort={sort === key ? order === "asc" ? "ascending" : "descending" : "none"}><button className="inline-flex items-center gap-2" onClick={() => { setSort(key); setOrder(sort === key && order === "asc" ? "desc" : "asc"); setPage(1); }}>{label}<ArrowDownUp size={12} className={sort === key ? "text-gold" : "text-muted"} /></button></th>)}<th className="px-4 py-3">Actions</th></tr></thead><tbody>
          {loading ? Array.from({ length: 5 }, (_, index) => <tr key={index} aria-hidden="true">{Array.from({ length: 18 }, (_, cell) => <td key={cell} className="p-4"><div className="h-4 w-24 rounded bg-surface-3 animate-pulse" /></td>)}</tr>) : rows.map(row => <tr key={row.ref_no} className="border-t border-white/5 hover:bg-surface-2"><td className="p-3"><input type="checkbox" aria-label={`Select ${row.ref_no}`} checked={selected.includes(row.ref_no)} onChange={e => setSelected(prev => e.target.checked ? [...prev, row.ref_no] : prev.filter(ref => ref !== row.ref_no))} /></td>{columns.map(([key]) => <td key={key} className={`px-4 py-3 ${key === "ref_no" ? "sticky left-0 bg-surface-1 z-10" : "text-muted"}`}>{key === "ref_no" ? <><button className="font-mono font-semibold text-gold" onClick={() => openRecord(row, "detail")}>{row.ref_no}</button>{missingFields(row).length > 0 && <button onClick={() => openRecord(row, "edit")} title={`Missing: ${missingFields(row).join(", ")}`} className="block mt-1 text-[10px] text-amber">{missingFields(row).length} details to complete</button>}</> : key === "track_status" ? <StageBadge stage={row.track_status} /> : ["etd", "eta", "updated_at"].includes(key) ? <span className={key === "eta" && isOverdue(row) ? "text-rose" : ""}>{displayDate(row[key], key === "updated_at")}{key === "eta" && isOverdue(row) && <span className="block text-[10px]">Overdue</span>}</span> : key === "chargeable_weight" ? <span>{row[key] ?? "—"}{row[key] && !/[a-z]/i.test(String(row[key])) ? ` ${row.weight_unit || "KG"}` : ""}</span> : <span className="inline-block max-w-44 truncate align-middle" title={String(row[key] || "")}>{row[key] || "—"}</span>}</td>)}<td className="px-4 py-3"><div className="flex items-center gap-3"><button className="text-xs text-primary hover:text-gold" onClick={() => openRecord(row, "detail")}>Details</button><button className="text-xs text-primary hover:text-gold" onClick={() => openRecord(row, "edit")}>Edit</button><button className="text-xs text-gold" onClick={() => startQuick(row)}>Update tracking</button><button className="text-xs text-primary hover:text-gold" onClick={() => setTimeline(row)}>Timeline</button><a href={trackingUrl(row.ref_no)} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-gold" aria-label={`Preview public tracking for ${row.ref_no}`}><ExternalLink size={14} /></a><button className="text-muted hover:text-gold" onClick={() => copy(row)} aria-label={`Copy tracking link for ${row.ref_no}`}><Copy size={14} /></button></div></td></tr>)}
          {!loading && !rows.length && !error && <tr><td colSpan={18} className="py-16 px-6 text-center"><CheckCircle2 size={28} className="mx-auto text-muted mb-3" /><p className="text-primary font-medium">No confirmed shipments found</p><p className="text-muted text-sm mt-2">Adjust your filters or add a confirmed shipment to tracking.</p><button className="btn-secondary mt-4" onClick={() => { setCreationMethod("existing"); setEditor("new"); }}>Add shipment to tracking</button></td></tr>}
        </tbody></table></div>
        <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 text-xs text-muted"><p>{pagination.total.toLocaleString()} shipments · Page {page} of {Math.max(1, pagination.totalPages)}</p><div className="flex items-center gap-3"><label>Rows <select aria-label="Rows per page" className="bg-surface-2 rounded p-2 ml-1" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}><option>25</option><option>50</option><option>100</option></select></label><button className="btn-secondary p-2" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}><ChevronLeft size={16} /></button><button className="btn-secondary p-2" aria-label="Next page" disabled={page >= pagination.totalPages || loading} onClick={() => setPage(value => value + 1)}><ChevronRight size={16} /></button></div></div>
      </section>
    </div>
    {editor && <TrackingEditor record={editor === "new" ? null : editor} role={user.role} initialMethod={creationMethod} onClose={() => setEditor(null)} onSaved={reload} />}
    {timeline && <TrackingTimeline record={timeline} role={user.role} onClose={() => setTimeline(null)} onSaved={reload} />}
    {detail && <Modal isOpen onClose={() => setDetail(null)} title={`Shipment details · ${detail.ref_no}`} size="xl"><StageProgress stage={detail.track_status || "Confirmed"} /><div className="flex flex-wrap gap-2 mb-5"><button className="btn-primary" onClick={() => { setEditor(detail); setDetail(null); }}>Edit shipment</button><button className="btn-secondary" onClick={() => { setTimeline(detail); setDetail(null); }}>View timeline</button><a className="btn-secondary flex gap-2 items-center" href={trackingUrl(detail.ref_no)} target="_blank" rel="noopener noreferrer">Preview public tracking<ArrowRight size={14} /></a><button className="btn-secondary" onClick={() => { startQuick(detail); setDetail(null); }}>Update tracking</button></div><dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Object.entries(detail).filter(([key, value]) => !key.startsWith("__") && !["id", "tracking_key", "source_table", "metadata"].includes(key) && (user.role === "admin" || !FINANCIAL_FIELDS.includes(key)) && value !== null && value !== "" && typeof value !== "object").map(([key, value]) => <div key={key} className="rounded-lg bg-surface-2 p-3"><dt className="uppercase text-[10px] tracking-wide text-muted">{key.replace(/_/g, " ")}</dt><dd className="text-sm text-primary mt-1 break-words whitespace-pre-wrap">{String(value)}</dd></div>)}</dl></Modal>}
    {quick && <Modal isOpen onClose={() => { if (!saving && (!(quickMessage || quickEta) || window.confirm("Discard the unsaved tracking update?"))) setQuick(null); }} title={quick === "bulk" ? "Bulk tracking update" : `Update tracking · ${quick.ref_no}`} size="md"><div className="space-y-4"><p className="text-xs text-muted">{quick === "bulk" ? "Only supplied fields change. Each selected shipment is authorized and saved independently." : "The commercial status remains Confirmed. Customers receive saved tracking updates automatically."}</p><label className="block text-xs text-muted">Tracking stage<select className="input w-full mt-1" value={quickStage} onChange={e => setQuickStage(e.target.value)}><option value="">Keep current stage</option>{TRACKING_STAGES.map(stage => <option key={stage}>{stage}</option>)}</select></label>{quickStage && <StageProgress stage={quickStage} />}<label className="block text-xs text-muted">Revised ETA (optional, Qatar calendar date)<input className="input w-full mt-1" type="date" value={quickEta} onChange={e => setQuickEta(e.target.value)} /></label><label className="block text-xs text-muted">Customer-facing message (optional)<textarea className="input w-full mt-1" rows={3} value={quickMessage} onChange={e => setQuickMessage(e.target.value)} /></label><button className="btn-primary" disabled={saving || !!bulkResults.length} onClick={saveQuick}>{saving ? "Saving…" : "Publish tracking update"}</button>{bulkResults.length > 0 && <div role="status" className="space-y-2">{bulkResults.map(result => <p key={result.ref_no} className={`text-sm ${result.success ? "text-emerald" : "text-rose"}`}>{result.ref_no}: {result.success ? "Updated" : result.message || "Update failed"}</p>)}</div>}</div></Modal>}
  </AppLayout>;
}
