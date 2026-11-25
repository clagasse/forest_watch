import { NextRequest, NextResponse } from "next/server";
import {
  EcologicalRiskCategory,
  ProjectScreeningSummary,
} from "@/data/bcForestryData";
import {
  RawGeoJSONFeature,
  computeFeatureCollectionBounds,
  computeInteriorPoint,
  inspectLocation,
  queryBcgwWfs,
  screenLocationRisk,
} from "@/lib/bcgw";

export const maxDuration = 30;

function getBlockArea(feat: RawGeoJSONFeature): number {
  const p = feat.properties || {};
  if (p.PLANNED_AREA !== undefined && p.PLANNED_AREA !== null) {
    return Number(p.PLANNED_AREA) || 0;
  }
  if (p.FEATURE_AREA_SQM !== undefined && p.FEATURE_AREA_SQM !== null) {
    return Number(p.FEATURE_AREA_SQM) / 10000 || 0;
  }
  return 0;
}

function selectRepresentativeBlocks(
  features: RawGeoJSONFeature[],
  maxSamples = 5
): RawGeoJSONFeature[] {
  if (features.length <= maxSamples) return features;
  const sortedByArea = [...features].sort(
    (a, b) => getBlockArea(b) - getBlockArea(a)
  );
  const top3 = sortedByArea.slice(0, 3);
  const remaining = sortedByArea.slice(3);
  const step = Math.max(1, Math.floor(remaining.length / 2));
  const spread: RawGeoJSONFeature[] = [];
  for (let i = 0; i < remaining.length && spread.length < maxSamples - 3; i += step) {
    spread.push(remaining[i]);
  }
  return [...top3, ...spread].slice(0, maxSamples);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fomId = (searchParams.get("fomId") || "").trim();

  if (!/^\d+$/.test(fomId)) {
    return NextResponse.json(
      { error: "Invalid fomId parameter (expected numeric ID)" },
      { status: 400 }
    );
  }

  try {
    const fc = await queryBcgwWfs(
      {
        typeNames: "pub:WHSE_FOREST_TENURE.FOM_CUTBLOCK_SP",
        count: "100",
        CQL_FILTER: `FOM_ID=${fomId}`,
      },
      12000
    );

    const features = fc.features || [];
    const bounds = computeFeatureCollectionBounds(features);

    const sampledBlocks = selectRepresentativeBlocks(features, 5);
    const blockPoints = sampledBlocks
      .map((feat) => ({
        feat,
        point: computeInteriorPoint(feat.geometry),
        areaHa: getBlockArea(feat),
      }))
      .filter(
        (
          item
        ): item is {
          feat: RawGeoJSONFeature;
          point: [number, number];
          areaHa: number;
        } => item.point !== null
      );

    let inspection = null;
    let projectScreening: ProjectScreeningSummary | null = null;
    let primaryPoint: [number, number] | null =
      blockPoints[0]?.point ?? null;

    if (blockPoints.length === 1) {
      primaryPoint = blockPoints[0].point;
      inspection = await inspectLocation(primaryPoint[0], primaryPoint[1]);
      const cat = inspection.riskAssessment.category;
      const counts: Record<EcologicalRiskCategory, number> = {
        very_high: cat === "very_high" ? 1 : 0,
        high: cat === "high" ? 1 : 0,
        moderate: cat === "moderate" ? 1 : 0,
        low: cat === "low" ? 1 : 0,
        unassessed: cat === "unassessed" ? 1 : 0,
      };
      projectScreening = {
        totalBlocks: features.length,
        sampledBlocks: 1,
        highestRiskCategory: cat,
        categoryCounts: counts,
        minStandAge: inspection.forest.standAgeYears,
        maxStandAge: inspection.forest.standAgeYears,
        maxSiteIndex: inspection.forest.siteIndexMeters,
        anyWildfireOverlap: Boolean(
          inspection.designations.recentWildfire?.postDatesVri
        ),
        anyDesignationOverlap: Boolean(
          inspection.designations.tapPriorityDeferral ||
            inspection.designations.legalOgma ||
            inspection.designations.protectedPark ||
            inspection.designations.wildlifeHabitatArea ||
            inspection.designations.ungulateWinterRange ||
            inspection.designations.communityWatershed
        ),
      };
      inspection.projectScreening = projectScreening;
    } else if (blockPoints.length > 1) {
      const screened = await Promise.allSettled(
        blockPoints.map(async (bp) => ({
          bp,
          screen: await screenLocationRisk(bp.point[0], bp.point[1], bp.areaHa),
        }))
      );

      const validResults = screened
        .filter(
          (
            r
          ): r is PromiseFulfilledResult<{
            bp: {
              feat: RawGeoJSONFeature;
              point: [number, number];
              areaHa: number;
            };
            screen: Awaited<ReturnType<typeof screenLocationRisk>>;
          }> => r.status === "fulfilled"
        )
        .map((r) => r.value);

      if (validResults.length > 0) {
        const counts: Record<EcologicalRiskCategory, number> = {
          very_high: 0,
          high: 0,
          moderate: 0,
          low: 0,
          unassessed: 0,
        };
        let minAge: number | null = null;
        let maxAge: number | null = null;
        let maxSi: number | null = null;
        let anyWildfire = false;
        let anyDesig = false;

        let winner = validResults[0];
        for (const item of validResults) {
          const cat = item.screen.riskAssessment.category;
          counts[cat] += 1;
          const age = item.screen.forestPreview.standAgeYears;
          const si = item.screen.forestPreview.siteIndexMeters;
          if (age !== null) {
            minAge = minAge === null ? age : Math.min(minAge, age);
            maxAge = maxAge === null ? age : Math.max(maxAge, age);
          }
          if (si !== null) {
            maxSi = maxSi === null ? si : Math.max(maxSi, si);
          }
          if (item.screen.anyWildfireOverlap) anyWildfire = true;
          if (item.screen.anyDesignationOverlap) anyDesig = true;

          const itemRank = item.screen.riskAssessment.rank;
          const winRank = winner.screen.riskAssessment.rank;
          if (
            itemRank > winRank ||
            (itemRank === winRank &&
              (age ?? -1) > (winner.screen.forestPreview.standAgeYears ?? -1))
          ) {
            winner = item;
          }
        }

        primaryPoint = winner.bp.point;
        inspection = await inspectLocation(primaryPoint[0], primaryPoint[1]);
        projectScreening = {
          totalBlocks: features.length,
          sampledBlocks: validResults.length,
          highestRiskCategory: winner.screen.riskAssessment.category,
          categoryCounts: counts,
          minStandAge: minAge,
          maxStandAge: maxAge,
          maxSiteIndex: maxSi,
          anyWildfireOverlap:
            anyWildfire ||
            Boolean(inspection.designations.recentWildfire?.postDatesVri),
          anyDesignationOverlap:
            anyDesig ||
            Boolean(
              inspection.designations.tapPriorityDeferral ||
                inspection.designations.legalOgma ||
                inspection.designations.protectedPark ||
                inspection.designations.wildlifeHabitatArea ||
                inspection.designations.ungulateWinterRange ||
                inspection.designations.communityWatershed
            ),
        };
        inspection.projectScreening = projectScreening;
        inspection.riskAssessment.assessmentScope = "multi_block_screening";
      } else {
        primaryPoint = blockPoints[0].point;
        inspection = await inspectLocation(primaryPoint[0], primaryPoint[1]);
      }
    }

    return NextResponse.json(
      {
        fomId,
        featureCollection: fc,
        bounds,
        centroid: primaryPoint,
        inspection,
        projectScreening,
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=120, s-maxage=600, stale-while-revalidate=1800",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch FOM blocks for #${fomId}: ${String(err)}` },
      { status: 502 }
    );
  }
}
