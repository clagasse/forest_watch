import {
  EcologicalRiskAssessment,
  EcologicalRiskCategory,
  InspectDesignations,
  InspectForestProperties,
} from "@/data/bcForestryData";
import { resolveBecNdt } from "@/lib/becNdt";

export const SENSITIVITY_METHODOLOGY_VERSION = "v2.0";

export const RISK_BADGE_STYLES: Record<
  EcologicalRiskCategory,
  {
    label: string;
    shortLabel: string;
    badgeClass: string;
    cardClass: string;
    dotColor: string;
  }
> = {
  very_high: {
    label: "Very High Sensitivity",
    shortLabel: "Very High",
    badgeClass: "bg-rose-50 text-rose-900 border-rose-300",
    cardClass: "bg-rose-50/70 border-rose-200 text-rose-950",
    dotColor: "#be123c",
  },
  high: {
    label: "High Sensitivity",
    shortLabel: "High",
    badgeClass: "bg-amber-50 text-amber-900 border-amber-300",
    cardClass: "bg-amber-50/70 border-amber-200 text-amber-950",
    dotColor: "#b45309",
  },
  moderate: {
    label: "Moderate Sensitivity",
    shortLabel: "Moderate",
    badgeClass: "bg-yellow-50 text-yellow-900 border-yellow-300",
    cardClass: "bg-yellow-50/60 border-yellow-200 text-yellow-950",
    dotColor: "#a16207",
  },
  low: {
    label: "Lower Sensitivity",
    shortLabel: "Lower",
    badgeClass: "bg-emerald-50 text-emerald-900 border-emerald-200",
    cardClass: "bg-emerald-50/60 border-emerald-200 text-emerald-950",
    dotColor: "#15803d",
  },
  unassessed: {
    label: "Unassessed",
    shortLabel: "Unassessed",
    badgeClass: "bg-stone-100 text-stone-700 border-stone-200",
    cardClass: "bg-[#FAF8F4] border-stone-200 text-stone-800",
    dotColor: "#78716c",
  },
};

export function createUnassessedRisk(
  reason = "No public provincial forest inventory is available at this spot (it may be private land, water, or alpine terrain).",
  failedLayers: string[] = []
): EcologicalRiskAssessment {
  return {
    category: "unassessed",
    label: RISK_BADGE_STYLES.unassessed.label,
    rank: 0,
    reasons: [reason],
    assessmentScope: "unassessed",
    methodologyVersion: SENSITIVITY_METHODOLOGY_VERSION,
    isPartialAssessment: failedLayers.length > 0,
    failedLayers: failedLayers.length > 0 ? failedLayers : undefined,
  };
}

export function assessEcologicalRisk(input: {
  forest: InspectForestProperties;
  designations: InspectDesignations;
  areaHa?: number | null;
  assessmentScope:
    | "full_inspection"
    | "multi_block_screening"
    | "centroid_screening";
  failedLayers?: string[];
}): EcologicalRiskAssessment {
  const { forest, designations, assessmentScope, failedLayers = [] } = input;
  const isPartialAssessment = failedLayers.length > 0;

  const becInfo = resolveBecNdt(
    forest.becZoneCode || forest.becZone?.slice(0, 4),
    forest.becSubzone,
    forest.ndt
  );
  const ecoName =
    forest.becZoneName || becInfo.becZoneName || forest.becZone || "BC";
  const isWetNdt = becInfo.ndt === "NDT1" || becInfo.ndt === "NDT2";
  const age = forest.standAgeYears;
  const si = forest.siteIndexMeters;
  const height = forest.canopyHeightMeters;

  // Guard: Did a recent wildfire perimeter overlap this stand AFTER VRI baseline (or within 10 yrs if ref year missing)?
  const recentWildfire = designations.recentWildfire;
  const wildfireQualified = Boolean(recentWildfire?.postDatesVri);
  const wildfireNotice =
    wildfireQualified && recentWildfire
      ? `Overlaps a ${recentWildfire.fireYear} wildfire area${recentWildfire.fireNumber ? ` (Fire #${recentWildfire.fireNumber})` : ""} that burned after the ${forest.referenceYear ?? "last"} forest survey — the recorded tree age (${age ?? "?"} yrs) may be from before the fire. Check Satellite view to see if this is post-fire salvage logging.`
      : null;

  // 1. Very High Sensitivity triggers (collect ALL matching reasons)
  const veryHighReasons: string[] = [];
  if (designations.legalOgma) {
    veryHighReasons.push(
      `Overlaps a legally protected old-growth area (${designations.legalOgma}${designations.legalOgmaId ? ` · ${designations.legalOgmaId}` : ""}).`
    );
  }
  if (designations.protectedPark) {
    veryHighReasons.push(
      `Overlaps a BC Park or protected area (${designations.protectedPark}).`
    );
  }
  if (designations.wildlifeHabitatArea) {
    veryHighReasons.push(
      `Overlaps legally protected wildlife habitat (${designations.wildlifeHabitatArea}).`
    );
  }
  if (designations.tapPriorityDeferral && !wildfireQualified) {
    const subLabel =
      designations.tapSubcategories.length > 0
        ? designations.tapSubcategories.join(", ")
        : designations.tapPriorityDeferral;
    veryHighReasons.push(
      `Overlaps an area recommended for temporary old-growth deferral by BC's 2021 scientific panel (${subLabel}).`
    );
  }
  if (
    forest.isOldGrowth === true &&
    !wildfireQualified &&
    si !== null &&
    (si >= 20 || forest.isHighProdForBec === true)
  ) {
    const prodNote =
      si >= 20
        ? `growing productivity ${si} m`
        : `growing productivity ${si} m, unusually high for this ecosystem (≥${becInfo.becRelativeHighSiThreshold} m)`;
    veryHighReasons.push(
      `Targets fertile, high-productivity old growth (${age ?? "?"} yrs old in ${ecoName}; ${prodNote}).`
    );
  }
  if (
    !wildfireQualified &&
    age !== null &&
    age >= becInfo.ancientThresholdYears
  ) {
    veryHighReasons.push(
      `Targets an ancient forest stand (${age} yrs old in ${ecoName}).`
    );
  }

  if (veryHighReasons.length > 0) {
    if (wildfireNotice) veryHighReasons.unshift(wildfireNotice);
    return {
      category: "very_high",
      label: RISK_BADGE_STYLES.very_high.label,
      rank: 4,
      reasons: veryHighReasons,
      assessmentScope,
      methodologyVersion: SENSITIVITY_METHODOLOGY_VERSION,
      isPartialAssessment,
      wildfireQualified,
      failedLayers: isPartialAssessment ? failedLayers : undefined,
    };
  }

  // 2. High Sensitivity triggers
  const highReasons: string[] = [];
  if (designations.ungulateWinterRange) {
    highReasons.push(
      `Overlaps a legally protected winter wildlife range (${designations.ungulateWinterRange}).`
    );
  }
  if (designations.communityWatershed) {
    highReasons.push(
      `Overlaps a community drinking-water watershed (${designations.communityWatershed}).`
    );
  }
  if (
    forest.isOldGrowth === true &&
    !wildfireQualified &&
    si !== null &&
    si >= 12
  ) {
    highReasons.push(
      `Targets moderate-productivity old growth (${age ?? "?"} yrs old; growing productivity ${si} m).`
    );
  }
  if (
    forest.isOldGrowth === true &&
    !wildfireQualified &&
    height !== null &&
    height >= 35
  ) {
    highReasons.push(
      `Targets tall old-growth trees (${age ?? "?"} yrs old, ${height} m tall).`
    );
  }
  if (
    isWetNdt &&
    !wildfireQualified &&
    age !== null &&
    age >= 120 &&
    si !== null &&
    si >= 25
  ) {
    highReasons.push(
      `Targets older, fast-growing coastal or wet-belt trees (${age} yrs old; growing productivity ${si} m) approaching old-growth age.`
    );
  }

  if (highReasons.length > 0) {
    if (wildfireNotice) highReasons.unshift(wildfireNotice);
    return {
      category: "high",
      label: RISK_BADGE_STYLES.high.label,
      rank: 3,
      reasons: highReasons,
      assessmentScope,
      methodologyVersion: SENSITIVITY_METHODOLOGY_VERSION,
      isPartialAssessment,
      wildfireQualified,
      failedLayers: isPartialAssessment ? failedLayers : undefined,
    };
  }

  // 3. Moderate Sensitivity triggers
  const moderateReasons: string[] = [];
  if (wildfireNotice) {
    moderateReasons.push(wildfireNotice);
    if (designations.tapPriorityDeferral) {
      moderateReasons.push(
        `Previously recommended for old-growth deferral before the ${recentWildfire?.fireYear} wildfire.`
      );
    }
  } else if (forest.isOldGrowth === true) {
    moderateReasons.push(
      `Targets slow-growing old growth (${age ?? "?"} yrs old; growing productivity ${si ?? "N/A"} m).`
    );
  } else if (age !== null && age >= 81) {
    moderateReasons.push(`Targets a mature forest (${age} yrs old).`);
  }

  if (moderateReasons.length > 0) {
    return {
      category: "moderate",
      label: RISK_BADGE_STYLES.moderate.label,
      rank: 2,
      reasons: moderateReasons,
      assessmentScope,
      methodologyVersion: SENSITIVITY_METHODOLOGY_VERSION,
      isPartialAssessment,
      wildfireQualified,
      failedLayers: isPartialAssessment ? failedLayers : undefined,
    };
  }

  // 4. Unassessed if no VRI inventory & no designation overlap
  if (!forest.hasInventory) {
    const msg = isPartialAssessment
      ? `No public provincial forest inventory is available at this spot; this check is incomplete because provincial data was temporarily unavailable for ${failedLayers.join(", ")}.`
      : undefined;
    return createUnassessedRisk(msg, failedLayers);
  }

  // 5. Lower Sensitivity (never claim "no overlap" for layers that failed to respond)
  const lowerReason = isPartialAssessment
    ? `Targets younger second-growth trees (${age ?? "≤80"} yrs old). Note: this check is incomplete because provincial data was temporarily unavailable for ${failedLayers.join(", ")}.`
    : `Targets younger second-growth trees (${age ?? "≤80"} yrs old) with no mapped overlap with parks, protected old growth, wildlife habitat, or community drinking-water watersheds.`;

  return {
    category: "low",
    label: RISK_BADGE_STYLES.low.label,
    rank: 1,
    reasons: [lowerReason],
    assessmentScope,
    methodologyVersion: SENSITIVITY_METHODOLOGY_VERSION,
    isPartialAssessment,
    wildfireQualified,
    failedLayers: isPartialAssessment ? failedLayers : undefined,
  };
}
