import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  FomProjectSummary,
  isFomOpenForComment,
  matchDistrictToRegionId,
} from "@/data/bcForestryData";
import { resolveRegionIdForPoint } from "@/lib/bcgw";
import {
  fetchCutblocksForFomIds,
  fetchRawFomCatalog,
  readPreassessedSnapshotFromDisk,
  screenFomProjectBlocks,
  sortFomProjects,
} from "@/lib/fomPreassessment";
import { createUnassessedRisk } from "@/lib/riskAssessment";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface CachedFomResponse {
  projects: FomProjectSummary[];
  source: string;
  fetchedAt: string;
  preassessedAt: string | null;
  snapshotMtimeMs: number | null;
  expiresAt: number;
}

let cachedResponse: CachedFomResponse | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const SNAPSHOT_FRESH_MS = 6 * 60 * 60 * 1000; // 6 hours
const NO_STORE_HEADERS = {
  "Cache-Control":
    process.env.NODE_ENV === "production"
      ? "public, max-age=60, s-maxage=300, stale-while-revalidate=900"
      : "no-store, max-age=0",
};

function getSnapshotMtimeMs(): number | null {
  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      "data",
      "preassessed_foms.json"
    );
    if (!fs.existsSync(filePath)) return null;
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return null;
  }
}

async function screenNewOpenProposals(
  projects: FomProjectSummary[],
  maxToScreen: number
): Promise<FomProjectSummary[]> {
  const openUnassessed = projects
    .filter(
      (p) => isFomOpenForComment(p) && (p.riskAssessment?.rank ?? 0) === 0
    )
    .slice(0, maxToScreen);

  if (openUnassessed.length === 0) {
    return sortFomProjects(projects);
  }

  const targetIds = openUnassessed.map((p) => p.fomId);
  const blocksByFomId = await fetchCutblocksForFomIds(targetIds);
  const screenedMap = new Map<string, FomProjectSummary>();

  for (let i = 0; i < openUnassessed.length; i += 4) {
    const chunk = openUnassessed.slice(i, i + 4);
    const settled = await Promise.allSettled(
      chunk.map((proj) =>
        screenFomProjectBlocks(proj, blocksByFomId.get(proj.fomId) || [], 5)
      )
    );
    for (const item of settled) {
      if (item.status === "fulfilled") {
        screenedMap.set(item.value.fomId, item.value);
      }
    }
  }

  const merged = await Promise.all(
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
            "Click proposal to load cutblocks and run multi-block sensitivity assessment."
          ),
      };
    })
  );

  return sortFomProjects(merged);
}

export async function GET(request: NextRequest) {
  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";
  const currentMtimeMs = getSnapshotMtimeMs();

  if (
    !forceRefresh &&
    cachedResponse &&
    Date.now() < cachedResponse.expiresAt &&
    cachedResponse.snapshotMtimeMs === currentMtimeMs
  ) {
    return NextResponse.json(
      {
        projects: cachedResponse.projects,
        source: cachedResponse.source,
        fetchedAt: cachedResponse.fetchedAt,
        preassessedAt: cachedResponse.preassessedAt,
      },
      { headers: NO_STORE_HEADERS }
    );
  }

  const snapshot = readPreassessedSnapshotFromDisk();
  const snapshotTimeMs = snapshot?.generatedAt
    ? Date.parse(snapshot.generatedAt)
    : Number.NaN;
  const snapshotAgeMs = Number.isFinite(snapshotTimeMs)
    ? Date.now() - snapshotTimeMs
    : Number.POSITIVE_INFINITY;

  // Fast path: disk snapshot is fresh (< 6 hours old) and not forced to refresh
  if (!forceRefresh && snapshot && snapshotAgeMs < SNAPSHOT_FRESH_MS) {
    cachedResponse = {
      projects: snapshot.projects,
      source: "preassessed_snapshot",
      fetchedAt: snapshot.generatedAt,
      preassessedAt: snapshot.generatedAt,
      snapshotMtimeMs: currentMtimeMs,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    return NextResponse.json(
      {
        projects: snapshot.projects,
        source: "preassessed_snapshot",
        fetchedAt: snapshot.generatedAt,
        preassessedAt: snapshot.generatedAt,
      },
      { headers: NO_STORE_HEADERS }
    );
  }

  // Live catalog fetch + merge with snapshot (or live-only if no snapshot)
  try {
    const catalog = await fetchRawFomCatalog();
    const snapshotById = new Map<string, FomProjectSummary>();
    if (snapshot) {
      for (const p of snapshot.projects) {
        snapshotById.set(p.fomId, p);
      }
    }

    const combined = catalog.projects.map((liveProj) => {
      const cached = snapshotById.get(liveProj.fomId);
      if (!cached) return liveProj;
      return {
        ...liveProj,
        center: cached.center || liveProj.center,
        regionId: cached.regionId || liveProj.regionId,
        blockCount: cached.blockCount ?? liveProj.blockCount,
        totalPlannedHa: cached.totalPlannedHa ?? liveProj.totalPlannedHa,
        riskAssessment: cached.riskAssessment || liveProj.riskAssessment,
        projectScreening: cached.projectScreening || liveProj.projectScreening,
        forestPreview: cached.forestPreview || liveProj.forestPreview,
      };
    });

    const maxNewToScreen = snapshot ? 15 : 35;
    const enriched = await screenNewOpenProposals(combined, maxNewToScreen);
    const nowIso = new Date().toISOString();
    const source = snapshot ? `${catalog.source}_merged` : catalog.source;
    const preassessedAt = snapshot?.generatedAt ?? nowIso;

    cachedResponse = {
      projects: enriched,
      source,
      fetchedAt: nowIso,
      preassessedAt,
      snapshotMtimeMs: currentMtimeMs,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    return NextResponse.json(
      {
        projects: enriched,
        source,
        fetchedAt: nowIso,
        preassessedAt,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    if (snapshot) {
      cachedResponse = {
        projects: snapshot.projects,
        source: "preassessed_snapshot",
        fetchedAt: snapshot.generatedAt,
        preassessedAt: snapshot.generatedAt,
        snapshotMtimeMs: currentMtimeMs,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
      return NextResponse.json(
        {
          projects: snapshot.projects,
          source: "preassessed_snapshot",
          fetchedAt: snapshot.generatedAt,
          preassessedAt: snapshot.generatedAt,
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        projects: [],
        source: "bcgw_wfs",
        fetchedAt: new Date().toISOString(),
        preassessedAt: null,
        error: `Unable to reach BC FOM API or DataBC WFS (${String(err)}).`,
      },
      { status: 502, headers: NO_STORE_HEADERS }
    );
  }
}
