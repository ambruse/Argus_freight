// app/layout.tsx
// ─────────────────────────────────────────────────────────────
//  Root layout — applies global styles, fonts, toast provider.
// ─────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import NotificationListener from "@/components/layout/NotificationListener";

export const metadata: Metadata = {
  title: "FreightOS — Cargo & RFQ Management",
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
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
        {children}
        <NotificationListener />
        {/* Global toast notifications */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1E1E1E",
              color: "#F0F0F0",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              fontSize: "14px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            },
            success: {
              iconTheme: { primary: "#10B981", secondary: "#F0F0F0" },
              duration: 2500,
            },
            error: {
              iconTheme: { primary: "#F43F5E", secondary: "#F0F0F0" },
              duration: 4000,
            },
          }}
        />
      </body>
    </html>
  );
}
