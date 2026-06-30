"use client";
// app/customer/rfq/page.tsx
// ─────────────────────────────────────────────────────────────
//  Customer RFQ History Page
//  • Click REF NO → clipboard copy + toast
//  • Double-click row → detail modal
// ─────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback, useRef } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Badge from "@/components/ui/Badge";
import RFQDetailModal from "@/components/modals/RFQDetailModal";
import api from "@/lib/api";
import { Shipment } from "@/types";
import toast from "react-hot-toast";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { exportShipmentsToExcel } from "@/lib/exportExcel";

// ── Skeleton Row ──────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="border-b border-white/[0.04]">
    {Array.from({ length: 11 }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 rounded-full bg-white/[0.04] animate-pulse" style={{ width: `${60 + i * 8}%` }} />
      </td>
    ))}
  </tr>
);

export default function CustomerRFQListPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Double-click detection
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchShipments = useCallback(async () => {
    try {
      const { data } = await api.get("/shipments?exclude_direct=true");
      setShipments(data.data);
    } catch {
      toast.error("Failed to load request history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  // ── Auto-open checks for notification clicks ────
  const checkAutoOpen = useCallback(() => {
    if (shipments.length > 0) {
      const autoRef = sessionStorage.getItem("autoOpenShipmentRef");
      if (autoRef) {
        const found = shipments.find((s) => s.ref_no === autoRef);
        if (found) {
          sessionStorage.removeItem("autoOpenShipmentRef");
          setSelected(found);
          setModalOpen(true);
        }
      }
    }
  }, [shipments]);

  useEffect(() => {
    checkAutoOpen();
  }, [shipments, checkAutoOpen]);

  useEffect(() => {
    window.addEventListener("check-auto-open", checkAutoOpen);
    return () => window.removeEventListener("check-auto-open", checkAutoOpen);
  }, [checkAutoOpen]);

  useEffect(() => {
    const handleOpenDetail = (e: Event) => {
      const reply = (e as CustomEvent).detail;
      const found = shipments.find((s) => s.ref_no === reply.ref_no);
      if (found) {
        setSelected(found);
        setModalOpen(true);
      }
    };
    window.addEventListener("open-shipment-detail", handleOpenDetail);
    return () => window.removeEventListener("open-shipment-detail", handleOpenDetail);
  }, [shipments]);

  useEffect(() => {
    const handleListUpdate = () => {
      fetchShipments();
    };
    window.addEventListener("rfq-list-update", handleListUpdate);
    return () => window.removeEventListener("rfq-list-update", handleListUpdate);
  }, [fetchShipments]);

  // ── Copy REF NO to clipboard ────────────────────────────────
  const copyRefNo = async (e: React.MouseEvent, refNo: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(refNo);
      toast.success(`Copied "${refNo}" to clipboard!`, { icon: "📋" });
    } catch {
      toast.error("Clipboard not available.");
    }
  };

  // ── Row click / double-click handler ───────────────────────
  const handleRowClick = (shipment: Shipment) => {
    if (clickTimerRef.current) {
      // Double-click detected
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      setSelected(shipment);
      setModalOpen(true);
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
      }, 250);
    }
  };

  // ── Status update callback ──────────────────────────────────
  const handleStatusUpdate = (updated: Shipment) => {
    setShipments((prev) => prev.map((s) => s.ref_no === updated.ref_no ? updated : s));
    setSelected(updated);
  };

  // ── Filter ─────────────────────────────────────────────────
  const filtered = shipments.filter((s) => {
    // 1. Status Filter
    if (statusFilter === "Active" && s.status === "Cancelled") return false;
    if (statusFilter !== "All" && statusFilter !== "Active" && s.status !== statusFilter) return false;

    // 2. Search Text Filter
    const q = search.toLowerCase();
    return !q || [s.ref_no, s.pol, s.pod, s.commodity, s.status, s.operator]
      .some((v) => v?.toLowerCase().includes(q));
  });

  const fmtFollowUp = (val: string) => {
    try {
      const d = parseISO(val);
      const hours = (Date.now() - d.getTime()) / 3_600_000;
      return hours > 4
        ? <span className="text-amber font-semibold">{formatDistanceToNow(d, { addSuffix: true })}</span>
        : <span className="text-muted">{formatDistanceToNow(d, { addSuffix: true })}</span>;
    } catch { return "—"; }
  };

  return (
    <AppLayout
      title="My Requests"
      subtitle="Track the status of all your submitted RFQs."
      action={
        <button 
          onClick={() => exportShipmentsToExcel(filtered, `My_Requests_${format(new Date(), 'yyyyMMdd')}.xlsx`)} 
          className="btn-secondary text-xs px-3 py-2 md:text-sm md:px-5 md:py-2.5 min-h-[40px] flex items-center gap-1.5"
        >
          📊 <span className="hidden sm:inline">Export Excel</span><span className="sm:hidden">Export</span>
        </button>
      }
    >
      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Search REF NO, POL, POD…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-full min-h-[44px] text-base"
            />
          </div>
          <select 
            className="select w-full md:w-48 min-h-[44px] text-base"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Active">Active (Hide Cancelled)</option>
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Quoted">Quoted</option>
            <option value="Customer Review">Customer Review</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto border-t border-white/[0.04] pt-3 md:border-0 md:pt-0">
          <span className="text-xs text-muted">
            {loading ? "Loading…" : `${filtered.length} records`}
          </span>
          <button onClick={fetchShipments} className="btn-secondary text-xs px-3 py-2 min-h-[38px]">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Desktop Table View (Hidden on mobile) ────────── */}
      <div className="hidden md:block glass rounded-2xl overflow-hidden shadow-card animate-fade-in">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>REF NO</th>
                <th>ASSIGNED OPERATOR</th>
                <th>POL</th>
                <th>POD</th>
                <th>COMMODITY</th>
                <th>MODE</th>
                <th>TERM</th>
                <th>STATUS</th>
                <th>LAST FOLLOW-UP</th>
                <th>REPLIES</th>
                <th>CHAT</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-16 text-muted">
                    <div className="space-y-2">
                      <p className="text-4xl">📭</p>
                      <p className="text-sm">No request records found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s, idx) => (
                  <tr
                    key={s.ref_no}
                    onClick={() => handleRowClick(s)}
                    className="cursor-pointer"
                    style={{ animation: `fade-in 0.3s ease-out ${idx * 20}ms both` }}
                    title="Double-click to open details"
                  >
                    <td>
                      <button
                        onClick={(e) => copyRefNo(e, s.ref_no)}
                        className="font-mono text-xs font-bold text-blue hover:text-blue-bright
                                   px-2 py-1 rounded-lg bg-blue/10 hover:bg-blue/20 border border-blue/20
                                   transition-all duration-150 group relative"
                        title="Click to copy"
                      >
                        {s.ref_no}
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-surface-4 text-primary text-[10px]
                                         px-2 py-0.5 rounded border border-white/10 opacity-0 group-hover:opacity-100
                                         transition-opacity whitespace-nowrap pointer-events-none">
                          Click to copy
                        </span>
                      </button>
                    </td>
                    <td className="text-xs font-semibold text-emerald bg-white/[0.02]">{s.operator ?? "—"}</td>
                    <td>{s.pol ?? "—"}</td>
                    <td>{s.pod ?? "—"}</td>
                    <td className="max-w-[140px] truncate">{s.commodity ?? "—"}</td>
                    <td>
                      <span className="text-xs font-semibold text-muted uppercase">{s.mode ?? "—"}</span>
                    </td>
                    <td>{s.term ?? "—"}</td>
                    <td><Badge status={s.status} /></td>
                    <td className="text-xs">
                      {s.status === 'Cancelled' ? <span className="text-muted italic">Turned Off</span> : fmtFollowUp(s.last_follow_up)}
                    </td>
                    <td>
                      {s.unread_replies_count && Number(s.unread_replies_count) > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose/10 text-rose border border-rose/20 animate-pulse">
                          📩 New ({s.unread_replies_count})
                        </span>
                      ) : s.replies_count && Number(s.replies_count) > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.04] text-muted border border-white/[0.06]">
                          💬 Replied ({s.replies_count})
                        </span>
                      ) : (
                        <span className="text-faint text-xs">—</span>
                      )}
                    </td>
                    <td>
                      {s.unread_chat_count && Number(s.unread_chat_count) > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 animate-pulse">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                          </span>
                          New Msg ({s.unread_chat_count})
                        </span>
                      ) : (
                        <span className="text-faint text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile Card List View (Shown on mobile) ───────── */}
      <div className="md:hidden space-y-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-5 space-y-4 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-6 w-28 bg-white/[0.04] rounded-lg" />
                <div className="h-5 w-20 bg-white/[0.04] rounded-full" />
              </div>
              <div className="h-4 w-40 bg-white/[0.04] rounded" />
              <div className="h-4 w-48 bg-white/[0.04] rounded" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center text-muted">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-sm">No request records found.</p>
          </div>
        ) : (
          filtered.map((s, idx) => (
            <div
              key={s.ref_no}
              onClick={() => {
                setSelected(s);
                setModalOpen(true);
              }}
              className="glass rounded-2xl p-4 shadow-card hover:bg-white/[0.01] border border-white/[0.06] flex flex-col gap-3.5 cursor-pointer active:scale-[0.98] transition-all"
              style={{ animation: `fade-in 0.3s ease-out ${idx * 20}ms both` }}
            >
              {/* Top card row */}
              <div className="flex items-center justify-between">
                <button
                  onClick={(e) => copyRefNo(e, s.ref_no)}
                  className="font-mono text-xs font-bold text-blue hover:text-blue-bright
                             px-2.5 py-1 rounded-lg bg-blue/10 hover:bg-blue/20 border border-blue/20
                             flex items-center gap-1.5 transition-all duration-150 min-h-[36px]"
                  title="Tap to copy REF NO"
                >
                  <span>{s.ref_no}</span>
                  <span className="text-[11px]">📋</span>
                </button>
                <Badge status={s.status} />
              </div>

              {/* Path and Routing Info */}
              <div className="py-2 border-y border-white/[0.04] space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <span className="truncate max-w-[140px]">{s.pol || "—"}</span>
                  <span className="text-muted/50 font-normal">→</span>
                  <span className="truncate max-w-[140px]">{s.pod || "—"}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded bg-white/[0.04] text-[10px] uppercase font-bold text-slate-300">
                    {s.mode || "—"}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.04] text-[10px] uppercase font-bold text-slate-300">
                    {s.term || "—"}
                  </span>
                  {s.commodity && (
                    <span className="text-xs text-muted truncate max-w-[200px]" title={s.commodity}>
                      • {s.commodity}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom card details */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <div className="text-[11px] text-muted">
                  <span>Operator: </span>
                  <span className="font-semibold text-emerald">{s.operator ?? "—"}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {s.unread_chat_count && Number(s.unread_chat_count) > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 animate-pulse">
                      💬 {s.unread_chat_count} msg
                    </span>
                  ) : s.unread_replies_count && Number(s.unread_replies_count) > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose/10 text-rose border border-rose/20 animate-pulse">
                      📩 {s.unread_replies_count} new
                    </span>
                  ) : s.replies_count && Number(s.replies_count) > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.04] text-muted border border-white/[0.06]">
                      💬 {s.replies_count}
                    </span>
                  ) : null}

                  <span className="text-slate-500 text-base leading-none pl-1">›</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Hint ─────────────────────────────────────────── */}
      <p className="text-xs text-muted mt-3 px-1 hidden md:block">
        💡 Click the <span className="text-blue font-semibold">REF NO</span> to copy · Double-click any row to view full details
      </p>
      <p className="text-xs text-muted mt-3 px-1 md:hidden">
        💡 Tap the copy icon next to <span className="text-blue font-semibold">REF NO</span> to copy · Tap any card to view details
      </p>

      {/* ── Detail Modal ─────────────────────────────────── */}
      <RFQDetailModal
        shipment={selected}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onUpdated={handleStatusUpdate}
      />
    </AppLayout>
  );
}
