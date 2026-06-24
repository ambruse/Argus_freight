"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

interface QuotationRecord {
  id: number;
  q_no: string;
  pol: string | null;
  pod: string | null;
  commodity: string | null;
  pod_pcode: string | null;
  pol_pcode: string | null;
  freight: string;
  zone: string | null;
  trans: string;
  total_rate: string;
  sales_p: string | null;
  operator: string | null;
  customer_name: string | null;
  transit_time: string | null;
  validity: string | null;
  created_at: string;
  creator_username: string | null;
  mode: string | null;
  carrier_name: string | null;
  currency: string | null;
  approval_status: string;
  shipment_ref?: string | null;
}

export default function AdminQuotationsPage() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeQuotation, setActiveQuotation] = useState<QuotationRecord | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Load JWT token from local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(localStorage.getItem("freight_token"));
    }
  }, []);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/quotation");
      setQuotations(data.data || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load quotations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchQuotations();
    }
  }, [user]);

  // Auth gate
  if (!user || user.role !== "admin") {
    return (
      <AppLayout title="Access Denied">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <h1 className="text-2xl font-bold text-rose mb-2 font-outfit">Access Denied</h1>
          <p className="text-muted text-sm">
            You do not have permission to view the Quotation Approval page.
          </p>
        </div>
      </AppLayout>
    );
  }

  const handleApprove = async (id: number) => {
    setActionLoading(true);
    try {
      const { data } = await api.post(`/quotation/approve/${id}`);
      if (data.success) {
        toast.success(data.message || "Quotation approved and released.");
        setActiveQuotation(null);
        fetchQuotations();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to approve quotation.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisapprove = async (id: number) => {
    setActionLoading(true);
    try {
      const { data } = await api.post(`/quotation/disapprove/${id}`);
      if (data.success) {
        toast.success(data.message || "Quotation disapproved.");
        setActiveQuotation(null);
        fetchQuotations();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to disapprove quotation.");
    } finally {
      setActionLoading(false);
    }
  };

  const previewFormat = (numStr: string) => {
    const num = parseFloat(numStr) || 0;
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Client-side filtering & searching
  const filteredQuotations = quotations.filter((q) => {
    const term = searchQuery.toLowerCase();
    const matchesSearch =
      q.q_no.toLowerCase().includes(term) ||
      (q.customer_name || "").toLowerCase().includes(term) ||
      (q.creator_username || "").toLowerCase().includes(term);

    const matchesStatus =
      statusFilter === "all" || q.approval_status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout
      title="Quotation Approval"
      subtitle="Review pending quotations, overlook the generated PDFs, and manage authorizations."
    >
      <div className="space-y-6 pb-12">
        {/* Controls container */}
        <div className="glass rounded-2xl p-5 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-widest text-muted uppercase">
              Filter quotations ({filteredQuotations.length})
            </h3>
            <p className="text-xs text-muted mt-0.5">Manage statuses and preview documents</p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search Q.NO, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input text-xs py-1.5 px-3 w-52"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input text-xs py-1.5 px-3"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="disapproved">Disapproved</option>
            </select>
          </div>
        </div>

        {/* List table */}
        <div className="glass rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Q.NO</th>
                  <th>DATE</th>
                  <th>CUSTOMER</th>
                  <th>ROUTE</th>
                  <th>MODE</th>
                  <th>TOTAL RATE</th>
                  <th>CREATOR</th>
                  <th>STATUS</th>
                  <th className="text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-muted">
                      Loading quotations...
                    </td>
                  </tr>
                ) : filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-muted">
                      No quotations found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredQuotations.map((q) => (
                    <tr key={q.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="font-semibold text-primary font-mono">{q.q_no}</td>
                      <td className="whitespace-nowrap">
                        {new Date(q.created_at).toLocaleDateString("en-GB").replace(/\//g, "-")}
                      </td>
                      <td className="font-semibold text-primary font-outfit">
                        {q.customer_name || "—"}
                      </td>
                      <td className="text-muted font-mono">
                        {q.pol_pcode || "—"} ➔ {q.pod_pcode || "—"}
                      </td>
                      <td className="text-muted uppercase text-xs">{q.mode || "OCEAN"}</td>
                      <td className="font-bold text-gold font-mono">
                        QAR {previewFormat(q.total_rate)}
                      </td>
                      <td className="text-muted font-mono">{q.creator_username || "—"}</td>
                      <td>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border 
                            ${
                              q.approval_status === "Approved"
                                ? "bg-emerald/10 text-emerald border-emerald/20"
                                : q.approval_status === "Disapproved"
                                ? "bg-rose/10 text-rose border-rose/20"
                                : "bg-amber/10 text-amber border-amber/20"
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              q.approval_status === "Approved"
                                ? "bg-emerald"
                                : q.approval_status === "Disapproved"
                                ? "bg-rose"
                                : "bg-amber animate-pulse"
                            }`}
                          />
                          {q.approval_status}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setActiveQuotation(q)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-white/10 hover:bg-white/5 transition-all duration-200 active:scale-95 flex items-center gap-1"
                          >
                            👁 View
                          </button>
                          {q.approval_status === "Pending" && (
                            <button
                              onClick={() => handleApprove(q.id)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald/10 text-emerald border border-emerald/20 hover:bg-emerald/20 transition-all duration-200 active:scale-95"
                            >
                              ✓ Approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Document Overlook Modal ──────────────────────── */}
        {activeQuotation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
            <div className="glass w-full max-w-4xl h-[90vh] rounded-2xl p-6 shadow-glow border border-white/[0.06] flex flex-col">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-primary font-outfit">
                    Preview Quotation: {activeQuotation.q_no}
                  </h2>
                  <p className="text-xs text-muted">
                    Review generated PDF. Use buttons below to approve or disapprove.
                  </p>
                </div>
                <button
                  onClick={() => setActiveQuotation(null)}
                  className="text-muted hover:text-primary text-xl font-semibold p-1"
                >
                  ✕
                </button>
              </div>

              {/* PDF Overlook frame */}
              <div className="flex-1 w-full bg-black/40 rounded-xl overflow-hidden mb-4 border border-white/5 relative">
                {token ? (
                  <iframe
                    src={`/api/quotation/download/${activeQuotation.id}?token=${encodeURIComponent(
                      token
                    )}`}
                    className="w-full h-full border-none"
                    title={`Quotation ${activeQuotation.q_no}`}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted text-sm">
                    Loading preview session...
                  </div>
                )}
              </div>

              {/* Action buttons inside overlook modal */}
              {activeQuotation.approval_status === "Pending" ? (
                <div className="flex gap-4 justify-end flex-shrink-0 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleDisapprove(activeQuotation.id)}
                    disabled={actionLoading}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-rose text-white hover:bg-rose-bright shadow-glow-rose transition-all duration-200 active:scale-95"
                  >
                    {actionLoading ? "Processing..." : "Disapprove"}
                  </button>
                  <button
                    onClick={() => handleApprove(activeQuotation.id)}
                    disabled={actionLoading}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-emerald text-white hover:bg-emerald-bright shadow-glow-emerald transition-all duration-200 active:scale-95"
                  >
                    {actionLoading ? "Processing..." : "Approve"}
                  </button>
                </div>
              ) : (
                <div className="flex justify-end flex-shrink-0 pt-2 border-t border-white/5 items-center gap-2">
                  <span className="text-xs text-muted">Approval Status:</span>
                  <span
                    className={`inline-flex px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border 
                      ${
                        activeQuotation.approval_status === "Approved"
                          ? "bg-emerald/10 text-emerald border-emerald/20"
                          : "bg-rose/10 text-rose border-rose/20"
                      }`}
                  >
                    {activeQuotation.approval_status}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
