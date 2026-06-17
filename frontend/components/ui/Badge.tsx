"use client";
// components/ui/Badge.tsx
// Status badge with color-coded styles per shipment status.
import { ShipmentStatus } from "@/types";

const STATUS_STYLES: Record<ShipmentStatus, string> = {
  "Pending":         "bg-amber/15 text-amber border border-amber/20",
  "Quoted":          "bg-blue/15 text-blue border border-blue/20",
  "Customer Review": "bg-violet/15 text-violet border border-violet/20",
  "Confirmed":       "bg-emerald/15 text-emerald border border-emerald/20",
  "Files Pending":   "bg-blue-bright/15 text-blue-bright border border-blue-bright/20",
  "Completed":       "bg-emerald/20 text-emerald border border-emerald/30",
  "Return Pending":  "bg-amber/15 text-amber border border-amber/20",
  "Cancelled":       "bg-rose/15 text-rose border border-rose/20",
};

export default function Badge({ status }: { status: ShipmentStatus }) {
  return (
    <span className={`badge ${STATUS_STYLES[status] ?? "bg-white/10 text-muted"}`}>
      {status}
    </span>
  );
}
