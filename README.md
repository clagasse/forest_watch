# BC Forestry Watch

An independent, open-data geospatial web application for exploring **live British Columbia logging activity** (Proposed FOM, Pending FTEN, Active FTEN, and Completed Cutblocks) alongside **standing forest properties** (stand age, tree height, soil productivity, dominant species, BEC ecosystem zone), **conservation designations**, and **30-day public comment opportunities**.

## Key Features

- **Pre-Assessed Open Logging Proposals (`/api/fom-projects` + `public/data/preassessed_foms.json`):** Pre-screens open 30-day Forest Operations Map proposals across up to 5 representative cutblocks using Methodology `v2.0`, enabling instant sorting and filtering by sensitivity (`Very High`, `High`, `Moderate`, `Lower`) across BC's 8 official Natural Resource Regions.
- **High-Contrast WMS Map Layers & Active Legend (`/api/wms`):** Streams cutblock stages and 13 stackable forest, conservation, and planning boundary layers from DataBC with custom OGC `SLD_BODY` styling, live opacity control, and an interactive **Map Legend**.
- **Live Click-to-Inspect (`/api/inspect` & `/api/fom-blocks`):** Clicking any cutblock or point in BC queries DataBC WFS layers in parallel for stand inventory, BC Parks, legally protected old-growth areas, wildlife habitat, winter ranges, drinking-water watersheds, and recent wildfire overlaps.
- **Shareable Deep Links:** Selecting a proposal or clicking the map updates the URL (`?fomId=...` or `?lat=...&lng=...&z=...`), and **Copy Share Link** copies a direct link to that exact view.
- **Plain-Language Guides:** Dedicated `/forest-metrics` (Old Growth & Sensitivity Methodology `v2.0`) and `/about` (How to Comment & Data Sources) pages.

## Local Development

```bash
# Install dependencies
npm install

# Run pre-assessment snapshot generator (updates public/data/preassessed_foms.json)
npm run preassess

# Start the development server
npm run dev
```

## Automated Pre-Assessment Schedule

`.github/workflows/preassess-foms.yml` runs `npm run preassess` every 6 hours (and on manual `workflow_dispatch`) to keep `public/data/preassessed_foms.json` up to date.

## Deploying to Vercel (Free Tier) + Custom Domain

Because the live WMS tile proxy (`/api/wms`), live click-to-inspect (`/api/inspect`), and cutblock loader (`/api/fom-blocks`) run server-side Next.js API routes, **Vercel** (Hobby/Free tier) is recommended over static-only GitHub Pages:

1. Push this repository to GitHub (`git init && git add . && git commit -m "Initial commit"`).
2. Import the repository in [Vercel](https://vercel.com/new) and click **Deploy** (zero environment variables required; optionally set `NEXT_PUBLIC_SITE_URL` to your production URL for canonical OpenGraph tags).
3. To attach a custom domain later, add it under **Project Settings → Domains** in Vercel and update your DNS records.

## Data License & Attribution

Contains information licensed under the [Open Government Licence – British Columbia](https://www2.gov.bc.ca/gov/content/data/open-data/open-government-licence-bc).

BC Forestry Watch is an independent public-interest tool and is not affiliated with the Government of British Columbia. Always verify legal boundaries and comment deadlines on official provincial portals.
