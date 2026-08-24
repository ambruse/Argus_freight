"use client";
// components/ui/Badge.tsx
// Vibrant status pill with dot indicator.
import { ShipmentStatus } from "@/types";

const STATUS_CONFIG: Record<ShipmentStatus, { dot: string; bg: string; border: string; text: string }> = {
  "Pending":         { dot: "#F59E0B", bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.22)",  text: "#F59E0B" },
  "Quoted":          { dot: "#F5B037", bg: "rgba(245,176,55,0.10)",  border: "rgba(245,176,55,0.22)",  text: "#F5B037" },
  "Customer Review": { dot: "#8B5CF6", bg: "rgba(139,92,246,0.10)",  border: "rgba(139,92,246,0.22)",  text: "#A78BFA" },
  "Confirmed":       { dot: "#10B981", bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.22)",  text: "#10B981" },
  "Files Pending":   { dot: "#38BDF8", bg: "rgba(56,189,248,0.10)",  border: "rgba(56,189,248,0.22)",  text: "#38BDF8" },
  "Completed":       { dot: "#059669", bg: "rgba(5,150,105,0.12)",   border: "rgba(5,150,105,0.25)",   text: "#34D399" },
  "Return Pending":  { dot: "#F59E0B", bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.22)",  text: "#FBBF24" },
  "Cancelled":       { dot: "#F43F5E", bg: "rgba(244,63,94,0.10)",   border: "rgba(244,63,94,0.22)",   text: "#F43F5E" },
};

const PULSE_STATUSES: ShipmentStatus[] = ["Pending", "Files Pending", "Return Pending"];

export default function Badge({ status }: { status: ShipmentStatus }) {
  const cfg = STATUS_CONFIG[status] ?? {
    dot: "#64748B", bg: "rgba(100,116,139,0.10)", border: "rgba(100,116,139,0.20)", text: "#64748B"
  };
  const isPulse = PULSE_STATUSES.includes(status);

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isPulse ? "animate-pulse" : ""}`}
        style={{ background: cfg.dot, boxShadow: `0 0 4px ${cfg.dot}` }}
      />
      {status}
    </span>
  );
}
