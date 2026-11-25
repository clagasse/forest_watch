import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#102A20",
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://bc-forestry-watch.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BC Forestry Watch — Proposed Logging & Standing Forest Explorer",
    template: "%s · BC Forestry Watch",
  },
  description:
    "Explore proposed, pending, active, and past logging in British Columbia alongside standing forest age, tree height, old-growth deferrals, protected areas, and 30-day public comment windows.",
  keywords: [
    "British Columbia forestry",
    "BC logging map",
    "Forest Operations Map",
    "old growth BC",
    "VRI forest inventory",
    "public comment logging BC",
  ],
  openGraph: {
    type: "website",
    locale: "en_CA",
    siteName: "BC Forestry Watch",
    title: "BC Forestry Watch — Proposed Logging & Standing Forest Explorer",
    description:
      "Interactive map of proposed logging and standing forest conditions across BC's 8 forestry regions, with pre-assessed sensitivity ratings and direct links to 30-day public comment portals.",
  },
  twitter: {
    card: "summary_large_image",
    title: "BC Forestry Watch — Proposed Logging & Standing Forest Explorer",
    description:
      "Explore proposed BC logging alongside standing forest age, old-growth deferrals, and 30-day public comment deadlines.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-[#F7F4EC] text-[#1A201D] antialiased selection:bg-[#143929] selection:text-[#F7F4EC]">
        {children}
      </body>
    </html>
  );
}
