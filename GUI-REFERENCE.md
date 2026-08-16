# GUI & feature reference (Argus → SENTINEL)

Design notes distilled from Argus (Deck.GL/MapLibre global camera map) and mapped to this
project, with a prioritized adoption plan. **Legitimacy line:** adopt the *interface and
official public sources*; do **not** adopt Argus's `opencctv_bridge` (200k nodes of unvetted
provenance) or any unsecured-camera tooling. Use only agency-published feeds.

## Side-by-side

| Capability | Argus | SENTINEL (now) | Action |
|---|---|---|---|
| Base view | 2D Deck.GL map + toggle 3D globe | 3D Three.js globe only | **Add a flat 2D map mode** for dense scanning |
| Mass points | GPU point layer, Web-Worker pixel-binning, 95k–229k dots | per-marker sprites (good to ~hundreds) | **Switch mass cams to a single Points cloud** for 10k+ |
| Data loading | tiered: positions → labels → detail on demand | full objects up front | **Adopt 3-tier GeoJSON** (core/labels/detail) |
| Feed panel | HLS → JPEG fallback, cache-busting | HLS + **img (JPEG, auto-refresh)** + YouTube | ✅ parity (we also do YouTube) |
| Filters | country / sector browser | region + category chips, text search | **Add a country dropdown** |
| Random cam | "jump to random camera" | — | ✅ added (◉ RANDOM) |
| Data sync | in-app scrape w/ progress | manifest / module loaders | **Add a sync/progress readout** |
| Sources | Caltrans, Road511 (20 states), DriveBC, TfL, NYC, Iowa, Singapore, NZ, Windy + opencctv | Caltrans module + worldcams/geowebcams | **Add official loaders; skip opencctv** |

## What we have that Argus doesn't
Live markets (exchanges + crypto/FX + portfolio), emergency radio (ATC/scanner/marine/NOAA),
NWS weather alerts, earthquakes, aircraft, ISS/orbital, maritime chokepoints, trade-flow arcs,
an incidents engine (+auto-focus), swappable feed sets, and a modular `window.SENTINEL` plugin
API. Argus is camera-only; this is a multi-domain terminal — keep that as the differentiator.

## Prioritized roadmap
1. **Scale rendering (high value):** move bulk cameras from sprites to a GPU `THREE.Points`
   cloud with per-point color; keep interactive sprites only for the *selected/near* camera.
   Enables 10k–100k dots on the globe. Pair with tiered GeoJSON so first paint is instant.
2. **Flat 2D map mode:** a MapLibre/Deck.GL canvas behind the same HUD, toggled from the
   mode bar (GLOBE / SPLIT / WALL / **MAP**). Best UX for dense camera fields.
3. **Official DOT loader modules:** `dot-cameras.js` (Caltrans ✅) + Road511, DriveBC, TfL,
   NYC 511 — each ending in `SENTINEL.addFeeds([{img|hls,...}])`. Vetted, public only.
4. **Country browser + sync/progress panel** (small, polish).
5. **Random camera** ✅ shipped.

## Tech notes
Argus stack: React+TS, Vite, MapLibre, Deck.GL, hls.js. Ours stays dependency-light
(Three.js + hls.js via CDN, no build). If we adopt Deck.GL for the 2D map, load it from a CDN
as an optional module so the core stays build-free. Data format to standardize on: GeoJSON
`FeatureCollection` with `properties:{id,name,img|hls}` — trivially adapts our `feeds.json`.
