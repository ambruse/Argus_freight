import { useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface PostCallModalProps {
  enquiryId?: number;
  onClose: () => void;
  onSuccess: () => void;
  callNumber: string;
  callDuration: number;
}

export default function PostCallModal({ enquiryId, onClose, onSuccess, callNumber, callDuration }: PostCallModalProps) {
  const [step, setStep] = useState<"is_customer" | "is_lead" | "details">("is_customer");
  const [isCustomer, setIsCustomer] = useState<boolean | null>(null);
  const [isLead, setIsLead] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    customer_name: "",
    company: "",
    customer_number: callNumber || "",
    customer_email: "",
    details: "",
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    let finalStatus = "No Lead";
    if (isCustomer === false) {
      finalStatus = "Lost"; // Or "Invalid"
    } else if (isLead) {
      finalStatus = "Lead";
    }

    try {
      const payload = {
        customer_name: formData.customer_name || "Unknown Caller",
        customer_number: formData.customer_number || callNumber || "Unknown",
        company: formData.company,
        customer_email: formData.customer_email,
        details: formData.details || (isCustomer === false ? "Not a customer" : "No further details"),
        status: finalStatus,
        is_lead: isLead,
        call_duration: callDuration,
        type: "Phone Call"
      };

      if (enquiryId) {
        await api.patch(`/call-enquiries/${enquiryId}`, payload);
      } else {
        await api.post("/call-enquiries", payload);
      }

      toast.success(isLead ? "Lead successfully logged and assigned!" : "Call logged successfully.");
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to log call.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="glass w-full max-w-md rounded-2xl p-6 shadow-glow border border-white/[0.06] flex flex-col relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-primary transition-colors"
        >
          ✕
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-primary font-outfit">Post-Call Summary</h2>
          <p className="text-xs text-muted mt-1">
            Duration: {Math.floor(callDuration / 60)}m {callDuration % 60}s
          </p>
        </div>

        {step === "is_customer" && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-sm font-semibold mb-4">Was this a customer?</p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setIsCustomer(true);
                  setStep("is_lead");
                }}
                className="flex-1 py-3 rounded-xl bg-emerald/10 text-emerald font-semibold border border-emerald/20 hover:bg-emerald/20 transition-all"
              >
                Yes
              </button>
              <button
                onClick={() => {
                  setIsCustomer(false);
                  setIsLead(false);
                  setStep("details");
                }}
                className="flex-1 py-3 rounded-xl bg-rose/10 text-rose font-semibold border border-rose/20 hover:bg-rose/20 transition-all"
              >
                No
              </button>
            </div>
          </div>
        )}

        {step === "is_lead" && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-sm font-semibold mb-4">Did you get a lead?</p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setIsLead(true);
                  setStep("details");
                }}
                className="flex-1 py-3 rounded-xl bg-gold/10 text-gold font-semibold border border-gold/20 hover:bg-gold/20 transition-all"
              >
                Yes, got lead!
              </button>
              <button
                onClick={() => {
                  setIsLead(false);
                  setStep("details");
                }}
                className="flex-1 py-3 rounded-xl bg-white/5 text-muted font-semibold border border-white/10 hover:bg-white/10 transition-all"
              >
                No lead
              </button>
            </div>
          </div>
        )}

        {step === "details" && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
            {isCustomer !== false && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="input w-full"
                    placeholder="Enter name..."
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-muted mb-1">Company (Optional)</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="input w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-muted mb-1">Number</label>
                    <input
                      type="text"
                      required
                      value={formData.customer_number}
                      onChange={(e) => setFormData({ ...formData, customer_number: e.target.value })}
                      className="input w-full"
                    />
                  </div>
                </div>
              </>
            )}
            
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Details / Notes</label>
              <textarea
                required={isCustomer !== false}
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                className="input w-full h-24 resize-none"
                placeholder={isCustomer === false ? "Why wasn't it a customer?" : "Call notes..."}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-background font-bold hover:opacity-90 transition-opacity mt-2"
            >
              {loading ? "Saving..." : "Save Log"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
