"use client";
// components/layout/AppLayout.tsx
// ─────────────────────────────────────────────────────────────
//  Authenticated app shell — sidebar + main content area.
// ─────────────────────────────────────────────────────────────
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authStorage } from "@/lib/auth";
import Sidebar from "./Sidebar";

interface AppLayoutProps {
  children:  React.ReactNode;
  title?:    string;
  subtitle?: string;
  action?:   React.ReactNode;
}

export default function AppLayout({ children, title, subtitle, action }: AppLayoutProps) {
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authStorage.isAuthenticated()) {
      router.replace("/login");
    } else {
      const user = authStorage.getUser();
      if (user?.role === "sales") {
        if (pathname === "/dashboard" || pathname.startsWith("/contacts")) {
          router.replace("/rfq/new");
        }
      }
    }
  }, [router, pathname]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--surface)" }}>
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
        {/* Page header */}
        {title && (
          <header className="flex-shrink-0 flex items-center justify-between px-8 py-5 relative"
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
              <h1 className="text-xl font-bold leading-tight"
                style={{ color: "#EEF2FF", fontFamily: "'Outfit', sans-serif" }}
              >
                {title}
              </h1>
              {subtitle && (
                <p className="text-[13px] mt-0.5" style={{ color: "rgba(100,116,139,0.80)" }}>
                  {subtitle}
                </p>
              )}
            </div>

            {action && <div>{action}</div>}
          </header>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-8 bg-grid">
          {children}
        </div>
      </main>
    </div>
  );
}
