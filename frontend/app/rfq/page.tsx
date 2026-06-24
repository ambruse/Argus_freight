"use client";
// app/rfq/page.tsx
// ─────────────────────────────────────────────────────────────
//  RFQ History Page
//  • Excludes shipments where note = "Direct Booking"
//  • Click REF NO → clipboard copy + toast
//  • Double-click row → detail modal with status editor
// ─────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback, useRef } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Badge from "@/components/ui/Badge";
import RFQDetailModal from "@/components/modals/RFQDetailModal";
import HistoricalRFQModal from "@/components/modals/HistoricalRFQModal";
import PasswordPromptModal from "@/components/modals/PasswordPromptModal";
import api from "@/lib/api";
import { Shipment } from "@/types";
import toast from "react-hot-toast";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { exportShipmentsToExcel } from "@/lib/exportExcel";

// ── Skeleton Row ──────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="border-b border-white/[0.04]">
    {Array.from({ length: 14 }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 rounded-full bg-white/[0.04] animate-pulse" style={{ width: `${60 + i * 8}%` }} />
      </td>
    ))}
  </tr>
);

export default function RFQPage() {
  const [shipments,  setShipments]  = useState<Shipment[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [selected,   setSelected]   = useState<Shipment | null>(null);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [addHistoricalOpen, setAddHistoricalOpen] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState<{
    isOpen: boolean;
    actionName: string;
    onSuccess: () => void;
  }>({ isOpen: false, actionName: "", onSuccess: () => {} });

  // Double-click detection
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [markingRead, setMarkingRead] = useState(false);

  const handleMarkAllRead = async () => {
    setMarkingRead(true);
    try {
      await api.post("/shipments/replies/mark-all-read");
      toast.success("All replies marked as read.");
      await fetchShipments();
      window.dispatchEvent(new Event("refresh-unread-replies"));
    } catch {
      toast.error("Failed to mark replies as read.");
    } finally {
      setMarkingRead(false);
    }
  };

  const fetchShipments = useCallback(async () => {
    try {
      const { data } = await api.get("/shipments?exclude_direct=true");
      setShipments(data.data);
    } catch {
      toast.error("Failed to load RFQ data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchShipments(); }, [fetchShipments]);

  // ── Auto-open checks for unread replies/assignments notification click ────
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
        // Single click — no-op (double click opens modal)
      }, 250);
    }
  };

  // ── Status update from modal ────────────────────────────────
  const handleStatusUpdate = (updated: Shipment) => {
    setShipments((prev) => prev.map((s) => s.ref_no === updated.ref_no ? updated : s));
    setSelected(updated);
  };

  // ── Delete handler ──────────────────────────────────────────
  const handleDelete = (e: React.MouseEvent, refNo: string) => {
    e.stopPropagation();
    setPasswordPrompt({
      isOpen: true,
      actionName: `delete RFQ ${refNo}`,
      onSuccess: async () => {
        try {
          await api.delete(`/shipments/${refNo}`);
          toast.success(`RFQ ${refNo} deleted successfully.`);
          setShipments((prev) => prev.filter((s) => s.ref_no !== refNo));
        } catch {
          toast.error("Failed to delete RFQ.");
        }
      }
    });
  };

  // ── Historical RFQ Creation ─────────────────────────────────
  const handleCreated = (s: Shipment) => {
    setShipments((prev) => [s, ...prev]);
  };

  // ── Filter ─────────────────────────────────────────────────
  const filtered = shipments.filter((s) => {
    // 1. Status Filter
    if (statusFilter === "Active" && s.status === "Cancelled") return false;
    if (statusFilter !== "All" && statusFilter !== "Active" && s.status !== statusFilter) return false;

    // 2. Search Text Filter
    const q = search.toLowerCase();
    return !q || [s.ref_no, s.cust_req_no, s.pol, s.pod, s.commodity, s.dear_who, s.carrier, s.status, s.customer_id]
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
      title="Sent RFQs"
      subtitle="All quote requests excluding direct bookings."
      action={
        <div className="flex gap-3">
          <button 
            onClick={() => exportShipmentsToExcel(filtered, `Sent_RFQs_${format(new Date(), 'yyyyMMdd')}.xlsx`)} 
            className="btn-secondary"
          >
            📊 Export Excel
          </button>
          <button 
            onClick={() => {
              setPasswordPrompt({
                isOpen: true,
                actionName: "add a Historical RFQ",
                onSuccess: () => setAddHistoricalOpen(true)
              });
            }} 
            className="btn-emerald"
          >
            + Add Historical RFQ
          </button>
        </div>
      }
    >
      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm"></span>
            <input
              type="text"
              placeholder="Search REF NO, POL, POD…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
          <select 
            className="select w-48"
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
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">
            {loading ? "Loading…" : `${filtered.length} records`}
          </span>
          <button 
            onClick={handleMarkAllRead} 
            className="btn-secondary text-xs px-3 py-2 border border-[#F5B037]/20 hover:border-[#F5B037]/50 transition-colors"
            disabled={markingRead}
          >
            {markingRead ? "Marking…" : "✓ Mark as read"}
          </button>
          <button onClick={fetchShipments} className="btn-secondary text-xs px-3 py-2">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div className="glass rounded-2xl overflow-hidden shadow-card animate-fade-in">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>REF NO</th>
                <th>CUST REQ NO</th>
                <th>OPERATOR</th>
                <th>CUSTOMER ID</th>
                <th>REFER BY</th>
                <th>POL</th>
                <th>POD</th>
                <th>COMMODITY</th>
                <th>MODE</th>
                <th>TERM</th>
                <th>STATUS</th>
                <th>LAST FOLLOW-UP</th>
                <th>REPLIES</th>
                <th>CHAT</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={15} className="text-center py-16 text-muted">
                    <div className="space-y-2">
                      <p className="text-4xl">📭</p>
                      <p className="text-sm">No RFQ records found.</p>
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
                    {/* REF NO — click to copy */}
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
                    <td className="text-xs font-mono font-semibold text-blue bg-white/[0.02]">
                      {s.cust_req_no ?? "—"}
                    </td>
                    <td className="text-xs font-semibold text-emerald bg-white/[0.02]">{s.operator ?? "—"}</td>
                    <td className="text-muted font-mono bg-white/[0.03] text-xs font-semibold">{s.customer_id ?? "—"}</td>
                    <td>{s.refer_by ?? "—"}</td>
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
                    <td>
                      <button
                        onClick={(e) => handleDelete(e, s.ref_no)}
                        className="text-muted hover:text-rose p-1.5 rounded hover:bg-rose/10 transition-colors"
                        title="Delete RFQ"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Hint ─────────────────────────────────────────── */}
      <p className="text-xs text-muted mt-3 px-1">
        💡 Click the <span className="text-blue font-semibold">REF NO</span> to copy · Double-click any row to view full details
      </p>

      {/* ── Detail Modal ─────────────────────────────────── */}
      <RFQDetailModal
        shipment={selected}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onUpdated={handleStatusUpdate}
      />

      <HistoricalRFQModal
        isOpen={addHistoricalOpen}
        onClose={() => setAddHistoricalOpen(false)}
        onCreated={handleCreated}
      />

      <PasswordPromptModal
        isOpen={passwordPrompt.isOpen}
        actionName={passwordPrompt.actionName}
        onClose={() => setPasswordPrompt(prev => ({ ...prev, isOpen: false }))}
        onSuccess={() => {
          setPasswordPrompt(prev => ({ ...prev, isOpen: false }));
          passwordPrompt.onSuccess();
        }}
      />
    </AppLayout>
  );
}
