import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { BCGW_LAYER_CATALOG } from "@/data/bcForestryData";
import { ExternalLink, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "About & Help",
  description:
    "How BC Forestry Watch works, how to submit a 30-day public comment on proposed logging, and official Government of BC data sources.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F4EC] text-[#1A201D]">
      <SiteHeader />

      <div className="topo-banner border-b border-[#E2DCCE]">
        <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-7">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1D523B] hover:text-[#11241C] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Map Explorer</span>
          </Link>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1D523B] mt-3">
            User Guide &amp; Data Sources
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#11241C] tracking-tight mt-1">
            About &amp; Help
          </h1>
          <p className="text-sm text-stone-600 mt-2 leading-relaxed">
            How to explore proposed and past logging in British Columbia,
            understand what kind of forest is standing there, and submit public
            comments.
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* 1. What This Site Does */}
        <section className="bg-white border border-[#DDD7C9] rounded-xl p-6 space-y-3 shadow-[0_1px_3px_rgba(16,42,32,0.04)]">
          <h2 className="font-serif text-lg font-semibold text-[#11241C]">
            1. What This Site Does
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            British Columbia&apos;s official Forest Operations Map shows{" "}
            <em>where</em> logging companies plan to cut, while the
            province&apos;s forest inventory describes{" "}
            <em>what kind of forest is standing there</em>—including tree age,
            tree height, species mix, and how fertile the soil is.
          </p>
          <p className="text-sm text-stone-700 leading-relaxed">
            BC Forestry Watch brings both public government records together on
            one map. Each proposed logging area is also given a clear{" "}
            <Link
              href="/forest-metrics#risk-methodology"
              className="text-emerald-800 hover:underline font-medium"
            >
              Old-Growth &amp; Habitat Sensitivity
            </Link>{" "}
            rating (Methods v2.0) and organized around BC&apos;s 8 official
            forestry regions.
          </p>
        </section>

        {/* 2. How to Use the Map */}
        <section className="bg-white border border-[#DDD7C9] rounded-xl p-6 space-y-3 shadow-[0_1px_3px_rgba(16,42,32,0.04)]">
          <h2 className="font-serif text-lg font-semibold text-[#11241C]">
            2. How to Use the Map
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-stone-700 leading-relaxed">
            <li>
              <strong>Browse &amp; sort open proposals:</strong> Use the left
              panel to search, filter by sensitivity (Very High, High, Moderate,
              Lower), or sort proposals currently open for 30-day public
              comment. Click any proposal to check its cutblocks and zoom
              directly to the area.
            </li>
            <li>
              <strong>Filter logging stages:</strong> Use the buttons in the top
              bar to turn <em>Proposed</em>, <em>Pending Permit</em>,{" "}
              <em>Active</em>, or <em>Completed</em> cutblocks on or off (with a
              year filter for past logging).
            </li>
            <li>
              <strong>Turn on forest &amp; protection layers:</strong> Click{" "}
              <em>Map Layers</em> in the top-right to overlay old-growth
              forests, fertile big-tree sites, tall canopies, protected wildlife
              habitat, drinking-water watersheds, recent wildfires, or BC parks.
              Detailed tree-stand layers appear once you zoom in closer.
            </li>
            <li>
              <strong>Click anywhere on the map:</strong> Click any cutblock or
              forested area in BC to inspect overlapping logging plans and
              standing forest details in the right-hand panel. Areas without
              public forest data are usually private land, water, or alpine
              rock and snow.
            </li>
          </ul>
        </section>

        {/* 3. Submitting a Public Comment */}
        <section className="bg-white border border-[#DDD7C9] rounded-xl p-6 space-y-4 shadow-[0_1px_3px_rgba(16,42,32,0.04)]">
          <h2 className="font-serif text-lg font-semibold text-[#11241C]">
            3. Submitting a Public Comment
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Under British Columbia forestry law (the{" "}
            <em>Forest and Range Practices Act</em>), forestry companies and BC
            Timber Sales must post proposed cutblocks and logging roads for a
            30-day public review period before applying for a cutting permit.
          </p>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-stone-700">
            <li>
              Select an open proposal in the left panel or click a blue proposed
              cutblock on the map.
            </li>
            <li>
              Click <strong>Copy Forest Summary</strong> in the right-hand panel
              to copy the coordinates, block ID, district, tree age, height,
              species, and ecosystem details to your clipboard.
            </li>
            <li>
              Click <strong>Open Official BC Comment Portal</strong> to paste
              those details into your public comment before the deadline.
            </li>
          </ol>
          <div>
            <a
              href="https://fom.nrs.gov.bc.ca/public/projects"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold transition-colors"
            >
              <span>Open Official BC Comment Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>

        {/* 4. Guide to Cutblock Stages & Forest Terms */}
        <section className="bg-white border border-[#DDD7C9] rounded-xl p-6 space-y-5 shadow-[0_1px_3px_rgba(16,42,32,0.04)]">
          <h2 className="font-serif text-lg font-semibold text-[#11241C]">
            4. Guide to Logging Stages &amp; Forest Terms
          </h2>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Logging Stages
            </h3>
            <div className="divide-y divide-stone-100 text-sm">
              <div className="py-2.5 first:pt-0">
                <div className="font-medium text-sky-900">Proposed</div>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                  Early-stage cutblocks posted on the BC Forest Operations Map
                  for 30-day public review before a logging permit is requested.
                </p>
              </div>
              <div className="py-2.5">
                <div className="font-medium text-amber-900">Pending Permit</div>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                  Cutblocks submitted for provincial cutting permit approval
                  that have not yet been authorized for logging.
                </p>
              </div>
              <div className="py-2.5">
                <div className="font-medium text-orange-900">Active</div>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                  Approved logging permits where harvesting operations may be
                  underway or scheduled.
                </p>
              </div>
              <div className="py-2.5 last:pb-0">
                <div className="font-medium text-rose-900">Completed</div>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                  Areas where logging has already been recorded in the
                  province&apos;s historical cutblock records.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-stone-200 pt-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Standing Forest Properties &amp; Protected Overlays
            </h3>
            <div className="divide-y divide-stone-100 text-sm">
              <div className="py-2.5 first:pt-0">
                <div className="font-medium text-stone-900">
                  Stand Age &amp; Old Growth
                </div>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                  Estimated age in years of the main tree canopy. In BC,
                  rainforests and wet subalpine forests are considered old
                  growth at <strong>250+ years</strong>, while drier interior
                  and northern forests are considered old growth at{" "}
                  <strong>140+ years</strong>.
                </p>
              </div>
              <div className="py-2.5">
                <div className="font-medium text-stone-900">Canopy Height</div>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                  Estimated height in meters of the tallest dominant trees in
                  the stand, along with tree cover percentage.
                </p>
              </div>
              <div className="py-2.5">
                <div className="font-medium text-stone-900">
                  Growing Productivity (Site Index)
                </div>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                  A measure of soil fertility and climate showing how tall
                  trees are expected to grow by age 50. Scores of 20 meters or
                  higher generally indicate fertile valley bottoms and lower
                  slopes rather than stunted alpine or bog forests.
                </p>
              </div>
              <div className="py-2.5">
                <div className="font-medium text-stone-900">
                  Main Tree Species
                </div>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                  The primary and secondary tree species recorded in the forest,
                  such as Western Redcedar, Yellow Cedar, Western Hemlock,
                  Douglas-fir, or Lodgepole Pine.
                </p>
              </div>
              <div className="py-2.5">
                <div className="font-medium text-stone-900">
                  Forest Ecosystem
                </div>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                  British Columbia&apos;s official ecosystem classification
                  describing local climate, moisture, and natural wildfire
                  cycles (for example, Coastal Western Hemlock or Interior
                  Cedar–Hemlock).
                </p>
              </div>
              <div className="py-2.5 last:pb-0">
                <div className="font-medium text-stone-900">
                  Protected &amp; Sensitive Overlays
                </div>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                  Shows whether a location overlaps{" "}
                  <strong>Legally Protected Old-Growth Areas</strong>,{" "}
                  <strong>BC Parks &amp; Protected Areas</strong>,{" "}
                  <strong>Protected Wildlife Habitat</strong>,{" "}
                  <strong>Winter Wildlife Ranges</strong>,{" "}
                  <strong>Community Drinking-Water Watersheds</strong>,{" "}
                  <strong>2021 Recommended Old-Growth Deferrals</strong>, or
                  recent <strong>BC Wildfire Areas</strong>. You can also open{" "}
                  <em>Technical Audit &amp; Official Government Record</em> in
                  the inspector to verify record IDs or download a JSON evidence
                  bundle.
                </p>
              </div>
            </div>
            <div className="pt-2">
              <Link
                href="/forest-metrics"
                className="text-xs font-medium text-emerald-800 hover:underline"
              >
                Read the full Forest Metrics, Old Growth &amp; Methods guide
                &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* 5. Official BC Government Data Sources */}
        <section className="bg-white border border-[#DDD7C9] rounded-xl p-6 space-y-4 shadow-[0_1px_3px_rgba(16,42,32,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-lg font-semibold text-[#11241C]">
              5. Official BC Government Data Sources
            </h2>
            <div className="flex items-center gap-4 text-xs font-medium">
              <a
                href="https://catalogue.data.gov.bc.ca/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-800 hover:underline"
              >
                <span>BC Data Catalogue</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://fom.nrs.gov.bc.ca/public/projects"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-800 hover:underline"
              >
                <span>BC Forest Operations Map</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <p className="text-sm text-stone-700 leading-relaxed">
            All map boundaries, comment deadlines, and forest measurements come
            directly from open Government of British Columbia records:
          </p>

          <ul className="divide-y divide-stone-100 text-xs">
            {BCGW_LAYER_CATALOG.map((item) => (
              <li key={item.layerId} className="py-3 first:pt-0 last:pb-0">
                <div className="font-medium text-stone-900 text-sm">
                  {item.name}
                </div>
                <p className="text-stone-600 mt-0.5 leading-relaxed">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>

          <details className="pt-2 border-t border-stone-100 text-xs text-stone-500">
            <summary className="cursor-pointer font-medium text-stone-600 hover:text-stone-900">
              Technical dataset identifiers (for researchers)
            </summary>
            <ul className="mt-2 space-y-1 font-mono text-[11px] text-stone-600">
              {BCGW_LAYER_CATALOG.map((item) => (
                <li key={item.layerId}>
                  {item.name}: {item.layerId}
                </li>
              ))}
            </ul>
          </details>
        </section>

        {/* 6. Data License & Independence */}
        <section className="bg-white border border-[#DDD7C9] rounded-xl p-6 space-y-2.5 shadow-[0_1px_3px_rgba(16,42,32,0.04)]">
          <h2 className="font-serif text-lg font-semibold text-[#11241C]">
            6. Data License &amp; Independence
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Contains information licensed under the{" "}
            <a
              href="https://www2.gov.bc.ca/gov/content/data/open-data/open-government-licence-bc"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-800 hover:underline font-medium inline-flex items-center gap-1"
            >
              <span>Open Government Licence – British Columbia</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            .
          </p>
          <p className="text-sm text-stone-600 leading-relaxed">
            BC Forestry Watch is an independent public-interest tool and is not
            affiliated with or endorsed by the Government of British Columbia.
            Always verify legal cutblock boundaries, parcel lines, and official
            comment deadlines on provincial portals before making decisions.
          </p>
        </section>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 hover:text-emerald-950 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Map Explorer</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
