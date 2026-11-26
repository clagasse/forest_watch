# BC Forestry Watch

An independent, citizen-built open-data geospatial web application for exploring **live British Columbia logging activity** (Proposed FOM, Pending FTEN, Active FTEN, and Completed Cutblocks) alongside **standing forest inventory** (VRI), **conservation designations**, **wildfire burn severity**, and **30-day public comment opportunities**.

> **Independence & Verification Notice:** BC Forestry Watch is an independent public-interest tool and is not affiliated with or endorsed by the Government of British Columbia. Always verify legal cutblock boundaries, parcel lines, and official comment deadlines on provincial portals before making decisions.

---

## Key Features

- **Interactive Map Explorer (`/`)**
  - **MapLibre GL JS** with **Topo** (Esri World Topo) and **Satellite** (Esri World Imagery) basemaps.
  - **Clustered Open FOM Pins:** Color-coded markers by ecological sensitivity with hover previews and click-to-inspect.
  - **4 Cutblock Lifecycle WMS Stages:** Proposed FOM (`fom_proposed`), Pending FTEN (`ften_pending`), Active FTEN (`ften_active`), and Completed Cutblocks (`completed`) streamed from DataBC.
  - **13 Stackable WMS Overlays (`/api/wms`):** Standing forest inventory (Old Growth, High Site Index, Tall Canopy), TAP Priority Deferrals, Legal OGMA, BC Parks, Wildlife Habitat Areas (WHA), Ungulate Winter Ranges (UWR), Community Watersheds, Recent Wildfires, and Natural Resource Regions / Districts / TSA boundaries — styled with custom OGC `SLD_BODY`, live opacity slider (`35%–100%`), and an interactive **Active Map Legend**.
- **Pre-Assessed Open 30-Day Logging Proposals (`/api/fom-projects`)**
  - Pre-screens open Forest Operations Map (FOM) proposals across up to 5 representative cutblocks using **Methodology `v2.1`**, surfacing `Very High`, `High`, `Moderate`, and `Lower` sensitivity ratings, live 30-day comment closing dates, and **Province-Wide + 8 Natural Resource Region** summaries (`BroaderPerspectiveSection`).
- **Live Click-to-Inspect (`/api/inspect` & `/api/fom-blocks`)**
  - Clicking any cutblock or point in BC queries DataBC WFS layers in parallel for VRI stand attributes (age, height, site index, species, BEC ecosystem zone & rarity), conservation/watershed/wildlife overlaps, and conditional **BC Wildfire Burn Severity** (`VEG_BURN_SEVERITY_SP` / `VEG_BURN_SEVERITY_SAME_YR_SP`), with a **Technical Audit** drawer and downloadable **Evidence JSON**.
- **"What's Near Me?" Location Search (`/api/geocode`)**
  - Search any BC town or street address via the BC Address Geocoder to filter open proposals within **25 km**, **50 km**, or **100 km**.
- **Civic Engagement & Sharing Tools**
  - **Draft Comment / MLA & Minister Letter (`CommentDraftModal`):** Generates a site-specific public comment or letter to your MLA and the Minister of Forests in the browser.
  - **Shareable Deep Links:** Selecting a proposal or clicking the map updates URL parameters (`?fomId=...` or `?lat=...&lng=...&z=...`), with a one-click **Copy Share Link** button.
  - **Filterable RSS 2.0 Feed (`/api/feed.xml`):** Subscribe to newly opened 30-day proposals in any RSS reader (supports `?region=` and `?minRisk=` filters).
  - **Mobile-Optimized Layout:** Sticky **Map | Proposals | Details** mobile switcher, floating inspection bar, bottom-sheet layers drawer, and touch-friendly tooltips.
- **Plain-Language Guides**
  - **`/forest-metrics`:** Old-growth definitions, **Published Thresholds vs. Tier-1 Screening Heuristics**, Methodology `v2.1` scoring rules, and peer-reviewed literature citations.
  - **`/about`:** Citizen-built mission, **5 Civic Engagement Channels (`#take-action`)**, step-by-step guide, official DataBC layer catalog, and RSS/feedback links (`#feedback`).

---

## Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Styling & Icons:** Tailwind CSS, `lucide-react`
- **Mapping:** MapLibre GL JS (`maplibre-gl`)
- **Open Data Sources:**
  - BC Geographic Warehouse (DataBC BCGW) WMS & WFS
  - BC Forest Operations Map (FOM) Public REST API
  - BC Address Geocoder API (`geocoder.api.gov.bc.ca`)
- **Analytics & Automation:** Vercel Web Analytics (`@vercel/analytics`), GitHub Actions

---

## Pages & API Routes

| Route | Kind | Purpose |
| --- | --- | --- |
| `/` | Page | Interactive Map Explorer, Open FOM Proposals list, Inspector, and Regional Summary |
| `/forest-metrics` | Page | Old-growth science, Methodology `v2.1` scoring rules, and peer-reviewed citations |
| `/about` | Page | Mission, civic engagement channels (`#take-action`), data catalog, RSS & feedback (`#feedback`) |
| `/api/fom-projects` | API | Serves pre-assessed open FOM proposals + regional catalog totals (`?refresh=1` gated in prod) |
| `/api/fom-blocks` | API | Fetches cutblock polygons and metadata for a selected FOM proposal |
| `/api/inspect` | API | Parallel DataBC WFS point/polygon inspection + Methodology `v2.1` risk assessment |
| `/api/wms` | API | Proxies DataBC WMS tiles with custom OGC `SLD_BODY` styling and BC bounding-box guard |
| `/api/geocode` | API | Proxies BC Address Geocoder lookups for the "What's Near Me?" radius filter |
| `/api/feed.xml` | API | RSS 2.0 feed of open 30-day logging proposals (supports `?region=` and `?minRisk=`) |
| `/api/geojson-files` | API | Lists bundled reference GeoJSON datasets under `public/data/` |

---

## Repository Structure

```text
.
├── .github/workflows/
│   └── preassess-foms.yml       # Scheduled 6-hour snapshot refresh via GitHub Actions
├── public/data/
│   ├── preassessed_foms.json    # Pre-assessed open FOM snapshot (committed & auto-updated)
│   ├── fairy_creek_cutblocks.geojson
│   └── incomappleux_vri.geojson
├── scripts/
│   ├── preassess-foms.mjs       # Generates public/data/preassessed_foms.json
│   ├── fetch_bcgw_data.py       # Auxiliary Python BCGW fetch script
│   └── compute_regional_context.py
├── src/
│   ├── app/                     # Next.js App Router pages, OpenGraph image, icon, and API routes
│   ├── components/              # ForestryMapExplorer, BroaderPerspectiveSection, CommentDraftModal, etc.
│   ├── data/bcForestryData.ts   # Layer catalog, SLD style specs, region definitions, FOM types
│   └── lib/                     # BCGW WFS client, BEC rarity table, riskAssessment v2.1, requestGuards
├── next.config.mjs              # Security headers (nosniff, Referrer-Policy, X-Frame-Options)
└── package.json
```

---

## Local Development

**Prerequisites:** Node.js 20+ (tested with Node 22) and `npm`.

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Refresh the pre-assessed FOM snapshot from live DataBC / FOM APIs
npm run preassess

# 3. Start the local development server (http://localhost:3000)
npm run dev
```

Other helpful scripts:

```bash
# Typecheck
npx tsc --noEmit

# Lint
npm run lint

# Production build
npm run build
```

---

## Automated Pre-Assessment Schedule

[`.github/workflows/preassess-foms.yml`](.github/workflows/preassess-foms.yml) runs `npm run preassess` every **6 hours** (`0 */6 * * *`) and on manual `workflow_dispatch`. When open proposals or assessments change, it commits and pushes an updated `public/data/preassessed_foms.json`, triggering an automatic Vercel redeploy if connected to GitHub.

---

## Environment Variables

Zero environment variables are required to run or deploy the app. All variables below are **optional**:

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public | Canonical base URL used in OpenGraph metadata and RSS `<link>` tags (defaults to `https://bc-forestry-watch.vercel.app`) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Public | Renders a direct `Email ...` (`mailto:`) feedback button on `/about#feedback` |
| `NEXT_PUBLIC_FEEDBACK_URL` | Public | Renders an external `Open Feedback / Issue Tracker` button (e.g., GitHub Issues or Google Form) on `/about#feedback` |
| `FOM_REFRESH_SECRET` | Server | Bearer/query secret required to trigger `/api/fom-projects?refresh=1` in production |

---

## Deploying to Vercel (Free Tier) + Custom Domain

Because `/api/wms`, `/api/inspect`, `/api/fom-blocks`, `/api/geocode`, and `/api/feed.xml` run as Next.js server routes, **Vercel** (Hobby/Free tier) is recommended over static-only hosting:

1. Push this repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com/new) and click **Deploy** (no required environment variables).
3. Optionally configure any environment variables from the table above under **Project Settings → Environment Variables** and redeploy.
4. Enable **Vercel Web Analytics** (already wired via `@vercel/analytics`) and **Vercel Firewall** rate limiting on `/api/*` in your Vercel dashboard.
5. To attach a custom domain, add it under **Project Settings → Domains** in Vercel and update your DNS records.

### Built-in Traffic & Security Protections

- **CDN Caching:** API routes set `Cache-Control` (`s-maxage` + `stale-while-revalidate`) so repeated tile, inspection, and proposal requests are served from Vercel's edge cache.
- **Per-IP Rate Limiting & Input Guards (`src/lib/requestGuards.ts`):** Sliding-window rate limits protect `/api/wms`, `/api/inspect`, `/api/fom-blocks`, `/api/geocode`, and `/api/fom-projects`.
- **WMS Bounding-Box Guard:** `/api/wms` validates EPSG:3857 tile coordinates against British Columbia bounds (returning a 1×1 transparent PNG outside BC) and snaps coordinates to integer meters to improve cache hit rates.
- **Security Headers (`next.config.mjs`):** Sets `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Frame-Options: SAMEORIGIN`.

---

## Data License & Attribution

- Contains information licensed under the [Open Government Licence – British Columbia](https://www2.gov.bc.ca/gov/content/data/open-data/open-government-licence-bc).
- Basemap tiles courtesy of **Esri** (`World_Topo_Map`, `World_Imagery`) and contributors.
