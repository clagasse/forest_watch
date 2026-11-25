#!/usr/bin/env python3
"""
BC Forestry Watch — Reproducible Audited Regional Old-Growth Aggregation (v2.0)

Computes exact per-Natural-Resource-Region old-growth totals, Site Index tiers,
permanent statutory protection (BC Parks + Current Legal OGMAs), and TAP (2021)
recommended deferrals from official BC Data Catalogue downloads.

Requires: geopandas, pyogrio (or fiona), shapely
Outputs:  public/data/regional_context_audited.json

Usage:
    python scripts/compute_regional_context.py \
        --vri data/VEG_COMP_LYR_R1_POLY.gpkg \
        --regions data/ADM_NR_REGIONS_SPG.gpkg \
        --parks data/TA_PARK_ECORES_PA_SVW.gpkg \
        --ogma-current data/RMP_OGMA_LEGAL_CURRENT_SVW.gpkg \
        --tap-deferrals data/OGSR_TAP_PRIORITY_DEF_AREA_SP.gpkg \
        --output public/data/regional_context_audited.json
"""

import argparse
import datetime
import hashlib
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

BC_ALBERS_EPSG = 3005

REGION_ID_MAP = {
    "west coast": ("west-coast", "West Coast Natural Resource Region"),
    "south coast": ("south-coast", "South Coast Natural Resource Region"),
    "thompson-okanagan": ("thompson-okanagan", "Thompson-Okanagan Natural Resource Region"),
    "thompson okanagan": ("thompson-okanagan", "Thompson-Okanagan Natural Resource Region"),
    "kootenay-boundary": ("kootenay-boundary", "Kootenay-Boundary Natural Resource Region"),
    "kootenay boundary": ("kootenay-boundary", "Kootenay-Boundary Natural Resource Region"),
    "cariboo": ("cariboo", "Cariboo Natural Resource Region"),
    "skeena": ("skeena", "Skeena Natural Resource Region"),
    "omineca": ("omineca", "Omineca Natural Resource Region"),
    "northeast": ("northeast", "Northeast Natural Resource Region"),
}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def is_old_growth_row(bec_zone: str, bec_subzone: str, age: float) -> bool:
    z = (bec_zone or "").strip().upper()
    s = (bec_subzone or "").strip().lower()
    is_wet_essf = z == "ESSF" and (s.startswith("w") or s.startswith("v"))
    threshold = 250 if (z in ("CWH", "CDF", "ICH", "MH") or is_wet_essf) else 140
    return age >= threshold


def run_audit(args: argparse.Namespace) -> int:
    try:
        import geopandas as gpd
        import pandas as pd
    except ImportError as exc:
        print(
            f"Error: geopandas and pandas are required to run spatial aggregation ({exc}).\n"
            "Install with: pip install geopandas pyogrio pandas shapely",
            file=sys.stderr,
        )
        return 1

    paths = {
        "VRI (VEG_COMP_LYR_R1_POLY)": Path(args.vri),
        "NR Regions (ADM_NR_REGIONS_SPG)": Path(args.regions),
        "BC Parks (TA_PARK_ECORES_PA_SVW)": Path(args.parks),
        "Current Legal OGMAs (RMP_OGMA_LEGAL_CURRENT_SVW)": Path(args.ogma_current),
        "TAP Priority Deferrals (OGSR_TAP_PRIORITY_DEF_AREA_SP)": Path(args.tap_deferrals),
    }

    for label, p in paths.items():
        if not p.exists():
            print(f"Error: Missing input file for {label}: {p}", file=sys.stderr)
            return 1

    print("[Audit] Computing SHA-256 checksums for input datasets...")
    sources_meta = [
        {"layer": label, "fileName": p.name, "sha256": sha256_file(p)}
        for label, p in paths.items()
    ]

    print("[Audit] Loading Natural Resource Regions in BC Albers (EPSG:3005)...")
    regions_gdf = gpd.read_file(paths["NR Regions (ADM_NR_REGIONS_SPG)"]).to_crs(BC_ALBERS_EPSG)
    region_name_col = next(
        (c for c in regions_gdf.columns if "REGION_NAME" in c.upper() or "ORG_UNIT_NAME" in c.upper()),
        None,
    )
    if not region_name_col:
        print("Error: Could not locate region name column in ADM_NR_REGIONS_SPG.", file=sys.stderr)
        return 1

    print("[Audit] Loading VRI and filtering to old-growth stands (Biodiversity Guidebook NDT rules)...")
    vri_gdf = gpd.read_file(paths["VRI (VEG_COMP_LYR_R1_POLY)"]).to_crs(BC_ALBERS_EPSG)
    vri_gdf = vri_gdf[vri_gdf["PROJ_AGE_1"].fillna(0) > 0].copy()
    vri_gdf["_is_og"] = [
        is_old_growth_row(z, s, a)
        for z, s, a in zip(
            vri_gdf.get("BEC_ZONE_CODE", ""),
            vri_gdf.get("BEC_SUBZONE", ""),
            vri_gdf["PROJ_AGE_1"],
        )
    ]
    og_gdf = vri_gdf[vri_gdf["_is_og"]].copy()

    print("[Audit] Loading Parks, Current Legal OGMAs, and TAP Deferrals...")
    parks_gdf = gpd.read_file(paths["BC Parks (TA_PARK_ECORES_PA_SVW)"]).to_crs(BC_ALBERS_EPSG)
    ogma_gdf = gpd.read_file(paths["Current Legal OGMAs (RMP_OGMA_LEGAL_CURRENT_SVW)"]).to_crs(BC_ALBERS_EPSG)
    tap_gdf = gpd.read_file(paths["TAP Priority Deferrals (OGSR_TAP_PRIORITY_DEF_AREA_SP)"]).to_crs(BC_ALBERS_EPSG)

    perm_prot_union = gpd.GeoDataFrame(
        geometry=pd.concat([parks_gdf.geometry, ogma_gdf.geometry], ignore_index=True),
        crs=BC_ALBERS_EPSG,
    ).dissolve()

    tap_union = tap_gdf[["geometry"]].dissolve()

    results: List[Dict[str, Any]] = []
    tiers = [
        ("Low Productivity (Subalpine / Bog)", "SI < 12m", 0.0, 12.0),
        ("Moderate Productivity (Mid-Slope)", "SI 12-20m", 12.0, 20.0),
        ("High Productivity (Lower Slopes)", "SI 20-25m", 20.0, 25.0),
        ("Very High (Valley-Bottom Giants)", "SI >= 25m", 25.0, 999.0),
    ]

    for _, reg_row in regions_gdf.iterrows():
        raw_name = str(reg_row[region_name_col]).strip()
        norm_key = raw_name.lower().replace("natural resource region", "").strip()
        reg_id, display_name = REGION_ID_MAP.get(norm_key, (norm_key.replace(" ", "-"), raw_name))

        print(f"[Audit] Intersecting {display_name}...")
        reg_clip = gpd.clip(og_gdf, reg_row.geometry)
        reg_clip["_ha"] = reg_clip.geometry.area / 10000.0
        total_og_ha = round(float(reg_clip["_ha"].sum()), 1)

        perm_clip = gpd.clip(reg_clip, perm_prot_union)
        perm_ha = round(float((perm_clip.geometry.area / 10000.0).sum()), 1)
        perm_pct = round((perm_ha / total_og_ha) * 100, 1) if total_og_ha > 0 else 0.0

        tap_clip = gpd.clip(reg_clip, tap_union)
        tap_ha = round(float((tap_clip.geometry.area / 10000.0).sum()), 1)

        tier_rows = []
        for label, si_range, lo, hi in tiers:
            sub = reg_clip[(reg_clip["SITE_INDEX"].fillna(0) >= lo) & (reg_clip["SITE_INDEX"].fillna(0) < hi)]
            sub_ha = round(float(sub["_ha"].sum()), 1)
            sub_perm = gpd.clip(sub, perm_prot_union)
            sub_perm_ha = float((sub_perm.geometry.area / 10000.0).sum())
            sub_perm_pct = round((sub_perm_ha / sub_ha) * 100, 1) if sub_ha > 0 else 0.0
            tier_rows.append(
                {
                    "tierLabel": label,
                    "siteIndexRange": si_range,
                    "hectares": sub_ha,
                    "permanentlyProtectedPct": sub_perm_pct,
                }
            )

        results.append(
            {
                "regionId": reg_id,
                "regionName": display_name,
                "totalOldGrowthHa": total_og_ha,
                "permanentlyProtectedOldGrowthHa": perm_ha,
                "permanentlyProtectedPct": perm_pct,
                "tapRecommendedDeferralHa": tap_ha,
                "byProductivityTier": tier_rows,
            }
        )

    out_payload = {
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "methodologyVersion": "v2.0",
        "sources": sources_meta,
        "regions": results,
    }

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out_payload, indent=2), encoding="utf-8")
    print(f"[Audit] Wrote audited regional summary to {out_path}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compute audited regional old-growth & protection totals from official BC Data Catalogue downloads."
    )
    parser.add_argument("--vri", required=True, help="Path to VEG_COMP_LYR_R1_POLY file")
    parser.add_argument("--regions", required=True, help="Path to ADM_NR_REGIONS_SPG file")
    parser.add_argument("--parks", required=True, help="Path to TA_PARK_ECORES_PA_SVW file")
    parser.add_argument("--ogma-current", required=True, help="Path to RMP_OGMA_LEGAL_CURRENT_SVW file")
    parser.add_argument("--tap-deferrals", required=True, help="Path to OGSR_TAP_PRIORITY_DEF_AREA_SP file")
    parser.add_argument(
        "--output",
        default="public/data/regional_context_audited.json",
        help="Output JSON path (default: public/data/regional_context_audited.json)",
    )
    return run_audit(parser.parse_args())


if __name__ == "__main__":
    sys.exit(main())
