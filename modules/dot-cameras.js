/* SENTINEL module — public DOT traffic cameras (Caltrans, keyless).
 * Loads California's official CCTV status JSON per district and registers each camera
 * as a snapshot (img) feed — genuinely public government cameras, no auth, no scraping.
 * Load AFTER the grid:  <script src="modules/dot-cameras.js"></script>
 *
 * Extend it: add more OFFICIAL open camera APIs the same way (each just needs to end in
 * SENTINEL.addFeeds([{ id, loc, country, lat, lon, img|hls }])). Good candidates with public
 * feeds: UK National Highways, NYC DOT (511NY), WSDOT, iowaDOT, FL511, NSW Live Traffic.
 * Only use sources that publish cameras intentionally for public consumption.
 */
(function () {
  var NUMS = [3, 4, 6, 7, 8, 10, 11, 12]; // Caltrans districts
  var PER_DISTRICT = 60, CAP = 500, added = 0;

  function url(n) {
    return 'https://cwwp2.dot.ca.gov/data/d' + n + '/cctv/cctvStatusD' + String(n).padStart(2, '0') + '.json';
  }
  function load(n) {
    if (added >= CAP) return;
    fetch(url(n), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var cams = [];
        (j.data || []).slice(0, PER_DISTRICT).forEach(function (row) {
          var c = row.cctv; if (!c) return;
          var L = c.location || {}, I = c.imageData || {};
          var lat = parseFloat(L.latitude), lon = parseFloat(L.longitude);
          if (!lat || !lon) return;
          var img = (I.static && I.static.currentImageURL) || '';
          var hls = I.streamingVideoURL || '';
          if (!img && !hls) return;
          cams.push({
            id: String(L.locationName || L.nearbyPlace || 'CAM').toUpperCase().slice(0, 26),
            loc: String(L.nearbyPlace || L.county || 'California'),
            country: 'USA', lat: lat, lon: lon,
            img: img || undefined,
            hls: img ? undefined : hls   // prefer the lightweight snapshot; fall back to HLS
          });
        });
        if (cams.length && window.SENTINEL) added += (window.SENTINEL.addFeeds(cams) || 0);
      })
      .catch(function () { /* district offline / CORS — skip */ });
  }
  function boot() {
    if (!window.SENTINEL || !window.SENTINEL.addFeeds) return setTimeout(boot, 300);
    NUMS.forEach(load);
  }
  boot();
})();
