export type CutblockStage =
  | "fom_proposed"
  | "ften_pending"
  | "ften_active"
  | "completed";

export type CompletedTimeframe = "2020" | "2015" | "all";

export type ForestOverlayKey =
  | "vri_old_growth"
  | "vri_high_si"
  | "vri_tall_canopy"
  | "tap_deferrals"
  | "ogma_legal"
  | "bc_parks"
  | "wha_approved"
  | "uwr_approved"
  | "community_watersheds"
  | "wildfire_recent"
  | "nr_regions"
  | "nr_districts"
  | "tsa_boundaries";

export interface MapLayerStyleSpec {
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  dashArray?: string;
  outlineOnly?: boolean;
  swatchPattern?: "solid" | "dashed" | "outline";
}

export const OVERLAY_STYLE_MAP: Record<ForestOverlayKey, MapLayerStyleSpec> = {
  vri_old_growth: {
    fill: "#15803d",
    fillOpacity: 0.48,
    stroke: "#14532d",
    strokeWidth: 1.2,
    swatchPattern: "solid",
  },
  vri_high_si: {
    fill: "#0d9488",
    fillOpacity: 0.44,
    stroke: "#115e59",
    strokeWidth: 1.2,
    swatchPattern: "solid",
  },
  vri_tall_canopy: {
    fill: "#65a30d",
    fillOpacity: 0.44,
    stroke: "#365314",
    strokeWidth: 1.2,
    swatchPattern: "solid",
  },
  tap_deferrals: {
    fill: "#7c3aed",
    fillOpacity: 0.42,
    stroke: "#4c1d95",
    strokeWidth: 1.6,
    dashArray: "6 3",
    swatchPattern: "dashed",
  },
  ogma_legal: {
    fill: "#059669",
    fillOpacity: 0.46,
    stroke: "#064e3b",
    strokeWidth: 1.5,
    swatchPattern: "solid",
  },
  bc_parks: {
    fill: "#10b981",
    fillOpacity: 0.34,
    stroke: "#047857",
    strokeWidth: 1.6,
    swatchPattern: "solid",
  },
  wha_approved: {
    fill: "#db2777",
    fillOpacity: 0.38,
    stroke: "#831843",
    strokeWidth: 1.5,
    dashArray: "4 2",
    swatchPattern: "dashed",
  },
  uwr_approved: {
    fill: "#4f46e5",
    fillOpacity: 0.36,
    stroke: "#312e81",
    strokeWidth: 1.5,
    swatchPattern: "solid",
  },
  community_watersheds: {
    fill: "#0891b2",
    fillOpacity: 0.38,
    stroke: "#164e63",
    strokeWidth: 1.8,
    swatchPattern: "solid",
  },
  wildfire_recent: {
    fill: "#e11d48",
    fillOpacity: 0.36,
    stroke: "#881337",
    strokeWidth: 1.4,
    swatchPattern: "solid",
  },
  nr_regions: {
    fill: "#0f172a",
    fillOpacity: 0,
    stroke: "#1e293b",
    strokeWidth: 2.2,
    outlineOnly: true,
    swatchPattern: "outline",
  },
  nr_districts: {
    fill: "#334155",
    fillOpacity: 0,
    stroke: "#475569",
    strokeWidth: 1.5,
    dashArray: "5 3",
    outlineOnly: true,
    swatchPattern: "dashed",
  },
  tsa_boundaries: {
    fill: "#92400e",
    fillOpacity: 0,
    stroke: "#b45309",
    strokeWidth: 1.8,
    dashArray: "8 4",
    outlineOnly: true,
    swatchPattern: "dashed",
  },
};

export const CUTBLOCK_STAGE_STYLE_MAP: Record<CutblockStage, MapLayerStyleSpec> = {
  fom_proposed: {
    fill: "#0284c7",
    fillOpacity: 0.48,
    stroke: "#0369a1",
    strokeWidth: 1.6,
    swatchPattern: "solid",
  },
  ften_pending: {
    fill: "#d97706",
    fillOpacity: 0.48,
    stroke: "#92400e",
    strokeWidth: 1.6,
    swatchPattern: "solid",
  },
  ften_active: {
    fill: "#ea580c",
    fillOpacity: 0.48,
    stroke: "#9a3412",
    strokeWidth: 1.6,
    swatchPattern: "solid",
  },
  completed: {
    fill: "#dc2626",
    fillOpacity: 0.44,
    stroke: "#991b1b",
    strokeWidth: 1.4,
    swatchPattern: "solid",
  },
};

export type EcologicalRiskCategory =
  | "very_high"
  | "high"
  | "moderate"
  | "low"
  | "unassessed";

export type SensitivityCategory = EcologicalRiskCategory;

export interface EcologicalRiskAssessment {
  category: EcologicalRiskCategory;
  label: string;
  rank: number; // 4=very_high, 3=high, 2=moderate, 1=low, 0=unassessed
  reasons: string[];
  assessmentScope:
    | "full_inspection"
    | "multi_block_screening"
    | "centroid_screening"
    | "unassessed";
  methodologyVersion: string;
  isPartialAssessment?: boolean;
  wildfireQualified?: boolean;
  failedLayers?: string[];
}

export interface ProjectScreeningSummary {
  totalBlocks: number;
  sampledBlocks: number;
  highestRiskCategory: EcologicalRiskCategory;
  categoryCounts: Record<EcologicalRiskCategory, number>;
  minStandAge: number | null;
  maxStandAge: number | null;
  maxSiteIndex: number | null;
  anyWildfireOverlap: boolean;
  anyDesignationOverlap: boolean;
}

export interface BcRegionBookmark {
  id: string;
  label: string;
  center: [number, number]; // [lng, lat]
  zoom: number;
}

export interface FomProjectSummary {
  fomId: string;
  name: string;
  fspHolder: string;
  district: string;
  regionId?: string;
  workflowState: string;
  commentOpenDate?: string;
  commentCloseDate?: string;
  fomProjectUrl: string;
  center?: [number, number]; // [lng, lat]
  blockCount?: number;
  totalPlannedHa?: number;
  riskAssessment?: EcologicalRiskAssessment;
  projectScreening?: ProjectScreeningSummary;
  forestPreview?: {
    standAgeYears: number | null;
    siteIndexMeters: number | null;
    canopyHeightMeters: number | null;
    becZone: string | null;
  };
}

export interface PreassessedFomSnapshot {
  schemaVersion: number;
  methodologyVersion: string;
  generatedAt: string;
  source: "fom_api" | "bcgw_wfs";
  totalProjects: number;
  openProjectsCount: number;
  assessedProjectsCount: number;
  projects: FomProjectSummary[];
}

export interface InspectCutblockRecord {
  stage: CutblockStage;
  stageLabel: string;
  id: string;
  name: string;
  licensee?: string;
  district?: string;
  areaHa?: number;
  harvestYear?: number;
  fomId?: string;
  cutblockId?: string;
  commentOpenDate?: string;
  commentCloseDate?: string;
  plannedHarvestDate?: string;
  fomProjectUrl?: string;
  rawStatus?: string;
  sourceLayer: string;
  geometry?: GeoJSON.Geometry;
}

export interface InspectForestProperties {
  hasInventory: boolean;
  standAgeYears: number | null;
  canopyHeightMeters: number | null;
  siteIndexMeters: number | null;
  dominantSpecies: string | null;
  speciesComposition: string | null;
  crownClosurePct: number | null;
  referenceYear: number | null;
  projectedDate: string | null;
  landCoverClass: string | null;
  vriFeatureId: string | null;
  becZone: string | null;
  becZoneCode: string | null;
  becZoneName: string | null;
  becSubzone: string | null;
  ndt: string | null;
  ndtLabel: string | null;
  plainDisturbanceLabel: string | null;
  becRelativeHighSiThreshold: number | null;
  isHighProdForBec: boolean | null;
  ecologicalNote: string | null;
  landscapeRarityLabel?: string | null;
  landscapeRarityNote?: string | null;
  areaHa: number | null;
  oldGrowthThresholdYears: number | null;
  isOldGrowth: boolean | null;
  geometry?: GeoJSON.Geometry;
}

export interface WildfireOverlapInfo {
  fireYear: number;
  fireNumber: string | null;
  source: "current" | "historical";
  postDatesVri: boolean;
  burnSeverity?: "High" | "Medium" | "Low" | "Unburned" | null;
  burnSeveritySource?: "historical_1yr" | "same_year" | null;
}

export interface InspectDesignations {
  tapPriorityDeferral: string | null;
  tapSubcategories: string[];
  legalOgma: string | null;
  legalOgmaId: string | null;
  protectedPark: string | null;
  wildlifeHabitatArea: string | null;
  ungulateWinterRange: string | null;
  communityWatershed: string | null;
  recentWildfire: WildfireOverlapInfo | null;
}

export interface InspectQueryHealth {
  queriedAt: string;
  succeededLayers: string[];
  failedLayers: string[];
  totalLayers: number;
}

export interface InspectRawAuditRecords {
  cutblock?: Record<string, unknown> | null;
  vri?: Record<string, unknown> | null;
  bec?: Record<string, unknown> | null;
  tap?: Record<string, unknown> | null;
  ogma?: Record<string, unknown> | null;
  park?: Record<string, unknown> | null;
  wha?: Record<string, unknown> | null;
  uwr?: Record<string, unknown> | null;
  communityWatershed?: Record<string, unknown> | null;
  wildfire?: Record<string, unknown> | null;
  burnSeverity?: Record<string, unknown> | null;
}

export interface InspectResult {
  coordinates: [number, number];
  matchType: "exact" | "nearby";
  cutblock: InspectCutblockRecord | null;
  allOverlappingCutblocks: InspectCutblockRecord[];
  forest: InspectForestProperties;
  designations: InspectDesignations;
  riskAssessment: EcologicalRiskAssessment;
  queryHealth: InspectQueryHealth;
  rawAuditRecords: InspectRawAuditRecords;
  projectScreening?: ProjectScreeningSummary | null;
  error?: string;
}

export const BC_REGION_BOOKMARKS: BcRegionBookmark[] = [
  {
    id: "all-bc",
    label: "All of British Columbia",
    center: [-124.2, 52.4],
    zoom: 5.3,
  },
  {
    id: "west-coast",
    label: "West Coast Region",
    center: [-126.2, 50.1],
    zoom: 6.8,
  },
  {
    id: "south-coast",
    label: "South Coast Region",
    center: [-122.9, 49.7],
    zoom: 7.7,
  },
  {
    id: "thompson-okanagan",
    label: "Thompson–Okanagan Region",
    center: [-119.9, 50.5],
    zoom: 7.3,
  },
  {
    id: "kootenay-boundary",
    label: "Kootenay–Boundary Region",
    center: [-116.8, 50.1],
    zoom: 7.3,
  },
  {
    id: "cariboo",
    label: "Cariboo Region",
    center: [-122.6, 52.2],
    zoom: 7.1,
  },
  {
    id: "skeena",
    label: "Skeena Region",
    center: [-128.1, 56.2],
    zoom: 6.1,
  },
  {
    id: "omineca",
    label: "Omineca Region",
    center: [-123.5, 54.6],
    zoom: 6.6,
  },
  {
    id: "northeast",
    label: "Northeast Region",
    center: [-122.0, 57.6],
    zoom: 6.2,
  },
];

export const BCGW_LAYER_CATALOG = [
  {
    name: "Proposed Cutblocks (30-Day Public Review)",
    layerId: "WHSE_FOREST_TENURE.FOM_CUTBLOCK_SP",
    description:
      "Proposed logging areas posted by forestry companies and BC Timber Sales for 30-day public comment on the BC Forest Operations Map.",
  },
  {
    name: "Pending & Approved Logging Permits",
    layerId: "WHSE_FOREST_TENURE.FTEN_CUT_BLOCK_POLY_SVW",
    description:
      "Cutblock boundaries showing whether a provincial cutting permit is still pending approval, currently active, or retired.",
  },
  {
    name: "Completed Cutblocks (Past Logging)",
    layerId: "WHSE_FOREST_VEGETATION.VEG_CONSOLIDATED_CUT_BLOCKS_SP",
    description:
      "Historical and recent areas where logging has already taken place across BC Crown and Tree Farm Licence lands.",
  },
  {
    name: "BC Forest Inventory (Standing Trees)",
    layerId: "WHSE_FOREST_VEGETATION.VEG_COMP_LYR_R1_POLY",
    description:
      "Provincial forest survey (Vegetation Resources Inventory) recording stand age, tree height, growing productivity, tree species mix, and survey year.",
  },
  {
    name: "Forest Ecosystem Zones & Wildfire Regimes",
    layerId: "WHSE_FOREST_VEGETATION.BEC_BIOGEOCLIMATIC_POLY",
    description:
      "Official BC ecosystem classification mapping local climate, moisture, and natural wildfire cycles.",
  },
  {
    name: "Recommended Old-Growth Deferrals (2021 Panel)",
    layerId: "WHSE_FOREST_VEGETATION.OGSR_TAP_PRIORITY_DEF_AREA_SP",
    description:
      "Big-treed old growth, ancient forests, and rare remnant ecosystems recommended for temporary logging pauses by BC's 2021 scientific panel.",
  },
  {
    name: "Legally Protected Old-Growth Areas (Current)",
    layerId: "WHSE_LAND_USE_PLANNING.RMP_OGMA_LEGAL_CURRENT_SVW",
    description:
      "Currently active, legally established Old Growth Management Areas restricting commercial timber harvesting.",
  },
  {
    name: "BC Parks & Ecological Reserves",
    layerId: "WHSE_TANTALIS.TA_PARK_ECORES_PA_SVW",
    description:
      "Provincial parks, conservancies, ecological reserves, and permanently protected areas across British Columbia.",
  },
  {
    name: "Protected Wildlife Habitat (Species at Risk)",
    layerId: "WHSE_WILDLIFE_MANAGEMENT.WCP_WILDLIFE_HABITAT_AREA_POLY",
    description:
      "Legally established Wildlife Habitat Areas protecting critical habitat for species at risk such as Marbled Murrelet and Mountain Caribou.",
  },
  {
    name: "Protected Winter Wildlife Ranges",
    layerId: "WHSE_WILDLIFE_MANAGEMENT.WCP_UNGULATE_WINTER_RANGE_SP",
    description:
      "Legally established winter habitat areas regulating forest cover for caribou, moose, deer, elk, and mountain goats.",
  },
  {
    name: "Community Drinking-Water Watersheds",
    layerId: "WHSE_WATER_MANAGEMENT.WLS_COMMUNITY_WS_PUB_SVW",
    description:
      "Drainage areas upstream of licensed community drinking-water intakes requiring special watershed protection.",
  },
  {
    name: "BC Wildfire Perimeters (Past & Current)",
    layerId: "WHSE_LAND_AND_NATURAL_RESOURCE.PROT_HISTORICAL_FIRE_POLYS_SP",
    description:
      "Official BC Wildfire Service burn boundaries used to check whether a forest burned after its last inventory survey.",
  },
  {
    name: "BC Wildfire Burn Severity",
    layerId: "WHSE_FOREST_VEGETATION.VEG_BURN_SEVERITY_SP",
    description:
      "One-year post-fire satellite burn severity classes (Unburned, Low, Medium, High) used to distinguish stand-replacing wildfires from low-intensity surface fires.",
  },
  {
    name: "BC Forestry Regions (8 Official Regions)",
    layerId: "WHSE_ADMIN_BOUNDARIES.ADM_NR_REGIONS_SPG",
    description:
      "The 8 official Ministry of Forests administrative Natural Resource Regions across British Columbia.",
  },
  {
    name: "Forestry Districts (23 Districts)",
    layerId: "WHSE_ADMIN_BOUNDARIES.ADM_NR_DISTRICTS_SPG",
    description:
      "The 23 local Natural Resource Districts nested inside BC's 8 forestry regions.",
  },
  {
    name: "Timber Supply Areas",
    layerId: "WHSE_ADMIN_BOUNDARIES.FADM_TSA",
    description:
      "Forestry management units used by the province to set sustainable harvest limits and landscape plans.",
  },
];

/**
 * Verbatim published provincial old-growth benchmarks.
 * Kept strictly separated by study/baseline methodology (TAP 2021 vs. Price, Holt & Daust 2020)
 * rather than synthesizing unverified regional breakdowns.
 */
export const PUBLISHED_PROVINCIAL_BENCHMARKS = {
  tap2021: {
    citation:
      "Old Growth Technical Advisory Panel — Priority Deferrals: An Ecological Approach (Nov 2021)",
    baselineScope:
      "Public Crown forest land across BC (excludes private and federal lands)",
    totalCrownOldGrowthHa: 11_100_000,
    alreadyProtectedHa: 3_500_000,
    alreadyProtectedPctOfRemaining: 32,
    tapRecommendedDeferralHa: 2_600_000,
    tapRecommendedPctOfRemaining: 23,
    thlbNote:
      "Roughly half of the 2.6 million hectares recommended for temporary deferral lies in areas open to commercial logging; the other half is already outside the commercial logging landbase.",
    permanenceNote:
      "Recommended deferrals are temporary pauses on logging to allow land-use planning with First Nations—different from permanent protection in BC Parks, ecological reserves, or legally established Old Growth Management Areas.",
    url: "https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/forestry/stewardship/old-growth-forests/summary_for_g2g_package.pdf",
  },
  priceHoltDaust2020: {
    citation:
      "Price, K., Holt, R. F., & Daust, D. — BC's Old Growth Forest: A Last Stand for Biodiversity (Apr 2020)",
    baselineScope:
      "2019 provincial forest inventory (~13.2 million hectares mapped as old age before 2021 public-land refinements)",
    totalAnalyzedOldGrowthHa: 13_200_000,
    lowProdSharePct: 80,
    lowProdNote:
      "About 80% (over 10 million hectares) of BC's old growth grows on cold high-elevation slopes, bogs, or dry sites where trees stay relatively small.",
    highProdTotalHa: 415_000,
    highProdSi20to25Ha: 380_000,
    veryHighProdSiOver25Ha: 35_000,
    highProdSharePct: 3.1,
    caveatNote:
      "Fertile sites capable of growing giant trees (Site Index above 20 m, especially above 25 m in valley bottoms) make up only ~3% of remaining old growth and have been logged the most heavily.",
  },
} as const;

export interface NaturalResourceRegionInfo {
  id: string;
  name: string;
  shortName: string;
  districts: string[];
  districtKeywords: string[];
  dominantBec: string;
  ecosystemSummary: string;
  leadingSpecies: string;
}

/**
 * Official 8 Ministry of Forests Natural Resource Regions and their 23 constituent
 * Natural Resource Districts (factual administrative geography only).
 */
export const BC_NATURAL_RESOURCE_REGIONS: NaturalResourceRegionInfo[] = [
  {
    id: "west-coast",
    name: "West Coast Natural Resource Region",
    shortName: "West Coast",
    districts: [
      "Campbell River",
      "Haida Gwaii",
      "North Island - Central Coast",
      "South Island",
    ],
    districtKeywords: [
      "south island",
      "campbell river",
      "north island",
      "central coast",
      "haida gwaii",
      "port alberni",
      "alberni",
      "nanaimo",
      "comox",
      "vancouver island",
      "west coast",
      "dcr",
      "dhg",
      "dni",
      "dsi",
    ],
    dominantBec: "CWH, MH, CDF",
    ecosystemSummary: "Coastal rainforest, Douglas-fir & mountain hemlock",
    leadingSpecies: "Western Hemlock, Western Redcedar, Douglas-fir",
  },
  {
    id: "south-coast",
    name: "South Coast Natural Resource Region",
    shortName: "South Coast",
    districts: ["Chilliwack", "Sea to Sky", "Sunshine Coast"],
    districtKeywords: [
      "chilliwack",
      "sea to sky",
      "sunshine coast",
      "squamish",
      "fraser",
      "vancouver",
      "powell river",
      "south coast",
      "dch",
      "dsq",
      "dsc",
    ],
    dominantBec: "CWH, MH, IDF",
    ecosystemSummary: "Coastal rainforest, mountain hemlock & dry valleys",
    leadingSpecies: "Douglas-fir, Western Hemlock, Western Redcedar",
  },
  {
    id: "thompson-okanagan",
    name: "Thompson–Okanagan Natural Resource Region",
    shortName: "Thompson–Okanagan",
    districts: ["Cascades", "Okanagan Shuswap", "Thompson Rivers"],
    districtKeywords: [
      "cascades",
      "okanagan",
      "shuswap",
      "thompson",
      "kamloops",
      "merritt",
      "vernon",
      "penticton",
      "kelowna",
      "salmon arm",
      "clearwater",
      "lillooet",
      "dcs",
      "dos",
      "dka",
    ],
    dominantBec: "IDF, MS, ESSF, ICH",
    ecosystemSummary: "Dry Douglas-fir valleys, plateaus & wet-belt cedar",
    leadingSpecies: "Douglas-fir, Lodgepole Pine, Engelmann Spruce",
  },
  {
    id: "kootenay-boundary",
    name: "Kootenay–Boundary Natural Resource Region",
    shortName: "Kootenay–Boundary",
    districts: ["Rocky Mountain", "Selkirk"],
    districtKeywords: [
      "selkirk",
      "rocky mountain",
      "kootenay",
      "revelstoke",
      "cranbrook",
      "nelson",
      "invermere",
      "castlegar",
      "golden",
      "fernie",
      "grand forks",
      "arrow",
      "boundary",
      "drm",
      "dse",
    ],
    dominantBec: "ICH, ESSF, MS, IDF",
    ecosystemSummary: "Inland temperate rainforest, subalpine & dry valleys",
    leadingSpecies: "Western Redcedar, Hemlock, Engelmann Spruce, Larch",
  },
  {
    id: "cariboo",
    name: "Cariboo Natural Resource Region",
    shortName: "Cariboo",
    districts: ["100 Mile House", "Cariboo-Chilcotin", "Quesnel"],
    districtKeywords: [
      "cariboo",
      "chilcotin",
      "quesnel",
      "100 mile",
      "williams lake",
      "horsefly",
      "alexis creek",
      "dmh",
      "dcc",
      "dqu",
    ],
    dominantBec: "SBPS, IDF, SBS, ESSF",
    ecosystemSummary: "Interior pine–spruce plateaus & dry Douglas-fir",
    leadingSpecies: "Lodgepole Pine, Hybrid Spruce, Douglas-fir",
  },
  {
    id: "skeena",
    name: "Skeena Natural Resource Region",
    shortName: "Skeena",
    districts: ["Coast Mountains", "Nadina", "Skeena Stikine"],
    districtKeywords: [
      "skeena",
      "stikine",
      "coast mountains",
      "nadina",
      "kispiox",
      "kalum",
      "bulkley",
      "burns lake",
      "smithers",
      "terrace",
      "kitimat",
      "houston",
      "hazelton",
      "dease lake",
      "atlin",
      "dkm",
      "dnd",
      "dss",
    ],
    dominantBec: "ICH, CWH, SBS, ESSF",
    ecosystemSummary: "North-coast & inland rainforests, spruce plateaus",
    leadingSpecies: "Western Hemlock, Hybrid Spruce, Redcedar, Pine",
  },
  {
    id: "omineca",
    name: "Omineca Natural Resource Region",
    shortName: "Omineca",
    districts: ["Mackenzie", "Prince George", "Stuart Nechako"],
    districtKeywords: [
      "prince george",
      "stuart nechako",
      "stuart-nechako",
      "mackenzie",
      "omineca",
      "robson",
      "vanderhoof",
      "fort st. james",
      "fort st james",
      "mcbride",
      "valemount",
      "dmk",
      "dpg",
      "dja",
    ],
    dominantBec: "SBS, ESSF, BWBS, ICH",
    ecosystemSummary: "Sub-boreal spruce, subalpine fir & Robson wet belt",
    leadingSpecies: "Hybrid White Spruce, Lodgepole Pine, Subalpine Fir",
  },
  {
    id: "northeast",
    name: "Northeast Natural Resource Region",
    shortName: "Northeast",
    districts: ["Fort Nelson", "Peace"],
    districtKeywords: [
      "peace",
      "fort nelson",
      "fort st. john",
      "fort st john",
      "dawson creek",
      "chetwynd",
      "tumbler ridge",
      "northeast",
      "north east",
      "dfn",
      "dpc",
    ],
    dominantBec: "BWBS, ESSF, SWB",
    ecosystemSummary: "Boreal white & black spruce plains, northern mountains",
    leadingSpecies: "White Spruce, Lodgepole Pine, Trembling Aspen",
  },
];

export function normalizeBcRegionNameToId(
  rawName?: string | null
): string | null {
  if (!rawName) return null;
  const cleaned = rawName
    .toLowerCase()
    .replace(/natural resource region/g, "")
    .replace(/region/g, "")
    .replace(/[–—]/g, "-")
    .trim();

  if (cleaned.includes("west coast") || cleaned === "coast") return "west-coast";
  if (cleaned.includes("south coast")) return "south-coast";
  if (cleaned.includes("thompson") || cleaned.includes("okanagan")) {
    return "thompson-okanagan";
  }
  if (cleaned.includes("kootenay") || cleaned.includes("boundary")) {
    return "kootenay-boundary";
  }
  if (cleaned.includes("cariboo")) return "cariboo";
  if (cleaned.includes("skeena")) return "skeena";
  if (cleaned.includes("omineca")) return "omineca";
  if (cleaned.includes("northeast") || cleaned.includes("north east")) {
    return "northeast";
  }
  return null;
}

export function matchDistrictToRegionId(
  district?: string | null
): string | null {
  if (!district) return null;
  const byRegionName = normalizeBcRegionNameToId(district);
  if (byRegionName) return byRegionName;

  const d = district.toLowerCase().trim();
  for (const reg of BC_NATURAL_RESOURCE_REGIONS) {
    if (
      reg.districtKeywords.some((kw) => {
        if (kw.length <= 3) {
          return new RegExp(`\\b${kw}\\b`, "i").test(d);
        }
        return d.includes(kw);
      })
    ) {
      return reg.id;
    }
  }
  return null;
}

/**
 * Geographic fallback mapping [lng, lat] -> one of BC's 8 official Natural Resource Regions
 * when neither district text nor ADM_NR_REGIONS_SPG polygon lookup is available.
 */
export function inferRegionIdFromCoords(lng: number, lat: number): string {
  // Northeast (Peace / Fort Nelson east of Rockies)
  if (lat >= 54.8 && lng >= -124.2 && (lat >= 56.0 || lng >= -122.4)) {
    return "northeast";
  }
  // Skeena (Northwest BC + Coast Mountains)
  if (lat >= 53.6 && lng < -125.8) {
    return "skeena";
  }
  // Omineca (Central-North Interior: Prince George, Mackenzie, Stuart-Nechako)
  if (lat >= 53.3) {
    return "omineca";
  }
  // Kootenay-Boundary (Southeastern BC)
  if (lng >= -118.8 && lat < 52.8) {
    return "kootenay-boundary";
  }
  // Cariboo (Central Plateau)
  if (lat >= 51.3 && lng >= -125.6 && lng < -118.8) {
    return "cariboo";
  }
  // Thompson-Okanagan (South-Central Interior)
  if (lng >= -121.6 && lng < -118.8 && lat < 51.8) {
    return "thompson-okanagan";
  }
  // South Coast (Lower Mainland, Sea-to-Sky, Sunshine Coast)
  if (lng >= -124.9 && lat < 51.3 && lat >= 49.0 && lng >= -124.4) {
    return "south-coast";
  }
  // West Coast (Vancouver Island, Haida Gwaii, Central Coast)
  return "west-coast";
}

export function isFomOpenForComment(proj: {
  commentCloseDate?: string;
  workflowState?: string;
}): boolean {
  if (proj.commentCloseDate) {
    const now = new Date();
    const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const parsed = new Date(`${proj.commentCloseDate}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getTime() >= todayUtc;
    }
  }
  const state = (proj.workflowState || "").toUpperCase();
  if (
    state.includes("CLOSED") ||
    state.includes("EXPIRED") ||
    state.includes("FINALIZED") ||
    state.includes("RETIRED") ||
    state.includes("INITIAL")
  ) {
    return false;
  }
  return (
    state.includes("OPEN") ||
    state.includes("PUBLIC") ||
    state.includes("PUBLISHED") ||
    state.includes("COMMENT") ||
    state.includes("SUBMIT")
  );
}

export interface AuditedRegionalRow {
  regionId: string;
  regionName: string;
  totalOldGrowthHa: number;
  permanentlyProtectedOldGrowthHa: number;
  permanentlyProtectedPct: number;
  tapRecommendedDeferralHa: number;
  byProductivityTier: Array<{
    tierLabel: string;
    siteIndexRange: string;
    hectares: number;
    permanentlyProtectedPct: number;
  }>;
}

export interface AuditedRegionalDataFile {
  generatedAt: string;
  methodologyVersion: string;
  sources: Array<{
    layer: string;
    fileName: string;
    sha256: string;
  }>;
  regions: AuditedRegionalRow[];
}
