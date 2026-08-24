"use client";
// app/rfq/page.tsx
// ─────────────────────────────────────────────────────────────
//  RFQ History Page
//  • Excludes shipments where note = "Direct Booking"
//  • Click REF NO → clipboard copy + toast
//  • Double-click row → detail modal with status editor
// ─────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback, useRef, Fragment } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Badge from "@/components/ui/Badge";
import RFQDetailModal from "@/components/modals/RFQDetailModal";
import HistoricalRFQModal from "@/components/modals/HistoricalRFQModal";
import PasswordPromptModal from "@/components/modals/PasswordPromptModal";
import api from "@/lib/api";
import { Shipment } from "@/types";
import toast from "react-hot-toast";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { parseDbDate, fmtFollowUpDate } from "@/lib/dateUtils";
import { exportShipmentsToExcel } from "@/lib/exportExcel";

import { useAuth } from "@/hooks/useAuth";

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

const formatCustIdName = (id?: string | null, name?: string | null) => {
  if (id && name) return `${id} / ${name}`;
  if (id) return id;
  if (name) return name;
  return "—";
};

const getFirstWord = (str?: string | null) => {
  if (!str) return "—";
  const trimmed = str.trim();
  if (!trimmed) return "—";
  const first = trimmed.split(/\s+/)[0];
  return first ? first.replace(/[,;]$/, '') : "—";
};

export default function RFQPage() {
  const { user } = useAuth();
  // Track whether user object has been hydrated from localStorage
  const [userHydrated, setUserHydrated] = useState(false);
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

  // Hydration guard: mark user as loaded
  useEffect(() => { setUserHydrated(true); }, [user]);

  const isAdminOrOperator = userHydrated && (user?.role === 'admin' || user?.role === 'operator');
  const isSales = userHydrated && user?.role === 'sales';

  // Double-click detection
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickedRef = useRef<string | null>(null);
  const lastClickedGroupRef = useRef<string | null>(null);

  // Expanded groups state (tracks base prefixes that are expanded)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (basePrefix: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(basePrefix)) {
        next.delete(basePrefix);
      } else {
        next.add(basePrefix);
      }
      return next;
    });
  };

  const getGroupLabel = (basePrefix: string, originalShipments: Shipment[]) => {
    if (!originalShipments || originalShipments.length === 0) return basePrefix;
    
    const sorted = [...originalShipments].sort((a, b) => {
      return a.ref_no.localeCompare(b.ref_no, undefined, { numeric: true, sensitivity: 'base' });
    });

    if (sorted.length > 1) {
      const firstRef = sorted[0].ref_no;
      const firstSeqMatch = firstRef.match(/-(\d+)$/);
      const firstSeq = firstSeqMatch ? firstSeqMatch[1] : "01";

      const lastRef = sorted[sorted.length - 1].ref_no;
      const lastSeqMatch = lastRef.match(/-(\d+)$/);
      const lastSeq = (lastSeqMatch && lastSeqMatch[1] !== firstSeq) 
        ? lastSeqMatch[1] 
        : String(sorted.length).padStart(2, "0");

      return `${basePrefix}-${firstSeq}-${lastSeq}`;
    }

    const firstRef = sorted[0].ref_no;
    const firstSeqMatch = firstRef.match(/-(\d+)$/);
    const firstSeq = firstSeqMatch ? firstSeqMatch[1] : "01";
    return `${basePrefix}-${firstSeq}`;
  };

  const getGroupLastFollowUp = (shipmentsList: Shipment[]) => {
    let latest = shipmentsList[0]?.last_follow_up;
    shipmentsList.forEach(s => {
      if (s.last_follow_up) {
        if (!latest) {
          latest = s.last_follow_up;
        } else {
          const t1 = parseDbDate(s.last_follow_up)?.getTime() || 0;
          const t2 = parseDbDate(latest)?.getTime() || 0;
          if (t1 > t2) latest = s.last_follow_up;
        }
      }
    });
    return latest;
  };

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

  // ── Rate editing state & handler ─────────────────────────────
  const [editingRateGroupKey, setEditingRateGroupKey] = useState<string | null>(null);
  const [rateInputValue, setRateInputValue] = useState<string>("");
  const [savingRate, setSavingRate] = useState(false);

  const handleSaveRate = async (groupKey: string, shipmentsToUpdate: Shipment[]) => {
    if (!rateInputValue.trim()) {
      setEditingRateGroupKey(null);
      return;
    }
    const numRate = parseFloat(rateInputValue.trim());
    if (isNaN(numRate)) {
      toast.error("Please enter a valid numeric rate.");
      return;
    }
    setSavingRate(true);
    try {
      for (const s of shipmentsToUpdate) {
        await api.patch(`/shipments/${s.ref_no}/status`, {
          cost: numRate
        });
      }
      toast.success("Rate updated successfully!");
      setShipments(prev => prev.map(s => {
        if (shipmentsToUpdate.some(gs => gs.ref_no === s.ref_no)) {
          return { ...s, cost: numRate };
        }
        return s;
      }));
      setEditingRateGroupKey(null);
    } catch {
      toast.error("Failed to update rate.");
    } finally {
      setSavingRate(false);
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
    if (clickTimerRef.current && lastClickedRef.current === shipment.ref_no) {
      // Double-click detected
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      lastClickedRef.current = null;
      setSelected(shipment);
      setModalOpen(true);
    } else {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
      lastClickedRef.current = shipment.ref_no;
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        lastClickedRef.current = null;
        // Single click — no-op (double click opens modal)
      }, 250);
    }
  };

  const handleGroupRowClick = (basePrefix: string) => {
    // Toggles expansion immediately without opening detail modal
    toggleGroup(basePrefix);
  };

  // ── Status update from modal ────────────────────────────────
  const handleStatusUpdate = (updated: Shipment) => {
    setShipments((prev) => prev.map((s) => s.ref_no === updated.ref_no ? updated : s));
    setSelected(updated);
  };

  const canDeleteShipment = (role: string | undefined, status: string | undefined) => {
    const s = (status || '').toLowerCase();
    if (s === 'confirmed' || s === 'completed') return false;
    if (role === 'operator') return s === 'pending';
    return true;
  };

  // ── Delete handler ──────────────────────────────────────────
  const handleDelete = (e: React.MouseEvent, refNo: string, status?: string) => {
    e.stopPropagation();
    const targetShipment = shipments.find((s) => s.ref_no === refNo);
    const currentStatus = (status || targetShipment?.status || '').toLowerCase();
    if (currentStatus === 'confirmed' || currentStatus === 'completed') {
      toast.error("Confirmed and Completed shipments cannot be deleted.");
      return;
    }
    if (user?.role === 'operator' && currentStatus !== 'pending') {
      toast.error("Operators can only delete shipments with Pending status.");
      return;
    }
    setPasswordPrompt({
      isOpen: true,
      actionName: `delete RFQ ${refNo}`,
      onSuccess: async () => {
        try {
          await api.delete(`/shipments/${refNo}`);
          toast.success(`RFQ ${refNo} deleted successfully.`);
          setShipments((prev) => prev.filter((s) => s.ref_no !== refNo));
        } catch (err: any) {
          const errMsg = err.response?.data?.message || "Failed to delete RFQ.";
          toast.error(errMsg);
        }
      }
    });
  };

  const handleDeleteGroup = (e: React.MouseEvent, basePrefix: string, groupShipments: Shipment[]) => {
    e.stopPropagation();
    if (groupShipments.some((s) => ['confirmed', 'completed'].includes((s.status || '').toLowerCase()))) {
      toast.error("Confirmed and Completed shipments cannot be deleted.");
      return;
    }
    if (user?.role === 'operator' && groupShipments.some((s) => (s.status || '').toLowerCase() !== 'pending')) {
      toast.error("Operators can only delete shipments with Pending status.");
      return;
    }
    const groupLabel = getGroupLabel(basePrefix, groupShipments);
    setPasswordPrompt({
      isOpen: true,
      actionName: `delete all RFQs in group ${groupLabel}`,
      onSuccess: async () => {
        try {
          for (const s of groupShipments) {
            await api.delete(`/shipments/${s.ref_no}`);
          }
          toast.success(`Group ${groupLabel} deleted successfully.`);
          setShipments((prev) => prev.filter((s) => !groupShipments.some(gs => gs.ref_no === s.ref_no)));
        } catch (err: any) {
          const errMsg = err.response?.data?.message || "Failed to delete some RFQs in the group.";
          toast.error(errMsg);
        }
      }
    });
  };

  // ── Historical RFQ Creation ─────────────────────────────────
  const handleCreated = (s: Shipment) => {
    setShipments((prev) => [s, ...prev]);
  };

  // ── Grouping & Filtering ─────────────────────────────────────
  // 1. Group the raw shipments per customer request
  const groupedItems = (() => {
    const groups: { [key: string]: Shipment[] } = {};
    
    const getBasePrefix = (s: Shipment) => {
      const cleanCust = s.cust_req_no ? s.cust_req_no.trim() : "";
      if (cleanCust) {
        if (cleanCust.startsWith('ARG-')) {
          const parts = cleanCust.split('-');
          if (parts.length > 2) return `${parts[0]}-${parts[1]}`;
          return cleanCust;
        }
        return cleanCust;
      }
      const ref = s.ref_no || "";
      if (ref.startsWith('ARG-')) {
        const parts = ref.split('-');
        if (parts.length > 2) return `${parts[0]}-${parts[1]}`;
        return ref;
      }
      return ref.replace(/-\d+$/, '');
    };

    shipments.forEach(s => {
      const base = getBasePrefix(s);
      if (base) {
        if (!groups[base]) {
          groups[base] = [];
        }
        groups[base].push(s);
      }
    });

    // If a group has specific recipient rows, exclude the duplicate summary/broadcast row
    Object.keys(groups).forEach(base => {
      const list = groups[base];
      const hasSpecific = list.some(s => s.email !== 'Broadcast' && s.ref_no !== base);
      if (hasSpecific) {
        groups[base] = list.filter(s => s.email !== 'Broadcast' && s.ref_no !== base);
      }
    });

    const items: (Shipment | { isGroup: true; basePrefix: string; shipments: Shipment[]; originalShipments: Shipment[] })[] = [];
    const processedGroups = new Set<string>();

    shipments.forEach(s => {
      const base = getBasePrefix(s);
      if (base && groups[base]) {
        if (!processedGroups.has(base)) {
          processedGroups.add(base);
          const sortedGroup = [...groups[base]].sort((a, b) => {
            return a.ref_no.localeCompare(b.ref_no, undefined, { numeric: true, sensitivity: 'base' });
          });
          items.push({
            isGroup: true,
            basePrefix: base,
            shipments: sortedGroup,
            originalShipments: sortedGroup
          });
        }
      } else if (!base) {
        items.push(s);
      }
    });

    return items;
  })();

  // 2. Filter the grouped items
  const filteredItems = groupedItems.map(item => {
    if ('isGroup' in item) {
      const matchedChildren = item.shipments.filter(s => {
        if (statusFilter === "Active" && s.status === "Cancelled") return false;
        if (statusFilter !== "All" && statusFilter !== "Active" && s.status !== statusFilter) return false;

        const q = search.toLowerCase();
        if (!q) return true;

        const matchesField = [s.ref_no, s.cust_req_no, s.pol, s.pod, s.commodity, s.dear_who, s.carrier, s.status, s.customer_id]
          .some(v => v?.toLowerCase().includes(q));
        if (matchesField) return true;

        const groupLabel = getGroupLabel(item.basePrefix, item.originalShipments);
        if (groupLabel.toLowerCase().includes(q)) return true;

        return false;
      });

      if (matchedChildren.length === 0) return null;
      return {
        ...item,
        shipments: matchedChildren
      };
    } else {
      const s = item;
      if (statusFilter === "Active" && s.status === "Cancelled") return null;
      if (statusFilter !== "All" && statusFilter !== "Active" && s.status !== statusFilter) return null;

      const q = search.toLowerCase();
      if (q) {
        const matchesField = [s.ref_no, s.cust_req_no, s.pol, s.pod, s.commodity, s.dear_who, s.carrier, s.status, s.customer_id]
          .some(v => v?.toLowerCase().includes(q));
        if (!matchesField) return null;
      }
      return s;
    }
  }).filter((item): item is (Shipment | { isGroup: true; basePrefix: string; shipments: Shipment[]; originalShipments: Shipment[] }) => item !== null);

  // 3. Flat list of filtered shipments for export and counting
  const flatFilteredShipments = filteredItems.reduce<Shipment[]>((list, item) => {
    if ('isGroup' in item) {
      return list.concat(item.shipments);
    } else {
      list.push(item);
      return list;
    }
  }, []);

  const totalRecords = flatFilteredShipments.length;

  const fmtFollowUp = (val: string) => fmtFollowUpDate(val);

  return (
    <AppLayout
      title="Sent RFQs"
      subtitle="All quote requests excluding direct bookings."
      action={
        <div className="flex gap-3">
          <button 
            onClick={() => exportShipmentsToExcel(flatFilteredShipments, `Sent_RFQs_${format(new Date(), 'yyyyMMdd')}.xlsx`)} 
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
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">
            {loading ? "Loading…" : `${totalRecords} records`}
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
                <th>CUSTOMER ID/NAME</th>
                {!isSales && <th>DEAR WHO</th>}
                {isAdminOrOperator && <th>SALES</th>}
                <th>POL</th>
                <th>POD</th>
                <th>COMMODITY</th>
                <th>MODE</th>
                <th>TERM</th>
                <th>STATUS</th>
                {!isSales && <th>LAST FOLLOW-UP</th>}
                {!isSales && <th>REPLIES</th>}
                <th>CHAT</th>
                <th>RATE</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={isSales ? 12 : (isAdminOrOperator ? 16 : 15)} className="text-center py-16 text-muted">
                    <div className="space-y-2">
                      <p className="text-4xl">📭</p>
                      <p className="text-sm">No RFQ records found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  if ('isGroup' in item) {
                    const groupLabel = getGroupLabel(item.basePrefix, item.originalShipments);
                    const firstShipment = item.shipments[0];
                    const groupRepliesCount = item.shipments.reduce((sum, s) => sum + Number(s.replies_count || 0), 0);
                    const groupUnreadRepliesCount = item.shipments.reduce((sum, s) => sum + Number(s.unread_replies_count || 0), 0);
                    const groupUnreadChatCount = item.shipments.reduce((sum, s) => sum + Number(s.unread_chat_count || 0), 0);
                    const latestFollowUp = getGroupLastFollowUp(item.shipments);

                    // Check status consistency
                    const getGroupStatus = (shipmentsList: Shipment[]) => {
                      const statuses = shipmentsList.map(s => s.status);
                      const unique = Array.from(new Set(statuses));
                      return unique.length === 1 ? unique[0] : null;
                    };
                    const statusToShow = getGroupStatus(item.shipments) || firstShipment.status;

                    const isExpanded = expandedGroups.has(item.basePrefix);
                    return (
                      <Fragment key={item.basePrefix}>
                      <tr
                        onClick={() => handleGroupRowClick(item.basePrefix)}
                        onDoubleClick={(e) => {
                          if (isAdminOrOperator) {
                            e.stopPropagation();
                            setEditingRateGroupKey(item.basePrefix);
                            setRateInputValue(firstShipment.cost != null ? String(firstShipment.cost) : "");
                          }
                        }}
                        className="cursor-pointer bg-amber/[0.04] hover:bg-amber/[0.07] transition-colors border-l-2 border-amber/40"
                        style={{ animation: `fade-in 0.3s ease-out ${idx * 20}ms both` }}
                        title={isAdminOrOperator ? "Click to expand, double-click to input rate" : "Click to expand/collapse group"}
                      >
                        <td className="whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {item.shipments.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleGroup(item.basePrefix);
                                }}
                                className="w-5 h-5 rounded bg-blue/10 hover:bg-blue/20 border border-blue/20 text-blue hover:text-blue-bright transition-all duration-150 flex items-center justify-center shrink-0"
                                title={isExpanded ? "Collapse sub-records" : "Expand to view sub-records"}
                              >
                                <span className={`text-[9px] font-bold transition-transform duration-200 inline-block ${isExpanded ? 'rotate-180' : ''}`}>
                                  ▼
                                </span>
                              </button>
                            )}
                            <button
                              onClick={(e) => copyRefNo(e, groupLabel)}
                              className="font-mono text-xs font-bold text-blue hover:text-blue-bright px-2 py-1 rounded-lg bg-blue/10 hover:bg-blue/20 border border-blue/20 transition-all duration-150 group relative inline-flex items-center"
                              title="Click to copy"
                            >
                              {groupLabel}
                              <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-surface-4 text-primary text-[10px] px-2 py-0.5 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Click to copy
                              </span>
                            </button>
                          </div>
                        </td>
                        <td className="text-xs font-mono font-semibold text-blue bg-white/[0.02]">
                          {firstShipment.cust_req_no ?? "—"}
                        </td>
                        <td className="text-xs font-semibold text-emerald bg-white/[0.02]">{firstShipment.operator ?? "—"}</td>
                        <td className="text-muted font-mono bg-white/[0.03] text-xs font-semibold">{formatCustIdName(firstShipment.customer_id, firstShipment.customer_name)}</td>
                        {!isSales && (
                          <td>
                            {item.shipments.length > 1 ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleGroup(item.basePrefix);
                                }}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-amber/10 border border-white/[0.06] hover:border-amber/30 transition-all text-left"
                                title="Click down arrow to view all recipient emails"
                              >
                                <span className="font-semibold text-amber text-xs">{item.shipments.length} Emails</span>
                                <span className={`text-[9px] text-amber transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                              </button>
                            ) : (
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-primary">{firstShipment.dear_who || "—"}</span>
                                {firstShipment.email && firstShipment.email !== 'Broadcast' && (
                                  <span className="text-[10px] text-blue font-mono">{firstShipment.email}</span>
                                )}
                              </div>
                            )}
                          </td>
                        )}
                        {isAdminOrOperator && (
                          <td className="text-xs font-semibold text-amber bg-white/[0.02]">{firstShipment.refer_by || "—"}</td>
                        )}
                        <td title={firstShipment.pol ?? "—"}>{getFirstWord(firstShipment.pol)}</td>
                        <td title={firstShipment.pod ?? "—"}>{getFirstWord(firstShipment.pod)}</td>
                        <td className="max-w-[140px] truncate">{firstShipment.commodity ?? "—"}</td>
                        <td>
                          <span className="text-xs font-semibold text-muted uppercase">{firstShipment.mode ?? "—"}</span>
                        </td>
                        <td>{firstShipment.term ?? "—"}</td>
                        <td><Badge status={statusToShow} /></td>
                        {!isSales && (
                          <td className="text-xs">
                            {statusToShow === 'Cancelled' ? <span className="text-muted italic">Turned Off</span> : fmtFollowUp(latestFollowUp)}
                          </td>
                        )}
                        {!isSales && (
                          <td>
                            {groupRepliesCount > 0 && groupUnreadRepliesCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose/10 text-rose border border-rose/20 animate-pulse">
                                📩 New ({groupUnreadRepliesCount})
                              </span>
                            ) : groupRepliesCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.04] text-muted border border-white/[0.06]">
                                💬 Replied ({groupRepliesCount})
                              </span>
                            ) : (
                              <span className="text-faint text-xs">—</span>
                            )}
                          </td>
                        )}
                        <td>
                          {groupUnreadChatCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 animate-pulse">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                              </span>
                              New Msg ({groupUnreadChatCount})
                            </span>
                          ) : (
                            <span className="text-faint text-xs">—</span>
                          )}
                        </td>
                        <td
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => {
                            if (isAdminOrOperator) {
                              e.stopPropagation();
                              setEditingRateGroupKey(item.basePrefix);
                              setRateInputValue(firstShipment.cost != null ? String(firstShipment.cost) : "");
                            }
                          }}
                          className="font-semibold text-emerald text-xs cursor-pointer"
                          title={isAdminOrOperator ? "Double-click to set/edit rate for group" : ""}
                        >
                          {editingRateGroupKey === item.basePrefix ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={rateInputValue}
                                onChange={(e) => setRateInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveRate(item.basePrefix, item.shipments);
                                  if (e.key === "Escape") setEditingRateGroupKey(null);
                                }}
                                placeholder="Rate"
                                className="input-sm w-20 text-xs bg-surface-1 border border-blue/50 text-primary rounded px-1.5 py-0.5"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveRate(item.basePrefix, item.shipments)}
                                disabled={savingRate}
                                className="btn-primary text-[10px] px-1.5 py-0.5 font-bold"
                              >
                                {savingRate ? "..." : "✓"}
                              </button>
                              <button
                                onClick={() => setEditingRateGroupKey(null)}
                                className="btn-secondary text-[10px] px-1 py-0.5"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            firstShipment.cost != null
                              ? `QAR ${Number(firstShipment.cost).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : (isAdminOrOperator ? <span className="text-faint italic text-xs">Double-click rate</span> : "—")
                          )}
                        </td>
                        <td>
                          {item.originalShipments.every(s => canDeleteShipment(user?.role, s.status)) ? (
                            <button
                              onClick={(e) => handleDeleteGroup(e, item.basePrefix, item.originalShipments)}
                              className="text-muted hover:text-rose p-1.5 rounded hover:bg-rose/10 transition-colors"
                              title="Delete group"
                            >
                              🗑
                            </button>
                          ) : (
                            <span className="text-xs text-muted italic">Locked</span>
                          )}
                        </td>
                      </tr>
                      {/* ── Expanded child rows ── */}
                      {isExpanded && item.shipments.map((cs, cidx) => (
                        <tr
                          key={cs.ref_no}
                          onClick={() => handleRowClick(cs)}
                          onDoubleClick={(e) => {
                            if (isAdminOrOperator) {
                              e.stopPropagation();
                              setEditingRateGroupKey(cs.ref_no);
                              setRateInputValue(cs.cost != null ? String(cs.cost) : "");
                            }
                          }}
                          className="cursor-pointer bg-white/[0.01] hover:bg-white/[0.04] transition-colors border-l-4 border-amber/20"
                          title="Double-click to open details or edit rate"
                        >
                          <td className="pl-6">
                            <button
                              onClick={(e) => { e.stopPropagation(); copyRefNo(e, cs.ref_no); }}
                              className="font-mono text-xs font-bold text-blue hover:text-blue-bright
                                         px-2 py-1 rounded-lg bg-blue/10 hover:bg-blue/20 border border-blue/20
                                         transition-all duration-150 inline-flex items-center gap-1"
                              title="Click to copy"
                            >
                              <span className="text-muted mr-1">↳</span>{cs.ref_no}
                            </button>
                          </td>
                          <td className="text-xs font-mono font-semibold text-blue bg-white/[0.02]">{cs.cust_req_no ?? "—"}</td>
                          <td className="text-xs font-semibold text-emerald bg-white/[0.02]">{cs.operator ?? "—"}</td>
                          <td className="text-muted font-mono bg-white/[0.03] text-xs font-semibold">{formatCustIdName(cs.customer_id, cs.customer_name)}</td>
                          {!isSales && (
                            <td>
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-primary">{cs.dear_who || "—"}</span>
                                {cs.email && cs.email !== 'Broadcast' && (
                                  <span className="text-[10px] text-blue font-mono">{cs.email}</span>
                                )}
                              </div>
                            </td>
                          )}
                          {isAdminOrOperator && (
                            <td className="text-xs font-semibold text-amber bg-white/[0.02]">{cs.refer_by || "—"}</td>
                          )}
                          <td title={cs.pol ?? "—"}>{getFirstWord(cs.pol)}</td>
                          <td title={cs.pod ?? "—"}>{getFirstWord(cs.pod)}</td>
                          <td className="max-w-[140px] truncate">{cs.commodity ?? "—"}</td>
                          <td><span className="text-xs font-semibold text-muted uppercase">{cs.mode ?? "—"}</span></td>
                          <td>{cs.term ?? "—"}</td>
                          <td><Badge status={cs.status} /></td>
                          {!isSales && (
                            <td className="text-xs">
                              {cs.status === 'Cancelled' ? <span className="text-muted italic">Turned Off</span> : fmtFollowUp(cs.last_follow_up)}
                            </td>
                          )}
                          {!isSales && (
                            <td>
                              {Number(cs.replies_count || 0) > 0 && Number(cs.unread_replies_count || 0) > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose/10 text-rose border border-rose/20 animate-pulse">
                                  📩 New ({cs.unread_replies_count})
                                </span>
                              ) : Number(cs.replies_count || 0) > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.04] text-muted border border-white/[0.06]">
                                  💬 Replied ({cs.replies_count})
                                </span>
                              ) : (
                                <span className="text-faint text-xs">—</span>
                              )}
                            </td>
                          )}
                          <td>
                            {cs.unread_chat_count && Number(cs.unread_chat_count) > 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 animate-pulse">
                                New Msg ({cs.unread_chat_count})
                              </span>
                            ) : (
                              <span className="text-faint text-xs">—</span>
                            )}
                          </td>
                          <td
                            onClick={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => {
                              if (isAdminOrOperator) {
                                e.stopPropagation();
                                setEditingRateGroupKey(cs.ref_no);
                                setRateInputValue(cs.cost != null ? String(cs.cost) : "");
                              }
                            }}
                            className="font-semibold text-emerald text-xs cursor-pointer"
                            title={isAdminOrOperator ? "Double-click to set/edit rate" : ""}
                          >
                            {editingRateGroupKey === cs.ref_no ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={rateInputValue}
                                  onChange={(e) => setRateInputValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveRate(cs.ref_no, [cs]);
                                    if (e.key === "Escape") setEditingRateGroupKey(null);
                                  }}
                                  placeholder="Rate"
                                  className="input-sm w-20 text-xs bg-surface-1 border border-blue/50 text-primary rounded px-1.5 py-0.5"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveRate(cs.ref_no, [cs])}
                                  disabled={savingRate}
                                  className="btn-primary text-[10px] px-1.5 py-0.5 font-bold"
                                >
                                  {savingRate ? "..." : "✓"}
                                </button>
                                <button
                                  onClick={() => setEditingRateGroupKey(null)}
                                  className="btn-secondary text-[10px] px-1 py-0.5"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              cs.cost != null
                                ? `QAR ${Number(cs.cost).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : (isAdminOrOperator ? <span className="text-faint italic text-xs">Double-click rate</span> : "—")
                            )}
                          </td>
                          <td>
                            {canDeleteShipment(user?.role, cs.status) ? (
                              <button
                                onClick={(e) => handleDelete(e, cs.ref_no, cs.status)}
                                className="text-muted hover:text-rose p-1.5 rounded hover:bg-rose/10 transition-colors"
                                title="Delete RFQ"
                              >🗑</button>
                            ) : (
                              <span className="text-xs text-muted italic">Locked</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      </Fragment>
                    );
                  } else {
                    const s = item;
                    return (
                      <tr
                        key={s.ref_no}
                        onClick={() => handleRowClick(s)}
                        onDoubleClick={(e) => {
                          if (isAdminOrOperator) {
                            e.stopPropagation();
                            setEditingRateGroupKey(s.ref_no);
                            setRateInputValue(s.cost != null ? String(s.cost) : "");
                          }
                        }}
                        className="cursor-pointer"
                        style={{ animation: `fade-in 0.3s ease-out ${idx * 20}ms both` }}
                        title={isAdminOrOperator ? "Click to view, double-click to input rate" : "Double-click to open details"}
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
                        <td className="text-muted font-mono bg-white/[0.03] text-xs font-semibold">{formatCustIdName(s.customer_id, s.customer_name)}</td>
                        {!isSales && <td>{s.dear_who ?? "—"}</td>}
                        {isAdminOrOperator && (
                          <td className="text-xs font-semibold text-amber bg-white/[0.02]">{s.refer_by || "—"}</td>
                        )}
                        <td title={s.pol ?? "—"}>{getFirstWord(s.pol)}</td>
                        <td title={s.pod ?? "—"}>{getFirstWord(s.pod)}</td>
                        <td className="max-w-[140px] truncate">{s.commodity ?? "—"}</td>
                        <td>
                          <span className="text-xs font-semibold text-muted uppercase">{s.mode ?? "—"}</span>
                        </td>
                        <td>{s.term ?? "—"}</td>
                        <td><Badge status={s.status} /></td>
                        {!isSales && (
                          <td className="text-xs">
                            {s.status === 'Cancelled' ? <span className="text-muted italic">Turned Off</span> : fmtFollowUp(s.last_follow_up)}
                          </td>
                        )}
                        {!isSales && (
                          <td>
                            {Number(s.replies_count || 0) > 0 && Number(s.unread_replies_count || 0) > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose/10 text-rose border border-rose/20 animate-pulse">
                                📩 New ({s.unread_replies_count})
                              </span>
                            ) : Number(s.replies_count || 0) > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.04] text-muted border border-white/[0.06]">
                                💬 Replied ({s.replies_count})
                              </span>
                            ) : (
                              <span className="text-faint text-xs">—</span>
                            )}
                          </td>
                        )}
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
                        <td
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => {
                            if (isAdminOrOperator) {
                              e.stopPropagation();
                              setEditingRateGroupKey(s.ref_no);
                              setRateInputValue(s.cost != null ? String(s.cost) : "");
                            }
                          }}
                          className="font-semibold text-emerald text-xs cursor-pointer"
                          title={isAdminOrOperator ? "Double-click to set/edit rate" : ""}
                        >
                          {editingRateGroupKey === s.ref_no ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={rateInputValue}
                                onChange={(e) => setRateInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveRate(s.ref_no, [s]);
                                  if (e.key === "Escape") setEditingRateGroupKey(null);
                                }}
                                placeholder="Rate"
                                className="input-sm w-20 text-xs bg-surface-1 border border-blue/50 text-primary rounded px-1.5 py-0.5"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveRate(s.ref_no, [s])}
                                disabled={savingRate}
                                className="btn-primary text-[10px] px-1.5 py-0.5 font-bold"
                              >
                                {savingRate ? "..." : "✓"}
                              </button>
                              <button
                                onClick={() => setEditingRateGroupKey(null)}
                                className="btn-secondary text-[10px] px-1 py-0.5"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            s.cost != null
                              ? `QAR ${Number(s.cost).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : (isAdminOrOperator ? <span className="text-faint italic text-xs">Double-click rate</span> : "—")
                          )}
                        </td>
                        <td>
                          {canDeleteShipment(user?.role, s.status) ? (
                            <button
                              onClick={(e) => handleDelete(e, s.ref_no, s.status)}
                              className="text-muted hover:text-rose p-1.5 rounded hover:bg-rose/10 transition-colors"
                              title="Delete RFQ"
                            >
                              🗑
                            </button>
                          ) : (
                            <span className="text-xs text-muted italic">Locked</span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                })
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
