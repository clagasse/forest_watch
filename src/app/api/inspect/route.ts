import { NextRequest, NextResponse } from "next/server";
import { inspectLocation } from "@/lib/bcgw";
import { createUnassessedRisk } from "@/lib/riskAssessment";

export const maxDuration = 30;

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 60;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (rateBuckets.size > 500) {
    for (const [k, v] of rateBuckets.entries()) {
      if (v.resetAt <= now) rateBuckets.delete(k);
    }
  }
  const existing = rateBuckets.get(ip);
  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (existing.count >= RATE_MAX_REQUESTS) {
    return false;
  }
  existing.count += 1;
  return true;
}

export async function GET(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const clientIp =
    (forwarded ? forwarded.split(",")[0].trim() : null) ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: "Too many inspection requests. Please wait a minute and retry." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const { searchParams } = new URL(request.url);
  const lng = Number(searchParams.get("lng"));
  const lat = Number(searchParams.get("lat"));

  if (
    !Number.isFinite(lng) ||
    !Number.isFinite(lat) ||
    lng < -140 ||
    lng > -113 ||
    lat < 48 ||
    lat > 61
  ) {
    return NextResponse.json(
      { error: "Coordinates must be within British Columbia" },
      { status: 400 }
    );
  }

  try {
    const result = await inspectLocation(lng, lat);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control":
          "public, max-age=120, s-maxage=300, stale-while-revalidate=900",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        coordinates: [lng, lat],
        cutblock: null,
        allOverlappingCutblocks: [],
        forest: {
          hasInventory: false,
          standAgeYears: null,
          canopyHeightMeters: null,
          siteIndexMeters: null,
          dominantSpecies: null,
          becZone: null,
          areaHa: null,
          oldGrowthThresholdYears: null,
          isOldGrowth: null,
        },
        designations: {
          tapPriorityDeferral: null,
          legalOgma: null,
          protectedPark: null,
        },
        riskAssessment: createUnassessedRisk(`DataBC lookup failed: ${String(err)}`),
        error: `DataBC lookup failed: ${String(err)}`,
      },
      { status: 502 }
    );
  }
}
