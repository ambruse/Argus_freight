"use client";
// components/modals/RFQApprovalModal.tsx
// Full-screen operator approval gate for incoming RFQs.
import { useState } from "react";
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
}

interface Props {
  items: RFQApprovalItem[];
  onItemProcessed: (ref_no: string) => void;
}

export default function RFQApprovalModal({ items, onItemProcessed }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);

  if (items.length === 0) return null;

  const item = items[currentIndex] ?? items[0];
  const isCustomer = item.type === "customer";
  const total = items.length;

  const handleAccept = async () => {
    setLoading("accept");
    try {
      const endpoint = isCustomer
        ? `/rfq/customer-approve/${item.cust_req_no || item.ref_no}`
        : `/rfq/${item.ref_no}/approve`;
      try {
        await api.post(endpoint);
      } catch (firstErr: any) {
        if (firstErr?.response?.status === 404) {
          const fallbackEndpoint = isCustomer
            ? `/rfq/${item.ref_no}/approve`
            : `/rfq/customer-approve/${item.cust_req_no || item.ref_no}`;
          await api.post(fallbackEndpoint);
        } else {
          throw firstErr;
        }
      }
      toast.success(`RFQ ${item.ref_no} approved — email dispatched!`, { duration: 5000 });
      onItemProcessed(item.ref_no);
      if (currentIndex >= items.length - 1) {
        setCurrentIndex(0);
      }
    } catch (err: any) {
      if (err?.response?.status === 400) {
        toast(err?.response?.data?.message || "This RFQ has already been processed.", { icon: "ℹ️" });
        onItemProcessed(item.ref_no);
        if (currentIndex >= items.length - 1) {
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
      const endpoint = isCustomer
        ? `/rfq/customer-reject/${item.cust_req_no || item.ref_no}`
        : `/rfq/${item.ref_no}/reject`;
      try {
        await api.post(endpoint);
      } catch (firstErr: any) {
        if (firstErr?.response?.status === 404) {
          const fallbackEndpoint = isCustomer
            ? `/rfq/${item.ref_no}/reject`
            : `/rfq/customer-reject/${item.cust_req_no || item.ref_no}`;
          await api.post(fallbackEndpoint);
        } else {
          throw firstErr;
        }
      }
      toast.success(`RFQ ${item.ref_no} rejected.`, { duration: 5000 });
      onItemProcessed(item.ref_no);
      if (currentIndex >= items.length - 1) {
        setCurrentIndex(0);
      }
    } catch (err: any) {
      if (err?.response?.status === 400) {
        toast(err?.response?.data?.message || "This RFQ has already been processed.", { icon: "ℹ️" });
        onItemProcessed(item.ref_no);
        if (currentIndex >= items.length - 1) {
          setCurrentIndex(0);
        }
      } else {
        toast.error(err?.response?.data?.message || "Failed to reject RFQ.");
      }
    } finally {
      setLoading(null);
    }
  };

  const goNext = () => setCurrentIndex((i) => Math.min(i + 1, items.length - 1));
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
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "#F97316" }}
            >
              RFQ Requires Your Approval
            </p>
            {total > 1 && (
              <p className="text-[11px] mt-0.5" style={{ color: "#888" }}>
                {currentIndex + 1} of {total} pending
              </p>
            )}
          </div>
          {total > 1 && (
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
                disabled={currentIndex === items.length - 1}
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
            <span className="text-sm font-bold" style={{ color: "#F0F0F0" }}>{item.ref_no}</span>
          </div>

          {item.customer_name && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#888" }}>Customer</span>
              <span className="text-sm font-medium" style={{ color: "#F0F0F0" }}>{item.customer_name}</span>
            </div>
          )}

          {(item.pol || item.pod) && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#888" }}>Route</span>
              <span className="text-sm font-medium" style={{ color: "#F0F0F0" }}>
                {item.pol || "—"} <span style={{ color: "#F97316" }}>➔</span> {item.pod || "—"}
              </span>
            </div>
          )}

          {item.commodity && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#888" }}>Commodity</span>
              <span className="text-sm font-medium" style={{ color: "#F0F0F0" }}>{item.commodity}</span>
            </div>
          )}

          {item.mode && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#888" }}>Mode</span>
              <span className="text-sm font-medium" style={{ color: "#F0F0F0" }}>{item.mode}</span>
            </div>
          )}

          {(item.container || item.dimension) && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#888" }}>Load</span>
              <span className="text-sm font-medium" style={{ color: "#F0F0F0" }}>
                {item.container || item.dimension || "—"}
              </span>
            </div>
          )}

          {item.refer_by && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#888" }}>
                {item.submitter_role === "customer" ? "Customer" : "Submitted by"}
              </span>
              <span className="text-sm font-medium" style={{ color: "#F0F0F0" }}>{item.refer_by}</span>
            </div>
          )}

          {isCustomer && item.recipients_count && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#888" }}>Agents to notify</span>
              <span className="text-sm font-medium" style={{ color: "#F0F0F0" }}>{item.recipients_count}</span>
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div
          className="mx-6 mb-5 px-4 py-3 rounded-xl text-xs"
          style={{
            background: "rgba(249,115,22,0.07)",
            border: "1px solid rgba(249,115,22,0.18)",
            color: "#F97316",
          }}
        >
          Accept to process this RFQ and dispatch the email. Reject to cancel it immediately. This modal cannot be dismissed — action is required.
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
                Approving…
              </span>
            ) : (
              "✓  Accept & Send"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
