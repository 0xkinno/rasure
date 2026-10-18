import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/lib/wallet";
import { Nav } from "@/components/Nav";
import { WalletModal } from "@/components/WalletModal";
import { Footer } from "@/components/Footer";
import { GlowTracker } from "@/components/GlowTracker";

const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument" });
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Rasure: the dispatch board that forgets on schedule",
  description:
    "A ride board for survivor safe-transport volunteers that truly forgets: a phone taken tonight cannot read last night's pickups, even with the whole chain in hand.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0a2fb3" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrument.variable} ${geist.variable} ${geistMono.variable}`}>
      <body>
        <WalletProvider>
          <a href="#main" style={{ position: "absolute", left: -999 }} onFocus={(e) => (e.currentTarget.style.left = "8px")}>
            Skip to content
          </a>
          <Nav />
          <main id="main">{children}</main>
          <Footer />
          <WalletModal />
          <GlowTracker />
        </WalletProvider>
      </body>
    </html>
  );
}
