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
  const [isBulkDelete, setIsBulkDelete] = useState(false);
  const [actioningAll, setActioningAll] = useState(false);

  // Fetch overdue RFQs on load
  const fetchOverdue = useCallback(async () => {
    if (!authStorage.isAuthenticated()) {
      setLoading(false);
      return;
    }
    const user = authStorage.getUser();
    if (user?.role === "customer" || user?.role === "sales") {
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

  // Handle Snooze All
  const handleSnoozeAll = async () => {
    if (overdueList.length === 0) return;
    setActioningAll(true);
    try {
      const promises = overdueList.map(s => api.post(`/shipments/${s.ref_no}/snooze-follow-up`));
      await Promise.all(promises);
      toast.success("All follow-ups snoozed until tomorrow.");
      setOverdueList([]);
    } catch (err) {
      console.error("Failed to snooze all:", err);
      toast.error("Failed to snooze some follow-ups. Please reload.");
      fetchOverdue();
    } finally {
      setActioningAll(false);
    }
  };

  // Open password prompt for deletion
  const triggerDelete = (refNo: string) => {
    setSelectedRefNo(refNo);
    setIsBulkDelete(false);
    setPasswordPromptOpen(true);
  };

  // Open password prompt for bulk deletion
  const triggerDeleteAll = () => {
    setIsBulkDelete(true);
    setPasswordPromptOpen(true);
  };

  // Handle actual deletion after authentication succeeds
  const handleDeleteSuccess = async () => {
    if (isBulkDelete) {
      if (overdueList.length === 0) return;
      setActioningAll(true);
      setPasswordPromptOpen(false);
      try {
        const promises = overdueList.map(s => api.delete(`/shipments/${s.ref_no}`));
        await Promise.all(promises);
        toast.success("All overdue RFQs deleted successfully.");
        setOverdueList([]);
      } catch (err: any) {
        console.error("Failed to delete all:", err);
        const errMsg = err.response?.data?.message || "Failed to delete some RFQs. Please reload.";
        toast.error(errMsg);
        fetchOverdue();
      } finally {
        setActioningAll(false);
        setIsBulkDelete(false);
      }
    } else {
      if (!selectedRefNo) return;
      try {
        await api.delete(`/shipments/${selectedRefNo}`);
        toast.success(`RFQ ${selectedRefNo} deleted successfully.`);
        setOverdueList(prev => prev.filter(s => s.ref_no !== selectedRefNo));
      } catch (err: any) {
        const errMsg = err.response?.data?.message || "Failed to delete RFQ.";
        toast.error(errMsg);
      } finally {
        setSelectedRefNo(null);
        setPasswordPromptOpen(false);
      }
    }
  };

  if (loading || overdueList.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-fade-in">
      <div className="bg-surface border border-white/10 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        style={{ background: "var(--login-right-bg)" }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 bg-white/[0.02] flex items-start gap-4">
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

        {/* Bulk Action Bar */}
        <div className="px-6 py-3 bg-white/[0.03] border-b border-white/5 flex items-center justify-between gap-4 flex-wrap">
          <span className="text-xs text-muted">
            <span className="text-primary font-semibold">{overdueList.length}</span> RFQs require attention
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSnoozeAll}
              disabled={actioningAll}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-[#F5B037]/20 bg-[#F5B037]/5 hover:bg-[#F5B037]/10 transition-all text-[#F5B037] disabled:opacity-50"
            >
              {actioningAll ? "Snoozing..." : "Snooze All"}
            </button>
            <button
              onClick={triggerDeleteAll}
              disabled={actioningAll}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 hover:border-transparent transition-all disabled:opacity-50"
            >
              {actioningAll ? "Deleting..." : "Delete All"}
            </button>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {overdueList.map((s) => {
            const lastFollowUpDate = s.last_follow_up ? new Date(s.last_follow_up) : new Date(s.created_at);
            return (
              <div
                key={s.ref_no}
                className="border border-white/5 bg-white/[0.02] hover:bg-white/[0.03] hover:border-white/10 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200"
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
        actionName={isBulkDelete ? "delete all overdue RFQs" : `delete RFQ ${selectedRefNo}`}
        onClose={() => {
          setPasswordPromptOpen(false);
          setSelectedRefNo(null);
          setIsBulkDelete(false);
        }}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
