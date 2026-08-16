# SENTINEL Feed Grid

A self-contained 3D globe + tactical feed terminal: a rotating Earth with glowing country
borders, live open-source data layers (earthquakes, aircraft, ISS, orbital tracks, radio),
a searchable directory of ~41 real 24/7 webcams worldwide, a paginated video wall, and a
radio/scanner dock. Built as one HTML file (Three.js + hls.js from CDN) with a JSON mesh
hook so more feeds can be added without touching code.

## Files

```
src/
  index.html          # the app — open in a browser (serve over http(s), see Hosting)
  feeds.json          # mesh manifest: extra feeds merged at runtime (dedup by yt/hls id)
  feeds.schema.json   # JSON Schema for a feed entry
config/
  netlify.toml        # publishes src/ as the site root
README.md
FEATURE.md            # integration + merge notes for Claude Code
```

## Quickstart (local)

The page must be **served over http(s)**, not opened as a `file://` — browsers block
`file://` fetches (so `feeds.json` won't load) and YouTube refuses to embed under a
`null` origin.

```bash
cd src
python3 -m http.server 8080     # or: npx serve .
# open http://localhost:8080/
```

## Hosting (makes YouTube tiles play inline)

- **Instant:** drag the `src/` folder onto https://app.netlify.com/drop → live `https://` URL.
- **Repo:** enable GitHub Pages on `src/`, or connect the repo to Netlify/Vercel/Railway
  (`config/netlify.toml` already points `publish` at `src`).

Until hosted, YouTube tiles show a **WATCH ↗** link (they open the real stream); the HLS
tiles and all data layers play regardless.

## Data sources (all public / open)

- Earthquakes — USGS GeoJSON (live) · Aircraft — OpenSky (live) · ISS — wheretheiss.at (live)
- Orbital tracks — modeled in-browser · Radio — SomaFM (SF Police Scanner, DEF CON)
- Country borders — Natural Earth GeoJSON · Webcams — worldcams.tv / geowebcams (YouTube)

## The mesh hook (add feeds without code changes)

On load the app fetches `feeds.json` (or `window.SENTINEL_FEEDS_URL`) and merges every entry
into the directory + globe, deduped against the built-ins. Append to `cams[]`:

```json
{ "id": "PRAGUE — OLD TOWN", "loc": "Prague", "country": "CZE", "lat": 50.087, "lon": 14.421, "yt": "<11-char-id>" }
```

`yt` = YouTube video id (inline only when hosted). `hls` = `.m3u8` URL (plays from any origin
with open CORS). See `feeds.schema.json`.

## Layers (toggle in the top-left panel)

Markets · exchanges (live) — 16 world exchanges as globe nodes, green=open / red=closed
(accurate per-exchange local time via `Intl`), plus a top **MARKETS ticker**: live crypto
(CoinGecko) + FX (Frankfurter, ECB) + an "N/16 OPEN" board. All keyless, all client-side.
Maritime chokepoints — 10 strategic straits/canals (Suez, Hormuz, Malacca, Panama, Bosphorus…).
Plus: earthquakes (USGS), aircraft (OpenSky), ISS, orbital tracks, radio/SDR, trade flows.

## Feed sets (swap regional rosters)

- In-app **SET picker** (top of the video dock) swaps the camera roster: Global Cities (built-in),
  Financial Centers, Maritime Chokepoints, Conflict Watch — files live in `src/sets/`.
- **Filter chips** (region / category) narrow the directory instantly (offline-safe).
- URL: `index.html?set=sets/financial-centers.json` loads a set on boot.
- API: `window.SENTINEL.loadSet(url, {replace:true})`, `.restore()`, `.addFeeds([...])`, `.feeds`.

Edit or add JSON files under `src/sets/` to define your own rosters (same schema as `feeds.json`).

## Modular

Proprietary — all rights reserved. Extend it without forking core via the runtime plugin API on `window.SENTINEL`
(`registerLayer` / `addMarkers` / `addFeeds` / `loadSet` / `pushIncident`). See **MODULES.md** and
`modules/example-layer.js`. Run `npm run proxy` for keyed market data (keys stay server-side) and
`npm run serve` to host `src/` locally.

New situational-awareness layers: **Weather alerts** (NWS active severe/extreme, live), **Emergency
radio** (global ATC + US police/fire/marine/NOAA), an **incidents engine** (M≥5 quakes, NWS alerts,
market open/close bells → ticker + banner flash, with a ◎ FOCUS auto-zoom), and an optional
**portfolio** readout (Alpaca/Schwab/Coinbase via the proxy).

## Public traffic cameras (snapshot `img` feeds)

Feeds now support `img` (a JPEG snapshot URL) in addition to `yt`/`hls`. Snapshot cams display as
an auto-refreshing image and work **from any origin — no CORS or hosting needed**, which makes
public government DOT cameras trivial to add. To pull hundreds of live California cameras, serve
`src/` and add one line before `</body>` in `index.html` (or load it however the host app injects modules):

```html
<script src="modules/dot-cameras.js"></script>
```

Only use cameras that agencies publish for public consumption (official DOT/511/highway APIs).
This project does not access private, unsecured, or credential-bypassed cameras.
