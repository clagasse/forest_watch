"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AuditedRegionalDataFile,
  BC_NATURAL_RESOURCE_REGIONS,
  EcologicalRiskCategory,
  FomProjectSummary,
  PUBLISHED_PROVINCIAL_BENCHMARKS,
  isFomOpenForComment,
  matchDistrictToRegionId,
} from "@/data/bcForestryData";
import { ExternalLink, MapPin, RefreshCw } from "lucide-react";
import InfoTooltip from "@/components/InfoTooltip";
import {
  loadFomProjectsShared,
  type RegionCatalogTotal,
} from "@/lib/fomClientCache";

type ViewMode = "bc-wide" | "regional";

function formatHa(ha: number): string {
  if (ha >= 1_000_000) {
    return `${(ha / 1_000_000).toFixed(2)}M ha`;
  }
  return `${Math.round(ha).toLocaleString()} ha`;
}

function formatShortDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

interface RegionalLiveSummary {
  regionId: string;
  regionName: string;
  shortName: string;
  districts: string[];
  ecosystemSummary: string;
  leadingSpecies: string;
  openFomCount: number;
  totalListedCount: number;
  openBlockCount: number;
  totalBlockCount: number;
  openPlannedHa: number;
  totalListedPlannedHa: number;
  areaReportedCount: number;
  soonestCloseDate: string | null;
  topHolders: Array<{ name: string; count: number }>;
  byCategory: Record<EcologicalRiskCategory, number>;
}

function emptyCategoryCounts(): Record<EcologicalRiskCategory, number> {
  return {
    very_high: 0,
    high: 0,
    moderate: 0,
    low: 0,
    unassessed: 0,
  };
}

export default function BroaderPerspectiveSection() {
  const [viewMode, setViewMode] = useState<ViewMode>("bc-wide");
  const [selectedRegionId, setSelectedRegionId] =
    useState<string>("west-coast");
  const [liveFoms, setLiveFoms] = useState<FomProjectSummary[] | null>(null);
  const [regionCatalogTotals, setRegionCatalogTotals] = useState<Record<
    string,
    RegionCatalogTotal
  > | null>(null);
  const [preassessedAt, setPreassessedAt] = useState<string | null>(null);
  const [fomError, setFomError] = useState<boolean>(false);
  const [auditedRegional, setAuditedRegional] =
    useState<AuditedRegionalDataFile | null>(null);

  const loadLiveProposals = useCallback(async () => {
    setFomError(false);
    try {
      const data = await loadFomProjectsShared({ scope: "default" });
      setLiveFoms(data.projects);
      if (data.regionCatalogTotals) {
        setRegionCatalogTotals(data.regionCatalogTotals);
      }
      if (data.preassessedAt) setPreassessedAt(data.preassessedAt);
    } catch {
      setFomError(true);
    }
  }, []);

  useEffect(() => {
    loadLiveProposals();

    const handleFomsUpdated = (event: Event) => {
      const custom = event as CustomEvent<{
        projects?: FomProjectSummary[];
        preassessedAt?: string | null;
      }>;
      if (custom.detail?.projects && Array.isArray(custom.detail.projects)) {
        setLiveFoms(custom.detail.projects);
        if (custom.detail.preassessedAt !== undefined) {
          setPreassessedAt(custom.detail.preassessedAt);
        }
      }
    };
    window.addEventListener("bc-forestry:foms-updated", handleFomsUpdated);

    let active = true;
    fetch("/data/regional_context_audited.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data || !Array.isArray(data.regions)) return;
        setAuditedRegional(data as AuditedRegionalDataFile);
      })
      .catch(() => {
        // Optional audited regional table not generated locally
      });

    return () => {
      active = false;
      window.removeEventListener("bc-forestry:foms-updated", handleFomsUpdated);
    };
  }, [loadLiveProposals]);

  const liveOpenFoms = useMemo(
    () => (liveFoms ? liveFoms.filter(isFomOpenForComment) : null),
    [liveFoms]
  );

  const provincialLiveStats = useMemo(() => {
    if (!liveOpenFoms) return null;
    const byCategory = emptyCategoryCounts();
    let totalHa = 0;
    let areaReportedCount = 0;
    for (const p of liveOpenFoms) {
      const cat = p.riskAssessment?.category || "unassessed";
      byCategory[cat] += 1;
      if (typeof p.totalPlannedHa === "number" && p.totalPlannedHa > 0) {
        totalHa += p.totalPlannedHa;
        areaReportedCount += 1;
      }
    }
    return {
      openCount: liveOpenFoms.length,
      totalListedCount: liveFoms?.length ?? liveOpenFoms.length,
      openPlannedHa: totalHa,
      areaReportedCount,
      byCategory,
    };
  }, [liveOpenFoms, liveFoms]);

  const regionalSummaries = useMemo(() => {
    const map = new Map<string, RegionalLiveSummary>();
    const holderCounts = new Map<string, Map<string, number>>();
    for (const reg of BC_NATURAL_RESOURCE_REGIONS) {
      map.set(reg.id, {
        regionId: reg.id,
        regionName: reg.name,
        shortName: reg.shortName,
        districts: reg.districts,
        ecosystemSummary: reg.ecosystemSummary,
        leadingSpecies: reg.leadingSpecies,
        openFomCount: 0,
        totalListedCount: 0,
        openBlockCount: 0,
        totalBlockCount: 0,
        openPlannedHa: 0,
        totalListedPlannedHa: 0,
        areaReportedCount: 0,
        soonestCloseDate: null,
        topHolders: [],
        byCategory: emptyCategoryCounts(),
      });
      holderCounts.set(reg.id, new Map());
    }

    let unassignedOpen = 0;
    let unassignedTotal = 0;
    const totals = {
      openFomCount: 0,
      totalListedCount: 0,
      openBlockCount: 0,
      totalBlockCount: 0,
      openPlannedHa: 0,
      totalPlannedHa: 0,
      veryHigh: 0,
      high: 0,
    };

    if (liveFoms) {
      for (const proj of liveFoms) {
        const regId =
          proj.regionId || matchDistrictToRegionId(proj.district) || null;
        const isOpen = isFomOpenForComment(proj);
        const cat = proj.riskAssessment?.category || "unassessed";
        const blocks = typeof proj.blockCount === "number" ? proj.blockCount : 0;
        const ha =
          typeof proj.totalPlannedHa === "number" && proj.totalPlannedHa > 0
            ? proj.totalPlannedHa
            : 0;

        totals.totalListedCount += 1;
        totals.totalBlockCount += blocks;
        totals.totalPlannedHa += ha;
        if (isOpen) {
          totals.openFomCount += 1;
          totals.openBlockCount += blocks;
          totals.openPlannedHa += ha;
          if (cat === "very_high") totals.veryHigh += 1;
          if (cat === "high") totals.high += 1;
        }

        if (!regId || !map.has(regId)) {
          unassignedTotal += 1;
          if (isOpen) unassignedOpen += 1;
          continue;
        }

        const entry = map.get(regId)!;
        entry.totalListedCount += 1;
        entry.totalBlockCount += blocks;
        entry.totalListedPlannedHa += ha;

        const holderName = proj.fspHolder?.trim();
        if (
          holderName &&
          holderName !== "Forest Stewardship Plan Holder"
        ) {
          const hMap = holderCounts.get(regId)!;
          hMap.set(holderName, (hMap.get(holderName) || 0) + 1);
        }

        if (isOpen) {
          entry.openFomCount += 1;
          entry.openBlockCount += blocks;
          entry.byCategory[cat] += 1;
          if (ha > 0) {
            entry.openPlannedHa += ha;
            entry.areaReportedCount += 1;
          }
          if (
            proj.commentCloseDate &&
            (!entry.soonestCloseDate ||
              proj.commentCloseDate < entry.soonestCloseDate)
          ) {
            entry.soonestCloseDate = proj.commentCloseDate;
          }
        }
      }

      for (const [regId, entry] of map.entries()) {
        const hMap = holderCounts.get(regId)!;
        entry.topHolders = Array.from(hMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, count]) => ({ name, count }));

        const fullRegTotals = regionCatalogTotals?.[regId];
        if (fullRegTotals) {
          entry.totalListedCount = Math.max(
            entry.totalListedCount,
            fullRegTotals.totalListedCount
          );
          entry.totalBlockCount = Math.max(
            entry.totalBlockCount,
            fullRegTotals.totalBlockCount
          );
          entry.totalListedPlannedHa = Math.max(
            entry.totalListedPlannedHa,
            fullRegTotals.totalPlannedHa
          );
        }

        // If a region has 0 open proposals right now, count sensitivity across its listed proposals
        if (entry.openFomCount === 0 && entry.totalListedCount > 0) {
          for (const proj of liveFoms) {
            const pRegId =
              proj.regionId || matchDistrictToRegionId(proj.district) || null;
            if (pRegId === regId) {
              const cat = proj.riskAssessment?.category || "unassessed";
              entry.byCategory[cat] += 1;
            }
          }
        }
      }

      if (regionCatalogTotals) {
        const fullListed = Object.values(regionCatalogTotals).reduce(
          (s, r) => s + r.totalListedCount,
          0
        );
        totals.totalListedCount = Math.max(totals.totalListedCount, fullListed);
      }
    }

    return {
      rows: Array.from(map.values()),
      unassignedOpen,
      unassignedTotal,
      totals,
    };
  }, [liveFoms, regionCatalogTotals]);

  const activeRegionLive = useMemo(
    () =>
      regionalSummaries.rows.find((r) => r.regionId === selectedRegionId) ||
      regionalSummaries.rows[0],
    [regionalSummaries, selectedRegionId]
  );

  const activeRegionAudited = useMemo(
    () =>
      auditedRegional?.regions.find((r) => r.regionId === selectedRegionId) ||
      null,
    [auditedRegional, selectedRegionId]
  );

  const handleZoomToRegionOnMap = (regionId: string) => {
    window.dispatchEvent(
      new CustomEvent("bc-forestry:jump-region", { detail: { regionId } })
    );
  };

  const tap = PUBLISHED_PROVINCIAL_BENCHMARKS.tap2021;
  const phd = PUBLISHED_PROVINCIAL_BENCHMARKS.priceHoltDaust2020;

  return (
    <section
      aria-labelledby="regional-context-heading"
      className="border-t border-[#DFD9CB] mt-10 pt-10 space-y-6"
    >
      {/* Section Header + Province-Wide vs. By Region Selector */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1D523B]">
            Provincial Context · Benchmarks &amp; Live Proposals
          </div>
          <h2
            id="regional-context-heading"
            className="font-serif text-xl sm:text-2xl font-semibold text-[#11241C] tracking-tight mt-1"
          >
            The Bigger Picture Across BC
          </h2>
          <p className="text-sm text-stone-600 mt-1 leading-relaxed">
            How BC&apos;s remaining old growth is divided between fertile
            big-tree forests and stunted alpine stands, alongside live public
            logging proposals across BC&apos;s 8 official forestry regions.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:inline-flex items-center bg-white border border-[#DDD7C9] p-1 rounded-xl shadow-[0_1px_3px_rgba(16,42,32,0.05)] w-full sm:w-auto">
          <button
            onClick={() => setViewMode("bc-wide")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-center ${
              viewMode === "bc-wide"
                ? "bg-[#143929] text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Province-Wide Overview
          </button>
          <button
            onClick={() => setViewMode("regional")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-center ${
              viewMode === "regional"
                ? "bg-[#143929] text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            By Region (8 Regions)
          </button>
        </div>
      </div>

      {fomError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2">
          <span>
            Live BC proposal feed is temporarily unavailable. Provincial
            published studies remain shown below.
          </span>
          <button
            type="button"
            onClick={loadLiveProposals}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-amber-300 font-medium hover:bg-amber-100/60"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {viewMode === "bc-wide" ? (
        <div className="space-y-5">
          {/* Row 1: 4 Plain-Language Provincial Benchmarks & Live Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white border border-[#DDD7C9] border-t-[3px] border-t-[#1B4332] rounded-xl p-4 shadow-[0_1px_3px_rgba(16,42,32,0.05)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F2EDE2] text-stone-700">
                    2021 Scientific Panel
                  </span>
                  <InfoTooltip
                    label="About Public Old-Growth Forests"
                    title="Public Crown Land Baseline"
                    content="Covers public Crown forest land (excluding private and federal lands). The 2021 Technical Advisory Panel refined this to 11.1M ha compared to 13.2M ha in the broader 2020 study."
                    href="/forest-metrics"
                  />
                </div>
                <div className="text-xs text-stone-500 mt-2">
                  Public Old-Growth Forests
                </div>
                <div className="text-2xl font-semibold text-[#11241C] mt-0.5 tabular-nums">
                  {formatHa(tap.totalCrownOldGrowthHa)}
                </div>
              </div>
              <div className="text-[11px] text-stone-600 mt-2 leading-snug">
                About {tap.alreadyProtectedPctOfRemaining}% of remaining public
                old growth (~{formatHa(tap.alreadyProtectedHa)}) is already in
                parks or protected areas.
              </div>
            </div>

            <div className="bg-white border border-[#DDD7C9] border-t-[3px] border-t-[#3B7A57] rounded-xl p-4 shadow-[0_1px_3px_rgba(16,42,32,0.05)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F2EDE2] text-stone-700">
                    2021 Scientific Panel
                  </span>
                  <InfoTooltip
                    label="About Recommended Temporary Deferrals"
                    title="Temporary Pause Recommendations"
                    content="Recommended temporary logging pauses pending First Nations land-use planning—different from permanent protection. Roughly half of the 2.6M ha lies inside areas open to commercial logging."
                    href="/forest-metrics"
                  />
                </div>
                <div className="text-xs text-stone-500 mt-2">
                  Recommended Temporary Deferrals
                </div>
                <div className="text-2xl font-semibold text-[#1D523B] mt-0.5 tabular-nums">
                  {formatHa(tap.tapRecommendedDeferralHa)}
                </div>
              </div>
              <div className="text-[11px] text-stone-600 mt-2 leading-snug">
                About {tap.tapRecommendedPctOfRemaining}% of remaining old
                growth recommended for a temporary logging pause (roughly half
                in areas open to logging).
              </div>
            </div>

            <div className="bg-white border border-[#DDD7C9] border-t-[3px] border-t-[#9C6621] rounded-xl p-4 shadow-[0_1px_3px_rgba(16,42,32,0.05)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F2EDE2] text-stone-700">
                    2020 Independent Study
                  </span>
                  <InfoTooltip
                    label="About Fertile, Big-Tree Old Growth"
                    title="Why Productivity Matters"
                    content="About 80% of BC's old growth grows on cold alpine or bog sites with small trees. Fertile big-tree sites (Site Index > 20 m) represent only ~3.1% (~415,000 ha) and were logged most heavily."
                    href="/forest-metrics"
                  />
                </div>
                <div className="text-xs text-stone-500 mt-2">
                  Fertile, Big-Tree Old Growth
                </div>
                <div className="text-2xl font-semibold text-[#7C4D12] mt-0.5 tabular-nums">
                  ~{phd.highProdTotalHa.toLocaleString()} ha
                </div>
              </div>
              <div className="text-[11px] text-stone-600 mt-2 leading-snug">
                Only ~{phd.highProdSi20to25Ha.toLocaleString()} ha of
                high-productivity stands and ~
                {phd.veryHighProdSiOver25Ha.toLocaleString()} ha of
                valley-bottom giants remain; ~{phd.lowProdSharePct}% of BC&apos;s
                old growth is small alpine or bog trees.
              </div>
            </div>

            <div className="bg-white border border-[#DDD7C9] border-t-[3px] border-t-[#1D5B79] rounded-xl p-4 shadow-[0_1px_3px_rgba(16,42,32,0.05)] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-50 text-sky-900 border border-sky-200">
                  Live BC Proposals
                </span>
                <div className="text-xs text-stone-500 mt-2">
                  Open for Public Comment
                </div>
                <div className="text-2xl font-semibold text-[#1D5B79] mt-0.5 tabular-nums">
                  {provincialLiveStats
                    ? `${provincialLiveStats.openCount} open`
                    : fomError
                    ? "Unavailable"
                    : "Loading..."}
                </div>
              </div>
              <div className="text-[11px] text-stone-600 mt-2 leading-snug">
                {provincialLiveStats
                  ? `${formatHa(provincialLiveStats.openPlannedHa)} mapped across ${provincialLiveStats.areaReportedCount} proposals (${provincialLiveStats.totalListedCount} total listed).`
                  : fomError
                  ? "Unable to reach live provincial proposal feed."
                  : "Checking live provincial logging proposals..."}
              </div>
            </div>
          </div>

          {/* Row 2: Plain-Language Context + Live Sensitivity Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 bg-white border border-[#DDD7C9] rounded-xl p-5 shadow-[0_1px_3px_rgba(16,42,32,0.05)] space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-serif text-sm font-semibold text-[#11241C]">
                    Why Forest Type and Protection Status Matter
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Key findings from Price, Holt &amp; Daust (2020) and BC&apos;s
                    Old Growth Technical Advisory Panel (2021)
                  </p>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F2EDE2] text-stone-700 shrink-0">
                  Published Studies
                </span>
              </div>

              <div className="divide-y divide-stone-100 text-xs">
                <div className="py-2.5 first:pt-0">
                  <div className="font-medium text-stone-900">
                    1. Not all old growth grows giant trees
                  </div>
                  <p className="text-stone-600 mt-0.5 leading-relaxed">
                    {phd.lowProdNote} {phd.caveatNote}
                  </p>
                </div>
                <div className="py-2.5">
                  <div className="font-medium text-stone-900">
                    2. Why two provincial totals exist (11.1M ha vs. 13.2M ha)
                  </div>
                  <p className="text-stone-600 mt-0.5 leading-relaxed">
                    The 2020 study analyzed ~13.2 million hectares from
                    BC&apos;s 2019 forest inventory. In 2021, the government&apos;s
                    scientific panel refined the count to 11.1 million hectares
                    on public Crown land (excluding private land and non-treed
                    areas).
                  </p>
                </div>
                <div className="py-2.5 last:pb-0">
                  <div className="font-medium text-stone-900">
                    3. Temporary deferrals vs. permanent protection
                  </div>
                  <p className="text-stone-600 mt-0.5 leading-relaxed">
                    {tap.permanenceNote} {tap.thlbNote}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-stone-500 border-t border-stone-100">
                <span>
                  Sources: BC Old Growth Panel (2021) &amp; Price et al. (2020)
                </span>
                <a
                  href={tap.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#143929] hover:underline font-medium"
                >
                  <span>Read 2021 Panel Summary (PDF)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-6 bg-white border border-[#DDD7C9] rounded-xl p-5 shadow-[0_1px_3px_rgba(16,42,32,0.05)] flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="inline-flex items-center gap-1.5">
                      <h3 className="font-serif text-sm font-semibold text-[#11241C]">
                        Open Logging Proposals by Sensitivity Level
                      </h3>
                      <InfoTooltip
                        label="About Live Sensitivity Breakdown"
                        title="Pre-Assessed vs. On-Click"
                        content="Open proposals are pre-assessed on a scheduled basis across up to 5 representative cutblocks against provincial forest, park, and wildlife habitat maps. Clicking any proposal in the Explorer also runs a full live check."
                        href="/forest-metrics#risk-methodology"
                      />
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Pre-assessed breakdown of proposals currently open for
                      public comment
                      {preassessedAt
                        ? ` · Updated ${formatShortDate(preassessedAt.slice(0, 10))}`
                        : ""}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-50 text-sky-900 border border-sky-200 shrink-0">
                    Pre-Assessed
                  </span>
                </div>

                {provincialLiveStats ? (
                  <div className="space-y-2.5 text-xs">
                    {(
                      [
                        {
                          key: "very_high",
                          label: "Very High Sensitivity",
                          color: "#be123c",
                        },
                        {
                          key: "high",
                          label: "High Sensitivity",
                          color: "#b45309",
                        },
                        {
                          key: "moderate",
                          label: "Moderate Sensitivity",
                          color: "#a16207",
                        },
                        {
                          key: "low",
                          label: "Lower Sensitivity",
                          color: "#15803d",
                        },
                        {
                          key: "unassessed",
                          label: "Unassessed (No public forest inventory)",
                          color: "#78716c",
                        },
                      ] as Array<{
                        key: EcologicalRiskCategory;
                        label: string;
                        color: string;
                      }>
                    ).map((row) => {
                      const count = provincialLiveStats.byCategory[row.key];
                      const pct =
                        provincialLiveStats.openCount > 0
                          ? Math.round(
                              (count / provincialLiveStats.openCount) * 100
                            )
                          : 0;
                      return (
                        <div key={row.key} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-stone-800">
                              {row.label}
                            </span>
                            <span className="text-stone-600 tabular-nums">
                              {count} proposals ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-[#FAF8F4] border border-stone-200/70 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: row.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-stone-500 py-8 text-center">
                    {fomError
                      ? "Live proposal sensitivity breakdown unavailable."
                      : "Loading live proposal sensitivity breakdown..."}
                  </div>
                )}
              </div>

              <div className="bg-[#F8F5EE] border border-[#E5DFD2] rounded-lg p-3 text-xs text-stone-700 leading-relaxed flex flex-wrap items-center justify-between gap-2">
                <span>
                  Want to see how open logging proposals are distributed across
                  BC&apos;s 8 forestry regions?
                </span>
                <button
                  onClick={() => setViewMode("regional")}
                  className="font-semibold text-[#143929] hover:underline shrink-0"
                >
                  View 8 Official Regions &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Regional Pill Selector */}
          <div className="flex overflow-x-auto sm:flex-wrap items-center gap-1.5 pb-1 -mx-1 px-1 no-scrollbar">
            {BC_NATURAL_RESOURCE_REGIONS.map((reg) => {
              const isSelected = selectedRegionId === reg.id;
              const liveRow = regionalSummaries.rows.find(
                (r) => r.regionId === reg.id
              );
              const count = liveRow?.openFomCount ?? 0;
              return (
                <button
                  key={reg.id}
                  onClick={() => setSelectedRegionId(reg.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0 ${
                    isSelected
                      ? "bg-[#143929] text-white border-[#143929]"
                      : "bg-white text-stone-700 border-[#DDD7C9] hover:text-stone-900 hover:bg-[#F8F5EE]"
                  }`}
                >
                  <span>{reg.shortName}</span>
                  {liveFoms && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-[#F2EDE2] text-stone-600"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Region Live Detail Card */}
          <div className="bg-white border border-[#DDD7C9] border-t-[3px] border-t-[#1B4332] rounded-xl p-5 shadow-[0_1px_3px_rgba(16,42,32,0.05)] space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-base font-semibold text-[#11241C]">
                  {activeRegionLive.regionName}
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  Forestry Districts: {activeRegionLive.districts.join(", ")} ·{" "}
                  {activeRegionLive.ecosystemSummary}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleZoomToRegionOnMap(activeRegionLive.regionId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8F5EE] hover:bg-[#EFEAE0] text-[#143929] border border-[#D8D1C2] text-xs font-medium transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Zoom to Region on Map</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#F8F5EE] border border-[#E5DFD2] rounded-lg p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                  Open for Comment
                </div>
                <div className="text-xl font-semibold text-[#1D5B79] mt-0.5 tabular-nums">
                  {liveFoms ? activeRegionLive.openFomCount : "—"}
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  {liveFoms
                    ? activeRegionLive.soonestCloseDate
                      ? `Next deadline ${formatShortDate(activeRegionLive.soonestCloseDate)}`
                      : `${activeRegionLive.totalListedCount} total listed`
                    : "Loading"}
                </div>
              </div>

              <div className="bg-[#F8F5EE] border border-[#E5DFD2] rounded-lg p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                  Proposed Cutblocks
                </div>
                <div className="text-xl font-semibold text-stone-900 mt-0.5 tabular-nums">
                  {liveFoms
                    ? (activeRegionLive.openFomCount > 0
                        ? activeRegionLive.openBlockCount
                        : activeRegionLive.totalBlockCount
                      ).toLocaleString()
                    : "—"}
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5 tabular-nums">
                  {liveFoms
                    ? activeRegionLive.openFomCount > 0
                      ? `Across ${activeRegionLive.openFomCount} open proposals`
                      : `${activeRegionLive.totalListedCount} active/recent proposals`
                    : "Loading"}
                </div>
              </div>

              <div className="bg-[#F8F5EE] border border-[#E5DFD2] rounded-lg p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                  Mapped Proposed Area
                </div>
                <div className="text-xl font-semibold text-stone-900 mt-0.5 tabular-nums">
                  {liveFoms
                    ? formatHa(
                        activeRegionLive.openPlannedHa > 0
                          ? activeRegionLive.openPlannedHa
                          : activeRegionLive.totalListedPlannedHa
                      )
                    : "—"}
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  {liveFoms
                    ? activeRegionLive.areaReportedCount > 0
                      ? `Across ${activeRegionLive.areaReportedCount} open proposals`
                      : "Across listed proposals"
                    : "Loading"}
                </div>
              </div>

              <div className="bg-[#F8F5EE] border border-[#E5DFD2] rounded-lg p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                  Very High / High Sensitivity
                </div>
                <div className="text-xl font-semibold text-rose-800 mt-0.5 tabular-nums">
                  {liveFoms
                    ? activeRegionLive.byCategory.very_high +
                      activeRegionLive.byCategory.high
                    : "—"}
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5 tabular-nums">
                  {liveFoms
                    ? `${activeRegionLive.byCategory.very_high} Very High · ${activeRegionLive.byCategory.high} High`
                    : "Loading"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-[#FAF8F4] border border-[#E5DFD2] rounded-lg p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                  Main Tree Species
                </span>
                <span className="text-stone-900 font-medium mt-0.5 block">
                  {activeRegionLive.leadingSpecies}
                </span>
              </div>
              <div className="bg-[#FAF8F4] border border-[#E5DFD2] rounded-lg p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                  Active Companies / Proponents
                </span>
                <span className="text-stone-900 font-medium mt-0.5 block">
                  {activeRegionLive.topHolders.length > 0
                    ? activeRegionLive.topHolders
                        .map((h) => `${h.name} (${h.count})`)
                        .join(" · ")
                    : liveFoms
                    ? "No active proposals currently listed in this region"
                    : "Loading..."}
                </span>
              </div>
            </div>

            {activeRegionAudited ? (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-950 space-y-1">
                <div className="font-semibold">
                  Audited Regional Old-Growth Summary (
                  {auditedRegional?.generatedAt.slice(0, 10)})
                </div>
                <div>
                  Total Old Growth:{" "}
                  <strong>{formatHa(activeRegionAudited.totalOldGrowthHa)}</strong>{" "}
                  · Permanently Protected (Parks + Protected Old-Growth Areas):{" "}
                  <strong>
                    {formatHa(
                      activeRegionAudited.permanentlyProtectedOldGrowthHa
                    )}{" "}
                    ({activeRegionAudited.permanentlyProtectedPct}%)
                  </strong>{" "}
                  · 2021 Recommended Deferrals:{" "}
                  <strong>
                    {formatHa(activeRegionAudited.tapRecommendedDeferralHa)}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="bg-[#F6F3EB] border border-[#E4DEC9] border-l-[3px] border-l-[#1D523B] rounded-lg p-3 text-xs text-stone-700 leading-relaxed">
                <strong>Why regional old-growth totals aren&apos;t listed here:</strong>{" "}
                Official provincial old-growth totals are published
                province-wide rather than by region. Rather than showing rough
                guesses, this table reports only verified live logging proposals
                and cutblock areas for each region.
              </div>
            )}
          </div>

          {/* 8-Region Live Comparison Table */}
          <div className="bg-white border border-[#DDD7C9] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(16,42,32,0.05)]">
            <div className="px-5 py-3.5 border-b border-[#E3DDD0] flex flex-wrap items-center justify-between gap-2 bg-[#F4F0E6]/75">
              <div>
                <h3 className="font-serif text-sm font-semibold text-[#11241C]">
                  Open &amp; Listed Logging Proposals Across BC&apos;s 8 Forestry Regions
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Click any region row to view its districts, active companies,
                  and sensitivity breakdown
                  {preassessedAt
                    ? ` · Pre-assessed ${formatShortDate(preassessedAt.slice(0, 10))}`
                    : ""}
                </p>
              </div>
              {regionalSummaries.unassignedTotal > 0 && (
                <span className="text-[11px] text-stone-500">
                  {regionalSummaries.unassignedOpen} open /{" "}
                  {regionalSummaries.unassignedTotal} total pending location
                  match
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#DDD7C9] text-stone-600 bg-[#F2EDE2] text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-2.5 sm:px-4 font-semibold">Forestry Region</th>
                    <th className="hidden md:table-cell py-2.5 px-3 font-semibold">
                      Local Districts
                    </th>
                    <th className="py-2.5 px-2 sm:px-3 font-semibold text-right">
                      Open / Total
                    </th>
                    <th className="py-2.5 px-2 sm:px-3 font-semibold text-right">
                      Blocks &amp; Area
                    </th>
                    <th className="py-2.5 px-2.5 sm:px-3 font-semibold text-right">
                      Very High / High
                    </th>
                    <th className="hidden md:table-cell py-2.5 px-4 font-semibold">Forest Types</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {regionalSummaries.rows.map((reg) => {
                    const isSelected = selectedRegionId === reg.regionId;
                    const displayHa =
                      reg.openPlannedHa > 0
                        ? reg.openPlannedHa
                        : reg.totalListedPlannedHa;
                    return (
                      <tr
                        key={reg.regionId}
                        onClick={() => setSelectedRegionId(reg.regionId)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#F3EFE4] text-stone-900"
                            : "hover:bg-[#F9F6EF] text-stone-700"
                        }`}
                      >
                        <td
                          className={`py-2.5 px-2.5 sm:px-4 font-medium text-stone-900 border-l-[3px] ${
                            isSelected
                              ? "border-l-[#1B4332]"
                              : "border-l-transparent"
                          }`}
                        >
                          {reg.shortName}
                        </td>
                        <td className="hidden md:table-cell py-2.5 px-3 text-stone-600">
                          {reg.districts.join(", ")}
                        </td>
                        <td className="py-2.5 px-2 sm:px-3 text-right font-medium tabular-nums">
                          {liveFoms ? (
                            <>
                              <span className="text-[#1D5B79]">
                                {reg.openFomCount}
                              </span>
                              <span className="text-stone-400">
                                {" "}
                                / {reg.totalListedCount}
                              </span>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2.5 px-2 sm:px-3 text-right tabular-nums">
                          {liveFoms ? (
                            <span>
                              {reg.openFomCount > 0
                                ? reg.openBlockCount
                                : reg.totalBlockCount}{" "}
                              blk · {formatHa(displayHa)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2.5 px-2.5 sm:px-3 text-right tabular-nums">
                          {liveFoms
                            ? `${reg.byCategory.very_high} / ${reg.byCategory.high}`
                            : "—"}
                        </td>
                        <td className="hidden md:table-cell py-2.5 px-4 text-stone-600">
                          {reg.ecosystemSummary}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Province-Wide Total Reconciliation Row */}
                  <tr className="border-t border-[#DDD7C9] bg-[#F4F0E6]/65 font-semibold text-stone-900">
                    <td className="py-2.5 px-2.5 sm:px-4 border-l-[3px] border-l-transparent">
                      British Columbia Total
                    </td>
                    <td className="hidden md:table-cell py-2.5 px-3 font-normal text-stone-600">
                      All 23 Forestry Districts
                    </td>
                    <td className="py-2.5 px-2 sm:px-3 text-right tabular-nums">
                      {liveFoms ? (
                        <>
                          <span className="text-[#1D5B79]">
                            {regionalSummaries.totals.openFomCount}
                          </span>
                          <span className="text-stone-500 font-normal">
                            {" "}
                            / {regionalSummaries.totals.totalListedCount}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 px-2 sm:px-3 text-right tabular-nums">
                      {liveFoms
                        ? `${(regionalSummaries.totals.openFomCount > 0
                            ? regionalSummaries.totals.openBlockCount
                            : regionalSummaries.totals.totalBlockCount
                          ).toLocaleString()} blk · ${formatHa(
                            regionalSummaries.totals.openFomCount > 0
                              ? regionalSummaries.totals.openPlannedHa
                              : regionalSummaries.totals.totalPlannedHa
                          )}`
                        : "—"}
                    </td>
                    <td className="py-2.5 px-2.5 sm:px-3 text-right tabular-nums">
                      {liveFoms
                        ? `${regionalSummaries.totals.veryHigh} / ${regionalSummaries.totals.high}`
                        : "—"}
                    </td>
                    <td className="hidden md:table-cell py-2.5 px-4 font-normal text-stone-600">
                      All BC forest ecosystems
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Quiet Source Footnote */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
        <span>
          Provincial figures from BC&apos;s Old Growth Technical Advisory Panel
          (2021) and Price, Holt &amp; Daust (2020); live proposal counts from
          Government of BC forestry records.
        </span>
        <Link
          href="/forest-metrics"
          className="text-[#143929] hover:underline font-medium shrink-0"
        >
          How old growth &amp; sensitivity are measured &rarr;
        </Link>
      </div>
    </section>
  );
}
