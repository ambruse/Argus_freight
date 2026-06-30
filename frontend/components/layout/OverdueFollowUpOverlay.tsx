"use client";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import PasswordPromptModal from "@/components/modals/PasswordPromptModal";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Shipment } from "@/types";
import { authStorage } from "@/lib/auth";

export default function OverdueFollowUpOverlay() {
  const [overdueList, setOverdueList] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [selectedRefNo, setSelectedRefNo] = useState<string | null>(null);

  // Fetch overdue RFQs on load
  const fetchOverdue = useCallback(async () => {
    if (!authStorage.isAuthenticated()) {
      setLoading(false);
      return;
    }
    const user = authStorage.getUser();
    if (user?.role === "customer") {
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get("/shipments/follow-up-overdue");
      setOverdueList(data.data);
    } catch (err) {
      console.error("Failed to load overdue follow-ups:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverdue();
  }, [fetchOverdue]);

  // Handle Snooze (updates last_follow_up to NOW() - 14 days so it reappears tomorrow)
  const handleSnooze = async (refNo: string) => {
    try {
      await api.post(`/shipments/${refNo}/snooze-follow-up`);
      toast.success("Follow-up snoozed. You will be asked again tomorrow.");
      setOverdueList(prev => prev.filter(s => s.ref_no !== refNo));
    } catch {
      toast.error("Failed to snooze follow-up.");
    }
  };

  // Open password prompt for deletion
  const triggerDelete = (refNo: string) => {
    setSelectedRefNo(refNo);
    setPasswordPromptOpen(true);
  };

  // Handle actual deletion after authentication succeeds
  const handleDeleteSuccess = async () => {
    if (!selectedRefNo) return;
    try {
      await api.delete(`/shipments/${selectedRefNo}`);
      toast.success(`RFQ ${selectedRefNo} deleted successfully.`);
      setOverdueList(prev => prev.filter(s => s.ref_no !== selectedRefNo));
    } catch {
      toast.error("Failed to delete RFQ.");
    } finally {
      setSelectedRefNo(null);
      setPasswordPromptOpen(false);
    }
  };

  if (loading || overdueList.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-fade-in">
      <div className="bg-surface border border-white/10 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(17,24,39,0.98) 0%, rgba(10,15,28,0.98) 100%)" }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01] flex items-start gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl flex-shrink-0 animate-pulse">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Pending Follow-Up Alert (15+ Days Overdue)
            </h2>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              The following RFQs have had no follow-up activity for more than 15 days. Please review them. You can either <span className="text-rose font-medium">delete</span> them (requires password) or click <span className="text-blue-bright font-medium">Snooze</span> to ask again tomorrow.
            </p>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {overdueList.map((s) => {
            const lastFollowUpDate = s.last_follow_up ? new Date(s.last_follow_up) : new Date(s.created_at);
            return (
              <div
                key={s.ref_no}
                className="border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] hover:border-white/10 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-emerald bg-emerald/10 px-2 py-0.5 rounded border border-emerald/20">
                      {s.ref_no}
                    </span>
                    {s.cust_req_no && (
                      <span className="font-mono text-xs text-muted/80 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        {s.cust_req_no}
                      </span>
                    )}
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold border ${
                      s.status === "Cancelled" 
                        ? "bg-rose/10 text-rose border-rose/20" 
                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-primary truncate">
                    {s.customer_name ?? "General Cargo / Guest"}
                  </div>
                  <div className="text-xs text-muted flex items-center gap-2 flex-wrap">
                    {s.commodity && <span className="text-primary/70">{s.commodity}</span>}
                    {s.pol && (
                      <span>
                        📍 {s.pol} ➔ {s.pod}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted flex items-center gap-1">
                    <span>📅 Last Activity:</span>
                    <span className="text-amber-500 font-semibold">{format(lastFollowUpDate, "dd MMM yyyy (HH:mm)")}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  <button
                    onClick={() => handleSnooze(s.ref_no)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-muted hover:text-primary"
                  >
                    Snooze (Ask Tomorrow)
                  </button>
                  <button
                    onClick={() => triggerDelete(s.ref_no)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose/10 hover:bg-rose text-rose hover:text-white border border-rose/20 hover:border-transparent transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01] flex justify-end">
          <p className="text-[10px] text-muted">
            ARGUS Freight Operations Security & Cleanup System
          </p>
        </div>
      </div>

      <PasswordPromptModal
        isOpen={passwordPromptOpen}
        actionName={`delete RFQ ${selectedRefNo}`}
        onClose={() => {
          setPasswordPromptOpen(false);
          setSelectedRefNo(null);
        }}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
