// types/index.ts
// ─────────────────────────────────────────────────────────────
//  Shared TypeScript interfaces mirroring the DB schema.
// ─────────────────────────────────────────────────────────────

export type ShipmentStatus =
  | "Pending"
  | "Quoted"
  | "Customer Review"
  | "Confirmed"
  | "Files Pending"
  | "Completed"
  | "Return Pending"
  | "Cancelled";

export const ALL_STATUSES: ShipmentStatus[] = [
  "Pending",
  "Quoted",
  "Customer Review",
  "Confirmed",
  "Files Pending",
  "Completed",
  "Return Pending",
  "Cancelled",
];

export const RFQ_STATUSES: ShipmentStatus[] = [
  "Pending",
  "Quoted",
  "Customer Review",
  "Confirmed",
];

export interface Shipment {
  id:               number;
  ref_no:           string;
  customer_id:      string | null;
  refer_by:         string | null;
  pol:              string | null;
  pod:              string | null;
  commodity:        string | null;
  term:             string | null;
  dimension:        string | null;
  container:        string | null;
  mode:             string | null;
  weight:           string | number | null;
  pickup_address:   string | null;
  delivery_address: string | null;
  dear_who:         string | null;
  email:            string | null;
  status:           ShipmentStatus;
  last_follow_up:   string;
  do_number:        string | null;
  box_no:           string | null;
  so_number:        string | null;
  bl_number:        string | null;
  track_status:     string | null;
  carrier:          string | null;
  etd:              string | null;
  eta:              string | null;
  cost:             string | number | null;
  profit:           string | number | null;
  note:             string | null;
  customer_name:    string | null;
  customer_email:   string | null;
  created_at:       string;
  updated_at:       string;
  operator?:        string | null;
  replies_count?:   number | string;
  unread_replies_count?: number | string;
}

export interface ShipmentFile {
  id:               number;
  shipment_ref_no:  string;
  filename:         string;
  original_name:    string;
  file_path:        string;
  mime_type:        string;
  size_bytes:       number;
  uploaded_at:      string;
}

export interface ShipmentReply {
  id:          number;
  ref_no:      string;
  from_email:  string;
  subject:     string;
  body_text:   string;
  received_at: string;
  is_outgoing?: boolean;
}

export interface DashboardMetrics {
  // Pipeline
  totalRFQs:        number;
  quotationPending: number;
  quoted:           number;
  customerReview:   number;
  confirmed:        number;
  // Execution
  filesPending:     number;
  completed:        number;
  returnPending:    number;
  cancelled:        number;
  followUpsDue:     number;
}

export interface Contact {
  id: number;
  email: string;
  dear_who: string;
  pol: string;
  pod: string;
  mode: string | null;
  created_at: string;
}

export interface Customer {
  id: number;
  customer_id: string;
  name: string;
  created_at: string;
}
