import {
  EcologicalRiskAssessment,
  InspectCutblockRecord,
  InspectDesignations,
  InspectForestProperties,
  InspectRawAuditRecords,
  InspectResult,
  WildfireOverlapInfo,
  inferRegionIdFromCoords,
  matchDistrictToRegionId,
  normalizeBcRegionNameToId,
} from "@/data/bcForestryData";
import { resolveBecNdt } from "@/lib/becNdt";
import { assessEcologicalRisk } from "@/lib/riskAssessment";

export const BCGW_WFS_URL = "https://openmaps.gov.bc.ca/geo/pub/wfs";
export const FOM_PUBLIC_SUMMARY_URL =
  "https://fom.nrs.gov.bc.ca/api/project/publicSummary";
export const FOM_PORTAL_BASE_URL = "https://fom.nrs.gov.bc.ca/public/projects";

const SPECIES_NAME_MAP: Record<string, string> = {
  CW: "Western Redcedar",
  YC: "Yellow Cedar",
  HW: "Western Hemlock",
  HM: "Mountain Hemlock",
  FD: "Douglas-fir",
  FDC: "Coastal Douglas-fir",
  FDI: "Interior Douglas-fir",
  SS: "Sitka Spruce",
  SX: "Hybrid Spruce",
  SXW: "Hybrid White Spruce",
  SE: "Engelmann Spruce",
  SW: "White Spruce",
  SB: "Black Spruce",
  BA: "Amabilis Fir",
  BL: "Subalpine Fir",
  BG: "Grand Fir",
  PL: "Lodgepole Pine",
  PLI: "Interior Lodgepole Pine",
  PLC: "Shore Pine",
  PW: "Western White Pine",
  PY: "Ponderosa Pine",
  PA: "Whitebark Pine",
  LW: "Western Larch",
  LT: "Tamarack",
  DR: "Red Alder",
  AT: "Trembling Aspen",
  ACT: "Black Cottonwood",
  EP: "Paper Birch",
  MB: "Bigleaf Maple",
};

export function decodeSpeciesCode(code: unknown): string {
  if (!code) return "";
  const raw = String(code).trim().toUpperCase();
  return SPECIES_NAME_MAP[raw] || raw;
}

export interface RawGeoJSONFeature {
  type: "Feature";
  geometry?: GeoJSON.Geometry;
  properties?: Record<string, unknown>;
}

export interface RawGeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: RawGeoJSONFeature[];
}

/* ============================================================================
 * Exact Spatial Containment & Guaranteed Interior Point Helpers
 * ========================================================================== */

function pointOnSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  eps = 1e-9
): boolean {
  const lenSq = (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
  if (lenSq < 1e-18) {
    return Math.hypot(px - ax, py - ay) <= eps;
  }
  const cross = (py - ay) * (bx - ax) - (px - ax) * (by - ay);
  if (Math.abs(cross) > eps * Math.sqrt(lenSq)) return false;
  const dot = (px - ax) * (bx - ax) + (py - ay) * (by - ay);
  if (dot < -eps) return false;
  return dot <= lenSq + eps;
}

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  if (!ring || ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    if (pointOnSegment(lng, lat, xi, yi, xj, yj)) {
      return true;
    }

    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygonCoords(
  lng: number,
  lat: number,
  rings: number[][][]
): boolean {
  if (!rings || rings.length === 0) return false;
  if (!pointInRing(lng, lat, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(lng, lat, rings[i])) return false;
  }
  return true;
}

export function pointInGeometry(
  lng: number,
  lat: number,
  geometry?: GeoJSON.Geometry | null
): boolean {
  if (!geometry) return false;
  if (geometry.type === "Point") {
    return (
      Math.abs(geometry.coordinates[0] - lng) < 1e-6 &&
      Math.abs(geometry.coordinates[1] - lat) < 1e-6
    );
  }
  if (geometry.type === "Polygon") {
    return pointInPolygonCoords(lng, lat, geometry.coordinates as number[][][]);
  }
  if (geometry.type === "MultiPolygon") {
    const polys = geometry.coordinates as number[][][][];
    return polys.some((poly) => pointInPolygonCoords(lng, lat, poly));
  }
  return false;
}

function ringShoelaceAreaAndCentroid(ring: number[][]): {
  area: number;
  cx: number;
  cy: number;
} {
  if (!ring || ring.length < 3) return { area: 0, cx: 0, cy: 0 };
  let twiceArea = 0;
  let cxSum = 0;
  let cySum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const x0 = ring[j][0];
    const y0 = ring[j][1];
    const x1 = ring[i][0];
    const y1 = ring[i][1];
    const cross = x0 * y1 - x1 * y0;
    twiceArea += cross;
    cxSum += (x0 + x1) * cross;
    cySum += (y0 + y1) * cross;
  }
  const area = Math.abs(twiceArea) / 2;
  if (Math.abs(twiceArea) < 1e-14) {
    const avgX = ring.reduce((s, c) => s + c[0], 0) / ring.length;
    const avgY = ring.reduce((s, c) => s + c[1], 0) / ring.length;
    return { area: 0, cx: avgX, cy: avgY };
  }
  return {
    area,
    cx: cxSum / (3 * twiceArea),
    cy: cySum / (3 * twiceArea),
  };
}

function scanlineInteriorPoint(
  ring: number[][],
  geometry: GeoJSON.Geometry
): [number, number] | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const pt of ring) {
    if (pt[0] < minX) minX = pt[0];
    if (pt[0] > maxX) maxX = pt[0];
    if (pt[1] < minY) minY = pt[1];
    if (pt[1] > maxY) maxY = pt[1];
  }
  if (!Number.isFinite(minX) || maxY <= minY) return null;

  let bestPoint: [number, number] | null = null;
  let bestSpanWidth = -1;

  for (let step = 1; step <= 9; step++) {
    const y = minY + ((maxY - minY) * step) / 10;
    const xs: number[] = [];
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];
      if (yi > y !== yj > y) {
        const xInt = ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        xs.push(xInt);
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const midX = (xs[k] + xs[k + 1]) / 2;
      const span = xs[k + 1] - xs[k];
      if (span > bestSpanWidth && pointInGeometry(midX, y, geometry)) {
        bestSpanWidth = span;
        bestPoint = [midX, y];
      }
    }
  }
  return bestPoint;
}

/**
 * Returns a point guaranteed to lie strictly inside a Polygon or MultiPolygon
 * (using shoelace area centroid first, then horizontal scanline fallback for concave polygons).
 */
export function computeInteriorPoint(
  geometry?: GeoJSON.Geometry | null
): [number, number] | null {
  if (!geometry) return null;
  if (geometry.type === "Point") {
    return [geometry.coordinates[0], geometry.coordinates[1]];
  }

  let candidatePolygons: number[][][][] = [];
  if (geometry.type === "Polygon") {
    candidatePolygons = [geometry.coordinates as number[][][]];
  } else if (geometry.type === "MultiPolygon") {
    candidatePolygons = geometry.coordinates as number[][][][];
  } else {
    return null;
  }

  let largestRing: number[][] | null = null;
  let largestArea = -1;
  let largestCx = 0;
  let largestCy = 0;

  for (const poly of candidatePolygons) {
    const outer = poly[0];
    if (!outer || outer.length === 0) continue;
    const stats = ringShoelaceAreaAndCentroid(outer);
    if (stats.area > largestArea || !largestRing) {
      largestArea = stats.area;
      largestRing = outer;
      largestCx = stats.cx;
      largestCy = stats.cy;
    }
  }

  if (!largestRing || largestRing.length === 0) return null;

  if (pointInGeometry(largestCx, largestCy, geometry)) {
    return [largestCx, largestCy];
  }

  const scanPoint = scanlineInteriorPoint(largestRing, geometry);
  if (scanPoint) return scanPoint;

  return [largestRing[0][0], largestRing[0][1]];
}

export function computeGeometryCentroid(
  geometry?: GeoJSON.Geometry | null
): [number, number] | null {
  return computeInteriorPoint(geometry);
}

/**
 * Extracts an interior [lng, lat] point from any GeoJSON-like payload
 * (JSON string, FeatureCollection, Feature, or raw Geometry).
 */
export function extractInteriorPointFromAnyGeoJSON(
  input: unknown
): [number, number] | null {
  if (!input) return null;
  let obj: unknown = input;
  if (typeof obj === "string") {
    try {
      obj = JSON.parse(obj);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== "object") return null;

  const rec = obj as Record<string, unknown>;
  if (rec.type === "FeatureCollection" && Array.isArray(rec.features)) {
    for (const feat of rec.features) {
      if (feat && typeof feat === "object") {
        const pt = extractInteriorPointFromAnyGeoJSON(feat);
        if (pt) return pt;
      }
    }
    return null;
  }
  if (rec.type === "Feature") {
    return computeInteriorPoint(rec.geometry as GeoJSON.Geometry | undefined);
  }
  if (typeof rec.type === "string" && "coordinates" in rec) {
    return computeInteriorPoint(rec as unknown as GeoJSON.Geometry);
  }
  return null;
}

interface CachedRegionBoundary {
  regionId: string;
  regionName: string;
  geometry: GeoJSON.Geometry;
}

let cachedNrRegions: {
  regions: CachedRegionBoundary[];
  expiresAt: number;
} | null = null;
const NR_REGIONS_TTL_MS = 24 * 60 * 60 * 1000;

async function getOfficialNrRegions(): Promise<CachedRegionBoundary[]> {
  if (cachedNrRegions && Date.now() < cachedNrRegions.expiresAt) {
    return cachedNrRegions.regions;
  }
  try {
    const fc = await queryBcgwWfs(
      {
        typeNames: "pub:WHSE_ADMIN_BOUNDARIES.ADM_NR_REGIONS_SPG",
        count: "20",
      },
      8000
    );
    const regions: CachedRegionBoundary[] = [];
    for (const feat of fc.features || []) {
      const p = feat.properties || {};
      const rawName = p.REGION_NAME
        ? String(p.REGION_NAME)
        : p.ORG_UNIT_NAME
        ? String(p.ORG_UNIT_NAME)
        : null;
      const regionId = normalizeBcRegionNameToId(rawName);
      if (regionId && feat.geometry) {
        regions.push({
          regionId,
          regionName: rawName || regionId,
          geometry: feat.geometry,
        });
      }
    }
    if (regions.length > 0) {
      cachedNrRegions = {
        regions,
        expiresAt: Date.now() + NR_REGIONS_TTL_MS,
      };
    }
    return regions;
  } catch {
    return cachedNrRegions?.regions || [];
  }
}

export async function resolveRegionIdForPoint(
  lng: number,
  lat: number,
  district?: string | null
): Promise<string> {
  const byDistrict = matchDistrictToRegionId(district);
  if (byDistrict) return byDistrict;

  const regions = await getOfficialNrRegions();
  for (const reg of regions) {
    if (pointInGeometry(lng, lat, reg.geometry)) {
      return reg.regionId;
    }
  }

  return inferRegionIdFromCoords(lng, lat);
}

export function computeFeatureCollectionBounds(
  features: Array<{ geometry?: GeoJSON.Geometry | null }>
): [number, number, number, number] | null {
  let minLng = 180;
  let minLat = 90;
  let maxLng = -180;
  let maxLat = -90;

  const visit = (coords: unknown) => {
    if (!Array.isArray(coords)) return;
    if (
      coords.length >= 2 &&
      typeof coords[0] === "number" &&
      typeof coords[1] === "number"
    ) {
      const lng = coords[0];
      const lat = coords[1];
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    } else {
      for (const item of coords) visit(item);
    }
  };

  for (const feat of features) {
    if (feat.geometry && "coordinates" in feat.geometry) {
      visit(feat.geometry.coordinates);
    }
  }

  if (minLng <= maxLng && minLat <= maxLat) {
    return [minLng, minLat, maxLng, maxLat];
  }
  return null;
}

/* ============================================================================
 * WFS Query Helpers
 * ========================================================================== */

export async function queryBcgwWfs(
  params: Record<string, string>,
  timeoutMs = 8500
): Promise<RawGeoJSONFeatureCollection> {
  const search = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    ...params,
  });
  const url = `${BCGW_WFS_URL}?${search.toString()}`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "BC-Forestry-Watch/2.0 (Open Data Public Tool)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!resp.ok) {
    throw new Error(`BCGW WFS HTTP ${resp.status} for ${params.typeNames}`);
  }
  const text = await resp.text();
  if (!text.trim().startsWith("{")) {
    throw new Error(`Non-JSON response from BCGW WFS for ${params.typeNames}`);
  }
  return JSON.parse(text) as RawGeoJSONFeatureCollection;
}

export async function queryBcgwByBbox(
  layerName: string,
  minLon: number,
  minLat: number,
  maxLon: number,
  maxLat: number,
  count = 5,
  timeoutMs = 8500
): Promise<RawGeoJSONFeatureCollection> {
  return queryBcgwWfs(
    {
      typeNames: layerName,
      count: String(count),
      bbox: `${minLon},${minLat},${maxLon},${maxLat},EPSG:4326`,
    },
    timeoutMs
  );
}

function filterContainingFeatures(
  features: RawGeoJSONFeature[] | undefined,
  lng: number,
  lat: number
): RawGeoJSONFeature[] {
  if (!features || features.length === 0) return [];
  return features.filter((f) => pointInGeometry(lng, lat, f.geometry));
}

function sanitizeAuditProperties(
  props?: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!props) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v !== null && v !== undefined && v !== "") {
      out[k] = v;
    }
  }
  return out;
}

/* ============================================================================
 * VRI & Feature Mappers
 * ========================================================================== */

export function extractVriProperties(
  features: RawGeoJSONFeature[],
  officialNdtRaw?: string | null
): { forest: InspectForestProperties; rawVri: Record<string, unknown> | null } {
  if (!features || features.length === 0) {
    return {
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
        landscapeRarityLabel: null,
        landscapeRarityNote: null,
        areaHa: null,
        oldGrowthThresholdYears: null,
        isOldGrowth: null,
      },
      rawVri: null,
    };
  }

  const chosen =
    features.find((f) => Number(f.properties?.PROJ_AGE_1 ?? 0) > 0) ||
    features[0];
  const p = chosen.properties || {};

  const ageRaw = p.PROJ_AGE_1;
  const heightRaw = p.PROJ_HEIGHT_1;
  const siRaw = p.SITE_INDEX;
  const ccRaw = p.CROWN_CLOSURE;
  const refYrRaw = p.REFERENCE_YEAR;
  const projDateRaw = p.PROJECTED_DATE;

  const becZoneCode = p.BEC_ZONE_CODE ? String(p.BEC_ZONE_CODE).trim() : null;
  const becSubzone = p.BEC_SUBZONE ? String(p.BEC_SUBZONE).trim() : "";
  const becVariant = p.BEC_VARIANT ? String(p.BEC_VARIANT).trim() : "";

  const standAgeYears =
    ageRaw !== null && ageRaw !== undefined ? Number(ageRaw) : null;
  const canopyHeightMeters =
    heightRaw !== null && heightRaw !== undefined
      ? Number(Number(heightRaw).toFixed(1))
      : null;
  const siteIndexMeters =
    siRaw !== null && siRaw !== undefined
      ? Number(Number(siRaw).toFixed(1))
      : null;
  const crownClosurePct =
    ccRaw !== null && ccRaw !== undefined ? Number(ccRaw) : null;
  const referenceYear =
    refYrRaw !== null && refYrRaw !== undefined && Number(refYrRaw) > 1900
      ? Number(refYrRaw)
      : null;
  const projectedDate = projDateRaw ? String(projDateRaw).slice(0, 10) : null;

  const sp1 = decodeSpeciesCode(p.SPECIES_CD_1);
  const sp2 = decodeSpeciesCode(p.SPECIES_CD_2);
  const pct1 =
    p.SPECIES_PCT_1 !== null && p.SPECIES_PCT_1 !== undefined
      ? Number(p.SPECIES_PCT_1)
      : null;
  const pct2 =
    p.SPECIES_PCT_2 !== null && p.SPECIES_PCT_2 !== undefined
      ? Number(p.SPECIES_PCT_2)
      : null;

  const speciesList = [sp1, sp2].filter(Boolean);
  const dominantSpecies =
    speciesList.length > 0 ? speciesList.join(", ") : null;

  const compParts: string[] = [];
  if (sp1) compParts.push(pct1 !== null ? `${sp1} ${pct1}%` : sp1);
  if (sp2) compParts.push(pct2 !== null ? `${sp2} ${pct2}%` : sp2);
  const speciesComposition =
    compParts.length > 0 ? compParts.join(", ") : null;

  const bclcs2 = p.BCLCS_LEVEL_2 ? String(p.BCLCS_LEVEL_2).trim() : "";
  const bclcs4 = p.BCLCS_LEVEL_4 ? String(p.BCLCS_LEVEL_4).trim() : "";
  const landCoverClass =
    bclcs2 || bclcs4 ? [bclcs2, bclcs4].filter(Boolean).join(" / ") : null;

  const vriFeatureId =
    p.FEATURE_ID !== undefined && p.FEATURE_ID !== null
      ? String(p.FEATURE_ID)
      : p.POLYGON_ID !== undefined && p.POLYGON_ID !== null
      ? String(p.POLYGON_ID)
      : null;

  const becZone = becZoneCode
    ? `${becZoneCode}${becSubzone}${becVariant}`
    : null;
  const areaSqm = Number(p.FEATURE_AREA_SQM || 0);
  const areaHa = areaSqm > 0 ? Number((areaSqm / 10000).toFixed(1)) : null;

  const becInfo = resolveBecNdt(becZoneCode, becSubzone, officialNdtRaw);
  const isOldGrowth =
    standAgeYears !== null
      ? standAgeYears >= becInfo.oldGrowthThresholdYears
      : null;
  const isHighProdForBec =
    siteIndexMeters !== null
      ? siteIndexMeters >= becInfo.becRelativeHighSiThreshold
      : null;

  const hasAnyForestData =
    standAgeYears !== null ||
    canopyHeightMeters !== null ||
    dominantSpecies !== null;

  return {
    forest: {
      hasInventory: hasAnyForestData,
      standAgeYears,
      canopyHeightMeters,
      siteIndexMeters,
      dominantSpecies,
      speciesComposition,
      crownClosurePct,
      referenceYear,
      projectedDate,
      landCoverClass,
      vriFeatureId,
      becZone,
      becZoneCode,
      becZoneName: becInfo.becZoneName,
      becSubzone: becSubzone || null,
      ndt: becInfo.ndt,
      ndtLabel: becInfo.ndtLabel,
      plainDisturbanceLabel: becInfo.plainDisturbanceLabel,
      becRelativeHighSiThreshold: becInfo.becRelativeHighSiThreshold,
      isHighProdForBec,
      ecologicalNote: becInfo.ecologicalNote || null,
      landscapeRarityLabel: becInfo.landscapeRarity?.label ?? null,
      landscapeRarityNote: becInfo.landscapeRarity?.note ?? null,
      areaHa,
      oldGrowthThresholdYears: becInfo.oldGrowthThresholdYears,
      isOldGrowth,
      geometry: chosen.geometry,
    },
    rawVri: sanitizeAuditProperties(p),
  };
}

function mapFomFeature(f: RawGeoJSONFeature): InspectCutblockRecord {
  const p = f.properties || {};
  const fomId = p.FOM_ID !== undefined ? String(p.FOM_ID) : undefined;
  const cutblockId = p.CUT_BLOCK_ID ? String(p.CUT_BLOCK_ID) : undefined;
  const name = String(
    p.NAME ||
      (fomId
        ? `FOM #${fomId} Block ${cutblockId || ""}`.trim()
        : "FOM Proposed Block")
  );
  const areaHa =
    p.PLANNED_AREA !== undefined
      ? Number(Number(p.PLANNED_AREA).toFixed(1))
      : p.FEATURE_AREA_SQM
      ? Number((Number(p.FEATURE_AREA_SQM) / 10000).toFixed(1))
      : undefined;

  return {
    stage: "fom_proposed",
    stageLabel: "Proposed · Open for Public Comment",
    id: `FOM-${fomId || p.OBJECTID || "BLOCK"}${cutblockId ? `-${cutblockId}` : ""}`,
    name,
    licensee: p.FSP_HOLDER_NAME ? String(p.FSP_HOLDER_NAME) : undefined,
    district: p.DISTRICT_NAME ? String(p.DISTRICT_NAME) : undefined,
    areaHa,
    fomId,
    cutblockId,
    commentOpenDate: p.COMMENTING_OPEN_DATE
      ? String(p.COMMENTING_OPEN_DATE).slice(0, 10)
      : undefined,
    commentCloseDate: p.COMMENTING_CLOSED_DATE
      ? String(p.COMMENTING_CLOSED_DATE).slice(0, 10)
      : undefined,
    plannedHarvestDate: p.PLANNED_DEVELOPMENT_DATE
      ? String(p.PLANNED_DEVELOPMENT_DATE).slice(0, 10)
      : undefined,
    fomProjectUrl: fomId
      ? `${FOM_PORTAL_BASE_URL}#splash?id=${fomId}`
      : FOM_PORTAL_BASE_URL,
    rawStatus: p.WORKFLOW_STATE ? String(p.WORKFLOW_STATE) : undefined,
    sourceLayer: "WHSE_FOREST_TENURE.FOM_CUTBLOCK_SP",
    geometry: f.geometry,
  };
}

function mapFtenFeature(f: RawGeoJSONFeature): InspectCutblockRecord {
  const p = f.properties || {};
  const status = String(p.LIFE_CYCLE_STATUS_CODE || "PENDING").toUpperCase();
  const isActive = status === "ACTIVE";
  const isRetired = status === "RETIRED";

  const areaHa =
    p.BLOCK_GROSS_HA !== undefined
      ? Number(Number(p.BLOCK_GROSS_HA).toFixed(1))
      : p.PLANNED_GROSS_BLOCK_AREA !== undefined
      ? Number(Number(p.PLANNED_GROSS_BLOCK_AREA).toFixed(1))
      : p.FEATURE_AREA_SQM
      ? Number((Number(p.FEATURE_AREA_SQM) / 10000).toFixed(1))
      : undefined;

  return {
    stage: isRetired ? "completed" : isActive ? "ften_active" : "ften_pending",
    stageLabel: isRetired
      ? "Retired Logging Permit"
      : isActive
      ? "Approved Active Logging"
      : "Pending Logging Permit",
    id: `FTEN-${p.CUT_BLOCK_SKEY || p.OBJECTID || "BLOCK"}`,
    name: String(
      p.CUT_BLOCK_DESCRIPTION ||
        p.MAP_LABEL ||
        `FTEN Cutblock #${p.CUT_BLOCK_SKEY || p.OBJECTID}`
    ),
    licensee: p.CLIENT_NAME ? String(p.CLIENT_NAME) : undefined,
    district:
      p.GEOGRAPHIC_DISTRICT_NAME || p.ORG_UNIT_NAME
        ? String(p.GEOGRAPHIC_DISTRICT_NAME || p.ORG_UNIT_NAME)
        : undefined,
    areaHa,
    cutblockId: p.MAP_LABEL ? String(p.MAP_LABEL) : undefined,
    plannedHarvestDate: p.PLANNED_HARVEST_DATE
      ? String(p.PLANNED_HARVEST_DATE).slice(0, 10)
      : undefined,
    fomProjectUrl: FOM_PORTAL_BASE_URL,
    rawStatus: status,
    sourceLayer: "WHSE_FOREST_TENURE.FTEN_CUT_BLOCK_POLY_SVW",
    geometry: f.geometry,
  };
}

function mapCompletedCutblockFeature(
  f: RawGeoJSONFeature
): InspectCutblockRecord {
  const p = f.properties || {};
  const harvestYear = p.HARVEST_START_YEAR_CALENDAR
    ? Number(p.HARVEST_START_YEAR_CALENDAR)
    : undefined;
  const areaHa =
    p.AREA_HA !== undefined
      ? Number(Number(p.AREA_HA).toFixed(1))
      : p.FEATURE_AREA_SQM
      ? Number((Number(p.FEATURE_AREA_SQM) / 10000).toFixed(1))
      : undefined;

  return {
    stage: "completed",
    stageLabel: harvestYear
      ? `Logged Cutblock (${harvestYear})`
      : "Previously Logged Cutblock",
    id: `CB-${p.VCCB_SYSID || p.OBJECTID || "BLOCK"}`,
    name: p.OPENING_ID
      ? `Opening #${p.OPENING_ID}`
      : `Consolidated Cutblock #${p.VCCB_SYSID || p.OBJECTID}`,
    areaHa,
    harvestYear,
    rawStatus: p.DATA_SOURCE ? String(p.DATA_SOURCE) : undefined,
    sourceLayer: "WHSE_FOREST_VEGETATION.VEG_CONSOLIDATED_CUT_BLOCKS_SP",
    geometry: f.geometry,
  };
}

function extractTapInfo(feat?: RawGeoJSONFeature): {
  label: string | null;
  subcategories: string[];
} {
  if (!feat?.properties) return { label: null, subcategories: [] };
  const p = feat.properties;
  const label = String(
    p.TAP_CLASSIFICATION_LABEL || "TAP Recommended Priority Deferral (2021)"
  );
  const sub: string[] = [];
  if (String(p.ANCIENT_FOREST_IND || "").toUpperCase() === "Y") {
    sub.push("Ancient Forest");
  }
  if (String(p.REMNANT_OLD_ECOSYS_IND || "").toUpperCase() === "Y") {
    sub.push("Remnant Old Ecosystem");
  }
  if (String(p.PRIORITY_BIG_TREED_OG_IND || "").toUpperCase() === "Y") {
    sub.push("Priority Big-Treed Old Growth");
  }
  return { label, subcategories: sub };
}

function extractWildfireInfo(
  currentFeat: RawGeoJSONFeature | undefined,
  historicalFeats: RawGeoJSONFeature[],
  vriReferenceYear: number | null
): {
  info: WildfireOverlapInfo | null;
  rawWildfire: Record<string, unknown> | null;
} {
  const currentYear = new Date().getUTCFullYear();
  if (currentFeat?.properties) {
    const p = currentFeat.properties;
    const yr = Number(p.FIRE_YEAR || currentYear);
    const num = p.FIRE_NUMBER ? String(p.FIRE_NUMBER) : null;
    return {
      info: {
        fireYear: yr,
        fireNumber: num,
        source: "current",
        postDatesVri: true,
      },
      rawWildfire: sanitizeAuditProperties(p),
    };
  }

  if (historicalFeats.length > 0) {
    const sorted = [...historicalFeats].sort(
      (a, b) =>
        Number(b.properties?.FIRE_YEAR || 0) -
        Number(a.properties?.FIRE_YEAR || 0)
    );
    const latest = sorted[0];
    const p = latest.properties || {};
    const yr = Number(p.FIRE_YEAR || 0);
    if (yr >= currentYear - 20) {
      const num = p.FIRE_NUMBER ? String(p.FIRE_NUMBER) : null;
      const postDatesVri =
        vriReferenceYear !== null
          ? yr >= vriReferenceYear
          : yr >= currentYear - 10;
      return {
        info: {
          fireYear: yr,
          fireNumber: num,
          source: "historical",
          postDatesVri,
        },
        rawWildfire: sanitizeAuditProperties(p),
      };
    }
  }

  return { info: null, rawWildfire: null };
}

function normalizeBurnSeverity(
  raw: unknown
): "High" | "Medium" | "Low" | "Unburned" | null {
  if (!raw) return null;
  const s = String(raw).trim().toUpperCase();
  if (s === "HIGH") return "High";
  if (s === "MEDIUM" || s === "MODERATE") return "Medium";
  if (s === "LOW") return "Low";
  if (s === "UNBURNED") return "Unburned";
  return null;
}

async function queryBurnSeverityAtPoint(
  lng: number,
  lat: number,
  fireYear: number
): Promise<{
  rating: "High" | "Medium" | "Low" | "Unburned" | null;
  source: "historical_1yr" | "same_year" | null;
  raw: Record<string, unknown> | null;
}> {
  const delta = 0.0005;
  const minLon = lng - delta;
  const minLat = lat - delta;
  const maxLon = lng + delta;
  const maxLat = lat + delta;

  const pickBest = (feats: RawGeoJSONFeature[]) => {
    const containing = filterContainingFeatures(feats, lng, lat);
    if (containing.length === 0) return null;
    const withRating = containing.filter((f) =>
      normalizeBurnSeverity(f.properties?.BURN_SEVERITY_RATING)
    );
    const pool = withRating.length > 0 ? withRating : containing;
    const sorted = [...pool].sort((a, b) => {
      const ya = Number(a.properties?.FIRE_YEAR || 0);
      const yb = Number(b.properties?.FIRE_YEAR || 0);
      return Math.abs(ya - fireYear) - Math.abs(yb - fireYear);
    });
    const best = sorted[0];
    const bestYr = Number(best.properties?.FIRE_YEAR || 0);
    if (bestYr > 0 && bestYr < fireYear - 1) return null;
    return best;
  };

  try {
    const histFc = await queryBcgwByBbox(
      "pub:WHSE_FOREST_VEGETATION.VEG_BURN_SEVERITY_SP",
      minLon,
      minLat,
      maxLon,
      maxLat,
      4,
      4500
    );
    const histFeat = pickBest(histFc.features || []);
    const histRating = normalizeBurnSeverity(
      histFeat?.properties?.BURN_SEVERITY_RATING
    );
    if (histFeat && histRating) {
      return {
        rating: histRating,
        source: "historical_1yr",
        raw: sanitizeAuditProperties(histFeat.properties),
      };
    }

    const currentYear = new Date().getUTCFullYear();
    if (fireYear >= currentYear - 1) {
      const sameFc = await queryBcgwByBbox(
        "pub:WHSE_FOREST_VEGETATION.VEG_BURN_SEVERITY_SAME_YR_SP",
        minLon,
        minLat,
        maxLon,
        maxLat,
        4,
        4500
      );
      const sameFeat = pickBest(sameFc.features || []);
      const sameRating = normalizeBurnSeverity(
        sameFeat?.properties?.BURN_SEVERITY_RATING
      );
      if (sameFeat && sameRating) {
        return {
          rating: sameRating,
          source: "same_year",
          raw: sanitizeAuditProperties(sameFeat.properties),
        };
      }
    }
  } catch {
    // Gracefully fall back to null burn severity if upstream layer fails
  }

  return { rating: null, source: null, raw: null };
}

/* ============================================================================
 * Full 13-Layer Live Location Inspection
 * ========================================================================== */

export async function inspectLocation(
  lng: number,
  lat: number
): Promise<InspectResult> {
  const delta = 0.0005;
  const minLon = lng - delta;
  const minLat = lat - delta;
  const maxLon = lng + delta;
  const maxLat = lat + delta;

  const layerTasks: Array<{
    label: string;
    promise: Promise<RawGeoJSONFeatureCollection>;
  }> = [
    {
      label: "Proposed Cutblocks",
      promise: queryBcgwByBbox("pub:WHSE_FOREST_TENURE.FOM_CUTBLOCK_SP", minLon, minLat, maxLon, maxLat, 5),
    },
    {
      label: "Logging Permits",
      promise: queryBcgwByBbox("pub:WHSE_FOREST_TENURE.FTEN_CUT_BLOCK_POLY_SVW", minLon, minLat, maxLon, maxLat, 5),
    },
    {
      label: "Past Cutblocks",
      promise: queryBcgwByBbox("pub:WHSE_FOREST_VEGETATION.VEG_CONSOLIDATED_CUT_BLOCKS_SP", minLon, minLat, maxLon, maxLat, 5),
    },
    {
      label: "BC Forest Inventory",
      promise: queryBcgwByBbox("pub:WHSE_FOREST_VEGETATION.VEG_COMP_LYR_R1_POLY", minLon, minLat, maxLon, maxLat, 5),
    },
    {
      label: "Ecosystem Zones",
      promise: queryBcgwByBbox("pub:WHSE_FOREST_VEGETATION.BEC_BIOGEOCLIMATIC_POLY", minLon, minLat, maxLon, maxLat, 3),
    },
    {
      label: "Recommended Old-Growth Deferrals",
      promise: queryBcgwByBbox("pub:WHSE_FOREST_VEGETATION.OGSR_TAP_PRIORITY_DEF_AREA_SP", minLon, minLat, maxLon, maxLat, 3),
    },
    {
      label: "Protected Old-Growth Areas",
      promise: queryBcgwByBbox("pub:WHSE_LAND_USE_PLANNING.RMP_OGMA_LEGAL_CURRENT_SVW", minLon, minLat, maxLon, maxLat, 3),
    },
    {
      label: "BC Parks & Protected Areas",
      promise: queryBcgwByBbox("pub:WHSE_TANTALIS.TA_PARK_ECORES_PA_SVW", minLon, minLat, maxLon, maxLat, 3),
    },
    {
      label: "Protected Wildlife Habitat",
      promise: queryBcgwByBbox("pub:WHSE_WILDLIFE_MANAGEMENT.WCP_WILDLIFE_HABITAT_AREA_POLY", minLon, minLat, maxLon, maxLat, 3),
    },
    {
      label: "Winter Wildlife Ranges",
      promise: queryBcgwByBbox("pub:WHSE_WILDLIFE_MANAGEMENT.WCP_UNGULATE_WINTER_RANGE_SP", minLon, minLat, maxLon, maxLat, 3),
    },
    {
      label: "Community Drinking-Water Watersheds",
      promise: queryBcgwByBbox("pub:WHSE_WATER_MANAGEMENT.WLS_COMMUNITY_WS_PUB_SVW", minLon, minLat, maxLon, maxLat, 3),
    },
    {
      label: "Past Wildfire Perimeters",
      promise: queryBcgwByBbox("pub:WHSE_LAND_AND_NATURAL_RESOURCE.PROT_HISTORICAL_FIRE_POLYS_SP", minLon, minLat, maxLon, maxLat, 5),
    },
    {
      label: "Current Wildfire Perimeters",
      promise: queryBcgwByBbox("pub:WHSE_LAND_AND_NATURAL_RESOURCE.PROT_CURRENT_FIRE_POLYS_SP", minLon, minLat, maxLon, maxLat, 3),
    },
  ];

  const settled = await Promise.allSettled(layerTasks.map((t) => t.promise));
  const succeededLayers: string[] = [];
  const failedLayers: string[] = [];

  const getFeatures = (idx: number): RawGeoJSONFeature[] => {
    const res = settled[idx];
    if (res.status === "fulfilled") {
      succeededLayers.push(layerTasks[idx].label);
      return res.value.features || [];
    }
    failedLayers.push(layerTasks[idx].label);
    return [];
  };

  const rawFom = getFeatures(0);
  const rawFten = getFeatures(1);
  const rawCompleted = getFeatures(2);
  const rawVri = filterContainingFeatures(getFeatures(3), lng, lat);
  const rawBec = filterContainingFeatures(getFeatures(4), lng, lat);
  const rawTap = filterContainingFeatures(getFeatures(5), lng, lat);
  const rawOgma = filterContainingFeatures(getFeatures(6), lng, lat);
  const rawPark = filterContainingFeatures(getFeatures(7), lng, lat);
  const rawWha = filterContainingFeatures(getFeatures(8), lng, lat);
  const rawUwr = filterContainingFeatures(getFeatures(9), lng, lat);
  const rawCw = filterContainingFeatures(getFeatures(10), lng, lat);
  const rawHistFire = filterContainingFeatures(getFeatures(11), lng, lat);
  const rawCurrFire = filterContainingFeatures(getFeatures(12), lng, lat);

  // For cutblocks: strictly prefer exact point-in-polygon matches; only fall back to nearby bbox match if user clicked right outside an edge
  const exactFom = filterContainingFeatures(rawFom, lng, lat);
  const exactFten = filterContainingFeatures(rawFten, lng, lat);
  const exactCompleted = filterContainingFeatures(rawCompleted, lng, lat);

  const hasExactCutblock =
    exactFom.length > 0 || exactFten.length > 0 || exactCompleted.length > 0;
  const hasAnyCutblock =
    rawFom.length > 0 || rawFten.length > 0 || rawCompleted.length > 0;
  const matchType: "exact" | "nearby" =
    hasExactCutblock || !hasAnyCutblock ? "exact" : "nearby";

  const fomList = hasExactCutblock ? exactFom : rawFom;
  const ftenList = hasExactCutblock ? exactFten : rawFten;
  const completedList = hasExactCutblock ? exactCompleted : rawCompleted;

  const fomRecords = fomList.map((f) => ({
    record: mapFomFeature(f),
    raw: sanitizeAuditProperties(f.properties),
  }));
  const ftenRecords = ftenList.map((f) => ({
    record: mapFtenFeature(f),
    raw: sanitizeAuditProperties(f.properties),
  }));
  const completedRecords = completedList
    .map((f) => ({
      record: mapCompletedCutblockFeature(f),
      raw: sanitizeAuditProperties(f.properties),
    }))
    .sort((a, b) => (b.record.harvestYear || 0) - (a.record.harvestYear || 0));

  const stagePriority: Record<InspectCutblockRecord["stage"], number> = {
    fom_proposed: 1,
    ften_pending: 2,
    ften_active: 3,
    completed: 4,
  };

  const combinedCutblocks = [
    ...fomRecords,
    ...ftenRecords,
    ...completedRecords,
  ].sort((a, b) => stagePriority[a.record.stage] - stagePriority[b.record.stage]);

  const allOverlappingCutblocks = combinedCutblocks.map((c) => c.record);
  const primaryCutblock = allOverlappingCutblocks[0] || null;
  const rawCutblock = combinedCutblocks[0]?.raw || null;

  const becFeat = rawBec[0];
  const officialNdtRaw = becFeat?.properties?.NATURAL_DISTURBANCE
    ? String(becFeat.properties.NATURAL_DISTURBANCE)
    : null;

  const { forest, rawVri: rawVriProps } = extractVriProperties(
    rawVri,
    officialNdtRaw
  );

  const tapFeat = rawTap[0];
  const tapParsed = extractTapInfo(tapFeat);
  const ogmaFeat = rawOgma[0];
  const parkFeat = rawPark[0];
  const whaFeat = rawWha[0];
  const uwrFeat = rawUwr[0];
  const cwFeat = rawCw[0];
  const wildfireParsed = extractWildfireInfo(
    rawCurrFire[0],
    rawHistFire,
    forest.referenceYear
  );
  let burnSeverityAudit: Record<string, unknown> | null = null;
  if (wildfireParsed.info?.postDatesVri) {
    const sev = await queryBurnSeverityAtPoint(
      lng,
      lat,
      wildfireParsed.info.fireYear
    );
    wildfireParsed.info.burnSeverity = sev.rating;
    wildfireParsed.info.burnSeveritySource = sev.source;
    burnSeverityAudit = sev.raw;
  }

  const ogmaLabel = ogmaFeat?.properties
    ? String(
        ogmaFeat.properties.OGMA_TYPE ||
          ogmaFeat.properties.LEGAL_OGMA_PROVID ||
          "Current Legal Old Growth Management Area"
      )
    : null;
  const ogmaId = ogmaFeat?.properties?.LEGAL_OGMA_PROVID
    ? String(ogmaFeat.properties.LEGAL_OGMA_PROVID)
    : null;

  const parkLabel = parkFeat?.properties
    ? String(
        parkFeat.properties.PROTECTED_LANDS_NAME ||
          parkFeat.properties.PARK_NAME ||
          "BC Park / Protected Area"
      )
    : null;

  const whaLabel = whaFeat?.properties
    ? [
        whaFeat.properties.COMMON_SPECIES_NAME
          ? String(whaFeat.properties.COMMON_SPECIES_NAME)
          : "Species at Risk",
        whaFeat.properties.WHA_NUMBER
          ? `WHA ${whaFeat.properties.WHA_NUMBER}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  const uwrLabel = uwrFeat?.properties
    ? [
        uwrFeat.properties.SPECIES_1
          ? String(uwrFeat.properties.SPECIES_1)
          : "Ungulate Winter Range",
        uwrFeat.properties.UWR_NUMBER
          ? `UWR ${uwrFeat.properties.UWR_NUMBER}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  const cwLabel = cwFeat?.properties
    ? String(cwFeat.properties.CW_NAME || "Designated Community Watershed")
    : null;

  const designations: InspectDesignations = {
    tapPriorityDeferral: tapParsed.label,
    tapSubcategories: tapParsed.subcategories,
    legalOgma: ogmaLabel,
    legalOgmaId: ogmaId,
    protectedPark: parkLabel,
    wildlifeHabitatArea: whaLabel,
    ungulateWinterRange: uwrLabel,
    communityWatershed: cwLabel,
    recentWildfire: wildfireParsed.info,
  };

  const riskAssessment = assessEcologicalRisk({
    forest,
    designations,
    areaHa: primaryCutblock?.areaHa ?? null,
    assessmentScope: "full_inspection",
    failedLayers,
  });

  const rawAuditRecords: InspectRawAuditRecords = {
    cutblock: rawCutblock,
    vri: rawVriProps,
    bec: sanitizeAuditProperties(becFeat?.properties),
    tap: sanitizeAuditProperties(tapFeat?.properties),
    ogma: sanitizeAuditProperties(ogmaFeat?.properties),
    park: sanitizeAuditProperties(parkFeat?.properties),
    wha: sanitizeAuditProperties(whaFeat?.properties),
    uwr: sanitizeAuditProperties(uwrFeat?.properties),
    communityWatershed: sanitizeAuditProperties(cwFeat?.properties),
    wildfire: wildfireParsed.rawWildfire,
    burnSeverity: burnSeverityAudit,
  };

  return {
    coordinates: [lng, lat],
    matchType,
    cutblock: primaryCutblock,
    allOverlappingCutblocks,
    forest,
    designations,
    riskAssessment,
    queryHealth: {
      queriedAt: new Date().toISOString(),
      succeededLayers,
      failedLayers,
      totalLayers: layerTasks.length,
    },
    rawAuditRecords,
  };
}

/* ============================================================================
 * Lean 7-Layer Fast Location Screener (for Proposal List & Multi-Block Sampling)
 * ========================================================================== */

export async function screenLocationRisk(
  lng: number,
  lat: number,
  areaHa?: number | null
): Promise<{
  riskAssessment: EcologicalRiskAssessment;
  forestPreview: {
    standAgeYears: number | null;
    siteIndexMeters: number | null;
    canopyHeightMeters: number | null;
    becZone: string | null;
  };
  anyWildfireOverlap: boolean;
  anyDesignationOverlap: boolean;
}> {
  const delta = 0.0005;
  const minLon = lng - delta;
  const minLat = lat - delta;
  const maxLon = lng + delta;
  const maxLat = lat + delta;

  const tasks: Array<{
    label: string;
    promise: Promise<RawGeoJSONFeatureCollection>;
  }> = [
    {
      label: "BC Forest Inventory",
      promise: queryBcgwByBbox("pub:WHSE_FOREST_VEGETATION.VEG_COMP_LYR_R1_POLY", minLon, minLat, maxLon, maxLat, 3, 5000),
    },
    {
      label: "Recommended Old-Growth Deferrals",
      promise: queryBcgwByBbox("pub:WHSE_FOREST_VEGETATION.OGSR_TAP_PRIORITY_DEF_AREA_SP", minLon, minLat, maxLon, maxLat, 2, 5000),
    },
    {
      label: "Protected Old-Growth Areas",
      promise: queryBcgwByBbox("pub:WHSE_LAND_USE_PLANNING.RMP_OGMA_LEGAL_CURRENT_SVW", minLon, minLat, maxLon, maxLat, 2, 5000),
    },
    {
      label: "Protected Wildlife Habitat",
      promise: queryBcgwByBbox("pub:WHSE_WILDLIFE_MANAGEMENT.WCP_WILDLIFE_HABITAT_AREA_POLY", minLon, minLat, maxLon, maxLat, 2, 5000),
    },
    {
      label: "Winter Wildlife Ranges",
      promise: queryBcgwByBbox("pub:WHSE_WILDLIFE_MANAGEMENT.WCP_UNGULATE_WINTER_RANGE_SP", minLon, minLat, maxLon, maxLat, 2, 5000),
    },
    {
      label: "Community Drinking-Water Watersheds",
      promise: queryBcgwByBbox("pub:WHSE_WATER_MANAGEMENT.WLS_COMMUNITY_WS_PUB_SVW", minLon, minLat, maxLon, maxLat, 2, 5000),
    },
    {
      label: "Past Wildfire Perimeters",
      promise: queryBcgwByBbox("pub:WHSE_LAND_AND_NATURAL_RESOURCE.PROT_HISTORICAL_FIRE_POLYS_SP", minLon, minLat, maxLon, maxLat, 3, 5000),
    },
    {
      label: "BC Parks & Protected Areas",
      promise: queryBcgwByBbox("pub:WHSE_TANTALIS.TA_PARK_ECORES_PA_SVW", minLon, minLat, maxLon, maxLat, 2, 5000),
    },
  ];

  const settled = await Promise.allSettled(tasks.map((t) => t.promise));
  const failedLayers: string[] = [];

  const getFiltered = (idx: number): RawGeoJSONFeature[] => {
    const res = settled[idx];
    if (res.status === "fulfilled") {
      return filterContainingFeatures(res.value.features || [], lng, lat);
    }
    failedLayers.push(tasks[idx].label);
    return [];
  };

  const { forest } = extractVriProperties(getFiltered(0));
  const tapParsed = extractTapInfo(getFiltered(1)[0]);
  const ogmaFeat = getFiltered(2)[0];
  const whaFeat = getFiltered(3)[0];
  const uwrFeat = getFiltered(4)[0];
  const cwFeat = getFiltered(5)[0];
  const wildfireParsed = extractWildfireInfo(
    undefined,
    getFiltered(6),
    forest.referenceYear
  );
  if (wildfireParsed.info?.postDatesVri) {
    const sev = await queryBurnSeverityAtPoint(
      lng,
      lat,
      wildfireParsed.info.fireYear
    );
    wildfireParsed.info.burnSeverity = sev.rating;
    wildfireParsed.info.burnSeveritySource = sev.source;
  }
  const parkFeat = getFiltered(7)[0];

  const designations: InspectDesignations = {
    tapPriorityDeferral: tapParsed.label,
    tapSubcategories: tapParsed.subcategories,
    legalOgma: ogmaFeat?.properties
      ? String(
          ogmaFeat.properties.OGMA_TYPE ||
            ogmaFeat.properties.LEGAL_OGMA_PROVID ||
            "Current Legal Old Growth Management Area"
        )
      : null,
    legalOgmaId: ogmaFeat?.properties?.LEGAL_OGMA_PROVID
      ? String(ogmaFeat.properties.LEGAL_OGMA_PROVID)
      : null,
    protectedPark: parkFeat?.properties
      ? String(
          parkFeat.properties.PROTECTED_LANDS_NAME ||
            parkFeat.properties.PARK_NAME ||
            "BC Park / Protected Area"
        )
      : null,
    wildlifeHabitatArea: whaFeat?.properties
      ? [
          whaFeat.properties.COMMON_SPECIES_NAME
            ? String(whaFeat.properties.COMMON_SPECIES_NAME)
            : "Species at Risk",
          whaFeat.properties.WHA_NUMBER
            ? `WHA ${whaFeat.properties.WHA_NUMBER}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null,
    ungulateWinterRange: uwrFeat?.properties
      ? [
          uwrFeat.properties.SPECIES_1
            ? String(uwrFeat.properties.SPECIES_1)
            : "Ungulate Winter Range",
          uwrFeat.properties.UWR_NUMBER
            ? `UWR ${uwrFeat.properties.UWR_NUMBER}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null,
    communityWatershed: cwFeat?.properties
      ? String(cwFeat.properties.CW_NAME || "Designated Community Watershed")
      : null,
    recentWildfire: wildfireParsed.info,
  };

  const riskAssessment = assessEcologicalRisk({
    forest,
    designations,
    areaHa,
    assessmentScope: "centroid_screening",
    failedLayers,
  });

  const anyDesignationOverlap = Boolean(
    designations.tapPriorityDeferral ||
      designations.legalOgma ||
      designations.protectedPark ||
      designations.wildlifeHabitatArea ||
      designations.ungulateWinterRange ||
      designations.communityWatershed
  );

  return {
    riskAssessment,
    forestPreview: {
      standAgeYears: forest.standAgeYears,
      siteIndexMeters: forest.siteIndexMeters,
      canopyHeightMeters: forest.canopyHeightMeters,
      becZone: forest.becZone,
    },
    anyWildfireOverlap: Boolean(designations.recentWildfire?.postDatesVri),
    anyDesignationOverlap,
  };
}
