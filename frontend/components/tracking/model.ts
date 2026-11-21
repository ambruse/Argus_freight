export const TRACKING_STAGES = ["Confirmed", "Scheduled", "In Transit", "Clearance", "Warehouse", "Delivered"] as const;
export type TrackingRecord = Record<string, any> & { ref_no: string; cust_req_no?: string; track_status?: string };
export type TrackingEvent = { id: number; event_title: string; event_description?: string; location_name?: string; location_country?: string; event_time: string; created_at?: string; new_status?: string; is_public?: boolean | number; source?: string; created_by?: string | number };
export const FINANCIAL_FIELDS = ["cost", "customer_charge", "profit", "actual_profit"];
export const DATE_FIELDS = ["etd", "eta", "actual_departure", "actual_arrival", "booking_date", "cargo_ready_date", "pickup_date", "customs_clearance_date", "warehouse_arrival_date", "delivery_date", "next_update"];
export const NUMERIC_FIELDS = ["package_count", "gross_weight", "chargeable_weight", "cargo_volume", "net_weight", "container_count", ...FINANCIAL_FIELDS];
export function displayDate(value: unknown, withTime = false) {
  if (!value) return "—";
  const text = String(value);
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00Z` : /[zZ]|[+-]\d{2}:\d{2}$/.test(text) ? text : `${text.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(date);
}
export function trackingUrl(ref: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
  return `${base.replace(/\/$/, "")}/tracking?ref=${encodeURIComponent(ref)}`;
}
export function missingFields(row: TrackingRecord) {
  return ["pol", "pod", "pol_country", "pod_country", "commodity", "etd", "eta", "carrier", "track_status"].filter(key => !row[key]);
}
export function isOverdue(row: TrackingRecord) {
  if (typeof row.overdue === "boolean") return row.overdue;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Qatar", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return !!row.eta && row.track_status !== "Delivered" && String(row.eta).slice(0, 10) < today;
}
export function apiError(error: any, fallback: string) {
  return error?.response?.data?.message || error?.response?.data?.error || fallback;
}
export function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${(/^[=+@\-\t\r]/.test(text) ? "'" + text : text).replace(/"/g, '""')}"`;
}
