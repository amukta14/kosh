import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans, Mukta } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/toaster";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"], display: "swap" });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });
const mukta = Mukta({ subsets: ["devanagari", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-mukta", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Kosh · Company A fees", template: "%s · Kosh" },
  description: "Fee ledger, parent portal and dues desk for Company A, Jaipur.",
};

export const viewport: Viewport = { themeColor: "#f5f1e8", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${instrument.variable} ${mukta.variable}`}>
      <body className="min-h-dvh">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
