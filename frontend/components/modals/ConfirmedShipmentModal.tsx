"use client";
// components/modals/ConfirmedShipmentModal.tsx
// ─────────────────────────────────────────────────────────────
//  Tabbed modal for confirmed shipments:
//  Tab 1 — Details View (tracking info + inline edit)
//  Tab 2 — File Manager (upload, list, open, delete PDFs)
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback, DragEvent, ChangeEvent } from "react";
import Modal from "@/components/ui/Modal";
import api from "@/lib/api";
import { Shipment, ShipmentFile, ShipmentReply } from "@/types";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { cleanEmailBody } from "@/lib/emailParser";
import { useAuth } from "@/hooks/useAuth";
import { io, Socket } from "socket.io-client";

interface Props {
  shipment:  Shipment | null;
  isOpen:    boolean;
  onClose:   () => void;
  onUpdated: (s: Shipment) => void;
}

// ── Reusable field display ────────────────────────────────────
function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest font-semibold text-muted">{label}</p>
      <p className="text-sm text-primary mt-0.5">{value || <span className="text-faint">—</span>}</p>
    </div>
  );
}

// ── Format file size ──────────────────────────────────────────
const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};

type Tab = "details" | "files" | "emails" | "chat";



export default function ConfirmedShipmentModal({ shipment, isOpen, onClose, onUpdated }: Props) {
  const { user } = useAuth();
  const isSales = user?.role === "sales";
  const [tab,       setTab]       = useState<Tab>("details");
  const [editing,   setEditing]   = useState(false);
  const [editForm,  setEditForm]  = useState<Partial<Shipment>>({});
  const [saving,    setSaving]    = useState(false);
  const [files,     setFiles]     = useState<ShipmentFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver,  setDragOver]  = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [replies, setReplies] = useState<ShipmentReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  const [showFollowUpConfirm, setShowFollowUpConfirm] = useState(false);

  const [showQuotationConfirm, setShowQuotationConfirm] = useState(false);
  const [sendingQuotation, setSendingQuotation] = useState(false);
  const [quotaForm, setQuotaForm] = useState({
    mode: "SEA" as "AIR" | "SEA",
    freightRate: "",
    exWork: "",
    validityDate: "",
    warTime: false,
    note: "",
    zone: "Zone-1",
    trans: "900",
    currency: "QAR"
  });

  const repliesEndRef = useRef<HTMLDivElement | null>(null);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChatMessage, setSendingChatMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !shipment) return;
    setSendingReply(true);
    try {
      const { data } = await api.post(`/shipments/${shipment.ref_no}/replies`, { message: replyText });
      toast.success("Reply email sent successfully.");
      setReplies((prev) => [...prev, data.data]);
      setReplyText("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to send reply email.");
    } finally {
      setSendingReply(false);
    }
  };

  const handleSendFollowUp = () => {
    setShowFollowUpConfirm(true);
  };

  const confirmSendFollowUp = async () => {
    if (!shipment) return;
    setSendingFollowUp(true);
    try {
      const { data } = await api.post(`/shipments/${shipment.ref_no}/follow-up`);
      toast.success("Follow-up email sent successfully.");
      setReplies((prev) => [...prev, data.data]);
      if (data.last_follow_up) {
        onUpdated({ ...shipment, last_follow_up: data.last_follow_up });
      }
      setShowFollowUpConfirm(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to send follow-up email.");
    } finally {
      setSendingFollowUp(false);
    }
  };

  const confirmSendQuotation = async () => {
    if (!shipment) return;
    if (!quotaForm.freightRate.trim()) {
      toast.error("Freight Rate is required.");
      return;
    }
    setSendingQuotation(true);
    try {
      const { data } = await api.post(`/shipments/${shipment.ref_no}/send-quotation`, {
        mode: quotaForm.mode,
        freightRate: quotaForm.freightRate,
        exWork: quotaForm.exWork,
        warTime: quotaForm.warTime,
        note: quotaForm.note,
        zone: quotaForm.zone,
        trans: quotaForm.trans,
        currency: quotaForm.currency,
        validityDate: quotaForm.validityDate
      });
      toast.success(data.message || "Quotation email sent successfully.");
      if (data.data) {
        setReplies((prev) => [...prev, data.data]);
      }
      if (data.last_follow_up) {
        onUpdated({ 
          ...shipment, 
          last_follow_up: data.last_follow_up,
          cost: data.cost,
          profit: data.profit
        });
      }
      fetchFiles(shipment.ref_no);
      setShowQuotationConfirm(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to send quotation email.");
    } finally {
      setSendingQuotation(false);
    }
  };

  // ── Load data on open ─────────────────────────────────────
  useEffect(() => {
    if (isOpen && shipment) {
      setTab("details");
      setEditing(false);
      setEditForm({
        do_number:    shipment.do_number    ?? "",
        box_no:       shipment.box_no       ?? "",
        so_number:    shipment.so_number    ?? "",
        bl_number:    shipment.bl_number    ?? "",
        track_status: shipment.track_status ?? "",
        carrier:      shipment.carrier      ?? "",
        etd:          shipment.etd          ? format(new Date(shipment.etd), "yyyy-MM-dd") : "",
        eta:          shipment.eta          ? format(new Date(shipment.eta), "yyyy-MM-dd") : "",
        cost:         shipment.cost         != null ? String(shipment.cost) : "",
        profit:       shipment.profit       != null ? String(shipment.profit) : "",
        customer_name:  shipment.customer_name  ?? "",
        customer_email: shipment.customer_email ?? "",
      });
      if (user?.role !== "customer") {
        fetchFiles(shipment.ref_no);
        fetchReplies(shipment.ref_no);
      }
      setQuotaForm({
        mode: shipment.mode === "Road" ? "SEA" : (shipment.mode as "AIR" | "SEA"),
        freightRate: "",
        exWork: "",
        validityDate: "",
        warTime: false,
        note: "",
        zone: "Zone-1",
        trans: shipment.mode === "AIR" ? "500" : "900",
        currency: "QAR"
      });
    }
  }, [isOpen, shipment, user]);

  useEffect(() => {
    if (!isOpen || !shipment || !shipment.customer_id) return;

    const roomKey = shipment.cust_req_no || shipment.ref_no;
    if (!roomKey) return;

    const socketUrl = typeof window !== "undefined"
      ? (process.env.NODE_ENV === "production"
          ? window.location.origin
          : `${window.location.protocol}//${window.location.hostname}:3001`)
      : "http://localhost:3001";

    const newSocket = io(socketUrl);
    setSocket(newSocket);

    newSocket.emit("joinRoom", `room_${roomKey}`);

    const fetchChatHistory = async () => {
      try {
        const { data } = await api.get(`/shipments/chat/${roomKey}`);
        if (data.success) {
          setChatMessages(data.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      }
    };

    fetchChatHistory();

    newSocket.on("newMessage", (msg: any) => {
      if (msg.cust_req_no === roomKey) {
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;

          // Alert user if the message is from someone else
          const currentUserRaw = typeof window !== "undefined" ? localStorage.getItem("freight_user") : null;
          const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;
          if (currentUser && msg.sender_username.toLowerCase() !== currentUser.username.toLowerCase()) {
            toast(`💬 New message from ${msg.sender_username}: "${msg.message.substring(0, 30)}${msg.message.length > 30 ? '...' : ''}"`, {
              icon: '💬',
            });
          }

          return [...prev, msg];
        });
      }
    });

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [isOpen, shipment]);

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !shipment) return;
    const roomKey = shipment.cust_req_no || shipment.ref_no;
    if (!roomKey) return;

    setSendingChatMessage(true);
    try {
      const { data } = await api.post(`/shipments/chat/${roomKey}`, {
        message: chatInput,
      });
      if (data.success) {
        setChatInput("");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to send message.");
    } finally {
      setSendingChatMessage(false);
    }
  };

  const fetchReplies = useCallback(async (refNo: string) => {
    setLoadingReplies(true);
    try {
      const { data } = await api.get(`/shipments/${refNo}/replies`);
      setReplies(data.data);
    } catch (err) {
      console.error("Failed to fetch replies", err);
    } finally {
      setLoadingReplies(false);
    }
  }, []);

  const fetchFiles = useCallback(async (refNo: string) => {
    try {
      const { data } = await api.get(`/files/${encodeURIComponent(refNo)}`);
      setFiles(data.data);
    } catch {
      toast.error("Failed to load files.");
    }
  }, []);

  // ── Save tracking edits ───────────────────────────────────
  const handleSaveTracking = async () => {
    if (!shipment) return;
    setSaving(true);
    try {
      const { data } = await api.patch(`/shipments/${shipment.ref_no}/tracking`, editForm);
      toast.success("Tracking info updated.");
      onUpdated(data.data);
      setEditing(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  // ── Upload file ───────────────────────────────────────────
  const handleUpload = async (file: File) => {
    if (!shipment) return;
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/webp"
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PDF and image files (PNG, JPG, JPEG, GIF, WEBP) are accepted.");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.post(`/files/${encodeURIComponent(shipment.ref_no)}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`${file.name} uploaded.`);
      fetchFiles(shipment.ref_no);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleUpload(f);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleUpload(f);
  };

  // ── Delete file ───────────────────────────────────────────
  const handleDelete = async (fileId: number, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await api.delete(`/files/${fileId}`);
      toast.success("File deleted.");
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch {
      toast.error("Delete failed.");
    }
  };

  // ── Open file in browser ──────────────────────────────────
  const openFile = (fileId: number) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("freight_token") : null;
    const url = token 
      ? `/api/files/download/${fileId}?token=${encodeURIComponent(token)}`
      : `/api/files/download/${fileId}`;
    window.open(url, "_blank");
  };

  if (!shipment) return null;

  const editSet = (k: keyof typeof editForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setEditForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Shipment — ${shipment.ref_no}`} size="xl">
      {/* ── Tab Bar ──────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface-4 border border-white/[0.05] mb-6">
        {(user?.role === "customer" 
          ? (shipment.customer_id ? (["details", "chat"] as Tab[]) : (["details"] as Tab[]))
          : (shipment.customer_id ? (["details", "files", "emails", "chat"] as Tab[]) : (["details", "files", "emails"] as Tab[]))
        ).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 capitalize
              ${tab === t
                ? "bg-blue text-white shadow-glow-blue"
                : "text-muted hover:text-primary"
              }`}
          >
            {t === "details" && "📋 Details"}
            {t === "files" && "📁 Files"}
            {t === "emails" && "📧 Emails"}
            {t === "chat" && "💬 Chat"}
            {t === "files" && files.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">{files.length}</span>
            )}
            {t === "emails" && replies.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">{replies.length}</span>
            )}
            {t === "chat" && chatMessages.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">{chatMessages.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* TAB 1: DETAILS                                    */}
      {/* ══════════════════════════════════════════════════ */}
      {tab === "details" && (
        <div className="space-y-6">
          {/* Base info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
            <InfoField label="REF NO"    value={shipment.ref_no} />
            <InfoField label="POL"       value={shipment.pol} />
            <InfoField label="POD"       value={shipment.pod} />
            <InfoField label="Commodity" value={shipment.commodity} />
            <InfoField label="Mode"      value={shipment.mode} />
            <InfoField label="Container" value={shipment.container} />
          </div>

          {/* Tracking section */}
          <div className="rounded-xl border border-white/[0.07] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-surface-4 border-b border-white/[0.05]">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">Tracking Information</p>
              {!editing && !isSales && (
                <button onClick={() => setEditing(true)} className="btn-secondary text-xs px-3 py-1.5">
                  ✎ Edit Tracking
                </button>
              )}
            </div>
            <div className="p-5">
              {editing ? (
                /* ── Edit Form ──────────────────────────────── */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      ["Carrier",      "carrier"],
                      ["Job/DO Number", "do_number"],
                      [shipment.mode?.toUpperCase() === "AIR" ? "AWB Number" : "BL Number", "bl_number"],
                      ["SO Number",    "so_number"],
                      ["Box No.",      "box_no"],
                      ["Cost (QAR)",  "cost"],
                      ["Profit (QAR)", "profit"],
                      ["Customer Name", "customer_name"],
                      ["Customer Email", "customer_email"],
                    ].map(([label, key]) => (
                      <div key={key}>
                        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted mb-1">{label}</p>
                        <input
                          className="input-sm"
                          value={(editForm as any)[key] ?? ""}
                          onChange={editSet(key as any)}
                          type={key === "cost" || key === "profit" ? "number" : "text"}
                        />
                      </div>
                    ))}
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-muted mb-1">ETD</p>
                      <input className="input-sm" type="date" value={editForm.etd as string} onChange={editSet("etd")} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-muted mb-1">ETA</p>
                      <input className="input-sm" type="date" value={editForm.eta as string} onChange={editSet("eta")} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-muted mb-1">Track Status</p>
                    <input className="input-sm" value={editForm.track_status as string} onChange={editSet("track_status")} />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={handleSaveTracking} disabled={saving} className="btn-primary text-sm">
                      {saving ? "Saving…" : "✓ Save Changes"}
                    </button>
                    <button onClick={() => setEditing(false)} className="btn-secondary text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                /* ── Read View ──────────────────────────────── */
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                  <InfoField label="Carrier"      value={shipment.carrier} />
                  <InfoField label="Job/DO Number"    value={shipment.do_number} />
                  <InfoField label={shipment.mode?.toUpperCase() === "AIR" ? "AWB Number" : "BL Number"}    value={shipment.bl_number} />
                  <InfoField label="SO Number"    value={shipment.so_number} />
                  <InfoField label="Box No."      value={shipment.box_no} />
                  <InfoField label="Cost"         value={shipment.cost != null ? `QAR ${Number(shipment.cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null} />
                  <InfoField label="Customer Price" value={shipment.cost != null ? `QAR ${(Number(shipment.cost) + Number(shipment.profit || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null} />
                  <InfoField label="Profit"       value={shipment.profit ? `QAR ${Number(shipment.profit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null} />
                  <InfoField label="ETD"          value={shipment.etd ? format(new Date(shipment.etd), "dd MMM yyyy") : null} />
                  <InfoField label="ETA"          value={shipment.eta ? format(new Date(shipment.eta), "dd MMM yyyy") : null} />
                  <InfoField label="Customer Name"  value={shipment.customer_name} />
                  <InfoField label="Customer Email" value={shipment.customer_email} />
                  <InfoField label="Track Status" value={shipment.track_status} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* TAB 3: EMAIL REPLIES                               */}
      {/* ══════════════════════════════════════════════════ */}
      {tab === "emails" && (
        <div className="space-y-4">
          {loadingReplies ? (
            <div className="text-sm text-muted">Loading replies...</div>
          ) : (
            <div className="space-y-4">
              {replies.length === 0 ? (
                <div className="text-center py-8 text-muted bg-surface-4 border border-white/[0.05] rounded-xl">
                  <p className="text-2xl mb-2">📥</p>
                  <p className="text-sm">No email replies yet.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {replies.filter(Boolean).map((r) => {
                    const isOutgoing = !!r.is_outgoing;
                    const senderLabel = isOutgoing ? "YOU" : (shipment.dear_who || "Customer");
                    const cleanedBody = cleanEmailBody(r.body_text);

                    return (
                      <div
                        key={r.id}
                        className={`flex flex-col ${isOutgoing ? "items-end" : "items-start"}`}
                      >
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted mb-1 px-1">
                          {senderLabel}
                        </span>
                        <div
                          className={`p-3.5 rounded-2xl border text-sm text-primary max-w-[85%] whitespace-pre-wrap transition-all duration-150 ${
                            isOutgoing
                              ? "bg-blue/10 border-blue/20 rounded-tr-none ml-8"
                              : "bg-surface-4 border-white/[0.05] rounded-tl-none mr-8"
                          }`}
                        >
                          <p>{cleanedBody}</p>
                          <p className="text-[9px] text-muted text-right mt-2 font-mono">
                            {r.received_at ? format(new Date(r.received_at), "dd MMM yyyy, HH:mm") : "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={repliesEndRef} />
                </div>
              )}

              {/* Quick Reply Form */}
              {!isSales && (
                <div className="p-4 rounded-xl bg-surface-4 border border-white/[0.05] space-y-3">
                  <p className="text-xs font-semibold text-muted">Send Quick Reply</p>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply here..."
                  disabled={sendingReply}
                  className="input-sm min-h-[90px] w-full text-sm bg-surface-1 border border-white/[0.08] rounded-lg p-2.5 text-primary placeholder-faint focus:border-blue/50 focus:outline-none"
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuotationConfirm(true)}
                    disabled={sendingReply || sendingFollowUp || sendingQuotation}
                    className="btn-secondary text-xs px-3 py-1.5 hover:text-emerald hover:border-emerald/30"
                  >
                    📨 Send Quotation to Customer
                  </button>
                  {replyText && (
                    <button
                      type="button"
                      onClick={() => setReplyText("")}
                      disabled={sendingReply || sendingFollowUp || sendingQuotation}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSendFollowUp}
                    disabled={sendingReply || sendingFollowUp || sendingQuotation}
                    className="btn-secondary text-xs px-3 py-1.5 hover:text-blue hover:border-blue/30"
                  >
                    {sendingFollowUp ? "Sending Follow-up..." : "📨 Send Follow up"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || sendingReply || sendingFollowUp || sendingQuotation}
                    className="btn-primary text-xs px-4 py-1.5"
                  >
                    {sendingReply ? "Sending..." : "📨 Send Reply"}
                  </button>
                </div>
              </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* TAB 2: FILE MANAGER                               */}
      {/* ══════════════════════════════════════════════════ */}
      {tab === "files" && (
        <div className="space-y-5">
          {/* ── Drop Zone ──────────────────────────────── */}
          {!isSales && (
            <div
              className={`drop-zone ${dragOver ? "drag-over" : ""} ${uploading ? "opacity-50 pointer-events-none" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={onFileChange}
            />
            <div className="space-y-2 pointer-events-none">
              <p className="text-3xl">{uploading ? "⏳" : "📄"}</p>
              <p className="text-sm font-semibold text-primary">
                {uploading ? "Uploading…" : "Click or drag & drop PDF or Image"}
              </p>
              <p className="text-xs text-muted">PDF and image files only · Max 10 MB</p>
            </div>
          </div>
          )}

          {/* ── File List ──────────────────────────────── */}
          {files.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <p className="text-2xl mb-2">📂</p>
              <p className="text-sm">No files attached yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">
                Attached Files ({files.length})
              </p>
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface-4 border border-white/[0.06]
                             hover:border-blue/20 transition-all duration-150 group"
                >
                  {/* PDF/Image icon */}
                  {file.mime_type && file.mime_type.startsWith("image/") ? (
                    <div className="w-9 h-9 flex-shrink-0 rounded-lg bg-emerald/10 border border-emerald/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-emerald">IMG</span>
                    </div>
                  ) : (
                    <div className="w-9 h-9 flex-shrink-0 rounded-lg bg-rose/10 border border-rose/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-rose">PDF</span>
                    </div>
                  )}

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{file.original_name}</p>
                    <p className="text-xs text-muted">
                      {fmtSize(file.size_bytes)} · {format(new Date(file.uploaded_at), "dd MMM yyyy, HH:mm")}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openFile(file.id)}
                      className="btn-secondary text-xs px-3 py-1.5"
                      title="Open in browser"
                    >
                      ↗ Open
                    </button>
                    {!isSales && (
                      <button
                        onClick={() => handleDelete(file.id, file.original_name)}
                        className="btn-danger text-xs px-3 py-1.5"
                        title="Delete file"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* TAB 4: CHAT                                        */}
      {/* ══════════════════════════════════════════════════ */}
      {tab === "chat" && shipment.customer_id && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface-4 border border-white/[0.05] space-y-4">
            {/* Messages List */}
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {chatMessages.length === 0 ? (
                <div className="text-center py-8 text-muted italic text-xs">
                  No messages yet. Send a message to start the conversation.
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.sender_username.toLowerCase() === user?.username?.toLowerCase();
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <span className="text-[9px] uppercase font-bold tracking-wider text-muted mb-1 px-1">
                        {isMe ? "YOU" : msg.sender_username}
                      </span>
                      <div
                        className={`p-3 rounded-2xl border text-sm text-primary max-w-[85%] whitespace-pre-wrap transition-all duration-150 ${
                          isMe
                            ? "bg-blue/10 border-blue/20 rounded-tr-none ml-8"
                            : "bg-surface-3 border-white/[0.05] rounded-tl-none mr-8"
                        }`}
                      >
                        <p>{msg.message}</p>
                        <p className="text-[8px] text-muted text-right mt-1.5 font-mono">
                          {msg.created_at ? format(new Date(msg.created_at), "dd MMM HH:mm") : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input field */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSendChatMessage();
                  }
                }}
                placeholder="Type your message here..."
                disabled={sendingChatMessage}
                className="input-sm flex-1 bg-surface-1 border border-white/[0.08] rounded-lg p-2.5 text-sm text-primary placeholder-faint focus:border-blue/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSendChatMessage}
                disabled={!chatInput.trim() || sendingChatMessage}
                className="btn-primary text-xs px-4 py-1.5 shrink-0"
              >
                {sendingChatMessage ? "Sending..." : "💬 Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Follow-Up Confirmation Modal ──────────────── */}
      <Modal
        isOpen={showFollowUpConfirm}
        onClose={() => setShowFollowUpConfirm(false)}
        title="Confirm Follow-up Email"
        size="md"
        footer={
          <>
            <button
              onClick={() => setShowFollowUpConfirm(false)}
              className="btn-secondary text-sm px-4 py-2"
              disabled={sendingFollowUp}
            >
              Cancel
            </button>
            <button
              onClick={confirmSendFollowUp}
              className="btn-primary text-sm px-5 py-2"
              disabled={sendingFollowUp}
            >
              {sendingFollowUp ? "Sending..." : "📨 Send Now"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            You are about to send a follow-up email to <span className="text-primary font-semibold">{shipment.dear_who || shipment.email || "this contact"}</span>.
          </p>

          <div className="p-4 rounded-xl bg-surface-4 border border-white/[0.05] space-y-3 font-sans text-sm text-primary">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted">Email Preview</p>
            <div className="border-t border-white/[0.06] pt-3 space-y-2">
              <p className="font-semibold text-blue">Subject: <span className="text-primary font-normal">Re: RFQ FROM {shipment.pol || ""} TO {shipment.pod || ""}...</span></p>
              <div className="bg-surface-1 rounded-lg p-3 text-xs text-muted font-mono whitespace-pre-wrap border border-white/[0.04] max-h-48 overflow-y-auto">
{`Dear ${shipment.dear_who || "Sir/Madam"},

I hope this email finds you well.

I am writing to gently follow up on my previous message regarding the pending shipment. Could you please provide an update on its current status at your earliest convenience?

Best regards,

Muhammed Jabir
PRICING AND OPERATION
ARGUS SHIPPING`}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Quotation Composer Modal ──────────────────── */}
      <Modal
        isOpen={showQuotationConfirm}
        onClose={() => setShowQuotationConfirm(false)}
        title="Send Quotation to Customer"
        size="lg"
        footer={
          <>
            <button
              onClick={() => setShowQuotationConfirm(false)}
              className="btn-secondary text-sm px-4 py-2"
              disabled={sendingQuotation}
            >
              Cancel
            </button>
            <button
              onClick={confirmSendQuotation}
              className="btn-primary text-sm px-5 py-2"
              disabled={sendingQuotation || !quotaForm.freightRate.trim() || !shipment.customer_email}
            >
              {sendingQuotation ? "Sending..." : "📨 Send Quotation"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-muted">Customer Name</p>
              <p className="text-sm text-primary font-medium">{shipment.customer_name || <span className="text-rose font-bold">Not Configured</span>}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-muted">Customer Email</p>
              <p className="text-sm text-primary font-medium">{shipment.customer_email || <span className="text-rose font-bold">Not Configured</span>}</p>
            </div>
          </div>

          {!shipment.customer_email && (
            <div className="p-3 bg-rose/10 border border-rose/20 text-rose text-xs rounded-xl">
              ⚠️ Please close this dialog and configure the Customer Email in the <b>Details</b> tab above before sending the quotation.
            </div>
          )}

          {shipment.customer_email && (
            <>
              {/* Row 1: Transport Mode & Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-widest mb-1.5">
                    Transport Mode
                  </label>
                  <select
                    value={quotaForm.mode}
                    onChange={(e) => {
                      const newMode = e.target.value as "AIR" | "SEA";
                      setQuotaForm(prev => {
                        const nextForm = { ...prev, mode: newMode };
                        if (!prev.trans || prev.trans === "900" || prev.trans === "500") {
                          nextForm.trans = newMode === "AIR" ? "500" : "900";
                        }
                        if (!prev.zone) {
                          nextForm.zone = "Zone-1";
                        }
                        return nextForm;
                      });
                    }}
                    className="select-sm w-full bg-surface-1 border border-white/[0.08] rounded-lg p-2 text-sm text-primary focus:border-blue/50 focus:outline-none"
                    disabled={sendingQuotation}
                  >
                    <option value="SEA">Sea Freight</option>
                    <option value="AIR">Air Freight</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-widest mb-1.5">
                    Currency
                  </label>
                  <select
                    value={quotaForm.currency}
                    onChange={(e) => setQuotaForm(prev => ({ ...prev, currency: e.target.value }))}
                    className="select-sm w-full bg-surface-1 border border-white/[0.08] rounded-lg p-2 text-sm text-primary focus:border-blue/50 focus:outline-none"
                    disabled={sendingQuotation}
                  >
                    <option value="QAR">QAR (Qatari Riyal)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="GBP">GBP (British Pound)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Freight Rate & Ex-Works & Validity */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-widest mb-1.5">
                    Freight Rate ({quotaForm.currency})
                  </label>
                  <input
                    type="text"
                    value={quotaForm.freightRate}
                    onChange={(e) => setQuotaForm(prev => ({ ...prev, freightRate: e.target.value }))}
                    placeholder={`Rate...`}
                    className="input-sm w-full bg-surface-1 border border-white/[0.08] rounded-lg p-2.5 text-sm text-primary focus:border-blue/50 focus:outline-none"
                    disabled={sendingQuotation}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-widest mb-1.5">
                    Ex-Works ({quotaForm.currency})
                  </label>
                  <input
                    type="text"
                    value={quotaForm.exWork}
                    onChange={(e) => setQuotaForm(prev => ({ ...prev, exWork: e.target.value }))}
                    placeholder={`Ex-works...`}
                    className="input-sm w-full bg-surface-1 border border-white/[0.08] rounded-lg p-2.5 text-sm text-primary focus:border-blue/50 focus:outline-none"
                    disabled={sendingQuotation}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-widest mb-1.5">
                    Validity Date
                  </label>
                  <input
                    type="date"
                    value={quotaForm.validityDate}
                    onChange={(e) => setQuotaForm(prev => ({ ...prev, validityDate: e.target.value }))}
                    className="input-sm w-full bg-surface-1 border border-white/[0.08] rounded-lg p-2.5 text-sm text-primary focus:border-blue/50 focus:outline-none [color-scheme:dark]"
                    disabled={sendingQuotation}
                  />
                </div>
              </div>

              {/* Row 3: Zone & Trans */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-widest mb-1.5">
                    Zone
                  </label>
                  <input
                    type="text"
                    value={quotaForm.zone}
                    onChange={(e) => setQuotaForm(prev => ({ ...prev, zone: e.target.value }))}
                    placeholder="e.g. Zone-1"
                    className="input-sm w-full bg-surface-1 border border-white/[0.08] rounded-lg p-2.5 text-sm text-primary focus:border-blue/50 focus:outline-none"
                    disabled={sendingQuotation}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-widest mb-1.5">
                    Trans (QAR)
                  </label>
                  <input
                    type="text"
                    value={quotaForm.trans}
                    onChange={(e) => setQuotaForm(prev => ({ ...prev, trans: e.target.value }))}
                    placeholder={quotaForm.mode === "AIR" ? "e.g. 500" : "e.g. 900"}
                    className="input-sm w-full bg-surface-1 border border-white/[0.08] rounded-lg p-2.5 text-sm text-primary focus:border-blue/50 focus:outline-none"
                    disabled={sendingQuotation}
                  />
                </div>
              </div>

              {/* Row 4: War Time (SEA only) */}
              {quotaForm.mode === "SEA" && (
                <div className="flex items-end pb-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={quotaForm.warTime}
                      onChange={(e) => setQuotaForm(prev => ({ ...prev, warTime: e.target.checked }))}
                      className="rounded bg-surface-1 border border-white/[0.08] text-blue focus:ring-0 focus:ring-offset-0"
                      disabled={sendingQuotation}
                    />
                    <span>War Time Clause (On / Off)</span>
                  </label>
                </div>
              )}

              {/* Note / Message */}
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-widest mb-1.5">
                  Note / Message Body
                </label>
                <textarea
                  value={quotaForm.note}
                  onChange={(e) => setQuotaForm(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Type any additional notes or messages to send with the quotation PDF..."
                  className="input-sm w-full h-24 resize-none py-2 text-sm bg-surface-1 border border-white/[0.08] rounded-lg p-2.5 text-primary placeholder-faint focus:border-blue/50 focus:outline-none"
                  disabled={sendingQuotation}
                />
              </div>

              {/* Email Preview */}
              <div className="p-4 rounded-xl bg-surface-4 border border-white/[0.05] space-y-3 font-sans text-sm text-primary">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted">Email Preview</p>
                <div className="border-t border-white/[0.06] pt-3 space-y-2">
                  <p className="font-semibold text-blue">Subject: <span className="text-primary font-normal">Quotation for Shipment - Ref: {shipment.ref_no}</span></p>
                  <p className="font-semibold text-emerald text-xs">📎 Attachment: <span className="text-primary font-normal font-mono">Quotation-{shipment.customer_id || "UNKNOWN"}.pdf</span></p>
                  <div className="bg-surface-1 rounded-lg p-3 text-xs text-muted font-mono whitespace-pre-wrap border border-white/[0.04] max-h-48 overflow-y-auto">
{`Dear ${shipment.customer_name || "Customer"},

Find the Quotation given.

${quotaForm.note.trim() ? quotaForm.note.trim() + "\n\n" : ""}${quotaForm.mode === "SEA" && quotaForm.warTime ? `Shipping line charges, port charges, and customs duties will be charged at actuals.
* War risk surcharge (WRS) and any emergency surcharges are excluded.
* Cargo may be rerouted by the carrier due to the ongoing regional crisis.
* The above rates are subject to the availability of space and equipment.
* Transit times are for indicative purposes only; the carrier will confirm the exact transit time at departure.
* In case of end-voyage or discharge at a contingency/alternate port, the consignee will be liable for all additional costs arising.\n\n` : ""}Best regards,

Muhammed Jabir
PRICING AND OPERATION
ARGUS SHIPPING

📞 +974 30512233

📧 jabir@argusshipping.co

🌐 www.argusshipping.co`}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </Modal>
  );
}
