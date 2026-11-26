import React from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import ForestryMapExplorer from "@/components/ForestryMapExplorer";
import BroaderPerspectiveSection from "@/components/BroaderPerspectiveSection";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F4EC] text-[#1A201D]">
      <SiteHeader />

      {/* Topographic Editorial Intro Banner */}
      <div className="topo-banner border-b border-[#E2DCCE]">
        <div className="max-w-[1440px] w-full mx-auto px-3 sm:px-6 py-3.5 sm:py-6 flex flex-col lg:flex-row lg:items-end justify-between gap-2.5 sm:gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1D523B]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#276E4F]" />
              <span>Live Provincial Forestry Atlas · British Columbia</span>
            </div>
            <h1 className="font-serif text-xl sm:text-[2rem] font-semibold text-[#11241C] tracking-tight mt-1 leading-tight">
              BC Logging &amp; Standing Forest Explorer
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 sm:mt-1.5 max-w-3xl leading-relaxed">
              Explore proposed, pending, active, and past logging across British
              Columbia alongside standing forest age, tree height, and protected
              areas. Click anywhere on the map or pick an open proposal to
              review.
            </p>
          </div>
          <div className="hidden sm:block text-[11px] text-stone-600 bg-white/75 backdrop-blur-sm border border-[#DDD7C9] rounded-lg px-3 py-1.5 self-start lg:self-auto shrink-0">
            Updated live from BC Government records · 8 Official Forestry
            Regions
          </div>
        </div>
      </div>

      {/* Main 3-Pane Explorer + Provincial Context */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 pt-3.5 sm:pt-5 pb-8 sm:pb-10">
        <ForestryMapExplorer />
        <BroaderPerspectiveSection />
      </main>

      {/* Archival Cream Footer */}
      <footer className="border-t border-[#DFD9CB] bg-[#F2EEE4] py-5 text-xs text-stone-600">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 space-y-2">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="font-serif font-semibold text-[#11241C]">
                BC Forestry Watch
              </span>
              <span className="text-stone-400">·</span>
              <span>
                Contains information licensed under the{" "}
                <a
                  href="https://www2.gov.bc.ca/gov/content/data/open-data/open-government-licence-bc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#143929] hover:underline font-medium"
                >
                  Open Government Licence – British Columbia
                </a>
              </span>
            </div>
            <div className="flex items-center gap-5 shrink-0">
              <Link
                href="/forest-metrics"
                className="text-[#143929] hover:text-[#1D523B] font-medium transition-colors"
              >
                Old Growth &amp; Metrics
              </Link>
              <a
                href="/api/feed.xml"
                className="text-[#143929] hover:text-[#1D523B] font-medium transition-colors"
              >
                RSS Feed
              </a>
              <Link
                href="/about#take-action"
                className="text-[#143929] hover:text-[#1D523B] font-medium transition-colors"
              >
                Take Action &amp; Help &rarr;
              </Link>
            </div>
          </div>
          <div className="text-[11px] text-stone-500 text-center sm:text-left">
            Independent public-interest tool — not affiliated with the Government
            of BC. Verify legal boundaries and comment deadlines on official
            provincial portals.
          </div>
        </div>
      </footer>
    </div>
  );
}
