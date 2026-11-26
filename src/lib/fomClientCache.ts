import type { FomProjectSummary } from "@/data/bcForestryData";

export interface RegionCatalogTotal {
  totalListedCount: number;
  totalBlockCount: number;
  totalPlannedHa: number;
}

export interface FomProjectsPayload {
  projects: FomProjectSummary[];
  source: string;
  preassessedAt: string | null;
  totalCatalogCount?: number;
  regionCatalogTotals?: Record<string, RegionCatalogTotal>;
}

const inFlightByScope: Partial<
  Record<"default" | "all", Promise<FomProjectsPayload>>
> = {};
const resolvedByScope: Partial<
  Record<"default" | "all", FomProjectsPayload>
> = {};

async function fetchFomPayloadFromNetwork(
  scope: "default" | "all",
  force: boolean
): Promise<FomProjectsPayload> {
  const fetchInit: RequestInit = force ? { cache: "no-store" } : {};
  const apiUrl =
    scope === "all" ? "/api/fom-projects?scope=all" : "/api/fom-projects";

  try {
    const resp = await fetch(apiUrl, fetchInit);
    if (resp.ok) {
      const parsed = await resp.json();
      if (parsed && Array.isArray(parsed.projects) && !parsed.error) {
        return {
          projects: parsed.projects as FomProjectSummary[],
          source: String(parsed.source || "preassessed_snapshot"),
          preassessedAt:
            parsed.preassessedAt ||
            parsed.generatedAt ||
            parsed.fetchedAt ||
            null,
          totalCatalogCount:
            typeof parsed.totalCatalogCount === "number"
              ? parsed.totalCatalogCount
              : undefined,
          regionCatalogTotals: parsed.regionCatalogTotals || undefined,
        };
      }
    }
  } catch {
    // Fall through to static snapshot
  }

  const snapResp = await fetch("/data/preassessed_foms.json", fetchInit);
  if (snapResp.ok) {
    const snap = await snapResp.json();
    if (snap && Array.isArray(snap.projects)) {
      return {
        projects: snap.projects as FomProjectSummary[],
        source: "preassessed_snapshot",
        preassessedAt: snap.generatedAt || null,
      };
    }
  }

  throw new Error("Unable to load BC FOM proposals");
}

export function loadFomProjectsShared(opts?: {
  scope?: "default" | "all";
  force?: boolean;
}): Promise<FomProjectsPayload> {
  const scope = opts?.scope === "all" ? "all" : "default";
  const force = Boolean(opts?.force);

  if (!force && resolvedByScope[scope]) {
    return Promise.resolve(resolvedByScope[scope]!);
  }

  if (!force && inFlightByScope[scope]) {
    return inFlightByScope[scope]!;
  }

  const promise = fetchFomPayloadFromNetwork(scope, force)
    .then((payload) => {
      resolvedByScope[scope] = payload;
      delete inFlightByScope[scope];
      return payload;
    })
    .catch((err) => {
      delete inFlightByScope[scope];
      throw err;
    });

  inFlightByScope[scope] = promise;
  return promise;
}
