"use client";
import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import { CallEnquiry } from "@/types";
import toast from "react-hot-toast";

export default function SalesCallEnquiries() {
  const [enquiries, setEnquiries] = useState<CallEnquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEnquiries = async () => {
    try {
      const { data } = await api.get("/call-enquiries");
      setEnquiries(data.data);
    } catch {
      toast.error("Failed to load enquiries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await api.patch(`/call-enquiries/${id}/status`, { status });
      toast.success(`Status updated to ${status}`);
      setEnquiries(prev => prev.map(e => e.id === id ? { ...e, status: status as any } : e));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update status.");
    }
  };

  return (
    <AppLayout title="Assigned Call Enquiries" subtitle="Review and update the leads assigned to you.">
      <div className="glass rounded-2xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-widest text-muted uppercase">
            Assigned Leads ({enquiries.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>DATE</th>
                <th>CUSTOMER</th>
                <th>COMPANY</th>
                <th>NUMBER</th>
                <th>DETAILS</th>
                <th>AGENT</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted">Loading...</td></tr>
              ) : enquiries.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted">No leads assigned yet.</td></tr>
              ) : (
                enquiries.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap">{new Date(e.created_at).toLocaleDateString()}</td>
                    <td className="font-semibold text-primary">{e.customer_name}</td>
                    <td>{e.company || "—"}</td>
                    <td>{e.customer_number}</td>
                    <td className="max-w-xs truncate" title={e.details}>{e.details}</td>
                    <td className="text-muted">{e.calling_agent}</td>
                    <td>
                      <span className={[
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all duration-200",
                        e.status === 'Confirmed' ? "bg-emerald/10 text-emerald border-emerald/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]" :
                        e.status === 'Lost' || e.status === 'No Lead' ? "bg-rose/10 text-rose border-rose/20 shadow-[0_0_8px_rgba(244,63,94,0.1)]" :
                        "bg-blue/10 text-blue border-blue/20 shadow-[0_0_8px_rgba(120,105,54,0.1)]"
                      ].join(" ")}>
                        <span className={[
                          "w-1.5 h-1.5 rounded-full",
                          e.status === 'Confirmed' ? "bg-emerald animate-pulse" :
                          e.status === 'Lost' || e.status === 'No Lead' ? "bg-rose" :
                          "bg-blue animate-pulse"
                        ].join(" ")} />
                        {e.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusChange(e.id, 'Confirmed')}
                          disabled={e.status === 'Confirmed' || e.status === 'Lost' || e.status === 'No Lead'}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg border border-emerald/30 bg-emerald/10 text-emerald hover:bg-emerald hover:text-white hover:border-emerald hover:shadow-[0_0_12px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => handleStatusChange(e.id, 'Lost')}
                          disabled={e.status === 'Confirmed' || e.status === 'Lost' || e.status === 'No Lead'}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg border border-rose/30 bg-rose/10 text-rose hover:bg-rose hover:text-white hover:border-rose hover:shadow-[0_0_12px_rgba(244,63,94,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none"
                        >
                          Lost
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
