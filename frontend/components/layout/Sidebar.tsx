"use client";
// components/layout/Sidebar.tsx
// ─────────────────────────────────────────────────────────────
//  Fixed left sidebar with navigation links and logout.
// ─────────────────────────────────────────────────────────────
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import api from "@/lib/api";

interface NavItem {
  href:  string;
  label: string;
  icon:  React.ReactNode;
}

const NavIcon = ({ children }: { children: React.ReactNode }) => (
  <span className="text-xl leading-none">{children}</span>
);

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard",    icon: <NavIcon>⬡</NavIcon> },
  { href: "/rfq/new",   label: "New RFQ",      icon: <NavIcon>＋</NavIcon> },
  { href: "/rfq",       label: "Sent RFQs",    icon: <NavIcon>◈</NavIcon> },
  { href: "/confirmed", label: "Confirmed",    icon: <NavIcon>◉</NavIcon> },
  { href: "/summary",   label: "Summary",      icon: <NavIcon>📊</NavIcon> },
  { href: "/contacts",  label: "Address Book", icon: <NavIcon>📖</NavIcon> },
  { href: "/settings",  label: "Settings",     icon: <NavIcon>⚙️</NavIcon> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [rfqUnread, setRfqUnread] = useState(0);
  const [confirmedUnread, setConfirmedUnread] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") as "dark" | "light") || "dark";
    setTheme(savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.className = newTheme;
  };

  useEffect(() => {
    const fetchUnreadCounts = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("freight_token") : null;
      if (!token) return;

      try {
        const { data } = await api.get("/dashboard/unread-replies");
        const unread = data.data || [];
        
        let rfq = 0;
        let confirmed = 0;
        
        unread.forEach((reply: any) => {
          const isConfirmed = [
            "Confirmed",
            "Files Pending",
            "Completed",
            "Return Pending",
          ].includes(reply.shipment_status);
          
          if (isConfirmed) {
            confirmed++;
          } else {
            rfq++;
          }
        });
        
        setRfqUnread(rfq);
        setConfirmedUnread(confirmed);
      } catch (err) {
        console.error("Failed to fetch unread replies for sidebar", err);
      }
    };

    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-40 border-r border-white/[0.06] bg-surface-1">
      {/* ── Logo ─────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3 px-6 py-6 border-b border-white/[0.06]">
        <img 
          src={theme === "light" ? "/light-logo.png" : "/logo.png"} 
          alt="ARGUS Shipping" 
          className="w-auto h-12 object-contain"
        />
        <div className="text-center">
          <p className="font-bold text-sm text-primary leading-tight">ARGUS Shipping</p>
          <p className="text-[10px] uppercase tracking-widest text-muted">Cargo Management</p>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] uppercase font-semibold tracking-widest text-muted px-3 mb-3">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/rfq" 
            ? pathname === "/rfq" 
            : pathname.startsWith(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 group relative
                ${active
                  ? "bg-blue/15 text-blue border border-blue/20"
                  : "text-muted hover:text-primary hover:bg-white/[0.04]"
                }`}
            >
              {/* Active indicator bar */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue rounded-r-full" />
              )}
              <span className={`transition-colors ${active ? "text-blue" : "text-muted group-hover:text-primary"}`}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.href === "/rfq" && rfqUnread > 0 && (
                <span className="flex items-center justify-center bg-rose text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] h-5 shadow-glow-rose animate-pulse">
                  {rfqUnread}
                </span>
              )}
              {item.href === "/confirmed" && confirmedUnread > 0 && (
                <span className="flex items-center justify-center bg-rose text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] h-5 shadow-glow-rose animate-pulse">
                  {confirmedUnread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── User / Logout ────────────────────────────────── */}
      <div className="px-3 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface-4 mb-2">
          <div className="w-7 h-7 rounded-lg bg-blue/20 border border-blue/30 flex items-center justify-center">
            <span className="text-xs font-bold text-blue">
              {user?.username?.[0]?.toUpperCase() ?? "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary truncate">{user?.username ?? "—"}</p>
            <p className="text-[10px] text-muted capitalize">{user?.role ?? "—"}</p>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted
                     hover:text-primary hover:bg-white/[0.04] transition-all duration-200 mb-1"
        >
          <span className="text-lg">{theme === "dark" ? "☀️" : "🌙"}</span>
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted
                     hover:text-rose hover:bg-rose/5 transition-all duration-200"
        >
          <span>⏻</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
