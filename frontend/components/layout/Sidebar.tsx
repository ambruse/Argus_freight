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
  { href: "/customers",             label: "Customer Book",    icon: "▤",  section: "FREIGHT" },
  { href: "/calculator",            label: "Calculator",       icon: "🧮",  section: "FREIGHT" },
  // Customer
  { href: "/customer/rfq/new",      label: "Request Quote",    icon: "✦",  section: "MY PORTAL" },
  { href: "/customer/rfq",          label: "My Requests",      icon: "◈",  section: "MY PORTAL" },
  // Calling Agent
  { href: "/calling-agent/new",     label: "Call Enquiry",     icon: "☎",  section: "CALLS" },
  { href: "/calling-agent/enquiries", label: "My Enquiries",   icon: "◐",  section: "CALLS" },
  // Admin
  { href: "/admin/call-enquiries",  label: "All Enquiries",    icon: "◑",  section: "ADMIN" },
  { href: "/admin/register",        label: "Register User",    icon: "⊕",  section: "ADMIN" },
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
  const [isCollapsed,     setIsCollapsed]     = useState(false);

  /* ── Sidebar collapse sync ─────────────────────────────── */
  useEffect(() => {
    const syncCollapse = () => {
      const saved = localStorage.getItem("sidebar_collapsed") === "true";
      setIsCollapsed(saved);
    };
    syncCollapse();
    window.addEventListener("sidebarToggle", syncCollapse);
    return () => window.removeEventListener("sidebarToggle", syncCollapse);
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("sidebar_collapsed", String(next));
    window.dispatchEvent(new Event("sidebarToggle"));
  };

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
    if (user?.role === "sales")         return ["/rfq/new", "/rfq", "/confirmed", "/summary", "/sales/call-enquiries", "/settings", "/customers", "/calculator"].includes(item.href);
    if (user?.role === "calling_agent") return ["/dashboard", "/calling-agent/new", "/calling-agent/enquiries", "/settings"].includes(item.href);
    if (user?.role === "admin")         return !item.href.startsWith("/calling-agent") && !item.href.startsWith("/sales/call-enquiries") && !item.href.startsWith("/customer/") && item.href !== "/quotation" && item.href !== "/admin/quotations";
    if (user?.role === "operator")      return !item.href.startsWith("/calling-agent") && !item.href.startsWith("/sales/call-enquiries") && !item.href.startsWith("/admin") && !item.href.startsWith("/customer/") && item.href !== "/quotation";
    return true;
  });

  /* ── Group by section for dividers ─────────────────────── */
  const sections: string[] = [];
  visibleItems.forEach(item => {
    if (item.section && !sections.includes(item.section)) sections.push(item.section);
  });

  const initial = user?.username?.[0]?.toUpperCase() ?? "U";

  return (
    <aside
      className={`fixed left-0 top-0 h-screen flex flex-col z-40 sidebar-glow transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
      style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      {/* ── Gold accent line at very top ─────────────────── */}
      <div className="h-[2px] w-full flex-shrink-0"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(245,176,55,0.70) 50%, transparent 100%)" }}
      />

      {/* ── Header / Logo Section + Minimize Button ───────────── */}
      {isCollapsed ? (
        <div className="flex flex-col items-center py-3.5 px-2 gap-2 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--sidebar-border)" }}
        >
          <Link href="/" className="relative hover:opacity-90 transition-opacity" title="ARGUS Cargo Management">
            <div className="absolute inset-0 rounded-xl blur-md opacity-40"
              style={{ background: "radial-gradient(circle, rgba(245,176,55,0.5) 0%, transparent 70%)" }}
            />
            <img
              src={theme === "light" ? "/logo.png" : "/logo.png"}
              alt="ARGUS Shipping"
              className="relative w-auto h-8 object-contain"
            />
          </Link>
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#F5B037] hover:bg-white/[0.06] transition-all"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--sidebar-border)" }}
        >
          <Link href="/" className="flex items-center gap-3 min-w-0 hover:opacity-90 transition-opacity">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-xl blur-md opacity-40"
                style={{ background: "radial-gradient(circle, rgba(245,176,55,0.5) 0%, transparent 70%)" }}
              />
              <img
                src={theme === "light" ? "/logo.png" : "/logo.png"}
                alt="ARGUS Shipping"
                className="relative w-auto h-9 object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight truncate"
                style={{ color: "var(--sidebar-text-primary)", fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}
              >
                ARGUS
              </p>
              <p className="text-[9px] uppercase tracking-[0.18em] mt-0.5 truncate" style={{ color: "var(--sidebar-text-gold)" }}>
                Cargo Management
              </p>
            </div>
          </Link>

          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#F5B037] hover:bg-white/[0.06] transition-all flex-shrink-0 ml-1"
            title="Minimize sidebar"
            aria-label="Minimize sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Navigation ───────────────────────────────────── */}
      <nav className={`flex-1 ${isCollapsed ? "px-2" : "px-3"} py-4 space-y-0.5 overflow-y-auto overflow-x-hidden`}>
        {sections.map((section, si) => {
          const items = visibleItems.filter(i => i.section === section);
          return (
            <div key={section} className={si > 0 ? (isCollapsed ? "mt-3 pt-2 border-t border-white/[0.06]" : "mt-4") : ""}>
              {!isCollapsed && (
                <p className="text-[9px] font-bold uppercase tracking-[0.20em] px-3 mb-2"
                  style={{ color: "var(--sidebar-section-header)" }}
                >
                  {section}
                </p>
              )}
              {items.map(item => {
                const cleanPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
                const active = cleanPath === item.href || (
                  !["/rfq", "/customer/rfq", "/calling-agent/enquiries"].includes(item.href) &&
                  cleanPath.startsWith(item.href + "/")
                );

                return (
                  <Link key={item.href} href={item.href}
                    title={isCollapsed ? `${item.label}${item.href === "/rfq" && rfqUnread > 0 ? ` (${rfqUnread} unread)` : ""}${item.href === "/confirmed" && confirmedUnread > 0 ? ` (${confirmedUnread} unread)` : ""}` : undefined}
                    className={`relative flex items-center ${isCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"} rounded-xl text-sm font-medium transition-all duration-200 group mb-0.5`}
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

                    {!isCollapsed && <span className="flex-1 text-[13px] truncate">{item.label}</span>}

                    {/* Unread badges */}
                    {!isCollapsed && item.href === "/rfq" && rfqUnread > 0 && (
                      <span className="flex items-center justify-center text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] h-5 animate-pulse"
                        style={{ background: "rgba(244,63,94,0.15)", color: "#F43F5E", border: "1px solid rgba(244,63,94,0.30)" }}
                      >
                        {rfqUnread}
                      </span>
                    )}
                    {!isCollapsed && item.href === "/confirmed" && confirmedUnread > 0 && (
                      <span className="flex items-center justify-center text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] h-5 animate-pulse"
                        style={{ background: "rgba(244,63,94,0.15)", color: "#F43F5E", border: "1px solid rgba(244,63,94,0.30)" }}
                      >
                        {confirmedUnread}
                      </span>
                    )}

                    {/* Collapsed dot badge for unread */}
                    {isCollapsed && item.href === "/rfq" && rfqUnread > 0 && (
                      <span className="absolute top-1 right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                    )}
                    {isCollapsed && item.href === "/confirmed" && confirmedUnread > 0 && (
                      <span className="absolute top-1 right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                    )}

                    {/* Hover glow arrow */}
                    {!active && !isCollapsed && (
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
      <div className={`${isCollapsed ? "px-2" : "px-3"} pb-4 pt-3 flex-shrink-0`} style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        {/* User card */}
        {isCollapsed ? (
          <div className="flex justify-center mb-2" title={`${user?.username ?? "User"} (${user?.role?.replace("_", " ") ?? ""})`}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{
                background: "var(--sidebar-avatar-bg)",
                border: "1px solid var(--sidebar-avatar-border)",
                color: "var(--sidebar-avatar-text)",
              }}
            >
              {initial}
            </div>
          </div>
        ) : (
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
        )}

        {/* Theme toggle */}
        <button onClick={toggleTheme}
          title={isCollapsed ? (theme === "dark" ? "Light Mode" : "Dark Mode") : undefined}
          className={`w-full flex items-center ${isCollapsed ? "justify-center px-0 py-2" : "gap-2.5 px-3 py-2"} rounded-xl text-[13px] font-medium transition-all duration-200 mb-1 sidebar-action-btn`}
        >
          <span className="text-base w-5 text-center flex-shrink-0">{theme === "dark" ? "☀" : "🌙"}</span>
          {!isCollapsed && (theme === "dark" ? "Light Mode" : "Dark Mode")}
        </button>

        {/* Sign out */}
        <button onClick={logout}
          title={isCollapsed ? "Sign Out" : undefined}
          className={`w-full flex items-center ${isCollapsed ? "justify-center px-0 py-2" : "gap-2.5 px-3 py-2"} rounded-xl text-[13px] font-medium transition-all duration-200 sidebar-logout-btn`}
        >
          <span className="text-base w-5 text-center flex-shrink-0">⏻</span>
          {!isCollapsed && "Sign Out"}
        </button>
      </div>
    </aside>
  );
}
