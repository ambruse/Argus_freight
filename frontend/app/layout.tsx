// app/layout.tsx
// ─────────────────────────────────────────────────────────────
//  Root layout — applies global styles, fonts, toast provider.
// ─────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import NotificationListener from "@/components/layout/NotificationListener";
import ArgusNavbar from "@/components/layout/ArgusNavbar";

export const metadata: Metadata = {
  title: "ARGUS — Cargo & RFQ Management",
  description:
    "Enterprise-grade freight and RFQ management system for shipping operations. Track shipments, manage quotes, and handle cargo documentation.",
  keywords: ["freight", "RFQ", "cargo", "shipping", "logistics"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=Outfit:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                const theme = localStorage.getItem('theme') || 'dark';
                document.documentElement.className = theme;
              } catch (e) {}
            })()
          `
        }} />
      </head>
      <body className="bg-surface text-primary antialiased">
        <ArgusNavbar />
        {children}
        <NotificationListener />
        {/* Global toast notifications */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "rgba(12,18,32,0.95)",
              color: "#EEF2FF",
              border: "1px solid rgba(245,176,55,0.15)",
              borderRadius: "14px",
              fontSize: "13px",
              fontFamily: "'Inter', sans-serif",
              boxShadow: "0 8px 40px rgba(0,0,0,0.60), 0 0 0 1px rgba(245,176,55,0.06) inset",
              backdropFilter: "blur(16px)",
            },
            success: {
              iconTheme: { primary: "#10B981", secondary: "#EEF2FF" },
              duration: 2500,
            },
            error: {
              iconTheme: { primary: "#F43F5E", secondary: "#EEF2FF" },
              duration: 4000,
            },
          }}
        />
      </body>
    </html>
  );
}
