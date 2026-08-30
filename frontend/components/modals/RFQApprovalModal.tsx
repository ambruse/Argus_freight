"use client";
// components/modals/RFQApprovalModal.tsx
// Full-screen operator approval gate for incoming RFQs.
// Groups Auto Receiver batches and sends all sub-RFQs together in one click.
import { useState, useMemo } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";

export interface RFQApprovalItem {
  ref_no: string;
  cust_req_no?: string;
  type: "operator" | "customer";
  pol?: string;
  pod?: string;
  commodity?: string;
  mode?: string;
  container?: string | null;
  dimension?: string | null;
  customer_name?: string | null;
  refer_by?: string | null;
  submitter_role?: string;
  recipients_count?: number;
  email?: string;
  dear_who?: string;
}

interface Props {
  items: RFQApprovalItem[];
  onItemProcessed: (ref_no: string, cust_req_no?: string, all_ref_nos?: string[]) => void;
}

export default function RFQApprovalModal({ items, onItemProcessed }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);

  // Group items by root enquiry reference (cust_req_no or ref_no) so Auto Receiver batches appear as 1 validation card
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: RFQApprovalItem[] } = {};
    for (const item of items) {
      const key = (item.cust_req_no || item.ref_no || "").trim();
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }

    return Object.entries(groups).map(([groupKey, groupList]) => {
      const rep = groupList[0];
      const batchCount = Math.max(groupList.length, rep.recipients_count || 1);
      return {
        ...rep,
        groupKey,
        groupItems: groupList,
        batchCount,
        allRefNos: groupList.map((i) => i.ref_no),
      };
    });
  }, [items]);

  if (groupedItems.length === 0) return null;

  const currentGroup = groupedItems[currentIndex] ?? groupedItems[0];
  const isCustomer = currentGroup.type === "customer";
  const totalGroups = groupedItems.length;
  const isAutoReceiverBatch = currentGroup.batchCount > 1;

  const handleAccept = async () => {
    setLoading("accept");
    try {
      const refToApprove = currentGroup.cust_req_no || currentGroup.ref_no;
      const endpoint = isCustomer
        ? `/rfq/customer-approve/${refToApprove}`
        : `/rfq/${refToApprove}/approve`;

      try {
        await api.post(endpoint);
      } catch (firstErr: any) {
        if (firstErr?.response?.status === 404) {
          const fallbackEndpoint = isCustomer
            ? `/rfq/${currentGroup.ref_no}/approve`
            : `/rfq/customer-approve/${refToApprove}`;
          await api.post(fallbackEndpoint);
        } else {
          throw firstErr;
        }
      }

      toast.success(
        isAutoReceiverBatch
          ? `Auto Receiver set (${currentGroup.batchCount} RFQs) approved — all emails dispatched!`
          : `RFQ ${currentGroup.ref_no} approved — email dispatched!`,
        { duration: 5000 }
      );

      onItemProcessed(currentGroup.ref_no, currentGroup.cust_req_no, currentGroup.allRefNos);
      if (currentIndex >= groupedItems.length - 1) {
        setCurrentIndex(0);
      }
    } catch (err: any) {
      if (err?.response?.status === 400) {
        toast(err?.response?.data?.message || "This RFQ has already been processed.", { icon: "ℹ️" });
        onItemProcessed(currentGroup.ref_no, currentGroup.cust_req_no, currentGroup.allRefNos);
        if (currentIndex >= groupedItems.length - 1) {
          setCurrentIndex(0);
        }
      } else {
        toast.error(err?.response?.data?.message || "Failed to approve RFQ.");
      }
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    setLoading("reject");
    try {
      const refToReject = currentGroup.cust_req_no || currentGroup.ref_no;
      const endpoint = isCustomer
        ? `/rfq/customer-reject/${refToReject}`
        : `/rfq/${refToReject}/reject`;

      try {
        await api.post(endpoint);
      } catch (firstErr: any) {
        if (firstErr?.response?.status === 404) {
          const fallbackEndpoint = isCustomer
            ? `/rfq/${currentGroup.ref_no}/reject`
            : `/rfq/customer-reject/${refToReject}`;
          await api.post(fallbackEndpoint);
        } else {
          throw firstErr;
        }
      }

      toast.success(
        isAutoReceiverBatch
          ? `Auto Receiver set (${currentGroup.batchCount} RFQs) rejected.`
          : `RFQ ${currentGroup.ref_no} rejected.`,
        { duration: 5000 }
      );

      onItemProcessed(currentGroup.ref_no, currentGroup.cust_req_no, currentGroup.allRefNos);
      if (currentIndex >= groupedItems.length - 1) {
        setCurrentIndex(0);
      }
    } catch (err: any) {
      if (err?.response?.status === 400) {
        toast(err?.response?.data?.message || "This RFQ has already been processed.", { icon: "ℹ️" });
        onItemProcessed(currentGroup.ref_no, currentGroup.cust_req_no, currentGroup.allRefNos);
        if (currentIndex >= groupedItems.length - 1) {
          setCurrentIndex(0);
        }
      } else {
        toast.error(err?.response?.data?.message || "Failed to reject RFQ.");
      }
    } finally {
      setLoading(null);
    }
  };

  const goNext = () => setCurrentIndex((i) => Math.min(i + 1, groupedItems.length - 1));
  const goPrev = () => setCurrentIndex((i) => Math.max(i - 1, 0));

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
    >
      {/* Pulsing outer ring */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: "inset 0 0 80px rgba(249,115,22,0.12)",
          animation: "pulse 2s ease-in-out infinite",
        }}
      />

      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
        style={{
          background: "#151515",
          border: "1.5px solid rgba(249,115,22,0.35)",
          boxShadow: "0 0 60px rgba(249,115,22,0.20), 0 24px 64px rgba(0,0,0,0.7)",
        }}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4 flex items-center gap-3"
          style={{ borderBottom: "1px solid rgba(249,115,22,0.15)" }}
        >
          <span className="relative flex h-3 w-3 flex-shrink-0">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "#F97316" }}
            />
            <span
              className="relative inline-flex rounded-full h-3 w-3"
              style={{ background: "#F97316" }}
            />
          </span>
          <div className="flex-1">
            <p
              className="text-xs font-bold uppercase tracking-widest flex items-center gap-2"
              style={{ color: "#F97316" }}
            >
              RFQ Requires Your Approval
              {isAutoReceiverBatch && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 normal-case tracking-normal font-semibold">
                  Auto Receiver Set ({currentGroup.batchCount})
                </span>
              )}
            </p>
            {totalGroups > 1 && (
              <p className="text-[11px] mt-0.5" style={{ color: "#888" }}>
                {currentIndex + 1} of {totalGroups} pending
              </p>
            )}
          </div>
          {totalGroups > 1 && (
            <div className="flex gap-1">
              <button
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="px-2 py-1 rounded text-xs disabled:opacity-30"
                style={{ background: "rgba(249,115,22,0.10)", color: "#F97316" }}
              >
                ‹
              </button>
              <button
                onClick={goNext}
                disabled={currentIndex === groupedItems.length - 1}
                className="px-2 py-1 rounded text-xs disabled:opacity-30"
                style={{ background: "rgba(249,115,22,0.10)", color: "#F97316" }}
              >
                ›
              </button>
            </div>
          )}
        </div>

        {/* RFQ Details */}
        <div className="px-6 py-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#888" }}>REF NO</span>
            <span className="text-sm font-bold font-mono" style={{ color: "#F0F0F0" }}>
              {currentGroup.cust_req_no || currentGroup.ref_no}
            </span>
          </div>

          {isAutoReceiverBatch && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#888" }}>Auto Receiver</span>
              <span className="text-xs font-semibold text-emerald-400">
                {currentGroup.batchCount} Matching Agents (All dispatched together)
              </span>
            </div>
          )}

          {currentGroup.customer_name && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#888" }}>Customer</span>
              <span className="text-sm font-medium" style={{ color: "#F0F0F0" }}>{currentGroup.customer_name}</span>
            </div>
          )}

          {(currentGroup.pol || currentGroup.pod) && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#888" }}>Route</span>
              <span className="text-sm font-medium" style={{ color: "#F0F0F0" }}>
                {currentGroup.pol || "—"} <span style={{ color: "#F97316" }}>➔</span> {currentGroup.pod || "—"}
              </span>
            </div>
          )}

          {currentGroup.commodity && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#888" }}>Commodity</span>
              <span className="text-sm font-medium" style={{ color: "#F0F0F0" }}>{currentGroup.commodity}</span>
            </div>
          )}

          {currentGroup.mode && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#888" }}>Mode</span>
              <span className="text-sm font-medium" style={{ color: "#F0F0F0" }}>{currentGroup.mode}</span>
            </div>
          )}

          {(currentGroup.container || currentGroup.dimension) && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#888" }}>Load</span>
              <span className="text-sm font-medium" style={{ color: "#F0F0F0" }}>
                {currentGroup.container || currentGroup.dimension || "—"}
              </span>
            </div>
          )}

          {currentGroup.refer_by && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#888" }}>
                {currentGroup.submitter_role === "customer" ? "Customer" : "Submitted by"}
              </span>
              <span className="text-sm font-medium" style={{ color: "#F0F0F0" }}>{currentGroup.refer_by}</span>
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div
          className="mx-6 mb-5 px-4 py-3 rounded-xl text-xs leading-relaxed"
          style={{
            background: "rgba(249,115,22,0.07)",
            border: "1px solid rgba(249,115,22,0.18)",
            color: "#F97316",
          }}
        >
          {isAutoReceiverBatch
            ? `Accept to validate this entire Auto Receiver set and dispatch emails to all ${currentGroup.batchCount} agents together in one click.`
            : `Accept to process this RFQ and dispatch the email. Reject to cancel it immediately.`}
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6 grid grid-cols-2 gap-3">
          <button
            onClick={handleReject}
            disabled={!!loading}
            className="py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
            style={{
              background: "rgba(244,63,94,0.12)",
              border: "1.5px solid rgba(244,63,94,0.35)",
              color: loading === "reject" ? "#888" : "#F43F5E",
            }}
          >
            {loading === "reject" ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Rejecting…
              </span>
            ) : isAutoReceiverBatch ? (
              `✕  Reject All (${currentGroup.batchCount})`
            ) : (
              "✕  Reject"
            )}
          </button>

          <button
            onClick={handleAccept}
            disabled={!!loading}
            className="py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
            style={{
              background: loading === "accept" ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.18)",
              border: "1.5px solid rgba(16,185,129,0.40)",
              color: loading === "accept" ? "#888" : "#10B981",
            }}
          >
            {loading === "accept" ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Approving & Sending…
              </span>
            ) : isAutoReceiverBatch ? (
              `✓  Accept & Send All (${currentGroup.batchCount})`
            ) : (
              "✓  Accept & Send"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

