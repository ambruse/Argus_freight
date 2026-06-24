"use client";
// components/layout/Sidebar.tsx
// ─────────────────────────────────────────────────────────────
//  Fixed left sidebar — premium navy/gold design.
// ─────────────────────────────────────────────────────────────
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import api from "@/lib/api";

interface NavItem {
  href:    string;
  label:   string;
  icon:    string;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  // General
  { href: "/dashboard",             label: "Dashboard",        icon: "⬡",  section: "OVERVIEW" },
  // Operator / Admin RFQ
  { href: "/rfq/new",               label: "New RFQ",          icon: "✦",  section: "FREIGHT" },
  { href: "/rfq",                   label: "Sent RFQs",        icon: "◈",  section: "FREIGHT" },
  { href: "/confirmed",             label: "Confirmed",        icon: "◉",  section: "FREIGHT" },
  { href: "/summary",               label: "Summary",          icon: "▦",  section: "FREIGHT" },
  { href: "/contacts",              label: "Address Book",     icon: "◎",  section: "FREIGHT" },
  { href: "/quotation",             label: "Quotation",        icon: "❖",  section: "FREIGHT" },
  // Customer
  { href: "/customer/rfq/new",      label: "Request Quote",    icon: "✦",  section: "MY PORTAL" },
  { href: "/customer/rfq",          label: "My Requests",      icon: "◈",  section: "MY PORTAL" },
  // Calling Agent
  { href: "/calling-agent/new",     label: "Call Enquiry",     icon: "☎",  section: "CALLS" },
  { href: "/calling-agent/enquiries", label: "My Enquiries",   icon: "◐",  section: "CALLS" },
  // Admin
  { href: "/admin/call-enquiries",  label: "All Enquiries",    icon: "◑",  section: "ADMIN" },
  { href: "/admin/register",        label: "Register User",    icon: "⊕",  section: "ADMIN" },
  { href: "/admin/quotations",      label: "Quotation Approval", icon: "☑", section: "ADMIN" },
  // Sales
  { href: "/sales/call-enquiries",  label: "Assigned Calls",   icon: "◐",  section: "SALES" },
  // Bottom always
  { href: "/settings",              label: "Settings",         icon: "⚙",  section: "ACCOUNT" },
];

export default function Sidebar() {
  const pathname  = usePathname();
  const { user, logout } = useAuth();
  const [rfqUnread,       setRfqUnread]       = useState(0);
  const [confirmedUnread, setConfirmedUnread] = useState(0);
  const [theme,           setTheme]           = useState<"dark" | "light">("dark");

  /* ── Theme sync ─────────────────────────────────────────── */
  useEffect(() => {
    const sync = () => {
      const saved = (localStorage.getItem("theme") as "dark" | "light") || "dark";
      setTheme(saved);
      // Apply to html element correctly
      if (saved === "light") {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      } else {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      }
    };
    sync();
    window.addEventListener("themeChanged", sync);
    return () => window.removeEventListener("themeChanged", sync);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    if (next === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
    window.dispatchEvent(new Event("themeChanged"));
  };

  /* ── Unread badge polling ───────────────────────────────── */
  useEffect(() => {
    const fetchUnread = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("freight_token") : null;
      if (!token) return;
      try {
        const { data } = await api.get("/dashboard/unread-replies");
        const unread = data.data || [];
        let rfq = 0, confirmed = 0;
        unread.forEach((r: any) => {
          const isConf = ["Confirmed","Files Pending","Completed","Return Pending"].includes(r.shipment_status);
          if (isConf) confirmed++; else rfq++;
        });
        setRfqUnread(rfq);
        setConfirmedUnread(confirmed);
      } catch {}
    };
    fetchUnread();
    
    const handleRefresh = () => {
      fetchUnread();
    };
    window.addEventListener("rfq-list-update", handleRefresh);
    window.addEventListener("refresh-unread-replies", handleRefresh);

    const id = setInterval(fetchUnread, 5000);
    return () => {
      clearInterval(id);
      window.removeEventListener("rfq-list-update", handleRefresh);
      window.removeEventListener("refresh-unread-replies", handleRefresh);
    };
  }, []);

  /* ── Filter nav by role ─────────────────────────────────── */
  const visibleItems = NAV_ITEMS.filter(item => {
    if (user?.role === "customer")      return ["/dashboard", "/customer/rfq/new", "/customer/rfq", "/settings"].includes(item.href);
    if (user?.role === "sales")         return ["/rfq/new", "/rfq", "/confirmed", "/summary", "/sales/call-enquiries", "/settings", "/quotation"].includes(item.href);
    if (user?.role === "calling_agent") return ["/dashboard", "/calling-agent/new", "/calling-agent/enquiries", "/settings"].includes(item.href);
    if (user?.role === "admin")         return !item.href.startsWith("/calling-agent") && !item.href.startsWith("/sales/call-enquiries") && !item.href.startsWith("/customer");
    if (user?.role === "operator")      return !item.href.startsWith("/calling-agent") && !item.href.startsWith("/sales/call-enquiries") && !item.href.startsWith("/admin") && !item.href.startsWith("/customer");
    return true;
  });

  /* ── Group by section for dividers ─────────────────────── */
  const sections: string[] = [];
  visibleItems.forEach(item => {
    if (item.section && !sections.includes(item.section)) sections.push(item.section);
  });

  const initial = user?.username?.[0]?.toUpperCase() ?? "U";

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-40 sidebar-glow"
      style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      {/* ── Gold accent line at very top ─────────────────── */}
      <div className="h-[2px] w-full flex-shrink-0"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(245,176,55,0.70) 50%, transparent 100%)" }}
      />

      {/* ── Logo Section ─────────────────────────────────── */}
      <Link href="/" className="flex items-center gap-3 px-5 py-5 flex-shrink-0 hover:opacity-90 transition-opacity"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-xl blur-md opacity-40"
            style={{ background: "radial-gradient(circle, rgba(245,176,55,0.5) 0%, transparent 70%)" }}
          />
          <img
            src={theme === "light" ? "/light-logo.png" : "/logo.png"}
            alt="ARGUS Shipping"
            className="relative w-auto h-10 object-contain"
          />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight"
            style={{ color: "var(--sidebar-text-primary)", fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}
          >
            ARGUS
          </p>
          <p className="text-[10px] uppercase tracking-[0.18em] mt-0.5" style={{ color: "var(--sidebar-text-gold)" }}>
            Cargo Management
          </p>
        </div>
      </Link>

      {/* ── Navigation ───────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {sections.map((section, si) => {
          const items = visibleItems.filter(i => i.section === section);
          return (
            <div key={section} className={si > 0 ? "mt-4" : ""}>
              <p className="text-[9px] font-bold uppercase tracking-[0.20em] px-3 mb-2"
                style={{ color: "var(--sidebar-section-header)" }}
              >
                {section}
              </p>
              {items.map(item => {
                const cleanPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
                const active = cleanPath === item.href || (
                  !["/rfq", "/customer/rfq", "/calling-agent/enquiries"].includes(item.href) &&
                  cleanPath.startsWith(item.href + "/")
                );

                return (
                  <Link key={item.href} href={item.href}
                    className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group mb-0.5"
                    style={active ? {
                      background: "var(--sidebar-active-bg)",
                      border: "1px solid var(--sidebar-active-border)",
                      color: "var(--sidebar-active-text)",
                      boxShadow: "var(--sidebar-active-shadow)",
                    } : {
                      background: "transparent",
                      border: "1px solid transparent",
                      color: "var(--sidebar-text-secondary)",
                    }}
                  >
                    {/* Active indicator bar */}
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                        style={{ background: "var(--sidebar-indicator-bg)", boxShadow: "var(--sidebar-indicator-shadow)" }}
                      />
                    )}

                    {/* Icon */}
                    <span className="text-base w-5 text-center flex-shrink-0 transition-all duration-200"
                      style={{ color: active ? "var(--sidebar-active-text)" : "var(--sidebar-text-muted)" }}
                    >
                      {item.icon}
                    </span>

                    <span className="flex-1 text-[13px]">{item.label}</span>

                    {/* Unread badges */}
                    {item.href === "/rfq" && rfqUnread > 0 && (
                      <span className="flex items-center justify-center text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] h-5 animate-pulse"
                        style={{ background: "rgba(244,63,94,0.15)", color: "#F43F5E", border: "1px solid rgba(244,63,94,0.30)" }}
                      >
                        {rfqUnread}
                      </span>
                    )}
                    {item.href === "/confirmed" && confirmedUnread > 0 && (
                      <span className="flex items-center justify-center text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] h-5 animate-pulse"
                        style={{ background: "rgba(244,63,94,0.15)", color: "#F43F5E", border: "1px solid rgba(244,63,94,0.30)" }}
                      >
                        {confirmedUnread}
                      </span>
                    )}

                    {/* Hover glow arrow */}
                    {!active && (
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                        style={{ color: "var(--sidebar-arrow-color)" }}
                      >
                        ›
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* ── User + Controls ──────────────────────────────── */}
      <div className="px-3 pb-4 pt-3 flex-shrink-0" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        {/* User card */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2"
          style={{ background: "var(--sidebar-card-bg)", border: "1px solid var(--sidebar-card-border)" }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{
              background: "var(--sidebar-avatar-bg)",
              border: "1px solid var(--sidebar-avatar-border)",
              color: "var(--sidebar-avatar-text)",
            }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: "var(--sidebar-text-primary)" }}>
              {user?.username ?? "—"}
            </p>
            <p className="text-[10px] capitalize mt-0.5" style={{ color: "var(--sidebar-text-gold)" }}>
              {user?.role?.replace("_", " ") ?? "—"}
            </p>
          </div>
        </div>

        {/* Theme toggle */}
        <button onClick={toggleTheme}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 mb-1 sidebar-action-btn"
        >
          <span className="text-base w-5 text-center">{theme === "dark" ? "☀" : "🌙"}</span>
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>

        {/* Sign out */}
        <button onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 sidebar-logout-btn"
        >
          <span className="text-base w-5 text-center">⏻</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
