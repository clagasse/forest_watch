import { NextRequest, NextResponse } from "next/server";
import {
  CUTBLOCK_STAGE_STYLE_MAP,
  OVERLAY_STYLE_MAP,
  type CutblockStage,
  type ForestOverlayKey,
  type MapLayerStyleSpec,
} from "@/data/bcForestryData";
import { createMemoryRateLimiter, getClientIp } from "@/lib/requestGuards";

export const maxDuration = 30;

const BCGW_WMS_URL = "https://openmaps.gov.bc.ca/geo/pub/wms";
const BBOX_REGEX =
  /^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;
const BC_3857 = {
  minX: -15_800_000,
  maxX: -12_400_000,
  minY: 6_050_000,
  maxY: 8_650_000,
};
const EMPTY_PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);
const checkWmsRateLimit = createMemoryRateLimiter({
  maxRequests: 360,
  windowMs: 60_000,
});

function getStyleSpecForWmsKey(layerKey: string): MapLayerStyleSpec | undefined {
  if (layerKey === "completed_cutblocks") {
    return CUTBLOCK_STAGE_STYLE_MAP.completed;
  }
  if (
    layerKey === "fom_proposed" ||
    layerKey === "ften_pending" ||
    layerKey === "ften_active"
  ) {
    return CUTBLOCK_STAGE_STYLE_MAP[layerKey as CutblockStage];
  }
  return OVERLAY_STYLE_MAP[layerKey as ForestOverlayKey];
}

function buildPolygonSld(
  layerName: string,
  style: MapLayerStyleSpec
): string {
  const fillXml =
    !style.outlineOnly && style.fillOpacity > 0
      ? `<Fill><CssParameter name="fill">${style.fill}</CssParameter><CssParameter name="fill-opacity">${style.fillOpacity}</CssParameter></Fill>`
      : "";
  const dashXml = style.dashArray
    ? `<CssParameter name="stroke-dasharray">${style.dashArray}</CssParameter>`
    : "";
  const strokeXml = `<Stroke><CssParameter name="stroke">${style.stroke}</CssParameter><CssParameter name="stroke-width">${style.strokeWidth}</CssParameter>${dashXml}</Stroke>`;

  return `<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><NamedLayer><Name>${layerName}</Name><UserStyle><FeatureTypeStyle><Rule><PolygonSymbolizer>${fillXml}${strokeXml}</PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`;
}

interface WmsLayerSpec {
  layers: string;
  cqlFilter?: string;
}

const WET_BEC_CQL =
  "(BEC_ZONE_CODE IN ('CWH','CDF','ICH','MH') OR (BEC_ZONE_CODE='ESSF' AND (BEC_SUBZONE LIKE 'w%' OR BEC_SUBZONE LIKE 'v%')))";

const WMS_LAYER_MAP: Record<string, WmsLayerSpec> = {
  fom_proposed: {
    layers: "pub:WHSE_FOREST_TENURE.FOM_CUTBLOCK_SP",
  },
  ften_pending: {
    layers: "pub:WHSE_FOREST_TENURE.FTEN_CUT_BLOCK_POLY_SVW",
    cqlFilter: "LIFE_CYCLE_STATUS_CODE='PENDING'",
  },
  ften_active: {
    layers: "pub:WHSE_FOREST_TENURE.FTEN_CUT_BLOCK_POLY_SVW",
    cqlFilter: "LIFE_CYCLE_STATUS_CODE='ACTIVE'",
  },
  completed_cutblocks: {
    layers: "pub:WHSE_FOREST_VEGETATION.VEG_CONSOLIDATED_CUT_BLOCKS_SP",
  },
  vri_old_growth: {
    layers: "pub:WHSE_FOREST_VEGETATION.VEG_COMP_LYR_R1_POLY",
    cqlFilter: `(${WET_BEC_CQL} AND PROJ_AGE_1>=250) OR (NOT ${WET_BEC_CQL} AND PROJ_AGE_1>=140)`,
  },
  vri_high_si: {
    layers: "pub:WHSE_FOREST_VEGETATION.VEG_COMP_LYR_R1_POLY",
    cqlFilter: "SITE_INDEX>=20",
  },
  vri_tall_canopy: {
    layers: "pub:WHSE_FOREST_VEGETATION.VEG_COMP_LYR_R1_POLY",
    cqlFilter: "PROJ_HEIGHT_1>=35",
  },
  tap_deferrals: {
    layers: "pub:WHSE_FOREST_VEGETATION.OGSR_TAP_PRIORITY_DEF_AREA_SP",
  },
  ogma_legal: {
    layers: "pub:WHSE_LAND_USE_PLANNING.RMP_OGMA_LEGAL_CURRENT_SVW",
  },
  bc_parks: {
    layers: "pub:WHSE_TANTALIS.TA_PARK_ECORES_PA_SVW",
  },
  wha_approved: {
    layers: "pub:WHSE_WILDLIFE_MANAGEMENT.WCP_WILDLIFE_HABITAT_AREA_POLY",
  },
  uwr_approved: {
    layers: "pub:WHSE_WILDLIFE_MANAGEMENT.WCP_UNGULATE_WINTER_RANGE_SP",
  },
  community_watersheds: {
    layers: "pub:WHSE_WATER_MANAGEMENT.WLS_COMMUNITY_WS_PUB_SVW",
  },
  wildfire_recent: {
    layers: "pub:WHSE_LAND_AND_NATURAL_RESOURCE.PROT_HISTORICAL_FIRE_POLYS_SP",
    cqlFilter: "FIRE_YEAR>=2017",
  },
  nr_regions: {
    layers: "pub:WHSE_ADMIN_BOUNDARIES.ADM_NR_REGIONS_SPG",
  },
  nr_districts: {
    layers: "pub:WHSE_ADMIN_BOUNDARIES.ADM_NR_DISTRICTS_SPG",
  },
  tsa_boundaries: {
    layers: "pub:WHSE_ADMIN_BOUNDARIES.FADM_TSA",
  },
};

export async function GET(request: NextRequest) {
  const rate = checkWmsRateLimit(getClientIp(request));
  if (!rate.allowed) {
    return new NextResponse("Too many map tile requests", {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfterSec) },
    });
  }

  const { searchParams } = new URL(request.url);
  const layerKey = searchParams.get("layerKey") || "";
  const bbox = searchParams.get("bbox") || "";
  const completedSince = searchParams.get("completedSince") || "2020";

  const spec = WMS_LAYER_MAP[layerKey];
  if (!spec) {
    return NextResponse.json(
      { error: "Unsupported WMS layerKey" },
      { status: 400 }
    );
  }

  if (!BBOX_REGEX.test(bbox)) {
    return NextResponse.json(
      { error: "Invalid bbox parameter" },
      { status: 400 }
    );
  }

  const [minX, minY, maxX, maxY] = bbox.split(",").map(Number);
  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY) ||
    minX >= maxX ||
    minY >= maxY ||
    maxX - minX <= 1 ||
    maxY - minY <= 1
  ) {
    return NextResponse.json(
      { error: "Invalid bbox bounds" },
      { status: 400 }
    );
  }

  const intersectsBc =
    maxX >= BC_3857.minX &&
    minX <= BC_3857.maxX &&
    maxY >= BC_3857.minY &&
    minY <= BC_3857.maxY;

  if (!intersectsBc) {
    return new NextResponse(EMPTY_PNG_BUFFER, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "X-WMS-Style": "out-of-bounds",
      },
    });
  }

  const normalizedBbox = `${Math.round(minX)},${Math.round(minY)},${Math.round(maxX)},${Math.round(maxY)}`;

  let cqlFilter = spec.cqlFilter;
  if (layerKey === "completed_cutblocks") {
    if (completedSince === "2020") {
      cqlFilter = "HARVEST_START_YEAR_CALENDAR>=2020";
    } else if (completedSince === "2015") {
      cqlFilter = "HARVEST_START_YEAR_CALENDAR>=2015";
    } else {
      cqlFilter = undefined;
    }
  }

  const baseParams = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.3.0",
    REQUEST: "GetMap",
    LAYERS: spec.layers,
    CRS: "EPSG:3857",
    BBOX: normalizedBbox,
    WIDTH: "256",
    HEIGHT: "256",
    FORMAT: "image/png",
    TRANSPARENT: "true",
  });

  if (cqlFilter) {
    baseParams.set("CQL_FILTER", cqlFilter);
  }

  const styleSpec = getStyleSpecForWmsKey(layerKey);
  const fetchHeaders = {
    "User-Agent": "BC-Forestry-Watch/2.0 (Open Data Public Tool)",
  };

  try {
    let upstream: Response | null = null;
    let appliedStyle: "sld" | "default" = "default";

    if (styleSpec) {
      const sldParams = new URLSearchParams(baseParams);
      sldParams.set("SLD_BODY", buildPolygonSld(spec.layers, styleSpec));
      const sldRes = await fetch(`${BCGW_WMS_URL}?${sldParams.toString()}`, {
        headers: fetchHeaders,
        signal: AbortSignal.timeout(12000),
      });
      const sldType = sldRes.headers.get("content-type") || "";
      if (sldRes.ok && sldType.includes("image")) {
        upstream = sldRes;
        appliedStyle = "sld";
      }
    }

    if (!upstream) {
      const defaultParams = new URLSearchParams(baseParams);
      defaultParams.set("STYLES", "");
      upstream = await fetch(`${BCGW_WMS_URL}?${defaultParams.toString()}`, {
        headers: fetchHeaders,
        signal: AbortSignal.timeout(12000),
      });
    }

    const contentType = upstream.headers.get("content-type") || "";
    if (!upstream.ok || !contentType.includes("image")) {
      return new NextResponse("Upstream DataBC WMS error", { status: 502 });
    }

    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control":
          "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        "X-WMS-Style": appliedStyle,
      },
    });
  } catch {
    return new NextResponse("DataBC WMS timeout or unreachable", {
      status: 502,
    });
  }
}
