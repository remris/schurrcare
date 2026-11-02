import type { Metadata, Viewport } from "next";
import "./globals.css";
import SwRegister from "@/components/SwRegister";
import { Atkinson_Hyperlegible } from "next/font/google";

// Schrift, die speziell für gute Lesbarkeit (auch bei Sehschwäche) entwickelt wurde
const font = Atkinson_Hyperlegible({ subsets: ["latin", "latin-ext"], weight: ["400", "700"], variable: "--font-main", display: "swap" });

export const metadata: Metadata = {
  title: "Einkaufsliste",
  description: "Omas Einkaufsliste – übersetzt für die Pflegerin",
  appleWebApp: { capable: true, title: "Einkauf", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f5f2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={font.variable}>
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
