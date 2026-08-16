# FEATURE: Global Feed Grid (SENTINEL)

> Notes for Claude Code integrating this into the host app repo. Stack-agnostic — pick the
> mount that matches the host app. The feature is a single static asset plus a JSON manifest;
> it has **no build step and no runtime dependencies** beyond two CDN scripts.

## What it is

A drop-in "global happenings" surface: a WebGL globe with live data layers and a searchable
grid of ~41 live webcams, extendable at runtime via `feeds.json`. Ships as `src/index.html`
(self-contained) + `src/feeds.json` (data). Everything talks to public APIs client-side; no
secrets, no server code required.

## Integration options (choose one)

### A. Static route (simplest)
Copy `src/` to the app's static/public dir and serve it. E.g. mount at `/grid`:
- Static site / Next.js / Vite: put `index.html` + `feeds.json` under `public/grid/`.
- Express: `app.use('/grid', express.static('feature/feed-grid/src'))`.
Load it at `/grid/`. Requirement: served over http(s) (not file://).

### B. Iframe embed (isolation — recommended for a dashboard)
Host `src/` anywhere and embed:
```html
<iframe src="/grid/index.html" title="Global Feed Grid"
        style="border:0;width:100%;height:100%"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"></iframe>
```
The `allow` attribute is required for the YouTube/HLS tiles to autoplay.

### C. Component wrapper (React/Vue/etc.)
Wrap option B in a component; pass a manifest URL through so the host app controls the feed set:
```jsx
export function FeedGrid({ feedsUrl = "/grid/feeds.json" }) {
  return (
    <iframe
      src={`/grid/index.html?feeds=${encodeURIComponent(feedsUrl)}`}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      style={{ border: 0, width: "100%", height: "100%" }}
    />
  );
}
```
To honor `?feeds=`, the app already prefers `window.SENTINEL_FEEDS_URL`; add this one line
near the top of the inline `<script>` in `index.html` if you want the query-param override:
```js
try { const u = new URLSearchParams(location.search).get('feeds'); if (u) window.SENTINEL_FEEDS_URL = u; } catch (e) {}
```

## The data contract (how the host app meshes feeds)

- The app fetches `window.SENTINEL_FEEDS_URL || 'feeds.json'` on load and merges `cams[]`
  into the directory + globe, **deduped by `yt`/`hls` id** against the built-in roster.
- the host app's job is to (re)write that JSON: `{ "cams": [ { id, loc, country, lat, lon, yt|hls } ] }`.
  Validate against `src/feeds.schema.json`.
- `yt` (YouTube id) plays inline only when the page is hosted over http(s). `hls` (`.m3u8`)
  plays from any origin if the stream sends open CORS. Prefer `hls` for guaranteed inline play.
- Re-meshing today means replacing `feeds.json` and reloading. If the host app needs hot updates
  without reload, expose a global (add to `index.html`):
  ```js
  window.SENTINEL = { addFeeds(list){ list.forEach(v=>{ if((v.yt||v.hls)&&v.lat!=null&&v.lon!=null&&!VIDEO.some(x=>feedKey(x)===feedKey(v))){ VIDEO.push(v); addCam(v);} }); Lcam.count=Lcam.markers.length; buildDirectory($('camsearch').value||''); } };
  ```
  Then post feeds in from the host: `iframe.contentWindow.SENTINEL.addFeeds([...])`.

## Acceptance criteria

- [ ] Served over http(s); page loads, globe renders, country borders visible.
- [ ] Directory shows built-in feeds; search filters by city/country; WALL paginates.
- [ ] With a hosted `feeds.json`, appended cams appear in the directory and as globe pins.
- [ ] YouTube tiles play inline when hosted (not file://); HLS tiles play regardless.
- [ ] No console errors; no network calls to anything other than public CDNs/APIs.

## Suggested repo placement & branch

```
feature/feed-grid/            # this folder, copied in
  src/ …
  README.md  FEATURE.md
```
Branch: `feature/global-feed-grid`. The change is additive (new static asset + one route);
it does not modify existing modules. Merge is a route registration + copying `src/`.

## Notes / limits

- Browsers throttle many simultaneous autoplaying videos — the wall is intentionally
  paginated (9/page). For "everything at once," lean on the data layers + a rotating wall.
- Cam stream ids can go offline over time; treat `feeds.json` as the source of truth and
  let the host app refresh dead ids. No API keys are used anywhere.

## Added: markets + intelligence layers + swappable sets

- **MARKETS layer** — `MARKETS[]` (16 exchanges, IANA tz + local open/close) rendered as globe
  nodes recolored green/red by `exStatus()`; a live ticker pulls crypto (CoinGecko
  `/simple/price`) + FX (Frankfurter). Both keyless + CORS-open + US-accessible. No key needed.
  If the host app has a market-data key (indices, options, L2), swap the two `fetch*` funcs — the ticker
  and node-recolor are already wired.
- **CHOKEPOINTS layer** — `CHOKE[]` static strategic waterways.
- **Feed sets** — `src/sets/*.json` (same schema as `feeds.json`). Swap via the SET picker,
  `?set=<url>`, or `window.SENTINEL.loadSet(url,{replace:true})`. `.restore()` returns to
  the built-in roster. Region/category **filter chips** narrow the directory client-side.

### Extra acceptance checks
- [ ] MARKETS ticker populates (crypto %+FX); "N/16 OPEN" matches wall-clock trading hours.
- [ ] Selecting a market node shows OPEN/CLOSED + local time; chokepoint shows its note.
- [ ] SET picker → Financial Centers swaps the roster; picker → Global Cities restores it.
- [ ] `?set=sets/financial-centers.json` loads that roster on boot (served over http(s)).

## Added: keyed market data (US equities + indices + crypto)

The market engine is now a **provider-agnostic adapter** (`fetchMarkets()` in `index.html`).
Default is keyless (crypto via CoinGecko, FX via Frankfurter, no US equities). To use the host app's
keys, set `window.SENTINEL_MARKET` before the page script (see `config/market.example.js`):

- **Recommended — proxy (key server-side):** `{ proxyUrl:'/api/market' }`. The grid calls
  `GET /api/market?class=equity|index|crypto&symbols=...` and expects `[{sym,price,changePct}]`.
  A ready Express proxy is in `server/market-proxy.js` (Finnhub or Polygon for equities/indices,
  Coinbase/Polygon for crypto; keys read from env — see `.env.example`).
- **Direct from browser (only with a domain-restricted key):** `{ provider:'finnhub'|'polygon', key:'...' }`.
  Built-in adapters `mdFinnhub` / `mdPolygon` are wired; the ticker tags the active source
  (KEYLESS / PROXY / FINNHUB / POLYGON) next to the exchange-open count.

To add another vendor, implement one function returning `[{sym,price,changePct}]` and branch it in
`fetchMarkets()` — the ticker, exchange board, and node recolor already consume that shape.

**Do not commit real keys to the client.** Use the proxy; keep keys in server env / secrets.

## Provider adapters for the host app's keys (Alpaca / Coinbase / Schwab / Webull)

All of these use secrets, so they live ONLY in `server/market-proxy.js` (env-configured); the
browser grid stays on `{ proxyUrl:'/api/market' }` and never sees a key.

| Class            | Provider  | Notes |
|------------------|-----------|-------|
| Equities         | **Schwab** (default) | Real index symbols supported: `^GSPC→$SPX`, `^IXIC→$COMPX`, `^DJI→$DJI`, `^VIX→$VIX.X` (mapped in `IDX_MAP`). OAuth2: set `SCHWAB_APP_KEY/SECRET/REFRESH_TOKEN`; access tokens auto-refresh (~30 min). |
| Equities         | **Alpaca** | Header auth (`ALPACA_KEY/SECRET`), paper data keys fine. No native indices → mapped to ETF proxies (SPY/QQQ/DIA/VIXY). |
| Crypto           | **Coinbase** (default) | Public exchange `/stats` (open+last → %); keyless, so it works immediately. Account/portfolio data later = Coinbase Advanced Trade (CDP key + JWT) as a new module. |
| Crypto           | **Alpaca** | `v1beta3/crypto/us/snapshots`. |
| Equities         | **Webull** | Stub — implement `webullQuotes()` with Webull OpenAPI `app_key/app_secret` + HMAC signing (region-specific). |

Pick per class with `EQUITY_PROVIDER` / `CRYPTO_PROVIDER` in `.env`. Everything normalizes to
`[{sym,price,changePct}]`, which the ticker, exchange board, and node-recolor already consume.

**Status:** proxy compiles clean; adapters follow each vendor's documented shape. Drop the keys
into `.env`, run `node server/market-proxy.js`, mount it same-origin as `/api`, and the ticker
flips from `KEYLESS` to `PROXY` with live S&P/NASDAQ/DOW/VIX + crypto.

### Schwab one-time bootstrap
Schwab refresh tokens are minted via a one-time OAuth authorize→callback, and expire ~7 days —
have the host app store/rotate the refresh token (the proxy reads it from env). Alpaca + Coinbase need no
such dance, so they're the fastest to light up first.

## Added: EMERGENCY radio layer

New globe layer `Lemg` / `EMERGENCY[]` (in `index.html`): ATC agency comms (LiveATC direct
`d.liveatc.net/<mount>` — play in the radio dock's `<audio>`) + metro police/fire scanners
(Broadcastify, click-through). Clicking an ATC node streams it; each node's OPEN FEED ↗ opens its
official page as a fallback. LiveATC mounts are best-effort — refresh silent ones via the manifest;
audio elements need no CORS, but must be served/opened so autoplay-on-gesture works.

Note on coverage: aviation ATC is global; live **police/fire scanner audio is largely US** (Broadcastify)
because monitoring is restricted/illegal in many countries — those entries are deliberately click-through.
