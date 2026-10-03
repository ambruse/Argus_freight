"use client";
// app/operator/approvals/page.tsx
// ─────────────────────────────────────────────────────────────
//  Operator RFQ Approval Page
//  Lists all RFQs with "Awaiting Approval" status.
//  Operator can Accept or Reject each one inline.
// ─────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

interface PendingRFQ {
  ref_no: string;
  cust_req_no?: string | null;
  pol?: string | null;
  pod?: string | null;
  commodity?: string | null;
  mode?: string | null;
  container?: string | null;
  dimension?: string | null;
  customer_name?: string | null;
  customer_id?: string | null;
  refer_by?: string | null;
  operator?: string | null;
  status: string;
  created_at?: string | null;
  email?: string | null;
  dear_who?: string | null;
}

// Group by cust_req_no prefix (same logic as RFQApprovalModal)
interface ApprovalGroup {
  groupKey: string;        // cust_req_no or ref_no of the first item
  items: PendingRFQ[];
  batchCount: number;
  allRefNos: string[];
  rep: PendingRFQ;         // representative (first) item
}

function getBaseGroupKey(item: PendingRFQ): string {
  if (item.cust_req_no && item.cust_req_no.trim()) {
    const clean = item.cust_req_no.trim();
    const parts = clean.split("-");
    if (parts.length > 2) return `${parts[0]}-${parts[1]}`;
    return clean;
  }
  const ref = (item.ref_no || "").trim();
  const parts = ref.split("-");
  if (parts.length > 2) return `${parts[0]}-${parts[1]}`;
  return ref;
}

function buildGroups(items: PendingRFQ[]): ApprovalGroup[] {
  const map: Record<string, PendingRFQ[]> = {};
  for (const item of items) {
    const key = getBaseGroupKey(item);
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return Object.entries(map).map(([groupKey, list]) => ({
    groupKey,
    items: list,
    batchCount: list.length,
    allRefNos: list.map((i) => i.ref_no),
    rep: list[0],
  }));
}

// ── Skeleton Card ─────────────────────────────────────────────
const SkeletonCard = () => (
  <div
    className="rounded-2xl p-5 animate-pulse"
    style={{ background: "#151515", border: "1px solid rgba(255,255,255,0.06)" }}
  >
    <div className="flex justify-between items-start mb-4">
      <div className="h-5 w-32 rounded-full bg-white/[0.06]" />
      <div className="h-5 w-20 rounded-full bg-white/[0.06]" />
    </div>
    <div className="space-y-2 mb-5">
      {[80, 60, 70, 50].map((w, i) => (
        <div key={i} className="h-3 rounded-full bg-white/[0.04]" style={{ width: `${w}%` }} />
      ))}
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="h-10 rounded-xl bg-white/[0.04]" />
      <div className="h-10 rounded-xl bg-white/[0.04]" />
    </div>
  </div>
);

export default function OperatorApprovalsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState<ApprovalGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingKey, setProcessingKey] = useState<Record<string, "accept" | "reject" | null>>({});

  // Redirect non-operators away (admin never handles operator approvals)
  useEffect(() => {
    if (user && user.role !== "operator") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/shipments?exclude_direct=true");
      const all: PendingRFQ[] = data.data || [];

      // Only show "Awaiting Approval" items strictly assigned to this operator
      const pending = all.filter((s) => {
        if ((s.status || "").trim() !== "Awaiting Approval") return false;
        if (user?.role === "operator") {
          const op = (s.operator || "").trim().toLowerCase();
          const uname = (user.username || "").trim().toLowerCase();
          const dname = ((user as any).name || "").trim().toLowerCase();
          const uid = user.id ? `u${user.id}`.toLowerCase() : "";
          const rawId = user.id ? String(user.id).toLowerCase() : "";
          return !!op && (op === uname || (!!dname && op === dname) || (!!uid && op === uid) || (!!rawId && op === rawId));
        }
        return false;
      });

      setGroups(buildGroups(pending));
    } catch {
      toast.error("Failed to load pending approvals.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchPending();
  }, [user, fetchPending]);

  // Listen for real-time updates from NotificationListener
  useEffect(() => {
    const handler = () => fetchPending();
    window.addEventListener("rfq-list-update", handler);
    return () => window.removeEventListener("rfq-list-update", handler);
  }, [fetchPending]);

  const handleAccept = async (group: ApprovalGroup) => {
    setProcessingKey((p) => ({ ...p, [group.groupKey]: "accept" }));
    try {
      const refToApprove = group.rep.cust_req_no || group.rep.ref_no;
      try {
        await api.post(`/rfq/${refToApprove}/approve`);
      } catch (firstErr: any) {
        if (firstErr?.response?.status === 404) {
          await api.post(`/rfq/customer-approve/${refToApprove}`);
        } else {
          throw firstErr;
        }
      }

      toast.success(
        group.batchCount > 1
          ? `Auto Receiver set (${group.batchCount} RFQs) approved — emails dispatched!`
          : `RFQ ${group.groupKey} approved — email dispatched!`,
        { duration: 5000 }
      );

      // Remove from local state immediately
      setGroups((prev) => prev.filter((g) => g.groupKey !== group.groupKey));
      window.dispatchEvent(new CustomEvent("rfq-list-update"));
    } catch (err: any) {
      if (err?.response?.status === 400) {
        toast(err?.response?.data?.message || "This RFQ has already been processed.", { icon: "ℹ️" });
        setGroups((prev) => prev.filter((g) => g.groupKey !== group.groupKey));
      } else {
        toast.error(err?.response?.data?.message || "Failed to approve RFQ.");
      }
    } finally {
      setProcessingKey((p) => ({ ...p, [group.groupKey]: null }));
    }
  };

  const handleReject = async (group: ApprovalGroup) => {
    setProcessingKey((p) => ({ ...p, [group.groupKey]: "reject" }));
    try {
      const refToReject = group.rep.cust_req_no || group.rep.ref_no;
      try {
        await api.post(`/rfq/${refToReject}/reject`);
      } catch (firstErr: any) {
        if (firstErr?.response?.status === 404) {
          await api.post(`/rfq/customer-reject/${refToReject}`);
        } else {
          throw firstErr;
        }
      }

      toast.success(
        group.batchCount > 1
          ? `Auto Receiver set (${group.batchCount} RFQs) rejected.`
          : `RFQ ${group.groupKey} rejected.`,
        { duration: 5000 }
      );

      setGroups((prev) => prev.filter((g) => g.groupKey !== group.groupKey));
      window.dispatchEvent(new CustomEvent("rfq-list-update"));
    } catch (err: any) {
      if (err?.response?.status === 400) {
        toast(err?.response?.data?.message || "This RFQ has already been processed.", { icon: "ℹ️" });
        setGroups((prev) => prev.filter((g) => g.groupKey !== group.groupKey));
      } else {
        toast.error(err?.response?.data?.message || "Failed to reject RFQ.");
      }
    } finally {
      setProcessingKey((p) => ({ ...p, [group.groupKey]: null }));
    }
  };

  const pendingCount = groups.length;

  return (
    <AppLayout
      title="RFQ Approvals"
      subtitle="Review and process incoming RFQ requests before they are dispatched."
      action={
        <button onClick={fetchPending} className="btn-secondary text-xs px-3 py-2">
          ↻ Refresh
        </button>
      }
    >
      {/* ── Stats bar ─────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
          style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.20)" }}
        >
          <span className="relative flex h-2 w-2 flex-shrink-0">
            {pendingCount > 0 && (
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: "#F97316" }}
              />
            )}
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ background: pendingCount > 0 ? "#F97316" : "#4B5563" }}
            />
          </span>
          <span className="text-xs font-semibold" style={{ color: "#F97316" }}>
            {loading ? "Loading…" : `${pendingCount} pending approval${pendingCount !== 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : groups.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl"
          style={{ background: "#0F0F0F", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="text-5xl mb-4">✅</p>
          <p className="text-base font-semibold" style={{ color: "#F0F0F0" }}>
            All caught up!
          </p>
          <p className="text-sm mt-1" style={{ color: "#888" }}>
            No RFQs are awaiting your approval right now.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {groups.map((group) => {
            const state = processingKey[group.groupKey];
            const isAutoSet = group.batchCount > 1;
            const rep = group.rep;

            return (
              <div
                key={group.groupKey}
                className="rounded-2xl overflow-hidden flex flex-col"
                style={{
                  background: "#151515",
                  border: "1.5px solid rgba(249,115,22,0.22)",
                  boxShadow: "0 0 28px rgba(249,115,22,0.07)",
                }}
              >
                {/* Card header */}
                <div
                  className="px-5 pt-5 pb-3 flex items-start justify-between gap-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className="font-mono text-sm font-bold"
                        style={{ color: "#F0F0F0" }}
                      >
                        {rep.cust_req_no || rep.ref_no}
                      </span>
                      {isAutoSet && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            background: "rgba(59,130,246,0.15)",
                            border: "1px solid rgba(59,130,246,0.30)",
                            color: "#60A5FA",
                          }}
                        >
                          Auto Set ×{group.batchCount}
                        </span>
                      )}
                    </div>
                    <Badge status="Awaiting Approval" />
                  </div>
                </div>

                {/* Details */}
                <div className="px-5 py-4 flex-1 space-y-2.5">
                  {rep.customer_name && (
                    <Row label="Customer" value={rep.customer_name} />
                  )}
                  {(rep.pol || rep.pod) && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#555" }}>
                        Route
                      </span>
                      <span className="text-xs font-medium text-right" style={{ color: "#D1D5DB" }}>
                        {rep.pol || "—"}{" "}
                        <span style={{ color: "#F97316" }}>➔</span>{" "}
                        {rep.pod || "—"}
                      </span>
                    </div>
                  )}
                  {rep.commodity && <Row label="Commodity" value={rep.commodity} />}
                  {rep.mode && <Row label="Mode" value={rep.mode} />}
                  {(rep.container || rep.dimension) && (
                    <Row label="Load" value={rep.container || rep.dimension || "—"} />
                  )}
                  {rep.refer_by && <Row label="Submitted by" value={rep.refer_by} />}
                  {isAutoSet && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#555" }}>
                        Agents
                      </span>
                      <span className="text-xs font-semibold" style={{ color: "#34D399" }}>
                        {group.batchCount} — dispatched together
                      </span>
                    </div>
                  )}
                </div>

                {/* Info note */}
                <div
                  className="mx-5 mb-4 px-3.5 py-2.5 rounded-xl text-[11px] leading-relaxed"
                  style={{
                    background: "rgba(249,115,22,0.06)",
                    border: "1px solid rgba(249,115,22,0.14)",
                    color: "#D97706",
                  }}
                >
                  {isAutoSet
                    ? `Accept to dispatch emails to all ${group.batchCount} agents together.`
                    : "Accept to dispatch the email. Reject to cancel it immediately."}
                </div>

                {/* Action buttons */}
                <div className="px-5 pb-5 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleReject(group)}
                    disabled={!!state}
                    className="py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                    style={{
                      background: "rgba(244,63,94,0.10)",
                      border: "1.5px solid rgba(244,63,94,0.30)",
                      color: state === "reject" ? "#888" : "#F43F5E",
                    }}
                  >
                    {state === "reject" ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Rejecting…
                      </span>
                    ) : isAutoSet ? (
                      `✕  Reject All (${group.batchCount})`
                    ) : (
                      "✕  Reject"
                    )}
                  </button>

                  <button
                    onClick={() => handleAccept(group)}
                    disabled={!!state}
                    className="py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                    style={{
                      background: state === "accept" ? "rgba(16,185,129,0.10)" : "rgba(16,185,129,0.16)",
                      border: "1.5px solid rgba(16,185,129,0.38)",
                      color: state === "accept" ? "#888" : "#10B981",
                    }}
                  >
                    {state === "accept" ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Approving…
                      </span>
                    ) : isAutoSet ? (
                      `✓  Accept All (${group.batchCount})`
                    ) : (
                      "✓  Accept & Send"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}

// ── Small helper row ──────────────────────────────────────────
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider flex-shrink-0" style={{ color: "#555" }}>
        {label}
      </span>
      <span className="text-xs font-medium text-right truncate max-w-[60%]" style={{ color: "#D1D5DB" }}>
        {value}
      </span>
    </div>
  );
}
