import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Freight Live Rates | Argus Shipping', robots: { index: false, follow: false } };
export default function Layout({ children }: {
    children: React.ReactNode;
}) { return children; }
