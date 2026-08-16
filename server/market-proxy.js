/*
 * SENTINEL market proxy — normalizes the host app's brokerage/market keys to
 *   GET /api/market?class=equity|index|crypto&symbols=AAPL,MSFT  ->  [{sym,price,changePct}]
 * so the browser grid never sees a secret. Point the grid at it:
 *   window.SENTINEL_MARKET = { proxyUrl: '/api/market' }
 *
 * Providers wired: Schwab (equities + real index symbols), Alpaca (equities + crypto; paper
 * data keys are fine), Coinbase (crypto, public stats — keyless). Webull is a stub (its
 * OpenAPI needs region-specific app_key/secret HMAC signing — fill in webullQuotes()).
 *
 * Configure via env (see .env.example). Run:  node server/market-proxy.js
 *   (needs `npm i express node-fetch@3`)
 */
const express = require('express');
const fetch = (...a) => import('node-fetch').then(({ default: f }) => f(...a));
const app = express();

const EQ     = (process.env.EQUITY_PROVIDER || 'schwab').toLowerCase();   // schwab | alpaca | webull
const CRYPTO = (process.env.CRYPTO_PROVIDER || 'coinbase').toLowerCase(); // coinbase | alpaca
const PORT   = process.env.PORT || 8787;

// Schwab (OAuth2 — app key/secret + a refresh token you bootstrap once)
const SCHWAB_APP_KEY    = process.env.SCHWAB_APP_KEY || '';
const SCHWAB_APP_SECRET = process.env.SCHWAB_APP_SECRET || '';
const SCHWAB_REFRESH    = process.env.SCHWAB_REFRESH_TOKEN || '';
// Alpaca (market-data works with paper keys; free IEX feed)
const ALPACA_KEY    = process.env.ALPACA_KEY || '';
const ALPACA_SECRET = process.env.ALPACA_SECRET || '';
const ALPACA_FEED   = process.env.ALPACA_FEED || 'iex';

// map the grid's generic index tickers to each provider's real symbols
const IDX_MAP = {
  schwab: { '^GSPC': '$SPX', '^IXIC': '$COMPX', '^DJI': '$DJI', '^VIX': '$VIX.X', '^RUT': '$RUT' },
  alpaca: { '^GSPC': 'SPY', '^IXIC': 'QQQ', '^DJI': 'DIA', '^VIX': 'VIXY', '^RUT': 'IWM' }, // ETF proxies
};

const cache = new Map();
const memo = async (k, ttl, fn) => {
  const h = cache.get(k); if (h && Date.now() - h.t < ttl) return h.v;
  const v = await fn(); cache.set(k, { t: Date.now(), v }); return v;
};

/* ---------------- Schwab ---------------- */
async function schwabToken() {
  return memo('schwab_tok', 25 * 60 * 1000, async () => {
    const basic = Buffer.from(`${SCHWAB_APP_KEY}:${SCHWAB_APP_SECRET}`).toString('base64');
    const r = await fetch('https://api.schwabapi.com/v1/oauth/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: SCHWAB_REFRESH }),
    });
    const j = await r.json();
    if (!j.access_token) throw new Error('schwab token: ' + JSON.stringify(j));
    return j.access_token;
  });
}
async function schwabQuotes(syms) {
  const tok = await schwabToken();
  const r = await fetch('https://api.schwabapi.com/marketdata/v1/quotes?symbols=' + encodeURIComponent(syms.join(',')),
    { headers: { Authorization: `Bearer ${tok}` } });
  const j = await r.json();
  const out = {};
  for (const s of syms) {
    const q = (j[s] && (j[s].quote || j[s])) || {};
    const price = q.lastPrice ?? q.mark ?? q.closePrice;
    const chg = q.netPercentChange ?? q.netPercentChangeInDouble ?? q.netChangePercent;
    out[s] = { price, changePct: chg };
  }
  return out;
}

/* ---------------- Alpaca ---------------- */
function alpacaHeaders() { return { 'APCA-API-KEY-ID': ALPACA_KEY, 'APCA-API-SECRET-KEY': ALPACA_SECRET }; }
async function alpacaStocks(syms) {
  const r = await fetch(`https://data.alpaca.markets/v2/stocks/snapshots?feed=${ALPACA_FEED}&symbols=` + encodeURIComponent(syms.join(',')),
    { headers: alpacaHeaders() });
  const j = await r.json();
  const out = {};
  for (const s of syms) {
    const snap = j[s] || {};
    const price = snap.latestTrade?.p ?? snap.dailyBar?.c;
    const prev = snap.prevDailyBar?.c ?? snap.dailyBar?.o;
    out[s] = { price, changePct: prev ? ((price - prev) / prev) * 100 : 0 };
  }
  return out;
}
async function alpacaCrypto(syms) {
  const pairs = syms.map(s => `${s}/USD`);
  const r = await fetch('https://data.alpaca.markets/v1beta3/crypto/us/snapshots?symbols=' + encodeURIComponent(pairs.join(',')),
    { headers: alpacaHeaders() });
  const j = await r.json(); const snaps = j.snapshots || {}; const out = {};
  for (const s of syms) {
    const snap = snaps[`${s}/USD`] || {};
    const price = snap.latestTrade?.p ?? snap.dailyBar?.c;
    const prev = snap.prevDailyBar?.c ?? snap.dailyBar?.o;
    out[s] = { price, changePct: prev ? ((price - prev) / prev) * 100 : 0 };
  }
  return out;
}

/* ---------------- Coinbase (public stats, keyless) ---------------- */
async function coinbaseCrypto(syms) {
  const out = {};
  await Promise.all(syms.map(async s => {
    try {
      const r = await fetch(`https://api.exchange.coinbase.com/products/${s}-USD/stats`, { headers: { 'User-Agent': 'sentinel' } });
      const j = await r.json(); const last = +j.last, open = +j.open;
      out[s] = { price: last, changePct: open ? ((last - open) / open) * 100 : 0 };
    } catch (e) { out[s] = {}; }
  }));
  return out;
}

/* ---------------- Webull (stub) ---------------- */
async function webullQuotes(/* syms */) { return {}; } // implement with Webull OpenAPI app_key/secret + HMAC

async function quoteEquities(syms) {
  if (EQ === 'alpaca') return alpacaStocks(syms);
  if (EQ === 'webull') return webullQuotes(syms);
  return schwabQuotes(syms);
}
async function quoteCrypto(syms) {
  if (CRYPTO === 'alpaca') return alpacaCrypto(syms);
  return coinbaseCrypto(syms);
}

app.get('/api/market', async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  const cls = String(req.query.class || 'equity');
  const syms = String(req.query.symbols || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!syms.length) return res.json([]);
  try {
    if (cls === 'crypto') {
      const m = await memo('c:' + syms.join(','), 5000, () => quoteCrypto(syms));
      return res.json(syms.map(s => ({ sym: s, price: m[s]?.price, changePct: m[s]?.changePct })));
    }
    const map = cls === 'index' ? (IDX_MAP[EQ] || {}) : null;
    const prov = syms.map(s => (map && map[s]) ? map[s] : s);
    const m = await memo('e:' + prov.join(','), 5000, () => quoteEquities(prov));
    return res.json(syms.map((s, i) => { const q = m[prov[i]] || {}; return { sym: s, price: q.price, changePct: q.changePct }; }));
  } catch (e) { console.error(e.message); res.status(502).json([]); }
});

/* ---------------- Portfolio (read-only account data) ---------------- */
async function alpacaPortfolio() {
  const base = process.env.ALPACA_PAPER === 'false' ? 'https://api.alpaca.markets/v2' : 'https://paper-api.alpaca.markets/v2';
  const acc = await (await fetch(base + '/account', { headers: alpacaHeaders() })).json();
  const pos = await (await fetch(base + '/positions', { headers: alpacaHeaders() })).json();
  const value = +acc.equity || 0, last = +acc.last_equity || value;
  return {
    value, dayPnlPct: last ? ((value - last) / last) * 100 : 0,
    positions: (Array.isArray(pos) ? pos : []).map(x => ({
      sym: x.symbol, qty: +x.qty, value: +x.market_value,
      plpc: (+x.unrealized_intraday_plpc || 0) * 100, class: x.asset_class,
    })),
  };
}
// Schwab/Coinbase account endpoints: add here (Schwab GET /trader/v1/accounts?fields=positions with bearer;
// Coinbase Advanced Trade GET /api/v3/brokerage/accounts with a CDP JWT). Left as TODO.
app.get('/api/portfolio', async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  try {
    const prov = String(req.query.provider || (ALPACA_KEY ? 'alpaca' : EQ));
    let out = { value: null, dayPnlPct: 0, positions: [] };
    if (prov === 'alpaca' && ALPACA_KEY) out = await memo('port', 5000, alpacaPortfolio);
    res.json(out);
  } catch (e) { console.error(e.message); res.status(502).json({ value: null, dayPnlPct: 0, positions: [] }); }
});

app.listen(PORT, () => console.log(`market-proxy :${PORT}  equities=${EQ}  crypto=${CRYPTO}`));
