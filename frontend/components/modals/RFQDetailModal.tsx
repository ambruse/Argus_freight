"use client";
// components/modals/RFQDetailModal.tsx
// ─────────────────────────────────────────────────────────────
//  Shows all RFQ details and allows status change.
//  On status change: PATCH /api/shipments/:ref_no/status
//  which resets last_follow_up to NOW() in the DB.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { Shipment, ALL_STATUSES, ShipmentStatus, ShipmentReply } from "@/types";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { cleanEmailBody } from "@/lib/emailParser";
import { useAuth } from "@/hooks/useAuth";
import { io, Socket } from "socket.io-client";

interface Props {
  shipment:  Shipment | null;
  isOpen:    boolean;
  onClose:   () => void;
  onUpdated: (updated: Shipment) => void;
}

// Reusable detail field
function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-widest font-semibold text-muted">{label}</p>
      <p className="text-sm text-primary font-medium truncate">{value ?? <span className="text-faint">—</span>}</p>
    </div>
  );
}

export default function RFQDetailModal({ shipment, isOpen, onClose, onUpdated }: Props) {
  const { user } = useAuth();
  const isSales = user?.role === "sales";

  const [newStatus, setNewStatus] = useState<ShipmentStatus | "">("");
  const [saving,    setSaving]    = useState(false);
  const [replies,   setReplies]   = useState<ShipmentReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  const [showFollowUpConfirm, setShowFollowUpConfirm] = useState(false);

  const [editingCustomer, setEditingCustomer] = useState(false);
  const [custName, setCustName] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [editCost, setEditCost] = useState("");
  const [editCustPrice, setEditCustPrice] = useState("");

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

  const [files, setFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

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

  const fetchFiles = async () => {
    if (!shipment) return;
    setLoadingFiles(true);
    try {
      const { data } = await api.get(`/files/${shipment.ref_no}`);
      setFiles(data.data || []);
    } catch (err) {
      console.error("Failed to fetch files", err);
    } finally {
      setLoadingFiles(false);
    }
  };

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

  const handleSaveCustomer = async () => {
    if (!shipment) return;
    setSavingCustomer(true);
    try {
      const { data } = await api.put(`/shipments/${shipment.ref_no}`, {
        ...shipment,
        customer_name: custName,
        customer_email: custEmail,
      });
      toast.success("Customer details updated.");
      onUpdated(data.data);
      setEditingCustomer(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save customer details.");
    } finally {
      setSavingCustomer(false);
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
      toast.success("Quotation email sent successfully.");
      setReplies((prev) => [...prev, data.data]);
      if (data.last_follow_up) {
        onUpdated({ 
          ...shipment, 
          last_follow_up: data.last_follow_up,
          cost: data.cost,
          profit: data.profit
        });
      }
      setShowQuotationConfirm(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to send quotation email.");
    } finally {
      setSendingQuotation(false);
    }
  };

  useEffect(() => {
    if (isOpen && shipment) {
      if (user?.role !== "customer") {
        fetchReplies();
        fetchFiles();
      }
      setEditingCustomer(false);
      setCustName(shipment.customer_name || "");
      setCustEmail(shipment.customer_email || "");
      setEditCost(shipment.cost != null ? shipment.cost.toString() : "");
      const initialCustPrice = shipment.cost != null 
        ? (Number(shipment.cost) + Number(shipment.profit || 0)).toString() 
        : "";
      setEditCustPrice(initialCustPrice);
      setQuotaForm({
        mode: shipment.mode === "AIR" ? "AIR" : "SEA",
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

  const fetchReplies = async () => {
    if (!shipment) return;
    setLoadingReplies(true);
    try {
      const { data } = await api.get(`/shipments/${shipment.ref_no}/replies`);
      setReplies(data.data);
    } catch (err) {
      console.error("Failed to fetch replies", err);
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleMarkAsRead = async () => {
    if (!shipment) return;
    try {
      await api.patch(`/shipments/${shipment.ref_no}/replies/read`);
      setReplies((prev) =>
        prev.map((r) => ({ ...r, is_read: true }))
      );
      onUpdated({
        ...shipment,
        unread_replies_count: 0,
      });
      toast.success("Replies marked as read.");
    } catch (err) {
      console.error("Failed to mark replies as read:", err);
      toast.error("Failed to mark replies as read.");
    }
  };

  if (!shipment) return null;

  const handleStatusChange = async () => {
    const statusToSend = isSales ? (newStatus || shipment.status) : newStatus;

    if (!isSales && (!newStatus || newStatus === shipment.status)) {
      return;
    }

    const parsedCost = editCost.trim() === "" ? null : parseFloat(editCost);
    const parsedCustPrice = editCustPrice.trim() === "" ? null : parseFloat(editCustPrice);
    
    let parsedProfit = null;
    if (parsedCost !== null && parsedCustPrice !== null) {
      parsedProfit = parsedCustPrice - parsedCost;
    }

    setSaving(true);
    try {
      const { data } = await api.patch(`/shipments/${shipment.ref_no}/status`, {
        status: statusToSend,
        cost: isSales ? parsedCost : undefined,
        profit: isSales ? parsedProfit : undefined,
      });
      toast.success("Shipment updated successfully.");
      onUpdated({
        ...shipment,
        status: data.data.status,
        cost: data.data.cost,
        profit: data.data.profit,
        last_follow_up: data.data.last_follow_up
      });
      setNewStatus("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to update shipment.");
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (val: string | null) =>
    val ? format(new Date(val), "dd MMM yyyy, HH:mm") : "—";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Shipment Detail — ${shipment.ref_no}`} size="xl">
      {/* Status bar */}
      <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-surface-4 border border-white/[0.06]">
        <Badge status={shipment.status} />
        <span className="text-xs text-muted">Last follow-up: {fmtDate(shipment.last_follow_up)}</span>
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5 mb-6">
        <Field label="REF NO"       value={shipment.ref_no} />
        <Field label="Referred By"  value={shipment.refer_by} />
        {user?.role !== "customer" && <Field label="Dear Who"     value={shipment.dear_who} />}
        {user?.role !== "customer" && <Field label="Email"        value={shipment.email} />}
        <Field label="POL"          value={shipment.pol} />
        <Field label="POD"          value={shipment.pod} />
        <Field label="Mode"         value={shipment.mode} />
        <Field label="Term"         value={shipment.term} />
        <Field label="Commodity"    value={shipment.commodity} />
        <Field label="Container"    value={shipment.container} />
        <Field label="Weight"       value={shipment.weight ? `${shipment.weight} kg` : null} />
        <Field label="Dimension"    value={shipment.dimension} />
        {user?.role !== "customer" && <Field label="Cost"         value={shipment.cost != null ? `QAR ${Number(shipment.cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null} />}
        <Field label="Customer Price" value={shipment.cost != null ? `QAR ${(Number(shipment.cost) + Number(shipment.profit || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null} />
        <Field label="ETD"          value={shipment.etd ? format(new Date(shipment.etd), "dd MMM yyyy") : null} />
        <Field label="ETA"          value={shipment.eta ? format(new Date(shipment.eta), "dd MMM yyyy") : null} />
        <Field label="Carrier"      value={shipment.carrier} />
        <Field label="Created"      value={fmtDate(shipment.created_at)} />
      </div>

      {/* Customer Information Card */}
      {user?.role !== "customer" && (
        <div className="mb-6 p-4 rounded-xl bg-surface-4 border border-white/[0.05]">
          <div className="flex items-center justify-between mb-3 border-b border-white/[0.05] pb-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Customer Information</p>
            {!isSales && !editingCustomer ? (
              <button
                onClick={() => {
                  setCustName(shipment.customer_name || "");
                  setCustEmail(shipment.customer_email || "");
                  setEditingCustomer(true);
                }}
                className="text-xs text-blue hover:underline"
              >
                ✎ Edit Customer
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  disabled={savingCustomer}
                  onClick={handleSaveCustomer}
                  className="text-xs text-emerald hover:underline font-semibold"
                >
                  {savingCustomer ? "Saving..." : "✓ Save"}
                </button>
                <button
                  onClick={() => setEditingCustomer(false)}
                  className="text-xs text-muted hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          
          {editingCustomer ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-muted mb-1">Customer Name</label>
                <input
                  className="input-sm w-full"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="Enter customer name..."
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-semibold text-muted mb-1">Customer Email</label>
                <input
                  className="input-sm w-full"
                  type="email"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder="Enter customer email..."
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted">Customer Name</p>
                <p className="text-sm text-primary font-medium">{shipment.customer_name || <span className="text-faint">—</span>}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted">Customer Email</p>
                <p className="text-sm text-primary font-medium">{shipment.customer_email || <span className="text-faint">—</span>}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Addresses */}
      {(shipment.pickup_address || shipment.delivery_address) && (
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 pt-4 border-t border-white/[0.05]">
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted">Pickup Address</p>
            <p className="text-sm text-primary whitespace-pre-wrap">{shipment.pickup_address ?? "—"}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted">Delivery Address</p>
            <p className="text-sm text-primary whitespace-pre-wrap">{shipment.delivery_address ?? "—"}</p>
          </div>
        </div>
      )}

      {/* Note */}
      {shipment.note && (
        <div className="mb-6 p-3 rounded-xl bg-surface-4 border border-white/[0.05]">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted mb-1">Note</p>
          <p className="text-sm text-primary">{shipment.note}</p>
        </div>
      )}

      {/* Attached Files */}
      {user?.role !== "customer" && (
        <div className="mb-6 p-4 rounded-xl bg-surface-4 border border-white/[0.05]">
          <h4 className="text-xs uppercase font-semibold tracking-widest text-muted mb-3">Attached Files</h4>
          {loadingFiles ? (
            <p className="text-xs text-muted">Loading files...</p>
          ) : files.length === 0 ? (
            <p className="text-xs text-muted italic">No attached files.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {files.map((file) => {
                const token = typeof window !== "undefined" ? localStorage.getItem("freight_token") : "";
                const downloadUrl = `/api/files/download/${file.id}?token=${token}`;
                return (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm shrink-0">📎</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-primary truncate" title={file.original_name}>
                          {file.original_name}
                        </p>
                        <p className="text-[10px] text-muted">
                          {(file.size_bytes / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue hover:text-blue-bright font-semibold px-2.5 py-1 rounded bg-blue/10 hover:bg-blue/20 transition-colors"
                    >
                      Download
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Email Replies ───────────────────────────────── */}
      {user?.role !== "customer" && (
        <div className="border-t border-white/[0.06] pt-5 mb-6">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs uppercase font-semibold tracking-widest text-muted">Email Replies</p>
            {shipment.unread_replies_count && Number(shipment.unread_replies_count) > 0 ? (
              <button
                onClick={handleMarkAsRead}
                className="btn-secondary px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider font-outfit"
              >
                Mark as Read
              </button>
            ) : null}
          </div>
          {loadingReplies ? (
            <div className="text-sm text-muted">Loading replies...</div>
          ) : (
            <div className="space-y-4">
              {replies.length === 0 ? (
                <div className="text-sm text-muted italic">No email replies yet.</div>
              ) : (
                <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
                  {replies.map((r) => {
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
                            {fmtDate(r.received_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={repliesEndRef} />
                </div>
              )}

              {/* Quick Reply Form */}
              {!isSales && user?.role !== "customer" && (
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

      {/* Chat Box Section */}
      {shipment.customer_id && (
        <div className="border-t border-white/[0.06] pt-5 mb-6">
          <p className="text-xs uppercase font-semibold tracking-widest text-muted mb-3">
            {user?.role === "customer" ? "💬 Chat with Operator" : "💬 Chat with Customer"}
          </p>
        <div className="p-4 rounded-xl bg-surface-4 border border-white/[0.05] space-y-4">
          {/* Messages List */}
          <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
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

          {/* Message Input Area */}
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

      {/* ── Edit Status & Financials ───────────────────── */}
      {user?.role !== "customer" && (
        <div className="border-t border-white/[0.06] pt-5">
          <p className="text-xs uppercase font-semibold tracking-widest text-muted mb-3">
            {isSales ? "Update Status & Financials" : "Edit Status"}
          </p>
          
          {isSales ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-muted mb-1.5">Status</label>
                <select
                  value={newStatus || shipment.status}
                  onChange={(e) => setNewStatus(e.target.value as ShipmentStatus)}
                  className="select w-full"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-semibold text-muted mb-1.5">Cost (QAR)</label>
                <input
                  type="text"
                  value={editCost}
                  onChange={(e) => setEditCost(e.target.value)}
                  placeholder="e.g. 1500"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-semibold text-muted mb-1.5">Customer Price (QAR)</label>
                <input
                  type="text"
                  value={editCustPrice}
                  onChange={(e) => setEditCustPrice(e.target.value)}
                  placeholder="e.g. 2000"
                  className="input w-full"
                />
              </div>
              <div className="md:col-span-3 flex justify-end">
                <button
                  onClick={handleStatusChange}
                  disabled={saving}
                  className="btn-primary px-8"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ShipmentStatus)}
                className="select flex-1 max-w-xs"
              >
                <option value="">— Select new status —</option>
                {ALL_STATUSES.filter((s) => s !== shipment.status).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                onClick={handleStatusChange}
                disabled={!newStatus || saving}
                className="btn-primary disabled:opacity-40 disabled:hover:shadow-none disabled:hover:translate-y-0"
              >
                {saving ? "Saving…" : "Update Status"}
              </button>
            </div>
          )}
          <p className="text-[11px] text-muted mt-2">
            Changing status will automatically reset the follow-up timer to now.
          </p>
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
              ⚠️ Please close this dialog and configure the Customer Email in the <b>Customer Information</b> section above before sending the quotation.
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
