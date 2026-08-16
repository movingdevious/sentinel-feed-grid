/* SENTINEL module — official public traffic cameras (keyless, browser-native).
 *
 * Every source here is a GOVERNMENT open-data CCTV feed that (a) publishes its cameras
 * intentionally for public consumption and (b) sends CORS `Access-Control-Allow-Origin: *`,
 * so the grid loads them DIRECTLY in the browser: no backend, no API key, no scraping.
 * Each camera becomes a snapshot (img) feed — the grid auto-refreshes `.camimg` every few
 * seconds, so a still JPEG endpoint reads as a live, updating camera.
 *
 *   • Caltrans  — cwwp2.dot.ca.gov      — California highways, 8 districts (~hundreds of cams)
 *   • TfL JamCams — api.tfl.gov.uk      — Greater London traffic (~880 cams)
 *
 * Load AFTER the grid app:  <script src="modules/dot-cameras.js"></script>
 *
 * To add another source, write a loader that ends in:
 *   SENTINEL.addFeeds([{ id, loc, country, lat, lon, img|hls }])
 * Rules that keep this license-clean and safe:
 *   1. Only agencies that publish cameras for public consumption (DOT / 511 / transport authority).
 *   2. NEVER unsecured, private, credential-bypassed, or scraped IP cameras.
 *   3. If a good source needs a key, DON'T put the key here — route it through a same-origin
 *      server proxy (see the bundled server/market-proxy.js) so the secret stays server-side.
 */
(function () {
  var TOTAL_CAP = 600, added = 0;

  function push(cams) {
    if (!cams || !cams.length) return;
    if (!window.SENTINEL || !window.SENTINEL.addFeeds) return;
    if (added >= TOTAL_CAP) return;
    added += (window.SENTINEL.addFeeds(cams.slice(0, TOTAL_CAP - added)) || 0);
  }

  // ---------- Caltrans (California, USA) — keyless, CORS:* ----------
  var CT_DISTRICTS = [3, 4, 6, 7, 8, 10, 11, 12], CT_PER_DISTRICT = 50;
  function caltransUrl(n) {
    return 'https://cwwp2.dot.ca.gov/data/d' + n + '/cctv/cctvStatusD' + String(n).padStart(2, '0') + '.json';
  }
  function loadCaltrans(n) {
    fetch(caltransUrl(n), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j) return;
        var out = [];
        (j.data || []).forEach(function (row) {
          var c = row && row.cctv; if (!c) return;
          var L = c.location || {}, I = c.imageData || {};
          var lat = parseFloat(L.latitude), lon = parseFloat(L.longitude);
          if (!lat || !lon) return;
          var img = (I.static && I.static.currentImageURL) || '';
          var hls = I.streamingVideoURL || '';
          if (!img && !hls) return;
          var name = String(L.locationName || L.nearbyPlace || 'CAM')
            .replace(/^TV\s*\d+\s*--\s*/i, '').trim();           // drop the "TV102 -- " camera tag
          out.push({
            id: (name || 'CALTRANS CAM').toUpperCase().slice(0, 30),
            loc: String(L.nearbyPlace || L.county || 'California') + ', CA',
            country: 'USA', lat: lat, lon: lon,
            img: img || undefined,
            hls: img ? undefined : hls                            // prefer the light snapshot; HLS as fallback
          });
        });
        push(out.slice(0, CT_PER_DISTRICT));
      })
      .catch(function () { /* district offline — skip */ });
  }

  // ---------- TfL JamCams (London, UK) — keyless, CORS:* ----------
  function loadTfL() {
    fetch('https://api.tfl.gov.uk/Place/Type/JamCam', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (arr) {
        if (!Array.isArray(arr)) return;
        var out = [];
        arr.forEach(function (p) {
          var lat = parseFloat(p.lat), lon = parseFloat(p.lon);
          if (!lat || !lon) return;
          var props = p.additionalProperties || [], img = '', avail = true;
          for (var i = 0; i < props.length; i++) {
            if (props[i].key === 'imageUrl') img = props[i].value;
            else if (props[i].key === 'available') avail = String(props[i].value) !== 'false';
          }
          if (!img || !avail) return;
          out.push({
            id: String(p.commonName || 'JAMCAM').toUpperCase().slice(0, 30),
            loc: 'London, UK', country: 'UK', lat: lat, lon: lon, img: img
          });
        });
        push(out.slice(0, 160));
      })
      .catch(function () { /* TfL offline — skip */ });
  }

  // ---------- Optional: same-origin proxy for KEY-GATED official sources ----------
  // Set window.SENTINEL_CAMS_PROXY to a same-origin endpoint that returns
  // [{ id, loc, country, lat, lon, img }] from key-gated providers (WSDOT / 511NY / Windy).
  // The keys stay SERVER-SIDE behind that endpoint — never in the browser. Inert if unset
  // (the default for the standalone static app), so the keyless cams above still load.
  function loadProxy() {
    var u = window.SENTINEL_CAMS_PROXY;
    if (!u) return;
    fetch(u, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (arr) {
        if (!Array.isArray(arr) || !arr.length) return;
        var out = [];
        arr.forEach(function (c) {
          var lat = parseFloat(c.lat), lon = parseFloat(c.lon);
          if (!lat || !lon || !(c.img || c.hls)) return;
          out.push({ id: String(c.id || 'CAM').toUpperCase().slice(0, 30),
                     loc: String(c.loc || ''), country: c.country || '—',
                     lat: lat, lon: lon, img: c.img || undefined, hls: c.img ? undefined : c.hls });
        });
        push(out);
      })
      .catch(function () { /* no proxy / offline — keyless cams still load */ });
  }

  function boot() {
    if (!window.SENTINEL || !window.SENTINEL.addFeeds) return setTimeout(boot, 300);
    CT_DISTRICTS.forEach(loadCaltrans);
    loadTfL();
    loadProxy();
  }
  boot();
})();
