"use client";
// app/dashboard/page.tsx
// ─────────────────────────────────────────────────────────────
//  Operational Dashboard — two metric rows:
//  Row 1: Pipeline (Total RFQs, Pending, Quoted, Review, Confirmed)
//  Row 2: Execution (Files Pending, Completed, Return Pending, Cancelled, Follow Ups Due)
// ─────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import { DashboardMetrics } from "@/types";
import toast from "react-hot-toast";

// ── Metric Card ───────────────────────────────────────────────
interface MetricCardProps {
  label:     string;
  value:     number;
  icon:      string;
  colorClass:string;
  glowClass: string;
  delay?:    number;
  highlight?: boolean;
}

function MetricCard({ label, value, icon, colorClass, glowClass, delay = 0, highlight = false }: MetricCardProps) {
  const [displayed, setDisplayed] = useState(0);

  // Count-up animation
  useEffect(() => {
    if (value === 0) { setDisplayed(0); return; }
    let start = 0;
    const step = Math.ceil(value / 20);
    const timer = setInterval(() => {
      start = Math.min(start + step, value);
      setDisplayed(start);
      if (start >= value) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div
      className={`
        glass rounded-2xl p-5 flex flex-col gap-3 cursor-default transition-all duration-300
        hover:shadow-card-hover hover:-translate-y-1 group
        ${highlight ? `border ${glowClass} shadow-glow-amber` : ""}
      `}
      style={{ animationDelay: `${delay}ms`, animation: "fade-in 0.4s ease-out both" }}
    >
      {/* Icon + indicator */}
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${colorClass}/20 border ${colorClass}/30`}>
          {icon}
        </div>
        {highlight && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber bg-amber/10 px-2 py-0.5 rounded-full border border-amber/20 animate-pulse">
            Action
          </span>
        )}
      </div>

      {/* Value */}
      <div>
        <p className={`text-4xl font-black tabular-nums ${highlight ? "text-amber" : "text-primary"}`}>
          {displayed}
        </p>
        <p className={`text-xs font-medium mt-1 ${highlight ? "text-amber/70" : "text-muted"}`}>
          {label}
        </p>
      </div>

      {/* Bottom accent line */}
      <div className={`h-0.5 rounded-full bg-gradient-to-r ${colorClass}/40 to-transparent w-0 group-hover:w-full transition-all duration-500`} />
    </div>
  );
}

// ── Section Label ─────────────────────────────────────────────
function SectionLabel({ label, icon }: { label: string; icon: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm">{icon}</span>
      <p className="text-xs uppercase font-semibold tracking-widest text-muted">{label}</p>
      <div className="flex-1 h-px bg-white/[0.05]" />
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-5 space-y-3 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-white/5" />
      <div className="h-10 w-16 rounded-lg bg-white/5" />
      <div className="h-3 w-24 rounded-full bg-white/5" />
    </div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

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
    // Auto-refresh every 60s
    const interval = setInterval(fetchMetrics, 60_000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return (
    <AppLayout
      title="Operational Dashboard"
      subtitle="Live overview of all freight operations and RFQ pipeline."
    >
      <div className="max-w-7xl space-y-8">

        {/* ── Row 1: Pipeline ────────────────────────────── */}
        <section>
          <SectionLabel label="Pipeline — RFQ Funnel" icon="◈" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
            ) : metrics && (
              <>
                <MetricCard label="Total RFQs"        value={metrics.totalRFQs}        icon="📦" colorClass="bg-blue"    glowClass="border-blue/20"    delay={0}   />
                <MetricCard label="Quotation Pending"  value={metrics.quotationPending}  icon="⏳" colorClass="bg-amber"   glowClass="border-amber/20"   delay={50}  />
                <MetricCard label="Quoted"             value={metrics.quoted}            icon="💬" colorClass="bg-blue"    glowClass="border-blue/20"    delay={100} />
                <MetricCard label="Customer Review"    value={metrics.customerReview}    icon="👁" colorClass="bg-violet"  glowClass="border-violet/20"  delay={150} />
                <MetricCard label="Confirmed"          value={metrics.confirmed}         icon="✓"  colorClass="bg-emerald" glowClass="border-emerald/20" delay={200} />
              </>
            )}
          </div>
        </section>

        {/* ── Row 2: Execution ───────────────────────────── */}
        <section>
          <SectionLabel label="Execution — Shipment Status" icon="◉" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
            ) : metrics && (
              <>
                <MetricCard label="Files Pending"   value={metrics.filesPending}   icon="📄" colorClass="bg-blue-bright" glowClass="border-blue-bright/20" delay={0}   />
                <MetricCard label="Completed"        value={metrics.completed}       icon="🏁" colorClass="bg-emerald"     glowClass="border-emerald/20"     delay={50}  />
                <MetricCard label="Return Pending"   value={metrics.returnPending}   icon="↩" colorClass="bg-amber"       glowClass="border-amber/20"       delay={100} />
                <MetricCard label="Cancelled"        value={metrics.cancelled}       icon="✕"  colorClass="bg-rose"        glowClass="border-rose/20"        delay={150} />
                {/* Highlighted Follow-Ups Due */}
                <MetricCard
                  label="Follow Ups Due"
                  value={metrics.followUpsDue}
                  icon="🔔"
                  colorClass="bg-amber"
                  glowClass="border-amber/30"
                  delay={200}
                  highlight={metrics.followUpsDue > 0}
                />
              </>
            )}
          </div>
        </section>

        {/* ── Quick Info Bar ─────────────────────────────── */}
        <section className="glass rounded-2xl p-5 flex items-center gap-6 text-xs text-muted">
          <span>🕐 Auto-refreshes every 60s</span>
          <span className="w-px h-4 bg-white/10" />
          <span>📍 Follow Ups Due = active shipments with last update &gt; 4 hours ago</span>
          <span className="w-px h-4 bg-white/10" />
          <button onClick={fetchMetrics} className="text-blue hover:text-blue-bright transition-colors font-medium">
            ↻ Refresh Now
          </button>
        </section>
      </div>
    </AppLayout>
  );
}
