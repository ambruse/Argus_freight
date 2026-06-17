"use client";
// components/layout/AppLayout.tsx
// ─────────────────────────────────────────────────────────────
//  Authenticated app shell — sidebar + main content area.
//  Guards routes: redirects to /login if not authenticated.
// ─────────────────────────────────────────────────────────────
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/lib/auth";
import Sidebar from "./Sidebar";

interface AppLayoutProps {
  children:    React.ReactNode;
  title?:      string;
  subtitle?:   string;
  action?:     React.ReactNode;
}

export default function AppLayout({ children, title, subtitle, action }: AppLayoutProps) {
  const router = useRouter();

  // Route guard — client-side check
  useEffect(() => {
    if (!authStorage.isAuthenticated()) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
        {/* Page header */}
        {title && (
          <header className="flex-shrink-0 flex items-center justify-between px-8 py-5 border-b border-white/[0.06] bg-surface-1/80 backdrop-blur-glass">
            <div>
              <h1 className="text-xl font-bold text-primary">{title}</h1>
              {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
            </div>
            {action && <div>{action}</div>}
          </header>
        )}

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-8 bg-grid">
          {children}
        </div>
      </main>
    </div>
  );
}
