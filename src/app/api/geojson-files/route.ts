import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), "public", "data");
    if (!fs.existsSync(dataDir)) {
      return NextResponse.json({ files: [] });
    }

    const entries = fs.readdirSync(dataDir);
    const files = entries
      .filter((name) => name.toLowerCase().endsWith(".geojson"))
      .map((name) => {
        const fullPath = path.join(dataDir, name);
        const stat = fs.statSync(fullPath);
        return {
          filename: name,
          url: `/data/${name}`,
          sizeBytes: stat.size,
          updatedAt: stat.mtime.toISOString(),
        };
      });

    return NextResponse.json(
      { files },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=600",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { files: [], error: String(error) },
      { status: 500 }
    );
  }
}
