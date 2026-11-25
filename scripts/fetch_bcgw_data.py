#!/usr/bin/env python3
"""
BC Logging & Forest Status Watch — DataBC / BCGW WFS & BC FOM Ingestion Pipeline

Fetches authoritative British Columbia logging, cutting permit, Forest Operations Map (FOM),
and forest inventory polygons directly from the BC Geographic Warehouse (BCGW) WFS 2.0
and the BC Forest Operations Map (FOM) public API, and exports web-ready GeoJSON for the
Next.js MapLibre frontend.

Official BC Open Data Sources:
1. Consolidated Cutblocks (Recent & Historical Logging):
   Layer: pub:WHSE_FOREST_VEGETATION.VEG_CONSOLIDATED_CUT_BLOCKS_SP
   Catalogue: https://catalogue.data.gov.bc.ca/dataset/harvested-areas-of-bc-consolidated-cutblocks-
2. Forest Tenure Cutblocks (FTEN Pending & Active Cutting Permits):
   Layer: pub:WHSE_FOREST_TENURE.FTEN_CUT_BLOCK_POLY_SVW
   Catalogue: https://catalogue.data.gov.bc.ca/dataset/forest-tenure-cut-block-polygons-fta-4-0
3. Forest Operations Map (FOM) Cutblocks (30-Day Public Comment Proposals):
   Layer: pub:WHSE_FOREST_TENURE.FOM_CUTBLOCK_SP
   Public API: https://fom.nrs.gov.bc.ca/api/project/publicSummary
4. Vegetation Resources Inventory (VRI) - Forest Vegetation Composite Polygons:
   Layer: pub:WHSE_FOREST_VEGETATION.VEG_COMP_LYR_R1_POLY
   Catalogue: https://catalogue.data.gov.bc.ca/dataset/vri-2023-forest-vegetation-composite-layer-1-r1-
5. Legal Old Growth Management Areas (Current OGMAs):
   Layer: pub:WHSE_LAND_USE_PLANNING.RMP_OGMA_LEGAL_CURRENT_SVW
   Catalogue: https://catalogue.data.gov.bc.ca/dataset/old-growth-management-areas-legal-current

Usage:
    python scripts/fetch_bcgw_data.py --region fairy-creek --layer cutblocks --max-features 500
    python scripts/fetch_bcgw_data.py --region fairy-creek --layer ften_pending --enrich-vri
    python scripts/fetch_bcgw_data.py --region walbran --layer fom_cutblocks --enrich-vri
    python scripts/fetch_bcgw_data.py --layer fom_api --all-bc --output public/data/fom_public_projects.geojson
"""

import argparse
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

BCGW_WFS_URL = "https://openmaps.gov.bc.ca/geo/pub/wfs"
FOM_PUBLIC_SUMMARY_URL = "https://fom.nrs.gov.bc.ca/api/project/publicSummary"
FOM_PORTAL_BASE_URL = "https://fom.nrs.gov.bc.ca/public/projects"

# Predefined bounding boxes (WGS84: min_lon, min_lat, max_lon, max_lat) for key BC Forestry Hotspots
HOTSPOT_BBOXES: Dict[str, Tuple[float, float, float, float]] = {
    "fairy-creek": (-124.48, 48.56, -124.30, 48.66),         # San Juan / Fairy Creek (South Island)
    "walbran": (-124.68, 48.60, -124.50, 48.73),             # Central Walbran / Carmanah Valley
    "incomappleux": (-117.75, 50.70, -117.48, 50.92),        # Interior Temperate Rainforest (Selkirk Mtns)
    "upper-skeena": (-127.85, 55.20, -127.45, 55.45),        # Upper Skeena / Kispiox Valley
    "peachland-watershed": (-120.02, 49.72, -119.78, 49.88), # Okanagan Community Watershed
}

LAYERS: Dict[str, str] = {
    "cutblocks": "pub:WHSE_FOREST_VEGETATION.VEG_CONSOLIDATED_CUT_BLOCKS_SP",
    "ogma_legal": "pub:WHSE_LAND_USE_PLANNING.RMP_OGMA_LEGAL_CURRENT_SVW",
    "vri_forest": "pub:WHSE_FOREST_VEGETATION.VEG_COMP_LYR_R1_POLY",
    "ften_pending": "pub:WHSE_FOREST_TENURE.FTEN_CUT_BLOCK_POLY_SVW",
    "fom_cutblocks": "pub:WHSE_FOREST_TENURE.FOM_CUTBLOCK_SP",
}

ALL_LAYER_CHOICES = list(LAYERS.keys()) + ["fom_api"]


def build_wfs_request_url(
    layer_name: str,
    bbox: Tuple[float, float, float, float],
    max_features: int = 250,
    srs_name: str = "EPSG:4326",
) -> str:
    """Constructs a WFS 2.0 GetFeature URL returning GeoJSON in EPSG:4326."""
    min_lon, min_lat, max_lon, max_lat = bbox
    bbox_str = f"{min_lon},{min_lat},{max_lon},{max_lat},EPSG:4326"
    params = {
        "service": "WFS",
        "version": "2.0.0",
        "request": "GetFeature",
        "typeNames": layer_name,
        "outputFormat": "application/json",
        "srsName": srs_name,
        "count": str(max_features),
        "bbox": bbox_str,
    }
    return f"{BCGW_WFS_URL}?{urllib.parse.urlencode(params)}"


def fetch_json(url: str, timeout: int = 45) -> Any:
    """Fetches JSON / GeoJSON from a BC Government endpoint."""
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "BC-Logging-Watch/1.0 (Open Data Research & Public Comment Tool)",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw)


def classify_vri_polygon(props: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts raw objective Vegetation Resources Inventory (VRI) biophysical metrics
    and applies BC Old Growth Technical Advisory Panel (TAP) age thresholds:
    - Stand Age (PROJ_AGE_1): >=250 yrs for coastal/wet belt, >=140 yrs for dry interior
    - Canopy Height (PROJ_HEIGHT_1): projected tree height in meters
    - Site Index (SITE_INDEX): height in meters at 50 years breast height age
    """
    age = int(props.get("PROJ_AGE_1") or 0)
    canopy_height_m = round(float(props.get("PROJ_HEIGHT_1") or 0.0), 1)
    site_index = round(float(props.get("SITE_INDEX") or 0.0), 1)
    species_1 = str(props.get("SPECIES_CD_1") or "").strip()
    species_2 = str(props.get("SPECIES_CD_2") or "").strip()
    bec_zone = str(props.get("BEC_ZONE_CODE") or "UNKNOWN").strip()
    bec_subzone = str(props.get("BEC_SUBZONE") or "").strip()
    area_sqm = float(props.get("FEATURE_AREA_SQM") or 0.0)
    area_ha = round(area_sqm / 10000.0, 2) if area_sqm else 0.0

    is_wet_essf = bec_zone == "ESSF" and (bec_subzone.lower().startswith("w") or bec_subzone.lower().startswith("v"))
    old_growth_threshold_yrs = 250 if (bec_zone in ("CWH", "CDF", "ICH", "MH") or is_wet_essf) else 140
    is_old_growth = age >= old_growth_threshold_yrs

    if site_index >= 25:
        productivity_class = "Site Index >= 25m"
    elif site_index >= 20:
        productivity_class = "Site Index 20-25m"
    elif site_index >= 12:
        productivity_class = "Site Index 12-20m"
    else:
        productivity_class = "Site Index < 12m"

    return {
        "is_old_growth": is_old_growth,
        "old_growth_threshold_yrs": old_growth_threshold_yrs,
        "stand_age": age,
        "canopy_height_m": canopy_height_m,
        "site_index": site_index,
        "species_1": species_1,
        "species_2": species_2,
        "productivity_class": productivity_class,
        "bec_zone": bec_zone,
        "bec_subzone": bec_subzone,
        "area_ha": area_ha,
    }


def compute_feature_centroid(geometry: Dict[str, Any]) -> Optional[Tuple[float, float]]:
    """Computes (lon, lat) centroid for Point, Polygon, or MultiPolygon GeoJSON geometries."""
    if not geometry:
        return None
    geom_type = geometry.get("type")
    coords = geometry.get("coordinates")
    if not coords:
        return None

    if geom_type == "Point" and len(coords) >= 2:
        return (float(coords[0]), float(coords[1]))

    ring: Optional[List[List[float]]] = None
    if geom_type == "Polygon" and isinstance(coords[0], list):
        ring = coords[0]
    elif geom_type == "MultiPolygon" and isinstance(coords[0], list) and isinstance(coords[0][0], list):
        ring = coords[0][0]

    if not ring:
        return None

    lon_sum = sum(float(pt[0]) for pt in ring)
    lat_sum = sum(float(pt[1]) for pt in ring)
    count = len(ring)
    if count == 0:
        return None
    return (lon_sum / count, lat_sum / count)


def enrich_features_with_vri(features: List[Dict[str, Any]], max_enrich: int) -> None:
    """Queries BCGW VRI around each feature centroid and attaches raw VRI metrics."""
    targets = features[:max_enrich]
    print(f"[VRI Enrich] Enriching up to {len(targets)} features with BCGW VRI standing forest metrics...")
    enriched_count = 0

    for idx, feat in enumerate(targets, start=1):
        centroid = compute_feature_centroid(feat.get("geometry") or {})
        if not centroid:
            continue
        lon, lat = centroid
        delta = 0.002
        tiny_bbox = (lon - delta, lat - delta, lon + delta, lat + delta)
        vri_url = build_wfs_request_url(LAYERS["vri_forest"], tiny_bbox, max_features=3)
        try:
            vri_data = fetch_json(vri_url, timeout=20)
            vri_features = vri_data.get("features", [])
            if not vri_features:
                continue
            chosen = next(
                (vf for vf in vri_features if (vf.get("properties") or {}).get("PROJ_AGE_1", 0) > 0),
                vri_features[0],
            )
            vri_metrics = classify_vri_polygon(chosen.get("properties") or {})
            species_parts = [s for s in (vri_metrics["species_1"], vri_metrics["species_2"]) if s]
            props = feat.setdefault("properties", {})
            props.update(
                {
                    "vri_stand_age": vri_metrics["stand_age"],
                    "vri_canopy_height_m": vri_metrics["canopy_height_m"],
                    "vri_site_index": vri_metrics["site_index"],
                    "vri_species": ", ".join(species_parts) if species_parts else "Mixed Conifer",
                    "vri_bec_zone": f"{vri_metrics['bec_zone']}{vri_metrics['bec_subzone']}".strip(),
                    "vri_is_old_growth": vri_metrics["is_old_growth"],
                }
            )
            enriched_count += 1
        except Exception as exc:
            print(f"[VRI Enrich] Warning on feature {idx}: {exc}", file=sys.stderr)
            continue

    print(f"[VRI Enrich] Successfully enriched {enriched_count}/{len(targets)} features.")


def fetch_fom_public_api_geojson(
    bbox: Tuple[float, float, float, float],
    all_bc: bool,
    max_features: int,
) -> Dict[str, Any]:
    """
    Queries the BC Forest Operations Map (FOM) public REST summary endpoint
    and converts matching projects into a GeoJSON FeatureCollection.
    """
    print(f"[BC FOM API] Querying {FOM_PUBLIC_SUMMARY_URL}")
    payload = fetch_json(FOM_PUBLIC_SUMMARY_URL, timeout=45)
    projects = payload if isinstance(payload, list) else payload.get("items", payload.get("data", []))
    min_lon, min_lat, max_lon, max_lat = bbox

    features: List[Dict[str, Any]] = []
    for proj in projects:
        if not isinstance(proj, dict):
            continue
        fom_id = proj.get("id") or proj.get("fomId")
        geom = proj.get("geojson") or proj.get("geometry")

        # Extract representative coordinate if FOM summary provides lat/lon or GeoJSON
        lat = proj.get("latitude") or proj.get("lat")
        lon = proj.get("longitude") or proj.get("lon") or proj.get("lng")
        if not geom and lat is not None and lon is not None:
            geom = {"type": "Point", "coordinates": [float(lon), float(lat)]}
        if not geom:
            continue

        centroid = compute_feature_centroid(geom)
        if not all_bc and centroid:
            c_lon, c_lat = centroid
            if not (min_lon <= c_lon <= max_lon and min_lat <= c_lat <= max_lat):
                continue

        workflow_state = proj.get("workflowStateName") or proj.get("workflowState") or proj.get("workflowStateCode") or "COMMENT_OPEN"
        props = {
            "fom_id": fom_id,
            "name": proj.get("name") or f"FOM Project #{fom_id}",
            "fsp_holder_name": proj.get("forestClientName") or proj.get("fspHolderName") or "FSP Holder",
            "district_name": proj.get("districtName") or proj.get("naturalResourceDistrict") or "",
            "workflow_state": workflow_state,
            "commenting_open_date": proj.get("commentingOpenDate"),
            "commenting_closed_date": proj.get("commentingClosedDate"),
            "fom_project_url": f"{FOM_PORTAL_BASE_URL}#splash?id={fom_id}" if fom_id else FOM_PORTAL_BASE_URL,
        }
        features.append({"type": "Feature", "geometry": geom, "properties": props})
        if len(features) >= max_features:
            break

    return {"type": "FeatureCollection", "features": features}


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch BC Logging, Cutting Permits (FTEN), FOM Proposals & VRI Forest Status from DataBC."
    )
    parser.add_argument(
        "--region",
        choices=list(HOTSPOT_BBOXES.keys()),
        default="fairy-creek",
        help="Predefined BC forestry hotspot region.",
    )
    parser.add_argument(
        "--bbox",
        type=str,
        default=None,
        help="Custom bounding box as min_lon,min_lat,max_lon,max_lat (overrides --region).",
    )
    parser.add_argument(
        "--layer",
        choices=ALL_LAYER_CHOICES,
        default="cutblocks",
        help="BCGW WFS layer or BC FOM public API to query.",
    )
    parser.add_argument(
        "--max-features",
        type=int,
        default=200,
        help="Maximum features to retrieve per request.",
    )
    parser.add_argument(
        "--include-retired",
        action="store_true",
        help="For ften_pending, include RETIRED cutblocks in addition to PENDING and ACTIVE.",
    )
    parser.add_argument(
        "--enrich-vri",
        action="store_true",
        help="For ften_pending or fom_cutblocks, query BCGW VRI at each centroid to attach raw Stand Age, Height, Species & Site Index.",
    )
    parser.add_argument(
        "--max-enrich",
        type=int,
        default=25,
        help="Maximum number of features to enrich with VRI lookups (default: 25).",
    )
    parser.add_argument(
        "--all-bc",
        action="store_true",
        help="For fom_api, skip bounding-box filtering and export province-wide public FOM projects.",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="public/data/bcgw_fetched.geojson",
        help="Output GeoJSON file path.",
    )
    args = parser.parse_args()

    if args.bbox:
        parts = [float(x.strip()) for x in args.bbox.split(",")]
        if len(parts) != 4:
            print("Error: --bbox must have 4 comma-separated floats: min_lon,min_lat,max_lon,max_lat", file=sys.stderr)
            return 1
        bbox = (parts[0], parts[1], parts[2], parts[3])
    else:
        bbox = HOTSPOT_BBOXES[args.region]

    if args.layer == "fom_api":
        try:
            geojson_data = fetch_fom_public_api_geojson(bbox, args.all_bc, args.max_features)
        except Exception as exc:
            print(f"[BC FOM API] Request failed: {exc}", file=sys.stderr)
            return 1
        features = geojson_data.get("features", [])
        print(f"[BC FOM API] Retrieved {len(features)} FOM project features.")
    else:
        layer_type_name = LAYERS[args.layer]
        url = build_wfs_request_url(layer_type_name, bbox, max_features=args.max_features)

        print(f"[BCGW WFS] Querying layer: {layer_type_name}")
        print(f"[BCGW WFS] Bounding Box:   {bbox}")
        print(f"[BCGW WFS] Endpoint URL:   {url}")

        try:
            geojson_data = fetch_json(url)
        except Exception as exc:
            print(f"[BCGW WFS] Request failed: {exc}", file=sys.stderr)
            return 1

        features = geojson_data.get("features", [])
        print(f"[BCGW WFS] Retrieved {len(features)} raw features.")

        if args.layer == "ften_pending" and not args.include_retired:
            filtered = []
            for feat in features:
                props = feat.get("properties") or {}
                status = props.get("LIFE_CYCLE_STATUS_CODE")
                if status is None or str(status).strip().upper() in ("PENDING", "ACTIVE"):
                    filtered.append(feat)
            print(f"[FTEN Filter] Retained {len(filtered)} PENDING/ACTIVE features (excluded {len(features) - len(filtered)} retired).")
            features = filtered
            geojson_data["features"] = features

        if args.layer == "fom_cutblocks":
            for feat in features:
                props = feat.setdefault("properties", {})
                fom_id = props.get("FOM_ID")
                props["fom_project_url"] = (
                    f"{FOM_PORTAL_BASE_URL}#splash?id={fom_id}" if fom_id else FOM_PORTAL_BASE_URL
                )

        if args.layer == "vri_forest":
            for feat in features:
                props = feat.setdefault("properties", {})
                props.update(classify_vri_polygon(props))

        if args.enrich_vri and args.layer in ("ften_pending", "fom_cutblocks"):
            enrich_features_with_vri(features, args.max_enrich)

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(geojson_data, indent=2), encoding="utf-8")
    print(f"[DataBC Pipeline] Wrote {len(features)} features to {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
