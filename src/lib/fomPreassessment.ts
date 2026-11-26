import fs from "fs";
import path from "path";
import {
  BC_NATURAL_RESOURCE_REGIONS,
  EcologicalRiskCategory,
  FomProjectSummary,
  PreassessedFomSnapshot,
  ProjectScreeningSummary,
  isFomOpenForComment,
  matchDistrictToRegionId,
} from "@/data/bcForestryData";
import {
  FOM_PORTAL_BASE_URL,
  FOM_PUBLIC_SUMMARY_URL,
  RawGeoJSONFeature,
  computeInteriorPoint,
  extractInteriorPointFromAnyGeoJSON,
  queryBcgwWfs,
  resolveRegionIdForPoint,
  screenLocationRisk,
} from "@/lib/bcgw";
import {
  SENSITIVITY_METHODOLOGY_VERSION,
  createUnassessedRisk,
} from "@/lib/riskAssessment";

function extractString(...candidates: unknown[]): string | undefined {
  for (const val of candidates) {
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed.length > 0) return trimmed;
    } else if (val && typeof val === "object") {
      const obj = val as Record<string, unknown>;
      const nested = extractString(
        obj.name,
        obj.description,
        obj.label,
        obj.title,
        obj.code
      );
      if (nested) return nested;
    }
  }
  return undefined;
}

export function getRegionDisplayLabel(regionId: string): string {
  const reg = BC_NATURAL_RESOURCE_REGIONS.find((r) => r.id === regionId);
  return reg ? `${reg.shortName} Region` : "BC Natural Resource Region";
}

export function sortFomProjects(
  projects: FomProjectSummary[]
): FomProjectSummary[] {
  return [...projects].sort((a, b) => {
    const aOpen = isFomOpenForComment(a);
    const bOpen = isFomOpenForComment(b);
    if (aOpen !== bOpen) return aOpen ? -1 : 1;

    const rankA = a.riskAssessment?.rank ?? 0;
    const rankB = b.riskAssessment?.rank ?? 0;
    if (rankA !== rankB) return rankB - rankA;

    const dateA = a.commentCloseDate || "9999-12-31";
    const dateB = b.commentCloseDate || "9999-12-31";
    return dateA.localeCompare(dateB);
  });
}

export function getBlockArea(feat: RawGeoJSONFeature): number {
  const p = feat.properties || {};
  if (p.PLANNED_AREA !== undefined && p.PLANNED_AREA !== null) {
    return Number(p.PLANNED_AREA) || 0;
  }
  if (p.FEATURE_AREA_SQM !== undefined && p.FEATURE_AREA_SQM !== null) {
    return Number(p.FEATURE_AREA_SQM) / 10000 || 0;
  }
  return 0;
}

export function selectRepresentativeBlocks(
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
  for (
    let i = 0;
    i < remaining.length && spread.length < maxSamples - 3;
    i += step
  ) {
    spread.push(remaining[i]);
  }
  return [...top3, ...spread].slice(0, maxSamples);
}

export async function fetchCutblocksForFomIds(
  fomIds: string[]
): Promise<Map<string, RawGeoJSONFeature[]>> {
  const validIds = Array.from(
    new Set(fomIds.map((id) => id.trim()).filter((id) => /^\d+$/.test(id)))
  );
  const byFomId = new Map<string, RawGeoJSONFeature[]>();

  const fetchSingle = async (fomId: string) => {
    try {
      const fc = await queryBcgwWfs(
        {
          typeNames: "pub:WHSE_FOREST_TENURE.FOM_CUTBLOCK_SP",
          count: "200",
          CQL_FILTER: `FOM_ID=${fomId}`,
        },
        12000
      );
      if (fc.features && fc.features.length > 0) {
        byFomId.set(fomId, fc.features);
      }
    } catch {
      // Leave empty if individual query fails
    }
  };

  for (let i = 0; i < validIds.length; i += 20) {
    const batch = validIds.slice(i, i + 20);
    try {
      const fc = await queryBcgwWfs(
        {
          typeNames: "pub:WHSE_FOREST_TENURE.FOM_CUTBLOCK_SP",
          count: "1000",
          CQL_FILTER: `FOM_ID IN (${batch.join(",")})`,
        },
        15000
      );
      const features = fc.features || [];
      if (features.length >= 1000) {
        await Promise.allSettled(batch.map((id) => fetchSingle(id)));
      } else {
        for (const feat of features) {
          const rawId = feat.properties?.FOM_ID;
          if (rawId === undefined || rawId === null) continue;
          const id = String(rawId);
          const list = byFomId.get(id) || [];
          list.push(feat);
          byFomId.set(id, list);
        }
      }
    } catch {
      await Promise.allSettled(batch.map((id) => fetchSingle(id)));
    }
  }

  return byFomId;
}

async function fetchBcgwFomMetadataMap(): Promise<
  Map<
    string,
    {
      center?: [number, number];
      totalPlannedHa: number;
      blockCount: number;
      fspHolder?: string;
      district?: string;
      workflowState?: string;
      commentOpenDate?: string;
      commentCloseDate?: string;
      sampleName?: string;
    }
  >
> {
  const fc = await queryBcgwWfs(
    {
      typeNames: "pub:WHSE_FOREST_TENURE.FOM_CUTBLOCK_SP",
      count: "1000",
    },
    12000
  );

  const grouped = new Map<
    string,
    {
      center?: [number, number];
      totalPlannedHa: number;
      blockCount: number;
      fspHolder?: string;
      district?: string;
      workflowState?: string;
      commentOpenDate?: string;
      commentCloseDate?: string;
      sampleName?: string;
    }
  >();

  for (const feat of fc.features || []) {
    const p = feat.properties || {};
    if (p.FOM_ID === undefined || p.FOM_ID === null) continue;
    const fomId = String(p.FOM_ID);
    const existing = grouped.get(fomId);
    const areaHa = Number(p.PLANNED_AREA ?? 0);
    const centroid = computeInteriorPoint(feat.geometry);

    if (!existing) {
      grouped.set(fomId, {
        center: centroid || undefined,
        totalPlannedHa: areaHa,
        blockCount: 1,
        fspHolder: p.FSP_HOLDER_NAME ? String(p.FSP_HOLDER_NAME) : undefined,
        district: p.DISTRICT_NAME ? String(p.DISTRICT_NAME) : undefined,
        workflowState:
          p.WORKFLOW_STATE || p.LIFECYCLE_STATUS
            ? String(p.WORKFLOW_STATE || p.LIFECYCLE_STATUS)
            : undefined,
        commentOpenDate: p.COMMENTING_OPEN_DATE
          ? String(p.COMMENTING_OPEN_DATE).slice(0, 10)
          : undefined,
        commentCloseDate: p.COMMENTING_CLOSED_DATE
          ? String(p.COMMENTING_CLOSED_DATE).slice(0, 10)
          : undefined,
        sampleName: p.NAME ? String(p.NAME) : undefined,
      });
    } else {
      existing.totalPlannedHa += areaHa;
      existing.blockCount += 1;
      if (!existing.center && centroid) existing.center = centroid;
    }
  }

  return grouped;
}

export async function fetchRawFomCatalog(): Promise<{
  source: "fom_api" | "bcgw_wfs";
  projects: FomProjectSummary[];
}> {
  try {
    const [apiResp, bcgwResult] = await Promise.allSettled([
      fetch(FOM_PUBLIC_SUMMARY_URL, {
        headers: {
          "User-Agent": "BC-Forestry-Watch/2.0 (Open Data Public Tool)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
      }),
      fetchBcgwFomMetadataMap(),
    ]);

    if (apiResp.status === "fulfilled" && apiResp.value.ok) {
      const raw = await apiResp.value.json();
      const items: Array<Record<string, unknown>> = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.data)
        ? raw.data
        : [];

      if (items.length > 0) {
        const bcgwMeta =
          bcgwResult.status === "fulfilled" ? bcgwResult.value : new Map();
        const normalized: FomProjectSummary[] = [];

        for (const proj of items) {
          const fomIdRaw = proj.id ?? proj.fomId ?? proj.projectId;
          if (fomIdRaw === undefined || fomIdRaw === null) continue;
          const fomId = String(fomIdRaw);

          let center: [number, number] | undefined;
          const lat = proj.latitude ?? proj.lat;
          const lon = proj.longitude ?? proj.lon ?? proj.lng;
          if (
            lat !== undefined &&
            lon !== undefined &&
            Number.isFinite(Number(lat)) &&
            Number.isFinite(Number(lon))
          ) {
            center = [Number(lon), Number(lat)];
          } else {
            const geoPt = extractInteriorPointFromAnyGeoJSON(
              proj.geojson || proj.geometry || proj.publicNoticeGeojson
            );
            if (geoPt) center = geoPt;
          }

          const meta = bcgwMeta.get(fomId);
          if (!center && meta?.center) {
            center = meta.center;
          }

          const rawDistrict = extractString(
            proj.districtName,
            proj.naturalResourceDistrict,
            proj.district,
            proj.adminDistrict,
            meta?.district
          );

          const regionId = matchDistrictToRegionId(rawDistrict) || undefined;
          const district =
            rawDistrict ||
            (regionId
              ? getRegionDisplayLabel(regionId)
              : "BC Natural Resource District");

          const fspHolder =
            extractString(
              proj.forestClientName,
              proj.fspHolderName,
              proj.forestClient,
              meta?.fspHolder
            ) || "Forest Stewardship Plan Holder";

          const workflowState =
            extractString(
              proj.workflowStateName,
              proj.workflowStateCode,
              proj.workflowState,
              proj.projectStatus,
              meta?.workflowState
            ) || "Public Review";

          const openDateRaw = extractString(
            proj.commentingOpenDate,
            proj.commentStartDate,
            meta?.commentOpenDate
          );
          const closeDateRaw = extractString(
            proj.commentingClosedDate,
            proj.commentEndDate,
            meta?.commentCloseDate
          );

          normalized.push({
            fomId,
            name: String(proj.name || proj.projectName || `Proposal #${fomId}`),
            fspHolder,
            district,
            regionId,
            workflowState,
            commentOpenDate: openDateRaw ? openDateRaw.slice(0, 10) : undefined,
            commentCloseDate: closeDateRaw
              ? closeDateRaw.slice(0, 10)
              : undefined,
            fomProjectUrl: `${FOM_PORTAL_BASE_URL}#splash?id=${fomId}`,
            center,
            blockCount: meta?.blockCount,
            totalPlannedHa: meta
              ? Number(meta.totalPlannedHa.toFixed(1))
              : undefined,
          });
        }

        return { source: "fom_api", projects: normalized };
      }
    }
  } catch {
    // Fall back to DataBC WFS below
  }

  const grouped = await fetchBcgwFomMetadataMap();
  const results: FomProjectSummary[] = [];

  for (const [fomId, g] of grouped.entries()) {
    const regionId = g.center
      ? await resolveRegionIdForPoint(g.center[0], g.center[1], g.district)
      : matchDistrictToRegionId(g.district) || undefined;

    const district =
      g.district ||
      (regionId ? getRegionDisplayLabel(regionId) : "BC Natural Resource District");

    results.push({
      fomId,
      name: g.sampleName
        ? `Proposal #${fomId} · ${g.sampleName}`
        : `Proposal #${fomId}`,
      fspHolder: g.fspHolder || "Forest Stewardship Plan Holder",
      district,
      regionId,
      workflowState: g.workflowState || "Published · Public Review",
      commentOpenDate: g.commentOpenDate,
      commentCloseDate: g.commentCloseDate,
      fomProjectUrl: `${FOM_PORTAL_BASE_URL}#splash?id=${fomId}`,
      center: g.center,
      blockCount: g.blockCount,
      totalPlannedHa: Number(g.totalPlannedHa.toFixed(1)),
    });
  }

  return { source: "bcgw_wfs", projects: results };
}

export async function screenFomProjectBlocks(
  proj: FomProjectSummary,
  blocks: RawGeoJSONFeature[],
  maxBlocks = 5
): Promise<FomProjectSummary> {
  const hasBlocks = blocks.length > 0;
  const totalPlannedHa = hasBlocks
    ? Number(
        blocks.reduce((sum, feat) => sum + getBlockArea(feat), 0).toFixed(1)
      )
    : proj.totalPlannedHa;
  const blockCount = hasBlocks ? blocks.length : proj.blockCount;

  const sampled = hasBlocks
    ? selectRepresentativeBlocks(blocks, maxBlocks)
    : [];
  const blockPoints = sampled
    .map((feat) => ({
      point: computeInteriorPoint(feat.geometry),
      areaHa: getBlockArea(feat),
    }))
    .filter(
      (item): item is { point: [number, number]; areaHa: number } =>
        item.point !== null
    );

  const fallbackCenter = proj.center;
  const targets: Array<{ point: [number, number]; areaHa?: number | null }> =
    blockPoints.length > 0
      ? blockPoints
      : fallbackCenter
      ? [{ point: fallbackCenter, areaHa: totalPlannedHa }]
      : [];

  if (targets.length === 0) {
    return {
      ...proj,
      blockCount,
      totalPlannedHa,
      riskAssessment: createUnassessedRisk(
        "No cutblock coordinates available for this proposal; click to check live BC records."
      ),
    };
  }

  const settled = await Promise.allSettled(
    targets.map((t) =>
      screenLocationRisk(t.point[0], t.point[1], t.areaHa).then((screen) => ({
        point: t.point,
        screen,
      }))
    )
  );

  const validResults = settled
    .filter(
      (
        r
      ): r is PromiseFulfilledResult<{
        point: [number, number];
        screen: Awaited<ReturnType<typeof screenLocationRisk>>;
      }> => r.status === "fulfilled"
    )
    .map((r) => r.value);

  if (validResults.length === 0) {
    const center = targets[0].point;
    const regionId =
      (await resolveRegionIdForPoint(center[0], center[1], proj.district)) ||
      proj.regionId;
    return {
      ...proj,
      center,
      regionId,
      blockCount,
      totalPlannedHa,
      riskAssessment: createUnassessedRisk(
        "Provincial forest inventory lookup timed out during pre-assessment; click to inspect live."
      ),
    };
  }

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
    const winAge = winner.screen.forestPreview.standAgeYears ?? -1;
    const winSi = winner.screen.forestPreview.siteIndexMeters ?? -1;
    if (
      itemRank > winRank ||
      (itemRank === winRank &&
        ((age ?? -1) > winAge ||
          ((age ?? -1) === winAge && (si ?? -1) > winSi)))
    ) {
      winner = item;
    }
  }

  const center = winner.point;
  const regionId =
    (await resolveRegionIdForPoint(center[0], center[1], proj.district)) ||
    proj.regionId;
  const district =
    proj.district && proj.district !== "BC Natural Resource District"
      ? proj.district
      : regionId
      ? getRegionDisplayLabel(regionId)
      : "BC Natural Resource District";

  const projectScreening: ProjectScreeningSummary = {
    totalBlocks: blockCount ?? validResults.length,
    sampledBlocks: validResults.length,
    highestRiskCategory: winner.screen.riskAssessment.category,
    categoryCounts: counts,
    minStandAge: minAge,
    maxStandAge: maxAge,
    maxSiteIndex: maxSi,
    anyWildfireOverlap: anyWildfire,
    anyDesignationOverlap: anyDesig,
  };

  const riskAssessment = {
    ...winner.screen.riskAssessment,
    assessmentScope:
      validResults.length > 1
        ? ("multi_block_screening" as const)
        : ("centroid_screening" as const),
  };

  return {
    ...proj,
    center,
    regionId,
    district,
    blockCount,
    totalPlannedHa,
    riskAssessment,
    projectScreening,
    forestPreview: winner.screen.forestPreview,
  };
}

async function fetchFomProjectDetailDates(fomId: string): Promise<{
  commentOpenDate?: string;
  commentCloseDate?: string;
  districtName?: string;
}> {
  try {
    const resp = await fetch(
      `https://fom.nrs.gov.bc.ca/api/project/${encodeURIComponent(fomId)}`,
      {
        headers: {
          "User-Agent": "BC-Forestry-Watch/2.1 (Open Data Public Tool)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
      }
    );
    if (!resp.ok) return {};
    const detail = (await resp.json()) as Record<string, unknown>;
    const notice =
      detail.notice && typeof detail.notice === "object"
        ? (detail.notice as Record<string, unknown>)
        : undefined;

    const openRaw = extractString(
      detail.commentingOpenDate,
      detail.commentStartDate,
      notice?.commentingOpenDate,
      notice?.commentStartDate
    );
    const closeRaw = extractString(
      detail.commentingClosedDate,
      detail.commentEndDate,
      detail.commentCloseDate,
      notice?.commentingClosedDate,
      notice?.commentEndDate
    );
    const districtName = extractString(
      detail.districtName,
      detail.naturalResourceDistrict,
      detail.district
    );

    return {
      commentOpenDate: openRaw ? openRaw.slice(0, 10) : undefined,
      commentCloseDate: closeRaw ? closeRaw.slice(0, 10) : undefined,
      districtName,
    };
  } catch {
    return {};
  }
}

export async function generatePreassessedSnapshot(options?: {
  limit?: number;
  maxBlocks?: number;
  concurrency?: number;
  onProgress?: (
    done: number,
    total: number,
    proj: FomProjectSummary
  ) => void;
}): Promise<PreassessedFomSnapshot> {
  const maxBlocks = options?.maxBlocks ?? 5;
  const concurrency = Math.max(1, options?.concurrency ?? 4);
  const { source, projects } = await fetchRawFomCatalog();

  const openTargetsAll = projects.filter((p) => isFomOpenForComment(p));
  const targets =
    options?.limit && options.limit > 0
      ? openTargetsAll.slice(0, options.limit)
      : openTargetsAll;
  const targetIds = targets.map((p) => p.fomId);

  const blocksByFomId = await fetchCutblocksForFomIds(targetIds);
  const screenedMap = new Map<string, FomProjectSummary>();

  let nextIdx = 0;
  let done = 0;

  async function worker() {
    while (nextIdx < targets.length) {
      const idx = nextIdx++;
      const proj = targets[idx];
      const blocks = blocksByFomId.get(proj.fomId) || [];
      const [screened, detailDates] = await Promise.all([
        screenFomProjectBlocks(proj, blocks, maxBlocks),
        fetchFomProjectDetailDates(proj.fomId),
      ]);
      const enrichedScreened: FomProjectSummary = {
        ...screened,
        commentOpenDate:
          detailDates.commentOpenDate || screened.commentOpenDate,
        commentCloseDate:
          detailDates.commentCloseDate || screened.commentCloseDate,
        district:
          screened.district === "BC Natural Resource District" &&
          detailDates.districtName
            ? detailDates.districtName
            : screened.district,
      };
      screenedMap.set(proj.fomId, enrichedScreened);
      done += 1;
      options?.onProgress?.(done, targets.length, enrichedScreened);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(1, targets.length)) }, () =>
      worker()
    )
  );

  const mergedProjects = await Promise.all(
    projects.map(async (proj) => {
      const screened = screenedMap.get(proj.fomId);
      if (screened) return screened;

      let regionId = proj.regionId;
      if (!regionId && proj.center) {
        regionId =
          (await resolveRegionIdForPoint(
            proj.center[0],
            proj.center[1],
            proj.district
          )) || undefined;
      } else if (!regionId) {
        regionId = matchDistrictToRegionId(proj.district) || undefined;
      }

      return {
        ...proj,
        regionId,
        riskAssessment:
          proj.riskAssessment ||
          createUnassessedRisk(
            isFomOpenForComment(proj)
              ? "Click proposal to load cutblocks and run multi-block sensitivity assessment."
              : "Comment period closed; click proposal to inspect cutblocks."
          ),
      };
    })
  );

  const sorted = sortFomProjects(mergedProjects);
  const openProjectsCount = sorted.filter((p) => isFomOpenForComment(p)).length;
  const assessedProjectsCount = sorted.filter(
    (p) => (p.riskAssessment?.rank ?? 0) > 0
  ).length;

  return {
    schemaVersion: 1,
    methodologyVersion: SENSITIVITY_METHODOLOGY_VERSION,
    generatedAt: new Date().toISOString(),
    source,
    totalProjects: sorted.length,
    openProjectsCount,
    assessedProjectsCount,
    projects: sorted,
  };
}

export function readPreassessedSnapshotFromDisk(
  filePath = path.join(process.cwd(), "public", "data", "preassessed_foms.json")
): PreassessedFomSnapshot | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<PreassessedFomSnapshot>;
    if (!parsed || !Array.isArray(parsed.projects)) return null;
    return parsed as PreassessedFomSnapshot;
  } catch {
    return null;
  }
}
