# Contributing

This is a static, dependency-light project (Three.js + hls.js via CDN). Four ways to extend it:

1. **Add feeds** — append cam objects to `src/feeds.json` (schema in `src/feeds.schema.json`) or a new
   file under `src/sets/`. No code changes.
2. **Add a layer** — either a built-in (edit `src/index.html`) or, without touching core, a **module**
   that calls `window.SENTINEL.registerLayer(...)` at runtime. See `MODULES.md` + `modules/example-layer.js`.
3. **Add a market/data provider** — implement one function returning `[{sym,price,changePct}]` and branch
   it in `server/market-proxy.js`. Keys stay server-side.
4. **Add an alert source** — call `window.SENTINEL.pushIncident('…')`, or add markers to a layer the
   incidents engine watches.

Rules of the road: **never put a real API key in the browser** (use the proxy); keep the client CORS-safe and keyless where possible; one concern per module; run over http(s). This is a proprietary project — contributions by arrangement with the owner.
CORS-safe and keyless on the client where possible; one concern per module; run the page over http(s).
Contributions by arrangement with the owner (proprietary; all rights reserved).
