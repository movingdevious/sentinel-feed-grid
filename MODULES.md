# Module / plugin API

The grid exposes a small runtime API on `window.SENTINEL` so the host app (or any host) can extend it
**without editing `index.html`**. Load a module `<script>` after the grid, or inject one at runtime.

## Feeds (video/cams)
- `SENTINEL.addFeeds([{ id, loc, country, lat, lon, yt|hls }])` → merge cams (deduped). Returns count.
- `SENTINEL.loadSet(url, { replace })` → load a `sets/*.json` roster. `SENTINEL.restore()` → built-ins.
- `SENTINEL.feeds` → current roster. Boot override: `?feeds=<url>` or `window.SENTINEL_FEEDS_URL`.

## Layers (any marker set)
- `SENTINEL.registerLayer({ key, label, color, led, markers:[{ id, loc, lat, lon, url?, audio?, ... }] })`
  → adds a toggleable layer + globe markers + directory-independent nodes. Returns the key.
- `SENTINEL.addMarkers(key, markers)` → append markers to an existing layer.
- `SENTINEL.layers` → list of layer keys.
- Marker fields understood by the UI: `url` (OPEN FEED ↗), `audio` (plays in the radio dock),
  `yt`/`hls` (video), plus anything custom (shown in telemetry).

## Alerts / incidents
- `SENTINEL.pushIncident('TEXT')` → prepends to the intercept ticker and flashes the banner.
- The built-in engine also raises incidents for M≥5 quakes, NWS severe/extreme alerts, and market
  open/close bells; the **◎ FOCUS** toggle auto-rotates the globe to the newest incident.

## Market data
- `window.SENTINEL_MARKET = { proxyUrl:'/api/market', portfolio:true, indices, equities, crypto }`.
- Proxy contract: `GET /api/market?class=equity|index|crypto&symbols=…` → `[{sym,price,changePct}]`;
  `GET /api/portfolio` → `{ value, dayPnlPct, positions:[…] }`. Keys live in `server/market-proxy.js`.

See `modules/example-layer.js` for a working example.
