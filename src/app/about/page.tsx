import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { BCGW_LAYER_CATALOG } from "@/data/bcForestryData";
import { ExternalLink, ArrowLeft, Mail, Rss } from "lucide-react";

export const metadata: Metadata = {
  title: "About & Help",
  description:
    "How BC Forestry Watch works, how to submit a 30-day public comment on proposed logging, and official Government of BC data sources.",
};

export default function AboutPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "";
  const feedbackUrl = process.env.NEXT_PUBLIC_FEEDBACK_URL?.trim() || "";
  const hasFeedbackChannel = Boolean(contactEmail || feedbackUrl);

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

        {/* 1. What This Site Does & Why It Exists */}
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
            rating (Methods v2.1) and organized around BC&apos;s 8 official
            forestry regions.
          </p>
          <div className="bg-[#F6F3EB] border border-[#E4DEC9] border-l-[3px] border-l-[#1D523B] rounded-lg p-3.5 text-xs text-stone-700 leading-relaxed">
            <strong className="text-[#11241C]">Why this app exists:</strong> BC
            Forestry Watch was built independently by a concerned British
            Columbia citizen to make public forestry data accessible,
            understandable, and transparent—and to encourage constructive,
            evidence-based civic engagement in how BC&apos;s public forests are
            stewarded.
          </div>
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

        {/* 3. Ways to Have Your Say in BC Forestry */}
        <section
          id="take-action"
          className="bg-white border border-[#DDD7C9] rounded-xl p-6 space-y-5 shadow-[0_1px_3px_rgba(16,42,32,0.04)] scroll-mt-20"
        >
          <div>
            <h2 className="font-serif text-lg font-semibold text-[#11241C]">
              3. Ways to Have Your Say in BC Forestry
            </h2>
            <p className="text-sm text-stone-600 mt-1 leading-relaxed">
              Public input doesn&apos;t start or end with a 30-day cutblock
              window. Whether you want to comment on an active proposal, raise a
              pending permit with elected representatives, or shape long-term
              watershed planning, here are the official channels available to
              BC residents:
            </p>
          </div>

          {/* Avenue A: 30-Day FOM Public Comment */}
          <div className="bg-[#FAF8F4] border border-[#E5DFD2] rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#11241C]">
                A. Submit a 30-Day Public Comment (Forest Operations Map)
              </h3>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-50 text-sky-900 border border-sky-200">
                Before Permit Approval
              </span>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed">
              Under British Columbia&apos;s <em>Forest and Range Practices Act</em>,
              forestry companies and BC Timber Sales must post proposed cutblocks
              and logging roads for a 30-day public review before applying for a
              cutting permit.
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-xs text-stone-700">
              <li>
                Select an open proposal in the Explorer or click any blue
                proposed cutblock on the map.
              </li>
              <li>
                Click <strong>Copy Summary</strong> (and optionally{" "}
                <strong>Copy Share Link</strong>) in the right-hand panel to
                copy the block ID, coordinates, tree age, species, and
                designation overlaps.
              </li>
              <li>
                Click <strong>Open Official BC Comment Portal</strong> to submit
                your feedback before the deadline.
              </li>
            </ol>
            <div>
              <a
                href="https://fom.nrs.gov.bc.ca/public/projects"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#143929] hover:bg-[#1D523B] text-white text-xs font-semibold transition-colors"
              >
                <span>Open Official BC Comment Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Avenue B: Contact Your MLA & Minister of Forests */}
          <div className="bg-[#FAF8F4] border border-[#E5DFD2] rounded-lg p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#11241C]">
                B. Contact Your Local MLA &amp; the BC Minister of Forests
              </h3>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                Open Year-Round
              </span>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed">
              Once a proposal moves to <em>Pending Permit</em> or <em>Active</em>,
              the 30-day consultation window is closed—but elected officials
              still set policy, approve old-growth deferrals, and oversee the
              Ministry of Forests. In the Explorer, you can use{" "}
              <strong>Copy Share Link</strong> and{" "}
              <strong>Email Minister of Forests</strong> directly from any
              inspected cutblock or coordinate.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs pt-0.5">
              <a
                href="https://www.leg.bc.ca/members"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-stone-900 font-medium transition-colors"
              >
                <span>Find Your BC MLA</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="mailto:FOR.Minister@gov.bc.ca?subject=BC%20Forestry%20Stewardship%20Inquiry"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-stone-900 font-medium transition-colors"
              >
                <span>Email FOR.Minister@gov.bc.ca</span>
              </a>
              <span className="text-stone-500">
                Minister&apos;s Office: 250-387-6240
              </span>
            </div>
          </div>

          {/* Avenue C: Forest Practices Board */}
          <div className="bg-[#FAF8F4] border border-[#E5DFD2] rounded-lg p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#11241C]">
                C. File a Concern with the Forest Practices Board
              </h3>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                Independent Watchdog
              </span>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed">
              The Forest Practices Board is BC&apos;s independent public
              watchdog for forest and range practices on public Crown land. Any
              resident can submit a complaint about timber harvesting, logging
              roads, drinking-water impacts, wildlife protection, or whether
              operations comply with provincial forestry laws.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs pt-0.5">
              <a
                href="https://www.bcfpb.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-emerald-800 hover:underline font-medium"
              >
                <span>Forest Practices Board (bcfpb.ca)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-stone-500">
                Email: FPBoard@bcfpb.ca · Toll-free: 1-800-994-5899
              </span>
            </div>
          </div>

          {/* Avenue D: Forest Landscape Planning & govTogetherBC */}
          <div className="bg-[#FAF8F4] border border-[#E5DFD2] rounded-lg p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#11241C]">
                D. Join Long-Term Forest Landscape Planning &amp; Consultations
              </h3>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                Upstream Planning
              </span>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed">
              British Columbia is transitioning toward{" "}
              <strong>Forest Landscape Plans</strong> co-developed with First
              Nations to set long-term rules for old growth, biodiversity, and
              watersheds <em>before</em> individual cutblocks are proposed. Watch
              for regional public engagements in your area.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs pt-0.5">
              <a
                href="https://engage.gov.bc.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-emerald-800 hover:underline font-medium"
              >
                <span>govTogetherBC Public Engagements</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="mailto:forestlandscapeplanning@gov.bc.ca"
                className="text-emerald-800 hover:underline font-medium"
              >
                forestlandscapeplanning@gov.bc.ca
              </a>
            </div>
          </div>

          {/* Avenue E: Local Districts, Councils & Field Violations */}
          <div className="bg-[#FAF8F4] border border-[#E5DFD2] rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-semibold text-[#11241C]">
              E. Local Districts, Municipal Councils &amp; Field Reporting
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-stone-700 leading-relaxed">
              <li>
                <strong>Local Natural Resource District / FrontCounter BC:</strong>{" "}
                For operational questions or permit inquiries in your district,
                call <strong>1-877-855-3222</strong> or email{" "}
                <a
                  href="mailto:FrontCounterBC@gov.bc.ca"
                  className="text-emerald-800 hover:underline font-medium"
                >
                  FrontCounterBC@gov.bc.ca
                </a>
                .
              </li>
              <li>
                <strong>Municipal &amp; Regional District Councils:</strong> If a
                proposed cutblock overlaps a{" "}
                <em>Community Drinking-Water Watershed</em>, share the Evidence
                JSON or Share Link with your local water purveyor or regional
                district board.
              </li>
              <li>
                <strong>Report Active Violations (24/7):</strong> Suspected
                illegal logging, stream damage, or wildlife violations can be
                reported anytime via BC&apos;s{" "}
                <strong>Report All Poachers and Polluters (RAPP)</strong> line
                at <strong>1-877-952-7277</strong>.
              </li>
            </ul>
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

        {/* 7. Subscribe, Report a Data Issue & Feedback */}
        <section
          id="feedback"
          className="bg-white border border-[#DDD7C9] rounded-xl p-6 space-y-3 shadow-[0_1px_3px_rgba(16,42,32,0.04)] scroll-mt-20"
        >
          <h2 className="font-serif text-lg font-semibold text-[#11241C]">
            7. Subscribe, Report a Data Issue &amp; Feedback
          </h2>
          <div className="space-y-3 text-sm text-stone-700 leading-relaxed">
            <p>
              <strong>Subscribe via RSS:</strong> Watershed groups,
              journalists, and residents can follow newly opened 30-day logging
              proposals without creating an account or sharing an email address.
              Copy the feed link below and paste it into any free RSS reader
              (such as Feedly, NetNewsWire, Inoreader, or a Slack/Discord RSS
              integration):
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="/api/feed.xml"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8F4] border border-[#D8D1C2] text-emerald-900 hover:bg-[#F2EDE2] text-xs font-semibold transition-colors"
              >
                <Rss className="w-3.5 h-3.5" />
                <span>BC Forestry Watch RSS Feed (/api/feed.xml)</span>
              </a>
              <span className="text-xs text-stone-600">
                Optional filters:{" "}
                <code className="text-xs bg-[#F4F0E6] px-1.5 py-0.5 rounded">
                  /api/feed.xml?region=west-coast&amp;minRisk=high
                </code>
              </span>
            </div>

            {hasFeedbackChannel ? (
              <div className="pt-1 space-y-2.5">
                <p>
                  <strong>Report a Map Anomaly or Suggest a Feature:</strong>{" "}
                  Local foresters, biologists, and residents are encouraged to
                  flag data discrepancies, broken links, or feature ideas. When
                  reporting a site-specific issue, please include the{" "}
                  <strong>FOM Proposal ID</strong>, coordinates (or{" "}
                  <strong>Copy Share Link</strong>), or the{" "}
                  <strong>Evidence JSON</strong> downloaded from the Technical
                  Audit drawer.
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  {contactEmail && (
                    <a
                      href={`mailto:${contactEmail}?subject=${encodeURIComponent(
                        "BC Forestry Watch Feedback"
                      )}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#143929] hover:bg-[#1D523B] text-white text-xs font-semibold transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email {contactEmail}</span>
                    </a>
                  )}
                  {feedbackUrl && (
                    <a
                      href={feedbackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={
                        contactEmail
                          ? "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FAF8F4] hover:bg-[#F2EDE2] text-[#143929] border border-[#D8D1C2] text-xs font-semibold transition-colors"
                          : "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#143929] hover:bg-[#1D523B] text-white text-xs font-semibold transition-colors"
                      }
                    >
                      <span>Open Feedback / Issue Tracker</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-600 pt-1">
                <strong>Report a Data or Boundary Issue:</strong> A direct
                contact email or issue tracker has not been configured on this
                deployment yet. To verify official cutblock boundaries or submit
                formal feedback on an active proposal, visit the{" "}
                <a
                  href="https://fom.nrs.gov.bc.ca/public/projects"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-800 hover:underline font-medium"
                >
                  BC FOM Portal
                </a>
                ; to report suspected forestry compliance issues on public
                Crown land, contact the{" "}
                <a
                  href="https://www.bcfpb.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-800 hover:underline font-medium"
                >
                  Forest Practices Board
                </a>
                .
              </p>
            )}
          </div>
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
