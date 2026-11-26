import { NextRequest, NextResponse } from "next/server";
import { inspectLocation } from "@/lib/bcgw";
import { createMemoryRateLimiter, getClientIp } from "@/lib/requestGuards";
import { createUnassessedRisk } from "@/lib/riskAssessment";

export const maxDuration = 30;

const checkInspectRateLimit = createMemoryRateLimiter({
  maxRequests: 60,
  windowMs: 60_000,
});

export async function GET(request: NextRequest) {
  const rate = checkInspectRateLimit(getClientIp(request));
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many inspection requests. Please wait a minute and retry." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const rawLng = Number(searchParams.get("lng"));
  const rawLat = Number(searchParams.get("lat"));

  if (
    !Number.isFinite(rawLng) ||
    !Number.isFinite(rawLat) ||
    rawLng < -140 ||
    rawLng > -113 ||
    rawLat < 48 ||
    rawLat > 61
  ) {
    return NextResponse.json(
      { error: "Coordinates must be within British Columbia" },
      { status: 400 }
    );
  }

  const lng = Math.round(rawLng * 10000) / 10000;
  const lat = Math.round(rawLat * 10000) / 10000;

  try {
    const result = await inspectLocation(lng, lat);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control":
          "public, max-age=120, s-maxage=300, stale-while-revalidate=900",
      },
    });
  } catch (err) {
    const errorMessage =
      process.env.NODE_ENV === "production"
        ? "BC Government forest records are temporarily unavailable. Please try again shortly."
        : `DataBC lookup failed: ${String(err)}`;

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
        riskAssessment: createUnassessedRisk(errorMessage),
        error: errorMessage,
      },
      { status: 502 }
    );
  }
}
