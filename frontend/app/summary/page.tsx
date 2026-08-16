"use client";
import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { format, subMonths, addMonths } from "date-fns";
import toast from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";

import { useAuth } from "@/hooks/useAuth";

interface SummaryData {
  totalRFQs: number;
  totalConfirmed: number;
  totalCompleted?: number;
  totalCost: number;
  totalProfit: number;
  totalCustomerPrice: number;
  totalCallEnquiries?: number;
  totalLeads?: number;
  totalEnquiriesWon?: number;
  totalAssignedCallEnquiries?: number;
  totalAssignedEnquiriesWon?: number;
}

interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  label: string;
  value: string;
  options: CustomSelectOption[];
  onChange: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

function CustomSelect({ label, value, options, onChange, disabled = false, placeholder = "Select option" }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="flex-1 w-full space-y-1.5" ref={dropdownRef}>
      <label className="text-xs font-semibold text-muted tracking-wider uppercase">{label}</label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-surface-2 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-primary flex items-center justify-between focus:border-blue/50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-left transition-all duration-200"
        >
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          <span className={`text-[10px] text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
            ▼
          </span>
        </button>

        {isOpen && !disabled && (
          <div className="absolute left-0 right-0 z-[9999] bottom-full mb-1.5 bg-surface-2 border border-white/[0.08] rounded-xl shadow-2xl max-h-60 overflow-y-auto py-1 scrollbar animate-fade-in">
            {options.length === 0 ? (
              <div className="px-4 py-2.5 text-xs text-muted text-center">No options available</div>
            ) : (
              options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-white/[0.04] ${
                    opt.value === value ? "text-blue bg-white/[0.02] font-semibold" : "text-primary/90"
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SummaryPage() {
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");

  const activeRole = user?.role === "admin" ? selectedRole : user?.role;

  useEffect(() => {
    if (user?.role === "admin") {
      fetchUsers();
    }
  }, [user]);

  useEffect(() => {
    fetchSummary(currentDate, selectedRole, selectedUser);
  }, [currentDate, selectedRole, selectedUser]);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/auth/admin/users");
      setUsers(data.data || []);
    } catch (err) {
      console.error("Failed to fetch users list:", err);
    }
  };

  const fetchSummary = async (date: Date, role = selectedRole, filterUser = selectedUser) => {
    setLoading(true);
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      let url = `/dashboard/summary?year=${year}&month=${month}`;
      if (role && role !== "all") {
        url += `&role=${role}`;
      }
      if (filterUser && filterUser !== "all") {
        url += `&filter_user=${filterUser}`;
      }
      const res = await api.get(url);
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
      {/* Header with Navigation and Filters */}
      <div className="glass p-6 rounded-2xl shadow-card space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">Monthly Summary</h1>
            <p className="text-sm text-muted mt-1">
              Statistics for {format(currentDate, "MMMM yyyy")}
            </p>
          </div>

          <div className="flex items-center gap-4 self-end md:self-auto">
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

        {user?.role === "admin" && (
          <div className="pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row gap-4 items-end">
            <CustomSelect
              label="Filter by User Type"
              value={selectedRole}
              onChange={(val) => {
                setSelectedRole(val);
                setSelectedUser("all");
              }}
              options={[
                { value: "all", label: "All Roles" },
                { value: "customer", label: "Customers" },
                { value: "calling_agent", label: "Call Agents" },
                { value: "operator", label: "Operators" },
                { value: "sales", label: "Sales" }
              ]}
            />

            <CustomSelect
              label="Filter by Specific User"
              value={selectedUser}
              disabled={selectedRole === "all"}
              onChange={(val) => setSelectedUser(val)}
              options={[
                { value: "all", label: "All Users" },
                ...users
                  .filter((u) => u.role === selectedRole)
                  .map((u) => ({
                    value: u.username,
                    label: `${u.username}${u.dear_who ? ` (${u.dear_who})` : ""}`
                  }))
              ]}
            />
          </div>
        )}
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
        activeRole === "calling_agent" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Call Enquiries */}
            <div className="glass p-6 rounded-2xl shadow-card space-y-4 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-muted uppercase tracking-wider">Call Enquiries</p>
                  <p className="text-4xl font-bold text-primary mt-2">{summary.totalCallEnquiries}</p>
                </div>
                <div className="p-3 bg-blue/10 rounded-xl text-blue text-xl">📞</div>
              </div>
              <p className="text-xs text-muted">Calls logged in {format(currentDate, "MMMM")}</p>
            </div>

            {/* No of Leads */}
            <div className="glass p-6 rounded-2xl shadow-card space-y-4 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-muted uppercase tracking-wider">No of Leads</p>
                  <p className="text-4xl font-bold text-amber mt-2">{summary.totalLeads}</p>
                </div>
                <div className="p-3 bg-amber/10 rounded-xl text-amber text-xl">🔥</div>
              </div>
              <p className="text-xs text-muted">Leads generated in {format(currentDate, "MMMM")}</p>
            </div>

            {/* Won */}
            <div className="glass p-6 rounded-2xl shadow-card space-y-4 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-muted uppercase tracking-wider">Won</p>
                  <p className="text-4xl font-bold text-emerald mt-2">{summary.totalEnquiriesWon}</p>
                </div>
                <div className="p-3 bg-emerald/10 rounded-xl text-emerald text-xl">🏆</div>
              </div>
              <p className="text-xs text-muted">Confirmed business in {format(currentDate, "MMMM")}</p>
            </div>
          </div>
        ) : activeRole === "sales" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Call Enquiries Assigned */}
            <div className="glass p-6 rounded-2xl shadow-card space-y-4 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-muted uppercase tracking-wider">Call Enquiries Assigned</p>
                  <p className="text-4xl font-bold text-primary mt-2">{summary.totalAssignedCallEnquiries}</p>
                </div>
                <div className="p-3 bg-blue/10 rounded-xl text-blue text-xl">📋</div>
              </div>
              <p className="text-xs text-muted">Assigned calls in {format(currentDate, "MMMM")}</p>
            </div>

            {/* Call Enquiries Won */}
            <div className="glass p-6 rounded-2xl shadow-card space-y-4 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-muted uppercase tracking-wider">Call Enquiries Won</p>
                  <p className="text-4xl font-bold text-emerald mt-2">{summary.totalAssignedEnquiriesWon}</p>
                </div>
                <div className="p-3 bg-emerald/10 rounded-xl text-emerald text-xl">🤝</div>
              </div>
              <p className="text-xs text-muted">Assigned calls won in {format(currentDate, "MMMM")}</p>
            </div>

            {/* Total RFQs */}
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

            {/* Confirmed Shipments */}
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

            {/* Completed Shipments */}
            <div className="glass p-6 rounded-2xl shadow-card space-y-4 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-sky/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-muted uppercase tracking-wider">Completed Shipments</p>
                  <p className="text-4xl font-bold text-sky mt-2">{summary.totalCompleted || 0}</p>
                </div>
                <div className="p-3 bg-sky/10 rounded-xl text-sky text-xl">🏁</div>
              </div>
              <p className="text-xs text-muted">Shipments completed in {format(currentDate, "MMMM")}</p>
            </div>

            {/* Total Cost */}
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
              <p className="text-xs text-muted">Total cost for confirmed & completed</p>
            </div>

            {/* Total Revenue */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

            <div className="glass p-6 rounded-2xl shadow-card space-y-4 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-sky/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-muted uppercase tracking-wider">Completed Shipments</p>
                  <p className="text-4xl font-bold text-sky mt-2">{summary.totalCompleted || 0}</p>
                </div>
                <div className="p-3 bg-sky/10 rounded-xl text-sky text-xl">🏁</div>
              </div>
              <p className="text-xs text-muted">Shipments completed in {format(currentDate, "MMMM")}</p>
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
              <p className="text-xs text-muted">Total cost for confirmed & completed</p>
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

            {/* All Roles additional call enquiries cards */}
            {activeRole === "all" && (
              <>
                {/* Call Enquiries */}
                <div className="glass p-6 rounded-2xl shadow-card space-y-4 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-muted uppercase tracking-wider">Call Enquiries</p>
                      <p className="text-4xl font-bold text-primary mt-2">{summary.totalCallEnquiries}</p>
                    </div>
                    <div className="p-3 bg-blue/10 rounded-xl text-blue text-xl">📞</div>
                  </div>
                  <p className="text-xs text-muted">Calls logged in {format(currentDate, "MMMM")}</p>
                </div>

                {/* No of Leads */}
                <div className="glass p-6 rounded-2xl shadow-card space-y-4 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-muted uppercase tracking-wider">No of Leads</p>
                      <p className="text-4xl font-bold text-amber mt-2">{summary.totalLeads}</p>
                    </div>
                    <div className="p-3 bg-amber/10 rounded-xl text-amber text-xl">🔥</div>
                  </div>
                  <p className="text-xs text-muted">Leads generated in {format(currentDate, "MMMM")}</p>
                </div>

                {/* Won */}
                <div className="glass p-6 rounded-2xl shadow-card space-y-4 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-muted uppercase tracking-wider">Won</p>
                      <p className="text-4xl font-bold text-emerald mt-2">{summary.totalEnquiriesWon}</p>
                    </div>
                    <div className="p-3 bg-emerald/10 rounded-xl text-emerald text-xl">🏆</div>
                  </div>
                  <p className="text-xs text-muted">Confirmed business in {format(currentDate, "MMMM")}</p>
                </div>

                {/* Call Enquiries Assigned */}
                <div className="glass p-6 rounded-2xl shadow-card space-y-4 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-muted uppercase tracking-wider">Call Enquiries Assigned</p>
                      <p className="text-4xl font-bold text-primary mt-2">{summary.totalAssignedCallEnquiries}</p>
                    </div>
                    <div className="p-3 bg-blue/10 rounded-xl text-blue text-xl">📋</div>
                  </div>
                  <p className="text-xs text-muted">Assigned calls in {format(currentDate, "MMMM")}</p>
                </div>

                {/* Call Enquiries Won */}
                <div className="glass p-6 rounded-2xl shadow-card space-y-4 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-muted uppercase tracking-wider">Call Enquiries Won</p>
                      <p className="text-4xl font-bold text-emerald mt-2">{summary.totalAssignedEnquiriesWon}</p>
                    </div>
                    <div className="p-3 bg-emerald/10 rounded-xl text-emerald text-xl">🤝</div>
                  </div>
                  <p className="text-xs text-muted">Assigned calls won in {format(currentDate, "MMMM")}</p>
                </div>
              </>
            )}
          </div>
        )
      ) : (
        <div className="text-center py-20 text-muted glass rounded-2xl">
          <p>No data available for this month.</p>
        </div>
      )}
    </div>
    </AppLayout>
  );
}
