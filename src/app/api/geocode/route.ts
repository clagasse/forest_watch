import { NextRequest, NextResponse } from "next/server";
import { createMemoryRateLimiter, getClientIp } from "@/lib/requestGuards";

export const maxDuration = 15;

const BC_GEOCODER_URL = "https://geocoder.api.gov.bc.ca/addresses.geojson";

const checkGeocodeRateLimit = createMemoryRateLimiter({
  maxRequests: 60,
  windowMs: 60_000,
});

export async function GET(request: NextRequest) {
  const rate = checkGeocodeRateLimit(getClientIp(request));
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many location searches. Please wait a minute and retry." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
    );
  }

  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2 || q.length > 120) {
    return NextResponse.json({ results: [] });
  }

  try {
    const params = new URLSearchParams({
      addressString: q,
      maxResults: "5",
      autoComplete: "true",
    });

    const resp = await fetch(`${BC_GEOCODER_URL}?${params.toString()}`, {
      headers: {
        "User-Agent": "BC-Forestry-Watch/2.1 (Open Data Public Tool)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!resp.ok) {
      return NextResponse.json(
        { results: [], error: "BC Address Geocoder unavailable" },
        { status: 502 }
      );
    }

    const geojson = (await resp.json()) as {
      features?: Array<{
        geometry?: { coordinates?: unknown };
        properties?: Record<string, unknown>;
      }>;
    };

    const results = (geojson.features || [])
      .map((feat) => {
        const coords = feat.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return null;
        const lng = Number(coords[0]);
        const lat = Number(coords[1]);
        if (
          !Number.isFinite(lng) ||
          !Number.isFinite(lat) ||
          lng < -140 ||
          lng > -113 ||
          lat < 48 ||
          lat > 61
        ) {
          return null;
        }
        const props = feat.properties || {};
        const label = String(
          props.fullAddress || props.localityName || q
        ).trim();
        const locality = props.localityName
          ? String(props.localityName).trim()
          : "";
        const precision = props.matchPrecision
          ? String(props.matchPrecision).trim()
          : "";
        return {
          label,
          locality,
          lng: Number(lng.toFixed(5)),
          lat: Number(lat.toFixed(5)),
          precision,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    return NextResponse.json(
      { results },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=3600",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { results: [], error: "BC Address Geocoder request failed" },
      { status: 502 }
    );
  }
}
