"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { io } from "socket.io-client";
import PostCallModal from "@/components/modals/PostCallModal";

interface UnreadReply {
  id: number;
  ref_no: string;
  from_email: string;
  subject: string;
  body_text: string;
  received_at: string;
  pol: string | null;
  pod: string | null;
  dear_who: string | null;
  shipment_status: string;
}

export default function NotificationListener() {
  const pathname = usePathname();
  const { user } = useAuth();
  const notifiedIds = useRef<number[]>([]);
  const isPolling = useRef(false);
  const isShipmentsPolling = useRef(false);
  const isQuotationsPolling = useRef(false);

  const [showCallModal, setShowCallModal] = useState(false);
  const [callData, setCallData] = useState({ id: 0, number: "", duration: 0 });

  useEffect(() => {
    if (!user || user.role !== "calling_agent") return;
    const socketUrl = typeof window !== "undefined"
      ? (process.env.NODE_ENV === "production"
          ? window.location.origin
          : `${window.location.protocol}//${window.location.hostname}:3001`)
      : "http://localhost:3001";
    const socket = io(socketUrl);
    
    socket.emit("joinRoom", `user_${user.username.toLowerCase()}`);
    
    socket.on("call_ended", (data: any) => {
      setCallData({
        id: data.enquiry_id || 0,
        number: data.customer_number || "",
        duration: data.call_duration || 0
      });
      setShowCallModal(true);
    });
    
    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Play notification sound using the browser's native Web Audio API
  const playNotificationSound = () => {
    try {
      if (typeof window === "undefined") return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playBeep = (time: number, freq: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        
        // Gentle amplitude envelope to avoid clicks
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.15, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        
        osc.start(time);
        osc.stop(time + duration);
      };
      
      // Gentle premium double-beep (D5 followed by A5)
      playBeep(ctx.currentTime, 587.33, 0.12);
      playBeep(ctx.currentTime + 0.15, 880.00, 0.15);
    } catch (err) {
      console.warn("Failed to play notification sound:", err);
    }
  };

  // Proactively unlock browser audio playback on first user click or key press
  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          if (ctx.state === "suspended") {
            ctx.resume();
          }
        }
      } catch (e) {}
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
    window.addEventListener("click", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    // Check if token exists in localStorage
    const hasToken = () => typeof window !== "undefined" && !!localStorage.getItem("freight_token");

    if (pathname === "/login" || pathname === "/register" || !hasToken()) {
      toast.dismiss();
      return;
    }

    const checkNewReplies = async () => {
      if (!hasToken()) {
        toast.dismiss();
        return;
      }
      if (isPolling.current) return;
      isPolling.current = true;

      try {
        const { data } = await api.get("/dashboard/unread-replies");
        const unreadReplies: UnreadReply[] = data.data || [];

        // Find replies we haven't notified yet
        const newReplies = unreadReplies.filter(
          (r) => !notifiedIds.current.includes(r.id)
        );

        if (newReplies.length > 0) {
          newReplies.forEach((reply) => {
            notifiedIds.current.push(reply.id);

            // Display custom toast
            toast.custom(
              (t) => (
                <div
                  className={`${
                    t.visible ? "animate-enter" : "animate-leave"
                  } max-w-md w-full bg-[#1E1E1E] border border-white/[0.08] shadow-card rounded-2xl pointer-events-auto flex p-4 justify-between gap-3`}
                  style={{
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-blue uppercase tracking-wider mb-1">
                      📩 New Email Reply
                    </p>
                    <p className="text-sm font-semibold text-[#F0F0F0] truncate">
                      Shipment {reply.ref_no} ({reply.pol || "—"} ➔ {reply.pod || "—"})
                    </p>
                    <p className="text-xs text-muted truncate mt-0.5">
                      {reply.from_email}: "{reply.subject}"
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 justify-center flex-shrink-0">
                    <button
                      onClick={() => {
                        toast.dismiss(t.id);
                        handleShowReply(reply);
                      }}
                      className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap"
                    >
                      Show Details
                    </button>
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="btn-secondary text-[10px] px-2 py-1"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ),
              { duration: 10000 }
            );
          });
        }
      } catch (err) {
        console.error("Failed to check for new replies:", err);
      } finally {
        isPolling.current = false;
      }
    };

    const checkNewAssignments = async () => {
      if (!hasToken()) return;
      if (isShipmentsPolling.current) return;
      isShipmentsPolling.current = true;

      try {
        const rawUser = localStorage.getItem("freight_user");
        if (!rawUser) return;
        const user = JSON.parse(rawUser);

        // Only operators and admins receive assignment notifications
        if (user.role !== "operator" && user.role !== "admin") return;

        const { data } = await api.get("/shipments?exclude_direct=true");
        const shipments = data.data || [];
        const shipmentRefs = shipments.map((s: any) => s.ref_no);

        const storageKey = `seen_shipment_refs_${user.username.toLowerCase()}`;
        const savedRefsRaw = localStorage.getItem(storageKey);

        if (!savedRefsRaw) {
          // Initialize seen list with all current reference numbers to avoid historical alerts
          localStorage.setItem(storageKey, JSON.stringify(shipmentRefs));
        } else {
          const savedRefs = JSON.parse(savedRefsRaw) as string[];
          const savedSet = new Set(savedRefs);

          const newAssignments = shipments.filter((s: any) => !savedSet.has(s.ref_no));

          if (newAssignments.length > 0) {
            newAssignments.forEach((shipment: any) => {
              playNotificationSound();

              // Display beautiful custom green toast
              toast.custom(
                (t) => (
                  <div
                    className={`${
                      t.visible ? "animate-enter" : "animate-leave"
                    } max-w-md w-full bg-[#1E1E1E] border border-emerald/30 shadow-card rounded-2xl pointer-events-auto flex p-4 justify-between gap-3`}
                    style={{
                      boxShadow: "0 8px 32px rgba(16, 185, 129, 0.15)",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-emerald uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald"></span>
                        </span>
                        New RFQ Assigned
                      </p>
                      <p className="text-sm font-semibold text-[#F0F0F0] truncate">
                        RFQ {shipment.ref_no} ({shipment.pol || "—"} ➔ {shipment.pod || "—"})
                      </p>
                      <p className="text-xs text-muted truncate mt-0.5">
                        Customer: {shipment.customer_name || "Unknown"} (CID: {shipment.customer_id || "—"})
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 justify-center flex-shrink-0">
                      <button
                        onClick={() => {
                          toast.dismiss(t.id);
                          handleShowShipment(shipment);
                        }}
                        className="btn-primary text-xs px-3 py-1.5 bg-emerald hover:bg-emerald-bright text-white border-none whitespace-nowrap"
                      >
                        Open Details
                      </button>
                      <button
                        onClick={() => toast.dismiss(t.id)}
                        className="btn-secondary text-[10px] px-2 py-1"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ),
                { duration: 12000 }
              );
            });

            // Update saved refs
            const updatedRefs = Array.from(new Set([...savedRefs, ...shipmentRefs]));
            localStorage.setItem(storageKey, JSON.stringify(updatedRefs));

            // Dispatch event to trigger refresh in active pages (like /rfq)
            window.dispatchEvent(new CustomEvent("rfq-list-update"));
          }
        }
      } catch (err) {
        console.error("Failed to check for new assignments:", err);
      } finally {
        isShipmentsPolling.current = false;
      }
    };

    const checkPendingQuotations = async () => {
      if (!hasToken()) return;
      
      const rawUser = localStorage.getItem("freight_user");
      if (!rawUser) return;
      const user = JSON.parse(rawUser);

      // Only admins receive pending quotation notifications
      if (user.role !== "admin") return;

      if (isQuotationsPolling.current) return;
      isQuotationsPolling.current = true;

      try {
        const { data } = await api.get("/quotation");
        const quotations = data.data || [];
        const pendingQuotations = quotations.filter((q: any) => q.approval_status === "Pending");
        const pendingIds = pendingQuotations.map((q: any) => q.id);

        const storageKey = `seen_pending_quotation_ids_${user.username.toLowerCase()}`;
        const savedIdsRaw = localStorage.getItem(storageKey);

        if (!savedIdsRaw) {
          // Initialize seen list with all current pending IDs to avoid historical alerts
          localStorage.setItem(storageKey, JSON.stringify(pendingIds));
        } else {
          const savedIds = JSON.parse(savedIdsRaw) as number[];
          const savedSet = new Set(savedIds);

          const newPending = pendingQuotations.filter((q: any) => !savedSet.has(q.id));

          if (newPending.length > 0) {
            newPending.forEach((quot: any) => {
              playNotificationSound();

              // Display beautiful custom amber/gold toast for pending quotation
              toast.custom(
                (t) => (
                  <div
                    className={`${
                      t.visible ? "animate-enter" : "animate-leave"
                    } max-w-md w-full bg-[#1E1E1E] border border-[#F5B037]/30 shadow-card rounded-2xl pointer-events-auto flex p-4 justify-between gap-3`}
                    style={{
                      boxShadow: "0 8px 32px rgba(245, 176, 55, 0.15)",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#F5B037] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F5B037] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F5B037]"></span>
                        </span>
                        Quotation Pending Approval
                      </p>
                      <p className="text-sm font-semibold text-[#F0F0F0] truncate">
                        Q.No: {quot.q_no} ({quot.pol_pcode || "—"} ➔ {quot.pod_pcode || "—"})
                      </p>
                      <p className="text-xs text-muted truncate mt-0.5">
                        Customer: {quot.customer_name || "—"} | Created by: {quot.creator_username || "—"}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 justify-center flex-shrink-0">
                      <button
                        onClick={() => {
                          toast.dismiss(t.id);
                          window.location.href = "/admin/quotations";
                        }}
                        className="btn-primary text-xs px-3 py-1.5 bg-[#F5B037] hover:bg-[#F5B037]/90 text-black border-none whitespace-nowrap"
                      >
                        Approve/Decline
                      </button>
                      <button
                        onClick={() => toast.dismiss(t.id)}
                        className="btn-secondary text-[10px] px-2 py-1"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ),
                { duration: 12000 }
              );
            });

            // Update saved ids
            const updatedIds = Array.from(new Set([...savedIds, ...pendingIds]));
            localStorage.setItem(storageKey, JSON.stringify(updatedIds));
          }
        }
      } catch (err) {
        console.error("Failed to check for pending quotations:", err);
      } finally {
        isQuotationsPolling.current = false;
      }
    };

    const handleShowReply = (reply: UnreadReply) => {
      const isConfirmed = [
        "Confirmed",
        "Files Pending",
        "Completed",
        "Return Pending",
      ].includes(reply.shipment_status);

      const targetPath = isConfirmed ? "/confirmed" : "/rfq";

      if (window.location.pathname === targetPath) {
        // Dispatch Custom Event immediately
        window.dispatchEvent(new CustomEvent("open-shipment-detail", { detail: reply }));
      } else {
        // Save to sessionStorage and navigate
        sessionStorage.setItem("autoOpenShipmentRef", reply.ref_no);
        window.location.href = targetPath;
      }
    };

    const handleShowShipment = (shipment: any) => {
      const isConfirmed = [
        "Confirmed",
        "Files Pending",
        "Completed",
        "Return Pending",
      ].includes(shipment.status);

      const targetPath = isConfirmed ? "/confirmed" : "/rfq";

      if (window.location.pathname === targetPath) {
        sessionStorage.setItem("autoOpenShipmentRef", shipment.ref_no);
        window.dispatchEvent(new CustomEvent("check-auto-open"));
      } else {
        sessionStorage.setItem("autoOpenShipmentRef", shipment.ref_no);
        window.location.href = targetPath;
      }
    };

    // Run checks immediately on mount
    checkNewReplies();
    checkNewAssignments();
    checkPendingQuotations();

    // Setup polling intervals
    const intervalReplies = setInterval(checkNewReplies, 5000);
    const intervalAssignments = setInterval(checkNewAssignments, 6000);
    const intervalQuotations = setInterval(checkPendingQuotations, 7000);

    return () => {
      clearInterval(intervalReplies);
      clearInterval(intervalAssignments);
      clearInterval(intervalQuotations);
    };
  }, [pathname]);

  return (
    <>
      {showCallModal && (
        <PostCallModal
          enquiryId={callData.id}
          callNumber={callData.number}
          callDuration={callData.duration}
          onClose={() => setShowCallModal(false)}
          onSuccess={() => setShowCallModal(false)}
        />
      )}
    </>
  );
}
