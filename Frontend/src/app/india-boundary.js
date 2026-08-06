/*
 * Rakshak official India boundary
 * Uses the user-supplied Survey of India outline GeoJSON.
 */

(() => {
  "use strict";

  const GEOJSON_URL =
    "./data/india_official_boundary.geojson";

  const fittedMaps = new WeakSet();
  const boundaryLayerByMap = new WeakMap();

  let boundaryPromise = null;
  let cachedGeometry = null;


  function loadBoundary() {
    if (!boundaryPromise) {
      boundaryPromise = fetch(
        GEOJSON_URL,
        {
          cache: "force-cache",
        }
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `India boundary HTTP ${response.status}`
            );
          }

          return response.json();
        })
        .then((data) => {
          const feature = data?.features?.[0];

          if (!feature?.geometry) {
            throw new Error(
              "India boundary GeoJSON contains no geometry"
            );
          }

          cachedGeometry = feature.geometry;

          return data;
        });
    }

    return boundaryPromise;
  }


  function pointInRing(longitude, latitude, ring) {
    let inside = false;

    for (
      let i = 0, j = ring.length - 1;
      i < ring.length;
      j = i++
    ) {
      const xi = Number(ring[i][0]);
      const yi = Number(ring[i][1]);
      const xj = Number(ring[j][0]);
      const yj = Number(ring[j][1]);

      const intersects =
        (yi > latitude) !== (yj > latitude) &&
        longitude <
          ((xj - xi) * (latitude - yi)) /
            (yj - yi || Number.EPSILON) +
            xi;

      if (intersects) {
        inside = !inside;
      }
    }

    return inside;
  }


  function pointInPolygon(
    longitude,
    latitude,
    polygonCoordinates
  ) {
    const outerRing = polygonCoordinates?.[0];

    if (
      !outerRing ||
      !pointInRing(longitude, latitude, outerRing)
    ) {
      return false;
    }

    for (
      let index = 1;
      index < polygonCoordinates.length;
      index += 1
    ) {
      if (
        pointInRing(
          longitude,
          latitude,
          polygonCoordinates[index]
        )
      ) {
        return false;
      }
    }

    return true;
  }


  function contains(latitude, longitude) {
    if (!cachedGeometry) {
      return true;
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return false;
    }

    if (cachedGeometry.type === "Polygon") {
      return pointInPolygon(
        lng,
        lat,
        cachedGeometry.coordinates
      );
    }

    if (cachedGeometry.type === "MultiPolygon") {
      return cachedGeometry.coordinates.some(
        (polygon) =>
          pointInPolygon(
            lng,
            lat,
            polygon
          )
      );
    }

    return true;
  }


  function getBoundaryGroup(map) {
    if (!map.rakshakLayers) {
      map.rakshakLayers = {};
    }

    if (!map.rakshakLayers.boundary) {
      map.rakshakLayers.boundary =
        L.featureGroup().addTo(map);
    }

    return map.rakshakLayers.boundary;
  }


  function isMapVisible(map) {
    const container = map?.getContainer?.();

    if (!container) {
      return false;
    }

    const rect =
      container.getBoundingClientRect();

    return (
      rect.width > 40 &&
      rect.height > 40
    );
  }


  async function addToMap(
    map,
    options = {}
  ) {
    if (
      !map ||
      typeof L === "undefined"
    ) {
      return null;
    }

    const existingLayer =
      boundaryLayerByMap.get(map);

    if (
      existingLayer &&
      map.hasLayer(existingLayer)
    ) {
      return existingLayer;
    }

    const data = await loadBoundary();
    const group = getBoundaryGroup(map);

    group.clearLayers();

    const boundaryLayer = L.geoJSON(
      data,
      {
        interactive: false,

        style: {
          color:
            options.borderColor ||
            "#00ff88",

          weight:
            options.borderWeight ??
            2.5,

          opacity: 1,

          fillColor:
            options.fillColor ||
            "#06170f",

          /*
           * Low fill preserves real map details.
           * The external outline remains clearly visible.
           */
          fillOpacity:
            options.fillOpacity ??
            0.08,

          lineJoin: "round",
        },
      }
    ).addTo(group);

    boundaryLayerByMap.set(
      map,
      boundaryLayer
    );

    if (
      !fittedMaps.has(map) &&
      isMapVisible(map)
    ) {
      setTimeout(() => {
        try {
          map.invalidateSize({
            pan: false,
          });

          map.fitBounds(
            boundaryLayer.getBounds(),
            {
              paddingTopLeft: [18, 18],
              paddingBottomRight: [18, 18],
              animate: false,
              maxZoom: 5,
            }
          );

          fittedMaps.add(map);
        } catch (error) {
          console.warn(
            "[Rakshak] India boundary fit failed:",
            error
          );
        }
      }, 150);
    }

    return boundaryLayer;
  }


  async function syncAllMaps() {
    if (
      typeof Maps === "undefined" ||
      !Maps.instances
    ) {
      return;
    }

    const maps = Object.values(
      Maps.instances
    );

    for (const map of maps) {
      try {
        await addToMap(map);
      } catch (error) {
        console.error(
          "[Rakshak] India boundary failed:",
          error
        );
      }
    }
  }


  window.RakshakIndiaBoundary = {
    load: loadBoundary,
    contains,
    addToMap,
    syncAllMaps,
  };


  window.addEventListener(
    "rakshak:map-ready",
    (event) => {
      const map = event.detail?.map;

      if (!map) {
        return;
      }

      addToMap(map).catch((error) => {
        console.error(
          "[Rakshak] India boundary failed:",
          error
        );
      });
    }
  );


  window.addEventListener(
    "resize",
    () => {
      if (
        typeof Maps !== "undefined"
      ) {
        Maps.invalidateAll?.();
      }
    }
  );


  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        setTimeout(
          syncAllMaps,
          800
        );
      },
      {
        once: true,
      }
    );
  } else {
    setTimeout(
      syncAllMaps,
      800
    );
  }
})();