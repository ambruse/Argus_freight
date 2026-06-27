"use client";
import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import { CallEnquiry } from "@/types";
import toast from "react-hot-toast";

export default function CallingAgentEnquiries() {
  const [enquiries, setEnquiries] = useState<CallEnquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    fetchEnquiries();
  }, []);

  return (
    <AppLayout title="My Call Enquiries" subtitle="Review the calls you have logged and their current status.">
      <div className="glass rounded-2xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-widest text-muted uppercase">
            Logged Calls ({enquiries.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>DATE & TIME</th>
                <th>CUSTOMER</th>
                <th>COMPANY</th>
                <th>NUMBER</th>
                <th>DETAILS</th>
                <th>ASSIGNED SALES</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted">Loading...</td></tr>
              ) : enquiries.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted">No calls logged yet.</td></tr>
              ) : (
                enquiries.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap">
                      {new Date(e.created_at).toLocaleDateString()}
                      <br />
                      <span className="text-[10px] text-muted">
                        {e.call_time ? new Date(e.call_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="font-semibold text-primary">{e.customer_name}</td>
                    <td>{e.company || "—"}</td>
                    <td>{e.customer_number}</td>
                    <td className="max-w-xs truncate" title={e.details}>{e.details}</td>
                    <td>{e.assigned_sales || "Unassigned"}</td>
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
