import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { ArrowLeft, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Old Growth & Forest Metrics",
  description:
    "How BC old growth is defined by ecosystem, how soil productivity and tree height work, and the Tier-1 screening methodology (v2.1) with scientific citations.",
};

const OFFICIAL_REFERENCES = [
  {
    title: "A New Future for Old Forests (2020 Old Growth Strategic Review — PDF)",
    url: "https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/forestry/stewardship/old-growth-forests/strategic-review-20200430.pdf",
    description:
      "Independent strategic review by Al Gorley and Garry Merkel setting out 14 recommendations for reforming how BC manages old-growth ecosystems.",
  },
  {
    title:
      "2021 Scientific Panel Summary — Priority Deferrals: An Ecological Approach (PDF)",
    url: "https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/forestry/stewardship/old-growth-forests/summary_for_g2g_package.pdf",
    description:
      "Summary of the Old Growth Technical Advisory Panel's approach to identifying 2.6 million hectares of at-risk old growth for priority logging pauses.",
  },
  {
    title:
      "2021 Scientific Panel Background & Technical Appendices — Mapping Methods (PDF)",
    url: "https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/forestry/stewardship/old-growth-forests/og_tap_background_and_technical_appendices.pdf",
    description:
      "Full technical methodology detailing how Ancient Forests, Rare Remnant Ecosystems, and Big-Treed Old Growth were mapped across BC.",
  },
  {
    title: "Province of BC — Old Growth Forests Policy & Implementation Portal",
    url: "https://www2.gov.bc.ca/gov/content/industry/forestry/managing-our-forest-resources/old-growth-forests",
    description:
      "Official BC Government portal tracking deferral implementation, policy updates, and First Nations land-use planning partnerships.",
  },
  {
    title: "BC Forest Inventory (Vegetation Resources Inventory) — Standards & Overview",
    url: "https://www2.gov.bc.ca/gov/content/industry/forestry/managing-our-forest-resources/forest-inventory/vegetation-resources-inventory",
    description:
      "How British Columbia collects, audits, and projects forest stand age, height, species mix, and growing productivity.",
  },
  {
    title: "BC Forest Inventory Composite Layer — BC Data Catalogue",
    url: "https://catalogue.data.gov.bc.ca/dataset/2ebb35d8-c82f-4a17-9c96-612ac3532d55",
    description:
      "Official BC Data Catalogue entry for the province-wide forest stand inventory dataset used in the Explorer.",
  },
  {
    title: "BC Ecosystem Zones (Biogeoclimatic Ecosystem Classification)",
    url: "https://www2.gov.bc.ca/gov/content/environment/plants-animals-ecosystems/ecosystems/biogeoclimatic-zones",
    description:
      "Overview of how BC classifies forests by regional climate, moisture, elevation, and plant communities.",
  },
  {
    title: "Old Growth Panel Spatial Datasets — BC Data Catalogue",
    url: "https://catalogue.data.gov.bc.ca/dataset?q=old+growth+technical+advisory+panel",
    description:
      "Public map layers for 2021 Priority Deferral Areas, Ancient Forests, Big-Treed Old Growth, and Remnant Old Ecosystems.",
  },
  {
    title: "BC Biodiversity Guidebook (1995) — Natural Disturbance Types",
    url: "https://www2.gov.bc.ca/gov/content/industry/forestry/managing-our-forest-resources/silviculture/silviculture-systems/biodiversity-guidebook",
    description:
      "Provincial biodiversity framework defining natural wildfire cycles (NDT1–NDT5) and ecosystem-specific old-growth age thresholds.",
  },
  {
    title: "Legally Protected Old-Growth Areas (Current) — BC Data Catalogue",
    url: "https://catalogue.data.gov.bc.ca/dataset/old-growth-management-areas-legal-current",
    description:
      "Active, legally established Old Growth Management Areas (excluding historical/retired boundaries).",
  },
  {
    title: "Wildlife Habitat Areas, Winter Ranges & Community Watersheds — BC Data Catalogue",
    url: "https://catalogue.data.gov.bc.ca/dataset?q=wildlife+habitat+areas+approved",
    description:
      "Legally established species-at-risk habitats, winter wildlife ranges, and licensed community drinking-water drainages.",
  },
  {
    title: "BC Wildfire Perimeters (Historical & Current) — BC Data Catalogue",
    url: "https://catalogue.data.gov.bc.ca/dataset?q=fire+perimeters+historical",
    description:
      "Official BC Wildfire Service burn boundary polygons used to check for fires after the last forest survey.",
  },
];

export default function ForestMetricsPage() {
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
            Methodology &amp; Scientific Guide
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#11241C] tracking-tight mt-1">
            Forest Metrics, Old Growth &amp; Methods
          </h1>
          <p className="text-sm text-stone-600 mt-2 leading-relaxed">
            How British Columbia measures standing forests, defines old growth
            across different climates, and maps areas with high conservation
            value—explained in plain language alongside the official technical
            standards.
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* 1. How Standing Forests Are Measured */}
        <section className="bg-white border border-[#DDD7C9] rounded-xl p-6 space-y-4 shadow-[0_1px_3px_rgba(16,42,32,0.04)]">
          <h2 className="font-serif text-lg font-semibold text-[#11241C]">
            1. How Standing Forests Are Measured
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Standing forest measurements in the Explorer come from British
            Columbia&apos;s official provincial forest survey (the{" "}
            <strong>Vegetation Resources Inventory</strong>). Forest analysts
            combine aerial photography, laser scanning (LiDAR), and ground
            sample plots to estimate tree age, height, species mix, and growing
            productivity across public forest stands.
          </p>
          <p className="text-xs text-stone-700 bg-[#F6F3EB] border border-[#E4DEC9] border-l-[3px] border-l-[#1D523B] rounded-lg p-3.5 leading-relaxed">
            <strong>Survey Limitations to Keep in Mind:</strong> Provincial
            forest inventory numbers are stand-level averages (typically ±15–20%
            accuracy) updated periodically. In very old forests, Site Index can
            underestimate true soil fertility compared to provincial
            soil-productivity maps (the <em>Provincial Site Productivity Layer</em>
            ). Because wildfires and logging can take 1–3 years to appear in the
            inventory, the Explorer automatically cross-checks{" "}
            <strong>BC Wildfire Perimeters</strong> and shows each
            stand&apos;s <strong>Forest Survey Year</strong>,{" "}
            <strong>Tree Cover (%)</strong>, and{" "}
            <strong>Main Tree Species</strong>. Private managed forest lands are
            generally excluded from public inventory coverage.
          </p>

          <div className="divide-y divide-stone-100 text-sm">
            <div className="py-3 first:pt-0">
              <div className="font-medium text-stone-900">Stand Age</div>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Estimated age in years of the main tree canopy, projected
                forward from the year the forest was last surveyed.
              </p>
            </div>
            <div className="py-3">
              <div className="font-medium text-stone-900">
                Canopy Height &amp; Tree Cover
              </div>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Projected height in meters of the tallest dominant trees, plus
                the percentage of ground shaded by tree crowns (crown closure).
              </p>
            </div>
            <div className="py-3">
              <div className="font-medium text-stone-900">
                Growing Productivity (Site Index)
              </div>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Expected height in meters of dominant trees at age 50. This
                reflects soil fertility, moisture, and climate rather than how
                old the trees are today:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5 text-[11px]">
                <div className="bg-[#FAF8F4] border border-stone-200/80 rounded-lg p-2">
                  <div className="font-semibold text-stone-800">&lt; 12 m</div>
                  <div className="text-stone-500">Slow-growing alpine / bog</div>
                </div>
                <div className="bg-[#FAF8F4] border border-stone-200/80 rounded-lg p-2">
                  <div className="font-semibold text-stone-800">12–20 m</div>
                  <div className="text-stone-500">Moderate mid-slope</div>
                </div>
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2">
                  <div className="font-semibold text-emerald-900">20–25 m</div>
                  <div className="text-emerald-800">Fertile lower slopes</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-2">
                  <div className="font-semibold text-emerald-950">&ge; 25 m</div>
                  <div className="text-emerald-900">Valley-bottom giants</div>
                </div>
              </div>
            </div>
            <div className="py-3">
              <div className="font-medium text-stone-900">
                Main Tree Species
              </div>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                The primary and secondary tree species recorded in the stand
                with their percentage share (for example, Western Redcedar 60%,
                Western Hemlock 35%).
              </p>
            </div>
            <div className="py-3 last:pb-0">
              <div className="font-medium text-stone-900">Forest Ecosystem</div>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                British Columbia&apos;s{" "}
                <strong>Biogeoclimatic Ecosystem Classification</strong> groups
                landscapes by climate, elevation, and moisture—for example,{" "}
                <em>Coastal Western Hemlock</em> (<code>CWH</code>) or{" "}
                <em>Interior Cedar–Hemlock</em> (<code>ICH</code>).
              </p>
            </div>
          </div>
        </section>

        {/* 2. How Old Growth Is Defined Across BC */}
        <section className="bg-white border border-[#DDD7C9] rounded-xl p-6 space-y-4 shadow-[0_1px_3px_rgba(16,42,32,0.04)]">
          <h2 className="font-serif text-lg font-semibold text-[#11241C]">
            2. How Old Growth Is Defined &amp; Measured in BC
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            In British Columbia, old growth is defined using ecosystem-specific
            age thresholds from the 1995 <em>Biodiversity Guidebook</em>, which
            reflects how often natural wildfires reset the forest (known
            technically as <em>Natural Disturbance Types, NDT1–NDT5</em>):
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-[#FAF8F4] border border-stone-200 rounded-lg p-4 space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Wet Coastal &amp; Wet Mountain Forests (NDT1 &amp; NDT2)
              </div>
              <div className="text-lg font-semibold text-stone-900">
                &ge; 250 years
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Applies to coastal rainforests and wet inland belts (
                <code>CWH</code>, <code>CDF</code>, <code>ICH</code>,{" "}
                <code>MH</code>) and wet subalpine spruce–fir forests (
                <code>ESSFwc</code>, <code>ESSFwk</code>, <code>ESSFvc</code>,{" "}
                <code>ESSFvv</code>) where stand-replacing wildfires are rare
                and trees commonly live 400 to 1,000+ years.
              </p>
            </div>

            <div className="bg-[#FAF8F4] border border-stone-200 rounded-lg p-4 space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Drier Interior &amp; Northern Forests (NDT3 &amp; NDT4)
              </div>
              <div className="text-lg font-semibold text-stone-900">
                &ge; 140 years
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Applies to drier interior and northern ecosystems (such as{" "}
                <code>SBS</code>, <code>SBPS</code>, <code>BWBS</code>,{" "}
                <code>MS</code>, drier <code>ESSF</code>, and{" "}
                <code>IDF</code>/<code>PP</code>). Note that dry pine and
                Douglas-fir forests shaped by frequent low-intensity ground
                fires (<code>NDT4</code>) often have uneven-aged trees where
                average stand age can understate older veteran trees.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <h3 className="text-sm font-semibold text-stone-900">
              Why Growing Productivity Matters Alongside Age (11.1M ha vs. 13.2M ha)
            </h3>
            <p className="text-sm text-stone-700 leading-relaxed">
              BC&apos;s 2021 scientific panel reported{" "}
              <strong>11.1 million hectares</strong> of old growth on public
              Crown forest land (excluding private land), while an earlier 2020
              independent study by Price, Holt &amp; Daust analyzed{" "}
              <strong>13.2 million hectares</strong> from the 2019 inventory
              before those public-land refinements. Roughly <strong>80%</strong>{" "}
              of BC&apos;s old growth grows on cold alpine slopes, bogs, or dry
              sites where trees stay relatively small. Fertile sites capable of
              growing giant trees (Site Index above 20 m) total roughly{" "}
              <strong>415,000 hectares</strong> (~3.1% of total old growth),
              including ~<strong>380,000 ha</strong> at 20–25 m and only ~
              <strong>35,000 ha</strong> above 25 m in valley bottoms.
              Protection rates also differ by permanence: the 2021 panel noted ~
              <strong>3.5 million ha</strong> (~32% of the remaining 11.1M ha)
              under existing protection, and recommended{" "}
              <strong>2.6 million ha</strong> for temporary logging pauses
              (roughly half in areas open to commercial logging).
            </p>
          </div>
        </section>

        {/* 3. The 2020 Review & 2021 Priority Deferrals */}
        <section className="bg-white border border-[#DDD7C9] rounded-xl p-6 space-y-4 shadow-[0_1px_3px_rgba(16,42,32,0.04)]">
          <h2 className="font-serif text-lg font-semibold text-[#11241C]">
            3. The 2020 Old Growth Review &amp; 2021 Deferral Mapping
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            In 2020, BC&apos;s independent{" "}
            <strong>Old Growth Strategic Review</strong> recommended pausing
            logging in ecosystems at highest risk of permanent biodiversity loss.
            In 2021, the province&apos;s{" "}
            <strong>Old Growth Technical Advisory Panel</strong> mapped{" "}
            <strong>2.6 million hectares</strong> of priority deferral areas
            across three overlapping categories:
          </p>

          <div className="space-y-2.5">
            <div className="bg-[#FAF8F4] border border-stone-200/80 rounded-lg p-3.5">
              <div className="text-sm font-semibold text-stone-900">
                1. Ancient Forests
              </div>
              <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                Extremely old forests (typically 400+ years on the coast and wet
                belt, or 250+ years in the interior) that have escaped
                stand-replacing wildfire for centuries.
              </p>
            </div>
            <div className="bg-[#FAF8F4] border border-stone-200/80 rounded-lg p-3.5">
              <div className="text-sm font-semibold text-stone-900">
                2. Rare Remnant Ecosystems
              </div>
              <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                Ecosystem variants where less than 10% of the historic old
                forest remains, placing local biodiversity at high risk of
                permanent loss.
              </p>
            </div>
            <div className="bg-[#FAF8F4] border border-stone-200/80 rounded-lg p-3.5">
              <div className="text-sm font-semibold text-stone-900">
                3. Big-Treed Old Growth
              </div>
              <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                Stands supporting the largest trees relative to their specific
                ecosystem, evaluated using Site Index and canopy height within
                each ecosystem variant.
              </p>
            </div>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed pt-1">
            <strong>Temporary Deferrals vs. Permanent Protection:</strong> A
            recommended deferral is a temporary pause on logging to allow
            land-use planning with First Nations—unlike permanent legal
            protection in BC Parks, ecological reserves, or legally established
            Old Growth Management Areas.
          </p>
        </section>

        {/* 4. Tier-1 Stand & Overlay Screening Index (Methods v2.1) */}
        <section
          id="risk-methodology"
          className="bg-white border border-[#DDD7C9] rounded-xl p-6 space-y-4 shadow-[0_1px_3px_rgba(16,42,32,0.04)] scroll-mt-20"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-lg font-semibold text-[#11241C]">
              4. Tier-1 Stand &amp; Overlay Screening Index (Methods v2.1)
            </h2>
            <span className="text-[11px] font-mono bg-[#F2EDE2] border border-[#DDD7C9] px-2 py-0.5 rounded text-stone-700">
              v2.1
            </span>
          </div>
          <p className="text-sm text-stone-700 leading-relaxed">
            To help the public prioritize which logging proposals to review
            first, BC Forestry Watch assigns each proposal a transparent{" "}
            <strong>Tier-1 Stand &amp; Overlay Screening Index</strong> using
            exact point-in-polygon checks against official provincial maps. It
            is designed for <em>public triage</em>—not as a full landscape
            cumulative-effects assessment.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#DDD7C9] text-stone-600 bg-[#F2EDE2] text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 font-semibold">Sensitivity Level</th>
                  <th className="py-2.5 px-3 font-semibold">
                    What Triggers This Rating (Any Match)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-rose-900 align-top whitespace-nowrap">
                    Very High Sensitivity
                  </td>
                  <td className="py-2.5 px-3 leading-relaxed">
                    Overlaps a{" "}
                    <strong>Legally Protected Old-Growth Area</strong>,{" "}
                    <strong>BC Park</strong>,{" "}
                    <strong>Protected Wildlife Habitat</strong>, or{" "}
                    <strong>2021 Recommended Old-Growth Deferral</strong>{" "}
                    (unless burned at moderate/high severity in a later
                    wildfire); targets{" "}
                    <strong>fertile, high-productivity old growth</strong> (Site
                    Index &ge; 20 m, or unusually high for its ecosystem);
                    targets <strong>ancient forest</strong> (&ge; 400 yrs
                    coastal/wet-belt or &ge; 250 yrs interior); or targets old
                    growth in a <strong>critically rare ecosystem</strong>{" "}
                    (Coastal Douglas-fir, &lt;1% historic old growth remaining).
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-amber-900 align-top whitespace-nowrap">
                    High Sensitivity
                  </td>
                  <td className="py-2.5 px-3 leading-relaxed">
                    Overlaps a{" "}
                    <strong>Protected Winter Wildlife Range</strong> or{" "}
                    <strong>Community Drinking-Water Watershed</strong>; targets{" "}
                    <strong>old growth in heavily depleted low-elevation subzones</strong>{" "}
                    (<code>CWHxm</code>, <code>CWHdm</code>, <code>ICHxw</code>,{" "}
                    <code>IDFxh</code>, <code>PPxh</code>) or mature forest in
                    critically rare <code>CDF</code>; targets{" "}
                    <strong>moderate-productivity old growth</strong> (Site
                    Index 12–20 m), <strong>tall old growth</strong> (&ge; 35 m),
                    or fast-growing wet-belt stands approaching old-growth age
                    (&ge; 120 yrs, Site Index &ge; 25 m).
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-yellow-900 align-top whitespace-nowrap">
                    Moderate Sensitivity
                  </td>
                  <td className="py-2.5 px-3 leading-relaxed">
                    Targets <strong>slow-growing old growth</strong> (Site Index
                    &lt; 12 m), <strong>mature forest</strong> (81+ yrs), or an
                    older forest with a{" "}
                    <strong>stand-replacing wildfire overlap</strong> that may
                    be post-fire salvage logging.
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-emerald-900 align-top whitespace-nowrap">
                    Lower Sensitivity
                  </td>
                  <td className="py-2.5 px-3 leading-relaxed">
                    Targets <strong>younger second-growth</strong> trees (&le;
                    80 yrs) with no mapped overlap with parks, protected old
                    growth, wildlife habitat, winter ranges, or drinking-water
                    watersheds.
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-stone-700 align-top whitespace-nowrap">
                    Unassessed
                  </td>
                  <td className="py-2.5 px-3 leading-relaxed">
                    No public provincial forest inventory or spatial coordinates
                    available to evaluate sensitivity.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Published Standards vs. Custom Screening Heuristics */}
          <div className="border border-[#E5DFD2] rounded-lg overflow-hidden">
            <div className="bg-[#F4F0E6] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-stone-700 border-b border-[#E5DFD2]">
              Published Thresholds vs. Tier-1 Triage Heuristics
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#E5DFD2] text-xs">
              <div className="p-3.5 space-y-1.5">
                <div className="font-semibold text-[#143929]">
                  Published BC &amp; Peer-Reviewed Thresholds
                </div>
                <ul className="list-disc pl-4 space-y-1 text-stone-600 leading-relaxed">
                  <li>
                    <strong>140 / 250 yr old-growth cutoffs:</strong> BC{" "}
                    <em>Biodiversity Guidebook</em> (1995) Natural Disturbance
                    Types.
                  </li>
                  <li>
                    <strong>250 / 400 yr ancient cutoffs &amp; &lt;10% remnant:</strong>{" "}
                    BC Old Growth TAP (2021).
                  </li>
                  <li>
                    <strong>Site Index &ge; 20 m &amp; &lt;30% risk benchmark:</strong>{" "}
                    Price, Holt &amp; Daust (2020, 2021); Price, Roburn &amp;
                    MacKinnon (2009).
                  </li>
                  <li>
                    <strong>Statutory overlays &amp; burn severity:</strong>{" "}
                    OGMAs, BC Parks, WHAs, UWRs, Community Watersheds, and{" "}
                    <code>VEG_BURN_SEVERITY_SP</code>.
                  </li>
                </ul>
              </div>
              <div className="p-3.5 space-y-1.5">
                <div className="font-semibold text-stone-800">
                  Custom Tier-1 Screening Heuristics
                </div>
                <ul className="list-disc pl-4 space-y-1 text-stone-600 leading-relaxed">
                  <li>
                    <strong>BEC-relative SI (14–16 m):</strong> Flags upper-end
                    productivity in drier or northern zones where SI &ge; 20 m
                    is rare.
                  </li>
                  <li>
                    <strong>SI 12–20 m &amp; Height &ge; 35 m:</strong>{" "}
                    Mid-productivity old growth and tall-canopy offset for
                    broken-top VRI bias.
                  </li>
                  <li>
                    <strong>Wet-belt mature (&ge; 120 yrs, SI &ge; 25 m):</strong>{" "}
                    Recruitment stands approaching old-growth status.
                  </li>
                  <li>
                    <strong>Mature cutoff (&ge; 81 yrs):</strong> Separates
                    maturing stands from younger second growth (&le; 80 yrs).
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-[#F6F3EB] border border-[#E4DEC9] border-l-[3px] border-l-[#1D523B] rounded-lg p-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-700">
              Key Assumptions &amp; Limitations
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-stone-600 leading-relaxed">
              <li>
                <strong>VRI Site Index Underestimation:</strong> Photo-interpreted
                VRI Site Index systematically underestimates true soil fertility
                in ancient, multi-layered, or broken-top stands compared to
                BC&apos;s Provincial Site Productivity Layer (TAP, 2021; Price
                et al., 2022).
              </li>
              <li>
                <strong>Harvest Method Not Distinguished:</strong> FOM
                boundaries do not consistently distinguish clearcutting from
                partial-retention silviculture or wildfire fuel-mitigation
                thinning.
              </li>
              <li>
                <strong>What Is Not Checked:</strong> Automated checks do{" "}
                <em>not</em> evaluate fish-bearing stream buffers, landslide
                risk, watershed cumulative clearcut totals (
                <em>Equivalent Clearcut Area</em> under BC&apos;s Aquatic
                Ecosystems Protocol), Indigenous cultural sites, or private
                forest land. <em>Lower Sensitivity</em> does not mean zero
                environmental impact.
              </li>
              <li>
                <strong>Burn-Severity-Aware Wildfire Guard:</strong> When a
                wildfire post-dates the forest survey, the Explorer checks{" "}
                <code>VEG_BURN_SEVERITY_SP</code>. Only{" "}
                <em>Medium/High</em> severity fires (or unmapped fires outside
                fire-maintained <code>NDT4</code> ecosystems) qualify intact
                old-growth triggers as burned; <em>Low</em>-severity surface
                fires retain intact forest age.
              </li>
              <li>
                <strong>Multi-Block Point Sampling:</strong> Selecting a
                proposal checks up to 5 representative cutblock interior points
                and reports the highest-sensitivity block. Edge overlaps on
                unsampled corners require clicking individual blocks or reviewing
                official FOM maps.
              </li>
            </ul>
          </div>
        </section>

        {/* 5. Why BC Forestry Planning Regions Are Used */}
        <section className="bg-white border border-[#DDD7C9] rounded-xl p-6 space-y-3 shadow-[0_1px_3px_rgba(16,42,32,0.04)]">
          <h2 className="font-serif text-lg font-semibold text-[#11241C]">
            5. Why BC&apos;s 8 Official Forestry Regions Are Used
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Regional summaries and map jumps on BC Forestry Watch follow the
            Government of British Columbia&apos;s{" "}
            <strong>8 official Natural Resource Regions</strong> (
            <em>West Coast</em>, <em>South Coast</em>,{" "}
            <em>Thompson–Okanagan</em>, <em>Kootenay–Boundary</em>,{" "}
            <em>Cariboo</em>, <em>Skeena</em>, <em>Omineca</em>, and{" "}
            <em>Northeast</em>) rather than informal local sub-regions.
          </p>
          <p className="text-xs text-stone-600 leading-relaxed">
            Within BC&apos;s forestry planning system, these 8 regions contain
            the province&apos;s <strong>23 local forestry districts</strong>{" "}
            (such as South Island, Selkirk, and Skeena Stikine) and{" "}
            <strong>37 Timber Supply Areas</strong> used to set sustainable
            harvest limits. You can turn all three boundary layers on or off
            under <em>Map Layers</em>.
          </p>
        </section>

        {/* 6. Official Reports, Technical Methods & References */}
        <section className="bg-white border border-[#DDD7C9] rounded-xl p-6 space-y-4 shadow-[0_1px_3px_rgba(16,42,32,0.04)]">
          <h2 className="font-serif text-lg font-semibold text-[#11241C]">
            6. Official Reports, Technical Methods &amp; References
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            Read the original Government of British Columbia reports, technical
            appendices, and inventory standards directly:
          </p>

          <ul className="divide-y divide-stone-100">
            {OFFICIAL_REFERENCES.map((ref) => (
              <li key={ref.url} className="py-3 first:pt-0 last:pb-0">
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 hover:underline"
                >
                  <span>{ref.title}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                  {ref.description}
                </p>
              </li>
            ))}
          </ul>

          <div className="border-t border-stone-200 pt-4 space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-600">
              Peer-Reviewed Scientific Literature &amp; Classification Frameworks
            </h3>
            <ul className="space-y-2 text-xs text-stone-600 leading-relaxed">
              <li>
                <strong>BC Biodiversity Guidebook (1995):</strong> BC Ministry
                of Forests &amp; BC Ministry of Environment, Lands and Parks.{" "}
                <em>Biodiversity Guidebook</em> (Forest Practices Code of BC).
                Defines Natural Disturbance Types (NDT1–NDT5) and 140/250-year
                old-seral age thresholds.
              </li>
              <li>
                <strong>Ecosystem-Based Management Risk Thresholds (2009):</strong>{" "}
                Price, K., Roburn, A., &amp; MacKinnon, A. (2009).
                Ecosystem-based management in the Great Bear Rainforest.{" "}
                <em>Forest Ecology and Management</em>, 258(4), 495–503.
                Establishes &lt;30% high-risk and 30–70% moderate-risk habitat
                retention benchmarks, grounded in landscape habitat-threshold
                theory (Andrén, 1994, <em>Oikos</em> 71:355–366; Fahrig, 2003,{" "}
                <em>Annu. Rev. Ecol. Evol. Syst.</em> 34:487–515).
              </li>
              <li>
                <strong>Productivity-Stratified Old Growth (2020, 2021):</strong>{" "}
                Price, K., Holt, R. F., &amp; Daust, D. (2020){" "}
                <em>BC&apos;s Old Growth Forest: A Last Stand for Biodiversity</em>
                ; and Price, K., Holt, R. F., &amp; Daust, D. (2021).
                Conflicting portrayals of remaining old growth: the British
                Columbia case. <em>Canadian Journal of Forest Research</em>,
                51(5), 742–752.{" "}
                <a
                  href="https://doi.org/10.1139/cjfr-2020-0453"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-800 hover:underline font-mono"
                >
                  doi:10.1139/cjfr-2020-0453
                </a>
              </li>
              <li>
                <strong>Big-Treed Indicators &amp; VRI SI Bias (2022):</strong>{" "}
                Price, K., Holt, R. F., &amp; Daust, K. (2022). Estimating the
                amount of British Columbia&apos;s &ldquo;big-treed&rdquo; old
                growth: Navigating messy indicators.{" "}
                <em>Frontiers in Forests and Global Change</em>, 5, 958719.{" "}
                <a
                  href="https://doi.org/10.3389/ffgc.2022.958719"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-800 hover:underline font-mono"
                >
                  doi:10.3389/ffgc.2022.958719
                </a>
              </li>
              <li>
                <strong>BC Cumulative Effects Framework (CEF):</strong>{" "}
                Government of British Columbia.{" "}
                <em>
                  Interim Assessment Protocol for Old Growth Forest in British
                  Columbia
                </em>{" "}
                (v1.1) and{" "}
                <em>Interim Assessment Protocol for Aquatic Ecosystems</em>{" "}
                (Equivalent Clearcut Area &amp; Low/Moderate/High watershed
                hazard ratings).
              </li>
              <li>
                <strong>Structural Complexity &amp; Multi-Aged Stands:</strong>{" "}
                Franklin, J. F., Spies, T. A., et al. (2002),{" "}
                <em>Forest Ecology and Management</em> 155:399–423; and Spies,
                T. A. (2004). Ecological concepts and diversity of old-growth
                forests. <em>Journal of Forestry</em>, 102(3), 14–20.{" "}
                <a
                  href="https://doi.org/10.1093/jof/102.3.14"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-800 hover:underline font-mono"
                >
                  doi:10.1093/jof/102.3.14
                </a>
              </li>
            </ul>
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
