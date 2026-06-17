"use client";

import { useEffect, useRef } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";

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
  const notifiedIds = useRef<number[]>([]);
  const isPolling = useRef(false);

  useEffect(() => {
    // Check if token exists in localStorage
    const hasToken = () => typeof window !== "undefined" && !!localStorage.getItem("freight_token");

    const checkNewReplies = async () => {
      if (!hasToken() || isPolling.current) return;
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

    // Run immediately on mount
    checkNewReplies();

    // Check every 5 seconds (active polling check)
    const interval = setInterval(checkNewReplies, 5000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
