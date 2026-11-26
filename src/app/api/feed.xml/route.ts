import { NextRequest, NextResponse } from "next/server";
import {
  BC_NATURAL_RESOURCE_REGIONS,
  EcologicalRiskCategory,
  isFomOpenForComment,
} from "@/data/bcForestryData";
import { readPreassessedSnapshotFromDisk } from "@/lib/fomPreassessment";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://bc-forestry-watch.vercel.app";

const RISK_MIN_RANK: Record<EcologicalRiskCategory, number> = {
  very_high: 4,
  high: 3,
  moderate: 2,
  low: 1,
  unassessed: 0,
};

function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const regionFilter = searchParams.get("region")?.trim() || "";
  const minRiskParam = (searchParams.get("minRisk") || "").trim() as EcologicalRiskCategory;
  const minRank =
    minRiskParam && minRiskParam in RISK_MIN_RANK
      ? RISK_MIN_RANK[minRiskParam]
      : 0;

  const snapshot = readPreassessedSnapshotFromDisk();
  const projects = snapshot?.projects || [];
  const openItems = projects
    .filter((p) => isFomOpenForComment(p))
    .filter((p) => !regionFilter || p.regionId === regionFilter)
    .filter((p) => (p.riskAssessment?.rank ?? 0) >= minRank)
    .slice(0, 100);

  const regionName = regionFilter
    ? BC_NATURAL_RESOURCE_REGIONS.find((r) => r.id === regionFilter)?.name ||
      regionFilter
    : "All of British Columbia";

  const updatedAt = snapshot?.generatedAt
    ? new Date(snapshot.generatedAt).toUTCString()
    : new Date().toUTCString();

  const itemsXml = openItems
    .map((proj) => {
      const link = `${SITE_URL}/?fomId=${encodeURIComponent(proj.fomId)}`;
      const riskLabel = proj.riskAssessment?.label || "Unassessed";
      const ageStr =
        proj.forestPreview?.standAgeYears !== null &&
        proj.forestPreview?.standAgeYears !== undefined
          ? ` | Stand age ~${proj.forestPreview.standAgeYears} yrs`
          : "";
      const areaStr = proj.totalPlannedHa
        ? ` | ${proj.totalPlannedHa} ha`
        : "";
      const closeStr = proj.commentCloseDate
        ? ` | Comment deadline: ${proj.commentCloseDate}`
        : "";
      const reasonStr = proj.riskAssessment?.reasons?.[0]
        ? ` — ${proj.riskAssessment.reasons[0]}`
        : "";

      const title = `[${riskLabel}] ${proj.name} (${proj.district})`;
      const description = `${proj.fspHolder}${areaStr}${ageStr}${closeStr}${reasonStr}`;
      const pubDate = proj.commentOpenDate
        ? new Date(`${proj.commentOpenDate}T12:00:00Z`).toUTCString()
        : updatedAt;

      return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <description>${escapeXml(description)}</description>
    </item>`;
    })
    .join("\n");

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(`BC Forestry Watch — Open Logging Proposals (${regionName})`)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>${escapeXml("Pre-assessed 30-day Forest Operations Map public review proposals across British Columbia.")}</description>
    <language>en-ca</language>
    <lastBuildDate>${escapeXml(updatedAt)}</lastBuildDate>
    <atom:link href="${escapeXml(`${SITE_URL}/api/feed.xml`)}" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

  return new NextResponse(rssXml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control":
        "public, max-age=300, s-maxage=900, stale-while-revalidate=1800",
    },
  });
}
