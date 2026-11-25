"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trees } from "lucide-react";

export default function SiteHeader() {
  const pathname = usePathname();
  const isExplorer = pathname === "/";
  const isMetrics = pathname === "/forest-metrics";
  const isAbout = pathname === "/about";

  return (
    <header className="sticky top-0 z-50 h-14 bg-[#102A20] text-[#F7F4EC] border-b border-[#224637] shadow-sm">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 hover:opacity-90 transition-opacity"
        >
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#1B4332] border border-[#2D624B] shadow-inner shrink-0">
            <Trees className="w-4 h-4 text-[#A7DFBF]" />
          </span>
          <span className="flex items-baseline gap-2.5">
            <span className="font-serif font-semibold tracking-tight text-base sm:text-[17px] text-[#F7F4EC]">
              BC Forestry Watch
            </span>
            <span className="hidden md:inline text-[11px] uppercase tracking-[0.12em] text-[#97B8A5] font-medium">
              British Columbia Forest Atlas
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-5 sm:gap-7 h-full text-xs sm:text-sm">
          <Link
            href="/"
            className={`h-full inline-flex items-center border-b-2 transition-colors ${
              isExplorer
                ? "text-white font-semibold border-[#D8B774]"
                : "text-[#CBE0D4] hover:text-white border-transparent"
            }`}
          >
            Explorer
          </Link>
          <Link
            href="/forest-metrics"
            className={`h-full inline-flex items-center border-b-2 transition-colors ${
              isMetrics
                ? "text-white font-semibold border-[#D8B774]"
                : "text-[#CBE0D4] hover:text-white border-transparent"
            }`}
          >
            Old Growth &amp; Metrics
          </Link>
          <Link
            href="/about"
            className={`h-full inline-flex items-center border-b-2 transition-colors ${
              isAbout
                ? "text-white font-semibold border-[#D8B774]"
                : "text-[#CBE0D4] hover:text-white border-transparent"
            }`}
          >
            About &amp; Help
          </Link>
        </nav>
      </div>
    </header>
  );
}
