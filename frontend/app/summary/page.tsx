"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { format, subMonths, addMonths } from "date-fns";
import toast from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";

import { useAuth } from "@/hooks/useAuth";

interface SummaryData {
  totalRFQs: number;
  totalConfirmed: number;
  totalCost: number;
  totalProfit: number;
  totalCustomerPrice: number;
}

export default function SummaryPage() {
  const { user } = useAuth();



  const [currentDate, setCurrentDate] = useState(new Date());
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary(currentDate);
  }, [currentDate]);

  const fetchSummary = async (date: Date) => {
    setLoading(true);
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const res = await api.get(`/dashboard/summary?year=${year}&month=${month}`);
      setSummary(res.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fetch summary");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between glass p-6 rounded-2xl shadow-card">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Monthly Summary</h1>
          <p className="text-sm text-muted mt-1">
            Statistics for {format(currentDate, "MMMM yyyy")}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={handlePrevMonth} className="btn-secondary px-4 py-2">
            ← Previous
          </button>
          <span className="font-semibold text-primary w-32 text-center">
            {format(currentDate, "MMM yyyy")}
          </span>
          <button 
            onClick={handleNextMonth} 
            className="btn-secondary px-4 py-2"
            disabled={currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass p-6 rounded-2xl h-32 animate-pulse" />
          <div className="glass p-6 rounded-2xl h-32 animate-pulse" />
          <div className="glass p-6 rounded-2xl h-32 animate-pulse" />
          <div className="glass p-6 rounded-2xl h-32 animate-pulse" />
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          
          {/* Operations Summary */}
          <div className="glass p-6 rounded-2xl shadow-card space-y-4 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-muted uppercase tracking-wider">Total RFQs</p>
                <p className="text-4xl font-bold text-primary mt-2">{summary.totalRFQs}</p>
              </div>
              <div className="p-3 bg-blue/10 rounded-xl text-blue text-xl">📄</div>
            </div>
            <p className="text-xs text-muted">RFQs created in {format(currentDate, "MMMM")}</p>
          </div>

          <div className="glass p-6 rounded-2xl shadow-card space-y-4 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-muted uppercase tracking-wider">Confirmed Shipments</p>
                <p className="text-4xl font-bold text-emerald mt-2">{summary.totalConfirmed}</p>
              </div>
              <div className="p-3 bg-emerald/10 rounded-xl text-emerald text-xl">✅</div>
            </div>
            <p className="text-xs text-muted">Shipments confirmed in {format(currentDate, "MMMM")}</p>
          </div>

          {/* Financial Summary */}
          <div className="glass p-6 rounded-2xl shadow-card space-y-4 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-rose/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-muted uppercase tracking-wider">Total Cost</p>
                <p className="text-4xl font-bold text-rose mt-2">
                  QAR {summary.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-rose/10 rounded-xl text-rose text-xl">📉</div>
            </div>
            <p className="text-xs text-muted">Total cost for confirmed shipments</p>
          </div>

          <div className="glass p-6 rounded-2xl shadow-card space-y-4 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-muted uppercase tracking-wider">Total Revenue</p>
                <p className="text-4xl font-bold text-amber mt-2">
                  QAR {summary.totalCustomerPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-amber/10 rounded-xl text-amber text-xl">📈</div>
            </div>
            <p className="text-xs text-muted">
              Includes <span className="font-semibold text-emerald">QAR {summary.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> in Profit
            </p>
          </div>

        </div>
      ) : (
        <div className="text-center py-20 text-muted glass rounded-2xl">
          <p>No data available for this month.</p>
        </div>
      )}
    </div>
    </AppLayout>
  );
}
