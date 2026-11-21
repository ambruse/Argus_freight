import { TRACKING_STAGES } from "./model";

const colors: Record<string, string> = {
  Confirmed: "text-muted bg-surface-3", Scheduled: "text-gold bg-gold/10", "In Transit": "text-sky bg-sky/10",
  Clearance: "text-violet bg-violet/10", Warehouse: "text-amber bg-amber/10", Delivered: "text-emerald bg-emerald/10",
};
export function StageBadge({ stage }: { stage?: string }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${colors[stage || ""] || colors.Confirmed}`}><span aria-hidden="true" className="mr-1.5">●</span>{stage || "Not set"}</span>;
}
export function StageProgress({ stage }: { stage: string }) {
  const active = TRACKING_STAGES.indexOf(stage as typeof TRACKING_STAGES[number]);
  return <ol aria-label="Shipment progress" className="grid grid-cols-3 sm:grid-cols-6 gap-2 my-4">{TRACKING_STAGES.map((name, index) => <li key={name} aria-current={index === active ? "step" : undefined} className={`border-t-2 pt-2 text-xs ${index <= active ? "border-gold text-primary" : "border-white/10 text-muted"}`}><span className="font-mono mr-1">{index < active ? "✓" : String(index + 1).padStart(2, "0")}</span>{name}</li>)}</ol>;
}
