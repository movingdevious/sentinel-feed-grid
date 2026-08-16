/*
 * Market data config for the feed grid. Load this BEFORE src/index.html's script
 * (e.g. <script src="/config/market.js"></script> just above it), or have the host app
 * set window.SENTINEL_MARKET at runtime. Copy to market.js and edit.
 *
 * SECURITY: do NOT put a real vendor key here if this file is served to browsers.
 * Prefer `proxyUrl` — the key lives on the server (see server/market-proxy.js).
 */
window.SENTINEL_MARKET = {
  // ---- RECOMMENDED: same-origin proxy holds the key ----
  proxyUrl: '/api/market',

  // ---- OR direct-from-browser (only with a domain-restricted / browser-safe key) ----
  // provider: 'finnhub',              // 'finnhub' | 'polygon'
  // key: 'YOUR_BROWSER_SAFE_KEY',

  // symbol sets shown in the top ticker
  indices:  [ { sym: '^GSPC', label: 'S&P500' }, { sym: '^IXIC', label: 'NASDAQ' },
              { sym: '^DJI', label: 'DOW' }, { sym: '^VIX', label: 'VIX' } ],
  equities: ['AAPL','MSFT','NVDA','AMZN','GOOGL','TSLA','META','JPM'],
  crypto:   ['BTC','ETH','SOL','BNB','XRP','DOGE','ADA']
};
