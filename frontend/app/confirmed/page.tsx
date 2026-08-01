"use client";
// app/confirmed/page.tsx
// ─────────────────────────────────────────────────────────────
//  Confirmed Shipments Page
//  • Shows only status = "Confirmed"
//  • "+ Add Direct Shipment" button → AddShipmentModal
//  • Double-click row → ConfirmedShipmentModal (tabbed details + file manager)
// ─────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback, useRef } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Badge from "@/components/ui/Badge";
import AddShipmentModal from "@/components/modals/AddShipmentModal";
import ConfirmedShipmentModal from "@/components/modals/ConfirmedShipmentModal";
import PasswordPromptModal from "@/components/modals/PasswordPromptModal";
import api from "@/lib/api";
import { Shipment } from "@/types";
import { exportShipmentsToExcel } from "@/lib/exportExcel";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

const SkeletonRow = () => (
  <tr className="border-b border-white/[0.04]">
    {Array.from({ length: 22 }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 rounded-full bg-white/[0.04] animate-pulse" style={{ width: `${50 + (i % 5) * 15}%` }} />
      </td>
    ))}
  </tr>
);

const formatCustIdName = (id?: string | null, name?: string | null) => {
  if (id && name) return `${id} / ${name}`;
  if (id) return id;
  if (name) return name;
  return "—";
};

export default function ConfirmedPage() {
  const { user } = useAuth();



  const [shipments,   setShipments]   = useState<Shipment[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [addOpen,     setAddOpen]     = useState(false);
  const [selected,    setSelected]    = useState<Shipment | null>(null);
  const [detailOpen,  setDetailOpen]  = useState(false);

  const [passwordPrompt, setPasswordPrompt] = useState<{
    isOpen: boolean;
    actionName: string;
    onSuccess: () => void;
  }>({ isOpen: false, actionName: "", onSuccess: () => {} });

  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchShipments = useCallback(async () => {
    try {
      const { data } = await api.get("/shipments?status=Confirmed");
      setShipments(data.data);
    } catch {
      toast.error("Failed to load confirmed shipments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchShipments(); }, [fetchShipments]);

  // ── Auto-open checks for unread replies notification click ────
  useEffect(() => {
    if (shipments.length > 0) {
      const autoRef = sessionStorage.getItem("autoOpenShipmentRef");
      if (autoRef) {
        const found = shipments.find((s) => s.ref_no === autoRef);
        if (found) {
          sessionStorage.removeItem("autoOpenShipmentRef");
          setSelected(found);
          setDetailOpen(true);
        }
      }
    }
  }, [shipments]);

  useEffect(() => {
    const handleOpenDetail = (e: Event) => {
      const reply = (e as CustomEvent).detail;
      const found = shipments.find((s) => s.ref_no === reply.ref_no);
      if (found) {
        setSelected(found);
        setDetailOpen(true);
      }
    };
    window.addEventListener("open-shipment-detail", handleOpenDetail);
    return () => window.removeEventListener("open-shipment-detail", handleOpenDetail);
  }, [shipments]);

  const handleRowClick = (shipment: Shipment) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      setSelected(shipment);
      setDetailOpen(true);
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
      }, 250);
    }
  };

  const handleCreated = (s: Shipment) => {
    setShipments((prev) => [s, ...prev]);
  };

  const handleUpdated = (updated: Shipment) => {
    setShipments((prev) => prev.map((s) => s.ref_no === updated.ref_no ? updated : s));
    setSelected(updated);
  };

  const handleDelete = (e: React.MouseEvent, refNo: string) => {
    e.stopPropagation();
    setPasswordPrompt({
      isOpen: true,
      actionName: `delete Shipment ${refNo}`,
      onSuccess: async () => {
        try {
          await api.delete(`/shipments/${refNo}`);
          toast.success(`Shipment ${refNo} deleted successfully.`);
          setShipments((prev) => prev.filter((s) => s.ref_no !== refNo));
        } catch {
          toast.error("Failed to delete Shipment.");
        }
      }
    });
  };

  const getGroupLabel = (basePrefix: string, groupShipments: Shipment[]) => {
    if (!groupShipments || groupShipments.length === 0) return basePrefix;
    const seqNums = groupShipments
      .map((s) => {
        const match = s.ref_no.match(/-(\d+)$/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);

    if (seqNums.length === 0) return basePrefix;
    const minSeq = String(seqNums[0]).padStart(2, "0");
    const maxSeq = String(seqNums[seqNums.length - 1]).padStart(2, "0");

    if (minSeq === maxSeq) return `${basePrefix}-${minSeq}`;
    return `${basePrefix}-${minSeq}-${maxSeq}`;
  };

  const groupedItems = (() => {
    const groups: { [key: string]: Shipment[] } = {};
    shipments.forEach(s => {
      const match = s.ref_no.match(/^([0-9]{2}[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{2})-(\d+)$/);
      if (match) {
        const base = match[1];
        if (!groups[base]) {
          groups[base] = [];
        }
        groups[base].push(s);
      }
    });

    const items: (Shipment | { isGroup: true; basePrefix: string; shipments: Shipment[]; originalShipments: Shipment[] })[] = [];
    const processedGroups = new Set<string>();

    shipments.forEach(s => {
      const match = s.ref_no.match(/^([0-9]{2}[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{2})-(\d+)$/);
      if (match) {
        const base = match[1];
        if (groups[base].length > 1) {
          if (!processedGroups.has(base)) {
            processedGroups.add(base);
            const sortedGroup = [...groups[base]].sort((a, b) => {
              const aMatch = a.ref_no.match(/-(\d+)$/);
              const bMatch = b.ref_no.match(/-(\d+)$/);
              const aSeq = aMatch ? parseInt(aMatch[1]) : 0;
              const bSeq = bMatch ? parseInt(bMatch[1]) : 0;
              return aSeq - bSeq;
            });
            items.push({
              isGroup: true,
              basePrefix: base,
              shipments: sortedGroup,
              originalShipments: sortedGroup
            });
          }
        } else {
          items.push(s);
        }
      } else {
        items.push(s);
      }
    });

    return items;
  })();

  const filtered = groupedItems.filter((item) => {
    const q = search.toLowerCase();
    if (!q) return true;
    if ('isGroup' in item) {
      const groupLabel = getGroupLabel(item.basePrefix, item.originalShipments);
      if (groupLabel.toLowerCase().includes(q)) return true;
      return item.shipments.some(s => [s.ref_no, s.pol, s.pod, s.carrier, s.bl_number, s.do_number, s.track_status, s.customer_id]
        .some((v) => v?.toLowerCase().includes(q)));
    } else {
      const s = item;
      return [s.ref_no, s.pol, s.pod, s.carrier, s.bl_number, s.do_number, s.track_status, s.customer_id]
        .some((v) => v?.toLowerCase().includes(q));
    }
  });

  const fmtDate = (v: string | null) => v ? format(new Date(v), "dd MMM yy") : "—";

  return (
    <AppLayout
      title="Confirmed Shipments"
      subtitle="All confirmed cargo — tracking, documentation & file management."
      action={
        <div className="flex gap-3">
          <button 
            onClick={() => {
              const flatList = filtered.flatMap(item => 'isGroup' in item ? item.shipments : [item]);
              exportShipmentsToExcel(flatList, `Confirmed_Shipments_${format(new Date(), 'yyyyMMdd')}.xlsx`);
            }} 
            className="btn-secondary"
          >
            📊 Export Excel
          </button>
          {!user || user.role !== "sales" ? (
            <button 
              onClick={() => {
                setPasswordPrompt({
                  isOpen: true,
                  actionName: "add a Direct Shipment",
                  onSuccess: () => setAddOpen(true)
                });
              }} 
              className="btn-emerald"
            >
              + Add Direct Shipment
            </button>
          ) : null}
        </div>
      }
    >
      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="relative w-72">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm"></span>
          <input
            type="text"
            placeholder="Search REF NO, POL, carrier, BL/AWB…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">
            {loading ? "Loading…" : `${filtered.length} confirmed shipments`}
          </span>
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
                <th>STATUS</th>
                <th>RFQ NO</th>
                <th>OPERATOR</th>
                <th>CUSTOMER ID/NAME</th>
                <th>DEAR WHO</th>
                <th>POL</th>
                <th>POD</th>
                <th>COMMODITY</th>
                <th>CARRIER</th>
                <th>ETD</th>
                <th>ETA</th>
                <th>COST</th>
                <th>CUSTOMER PRICE</th>
                <th>JOB/DO</th>
                <th>BOX NO</th>
                <th>SO</th>
                <th>BL/AWB</th>
                <th>TRACK STATUS</th>
                <th>REPLIES</th>
                <th>CHAT</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={23} className="text-center py-16 text-muted">
                    <div className="space-y-2">
                      <p className="text-4xl">📦</p>
                      <p className="text-sm">No confirmed shipments found.</p>
                      {(!user || user.role !== "sales") && (
                        <button onClick={() => setAddOpen(true)} className="btn-emerald text-xs mt-3">
                          + Add Direct Shipment
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => {
                  const s = 'isGroup' in item ? item.shipments[0] : item;
                  const displayRef = 'isGroup' in item ? getGroupLabel(item.basePrefix, item.originalShipments) : s.ref_no;
                  const unreadReplies = 'isGroup' in item ? item.shipments.reduce((sum, x) => sum + Number(x.unread_replies_count || 0), 0) : Number(s.unread_replies_count || 0);
                  const totalReplies = 'isGroup' in item ? item.shipments.reduce((sum, x) => sum + Number(x.replies_count || 0), 0) : Number(s.replies_count || 0);
                  const unreadChat = 'isGroup' in item ? item.shipments.reduce((sum, x) => sum + Number(x.unread_chat_count || 0), 0) : Number(s.unread_chat_count || 0);

                  return (
                    <tr
                      key={'isGroup' in item ? item.basePrefix : s.ref_no}
                      onClick={() => handleRowClick(s)}
                      style={{ animation: `fade-in 0.3s ease-out ${idx * 20}ms both` }}
                      title="Double-click to open details & file manager"
                      className="cursor-pointer"
                    >
                      <td>
                        <span className="font-mono text-xs font-bold text-emerald bg-emerald/10 px-2 py-1 rounded-lg border border-emerald/20">
                          {displayRef}
                        </span>
                      </td>
                      <td>
                        <Badge status={s.status} />
                      </td>
                      <td>
                        {s.cust_req_no ? (
                          <span className="font-mono text-xs text-muted/80 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                            {s.cust_req_no}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-xs font-semibold text-emerald bg-white/[0.02]">{s.operator ?? "—"}</td>
                      <td className="text-muted font-mono bg-white/[0.03] text-xs font-semibold">{formatCustIdName(s.customer_id, s.customer_name)}</td>
                      <td className="text-xs text-muted/90">{s.dear_who ?? "—"}</td>
                      <td>{s.pol ?? "—"}</td>
                      <td>{s.pod ?? "—"}</td>
                      <td>{s.commodity ?? "—"}</td>
                      <td>{s.carrier ?? "—"}</td>
                      <td className="text-xs text-muted">{fmtDate(s.etd)}</td>
                      <td className="text-xs text-muted">{fmtDate(s.eta)}</td>
                      <td>
                        {s.cost
                          ? <span className="font-semibold text-emerald">QAR {Number(s.cost).toLocaleString()}</span>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        {s.cost && s.profit
                          ? <span className="font-semibold text-blue">QAR {(Number(s.cost) + Number(s.profit)).toLocaleString()}</span>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td className="font-mono text-xs">{s.do_number ?? "—"}</td>
                      <td className="font-mono text-xs">{s.box_no    ?? "—"}</td>
                      <td className="font-mono text-xs">{s.so_number ?? "—"}</td>
                      <td className="font-mono text-xs">{s.bl_number ?? "—"}</td>
                      <td>
                        {s.track_status
                          ? <span className="text-xs text-blue-bright">{s.track_status}</span>
                          : <span className="text-muted text-xs">—</span>}
                      </td>
                      <td>
                        {totalReplies > 0 && unreadReplies > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose/10 text-rose border border-rose/20 animate-pulse">
                            📩 New ({unreadReplies})
                          </span>
                        ) : totalReplies > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.04] text-muted border border-white/[0.06]">
                            💬 Replied ({totalReplies})
                          </span>
                        ) : (
                          <span className="text-faint text-xs">—</span>
                        )}
                      </td>
                      <td>
                        {unreadChat > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 animate-pulse">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                            </span>
                            New Msg ({unreadChat})
                          </span>
                        ) : (
                          <span className="text-faint text-xs">—</span>
                        )}
                      </td>
                      <td>
                        {(!user || user.role !== "sales") && (
                          <button
                            onClick={(e) => handleDelete(e, s.ref_no)}
                            className="text-muted hover:text-rose p-1.5 rounded hover:bg-rose/10 transition-colors"
                            title="Delete Shipment"
                          >
                            🗑
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Hint ─────────────────────────────────────────── */}
      <p className="text-xs text-muted mt-3 px-1">
        💡 Double-click any row to view details and manage attached PDF files.
      </p>

      {/* ── Modals ───────────────────────────────────────── */}
      <AddShipmentModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={handleCreated}
      />
      <ConfirmedShipmentModal
        shipment={selected}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        onUpdated={handleUpdated}
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
