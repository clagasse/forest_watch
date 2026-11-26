export type NaturalDisturbanceType =
  | "NDT1"
  | "NDT2"
  | "NDT3"
  | "NDT4"
  | "NDT5"
  | "UNKNOWN";

export interface BecLandscapeRarityInfo {
  tier: "critical_remnant" | "high_depletion_zone";
  label: string;
  note: string;
  citation: string;
}

export interface BecNdtInfo {
  becZoneCode: string;
  becZoneName: string | null;
  becSubzone: string;
  ndt: NaturalDisturbanceType;
  ndtLabel: string;
  plainDisturbanceLabel: string;
  oldGrowthThresholdYears: number;
  ancientThresholdYears: number;
  becRelativeHighSiThreshold: number;
  ecologicalNote?: string;
  landscapeRarity?: BecLandscapeRarityInfo | null;
}

export const BEC_ZONE_FULL_NAMES: Record<string, string> = {
  CWH: "Coastal Western Hemlock",
  CDF: "Coastal Douglas-fir",
  MH: "Mountain Hemlock",
  ICH: "Interior Cedar–Hemlock",
  ESSF: "Subalpine Spruce–Fir",
  IDF: "Interior Douglas-fir",
  PP: "Ponderosa Pine",
  BG: "Bunchgrass",
  SBS: "Sub-Boreal Spruce",
  SBPS: "Sub-Boreal Pine–Spruce",
  BWBS: "Boreal White & Black Spruce",
  MS: "Montane Spruce",
  SWB: "Spruce–Willow–Birch",
  CMA: "Coastal Mountain-heather Alpine",
  IMA: "Interior Mountain-heather Alpine",
  BAFA: "Boreal Altai Fescue Alpine",
  AT: "Alpine Tundra",
};

export function getBecZoneFullName(
  code: string | null | undefined
): string | null {
  if (!code) return null;
  const cleaned = code.trim().toUpperCase();
  return BEC_ZONE_FULL_NAMES[cleaned] || null;
}

const NDT_LABELS: Record<NaturalDisturbanceType, string> = {
  NDT1: "NDT1 · Rare stand-initiating events",
  NDT2: "NDT2 · Infrequent stand-initiating events",
  NDT3: "NDT3 · Frequent stand-initiating events",
  NDT4: "NDT4 · Frequent stand-maintaining fires",
  NDT5: "NDT5 · Alpine tundra / subalpine parkland",
  UNKNOWN: "Unclassified natural disturbance regime",
};

const PLAIN_DISTURBANCE_LABELS: Record<NaturalDisturbanceType, string> = {
  NDT1: "Rare natural wildfires",
  NDT2: "Infrequent wildfires",
  NDT3: "Frequent wildfires",
  NDT4: "Frequent low-intensity ground fires",
  NDT5: "High-elevation alpine parkland",
  UNKNOWN: "Standard provincial wildfire cycle",
};

export function formatNdtLabel(ndt: NaturalDisturbanceType): string {
  return NDT_LABELS[ndt] || NDT_LABELS.UNKNOWN;
}

export function formatPlainDisturbanceLabel(
  ndt: NaturalDisturbanceType
): string {
  return PLAIN_DISTURBANCE_LABELS[ndt] || PLAIN_DISTURBANCE_LABELS.UNKNOWN;
}

function normalizeOfficialNdt(
  raw: string | null | undefined
): NaturalDisturbanceType | null {
  if (!raw) return null;
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned === "NDT1" || cleaned === "1") return "NDT1";
  if (cleaned === "NDT2" || cleaned === "2") return "NDT2";
  if (cleaned === "NDT3" || cleaned === "3") return "NDT3";
  if (cleaned === "NDT4" || cleaned === "4") return "NDT4";
  if (cleaned === "NDT5" || cleaned === "5") return "NDT5";
  return null;
}

/**
 * Resolves BC 1995 Biodiversity Guidebook Natural Disturbance Type (NDT1-NDT5),
 * old-growth age threshold, ancient threshold, and BEC-relative high Site Index
 * threshold from BEC zone/subzone and optional official BEC_BIOGEOCLIMATIC_POLY NDT.
 */
export function resolveBecNdt(
  becZoneCodeRaw: string | null | undefined,
  becSubzoneRaw?: string | null,
  officialNdtRaw?: string | null
): BecNdtInfo {
  const becZoneCode = (becZoneCodeRaw || "").trim().toUpperCase();
  const becSubzone = (becSubzoneRaw || "").trim().toLowerCase();
  const officialNdt = normalizeOfficialNdt(officialNdtRaw);

  let inferredNdt: NaturalDisturbanceType = "UNKNOWN";
  let oldGrowthThresholdYears = 140;
  let ancientThresholdYears = 250;
  let becRelativeHighSiThreshold = 20;
  let ecologicalNote: string | undefined;

  if (becZoneCode === "CWH" || becZoneCode === "CDF" || becZoneCode === "MH") {
    const isWet =
      becZoneCode === "MH" ||
      becSubzone.startsWith("vh") ||
      becSubzone.startsWith("vm") ||
      becSubzone.startsWith("wh") ||
      becSubzone.startsWith("wm") ||
      becSubzone.startsWith("mm");
    inferredNdt = isWet ? "NDT1" : "NDT2";
    oldGrowthThresholdYears = 250;
    ancientThresholdYears = 400;
    becRelativeHighSiThreshold = becZoneCode === "MH" ? 16 : 20;
  } else if (becZoneCode === "ICH") {
    const isVeryWet =
      becSubzone.startsWith("vk") ||
      becSubzone.startsWith("wk") ||
      becSubzone.startsWith("vc") ||
      becSubzone.startsWith("wc");
    inferredNdt = isVeryWet ? "NDT1" : "NDT2";
    oldGrowthThresholdYears = 250;
    ancientThresholdYears = 400;
    becRelativeHighSiThreshold = 20;
  } else if (becZoneCode === "ESSF") {
    const isWetEssf =
      becSubzone.startsWith("w") || becSubzone.startsWith("v");
    if (isWetEssf) {
      inferredNdt = "NDT1";
      oldGrowthThresholdYears = 250;
      ancientThresholdYears = 400;
      becRelativeHighSiThreshold = 15;
    } else {
      inferredNdt = "NDT2";
      oldGrowthThresholdYears = 140;
      ancientThresholdYears = 250;
      becRelativeHighSiThreshold = 15;
      ecologicalNote =
        "Drier subalpine spruce–fir forests typically use a 140-year old-growth threshold (wet subalpine forests use 250 years).";
    }
  } else if (
    becZoneCode === "IDF" ||
    becZoneCode === "PP" ||
    becZoneCode === "BG"
  ) {
    inferredNdt = "NDT4";
    oldGrowthThresholdYears = 140;
    ancientThresholdYears = 250;
    becRelativeHighSiThreshold = 16;
    ecologicalNote =
      "Dry forests shaped by frequent ground fires often contain a mix of tree ages; average stand age can miss older veteran trees.";
  } else if (
    becZoneCode === "SBS" ||
    becZoneCode === "SBPS" ||
    becZoneCode === "MS"
  ) {
    inferredNdt = "NDT3";
    oldGrowthThresholdYears = 140;
    ancientThresholdYears = 250;
    becRelativeHighSiThreshold = 16;
  } else if (becZoneCode === "BWBS" || becZoneCode === "SWB") {
    inferredNdt = "NDT3";
    oldGrowthThresholdYears = 140;
    ancientThresholdYears = 250;
    becRelativeHighSiThreshold = 14;
  } else if (
    becZoneCode === "CMA" ||
    becZoneCode === "IMA" ||
    becZoneCode === "BAFA" ||
    becZoneCode === "AT"
  ) {
    inferredNdt = "NDT5";
    oldGrowthThresholdYears = 250;
    ancientThresholdYears = 400;
    becRelativeHighSiThreshold = 12;
  }

  const ndt = officialNdt || inferredNdt;

  // If official NDT1 was returned by BEC_BIOGEOCLIMATIC_POLY for a zone
  // not otherwise classified as 250y (e.g., transitional moist ESSF), respect NDT1.
  if (officialNdt === "NDT1") {
    oldGrowthThresholdYears = 250;
    ancientThresholdYears = 400;
  }

  let landscapeRarity: BecLandscapeRarityInfo | null = null;
  if (becZoneCode === "CDF") {
    landscapeRarity = {
      tier: "critical_remnant",
      label: "Critically Rare Ecosystem (<1% historic old growth remaining)",
      note: "Coastal Douglas-fir is BC's smallest and most heavily altered forest zone, with less than 1% of historic old growth remaining—well below the 10% remnant and 30% biodiversity risk benchmarks.",
      citation: "BC Old Growth TAP (2021); Price, Holt & Daust (2020, 2021)",
    };
  } else if (
    becZoneCode === "CWH" &&
    (becSubzone.startsWith("xm") || becSubzone.startsWith("dm"))
  ) {
    landscapeRarity = {
      tier: "high_depletion_zone",
      label: "Heavily Depleted Low-Elevation Coastal Subzone",
      note: "Dry maritime low-elevation coastal subzones (CWHxm/CWHdm) have experienced extensive historical harvest and commonly fall below landscape old-growth retention benchmarks.",
      citation: "Price, Holt & Daust (2020, 2021); BC Old Growth TAP (2021)",
    };
  } else if (
    (becZoneCode === "ICH" &&
      (becSubzone.startsWith("xw") || becSubzone.startsWith("dw"))) ||
    (becZoneCode === "IDF" && becSubzone.startsWith("xh")) ||
    (becZoneCode === "PP" && becSubzone.startsWith("xh"))
  ) {
    landscapeRarity = {
      tier: "high_depletion_zone",
      label: "Heavily Depleted Dry Valley-Bottom Subzone",
      note: "Warm, low-elevation southern interior valley-bottom forests are heavily altered across BC, making remaining mature and old-growth stands disproportionately rare.",
      citation: "BC Old Growth TAP (2021); Price, Holt & Daust (2021)",
    };
  }

  return {
    becZoneCode: becZoneCode || "UNKNOWN",
    becZoneName: getBecZoneFullName(becZoneCode),
    becSubzone,
    ndt,
    ndtLabel: formatNdtLabel(ndt),
    plainDisturbanceLabel: formatPlainDisturbanceLabel(ndt),
    oldGrowthThresholdYears,
    ancientThresholdYears,
    becRelativeHighSiThreshold,
    ecologicalNote,
    landscapeRarity,
  };
}
