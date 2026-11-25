import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const createJiti = require("jiti");

const jiti = createJiti(path.resolve("package.json"), {
  alias: {
    "@": path.resolve("src"),
  },
});

const { generatePreassessedSnapshot } = jiti("./src/lib/fomPreassessment.ts");

function parseArgs(argv) {
  const opts = {
    limit: undefined,
    maxBlocks: 5,
    concurrency: 4,
    out: path.resolve("public", "data", "preassessed_foms.json"),
  };

  for (const arg of argv) {
    if (arg.startsWith("--limit=")) {
      const n = Number(arg.slice("--limit=".length));
      if (Number.isFinite(n) && n > 0) opts.limit = Math.floor(n);
    } else if (arg.startsWith("--max-blocks=")) {
      const n = Number(arg.slice("--max-blocks=".length));
      if (Number.isFinite(n) && n > 0) opts.maxBlocks = Math.floor(n);
    } else if (arg.startsWith("--concurrency=")) {
      const n = Number(arg.slice("--concurrency=".length));
      if (Number.isFinite(n) && n > 0) opts.concurrency = Math.floor(n);
    } else if (arg.startsWith("--out=")) {
      const p = arg.slice("--out=".length).trim();
      if (p) opts.out = path.resolve(p);
    }
  }

  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const startedAt = Date.now();
  console.log(
    `[preassess] Starting BC FOM pre-assessment (maxBlocks=${opts.maxBlocks}, concurrency=${opts.concurrency}${
      opts.limit ? `, limit=${opts.limit}` : ""
    })...`
  );

  const snapshot = await generatePreassessedSnapshot({
    limit: opts.limit,
    maxBlocks: opts.maxBlocks,
    concurrency: opts.concurrency,
    onProgress: (done, total, proj) => {
      const blocks = proj.projectScreening?.sampledBlocks ?? proj.blockCount ?? 0;
      const label = proj.riskAssessment?.label || "Unassessed";
      console.log(
        `[${done}/${total}] FOM #${proj.fomId} (${blocks} sampled) -> ${label}`
      );
    },
  });

  if (!snapshot || !Array.isArray(snapshot.projects) || snapshot.projects.length === 0) {
    console.error(
      "[preassess] ERROR: Received 0 projects from BC FOM/DataBC. Existing snapshot was NOT overwritten."
    );
    process.exit(1);
  }

  const outDir = path.dirname(opts.out);
  fs.mkdirSync(outDir, { recursive: true });
  const tmpPath = `${opts.out}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(snapshot, null, 2), "utf8");
  fs.renameSync(tmpPath, opts.out);

  const counts = {
    very_high: 0,
    high: 0,
    moderate: 0,
    low: 0,
    unassessed: 0,
  };
  for (const p of snapshot.projects) {
    const cat = p.riskAssessment?.category || "unassessed";
    counts[cat] = (counts[cat] || 0) + 1;
  }

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n[preassess] Completed in ${elapsedSec}s -> ${opts.out}`);
  console.log(
    `[preassess] Total: ${snapshot.totalProjects} | Open: ${snapshot.openProjectsCount} | Assessed: ${snapshot.assessedProjectsCount}`
  );
  console.log(
    `[preassess] Breakdown: Very High=${counts.very_high}, High=${counts.high}, Moderate=${counts.moderate}, Lower=${counts.low}, Unassessed=${counts.unassessed}`
  );
}

main().catch((err) => {
  console.error("[preassess] Fatal error:", err);
  process.exit(1);
});
