/* Rakshak official India boundary overlay
   Generated from the user-provided Outline_of_India shapefile.
   Load after app.js/api.js/real-data.js.
*/
(() => {
  "use strict";

  const GEOJSON_URL = "./data/india_official_boundary.geojson";
  const MAP_NAMES = ["dashboard", "forest", "disaster", "plantation"];
  const layerByMap = new WeakMap();
  const fittedMaps = new WeakSet();
  let boundaryDataPromise = null;
  let cachedGeometry = null;

  function loadBoundary() {
    if (!boundaryDataPromise) {
      boundaryDataPromise = fetch(GEOJSON_URL, { cache: "force-cache" })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`India boundary HTTP ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          const feature = data?.features?.[0];
          if (!feature?.geometry) {
            throw new Error("India boundary GeoJSON has no geometry");
          }
          cachedGeometry = feature.geometry;
          return data;
        });
    }
    return boundaryDataPromise;
  }

  function pointInRing(longitude, latitude, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = Number(ring[i][0]);
      const yi = Number(ring[i][1]);
      const xj = Number(ring[j][0]);
      const yj = Number(ring[j][1]);

      const crosses =
        (yi > latitude) !== (yj > latitude) &&
        longitude < ((xj - xi) * (latitude - yi)) / (yj - yi || Number.EPSILON) + xi;

      if (crosses) inside = !inside;
    }
    return inside;
  }

  function pointInPolygon(longitude, latitude, polygonCoordinates) {
    const outerRing = polygonCoordinates?.[0];
    if (!outerRing || !pointInRing(longitude, latitude, outerRing)) return false;

    // Return false when the point falls inside an interior hole.
    for (let i = 1; i < polygonCoordinates.length; i += 1) {
      if (pointInRing(longitude, latitude, polygonCoordinates[i])) return false;
    }
    return true;
  }

  function contains(latitude, longitude) {
    if (!cachedGeometry) return true;

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

    if (cachedGeometry.type === "Polygon") {
      return pointInPolygon(lng, lat, cachedGeometry.coordinates);
    }

    if (cachedGeometry.type === "MultiPolygon") {
      return cachedGeometry.coordinates.some((polygon) =>
        pointInPolygon(lng, lat, polygon)
      );
    }

    return true;
  }

  function ensurePane(map) {
    const paneName = "officialIndiaBoundaryPane";
    let pane = map.getPane(paneName);
    if (!pane) {
      pane = map.createPane(paneName);
      // Above raster tiles, below normal vector markers and popups.
      pane.style.zIndex = "350";
      pane.style.pointerEvents = "none";
    }
    return paneName;
  }

  function dimRasterTiles(map, opacity = 0.18) {
    map.eachLayer((layer) => {
      if (typeof L !== "undefined" && layer instanceof L.TileLayer) {
        try {
          layer.setOpacity(opacity);
        } catch (_) {
          // Ignore tile implementations that do not support opacity changes.
        }
      }
    });
  }

  function removeOutOfIndiaPointLayers(map) {
    if (!cachedGeometry || typeof L === "undefined") return;

    map.eachLayer((layer) => {
      const isPointLayer = layer instanceof L.Marker || layer instanceof L.CircleMarker;
      if (!isPointLayer || typeof layer.getLatLng !== "function") return;

      const position = layer.getLatLng();
      if (!contains(position.lat, position.lng)) {
        try {
          map.removeLayer(layer);
        } catch (_) {
          // Ignore layers already removed by another render cycle.
        }
      }
    });
  }

  function isMapVisible(map) {
    const container = map?.getContainer?.();
    if (!container) return false;
    const rect = container.getBoundingClientRect();
    return rect.width > 40 && rect.height > 40;
  }

  async function addToMap(map, options = {}) {
    if (!map || typeof L === "undefined") return null;

    const data = await loadBoundary();
    dimRasterTiles(map, options.tileOpacity ?? 0.18);

    const previousLayer = layerByMap.get(map);
    if (previousLayer && map.hasLayer(previousLayer)) {
      removeOutOfIndiaPointLayers(map);

      if (!fittedMaps.has(map) && isMapVisible(map)) {
        map.invalidateSize({ pan: false });
        map.fitBounds(previousLayer.getBounds(), {
          paddingTopLeft: [18, 18],
          paddingBottomRight: [18, 18],
          animate: false,
        });
        fittedMaps.add(map);
      }
      return previousLayer;
    }

    const pane = ensurePane(map);
    const boundaryLayer = L.geoJSON(data, {
      pane,
      interactive: false,
      style: {
        color: options.borderColor || "#00ff88",
        weight: options.borderWeight ?? 2.4,
        opacity: 1,
        fillColor: options.fillColor || "#06170f",
        // Masks the conflicting political outline embedded in the base-map tiles.
        fillOpacity: options.fillOpacity ?? 0.82,
        lineJoin: "round",
      },
    }).addTo(map);

    layerByMap.set(map, boundaryLayer);
    removeOutOfIndiaPointLayers(map);

    if (isMapVisible(map)) {
      setTimeout(() => {
        try {
          map.invalidateSize({ pan: false });
          map.fitBounds(boundaryLayer.getBounds(), {
            paddingTopLeft: [18, 18],
            paddingBottomRight: [18, 18],
            animate: false,
          });
          fittedMaps.add(map);
        } catch (error) {
          console.warn("[Rakshak] India boundary fit failed:", error);
        }
      }, 120);
    }

    return boundaryLayer;
  }

  async function syncAllMaps() {
    if (typeof Maps === "undefined" || !Maps.instances) return;

    for (const name of MAP_NAMES) {
      const map = Maps.instances[name];
      if (!map) continue;

      try {
        await addToMap(map);
      } catch (error) {
        console.error(`[Rakshak] Official India boundary failed on ${name}:`, error);
      }
    }
  }

  function startAutoSync() {
    // The real-data layer renders asynchronously and can clear vector layers.
    // Rechecking keeps the official boundary present after every data refresh.
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      syncAllMaps();
      if (attempts >= 30) window.clearInterval(timer);
    }, 1000);

    syncAllMaps();
  }

  window.RakshakIndiaBoundary = {
    load: loadBoundary,
    contains,
    addToMap,
    syncAllMaps,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startAutoSync, { once: true });
  } else {
    startAutoSync();
  }
})();
