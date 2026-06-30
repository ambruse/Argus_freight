"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authStorage } from "@/lib/auth";
import Sidebar from "./Sidebar";
import OverdueFollowUpOverlay from "./OverdueFollowUpOverlay";
import Link from "next/link";
import { 
  LayoutDashboard, PlusCircle, ClipboardList, Settings, Home, LogOut, MoreHorizontal,
  BarChart2, PhoneCall, FileText, BookOpen, UserPlus, CheckSquare, Phone 
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AppLayoutProps {
  children:  React.ReactNode;
  title?:    string;
  subtitle?: string;
  action?:   React.ReactNode;
}

export default function AppLayout({ children, title, subtitle, action }: AppLayoutProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [isOtherOpen, setIsOtherOpen] = useState(false);

  useEffect(() => {
    setUser(authStorage.getUser());
  }, []);

  useEffect(() => {
    if (!authStorage.isAuthenticated()) {
      router.replace("/login");
    } else {
      const currentUser = authStorage.getUser();
      if (currentUser?.role === "sales") {
        if (pathname.startsWith("/contacts")) {
          router.replace("/rfq/new");
        }
      }
    }
  }, [router, pathname]);

  // Base nav items based on role
  let roleItems: { href?: string; label: string; icon: any; onClick?: () => void }[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }
  ];

  let otherItems: { href?: string; label: string; icon: any; onClick?: () => void }[] = [];
  const showOtherTab = user?.role === "operator" || user?.role === "admin" || user?.role === "sales";

  if (user?.role === "customer") {
    roleItems = [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/customer/rfq/new", label: "Request", icon: PlusCircle },
      { href: "/customer/rfq", label: "History", icon: ClipboardList },
      { href: "/settings", label: "Settings", icon: Settings },
    ];
  } else if (user?.role === "calling_agent") {
    roleItems = [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/calling-agent/new", label: "New Call", icon: PlusCircle },
      { href: "/calling-agent/enquiries", label: "Enquiries", icon: ClipboardList },
      { href: "/settings", label: "Settings", icon: Settings },
    ];
  } else if (user?.role === "sales") {
    roleItems = [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/rfq/new", label: "New RFQ", icon: PlusCircle },
      { href: "/rfq", label: "Sent RFQs", icon: ClipboardList },
      { href: "/confirmed", label: "Confirmed", icon: CheckSquare },
    ];
    otherItems = [
      { href: "/summary", label: "Summary", icon: BarChart2 },
      { href: "/sales/call-enquiries", label: "Assigned Calls", icon: PhoneCall },
      { href: "/quotation", label: "Quotation", icon: FileText },
      { href: "/customers", label: "Customer Book", icon: BookOpen },
      { href: "/settings", label: "Settings", icon: Settings },
      { label: "Logout", icon: LogOut, onClick: logout }
    ];
  } else if (user?.role === "operator") {
    roleItems = [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/rfq/new", label: "New RFQ", icon: PlusCircle },
      { href: "/rfq", label: "Sent RFQs", icon: ClipboardList },
      { href: "/confirmed", label: "Confirmed", icon: CheckSquare },
    ];
    otherItems = [
      { href: "/summary", label: "Summary", icon: BarChart2 },
      { href: "/contacts", label: "Address Book", icon: BookOpen },
      { href: "/customers", label: "Customer Book", icon: BookOpen },
      { href: "/quotation", label: "Quotation", icon: FileText },
      { href: "/settings", label: "Settings", icon: Settings },
      { label: "Logout", icon: LogOut, onClick: logout }
    ];
  } else if (user?.role === "admin") {
    roleItems = [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/rfq/new", label: "New RFQ", icon: PlusCircle },
      { href: "/rfq", label: "Sent RFQs", icon: ClipboardList },
      { href: "/confirmed", label: "Confirmed", icon: CheckSquare },
    ];
    otherItems = [
      { href: "/summary", label: "Summary", icon: BarChart2 },
      { href: "/contacts", label: "Address Book", icon: BookOpen },
      { href: "/customers", label: "Customer Book", icon: BookOpen },
      { href: "/quotation", label: "Quotation", icon: FileText },
      { href: "/admin/call-enquiries", label: "All Calls", icon: Phone },
      { href: "/admin/register", label: "Register User", icon: UserPlus },
      { href: "/admin/quotations", label: "Approve Quotes", icon: CheckSquare },
      { href: "/settings", label: "Settings", icon: Settings },
      { label: "Logout", icon: LogOut, onClick: logout }
    ];
  }

  // Prepend Home and append Logout only for non-other-tab roles (customer, calling_agent)
  const navItems = [
    { href: "/", label: "Home", icon: Home },
    ...roleItems,
    ...(showOtherTab ? [{ label: "Other", icon: MoreHorizontal, onClick: () => setIsOtherOpen(!isOtherOpen) }] : []),
    ...(!showOtherTab ? [{ label: "Logout", icon: LogOut, onClick: logout }] : [])
  ];

  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ background: "var(--surface)" }}>
      {/* Conditionally hide sidebar on mobile screens for all logged-in roles */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <main 
        className="flex-1 flex flex-col h-[100dvh] overflow-hidden transition-all duration-300 ml-0 md:ml-64"
      >
        {/* Page header */}
        {title && (
          <header 
            className="flex-shrink-0 flex items-center justify-between px-4 py-4 md:px-8 md:py-5 relative pt-[calc(env(safe-area-inset-top)+14px)] md:pt-5"
            style={{
              background: "linear-gradient(180deg, rgba(12,18,32,0.95) 0%, rgba(8,12,20,0.80) 100%)",
              borderBottom: "1px solid rgba(245,176,55,0.08)",
              backdropFilter: "blur(24px)",
            }}
          >
            {/* Gold accent line */}
            <div className="absolute top-0 left-0 right-0 h-[1px]"
              style={{ background: "linear-gradient(90deg, transparent 0%, rgba(245,176,55,0.25) 30%, rgba(245,176,55,0.10) 70%, transparent 100%)" }}
            />

            <div>
              <h1 className="text-lg md:text-xl font-bold leading-tight"
                style={{ color: "#EEF2FF", fontFamily: "'Outfit', sans-serif" }}
              >
                {title}
              </h1>
              {subtitle && (
                <p className="text-[11px] md:text-[13px] mt-0.5" style={{ color: "rgba(100,116,139,0.80)" }}>
                  {subtitle}
                </p>
              )}
            </div>

            {action && <div className="flex-shrink-0">{action}</div>}
          </header>
        )}

        {/* Scrollable content */}
        <div 
          className="flex-1 overflow-y-auto bg-grid px-4 py-6 md:p-8 pb-[calc(env(safe-area-inset-bottom)+76px)] md:pb-8"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {children}
        </div>
      </main>

      {/* Backdrop overlay to close dropup menu */}
      {isOtherOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsOtherOpen(false)}
        />
      )}

      {/* Floating Dropup Menu for Operator, Sales, and Admin roles */}
      {isOtherOpen && otherItems.length > 0 && (
        <div 
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+76px)] left-4 right-4 max-w-lg mx-auto bg-[#0C1220]/95 border border-white/[0.08] backdrop-blur-xl rounded-2xl shadow-2xl p-4 z-40 animate-slide-up md:hidden flex flex-col gap-3"
          style={{
            boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.05)"
          }}
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 flex-shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5B037]">Other Pages</h3>
            <button 
              onClick={() => setIsOtherOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <div 
            className="grid grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {otherItems.map((item) => {
              const ItemIcon = item.icon;
              const isItemActive = item.href ? pathname === item.href : false;
              
              const itemContent = (
                <>
                  <ItemIcon size={16} className={isItemActive ? "text-[#F5B037]" : "text-slate-400"} />
                  <span className="text-xs font-medium truncate">{item.label}</span>
                </>
              );

              if (item.onClick) {
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      setIsOtherOpen(false);
                      item.onClick?.();
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04] text-slate-300 transition-all text-left"
                  >
                    {itemContent}
                  </button>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href || "#"}
                  onClick={() => setIsOtherOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                    isItemActive 
                      ? "bg-[#F5B037]/10 border-[#F5B037]/20 text-[#F5B037]" 
                      : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04] text-slate-300"
                  }`}
                >
                  {itemContent}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Bottom Navigation Dock for all roles on mobile */}
      {user && (
        <nav 
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+12px)] left-4 right-4 max-w-lg mx-auto bg-[#0C1220]/90 border border-white/[0.08] backdrop-blur-xl rounded-2xl shadow-2xl flex items-center justify-around px-3 py-1.5 md:hidden z-40 animate-slide-up"
          style={{
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.05)"
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            
            // Check active state
            let isActive = false;
            if (item.label === "Other") {
              isActive = otherItems.some((other) => other.href && pathname === other.href);
            } else if (item.href === "/customer/rfq" || item.href === "/rfq") {
              isActive = pathname === item.href;
            } else {
              isActive = !!item.href && (pathname === item.href || (item.href !== "/" && item.href !== "/dashboard" && pathname.startsWith(item.href + "/")));
            }

            const content = (
              <>
                <div 
                  className={`p-1 rounded-lg transition-colors ${
                    isActive ? "text-[#F5B037]" : "text-slate-400"
                  }`}
                >
                  <Icon size={18} />
                </div>
                <span 
                  className={`text-[8px] font-medium tracking-wide transition-colors ${
                    isActive ? "text-[#F5B037] font-bold" : "text-slate-500"
                  }`}
                >
                  {item.label}
                </span>
              </>
            );

            if (item.onClick) {
              return (
                <button 
                  key={item.label}
                  onClick={item.onClick}
                  className="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-center transition-all duration-200"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link 
                key={item.href}
                href={item.href || "#"}
                className="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-center transition-all duration-200"
              >
                {content}
              </Link>
            );
          })}
        </nav>
      )}

      <OverdueFollowUpOverlay />
    </div>
  );
}
