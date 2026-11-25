"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  BC_REGION_BOOKMARKS,
  CompletedTimeframe,
  CUTBLOCK_STAGE_STYLE_MAP,
  CutblockStage,
  EcologicalRiskCategory,
  FomProjectSummary,
  ForestOverlayKey,
  InspectCutblockRecord,
  InspectResult,
  isFomOpenForComment,
  MapLayerStyleSpec,
  OVERLAY_STYLE_MAP,
} from "@/data/bcForestryData";
import { RISK_BADGE_STYLES, createUnassessedRisk } from "@/lib/riskAssessment";
import {
  Layers,
  ExternalLink,
  CheckSquare,
  Square,
  Copy,
  Check,
  RefreshCw,
  X,
  Crosshair,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Loader2,
  Download,
  AlertTriangle,
  Flame,
  HelpCircle,
  Link2,
} from "lucide-react";
import InfoTooltip from "@/components/InfoTooltip";

type BasemapId = "topo" | "satellite" | "osm";

interface LiveGeoJSONFile {
  filename: string;
  url: string;
  sizeBytes: number;
  updatedAt?: string;
}

const BASEMAPS: Record<
  BasemapId,
  { label: string; tiles: string[]; attribution: string }
> = {
  topo: {
    label: "Topo",
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    ],
    attribution:
      "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, NRCAN | Data: BC Geographic Warehouse (DataBC)",
  },
  satellite: {
    label: "Satellite",
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ],
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics | Data: BC Geographic Warehouse (DataBC)",
  },
  osm: {
    label: "Street",
    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    attribution:
      "&copy; OpenStreetMap contributors | Data: BC Geographic Warehouse (DataBC)",
  },
};

const FOREST_OVERLAY_OPTIONS: Array<{
  key: ForestOverlayKey;
  label: string;
  description: string;
  isVri: boolean;
}> = [
  {
    key: "vri_old_growth",
    label: "Old-Growth Forests (250+ yrs wet / 140+ yrs dry)",
    description:
      "Public forest stands meeting BC's ecosystem-specific old-growth age mark (250+ years in coastal/wet-belt and wet subalpine forests; 140+ years in drier interior/northern forests).",
    isVri: true,
  },
  {
    key: "vri_high_si",
    label: "Fertile Big-Tree Sites (High Productivity)",
    description:
      "Public forest stands with Site Index ≥ 20 m (expected tree height at age 50), indicating fertile valley bottoms and lower slopes capable of growing very large trees.",
    isVri: true,
  },
  {
    key: "vri_tall_canopy",
    label: "Tall Tree Canopies (35 m or taller)",
    description:
      "Public forest stands where the dominant upper tree canopy is estimated at 35 meters or taller.",
    isVri: true,
  },
  {
    key: "tap_deferrals",
    label: "Recommended Old-Growth Deferrals (2021 Panel)",
    description:
      "Areas mapped by BC's 2021 Old Growth Technical Advisory Panel for temporary logging pauses (ancient forests, rare remnant ecosystems, and big-treed old growth). Not permanent protection.",
    isVri: false,
  },
  {
    key: "ogma_legal",
    label: "Legally Protected Old-Growth Areas",
    description:
      "Currently active, legally established Old Growth Management Areas restricting commercial timber harvesting.",
    isVri: false,
  },
  {
    key: "bc_parks",
    label: "BC Parks & Protected Areas",
    description:
      "Provincial parks, conservancies, ecological reserves, and permanently protected areas across BC.",
    isVri: false,
  },
  {
    key: "wha_approved",
    label: "Protected Wildlife Habitat (Species at Risk)",
    description:
      "Legally established Wildlife Habitat Areas protecting critical habitat for species at risk such as Marbled Murrelet and Mountain Caribou.",
    isVri: false,
  },
  {
    key: "uwr_approved",
    label: "Protected Winter Wildlife Ranges",
    description:
      "Legally established winter habitat areas regulating forest cover for caribou, moose, deer, elk, and mountain goats.",
    isVri: false,
  },
  {
    key: "community_watersheds",
    label: "Community Drinking-Water Watersheds",
    description:
      "Drainage basins upstream of licensed community drinking-water intakes requiring special watershed management.",
    isVri: false,
  },
  {
    key: "wildfire_recent",
    label: "Recent Wildfire Areas (2017–Present)",
    description:
      "Official BC Wildfire Service burn boundaries from 2017 onward, useful for spotting areas that burned after their last forest survey.",
    isVri: false,
  },
];

const PLANNING_BOUNDARY_OPTIONS: Array<{
  key: ForestOverlayKey;
  label: string;
  description: string;
  isVri: boolean;
}> = [
  {
    key: "nr_regions",
    label: "Natural Resource Regions (8 Regions)",
    description:
      "The 8 official Ministry of Forests administrative regions across British Columbia.",
    isVri: false,
  },
  {
    key: "nr_districts",
    label: "Natural Resource Districts (23 Districts)",
    description:
      "The 23 local operational forestry districts nested inside BC's 8 regions.",
    isVri: false,
  },
  {
    key: "tsa_boundaries",
    label: "Timber Supply Areas",
    description:
      "Provincial forest management units used to set sustainable harvest limits and landscape plans.",
    isVri: false,
  },
];

const ALL_WMS_OVERLAY_OPTIONS = [
  ...FOREST_OVERLAY_OPTIONS,
  ...PLANNING_BOUNDARY_OPTIONS,
];

const WMS_CUTBLOCK_KEYS: Array<{
  stage: CutblockStage;
  wmsKey: string;
}> = [
  { stage: "completed", wmsKey: "completed_cutblocks" },
  { stage: "ften_active", wmsKey: "ften_active" },
  { stage: "ften_pending", wmsKey: "ften_pending" },
  { stage: "fom_proposed", wmsKey: "fom_proposed" },
];

function LayerSwatch({
  styleSpec,
  size = "sm",
}: {
  styleSpec: MapLayerStyleSpec;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "w-4 h-3.5" : "w-3.5 h-3";
  const isDashed =
    styleSpec.swatchPattern === "dashed" || Boolean(styleSpec.dashArray);
  const bg =
    styleSpec.outlineOnly || styleSpec.fillOpacity === 0
      ? "transparent"
      : styleSpec.fill;
  const fillAlpha =
    styleSpec.outlineOnly || styleSpec.fillOpacity === 0
      ? 0
      : Math.min(0.85, Math.max(0.35, styleSpec.fillOpacity + 0.2));

  return (
    <span
      aria-hidden="true"
      className={`inline-block ${dim} rounded-[3px] shrink-0`}
      style={{
        backgroundColor:
          bg === "transparent"
            ? "transparent"
            : `color-mix(in srgb, ${bg} ${Math.round(fillAlpha * 100)}%, transparent)`,
        borderWidth: styleSpec.outlineOnly ? "2px" : "1.5px",
        borderStyle: isDashed ? "dashed" : "solid",
        borderColor: styleSpec.stroke,
      }}
    />
  );
}

function getDaysRemaining(
  closeDate?: string,
  workflowState?: string
): {
  pillText: string;
  detailText: string;
  isOpen: boolean;
} {
  if (!closeDate) {
    const isOpenState = isFomOpenForComment({ workflowState });
    return {
      pillText: isOpenState ? "Open" : workflowState || "Listed",
      detailText: workflowState || "Check official portal",
      isOpen: isOpenState,
    };
  }
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const parsed = new Date(`${closeDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return {
      pillText: `Closes ${closeDate}`,
      detailText: `Closes ${closeDate}`,
      isOpen: true,
    };
  }
  const diffDays = Math.ceil(
    (parsed.getTime() - todayUtc) / (1000 * 60 * 60 * 24)
  );
  if (diffDays > 0) {
    return {
      pillText: `Open · ${diffDays}d left`,
      detailText: `${diffDays} day${diffDays === 1 ? "" : "s"} left to comment`,
      isOpen: true,
    };
  }
  if (diffDays === 0) {
    return {
      pillText: "Closes today",
      detailText: "Closes today",
      isOpen: true,
    };
  }
  return {
    pillText: "Closed",
    detailText: "Review window ended",
    isOpen: false,
  };
}

function formatShortDateRange(openDate?: string, closeDate?: string): string {
  const fmt = (iso?: string) => {
    if (!iso) return "N/A";
    const d = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  };
  return `${fmt(openDate)} – ${fmt(closeDate)}`;
}

function buildInspectSummary(
  inspect: InspectResult,
  activeCutblock: InspectCutblockRecord | null,
  activeFomProject: FomProjectSummary | null
): string {
  const lines: string[] = [
    "BC Forestry Watch — Technical Location & Audit Summary",
    "-------------------------------------------------------",
    `Coordinates: ${inspect.coordinates[1].toFixed(5)}°N, ${inspect.coordinates[0].toFixed(5)}°W (${inspect.matchType} match)`,
    `Queried (UTC): ${inspect.queryHealth?.queriedAt || new Date().toISOString()}`,
    `Methodology: ${inspect.riskAssessment?.methodologyVersion || "v2.0"}`,
  ];

  if (activeCutblock) {
    lines.push(`Cutblock / Proposal: ${activeCutblock.name} (${activeCutblock.id})`);
    lines.push(`Stage: ${activeCutblock.stageLabel}`);
    if (activeCutblock.licensee || activeFomProject?.fspHolder) {
      lines.push(
        `Licensee / Tenure: ${activeCutblock.licensee || activeFomProject?.fspHolder}`
      );
    }
    if (activeCutblock.district || activeFomProject?.district) {
      lines.push(
        `Natural Resource District: ${activeCutblock.district || activeFomProject?.district}`
      );
    }
    if (activeCutblock.areaHa !== undefined) {
      lines.push(`Area: ${activeCutblock.areaHa} ha`);
    }
    if (activeCutblock.commentOpenDate || activeCutblock.commentCloseDate) {
      lines.push(
        `Public Comment Window: ${activeCutblock.commentOpenDate || "N/A"} to ${activeCutblock.commentCloseDate || "N/A"}`
      );
    }
    if (activeCutblock.harvestYear) {
      lines.push(`Harvest Year: ${activeCutblock.harvestYear}`);
    }
    lines.push(`Cutblock Source: ${activeCutblock.sourceLayer}`);
  } else {
    lines.push("Cutblock / Proposal: None recorded at this coordinate");
  }

  lines.push("");
  const risk = inspect.riskAssessment || createUnassessedRisk();
  lines.push(
    `Old-Growth & Habitat Sensitivity (${risk.methodologyVersion || "v2.0"}): ${risk.label}${risk.isPartialAssessment ? " [PARTIAL ASSESSMENT]" : ""}`
  );
  for (const r of risk.reasons) {
    lines.push(`- ${r}`);
  }

  if (inspect.designations.recentWildfire) {
    const wf = inspect.designations.recentWildfire;
    lines.push("");
    lines.push(
      `Wildfire Overlap: ${wf.fireYear}${wf.fireNumber ? ` (Fire #${wf.fireNumber})` : ""} [${wf.source}]${wf.postDatesVri ? " — POST-DATES VRI BASELINE" : ""}`
    );
  }

  lines.push("");
  lines.push("Standing Forest Properties (VRI):");
  if (inspect.forest.hasInventory) {
    if (inspect.forest.vriFeatureId) {
      lines.push(`- VRI Feature ID: ${inspect.forest.vriFeatureId}`);
    }
    lines.push(
      `- Stand Age (PROJ_AGE_1): ${inspect.forest.standAgeYears ?? "N/A"} years (Old-Growth Threshold: ≥${inspect.forest.oldGrowthThresholdYears ?? "N/A"} yrs)`
    );
    lines.push(
      `- Canopy Height (PROJ_HEIGHT_1): ${inspect.forest.canopyHeightMeters ?? "N/A"} m`
    );
    lines.push(
      `- Site Index (SITE_INDEX): ${inspect.forest.siteIndexMeters ?? "N/A"} m @ 50 yrs`
    );
    lines.push(
      `- Species Composition: ${inspect.forest.speciesComposition || inspect.forest.dominantSpecies || "N/A"}`
    );
    if (inspect.forest.crownClosurePct !== null) {
      lines.push(`- Crown Closure: ${inspect.forest.crownClosurePct}%`);
    }
    lines.push(
      `- BEC / Disturbance Regime: ${inspect.forest.becZone || "N/A"}${inspect.forest.ndt ? ` (${inspect.forest.ndt})` : ""}`
    );
    if (inspect.forest.referenceYear || inspect.forest.projectedDate) {
      lines.push(
        `- Inventory Baseline: Ref. ${inspect.forest.referenceYear ?? "N/A"} · Projected ${inspect.forest.projectedDate ?? "N/A"}`
      );
    }
  } else {
    lines.push("- No Crown VRI forest inventory at this location");
  }

  const desigs: string[] = [];
  if (inspect.designations.legalOgma) {
    desigs.push(
      `Current Legal OGMA: ${inspect.designations.legalOgma}${inspect.designations.legalOgmaId ? ` (${inspect.designations.legalOgmaId})` : ""}`
    );
  }
  if (inspect.designations.protectedPark) {
    desigs.push(`BC Park / Protected Area: ${inspect.designations.protectedPark}`);
  }
  if (inspect.designations.wildlifeHabitatArea) {
    desigs.push(`Wildlife Habitat Area: ${inspect.designations.wildlifeHabitatArea}`);
  }
  if (inspect.designations.ungulateWinterRange) {
    desigs.push(`Ungulate Winter Range: ${inspect.designations.ungulateWinterRange}`);
  }
  if (inspect.designations.communityWatershed) {
    desigs.push(`Community Watershed: ${inspect.designations.communityWatershed}`);
  }
  if (inspect.designations.tapPriorityDeferral) {
    const subs =
      inspect.designations.tapSubcategories?.length > 0
        ? ` [${inspect.designations.tapSubcategories.join(", ")}]`
        : "";
    desigs.push(
      `TAP Recommended Deferral (2021): ${inspect.designations.tapPriorityDeferral}${subs}`
    );
  }
  if (desigs.length > 0) {
    lines.push("");
    lines.push(`Designations: ${desigs.join(" | ")}`);
  }

  if (inspect.queryHealth?.failedLayers?.length > 0) {
    lines.push("");
    lines.push(
      `Partial Query Notice: ${inspect.queryHealth.succeededLayers.length}/${inspect.queryHealth.totalLayers} DataBC layers responded; unavailable: ${inspect.queryHealth.failedLayers.join(", ")}.`
    );
  }

  return lines.join("\n");
}

function getStageBadgeStyle(stage: CutblockStage): string {
  switch (stage) {
    case "fom_proposed":
      return "text-sky-800";
    case "ften_pending":
      return "text-amber-800";
    case "ften_active":
      return "text-orange-800";
    case "completed":
      return "text-rose-800";
  }
}

export default function ForestryMapExplorer() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const layersPopoverRef = useRef<HTMLDivElement | null>(null);

  const [basemap, setBasemap] = useState<BasemapId>("topo");
  const [layersOpen, setLayersOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.82);
  const [selectedRegionId, setSelectedRegionId] = useState<string>("all-bc");
  const [mapZoom, setMapZoom] = useState<number>(5.3);

  // Cutblock Lifecycle Stage Checkboxes (Default: Proposed + Pending ON; Active + Completed OFF)
  const [stageVisibility, setStageVisibility] = useState<
    Record<CutblockStage, boolean>
  >({
    fom_proposed: true,
    ften_pending: true,
    ften_active: false,
    completed: false,
  });
  const [completedSince, setCompletedSince] =
    useState<CompletedTimeframe>("2020");

  // Stackable BC-wide VRI, Protected Area & Planning Boundary Overlays (all default OFF)
  const [forestOverlays, setForestOverlays] = useState<
    Record<ForestOverlayKey, boolean>
  >({
    vri_old_growth: false,
    vri_high_si: false,
    vri_tall_canopy: false,
    tap_deferrals: false,
    ogma_legal: false,
    bc_parks: false,
    wha_approved: false,
    uwr_approved: false,
    community_watersheds: false,
    wildfire_recent: false,
    nr_regions: false,
    nr_districts: false,
    tsa_boundaries: false,
  });

  // Live BC-wide FOM Projects Sidebar State
  const [fomProjects, setFomProjects] = useState<FomProjectSummary[]>([]);
  const [fomLoading, setFomLoading] = useState<boolean>(true);
  const [fomError, setFomError] = useState<string | null>(null);
  const [fomSource, setFomSource] = useState<string>("");
  const [preassessedAt, setPreassessedAt] = useState<string | null>(null);
  const [fomSearch, setFomSearch] = useState<string>("");
  const [fomOnlyOpen, setFomOnlyOpen] = useState<boolean>(true);
  const [fomSort, setFomSort] = useState<"risk" | "deadline">("risk");
  const [riskFilter, setRiskFilter] = useState<"ALL" | EcologicalRiskCategory>(
    "ALL"
  );
  const [selectedFomProject, setSelectedFomProject] =
    useState<FomProjectSummary | null>(null);

  // Live Click-to-Inspect State
  const [inspectLoading, setInspectLoading] = useState<boolean>(false);
  const [inspectResult, setInspectResult] = useState<InspectResult | null>(
    null
  );
  const [overlapIndex, setOverlapIndex] = useState<number>(0);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);
  const deepLinkAppliedRef = useRef<boolean>(false);

  // Optional Local GeoJSON files in public/data/ (ALL default OFF)
  const [liveFiles, setLiveFiles] = useState<LiveGeoJSONFile[]>([]);
  const [enabledLiveFiles, setEnabledLiveFiles] = useState<
    Record<string, boolean>
  >({});
  const [liveFeatureCounts, setLiveFeatureCounts] = useState<
    Record<string, number>
  >({});
  const [liveLayerBounds, setLiveLayerBounds] = useState<
    Record<string, [number, number, number, number]>
  >({});

  // Close popover on outside click
  useEffect(() => {
    if (!layersOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        layersPopoverRef.current &&
        !layersPopoverRef.current.contains(e.target as Node)
      ) {
        setLayersOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [layersOpen]);

  // Fetch live BC-wide FOM projects on mount (with static snapshot fallback for GitHub Pages)
  const fetchFomProjects = useCallback(async () => {
    setFomLoading(true);
    setFomError(null);
    try {
      let data: {
        projects?: FomProjectSummary[];
        source?: string;
        preassessedAt?: string;
        generatedAt?: string;
        fetchedAt?: string;
        error?: string;
      } | null = null;

      try {
        const resp = await fetch("/api/fom-projects", { cache: "no-store" });
        if (resp.ok) {
          const parsed = await resp.json();
          if (parsed && Array.isArray(parsed.projects) && !parsed.error) {
            data = parsed;
          }
        }
      } catch {
        // Fall through to static snapshot
      }

      if (!data) {
        const snapResp = await fetch("/data/preassessed_foms.json", {
          cache: "no-store",
        });
        if (snapResp.ok) {
          const snap = await snapResp.json();
          if (snap && Array.isArray(snap.projects)) {
            data = {
              projects: snap.projects,
              source: "preassessed_snapshot",
              preassessedAt: snap.generatedAt,
            };
          }
        }
      }

      if (!data || !Array.isArray(data.projects)) {
        setFomError("Unable to load live BC FOM proposals");
        setFomProjects([]);
      } else {
        setFomProjects(data.projects);
        setFomSource(data.source || "preassessed_snapshot");
        setPreassessedAt(
          data.preassessedAt || data.generatedAt || data.fetchedAt || null
        );
      }
    } catch {
      setFomError("Network error loading live BC FOM proposals");
    } finally {
      setFomLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFomProjects();
  }, [fetchFomProjects]);

  useEffect(() => {
    if (fomProjects.length === 0) return;
    window.dispatchEvent(
      new CustomEvent("bc-forestry:foms-updated", {
        detail: { projects: fomProjects, preassessedAt },
      })
    );
  }, [fomProjects, preassessedAt]);

  // Scan optional local public/data/*.geojson files (default OFF)
  const fetchAvailableGeoJSONFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/geojson-files");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.files)) {
        setLiveFiles(data.files);
        setEnabledLiveFiles((prev) => {
          const next = { ...prev };
          for (const f of data.files) {
            if (next[f.filename] === undefined) {
              next[f.filename] = false;
            }
          }
          return next;
        });
      }
    } catch {
      // Optional local files ignore error
    }
  }, []);

  useEffect(() => {
    fetchAvailableGeoJSONFiles();
  }, [fetchAvailableGeoJSONFiles]);

  // Base FOM list filtered by open status and search text (used for risk chip counts)
  const baseFomProjects = useMemo(() => {
    const q = fomSearch.trim().toLowerCase();
    return fomProjects.filter((p) => {
      if (fomOnlyOpen) {
        const deadline = getDaysRemaining(p.commentCloseDate, p.workflowState);
        if (!deadline.isOpen) return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        p.fspHolder.toLowerCase().includes(q) ||
        p.fomId.toLowerCase().includes(q)
      );
    });
  }, [fomProjects, fomSearch, fomOnlyOpen]);

  const riskCounts = useMemo(() => {
    const counts: Record<EcologicalRiskCategory, number> = {
      very_high: 0,
      high: 0,
      moderate: 0,
      low: 0,
      unassessed: 0,
    };
    for (const p of baseFomProjects) {
      const cat = p.riskAssessment?.category || "unassessed";
      counts[cat] += 1;
    }
    return counts;
  }, [baseFomProjects]);

  // Filtered + Sorted FOM projects for Left Pane
  const filteredFomProjects = useMemo(() => {
    const filtered =
      riskFilter === "ALL"
        ? baseFomProjects
        : baseFomProjects.filter(
            (p) => (p.riskAssessment?.category || "unassessed") === riskFilter
          );

    return [...filtered].sort((a, b) => {
      if (fomSort === "risk") {
        const rankA = a.riskAssessment?.rank ?? 0;
        const rankB = b.riskAssessment?.rank ?? 0;
        if (rankA !== rankB) return rankB - rankA;
      }
      const dateA = a.commentCloseDate || "9999-12-31";
      const dateB = b.commentCloseDate || "9999-12-31";
      return dateA.localeCompare(dateB);
    });
  }, [baseFomProjects, riskFilter, fomSort]);

  // Update vector highlight & clicked marker helper
  const updateMapHighlight = useCallback(
    (
      geometry?: GeoJSON.Geometry | null,
      coords?: [number, number] | null
    ) => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;

      const highlightSrc = map.getSource(
        "inspected-highlight"
      ) as maplibregl.GeoJSONSource | undefined;
      if (highlightSrc) {
        highlightSrc.setData({
          type: "FeatureCollection",
          features: geometry
            ? [{ type: "Feature", geometry, properties: {} }]
            : [],
        });
      }

      const pointSrc = map.getSource(
        "clicked-point-marker"
      ) as maplibregl.GeoJSONSource | undefined;
      if (pointSrc) {
        pointSrc.setData({
          type: "FeatureCollection",
          features: coords
            ? [
                {
                  type: "Feature",
                  geometry: { type: "Point", coordinates: coords },
                  properties: {},
                },
              ]
            : [],
        });
      }
    },
    []
  );

  const syncUrlParams = useCallback(
    (opts: {
      fomId?: string | null;
      lat?: number | null;
      lng?: number | null;
      z?: number | null;
    }) => {
      if (typeof window === "undefined") return;
      try {
        const url = new URL(window.location.href);
        if (opts.fomId) {
          url.searchParams.set("fomId", opts.fomId);
          url.searchParams.delete("lat");
          url.searchParams.delete("lng");
          url.searchParams.delete("z");
        } else if (
          typeof opts.lat === "number" &&
          Number.isFinite(opts.lat) &&
          typeof opts.lng === "number" &&
          Number.isFinite(opts.lng)
        ) {
          url.searchParams.delete("fomId");
          url.searchParams.set("lat", opts.lat.toFixed(4));
          url.searchParams.set("lng", opts.lng.toFixed(4));
          if (typeof opts.z === "number" && Number.isFinite(opts.z)) {
            url.searchParams.set("z", opts.z.toFixed(1));
          }
        }
        window.history.replaceState(null, "", url.toString());
      } catch {
        // Ignore URL history errors
      }
    },
    []
  );

  // Live click-to-inspect anywhere in BC
  const runLiveInspect = useCallback(
    async (lng: number, lat: number, skipUrlSync = false) => {
      if (!skipUrlSync) {
        syncUrlParams({
          lat,
          lng,
          z: mapRef.current?.getZoom() ?? 12.2,
        });
      }
      setInspectLoading(true);
      setOverlapIndex(0);
      updateMapHighlight(null, [lng, lat]);

      try {
        const resp = await fetch(
          `/api/inspect?lng=${encodeURIComponent(lng)}&lat=${encodeURIComponent(lat)}`
        );
        const data: InspectResult = await resp.json();
        setInspectResult(data);
        const targetGeom =
          data.cutblock?.geometry || data.forest?.geometry || null;
        updateMapHighlight(targetGeom, [lng, lat]);
      } catch {
        setInspectResult({
          coordinates: [lng, lat],
          matchType: "exact",
          cutblock: null,
          allOverlappingCutblocks: [],
          forest: {
            hasInventory: false,
            standAgeYears: null,
            canopyHeightMeters: null,
            siteIndexMeters: null,
            dominantSpecies: null,
            speciesComposition: null,
            crownClosurePct: null,
            referenceYear: null,
            projectedDate: null,
            landCoverClass: null,
            vriFeatureId: null,
            becZone: null,
            becZoneCode: null,
            becZoneName: null,
            becSubzone: null,
            ndt: null,
            ndtLabel: null,
            plainDisturbanceLabel: null,
            becRelativeHighSiThreshold: null,
            isHighProdForBec: null,
            ecologicalNote: null,
            areaHa: null,
            oldGrowthThresholdYears: null,
            isOldGrowth: null,
          },
          designations: {
            tapPriorityDeferral: null,
            tapSubcategories: [],
            legalOgma: null,
            legalOgmaId: null,
            protectedPark: null,
            wildlifeHabitatArea: null,
            ungulateWinterRange: null,
            communityWatershed: null,
            recentWildfire: null,
          },
          riskAssessment: createUnassessedRisk("Unable to query DataBC at this location."),
          queryHealth: {
            queriedAt: new Date().toISOString(),
            succeededLayers: [],
            failedLayers: ["All DataBC WFS layers"],
            totalLayers: 13,
          },
          rawAuditRecords: {},
          error: "Unable to query DataBC at this location.",
        });
      } finally {
        setInspectLoading(false);
      }
    },
    [updateMapHighlight]
  );

  // Load optional local GeoJSON files only when toggled ON
  const loadSingleLocalGeoJSON = useCallback(
    async (map: maplibregl.Map, file: LiveGeoJSONFile) => {
      const sourceId = `local-source-${file.filename}`;
      const fillId = `local-fill-${file.filename}`;
      const lineId = `local-line-${file.filename}`;
      if (map.getSource(sourceId)) return;

      try {
        const resp = await fetch(file.url);
        if (!resp.ok) return;
        const geojson = await resp.json();
        const features = geojson.features || [];

        let minLng = 180,
          minLat = 90,
          maxLng = -180,
          maxLat = -90;
        const visit = (coords: unknown) => {
          if (!Array.isArray(coords)) return;
          if (
            coords.length >= 2 &&
            typeof coords[0] === "number" &&
            typeof coords[1] === "number"
          ) {
            if (coords[0] < minLng) minLng = coords[0];
            if (coords[0] > maxLng) maxLng = coords[0];
            if (coords[1] < minLat) minLat = coords[1];
            if (coords[1] > maxLat) maxLat = coords[1];
          } else {
            for (const c of coords) visit(c);
          }
        };
        for (const f of features) {
          if (f.geometry?.coordinates) visit(f.geometry.coordinates);
        }
        if (minLng <= maxLng && minLat <= maxLat) {
          setLiveLayerBounds((prev) => ({
            ...prev,
            [file.filename]: [minLng, minLat, maxLng, maxLat],
          }));
        }
        setLiveFeatureCounts((prev) => ({
          ...prev,
          [file.filename]: features.length,
        }));

        if (map.getSource(sourceId)) return;
        map.addSource(sourceId, { type: "geojson", data: geojson });
        map.addLayer(
          {
            id: fillId,
            type: "fill",
            source: sourceId,
            paint: { "fill-color": "#6366f1", "fill-opacity": 0.32 },
          },
          "active-fom-fill"
        );
        map.addLayer(
          {
            id: lineId,
            type: "line",
            source: sourceId,
            paint: { "line-color": "#4338ca", "line-width": 1.2 },
          },
          "active-fom-fill"
        );
      } catch {
        // Ignore optional local file load errors
      }
    },
    []
  );

  // Initialize MapLibre GL map centered on British Columbia
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialWmsSources: Record<string, maplibregl.RasterSourceSpecification> =
      {};
    const initialWmsLayers: maplibregl.RasterLayerSpecification[] = [];

    // Register Forest, Protected Area & Planning Boundary WMS overlays (below cutblocks)
    for (const opt of ALL_WMS_OVERLAY_OPTIONS) {
      const srcId = `wms-${opt.key}`;
      initialWmsSources[srcId] = {
        type: "raster",
        tiles: [`/api/wms?layerKey=${opt.key}&bbox={bbox-epsg-3857}`],
        tileSize: 256,
      };
      initialWmsLayers.push({
        id: `layer-${srcId}`,
        type: "raster",
        source: srcId,
        layout: { visibility: "none" },
        paint: { "raster-opacity": overlayOpacity },
      });
    }

    // Register Cutblock Lifecycle WMS layers (above forest overlays)
    for (const item of WMS_CUTBLOCK_KEYS) {
      const srcId = `wms-${item.wmsKey}`;
      const extra =
        item.wmsKey === "completed_cutblocks" ? "&completedSince=2020" : "";
      initialWmsSources[srcId] = {
        type: "raster",
        tiles: [`/api/wms?layerKey=${item.wmsKey}&bbox={bbox-epsg-3857}${extra}`],
        tileSize: 256,
      };
      const defaultVis =
        item.stage === "fom_proposed" || item.stage === "ften_pending"
          ? "visible"
          : "none";
      initialWmsLayers.push({
        id: `layer-${srcId}`,
        type: "raster",
        source: srcId,
        layout: { visibility: defaultVis },
        paint: { "raster-opacity": 0.85 },
      });
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          "basemap-topo": {
            type: "raster",
            tiles: BASEMAPS.topo.tiles,
            tileSize: 256,
            attribution: BASEMAPS.topo.attribution,
          },
          "basemap-satellite": {
            type: "raster",
            tiles: BASEMAPS.satellite.tiles,
            tileSize: 256,
            attribution: BASEMAPS.satellite.attribution,
          },
          "basemap-osm": {
            type: "raster",
            tiles: BASEMAPS.osm.tiles,
            tileSize: 256,
            attribution: BASEMAPS.osm.attribution,
          },
          ...initialWmsSources,
        },
        layers: [
          {
            id: "background-color",
            type: "background",
            paint: { "background-color": "#F3F0E8" },
          },
          {
            id: "layer-topo",
            type: "raster",
            source: "basemap-topo",
            layout: { visibility: "visible" },
          },
          {
            id: "layer-satellite",
            type: "raster",
            source: "basemap-satellite",
            layout: { visibility: "none" },
          },
          {
            id: "layer-osm",
            type: "raster",
            source: "basemap-osm",
            layout: { visibility: "none" },
          },
          ...initialWmsLayers,
        ],
      },
      center: BC_REGION_BOOKMARKS[0].center,
      zoom: BC_REGION_BOOKMARKS[0].zoom,
      pitch: 0,
      bearing: 0,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }),
      "bottom-left"
    );

    map.on("load", () => {
      // Selected FOM Project's real cutblocks vector overlay
      map.addSource("active-fom-blocks", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "active-fom-fill",
        type: "fill",
        source: "active-fom-blocks",
        paint: { "fill-color": "#0284c7", "fill-opacity": 0.45 },
      });
      map.addLayer({
        id: "active-fom-outline",
        type: "line",
        source: "active-fom-blocks",
        paint: { "line-color": "#0369a1", "line-width": 2.2 },
      });

      // Inspected polygon highlight casing + dark outline
      map.addSource("inspected-highlight", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "inspected-highlight-casing",
        type: "line",
        source: "inspected-highlight",
        paint: { "line-color": "#ffffff", "line-width": 5.5 },
      });
      map.addLayer({
        id: "inspected-highlight-outline",
        type: "line",
        source: "inspected-highlight",
        paint: { "line-color": "#1c1917", "line-width": 2.5 },
      });

      // Clicked coordinate marker
      map.addSource("clicked-point-marker", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "clicked-point-circle",
        type: "circle",
        source: "clicked-point-marker",
        paint: {
          "circle-radius": 5.5,
          "circle-color": "#065f46",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
    });

    map.on("zoomend", () => {
      setMapZoom(map.getZoom());
    });

    map.on("click", (e) => {
      runLiveInspect(e.lngLat.lng, e.lngLat.lat);
    });

    map.getCanvas().style.cursor = "crosshair";
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [runLiveInspect]);

  // Switch Basemap
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const mapping: Record<BasemapId, string> = {
      topo: "layer-topo",
      satellite: "layer-satellite",
      osm: "layer-osm",
    };
    (Object.keys(mapping) as BasemapId[]).forEach((k) => {
      if (map.getLayer(mapping[k])) {
        map.setLayoutProperty(
          mapping[k],
          "visibility",
          basemap === k ? "visible" : "none"
        );
      }
    });
  }, [basemap]);

  // Sync Cutblock Lifecycle WMS Visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    for (const item of WMS_CUTBLOCK_KEYS) {
      const layerId = `layer-wms-${item.wmsKey}`;
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(
          layerId,
          "visibility",
          stageVisibility[item.stage] ? "visible" : "none"
        );
      }
    }
  }, [stageVisibility]);

  // Recreate Completed Cutblocks WMS source when completedSince timeframe changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const srcId = "wms-completed_cutblocks";
    const layerId = "layer-wms-completed_cutblocks";
    const vis = stageVisibility.completed ? "visible" : "none";

    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(srcId)) map.removeSource(srcId);

    map.addSource(srcId, {
      type: "raster",
      tiles: [
        `/api/wms?layerKey=completed_cutblocks&bbox={bbox-epsg-3857}&completedSince=${completedSince}`,
      ],
      tileSize: 256,
    });
    map.addLayer(
      {
        id: layerId,
        type: "raster",
        source: srcId,
        layout: { visibility: vis },
        paint: { "raster-opacity": 0.72 },
      },
      "layer-wms-ften_active"
    );
  }, [completedSince, stageVisibility.completed]);

  // Sync BC-wide Forest & Planning Overlay WMS Visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    for (const opt of ALL_WMS_OVERLAY_OPTIONS) {
      const layerId = `layer-wms-${opt.key}`;
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(
          layerId,
          "visibility",
          forestOverlays[opt.key] ? "visible" : "none"
        );
      }
    }
  }, [forestOverlays]);

  // Sync Overlay Raster Opacity across all Forest & Planning Overlay WMS layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    for (const opt of ALL_WMS_OVERLAY_OPTIONS) {
      const layerId = `layer-wms-${opt.key}`;
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, "raster-opacity", overlayOpacity);
      }
    }
  }, [overlayOpacity]);

  // Load/Toggle Optional Local GeoJSON files
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    for (const file of liveFiles) {
      const isOn = enabledLiveFiles[file.filename] === true;
      const fillId = `local-fill-${file.filename}`;
      const lineId = `local-line-${file.filename}`;
      if (isOn && !map.getSource(`local-source-${file.filename}`)) {
        loadSingleLocalGeoJSON(map, file);
      } else {
        if (map.getLayer(fillId)) {
          map.setLayoutProperty(fillId, "visibility", isOn ? "visible" : "none");
        }
        if (map.getLayer(lineId)) {
          map.setLayoutProperty(lineId, "visibility", isOn ? "visible" : "none");
        }
      }
    }
  }, [enabledLiveFiles, liveFiles, loadSingleLocalGeoJSON]);

  const handleJumpToRegion = useCallback((regionId: string) => {
    setSelectedRegionId(regionId);
    const region = BC_REGION_BOOKMARKS.find((r) => r.id === regionId);
    if (!region || !mapRef.current) return;
    mapRef.current.flyTo({
      center: region.center,
      zoom: region.zoom,
      duration: 1300,
    });
  }, []);

  useEffect(() => {
    const onJumpRegion = (e: Event) => {
      const detail = (e as CustomEvent<{ regionId?: string }>).detail;
      if (detail?.regionId) {
        handleJumpToRegion(detail.regionId);
        mapContainerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    };
    window.addEventListener("bc-forestry:jump-region", onJumpRegion);
    return () =>
      window.removeEventListener("bc-forestry:jump-region", onJumpRegion);
  }, [handleJumpToRegion]);

  const handleFlyToLocalFile = (filename: string) => {
    setEnabledLiveFiles((prev) => ({ ...prev, [filename]: true }));
    const bbox = liveLayerBounds[filename];
    if (bbox && mapRef.current) {
      mapRef.current.fitBounds(
        [
          [bbox[0], bbox[1]],
          [bbox[2], bbox[3]],
        ],
        { padding: 48, duration: 1200 }
      );
    }
    setLayersOpen(false);
  };

  // Select FOM project from Left Pane -> fetch real polygons + VRI properties
  const handleSelectFomProject = useCallback(
    async (project: FomProjectSummary) => {
      syncUrlParams({ fomId: project.fomId });
      setSelectedFomProject(project);
      setInspectLoading(true);
      setOverlapIndex(0);
      setStageVisibility((prev) => ({ ...prev, fom_proposed: true }));

    try {
      const resp = await fetch(
        `/api/fom-blocks?fomId=${encodeURIComponent(project.fomId)}`
      );
      const data = await resp.json();
      const map = mapRef.current;

      if (map && map.isStyleLoaded()) {
        const fomSrc = map.getSource("active-fom-blocks") as
          | maplibregl.GeoJSONSource
          | undefined;
        if (fomSrc && data.featureCollection) {
          fomSrc.setData(data.featureCollection);
        }

        if (Array.isArray(data.bounds) && data.bounds.length === 4) {
          map.fitBounds(
            [
              [data.bounds[0], data.bounds[1]],
              [data.bounds[2], data.bounds[3]],
            ],
            { padding: 80, maxZoom: 13.5, duration: 1200 }
          );
        } else if (project.center) {
          map.flyTo({ center: project.center, zoom: 12.2, duration: 1200 });
        }
      }

      if (data.inspection) {
        setInspectResult(data.inspection);
        if (data.inspection.riskAssessment) {
          setFomProjects((prev) =>
            prev.map((p) =>
              p.fomId === project.fomId
                ? {
                    ...p,
                    riskAssessment: data.inspection.riskAssessment,
                    projectScreening: data.projectScreening || undefined,
                    forestPreview: {
                      standAgeYears:
                        data.inspection.forest?.standAgeYears ?? null,
                      siteIndexMeters:
                        data.inspection.forest?.siteIndexMeters ?? null,
                      canopyHeightMeters:
                        data.inspection.forest?.canopyHeightMeters ?? null,
                      becZone: data.inspection.forest?.becZone ?? null,
                    },
                  }
                : p
            )
          );
        }
        const geom =
          data.inspection.cutblock?.geometry ||
          data.inspection.forest?.geometry ||
          null;
        updateMapHighlight(geom, data.centroid || project.center || null);
      } else if (project.center) {
        await runLiveInspect(project.center[0], project.center[1], true);
      }
    } catch {
      if (project.center) {
        await runLiveInspect(project.center[0], project.center[1], true);
      }
    } finally {
      setInspectLoading(false);
    }
  },
  [runLiveInspect, syncUrlParams, updateMapHighlight]
  );

  // Apply shareable deep link (?fomId=... or ?lat=...&lng=...&z=...) once on load
  useEffect(() => {
    if (deepLinkAppliedRef.current || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fomIdParam = params.get("fomId")?.trim();
    const latParam = params.get("lat");
    const lngParam = params.get("lng");
    const zParam = params.get("z");

    if (fomIdParam && /^\d+$/.test(fomIdParam)) {
      if (fomLoading) return;
      deepLinkAppliedRef.current = true;
      const matched = fomProjects.find((p) => p.fomId === fomIdParam);
      const target: FomProjectSummary = matched || {
        fomId: fomIdParam,
        name: `Proposal #${fomIdParam}`,
        fspHolder: "Forest Stewardship Plan Holder",
        district: "BC Natural Resource District",
        workflowState: "Public Review",
        fomProjectUrl: `https://fom.nrs.gov.bc.ca/public/projects#splash?id=${fomIdParam}`,
      };
      void handleSelectFomProject(target);
      return;
    }

    if (latParam !== null && lngParam !== null) {
      const lat = Number(latParam);
      const lng = Number(lngParam);
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= 48 &&
        lat <= 61 &&
        lng >= -140 &&
        lng <= -113
      ) {
        deepLinkAppliedRef.current = true;
        const parsedZ = zParam !== null ? Number(zParam) : 12.2;
        const zoom = Number.isFinite(parsedZ)
          ? Math.min(16, Math.max(5, parsedZ))
          : 12.2;
        mapRef.current?.flyTo({
          center: [lng, lat],
          zoom,
          duration: 1200,
        });
        void runLiveInspect(lng, lat, true);
      }
    }
  }, [fomLoading, fomProjects, handleSelectFomProject, runLiveInspect]);

  // Active cutblock record from inspectResult (respecting overlap switcher)
  const activeCutblock: InspectCutblockRecord | null = useMemo(() => {
    if (!inspectResult) return null;
    if (inspectResult.allOverlappingCutblocks.length > 0) {
      const safeIdx = Math.min(
        overlapIndex,
        inspectResult.allOverlappingCutblocks.length - 1
      );
      return inspectResult.allOverlappingCutblocks[safeIdx];
    }
    return inspectResult.cutblock;
  }, [inspectResult, overlapIndex]);

  // Update highlight if user cycles through overlapping cutblocks
  useEffect(() => {
    if (!inspectResult) return;
    const geom =
      activeCutblock?.geometry || inspectResult.forest?.geometry || null;
    updateMapHighlight(geom, inspectResult.coordinates);
  }, [activeCutblock, inspectResult, updateMapHighlight]);

  const handleCopySummary = async () => {
    if (!inspectResult) return;
    const text = buildInspectSummary(
      inspectResult,
      activeCutblock,
      selectedFomProject
    );
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch {
      // Ignore clipboard errors
    }
  };

  const handleCopyShareLink = async () => {
    if (!inspectResult || typeof window === "undefined") return;
    const url = new URL(`${window.location.origin}${window.location.pathname}`);
    const fomId = selectedFomProject?.fomId || activeCutblock?.fomId;
    if (fomId) {
      url.searchParams.set("fomId", fomId);
    } else if (inspectResult.coordinates?.length === 2) {
      url.searchParams.set("lat", inspectResult.coordinates[1].toFixed(4));
      url.searchParams.set("lng", inspectResult.coordinates[0].toFixed(4));
      url.searchParams.set(
        "z",
        (mapRef.current?.getZoom() ?? 12.2).toFixed(1)
      );
    }
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2500);
    } catch {
      // Ignore clipboard errors
    }
  };

  const handleDownloadEvidenceJson = () => {
    if (!inspectResult) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      methodologyVersion:
        inspectResult.riskAssessment?.methodologyVersion || "v2.0",
      coordinates: inspectResult.coordinates,
      matchType: inspectResult.matchType,
      queryHealth: inspectResult.queryHealth,
      sensitivityAssessment: inspectResult.riskAssessment,
      projectScreening: inspectResult.projectScreening || null,
      activeCutblock: activeCutblock
        ? { ...activeCutblock, geometry: undefined }
        : null,
      forestProperties: { ...inspectResult.forest, geometry: undefined },
      designations: inspectResult.designations,
      rawAuditRecords: inspectResult.rawAuditRecords,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const idSlug = (activeCutblock?.id || "location").replace(/[^a-zA-Z0-9_-]/g, "_");
    a.href = url;
    a.download = `bc-forestry-evidence-${idSlug}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const anyVriOverlayEnabled =
    forestOverlays.vri_old_growth ||
    forestOverlays.vri_high_si ||
    forestOverlays.vri_tall_canopy;
  const showVriZoomHint = anyVriOverlayEnabled && mapZoom < 9.5;

  const activeCommentDates =
    activeCutblock?.commentOpenDate ||
    activeCutblock?.commentCloseDate ||
    selectedFomProject?.commentOpenDate ||
    selectedFomProject?.commentCloseDate;

  const activeCommentDeadline = getDaysRemaining(
    activeCutblock?.commentCloseDate || selectedFomProject?.commentCloseDate,
    selectedFomProject?.workflowState
  );

  return (
    <div className="space-y-4">
      {/* ===================================================================
          COMPACT WORKSPACE TOOLBAR (LIFECYCLE FILTERS + REGION + BASEMAP + LAYERS)
         =================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#DDD7C9] rounded-xl px-4 py-2.5 shadow-[0_1px_3px_rgba(16,42,32,0.05)]">
        {/* Left: Cutblock Lifecycle Stage Checkboxes */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-stone-500 mr-1">
            <span>Cutblocks:</span>
            <InfoTooltip
              label="About logging stages"
              title="Logging Stages"
              content="Proposed = 30-day public review before a permit request. Pending Permit = awaiting government approval. Active = approved for harvesting. Completed = already logged."
              href="/about"
              linkText="Full stage guide →"
            />
          </span>

          <button
            type="button"
            aria-pressed={stageVisibility.fom_proposed}
            title={
              stageVisibility.fom_proposed
                ? "Click to hide Proposed cutblocks on map"
                : "Click to show Proposed cutblocks on map"
            }
            onClick={() =>
              setStageVisibility((p) => ({
                ...p,
                fom_proposed: !p.fom_proposed,
              }))
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              stageVisibility.fom_proposed
                ? "bg-[#0369a1] text-white border-[#0369a1] shadow-sm"
                : "bg-white/70 text-stone-500 border-stone-300 border-dashed hover:border-stone-400 hover:text-stone-800 hover:bg-[#F8F5EE]"
            }`}
          >
            {stageVisibility.fom_proposed ? (
              <Check className="w-3 h-3 stroke-[2.75] shrink-0" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full border-[1.5px] border-[#0284c7] bg-transparent opacity-75 shrink-0" />
            )}
            <span>Proposed</span>
          </button>

          <button
            type="button"
            aria-pressed={stageVisibility.ften_pending}
            title={
              stageVisibility.ften_pending
                ? "Click to hide Pending Permit cutblocks on map"
                : "Click to show Pending Permit cutblocks on map"
            }
            onClick={() =>
              setStageVisibility((p) => ({
                ...p,
                ften_pending: !p.ften_pending,
              }))
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              stageVisibility.ften_pending
                ? "bg-[#b45309] text-white border-[#b45309] shadow-sm"
                : "bg-white/70 text-stone-500 border-stone-300 border-dashed hover:border-stone-400 hover:text-stone-800 hover:bg-[#F8F5EE]"
            }`}
          >
            {stageVisibility.ften_pending ? (
              <Check className="w-3 h-3 stroke-[2.75] shrink-0" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full border-[1.5px] border-[#d97706] bg-transparent opacity-75 shrink-0" />
            )}
            <span>Pending Permit</span>
          </button>

          <button
            type="button"
            aria-pressed={stageVisibility.ften_active}
            title={
              stageVisibility.ften_active
                ? "Click to hide Active cutblocks on map"
                : "Click to show Active cutblocks on map"
            }
            onClick={() =>
              setStageVisibility((p) => ({
                ...p,
                ften_active: !p.ften_active,
              }))
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              stageVisibility.ften_active
                ? "bg-[#c2410c] text-white border-[#c2410c] shadow-sm"
                : "bg-white/70 text-stone-500 border-stone-300 border-dashed hover:border-stone-400 hover:text-stone-800 hover:bg-[#F8F5EE]"
            }`}
          >
            {stageVisibility.ften_active ? (
              <Check className="w-3 h-3 stroke-[2.75] shrink-0" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full border-[1.5px] border-[#ea580c] bg-transparent opacity-75 shrink-0" />
            )}
            <span>Active</span>
          </button>

          <button
            type="button"
            aria-pressed={stageVisibility.completed}
            title={
              stageVisibility.completed
                ? "Click to hide Completed cutblocks on map"
                : "Click to show Completed cutblocks on map"
            }
            onClick={() =>
              setStageVisibility((p) => ({
                ...p,
                completed: !p.completed,
              }))
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              stageVisibility.completed
                ? "bg-[#b91c1c] text-white border-[#b91c1c] shadow-sm"
                : "bg-white/70 text-stone-500 border-stone-300 border-dashed hover:border-stone-400 hover:text-stone-800 hover:bg-[#F8F5EE]"
            }`}
          >
            {stageVisibility.completed ? (
              <Check className="w-3 h-3 stroke-[2.75] shrink-0" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full border-[1.5px] border-[#dc2626] bg-transparent opacity-75 shrink-0" />
            )}
            <span>Completed</span>
          </button>

          {stageVisibility.completed && (
            <select
              aria-label="Completed cutblock timeframe"
              value={completedSince}
              onChange={(e) =>
                setCompletedSince(e.target.value as CompletedTimeframe)
              }
              className="bg-rose-50 text-rose-950 text-xs font-medium px-2 py-1 rounded-lg border border-rose-300 focus:outline-none"
            >
              <option value="2020">2020–Present</option>
              <option value="2015">2015–Present</option>
              <option value="all">All Years</option>
            </select>
          )}
        </div>

        {/* Right: Region Jump, Basemap Switcher, Forest & Data Layers Popover */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Jump to BC region"
            value={selectedRegionId}
            onChange={(e) => handleJumpToRegion(e.target.value)}
            className="bg-[#FAF8F4] text-stone-800 text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 focus:outline-none focus:border-emerald-700"
          >
            {BC_REGION_BOOKMARKS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-0.5 bg-[#FAF8F4] border border-stone-200 p-0.5 rounded-lg">
            {(Object.keys(BASEMAPS) as BasemapId[]).map((bmKey) => (
              <button
                key={bmKey}
                onClick={() => setBasemap(bmKey)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  basemap === bmKey
                    ? "bg-white text-stone-900 shadow-sm border border-stone-200/80"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {BASEMAPS[bmKey].label}
              </button>
            ))}
          </div>

          <div className="relative" ref={layersPopoverRef}>
            <button
              onClick={() => setLayersOpen((o) => !o)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                layersOpen
                  ? "bg-[#143929] text-white border-[#143929]"
                  : "bg-[#F8F5EE] text-stone-800 border-[#D8D1C2] hover:bg-[#F2EDE2]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Map Layers</span>
              {ALL_WMS_OVERLAY_OPTIONS.some((o) => forestOverlays[o.key]) && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold tabular-nums ${
                    layersOpen
                      ? "bg-white/20 text-white"
                      : "bg-[#143929] text-white"
                  }`}
                >
                  {
                    ALL_WMS_OVERLAY_OPTIONS.filter(
                      (o) => forestOverlays[o.key]
                    ).length
                  }
                </span>
              )}
            </button>

            {layersOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-stone-200 shadow-xl rounded-xl p-4 z-40 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2 gap-2">
                  <span className="text-xs font-semibold text-stone-900">
                    Forest, Conservation &amp; Boundary Layers
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {ALL_WMS_OVERLAY_OPTIONS.some(
                      (o) => forestOverlays[o.key]
                    ) && (
                      <button
                        type="button"
                        onClick={() =>
                          setForestOverlays({
                            vri_old_growth: false,
                            vri_high_si: false,
                            vri_tall_canopy: false,
                            tap_deferrals: false,
                            ogma_legal: false,
                            bc_parks: false,
                            wha_approved: false,
                            uwr_approved: false,
                            community_watersheds: false,
                            wildfire_recent: false,
                            nr_regions: false,
                            nr_districts: false,
                            tsa_boundaries: false,
                          })
                        }
                        className="text-[11px] font-medium text-[#143929] hover:underline"
                      >
                        Clear all
                      </button>
                    )}
                    <button
                      onClick={() => setLayersOpen(false)}
                      className="text-stone-400 hover:text-stone-700"
                      aria-label="Close layers menu"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stackable BC-Wide VRI & Protected Area Overlays */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
                    Standing Forest &amp; Conservation Layers
                  </div>
                  {FOREST_OVERLAY_OPTIONS.map((opt) => {
                    const isOn = forestOverlays[opt.key];
                    return (
                      <div
                        key={opt.key}
                        className="w-full flex items-center justify-between gap-2 py-1 px-1.5 rounded-md hover:bg-[#FAF8F4] transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setForestOverlays((prev) => ({
                              ...prev,
                              [opt.key]: !prev[opt.key],
                            }))
                          }
                          className="flex-1 flex items-center gap-2 text-left text-xs min-w-0"
                        >
                          {isOn ? (
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          )}
                          <LayerSwatch styleSpec={OVERLAY_STYLE_MAP[opt.key]} />
                          <span
                            className={`truncate ${
                              isOn ? "text-stone-900 font-medium" : "text-stone-600"
                            }`}
                          >
                            {opt.label}
                          </span>
                        </button>
                        <InfoTooltip
                          label={`About ${opt.label}`}
                          title={opt.label}
                          content={opt.description}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Forestry Planning Boundaries */}
                <div className="border-t border-stone-100 pt-3 space-y-1.5">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
                    Forestry Planning Boundaries
                  </div>
                  {PLANNING_BOUNDARY_OPTIONS.map((opt) => {
                    const isOn = forestOverlays[opt.key];
                    return (
                      <div
                        key={opt.key}
                        className="w-full flex items-center justify-between gap-2 py-1 px-1.5 rounded-md hover:bg-[#FAF8F4] transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setForestOverlays((prev) => ({
                              ...prev,
                              [opt.key]: !prev[opt.key],
                            }))
                          }
                          className="flex-1 flex items-center gap-2 text-left text-xs min-w-0"
                        >
                          {isOn ? (
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          )}
                          <LayerSwatch styleSpec={OVERLAY_STYLE_MAP[opt.key]} />
                          <span
                            className={`truncate ${
                              isOn ? "text-stone-900 font-medium" : "text-stone-600"
                            }`}
                          >
                            {opt.label}
                          </span>
                        </button>
                        <InfoTooltip
                          label={`About ${opt.label}`}
                          title={opt.label}
                          content={opt.description}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Overlay Layer Opacity Control */}
                <div className="border-t border-stone-100 pt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium uppercase tracking-wider text-stone-500">
                      Overlay Opacity
                    </span>
                    <span className="font-semibold text-stone-700 tabular-nums">
                      {Math.round(overlayOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.35}
                    max={1}
                    step={0.05}
                    value={overlayOpacity}
                    onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                    aria-label="Overlay layer opacity"
                    className="w-full accent-[#143929] cursor-pointer h-1.5"
                  />
                </div>

                {/* Optional Local GeoJSON Files (Default OFF) */}
                <div className="border-t border-stone-100 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
                      Optional Local Files (public/data/)
                    </span>
                    <button
                      onClick={fetchAvailableGeoJSONFiles}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Rescan</span>
                    </button>
                  </div>

                  {liveFiles.length === 0 ? (
                    <div className="text-xs text-stone-500">
                      No local GeoJSON files found.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {liveFiles.map((file) => {
                        const isEnabled =
                          enabledLiveFiles[file.filename] === true;
                        const count = liveFeatureCounts[file.filename];
                        return (
                          <div
                            key={file.filename}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#FAF8F4] border border-stone-200/80"
                          >
                            <button
                              onClick={() =>
                                setEnabledLiveFiles((prev) => ({
                                  ...prev,
                                  [file.filename]: !isEnabled,
                                }))
                              }
                              className="flex items-center gap-2 min-w-0 text-left"
                            >
                              {isEnabled ? (
                                <CheckSquare className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <div className="text-xs font-mono text-stone-800 truncate">
                                  {file.filename}
                                </div>
                                <div className="text-[11px] text-stone-500">
                                  {count !== undefined
                                    ? `${count.toLocaleString()} features`
                                    : `${(file.sizeBytes / (1024 * 1024)).toFixed(1)} MB`}
                                </div>
                              </div>
                            </button>

                            <button
                              onClick={() => handleFlyToLocalFile(file.filename)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-stone-300 hover:bg-stone-50 text-[11px] font-medium text-stone-700 shrink-0"
                            >
                              <Crosshair className="w-3 h-3" />
                              <span>Fly to</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setGuideOpen((g) => !g)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              guideOpen
                ? "bg-[#143929] text-white border-[#143929]"
                : "bg-[#F8F5EE] text-stone-800 border-[#D8D1C2] hover:bg-[#F2EDE2]"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Quick Guide</span>
          </button>
        </div>
      </div>

      {/* Collapsible 4-Step Interactive Quick Guide */}
      {guideOpen && (
        <div className="bg-white border border-[#DDD7C9] border-l-[3px] border-l-[#1B4332] rounded-xl p-4 shadow-[0_1px_4px_rgba(16,42,32,0.06)] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1D523B]">
                Explorer Quick Guide
              </div>
              <h3 className="font-serif text-sm font-semibold text-[#11241C]">
                How to Inspect Proposed Logging &amp; Standing Forests
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setGuideOpen(false)}
              className="text-stone-400 hover:text-stone-700 p-1 rounded"
              aria-label="Close Quick Guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#F8F5EE] border border-[#E5DFD2] rounded-lg p-3 space-y-1">
              <div className="font-semibold text-[#11241C]">
                1. Pick a Proposal or Click Map
              </div>
              <p className="text-stone-600 leading-relaxed">
                Select any open proposal on the left to zoom to its cutblocks,
                or click any spot in BC to inspect the standing forest.
              </p>
            </div>
            <div className="bg-[#F8F5EE] border border-[#E5DFD2] rounded-lg p-3 space-y-1">
              <div className="font-semibold text-[#11241C]">
                2. Compare Logging Stages
              </div>
              <p className="text-stone-600 leading-relaxed">
                Toggle <em>Proposed</em> (30-day comment window),{" "}
                <em>Pending Permit</em>, <em>Active</em>, and <em>Completed</em>{" "}
                cutblocks in the top bar.
              </p>
            </div>
            <div className="bg-[#F8F5EE] border border-[#E5DFD2] rounded-lg p-3 space-y-1">
              <div className="font-semibold text-[#11241C]">
                3. Overlay Forest &amp; Habitat Maps
              </div>
              <p className="text-stone-600 leading-relaxed">
                Open <em>Map Layers</em> to reveal old growth, fertile big-tree
                sites, wildlife habitat, drinking-water watersheds, and recent
                wildfires.
              </p>
            </div>
            <div className="bg-[#F8F5EE] border border-[#E5DFD2] rounded-lg p-3 space-y-1">
              <div className="font-semibold text-[#11241C]">
                4. Submit an Informed Comment
              </div>
              <p className="text-stone-600 leading-relaxed">
                Use <em>Copy Forest Summary</em> in the right panel and paste it
                into the official BC comment portal before the deadline.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs border-t border-stone-100">
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/forest-metrics"
                className="font-medium text-[#143929] hover:underline"
              >
                How old growth &amp; ratings work &rarr;
              </Link>
              <Link
                href="/about"
                className="font-medium text-[#143929] hover:underline"
              >
                Full About &amp; Help guide &rarr;
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setGuideOpen(false)}
              className="text-stone-500 hover:text-stone-800 font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================
          3-PANE WORKSPACE: LIVE BC FOM FEED | BC-WIDE MAP | LIVE INSPECTOR
         =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_340px] gap-4">
        {/* LEFT PANE: Open Logging Proposals */}
        <aside className="bg-white border border-[#DDD7C9] border-t-2 border-t-[#1B4332] rounded-xl flex flex-col lg:h-[680px] overflow-hidden shadow-[0_1px_4px_rgba(16,42,32,0.05)]">
          <div className="px-4 py-3 border-b border-[#E3DDD0] bg-[#F4F0E6]/85 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5">
                <h2 className="font-serif text-sm font-semibold text-[#11241C]">
                  Open Logging Proposals
                </h2>
                <InfoTooltip
                  label="About Open Logging Proposals"
                  title="30-Day Public Review"
                  content="Forestry companies must post proposed cutblocks for 30 days of public comment before requesting a logging permit. Open proposals are pre-assessed across up to 5 representative cutblocks so you can sort by sensitivity immediately; click any proposal for full details."
                  href="/about"
                  linkText="How to comment →"
                />
              </div>
              <span className="text-xs text-stone-500 tabular-nums">
                {filteredFomProjects.length} shown
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={fomSearch}
                onChange={(e) => setFomSearch(e.target.value)}
                placeholder="Search by district, company, or ID..."
                className="w-full bg-white text-xs text-stone-800 pl-8 pr-3 py-1.5 rounded-lg border border-stone-200 focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFomOnlyOpen(true)}
                  className={`px-2 py-0.5 rounded font-medium ${
                    fomOnlyOpen
                      ? "bg-sky-100 text-sky-900"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  Open
                </button>
                <button
                  onClick={() => setFomOnlyOpen(false)}
                  className={`px-2 py-0.5 rounded font-medium ${
                    !fomOnlyOpen
                      ? "bg-stone-200 text-stone-900"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  All
                </button>
              </div>

              <select
                aria-label="Sort proposals"
                value={fomSort}
                onChange={(e) =>
                  setFomSort(e.target.value as "risk" | "deadline")
                }
                className="bg-white text-stone-700 text-[11px] font-medium px-2 py-0.5 rounded border border-stone-200 focus:outline-none focus:border-emerald-700"
              >
                <option value="risk">Sort: Highest Sensitivity</option>
                <option value="deadline">Sort: Soonest Deadline</option>
              </select>
            </div>

            {/* Ecological Risk Filter Chips */}
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <button
                onClick={() => setRiskFilter("ALL")}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                  riskFilter === "ALL"
                    ? "bg-stone-800 text-white border-stone-800"
                    : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                }`}
              >
                All ({baseFomProjects.length})
              </button>
              {(
                ["very_high", "high", "moderate", "low"] as EcologicalRiskCategory[]
              ).map((cat) => {
                const style = RISK_BADGE_STYLES[cat];
                const count = riskCounts[cat];
                const isActive = riskFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setRiskFilter(cat)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-all ${
                      isActive
                        ? `${style.badgeClass} ring-2 ring-stone-700/70 font-semibold shadow-sm`
                        : "bg-white text-stone-500 border-stone-200 font-medium hover:bg-stone-50 hover:text-stone-800"
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: style.dotColor }}
                    />
                    <span>
                      {style.shortLabel} ({count})
                    </span>
                  </button>
                );
              })}
              <InfoTooltip
                label="About Sensitivity Categories"
                title="Sensitivity Filter"
                content="Ratings group proposals by old-growth age, soil productivity, parks, legally protected old growth, wildlife habitat, winter ranges, and drinking-water watersheds."
                href="/forest-metrics#risk-methodology"
                linkText="Rating rules →"
              />
            </div>
            {fomSource && (
              <div className="flex items-center justify-between gap-2 text-[10px] text-stone-500">
                <span>
                  Pre-assessed ·{" "}
                  {
                    baseFomProjects.filter(
                      (p) => (p.riskAssessment?.rank ?? 0) > 0
                    ).length
                  }
                  /{baseFomProjects.length} scored
                  {preassessedAt
                    ? ` · Updated ${(() => {
                        const ms = Date.now() - Date.parse(preassessedAt);
                        if (!Number.isFinite(ms) || ms < 0) return "";
                        const mins = Math.floor(ms / 60000);
                        if (mins < 2) return "just now";
                        if (mins < 60) return `${mins}m ago`;
                        const hrs = Math.floor(mins / 60);
                        if (hrs < 24) return `${hrs}h ago`;
                        return new Date(preassessedAt).toLocaleDateString(
                          "en-CA",
                          {
                            month: "short",
                            day: "numeric",
                          }
                        );
                      })()}`
                    : ""}
                </span>
                <button
                  type="button"
                  onClick={fetchFomProjects}
                  disabled={fomLoading}
                  title="Refresh proposals list"
                  aria-label="Refresh proposals list"
                  className="inline-flex items-center gap-1 text-stone-500 hover:text-[#143929] disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-2.5 h-2.5 ${fomLoading ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            )}
          </div>

          <div className="divide-y divide-stone-100 overflow-y-auto flex-1">
            {fomLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-16 rounded-lg bg-[#FAF8F4] animate-pulse border border-stone-100"
                  />
                ))}
              </div>
            ) : fomError ? (
              <div className="p-4 text-xs text-stone-600 space-y-2">
                <p>{fomError}</p>
                <button
                  onClick={fetchFomProjects}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8F4] border border-stone-300 text-stone-800 font-medium hover:bg-stone-100"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            ) : filteredFomProjects.length === 0 ? (
              <div className="p-4 text-xs text-stone-500">
                No matching FOM proposals found. Try clearing your filter or
                switching to &ldquo;All Listed&rdquo;.
              </div>
            ) : (
              filteredFomProjects.slice(0, 250).map((proj) => {
                const isSelected = selectedFomProject?.fomId === proj.fomId;
                const deadline = getDaysRemaining(
                  proj.commentCloseDate,
                  proj.workflowState
                );
                const riskCat = proj.riskAssessment?.category || "unassessed";
                const riskStyle = RISK_BADGE_STYLES[riskCat];
                const agePreview = proj.forestPreview?.standAgeYears;
                const siPreview = proj.forestPreview?.siteIndexMeters;

                return (
                  <button
                    key={proj.fomId}
                    onClick={() => handleSelectFomProject(proj)}
                    className={`w-full text-left px-4 py-3 transition-colors border-l-[3px] ${
                      isSelected
                        ? "bg-[#F2EFE4] border-l-[#1B4332]"
                        : "bg-white hover:bg-[#F9F6EF] border-l-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-stone-900 leading-snug">
                        {proj.name}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${riskStyle.badgeClass}`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: riskStyle.dotColor }}
                        />
                        {riskStyle.shortLabel}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                          deadline.isOpen
                            ? "bg-sky-50 text-sky-800 border-sky-200"
                            : "bg-stone-100 text-stone-600 border-stone-200"
                        }`}
                      >
                        {deadline.pillText}
                      </span>
                    </div>

                    <div className="text-xs text-stone-500 mt-1.5 truncate">
                      {proj.district}
                      {proj.totalPlannedHa ? ` · ${proj.totalPlannedHa} ha` : ""}
                      {proj.blockCount ? ` · ${proj.blockCount} blocks` : ""}
                    </div>

                    <div className="text-[11px] text-stone-700 mt-0.5 truncate">
                      {agePreview !== null && agePreview !== undefined
                        ? `${agePreview} yrs${siPreview ? ` · Productivity ${siPreview}m` : ""} · `
                        : ""}
                      {proj.fspHolder}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* CENTER PANE: BC-Wide Live Map */}
        <div className="relative h-[460px] lg:h-[680px] rounded-xl overflow-hidden border border-[#CFC8B8] bg-[#EFECE2] shadow-[0_2px_10px_rgba(16,42,32,0.07)]">
          <div ref={mapContainerRef} className="w-full h-full" />

          {showVriZoomHint && (
            <div className="absolute top-3 left-3 bg-[#FAF8F2]/95 backdrop-blur-sm border border-[#DDD7C9] rounded-lg px-3 py-1.5 text-xs text-stone-700 shadow-sm pointer-events-none">
              Zoom in closer to see detailed forest stand layers
            </div>
          )}

          {/* Dynamic, Collapsible Active Map Legend */}
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute bottom-3 right-3 z-20 max-w-[275px] bg-[#FAF8F2]/95 backdrop-blur-sm border border-[#DDD7C9] rounded-xl shadow-md text-[11px] text-stone-700 pointer-events-auto overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setLegendOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-3 px-3 py-1.5 bg-[#F4F0E6]/90 hover:bg-[#ECE6D8] transition-colors text-left"
            >
              <span className="font-semibold text-[#11241C] flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-[#143929]" />
                <span>Map Legend</span>
                {ALL_WMS_OVERLAY_OPTIONS.some((o) => forestOverlays[o.key]) && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#143929] text-white text-[10px] font-semibold tabular-nums">
                    +
                    {
                      ALL_WMS_OVERLAY_OPTIONS.filter(
                        (o) => forestOverlays[o.key]
                      ).length
                    }
                  </span>
                )}
              </span>
              {legendOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              )}
            </button>

            {legendOpen && (
              <div className="px-3 py-2 space-y-2.5 max-h-[290px] overflow-y-auto">
                {/* Cutblock Lifecycle */}
                <div className="space-y-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                    Cutblock Lifecycle
                  </div>
                  <div className="grid grid-cols-2 gap-x-2.5 gap-y-1">
                    {(
                      [
                        { stage: "fom_proposed", label: "Proposed" },
                        { stage: "ften_pending", label: "Pending" },
                        { stage: "ften_active", label: "Active" },
                        { stage: "completed", label: "Completed" },
                      ] as Array<{ stage: CutblockStage; label: string }>
                    ).map((item) => (
                      <div
                        key={item.stage}
                        className={`inline-flex items-center gap-1.5 ${
                          stageVisibility[item.stage]
                            ? "text-stone-800 font-medium"
                            : "text-stone-400 line-through"
                        }`}
                      >
                        <LayerSwatch
                          styleSpec={CUTBLOCK_STAGE_STYLE_MAP[item.stage]}
                        />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Map Layers */}
                {ALL_WMS_OVERLAY_OPTIONS.some((o) => forestOverlays[o.key]) && (
                  <div className="border-t border-[#E5DFD2] pt-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                        Active Map Layers
                      </span>
                      <span className="text-[10px] text-stone-500 tabular-nums">
                        {Math.round(overlayOpacity * 100)}%
                      </span>
                    </div>
                    <div className="space-y-1">
                      {ALL_WMS_OVERLAY_OPTIONS.filter(
                        (opt) => forestOverlays[opt.key]
                      ).map((opt) => (
                        <div
                          key={opt.key}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <LayerSwatch
                              styleSpec={OVERLAY_STYLE_MAP[opt.key]}
                            />
                            <span className="truncate text-stone-800 font-medium">
                              {opt.label}
                            </span>
                            {opt.isVri && mapZoom < 9.5 && (
                              <span
                                title="Zoom in closer (z9.5+) to view detailed forest inventory stands"
                                className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-medium shrink-0"
                              >
                                z9.5+
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setForestOverlays((prev) => ({
                                ...prev,
                                [opt.key]: false,
                              }))
                            }
                            aria-label={`Hide ${opt.label}`}
                            className="text-stone-400 hover:text-stone-700 shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <input
                      type="range"
                      min={0.35}
                      max={1}
                      step={0.05}
                      value={overlayOpacity}
                      onChange={(e) =>
                        setOverlayOpacity(Number(e.target.value))
                      }
                      aria-label="Active overlay opacity"
                      className="w-full accent-[#143929] cursor-pointer h-1"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Live Cutblock + Standing Forest Properties Inspector */}
        <aside className="bg-white border border-[#DDD7C9] border-t-2 border-t-[#1B4332] rounded-xl p-5 lg:h-[680px] overflow-y-auto flex flex-col justify-between shadow-[0_1px_4px_rgba(16,42,32,0.05)]">
          {inspectLoading ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-12 space-y-2.5">
              <Loader2 className="w-5 h-5 text-emerald-800 animate-spin" />
              <div className="text-xs font-medium text-stone-700">
                Checking live BC Government forest records...
              </div>
            </div>
          ) : !inspectResult ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-10 px-3 space-y-4">
              <div className="space-y-1.5">
                <div className="font-serif text-base font-semibold text-[#11241C]">
                  Select a proposal or click the map
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Select an open proposal on the left or click anywhere on the
                  map to see logging plans and standing forest details.
                </p>
              </div>
              <ul className="w-full text-left text-[11px] text-stone-600 bg-[#F8F5EE] border border-[#E5DFD2] rounded-lg p-3 space-y-1.5">
                <li>
                  • <strong>Blue blocks:</strong> Proposed for 30-day public
                  comment
                </li>
                <li>
                  • <strong>Amber / Orange:</strong> Pending permits or active
                  logging
                </li>
                <li>
                  • <strong>Map Layers:</strong> Turn on old growth, wildlife
                  habitat, drinking water, or wildfire overlays
                </li>
              </ul>
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#143929] hover:underline"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Open 4-Step Quick Guide</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Section 1: Cutblock / Proposal Record */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      activeCutblock
                        ? getStageBadgeStyle(activeCutblock.stage)
                        : "text-stone-500"
                    }`}
                  >
                    {activeCutblock
                      ? activeCutblock.stageLabel
                      : "No Cutblock Recorded"}
                    {activeCutblock && inspectResult.matchType === "nearby"
                      ? " (Nearby edge)"
                      : ""}
                  </span>

                  {inspectResult.allOverlappingCutblocks.length > 1 && (
                    <div className="inline-flex items-center gap-1 text-[11px] bg-[#FAF8F4] border border-stone-200 rounded-md px-1.5 py-0.5">
                      <button
                        onClick={() =>
                          setOverlapIndex((i) => Math.max(0, i - 1))
                        }
                        disabled={overlapIndex === 0}
                        className="disabled:opacity-30 text-stone-700"
                        aria-label="Previous overlapping cutblock"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-stone-700 font-medium">
                        {overlapIndex + 1} of{" "}
                        {inspectResult.allOverlappingCutblocks.length}
                      </span>
                      <button
                        onClick={() =>
                          setOverlapIndex((i) =>
                            Math.min(
                              inspectResult.allOverlappingCutblocks.length - 1,
                              i + 1
                            )
                          )
                        }
                        disabled={
                          overlapIndex >=
                          inspectResult.allOverlappingCutblocks.length - 1
                        }
                        className="disabled:opacity-30 text-stone-700"
                        aria-label="Next overlapping cutblock"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {activeCutblock ? (
                  <>
                    <h2 className="text-base font-semibold text-stone-900 mt-1 leading-snug">
                      {activeCutblock.name}
                    </h2>
                    <div className="mt-3 divide-y divide-stone-100 text-xs">
                      {(activeCutblock.licensee ||
                        selectedFomProject?.fspHolder) && (
                        <div className="py-2 flex justify-between gap-3">
                          <span className="text-stone-500 shrink-0">
                            Licensee / Holder
                          </span>
                          <span className="text-stone-900 font-medium text-right">
                            {activeCutblock.licensee ||
                              selectedFomProject?.fspHolder}
                          </span>
                        </div>
                      )}
                      {(activeCutblock.district ||
                        selectedFomProject?.district) && (
                        <div className="py-2 flex justify-between gap-3">
                          <span className="text-stone-500 shrink-0">
                            Resource District
                          </span>
                          <span className="text-stone-900 text-right">
                            {activeCutblock.district ||
                              selectedFomProject?.district}
                          </span>
                        </div>
                      )}
                      {activeCutblock.areaHa !== undefined && (
                        <div className="py-2 flex justify-between gap-3">
                          <span className="text-stone-500 shrink-0">
                            Cutblock Area
                          </span>
                          <span className="text-stone-900 font-medium text-right">
                            {activeCutblock.areaHa.toLocaleString()} ha (
                            {(activeCutblock.areaHa * 2.471).toFixed(0)} acres)
                          </span>
                        </div>
                      )}
                      {activeCutblock.harvestYear && (
                        <div className="py-2 flex justify-between gap-3">
                          <span className="text-stone-500 shrink-0">
                            Harvest Year
                          </span>
                          <span className="text-stone-900 font-medium text-right">
                            {activeCutblock.harvestYear}
                          </span>
                        </div>
                      )}
                    </div>

                    {activeCommentDates && (
                      <div className="mt-3 bg-sky-50 border border-sky-200 rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-sky-900">
                            Public Comment Window
                          </span>
                          <span className="font-medium text-sky-800">
                            {activeCommentDeadline.detailText}
                          </span>
                        </div>
                        <div className="text-xs text-sky-900/80">
                          {formatShortDateRange(
                            activeCutblock.commentOpenDate ||
                              selectedFomProject?.commentOpenDate,
                            activeCutblock.commentCloseDate ||
                              selectedFomProject?.commentCloseDate
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-stone-600 mt-1">
                    No logging cutblock or permit recorded at{" "}
                    {inspectResult.coordinates[1].toFixed(4)}°N,{" "}
                    {inspectResult.coordinates[0].toFixed(4)}°W.
                  </p>
                )}
              </div>

              {/* Section 1A: Partial Query or Wildfire Warnings */}
              {inspectResult.queryHealth?.failedLayers?.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50/90 px-3 py-2.5 text-xs text-amber-950 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">
                        Incomplete Check ({inspectResult.queryHealth.succeededLayers.length} of{" "}
                        {inspectResult.queryHealth.totalLayers} government map layers responded)
                      </div>
                      <div className="text-[11px] text-amber-900/90 mt-0.5">
                        Temporarily unavailable: {inspectResult.queryHealth.failedLayers.join(", ")}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      runLiveInspect(
                        inspectResult.coordinates[0],
                        inspectResult.coordinates[1]
                      )
                    }
                    className="text-[11px] font-semibold underline shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}

              {inspectResult.designations.recentWildfire && (
                <div className="rounded-lg border border-orange-300 bg-orange-50/90 px-3 py-2.5 text-xs text-orange-950 flex items-start gap-2">
                  <Flame className="w-4 h-4 text-orange-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">
                      Wildfire Area Overlap ({inspectResult.designations.recentWildfire.fireYear}
                      {inspectResult.designations.recentWildfire.fireNumber
                        ? ` · Fire #${inspectResult.designations.recentWildfire.fireNumber}`
                        : ""}
                      )
                    </div>
                    <div className="text-[11px] text-orange-900/90 mt-0.5">
                      {inspectResult.designations.recentWildfire.postDatesVri
                        ? "This area burned after the last forest survey, so recorded tree ages may be from before the fire. Switch to Satellite view to check for post-fire salvage logging."
                        : "Past wildfire mapped here prior to the current forest survey."}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 1B: Old-Growth & Habitat Sensitivity Card */}
              {(() => {
                const risk =
                  inspectResult.riskAssessment || createUnassessedRisk();
                const style = RISK_BADGE_STYLES[risk.category];
                const ps = inspectResult.projectScreening;
                return (
                  <div
                    className={`rounded-lg border p-3.5 space-y-2 ${style.cardClass}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: style.dotColor }}
                        />
                        <span>{risk.label}</span>
                        <InfoTooltip
                          label="About Sensitivity Rating"
                          title="Old-Growth & Habitat Sensitivity"
                          content="Rule-based rating combining tree age, growing productivity, parks, protected old growth, wildlife habitat, winter ranges, drinking-water watersheds, and wildfire checks. Lower sensitivity does not mean zero impact."
                          href="/forest-metrics#risk-methodology"
                          linkText="See full rating table →"
                        />
                      </div>
                      <span className="text-[10px] opacity-75">
                        {risk.assessmentScope === "multi_block_screening"
                          ? "Multi-block check"
                          : risk.assessmentScope === "full_inspection"
                          ? "Full check"
                          : risk.assessmentScope === "centroid_screening"
                          ? "Quick preview"
                          : "Unassessed"}{" "}
                        · Methods {risk.methodologyVersion || "v2.0"}
                      </span>
                    </div>

                    {ps && ps.totalBlocks > 1 && (
                      <div className="text-[11px] font-medium bg-white/60 rounded px-2 py-1 border border-black/10">
                        Checked {ps.sampledBlocks} of {ps.totalBlocks} proposed cutblocks
                        (showing highest-sensitivity block
                        {ps.minStandAge !== null && ps.maxStandAge !== null
                          ? ` · tree ages ${ps.minStandAge}–${ps.maxStandAge} yrs`
                          : ""}
                        )
                      </div>
                    )}

                    <ul className="list-disc pl-4 space-y-1 text-xs leading-snug">
                      {risk.reasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>

                    <div className="pt-1.5 text-[10px] leading-relaxed opacity-85 border-t border-black/10 space-y-0.5">
                      <div>
                        <strong>Checked automatically:</strong> Tree age &amp; productivity, parks, legally protected old growth, 2021 deferral recommendations, wildlife habitat, winter ranges, drinking-water watersheds, and recent wildfires.
                      </div>
                      <div>
                        <strong>Not checked here:</strong> Fish-bearing streams, landslide risk, watershed clearcut totals, Indigenous cultural sites, and private forest land.{" "}
                        <Link
                          href="/forest-metrics#risk-methodology"
                          className="underline font-medium"
                        >
                          How ratings work &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Section 2: Standing Forest Properties (Live VRI) */}
              <div className="border-t border-stone-200 pt-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Standing Forest Properties
                </h3>

                {inspectResult.forest.hasInventory ? (
                  <>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-[#F8F5EE] border border-[#E5DFD2] border-l-2 border-l-[#2D624B]/60 rounded-lg p-3">
                        <div className="flex items-center justify-between gap-1 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                          <span>Stand Age</span>
                          <InfoTooltip
                            label="About Stand Age"
                            title="Stand Age & Old Growth"
                            content="Estimated age of the main tree canopy, projected from the last survey year. BC defines old growth at 250+ years in wet coastal/mountain forests and 140+ years in drier interior/northern forests."
                            href="/forest-metrics"
                          />
                        </div>
                        <div className="text-base font-semibold text-stone-900 mt-0.5 tabular-nums">
                          {inspectResult.forest.standAgeYears !== null
                            ? `${inspectResult.forest.standAgeYears} yrs`
                            : "N/A"}
                        </div>
                        {inspectResult.forest.isOldGrowth !== null && (
                          <div className="text-[11px] text-stone-600 mt-0.5">
                            {inspectResult.forest.isOldGrowth
                              ? `Old growth (${inspectResult.forest.oldGrowthThresholdYears}+ yrs)`
                              : `Younger than ${inspectResult.forest.oldGrowthThresholdYears}-yr mark`}
                          </div>
                        )}
                      </div>

                      <div className="bg-[#F8F5EE] border border-[#E5DFD2] border-l-2 border-l-[#2D624B]/60 rounded-lg p-3">
                        <div className="flex items-center justify-between gap-1 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                          <span>Canopy Height</span>
                          <InfoTooltip
                            label="About Canopy Height"
                            title="Canopy Height & Cover"
                            content="Projected height of the tallest dominant trees in the upper canopy, alongside the percentage of ground shaded by tree crowns."
                          />
                        </div>
                        <div className="text-base font-semibold text-stone-900 mt-0.5 tabular-nums">
                          {inspectResult.forest.canopyHeightMeters !== null
                            ? `${inspectResult.forest.canopyHeightMeters} m`
                            : "N/A"}
                        </div>
                        <div className="text-[11px] text-stone-600 mt-0.5">
                          {inspectResult.forest.crownClosurePct !== null
                            ? `${inspectResult.forest.crownClosurePct}% tree cover`
                            : "Estimated tree height"}
                        </div>
                      </div>

                      <div className="bg-[#F8F5EE] border border-[#E5DFD2] border-l-2 border-l-[#2D624B]/60 rounded-lg p-3">
                        <div className="flex items-center justify-between gap-1 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                          <span>Growing Productivity</span>
                          <InfoTooltip
                            label="About Growing Productivity"
                            title="Growing Productivity (Site Index)"
                            content="Expected height (in meters) of dominant trees at age 50. Scores ≥20 m indicate fertile big-tree valley bottoms; <12 m indicates slow-growing alpine or bog sites. Note: Site Index can understate fertility in ancient stands."
                            href="/forest-metrics"
                          />
                        </div>
                        <div className="text-base font-semibold text-stone-900 mt-0.5 tabular-nums">
                          {inspectResult.forest.siteIndexMeters !== null
                            ? `${inspectResult.forest.siteIndexMeters} m`
                            : "N/A"}
                        </div>
                        <div className="text-[11px] text-stone-600 mt-0.5">
                          Height by age 50 (Site Index)
                          {inspectResult.forest.isHighProdForBec &&
                          (inspectResult.forest.siteIndexMeters ?? 0) < 20
                            ? " · High for this forest"
                            : ""}
                        </div>
                      </div>

                      <div className="bg-[#F8F5EE] border border-[#E5DFD2] border-l-2 border-l-[#2D624B]/60 rounded-lg p-3">
                        <div className="flex items-center justify-between gap-1 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                          <span>Forest Ecosystem</span>
                          <InfoTooltip
                            label="About Forest Ecosystem"
                            title="BC Ecosystem Zone"
                            content="Official BC Biogeoclimatic zone classifying regional climate, moisture, and natural wildfire frequency—which determines whether old growth begins at 140 or 250 years."
                            href="/forest-metrics"
                          />
                        </div>
                        <div className="text-sm font-semibold text-stone-900 mt-0.5 leading-snug">
                          {inspectResult.forest.becZoneName ||
                            inspectResult.forest.becZone ||
                            "N/A"}
                        </div>
                        <div className="text-[11px] text-stone-600 mt-0.5">
                          {inspectResult.forest.becZone
                            ? `${inspectResult.forest.becZone}${inspectResult.forest.plainDisturbanceLabel ? ` · ${inspectResult.forest.plainDisturbanceLabel}` : ""}`
                            : "Provincial ecosystem zone"}
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-stone-100 text-xs pt-1">
                      <div className="py-1.5 flex justify-between gap-4">
                        <span className="text-stone-500 shrink-0">
                          Main Tree Species
                        </span>
                        <span className="text-stone-900 font-medium text-right">
                          {inspectResult.forest.speciesComposition ||
                            inspectResult.forest.dominantSpecies ||
                            "N/A"}
                        </span>
                      </div>
                      {(inspectResult.forest.referenceYear ||
                        inspectResult.forest.projectedDate) && (
                        <div className="py-1.5 flex justify-between gap-4">
                          <span className="inline-flex items-center gap-1 text-stone-500 shrink-0">
                            <span>Forest Survey Year</span>
                            <InfoTooltip
                              label="About Forest Survey Year"
                              title="Aerial Survey Currency"
                              content="Year the original aerial photo or field survey was interpreted, before tree age was projected forward. Recent wildfires are cross-checked separately in case a fire happened after this survey."
                            />
                          </span>
                          <span className="text-stone-700 text-right">
                            {inspectResult.forest.referenceYear
                              ? `${inspectResult.forest.referenceYear}`
                              : "N/A"}
                            {inspectResult.forest.projectedDate
                              ? ` (updated to ${inspectResult.forest.projectedDate.slice(0, 4)})`
                              : ""}
                            {inspectResult.forest.referenceYear &&
                            new Date().getUTCFullYear() -
                              inspectResult.forest.referenceYear >
                              15
                              ? " · older aerial survey"
                              : ""}
                          </span>
                        </div>
                      )}
                    </div>

                    {inspectResult.forest.ecologicalNote && (
                      <p className="text-[11px] text-stone-600 bg-[#FAF8F4] border border-stone-200/80 rounded-lg px-2.5 py-2 leading-relaxed">
                        {inspectResult.forest.ecologicalNote}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-stone-600 bg-[#FAF8F4] border border-stone-200/80 rounded-lg p-3 leading-relaxed">
                    No public provincial forest inventory at this location (it may
                    be private land, water, alpine, or non-forested).
                  </p>
                )}

                {/* Conservation & Habitat Designations (Statutory vs. Recommended Deferral) */}
                {(inspectResult.designations.legalOgma ||
                  inspectResult.designations.protectedPark ||
                  inspectResult.designations.wildlifeHabitatArea ||
                  inspectResult.designations.ungulateWinterRange ||
                  inspectResult.designations.communityWatershed ||
                  inspectResult.designations.tapPriorityDeferral) && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                      <span>Protected &amp; Sensitive Overlays</span>
                      <InfoTooltip
                        label="About Protected and Sensitive Overlays"
                        title="Permanent vs. Temporary"
                        content="BC Parks, Current Old Growth Management Areas, and Wildlife Habitat Areas are legally regulated. 2021 Old-Growth Panel deferrals are temporary harvest-pause recommendations, not permanent protection."
                        href="/forest-metrics"
                      />
                    </div>
                    {inspectResult.designations.legalOgma && (
                      <div className="text-xs bg-teal-50 text-teal-900 border border-teal-200 rounded-lg px-2.5 py-1.5">
                        <strong>Legally Protected Old-Growth Area (Permanent):</strong>{" "}
                        {inspectResult.designations.legalOgma}
                      </div>
                    )}
                    {inspectResult.designations.protectedPark && (
                      <div className="text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                        <strong>BC Park or Protected Area (Permanent):</strong>{" "}
                        {inspectResult.designations.protectedPark}
                      </div>
                    )}
                    {inspectResult.designations.wildlifeHabitatArea && (
                      <div className="text-xs bg-rose-50 text-rose-900 border border-rose-200 rounded-lg px-2.5 py-1.5">
                        <strong>Protected Wildlife Habitat (Legally Regulated):</strong>{" "}
                        {inspectResult.designations.wildlifeHabitatArea}
                      </div>
                    )}
                    {inspectResult.designations.ungulateWinterRange && (
                      <div className="text-xs bg-amber-50 text-amber-900 border border-amber-200 rounded-lg px-2.5 py-1.5">
                        <strong>Winter Wildlife Range (Legally Regulated):</strong>{" "}
                        {inspectResult.designations.ungulateWinterRange}
                      </div>
                    )}
                    {inspectResult.designations.communityWatershed && (
                      <div className="text-xs bg-sky-50 text-sky-900 border border-sky-200 rounded-lg px-2.5 py-1.5">
                        <strong>Community Drinking-Water Watershed:</strong>{" "}
                        {inspectResult.designations.communityWatershed}
                      </div>
                    )}
                    {inspectResult.designations.tapPriorityDeferral && (
                      <div className="text-xs bg-emerald-50/70 text-emerald-900 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                        <strong>Recommended Old-Growth Deferral (2021 Panel — Temporary):</strong>{" "}
                        {inspectResult.designations.tapPriorityDeferral}
                        {inspectResult.designations.tapSubcategories?.length > 0 && (
                          <span className="block text-[11px] text-emerald-800/90 mt-0.5">
                            Reasons: {inspectResult.designations.tapSubcategories.join(" · ")} (temporary pause recommendation, not permanent protection)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Collapsible Audit & Raw Official Record Drawer */}
                <details className="border border-stone-200 rounded-lg bg-[#FAF8F4]/70 px-3 py-2 text-xs">
                  <summary className="cursor-pointer font-medium text-stone-700 hover:text-stone-950 select-none">
                    Technical Audit &amp; Official Government Record
                  </summary>
                  <div className="mt-2.5 space-y-2 text-[11px] text-stone-600">
                    <div className="grid grid-cols-1 gap-1 font-mono bg-white border border-stone-200 rounded p-2">
                      <div>
                        Queried: {inspectResult.queryHealth?.queriedAt || "N/A"}
                      </div>
                      <div>
                        Layers OK: {inspectResult.queryHealth?.succeededLayers.length ?? 0}/
                        {inspectResult.queryHealth?.totalLayers ?? 13}
                      </div>
                      {inspectResult.forest.vriFeatureId && (
                        <div>VRI Feature ID: {inspectResult.forest.vriFeatureId}</div>
                      )}
                      {activeCutblock && <div>Cutblock ID: {activeCutblock.id}</div>}
                    </div>
                    <pre className="max-h-40 overflow-auto bg-white border border-stone-200 rounded p-2 text-[10px] text-stone-700 leading-tight">
                      {JSON.stringify(inspectResult.rawAuditRecords, null, 2)}
                    </pre>
                    <button
                      onClick={handleDownloadEvidenceJson}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-[11px] font-medium transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download Evidence JSON</span>
                    </button>
                  </div>
                </details>
              </div>
            </div>
          )}

          {/* Actions Footer */}
          <div className="border-t border-stone-200 pt-4 mt-5 space-y-2">
            {activeCutblock &&
              (activeCutblock.stage === "fom_proposed" ||
                activeCutblock.stage === "ften_pending") && (
                <a
                  href={
                    activeCutblock.fomProjectUrl ||
                    selectedFomProject?.fomProjectUrl ||
                    "https://fom.nrs.gov.bc.ca/public/projects"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#143929] hover:bg-[#1D523B] text-white text-xs font-semibold transition-colors shadow-sm"
                >
                  <span>Open Official BC Comment Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

            {inspectResult && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={handleCopySummary}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#FAF8F4] hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-medium transition-colors"
                >
                  {copiedSummary ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="text-emerald-800 font-semibold">
                        Copied
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-600" />
                      <span>Copy Summary</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleCopyShareLink}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#FAF8F4] hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-medium transition-colors"
                >
                  {copiedShareLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="text-emerald-800 font-semibold">
                        Link Copied
                      </span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5 text-stone-600" />
                      <span>Copy Share Link</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="pt-1 text-center">
              <Link
                href="/about"
                className="text-xs text-stone-500 hover:text-stone-800 transition-colors"
              >
                About &amp; Help &rarr;
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
