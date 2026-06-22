"use client";
// app/dashboard/page.tsx
// ─────────────────────────────────────────────────────────────
//  Operational Dashboard — premium navy/gold redesign.
// ─────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import { DashboardMetrics } from "@/types";
import toast from "react-hot-toast";

// ── Metric Card ───────────────────────────────────────────────
interface MetricCardProps {
  label:      string;
  value:      number;
  icon:       string;
  accent:     string;   // CSS color string
  accentRgb:  string;   // e.g. "245,176,55"
  delay?:     number;
  highlight?: boolean;
}

function MetricCard({ label, value, icon, accent, accentRgb, delay = 0, highlight = false }: MetricCardProps) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplayed(0); return; }
    let start = 0;
    const step = Math.ceil(value / 25);
    const timer = setInterval(() => {
      start = Math.min(start + step, value);
      setDisplayed(start);
      if (start >= value) clearInterval(timer);
    }, 35);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div
      className="stat-card group"
      style={{
        animationDelay: `${delay}ms`,
        animation: "fade-in 0.45s ease-out both",
        ...(highlight ? {
          borderColor: `rgba(${accentRgb}, 0.30)`,
          boxShadow: `0 0 32px rgba(${accentRgb}, 0.15), 0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`,
        } : {}),
      }}
    >
      {/* Top gradient line (shows on hover or if highlight) */}
      <div className="absolute top-0 left-0 right-0 h-[1px] rounded-t-2xl transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          opacity: highlight ? 0.6 : 0,
        }}
      />

      {/* Icon chip */}
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{
            background: `rgba(${accentRgb}, 0.10)`,
            border: `1px solid rgba(${accentRgb}, 0.20)`,
          }}
        >
          {icon}
        </div>
        {highlight && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full animate-pulse"
            style={{
              background: `rgba(${accentRgb}, 0.12)`,
              border: `1px solid rgba(${accentRgb}, 0.25)`,
              color: accent,
            }}
          >
            ACTION
          </span>
        )}
      </div>

      {/* Value + label */}
      <div className="mt-2">
        <p className="text-4xl font-black tabular-nums leading-none"
          style={{
            color: "#c7a258",
            fontFamily: "'Outfit', sans-serif",
            ...(highlight ? { textShadow: `0 0 20px rgba(${accentRgb}, 0.35)` } : {}),
          }}
        >
          {displayed}
        </p>
        <p className="text-[12px] font-medium mt-1.5" style={{ color: "rgba(100,116,139,0.80)" }}>
          {label}
        </p>
      </div>

      {/* Bottom accent bar — expands on hover */}
      <div className="h-[2px] rounded-full transition-all duration-500 w-0 group-hover:w-full mt-1"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)`, opacity: 0.50 }}
      />
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────────
function SectionHeader({ label, icon }: { label: string; icon: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-sm">{icon}</span>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em]"
        style={{ color: "rgba(245,176,55,0.55)" }}
      >
        {label}
      </p>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(245,176,55,0.12), transparent)" }} />
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="stat-card space-y-3 animate-pulse">
      <div className="w-11 h-11 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }} />
      <div className="h-10 w-14 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }} />
      <div className="h-3 w-20 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
    </div>
  );
}

// ── Accent configs ─────────────────────────────────────────────
const ACCENTS = {
  gold:    { color: "#F5B037", rgb: "245,176,55"  },
  amber:   { color: "#F59E0B", rgb: "245,158,11"  },
  emerald: { color: "#10B981", rgb: "16,185,129"  },
  sky:     { color: "#38BDF8", rgb: "56,189,248"  },
  violet:  { color: "#8B5CF6", rgb: "139,92,246"  },
  rose:    { color: "#F43F5E", rgb: "244,63,94"   },
};

export default function DashboardPage() {
  const [metrics,        setMetrics]        = useState<DashboardMetrics | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [isCallingAgent, setIsCallingAgent] = useState(false);
  const [isCustomer,     setIsCustomer]     = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const rawUser = localStorage.getItem("freight_user");
      if (rawUser) {
        const user = JSON.parse(rawUser);
        setIsCallingAgent(user.role === "calling_agent");
        setIsCustomer(user.role === "customer");
      }
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const { data } = await api.get("/dashboard/metrics");
      setMetrics(data.data);
    } catch {
      toast.error("Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60_000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  // ── Info Bar ──────────────────────────────────────────────────
  const InfoBar = ({ note }: { note: string }) => (
    <div className="rounded-2xl px-6 py-4 flex items-center gap-6 animate-stagger-5"
      style={{
        background: "rgba(12,18,32,0.70)",
        border: "1px solid rgba(245,176,55,0.07)",
        backdropFilter: "blur(12px)",
      }}
    >
      <span className="text-[12px]" style={{ color: "rgba(100,116,139,0.70)" }}>
        🕐 Auto-refreshes every 60s
      </span>
      <span className="w-px h-4" style={{ background: "rgba(255,255,255,0.06)" }} />
      <span className="text-[12px]" style={{ color: "rgba(100,116,139,0.70)" }}>{note}</span>
      <span className="w-px h-4" style={{ background: "rgba(255,255,255,0.06)" }} />
      <button onClick={fetchMetrics}
        className="text-[12px] font-semibold transition-colors"
        style={{ color: "rgba(245,176,55,0.70)" }}
        onMouseEnter={e => (e.currentTarget.style.color = "#F5B037")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(245,176,55,0.70)")}
      >
        ↻ Refresh Now
      </button>
    </div>
  );

  // ── Customer view ─────────────────────────────────────────────
  if (isCustomer) {
    return (
      <AppLayout title="Dashboard" subtitle="Overview of your quote requests and their current status.">
        <div className="max-w-5xl space-y-8">
          <section>
            <SectionHeader label="Requests & Status Overview" icon="📦" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {loading ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />) : (
                <>
                  <MetricCard label="Total Requests"  value={metrics?.totalRFQs        || 0} icon="📦" accent={ACCENTS.gold.color}    accentRgb={ACCENTS.gold.rgb}    delay={0}   />
                  <MetricCard label="Pending Quote"   value={metrics?.quotationPending  || 0} icon="⏳" accent={ACCENTS.amber.color}   accentRgb={ACCENTS.amber.rgb}   delay={60}  />
                  <MetricCard label="Quoted"          value={metrics?.quoted            || 0} icon="💬" accent={ACCENTS.sky.color}     accentRgb={ACCENTS.sky.rgb}     delay={120} />
                  <MetricCard label="Under Review"    value={metrics?.customerReview    || 0} icon="👁" accent={ACCENTS.violet.color}  accentRgb={ACCENTS.violet.rgb}  delay={180} />
                  <MetricCard label="Confirmed"       value={metrics?.confirmed         || 0} icon="✓" accent={ACCENTS.emerald.color} accentRgb={ACCENTS.emerald.rgb} delay={240} />
                </>
              )}
            </div>
          </section>
          <InfoBar note="📍 Status updates made by the operator are reflected instantly" />
        </div>
      </AppLayout>
    );
  }

  // ── Calling Agent view ────────────────────────────────────────
  if (isCallingAgent) {
    return (
      <AppLayout title="Call Enquiry Dashboard" subtitle="Overview of your logged calls, active leads, and outcomes.">
        <div className="max-w-5xl space-y-8">
          <section>
            <SectionHeader label="Call Enquiries — Outcome Metrics" icon="📞" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {loading ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />) : (
                <>
                  <MetricCard label="Call Enquiries"  value={metrics?.totalEnquiries || 0} icon="📞" accent={ACCENTS.gold.color}    accentRgb={ACCENTS.gold.rgb}    delay={0}   />
                  <MetricCard label="Lead"            value={metrics?.lead           || 0} icon="🎯" accent={ACCENTS.sky.color}     accentRgb={ACCENTS.sky.rgb}     delay={60}  />
                  <MetricCard label="No Lead"         value={metrics?.noLead         || 0} icon="✕" accent={ACCENTS.rose.color}    accentRgb={ACCENTS.rose.rgb}    delay={120} />
                  <MetricCard label="Confirmed"       value={metrics?.confirmed      || 0} icon="✓" accent={ACCENTS.emerald.color} accentRgb={ACCENTS.emerald.rgb} delay={180} />
                  <MetricCard label="Lost"            value={metrics?.lost           || 0} icon="🗑" accent={ACCENTS.amber.color}   accentRgb={ACCENTS.amber.rgb}   delay={240} />
                </>
              )}
            </div>
          </section>
          <InfoBar note="📞 Call outcomes are assigned dynamically to Sales for follow-up" />
        </div>
      </AppLayout>
    );
  }

  // ── Default (Operator / Admin) view ───────────────────────────
  return (
    <AppLayout title="Operational Dashboard" subtitle="Live overview of all freight operations and RFQ pipeline.">
      <div className="max-w-7xl space-y-8">

        {/* ── Pipeline ─────────────────────────────────────── */}
        <section>
          <SectionHeader label="Pipeline — RFQ Funnel" icon="◈" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {loading ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />) :
              metrics && (
                <>
                  <MetricCard label="Total RFQs"       value={metrics.totalRFQs}       icon="📦" accent={ACCENTS.gold.color}    accentRgb={ACCENTS.gold.rgb}    delay={0}   />
                  <MetricCard label="Pending Quote"     value={metrics.quotationPending} icon="⏳" accent={ACCENTS.amber.color}   accentRgb={ACCENTS.amber.rgb}   delay={60}  />
                  <MetricCard label="Quoted"            value={metrics.quoted}           icon="💬" accent={ACCENTS.sky.color}     accentRgb={ACCENTS.sky.rgb}     delay={120} />
                  <MetricCard label="Customer Review"   value={metrics.customerReview}   icon="👁" accent={ACCENTS.violet.color}  accentRgb={ACCENTS.violet.rgb}  delay={180} />
                  <MetricCard label="Confirmed"         value={metrics.confirmed}        icon="✓" accent={ACCENTS.emerald.color} accentRgb={ACCENTS.emerald.rgb} delay={240} />
                </>
              )
            }
          </div>
        </section>

        {/* ── Execution ────────────────────────────────────── */}
        <section>
          <SectionHeader label="Execution — Shipment Status" icon="◉" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {loading ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />) :
              metrics && (
                <>
                  <MetricCard label="Files Pending"  value={metrics.filesPending}  icon="📄" accent={ACCENTS.sky.color}     accentRgb={ACCENTS.sky.rgb}     delay={0}   />
                  <MetricCard label="Completed"      value={metrics.completed}      icon="🏁" accent={ACCENTS.emerald.color} accentRgb={ACCENTS.emerald.rgb} delay={60}  />
                  <MetricCard label="Return Pending" value={metrics.returnPending}  icon="↩" accent={ACCENTS.amber.color}   accentRgb={ACCENTS.amber.rgb}   delay={120} />
                  <MetricCard label="Cancelled"      value={metrics.cancelled}      icon="✕" accent={ACCENTS.rose.color}    accentRgb={ACCENTS.rose.rgb}    delay={180} />
                  <MetricCard
                    label="Follow Ups Due"
                    value={metrics.followUpsDue}
                    icon="🔔"
                    accent={metrics.followUpsDue > 0 ? ACCENTS.gold.color : ACCENTS.amber.color}
                    accentRgb={metrics.followUpsDue > 0 ? ACCENTS.gold.rgb : ACCENTS.amber.rgb}
                    delay={240}
                    highlight={metrics.followUpsDue > 0}
                  />
                </>
              )
            }
          </div>
        </section>

        <InfoBar note="📍 Follow Ups Due = active shipments with last update > 4 hours ago" />
      </div>
    </AppLayout>
  );
}
