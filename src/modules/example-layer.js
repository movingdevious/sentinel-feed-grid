/* Example SENTINEL layer module — the modular way the host app adds capability
 * WITHOUT editing core. Load it after the grid:
 *   <script src="modules/example-layer.js"></script>
 * or inject it at runtime. It waits for the plugin API, then registers a layer.
 */
(function () {
  function boot() {
    var S = window.SENTINEL;
    if (!S || !S.registerLayer) return setTimeout(boot, 300); // wait for the grid to init

    // 1) register a new toggleable globe layer with markers
    S.registerLayer({
      key: 'ports',
      label: 'Major ports',
      color: 0x38f0e0,
      led: 'static',
      markers: [
        { id: 'SINGAPORE', loc: 'Port of Singapore', lat: 1.26, lon: 103.84, url: 'https://www.mpa.gov.sg/' },
        { id: 'ROTTERDAM', loc: 'Port of Rotterdam', lat: 51.95, lon: 4.14 },
        { id: 'SHANGHAI',  loc: 'Port of Shanghai',  lat: 30.62, lon: 122.06 }
      ]
    });

    // 2) add more markers later
    // S.addMarkers('ports', [{ id: 'LA/LB', loc: 'San Pedro Bay', lat: 33.74, lon: -118.27 }]);

    // 3) push an incident to the ticker / flash the banner
    // S.pushIncident('PORTS MODULE ONLINE');
  }
  boot();
})();
