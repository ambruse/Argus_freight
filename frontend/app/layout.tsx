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
  keywords: [
    "Argus Shipping", "ARGUS shipping", "Argus", "AR", "air freight services", 
    "international air cargo", "express air freight", "air freight forwarder", 
    "expedited air shipping", "ocean freight forwarding", "sea cargo services", 
    "international sea freight", "maritime shipping company", "FCL shipping", 
    "full container load logistics", "FCL freight rates", "FCL export services", 
    "FCL ocean transport", "LCL shipping", "less than container load", 
    "LCL consolidation", "groupage shipping", "LCL cargo forwarding", 
    "shipping from China", "China freight forwarder", "sea freight China to worldwide", 
    "import from China logistics", "Turkey logistics", "shipping to Turkey", 
    "Turkey air freight", "export shipping Turkey", "Istanbul freight forwarder", 
    "Saudi Arabia shipping", "freight forwarding to Saudi", "customs clearance Saudi", 
    "Jeddah cargo shipping", "Qatar freight forwarder", "shipping to Doha", 
    "Qatar logistics company", "import services Qatar", "Indonesia shipping", 
    "Jakarta freight forwarder", "export logistics Indonesia", "sea freight to Indonesia", 
    "Philippines freight forwarding", "sea cargo Manila", "shipping to Philippines", 
    "import logistics Philippines", "global shipping company", "worldwide freight forwarder", 
    "international cargo transport", "global supply chain logistics", "general cargo shipping", 
    "commercial goods freight", "consumer goods logistics", "B2B commodity shipping", 
    "hazardous materials shipping", "temperature-controlled freight", "oversized cargo transport", 
    "heavy lift shipping", "automotive logistics", "electronics freight forwarding", 
    "textile shipping", "industrial equipment transport", "door-to-door shipping", 
    "port-to-port freight", "warehousing and distribution", "supply chain management", 
    "customs brokerage services", "import clearance", "export documentation", 
    "tariff classification", "DDP shipping services", "EXW freight forwarding", 
    "FOB shipping rates", "CIF cargo transport", "Logistics Doha Qatar", 
    "Land Freight", "Relocation Services", "3PL Logistics", "Vehicle Logistics"
  ],
  openGraph: {
    type: "website",
    url: "https://argus-freight.onrender.com/",
    title: "ARGUS — Cargo & RFQ Management",
    description: "Enterprise-grade freight and RFQ management system for shipping operations. Track shipments, manage quotes, and handle cargo documentation.",
    images: [{ url: "https://argus-freight.onrender.com/logo.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ARGUS — Cargo & RFQ Management",
    description: "Enterprise-grade freight and RFQ management system for shipping operations. Track shipments, manage quotes, and handle cargo documentation.",
    images: ["https://argus-freight.onrender.com/logo.png"],
  }
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" type="image/png" href="/images/AR.png" />
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
