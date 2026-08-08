/* Rakshak Real Data V1
   Load AFTER api.js. This file replaces showcase/demo values with live-source
   results without deleting the legacy page structure.
*/

(() => {
  "use strict";

  const REAL_LOCAL_API_URL = "http://localhost:8000";
  const REAL_PRODUCTION_API_URL = "https://earth-immune-backend.onrender.com";
  const REAL_API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === ""
      ? REAL_LOCAL_API_URL
      : REAL_PRODUCTION_API_URL;

  const state = {
    dashboard: null,
    forest: null,
    disaster: null,
    farmer: null,
    plantation: null,
  };

  async function realFetch(endpoint, options = {}) {
    const response = await fetch(`${REAL_API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(`${response.status} ${message || response.statusText}`);
    }
    return response.json();
  }

  // Never report feedback as saved when the backend request failed.
  if (typeof postToAPI === "function") {
    const legacyPostToAPI = postToAPI;
    postToAPI = async function strictPostToAPI(endpoint, body, fallbackData) {
      if (endpoint === "/api/feedback/submit") {
        try {
          return await realFetch(endpoint, {
            method: "POST",
            body: JSON.stringify(body),
          });
        } catch (error) {
          console.error("[Rakshak Real Data] Feedback was not saved:", error);
          return {
            success: false,
            message: "Feedback server is unavailable. Your response was not saved.",
            feedback_id: "NOT-SAVED",
          };
        }
      }
      return legacyPostToAPI(endpoint, body, fallbackData);
    };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatNumber(value) {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number.toLocaleString("en-IN") : "--";
  }

  function formatDate(value) {
    if (!value) return "Not available";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  }

  function statusPill(label, verified) {
    const color = verified ? "#00ff88" : "#ffd166";
    const border = verified
      ? "rgba(0,255,136,.35)"
      : "rgba(255,209,102,.35)";
    return `<span style="font-size:.63rem;color:${color};border:1px solid ${border};padding:.22rem .45rem;border-radius:999px;">${escapeHtml(label)}</span>`;
  }

  function showRealError(target, title, error) {
    if (!target) return;
    target.innerHTML = `
      <div style="padding:1rem;border:1px solid rgba(255,209,102,.35);border-radius:12px;background:rgba(255,209,102,.06);font-family:var(--font-mono,monospace);font-size:.72rem;line-height:1.6;color:var(--text-secondary,#aaa);">
        <strong style="color:#ffd166;">${escapeHtml(title)} unavailable</strong><br>
        ${escapeHtml(error?.message || error || "Unknown error")}<br>
        <span style="color:var(--text-muted,#777);">No demo value has been substituted.</span>
      </div>`;
  }

  function setCountElement(element, value, suffix = "") {
    if (!element) return;
    element.dataset.count = String(Number(value) || 0);
    element.dataset.target = String(Number(value) || 0);
    element.dataset.suffix = suffix;
    element.textContent = `${formatNumber(value)}${suffix}`;
  }

  function updateLabelledCard(container, labelMatcher, value, newLabel, suffix = "") {
    if (!container) return false;
    const labels = [...container.querySelectorAll(".hero-stat-label, .ss-label, span")];
    const label = labels.find((node) =>
      labelMatcher.test((node.textContent || "").trim())
    );
    if (!label) return false;
    const card = label.closest(".hero-stat, .ss-item") || label.parentElement;
    if (!card) return false;
    const number = card.querySelector(
      ".hero-stat-num, .ss-val, .stat-num"
    );
    setCountElement(number, value, suffix);
    label.textContent = newLabel;
    return true;
  }

  function getMap(name) {
    return typeof Maps !== "undefined" && Maps.instances
      ? Maps.instances[name]
      : null;
  }

  function ensureRakshakMapLayers(map) {
  if (!map || typeof L === "undefined") {
    return null;
  }

  if (!map.rakshakLayers) {
    map.rakshakLayers = {
      boundary: L.featureGroup().addTo(map),
      districts: L.featureGroup().addTo(map),
      hotspots: L.featureGroup().addTo(map),
      weather: L.featureGroup().addTo(map),
      risks: L.featureGroup().addTo(map),
      plantation: L.featureGroup().addTo(map),
      selection: L.featureGroup().addTo(map),
    };
  }

  return map.rakshakLayers;
}


function layerBelongsToGroup(layer, group) {
  if (!group) return false;

  if (layer === group) {
    return true;
  }

  try {
    return group.hasLayer(layer);
  } catch (_) {
    return false;
  }
}


  function ensureRakshakMapLayers(map) {
    if (!map || typeof L === "undefined") {
      return null;
    }

    if (!map.rakshakLayers) {
      map.rakshakLayers = {};
    }

    const layerNames = [
      "boundary",
      "districts",
      "hotspots",
      "weather",
      "risks",
      "plantation",
      "selection",
    ];

    layerNames.forEach((name) => {
      if (!map.rakshakLayers[name]) {
        map.rakshakLayers[name] =
          L.featureGroup().addTo(map);
      }
    });

    return map.rakshakLayers;
  }


  function clearMapData(
    map,
    layerNames = [
      "hotspots",
      "weather",
      "risks",
      "plantation",
      "selection",
    ]
  ) {
    const layers =
      ensureRakshakMapLayers(map);

    if (!layers) {
      return;
    }

    layerNames.forEach((name) => {
      try {
        layers[name]?.clearLayers();
      } catch (error) {
        console.warn(
          `[Rakshak] Could not clear ${name}:`,
          error
        );
      }
    });

    /*
    * Important:
    * Boundary and district layers are never removed.
    */
  }

  function renderDashboardMap(data) {
    const map = getMap("dashboard");
    const layers = ensureRakshakMapLayers(map);
    if (!map || typeof L === "undefined") return;
    clearMapData(
      map,
      ["hotspots", "weather"]
    );
    const hotspots = data.sample_fire_hotspots || [];
    hotspots.forEach((hotspot) => {
      const color = hotspot.severity === "critical" ? "#ff4d4d" : hotspot.severity === "high" ? "#ff9f1c" : "#ffd166";
      L.circleMarker([hotspot.latitude, hotspot.longitude], {
        radius: 6, color, weight: 2, fillColor: color, fillOpacity: .45,
      }).bindPopup(`
        <strong>NASA FIRMS VIIRS hotspot</strong><br>
        FRP: ${Number(hotspot.frp_mw || 0).toFixed(1)} MW<br>
        Confidence: ${escapeHtml(hotspot.confidence || "unknown")}<br>
        ${escapeHtml(formatDate(hotspot.acquired_at))}
      `).addTo(layers.hotspots);
    });
    L.circleMarker([26.4499, 74.6399], {
      radius: 7, color: "#00d9ff", weight: 2, fillColor: "#00d9ff", fillOpacity: .35,
    }).bindPopup(`
      <strong>Ajmer live weather</strong><br>
      Temperature: ${escapeHtml(data.metrics?.temperature_celsius ?? "--")}°C<br>
      Rainfall 1h: ${escapeHtml(data.metrics?.rainfall_1h_mm ?? "--")} mm
    `).addTo(layers.weather);
    map.setView([22.5, 79], 4.5);

    const title = document.querySelector("#page-dashboard .map-card .card-title");
    if (title) title.textContent = "🗺 Real Environmental Inputs — India";
    const legend = document.querySelector("#page-dashboard .map-legend");
    if (legend) {
      legend.innerHTML = `
        <span class="legend-item"><span class="ld-dot" style="background:#FF4D4D"></span>NASA FIRMS hotspot</span>
        <span class="legend-item"><span class="ld-dot" style="background:#00D9FF"></span>Live weather pilot</span>
        <span class="legend-item">Official CAP alerts are listed separately</span>`;
    }
  }

  function renderRealDashboardFeeds(data) {
    const alerts = data.official_alert_samples || [];
    const alertContainer = document.getElementById("dashboard-alerts");
    if (alertContainer) {
      alertContainer.innerHTML = alerts.length
        ? alerts.map((item) => `
          <div class="alert-item warning">
            <span class="alert-tag warning">OFFICIAL</span>
            <span class="alert-msg">${escapeHtml(item.headline || item.event || "CAP alert")}</span>
            <span class="alert-time">${escapeHtml(formatDate(item.sent_at))}</span>
          </div>`).join("")
        : `<div style="padding:.8rem;font-size:.7rem;color:var(--text-secondary);">No official CAP alert was returned by the current feed query.</div>`;
    }

    const activity = document.getElementById("activity-feed");
    if (activity) {
      const rows = [
        ["NASA FIRMS", `${formatNumber(data.metrics?.active_fire_hotspots)} hotspots detected in the current query`],
        ["IMD CAP RSS", `${formatNumber(data.metrics?.official_alerts)} official alert records returned`],
        ["OpenWeather", `Ajmer ${data.metrics?.temperature_celsius ?? "--"}°C, ${data.metrics?.rainfall_1h_mm ?? "--"} mm rain in 1h`],
        ["Supabase", `${formatNumber(data.metrics?.feedback_responses)} permanent feedback responses`],
      ];
      activity.innerHTML = rows.map(([source, message]) => `
        <div class="activity-item">
          <div class="activity-dot"></div>
          <div><span style="color:var(--text-primary)">${escapeHtml(source)}</span><br><span style="font-size:.68rem;color:var(--text-muted)">${escapeHtml(message)}</span></div>
        </div>`).join("");
    }
  }

  function neutralizeLegacyCharts() {
    [
      ["chart-forest-trend", "Real historical forest time-series not loaded in this view"],
      ["chart-deforestation", "No fabricated temperature/deforestation correlation shown"],
      ["chart-groundwater", "Groundwater time-series requires a selected official dataset"],
    ].forEach(([id, message]) => {
      const canvas = document.getElementById(id);
      if (!canvas || canvas.dataset.realNeutralized === "true") return;
      canvas.dataset.realNeutralized = "true";
      try {
        const chart = typeof Chart !== "undefined" ? Chart.getChart(canvas) : null;
        if (chart) chart.destroy();
      } catch (_) {}
      canvas.style.display = "none";
      const note = document.createElement("div");
      note.style.cssText = "padding:1rem;font-size:.7rem;line-height:1.55;color:var(--text-secondary);font-family:var(--font-mono,monospace);";
      note.textContent = message;
      canvas.insertAdjacentElement("afterend", note);
    });
  }

  function updateStaticClaims() {
    const subtitle = document.querySelector(".hero-subtitle");
    if (subtitle) {
      subtitle.innerHTML = "India environmental intelligence using live weather, near-real-time fire hotspots,<br>official CAP alerts, satellite NDVI, climate and soil inputs.";
    }
    const cards = [...document.querySelectorAll(".fp-card")];
    const descriptions = [
      "NASA FIRMS thermal hotspots with Copernicus Sentinel-2 NDVI vegetation analysis",
      "Species planning from NASA POWER climate, SoilGrids soil properties and Sentinel-2 NDVI",
      "Live weather risk calculation clearly separated from official CAP warning records",
      "Crop guidance generated from live OpenWeather and NASA POWER climate inputs",
    ];
    cards.forEach((card, index) => {
      const desc = card.querySelector(".fp-desc");
      if (desc && descriptions[index]) desc.textContent = descriptions[index];
    });
  }

  function updateLandingAndDashboard(data) {
    const metrics = data.metrics || {};
    const fireCount = metrics.active_fire_hotspots ?? 0;
    const alertCount = metrics.official_alerts ?? 0;
    const sourceCount = metrics.connected_live_sources ?? 0;
    const feedbackCount = metrics.feedback_responses ?? 0;

    const heroBadge = document.querySelector(".hero-badge span:last-child");
    if (heroBadge) {
      heroBadge.textContent = `Live sources connected · ${sourceCount} verified at request time`;
    }

    const heroStats = document.querySelector(".hero-stats");
    if (heroStats) {
      const cards = [...heroStats.querySelectorAll(".hero-stat")];
      const values = [
        [fireCount, "NASA FIRMS Hotspots"],
        [alertCount, "Official CAP Alerts"],
        [sourceCount, "Live Sources"],
        [feedbackCount, "Feedback Responses"],
      ];
      cards.slice(0, 4).forEach((card, index) => {
        const [value, label] = values[index];
        setCountElement(card.querySelector(".hero-stat-num"), value);
        const labelNode = card.querySelector(".hero-stat-label");
        if (labelNode) labelNode.textContent = label;
      });
    }

    document.querySelectorAll(".ig-chip").forEach((chip, index) => {
      const labels = [
        "REAL SOURCE PIPELINE",
        `${alertCount} OFFICIAL ALERTS`,
        `${sourceCount} SOURCES CONNECTED`,
      ];
      chip.lastChild.textContent = labels[index] || "LIVE";
    });

    const sidebarLive = document.querySelector(".sidebar-live span:last-child");
    if (sidebarLive) sidebarLive.textContent = `LIVE · ${sourceCount} Sources Connected`;

    const sidebarStats = document.querySelector(".sidebar-stats");
    if (sidebarStats) {
      const cards = [...sidebarStats.querySelectorAll(".ss-item")];
      const values = [
        [fireCount, "Fire Hotspots"],
        [alertCount, "Official Alerts"],
        [sourceCount, "Live Sources"],
        [feedbackCount, "Feedback Responses"],
      ];
      cards.slice(0, 4).forEach((card, index) => {
        const [value, label] = values[index];
        const val = card.querySelector(".ss-val");
        if (val) val.textContent = formatNumber(value);
        const labelNode = card.querySelector(".ss-label");
        if (labelNode) labelNode.textContent = label;
      });
    }

    const dashboard = document.getElementById("page-dashboard");
    if (dashboard) {
      const statCards = [...dashboard.querySelectorAll(".stat-num")];
      const cardValues = [
        [fireCount, "Active Fire Hotspots"],
        [alertCount, "Official CAP Alerts"],
        [sourceCount, "Connected Sources"],
        [feedbackCount, "Feedback Responses"],
        [metrics.temperature_celsius ?? 0, "Ajmer Temperature", "°C"],
        [metrics.rainfall_1h_mm ?? 0, "Rainfall Last Hour", " mm"],
      ];
      statCards.slice(0, 6).forEach((number, index) => {
        const [value, label, suffix = ""] = cardValues[index];
        setCountElement(number, value, suffix);
        const parent = number.parentElement;
        const labelNode = parent
          ? [...parent.querySelectorAll("span")].find(
              (node) => node !== number && !node.classList.contains("stat-num")
            )
          : null;
        if (labelNode) labelNode.textContent = label;
      });
    }

    document.querySelectorAll(".badge-count, .alert-count-badge").forEach((node) => {
      node.textContent = String(alertCount);
    });

    const coverage = document.querySelector(".coverage-chip span:last-child");
    if (coverage) coverage.textContent = `${sourceCount} Live Sources`;

    renderSourceHealth(data);
    renderDashboardMap(data);
    renderRealDashboardFeeds(data);
    neutralizeLegacyCharts();
  }

  function renderSourceHealth(data) {
    const statusBox = document.querySelector(".sys-status");
    if (!statusBox) return;
    document.getElementById("real-source-health-panel")?.remove();
    document.getElementById("pilot-validation-report-panel")?.remove();
    document.getElementById("validation-summary-panel")?.remove();

    const flags = data.source_health || {};
    const rows = Object.entries(flags)
      .map(
        ([key, value]) => `
          <div style="display:flex;justify-content:space-between;gap:.5rem;">
            <span>${escapeHtml(key.replaceAll("_", " "))}</span>
            <span style="color:${value ? "#00ff88" : "#ffd166"};">${value ? "ACTIVE" : "UNAVAILABLE"}</span>
          </div>`
      )
      .join("");

    const panel = document.createElement("div");
    panel.id = "real-source-health-panel";
    panel.style.cssText =
      "margin-top:.8rem;padding:.85rem;border:1px solid rgba(0,217,255,.35);border-radius:14px;background:rgba(0,217,255,.06);font-family:var(--font-mono,monospace);";
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.5rem;">
        <strong style="font-size:.72rem;color:var(--text-primary,#fff);">REAL DATA SOURCE HEALTH</strong>
        ${statusPill("REQUEST-TIME DATA", Boolean(data.verified))}
      </div>
      <div style="font-size:.66rem;line-height:1.65;color:var(--text-secondary,#aaa);">${rows}</div>
      <div style="margin-top:.5rem;font-size:.62rem;color:var(--text-muted,#777);">Updated ${escapeHtml(formatDate(data.generated_at))}</div>`;
    statusBox.appendChild(panel);
  }

  async function loadLiveDashboard() {
    try {
      const data = await realFetch("/api/live/dashboard?city=Ajmer");
      state.dashboard = data;
      updateLandingAndDashboard(data);
      console.log("[Rakshak Real Data] Dashboard:", data);
    } catch (error) {
      console.error("[Rakshak Real Data] Dashboard failed:", error);
      const statusBox = document.querySelector(".sys-status");
      if (statusBox) {
        const holder = document.createElement("div");
        showRealError(holder, "Real dashboard", error);
        statusBox.appendChild(holder);
      }
    }
  }

  function fireDisplayName(hotspot) {
    return `${Number(hotspot.latitude).toFixed(3)}°, ${Number(
      hotspot.longitude
    ).toFixed(3)}°`;
  }

  async function showNdviForHotspot(hotspot) {
    const scenarioTitle = document.getElementById("scenario-title");
    const scenarioSub = document.querySelector("#scenario-box .scenario-sub");
    const impactMetrics = document.getElementById("impact-metrics");
    if (scenarioTitle) scenarioTitle.textContent = "Loading real Sentinel-2 NDVI…";

    try {
      const ndvi = await realFetch(
        `/api/live/forest/ndvi?lat=${encodeURIComponent(
          hotspot.latitude
        )}&lon=${encodeURIComponent(hotspot.longitude)}&radius_km=2`
      );
      const current = ndvi.current_mean_ndvi;
      const previous = ndvi.previous_mean_ndvi;
      const change = ndvi.change_percent;
      if (scenarioTitle) {
        scenarioTitle.textContent = `Satellite vegetation check · ${fireDisplayName(
          hotspot
        )}`;
      }
      if (scenarioSub) {
        scenarioSub.textContent = ndvi.verified
          ? `Copernicus Sentinel-2 · 60-day comparison · fetched ${formatDate(
              ndvi.source?.fetched_at
            )}`
          : `Copernicus data unavailable: ${ndvi.error || "No valid pixels"}`;
      }
      if (impactMetrics) {
        impactMetrics.innerHTML = `
          ${realMetric("🛰", "Current mean NDVI", current == null ? "--" : Number(current).toFixed(3), "Satellite")}
          ${realMetric("🌿", "Previous mean NDVI", previous == null ? "--" : Number(previous).toFixed(3), "Previous period")}
          ${realMetric("📉", "Vegetation change", change == null ? "--" : `${Number(change).toFixed(2)}%`, ndvi.vegetation_change_level || "Unknown")}
          ${realMetric("🔥", "Fire radiative power", `${Number(hotspot.frp_mw || 0).toFixed(1)} MW`, hotspot.severity || "Detected")}
          ${realMetric("✅", "Verified input", ndvi.verified ? "YES" : "NO", "No fabricated estimate")}
        `;
      }
    } catch (error) {
      showRealError(impactMetrics, "Copernicus NDVI", error);
    }
  }

  function realMetric(icon, label, value, badge) {
    return `
      <div class="impact-metric">
        <div class="im-header">
          <span class="im-icon">${icon}</span>
          <span class="im-label">${escapeHtml(label)}</span>
          <span class="im-badge cyan">${escapeHtml(badge)}</span>
        </div>
        <div class="im-value cyan">${escapeHtml(value)}</div>
        <div style="font-size:.62rem;color:var(--text-muted,#777);margin-top:.25rem;">Real-source value</div>
      </div>`;
  }

  async function loadRealForest() {
    const container = document.getElementById("detection-feed");
    if (!container) return;
    container.innerHTML = `<div style="padding:1rem;font-size:.72rem;color:var(--text-muted);">Loading NASA FIRMS near-real-time hotspots…</div>`;
    try {
      const data = await realFetch("/api/live/forest/fire-hotspots?days=1&limit=40");
      state.forest = data;
      const hotspots = data.hotspots || [];
      if (!data.verified) throw new Error(data.error || "NASA FIRMS unavailable");
      if (!hotspots.length) {
        container.innerHTML = `<div style="padding:1rem;font-size:.72rem;line-height:1.6;color:var(--text-secondary);">No VIIRS hotspot was returned for India in the selected one-day window. This is a valid live result, not demo data.</div>`;
      } else {
        container.innerHTML = "";
        hotspots.forEach((hotspot, index) => {
          const item = document.createElement("div");
          item.className = `detection-item ${hotspot.severity || "medium"}`;
          item.style.cursor = "pointer";
          item.innerHTML = `
            <span class="alert-tag ${hotspot.severity === "critical" ? "critical" : "warning"}">${escapeHtml((hotspot.severity || "detected").toUpperCase())}</span>
            <span class="alert-msg" style="font-size:.82rem;font-weight:600;">VIIRS thermal anomaly</span>
            <span class="alert-msg" style="font-size:.72rem;color:var(--text-secondary);">${escapeHtml(fireDisplayName(hotspot))}</span>
            <div style="display:flex;justify-content:space-between;margin-top:.3rem;font-size:.65rem;color:var(--text-muted);font-family:var(--font-mono);">
              <span>FRP ${Number(hotspot.frp_mw || 0).toFixed(1)} MW</span>
              <span>${escapeHtml(hotspot.confidence || "unknown")}</span>
            </div>
            <span class="alert-time">${escapeHtml(formatDate(hotspot.acquired_at))}</span>`;
          item.addEventListener("click", () => {
            container.querySelectorAll(".detection-item").forEach((node) => {
              node.style.outline = "none";
            });
            item.style.outline = "1px solid rgba(0,255,136,.45)";
            showNdviForHotspot(hotspot);
          });
          container.appendChild(item);
          if (index === 0) item.style.outline = "1px solid rgba(0,255,136,.45)";
        });
        await showNdviForHotspot(hotspots[0]);
      }

      const forestMap = getMap("forest");
      if (forestMap && typeof L !== "undefined") {
        clearMapData(forestMap);
        hotspots.forEach((hotspot) => {
          const color = hotspot.severity === "critical" ? "#ff4d4d" : hotspot.severity === "high" ? "#ff9f1c" : "#ffd166";
          L.circleMarker([hotspot.latitude, hotspot.longitude], {
            radius: 6, color, weight: 2, fillColor: color, fillOpacity: .45,
          }).bindPopup(`NASA FIRMS VIIRS hotspot<br>FRP ${Number(hotspot.frp_mw || 0).toFixed(1)} MW<br>${escapeHtml(formatDate(hotspot.acquired_at))}`).addTo(forestMap);
        });
        forestMap.setView([22.5, 79], 4.5);
      }
      const forestMapTitle = document.querySelector("#page-forest .forest-map-card .card-title");
      if (forestMapTitle) forestMapTitle.textContent = "🗺 NASA FIRMS Hotspots — India";
      const forestLegend = document.querySelector("#page-forest .forest-map-legend");
      if (forestLegend) forestLegend.innerHTML = `<span class="legend-item"><span class="ld-dot" style="background:#FF4D4D"></span>High FRP</span><span class="legend-item"><span class="ld-dot" style="background:#FF9F1C"></span>Moderate FRP</span><span class="legend-item">Thermal anomaly ≠ confirmed deforestation</span>`;
      const impactTitle = document.querySelector("#page-forest .impact-card .card-title");
      if (impactTitle) impactTitle.textContent = "🛰 Sentinel-2 Vegetation Analysis";

      const title = document.querySelector("#page-forest .detection-card .card-title");
      if (title) title.textContent = "📡 NASA FIRMS Fire Hotspots";
      const liveBadge = document.querySelector("#page-forest .detection-card .live-badge");
      if (liveBadge) liveBadge.textContent = "NRT SATELLITE";

      const alertBtn = document.querySelector(".btn-alert-auth");
      if (alertBtn) {
        const clean = alertBtn.cloneNode(true);
        clean.textContent = "Prototype Authority Workflow";
        clean.title = "No external authority message is sent";
        alertBtn.replaceWith(clean);
        clean.addEventListener("click", () => {
          alert("This build does not send messages to authorities. It displays verified satellite inputs and keeps dispatch as a future, authorized integration.");
        });
      }
    } catch (error) {
      showRealError(container, "NASA FIRMS", error);
    }
  }

  function getSelectedLocation(
    prefix
  ) {
    const stateSelect =
      document.getElementById(
        `${prefix}-state`
      );

    const districtSelect =
      document.getElementById(
        `${prefix}-district`
      );

    const stateOption =
      stateSelect?.selectedOptions?.[0];

    const districtOption =
      districtSelect?.selectedOptions?.[0];

    const latitude = Number(
      districtOption?.dataset?.lat
    );

    const longitude = Number(
      districtOption?.dataset?.lon
    );

    return {
      state:
        stateOption
          ?.textContent
          ?.trim()
        ||
        stateSelect
          ?.value
          ?.trim()
        ||
        "Rajasthan",

      district:
        districtOption
          ?.textContent
          ?.trim()
        ||
        districtSelect
          ?.value
          ?.trim()
        ||
        "Ajmer",

      city:
        districtOption
          ?.textContent
          ?.trim()
        ||
        "Ajmer",

      latitude:
        Number.isFinite(latitude)
          ? latitude
          : 26.4499,

      longitude:
        Number.isFinite(longitude)
          ? longitude
          : 74.6399,
    };
  }


  async function populateOfficialDistricts(
    prefix,
    stateName,
    preferredDistrict = "Ajmer"
  ) {
    const districtSelect =
      document.getElementById(
        `${prefix}-district`
      );

    if (!districtSelect) {
      return;
    }

    districtSelect.disabled = true;

    districtSelect.innerHTML = `
      <option value="">
        Loading Districts...
      </option>
    `;

    try {
      const data = await realFetch(
        `/api/live/locations/districts?state=${
          encodeURIComponent(stateName)
        }`
      );

      const districts =
        Array.isArray(data.districts)
          ? data.districts
          : [];

      districtSelect.innerHTML = "";

      if (!districts.length) {
        districtSelect.innerHTML = `
          <option value="">
            No District Data Found
          </option>
        `;

        return;
      }

      districts.forEach((item) => {
        const option =
          document.createElement("option");

        option.value =
          item.district;

        option.textContent =
          item.district;

        option.dataset.state =
          item.state || stateName;

        option.dataset.lat =
          String(
            item.latitude ?? ""
          );

        option.dataset.lon =
          String(
            item.longitude ?? ""
          );

        districtSelect.appendChild(
          option
        );
      });

      const preferred =
        districts.find(
          (item) =>
            String(item.district)
              .toLowerCase()
            ===
            String(preferredDistrict)
              .toLowerCase()
        );

      districtSelect.value =
        preferred?.district
        ||
        districts[0].district;
    } catch (error) {
      console.error(
        `[Rakshak] ${prefix} districts failed:`,
        error
      );

      districtSelect.innerHTML = `
        <option value="">
          District Loading Failed
        </option>
      `;
    } finally {
      districtSelect.disabled = false;
    }
  }


  async function populateOfficialStates(
    prefix,
    preferredState = "Rajasthan",
    preferredDistrict = "Ajmer"
  ) {
    const stateSelect =
      document.getElementById(
        `${prefix}-state`
      );

    if (!stateSelect) {
      return;
    }

    stateSelect.disabled = true;

    stateSelect.innerHTML = `
      <option value="">
        Loading States...
      </option>
    `;

    try {
      const data = await realFetch(
        "/api/live/locations/states"
      );

      const states =
        Array.isArray(data.states)
          ? data.states
          : [];

      stateSelect.innerHTML = "";

      states.forEach((stateName) => {
        const option =
          document.createElement("option");

        option.value = stateName;
        option.textContent = stateName;

        stateSelect.appendChild(
          option
        );
      });

      const matchedState =
        states.find(
          (stateName) =>
            String(stateName)
              .toLowerCase()
            ===
            String(preferredState)
              .toLowerCase()
        );

      stateSelect.value =
        matchedState
        ||
        states[0]
        ||
        "";

      await populateOfficialDistricts(
        prefix,
        stateSelect.value,
        preferredDistrict
      );
    } catch (error) {
      console.error(
        `[Rakshak] ${prefix} states failed:`,
        error
      );

      stateSelect.innerHTML = `
        <option value="">
          State Loading Failed
        </option>
      `;
    } finally {
      stateSelect.disabled = false;
    }
  }


  async function setupOfficialLocationControls() {
    const configurations = [
      {
        prefix: "plant",
        state: "Rajasthan",
        district: "Ajmer",
        loader: loadRealPlantation,
      },
      {
        prefix: "farmer",
        state: "Rajasthan",
        district: "Ajmer",
        loader: loadRealFarmer,
      },
      {
        prefix: "disaster",
        state: "Rajasthan",
        district: "Ajmer",
        loader: loadRealDisaster,
      },
    ];

    for (const config of configurations) {
      await populateOfficialStates(
        config.prefix,
        config.state,
        config.district
      );

      const stateSelect =
        document.getElementById(
          `${config.prefix}-state`
        );

      const districtSelect =
        document.getElementById(
          `${config.prefix}-district`
        );

      if (
        stateSelect &&
        !stateSelect.dataset.realBound
      ) {
        stateSelect.dataset.realBound =
          "true";

        stateSelect.addEventListener(
          "change",
          async () => {
            await populateOfficialDistricts(
              config.prefix,
              stateSelect.value,
              ""
            );

            await config.loader();
          }
        );
      }

      if (
        districtSelect &&
        !districtSelect.dataset.realBound
      ) {
        districtSelect.dataset.realBound =
          "true";

        districtSelect.addEventListener(
          "change",
          async () => {
            await config.loader();
          }
        );
      }
    }

    const disasterButton =
      document.getElementById(
        "btn-disaster-location"
      );

    if (
      disasterButton &&
      !disasterButton.dataset.realBound
    ) {
      disasterButton.dataset.realBound =
        "true";

      disasterButton.addEventListener(
        "click",
        async () => {
          disasterButton.disabled = true;
          disasterButton.textContent =
            "Loading Location...";

          try {
            await loadRealDisaster();
          } finally {
            disasterButton.disabled = false;
            disasterButton.textContent =
              "📍 Load Selected Location";
          }
        }
      );
    }

    const cropSelector =
      document.getElementById(
        "crop-selector"
      );

    if (
      cropSelector &&
      !cropSelector.dataset.realBound
    ) {
      cropSelector.dataset.realBound =
        "true";

      cropSelector.addEventListener(
        "click",
        async (event) => {
          const selectedItem =
            event.target.closest(
              ".crop-item"
            );

          if (
            !selectedItem ||
            !cropSelector.contains(
              selectedItem
            )
          ) {
            return;
          }

          cropSelector
            .querySelectorAll(
              ".crop-item"
            )
            .forEach((item) => {
              item.classList.remove(
                "active"
              );
            });

          selectedItem.classList.add(
            "active"
          );

          await loadRealFarmer();
        }
      );
    }
  }
  async function loadRealDisaster() {
    const container =
      document.getElementById(
        "risk-regions"
      );

    if (!container) {
      return;
    }

    const location =
      getSelectedLocation(
        "disaster"
      );

    container.innerHTML = `
      <div style="
        padding:1rem;
        font-size:.72rem;
        color:var(--text-muted);
      ">
        Loading ${escapeHtml(
          location.district
        )} weather and official alerts...
      </div>
    `;

    try {
      const data = await realFetch(
        `/api/live/disaster/risk/${
          encodeURIComponent(
            location.city
          )
        }`
      );

      state.disaster = data;

      const calculated =
        data.rakshak_calculated_risk
        ||
        {};

      const official =
        data.official_alerts
        ||
        [];

      container.innerHTML = `
        <div
          class="risk-item"
          style="
            outline:
            1px solid
            rgba(0,217,255,.4);
          "
        >
          <div class="risk-item-top">
            <span class="ri-name">
              ${escapeHtml(
                location.district
              )}
              <span style="
                font-size:.68rem;
                color:var(--text-muted);
              ">
                Rakshak calculation
              </span>
            </span>

            <span class="ri-score">
              Score
              ${escapeHtml(
                calculated.risk_score
                ??
                "--"
              )}/100
            </span>
          </div>

          <div class="ri-progress">
            <div
              class="
                ri-progress-fill
                ${
                  calculated.overall_risk
                  ===
                  "high"
                    ? "high"
                    : "moderate"
                }
              "
              style="
                width:${
                  Math.min(
                    100,
                    Number(
                      calculated.risk_score
                      ||
                      0
                    )
                  )
                }%
              "
            ></div>
          </div>

          <span
            class="
              ri-alert
              ${
                calculated.overall_risk
                ===
                "high"
                  ? "high"
                  : "moderate"
              }
            "
          >
            ${
              escapeHtml(
                String(
                  calculated.overall_risk
                  ||
                  "unknown"
                ).toUpperCase()
              )
            }
            · rule-based
          </span>
        </div>

        ${
          official.length
            ? official
                .slice(0, 8)
                .map(
                  (alertItem) => `
                    <div class="risk-item">
                      <div class="risk-item-top">
                        <span class="ri-name">
                          ${escapeHtml(
                            alertItem.event
                            ||
                            "Official alert"
                          )}
                        </span>

                        <span class="ri-score">
                          ${escapeHtml(
                            alertItem.severity
                            ||
                            "Official"
                          )}
                        </span>
                      </div>

                      <div style="
                        font-size:.69rem;
                        line-height:1.55;
                        color:
                        var(--text-secondary);
                      ">
                        ${escapeHtml(
                          alertItem.headline
                          ||
                          alertItem.description
                          ||
                          ""
                        )}
                      </div>

                      <span class="ri-alert high">
                        OFFICIAL CAP
                      </span>
                    </div>
                  `
                )
                .join("")
            : `
                <div style="
                  padding:.85rem;
                  font-size:.7rem;
                  color:var(--text-secondary);
                ">
                  No location-matched official
                  CAP alert found.
                </div>
              `
        }
      `;

      const disasterMap =
        getMap("disaster");

      if (
        disasterMap &&
        typeof L !== "undefined"
      ) {
        const layers =
          ensureRakshakMapLayers(
            disasterMap
          );

        clearMapData(
          disasterMap,
          ["risks", "selection"]
        );

        const score = Number(
          calculated.risk_score
          ||
          0
        );

        const color =
          score >= 75
            ? "#ff4d4d"
            : score >= 45
              ? "#ff9f1c"
              : "#00ff88";

        L.circleMarker(
          [
            location.latitude,
            location.longitude,
          ],
          {
            radius: 10,
            color,
            weight: 2,
            fillColor: color,
            fillOpacity: 0.35,
          }
        )
          .bindPopup(
            `<strong>${
              escapeHtml(
                location.district
              )
            }</strong><br>` +
            `Risk score: ${score}/100<br>` +
            `Not an official warning`
          )
          .addTo(
            layers.risks
          );

        disasterMap.setView(
          [
            location.latitude,
            location.longitude,
          ],
          8
        );

        setTimeout(() => {
          disasterMap.invalidateSize();
        }, 100);
      }

      const mapTitle =
        document.querySelector(
          "#page-disaster " +
          ".disaster-map-card " +
          ".card-title"
        );

      if (mapTitle) {
        mapTitle.textContent =
          `🗺 Live Risk Map — ${
            location.district
          }`;
      }

      const sms =
        document.getElementById(
          "sms-text"
        );

      if (sms) {
        sms.textContent =
          official.length
            ? (
                `[OFFICIAL CAP] ${
                  official[0].headline
                  ||
                  official[0].event
                }`
              )
            : (
                `[RAKSHAK CALCULATED RISK — ` +
                `NOT OFFICIAL] ${
                  calculated.farmer_advisory
                  ||
                  "No significant risk."
                }`
              );
      }
    } catch (error) {
      showRealError(
        container,
        "Live disaster data",
        error
      );
    }
  }

  async function loadRealFarmer() {
    const sms =
      document.getElementById(
        "farmer-sms"
      );

    const checklist =
      document.getElementById(
        "farmer-checklist"
      );

    const location =
      getSelectedLocation(
        "farmer"
      );

    const activeCrop =
      document.querySelector(
        "#crop-selector .crop-item.active"
      )?.dataset.crop
      ||
      "rice";

    const growthStages = {
      rice: "vegetative",
      wheat: "vegetative",
      cotton: "flowering",
      vegetables: "flowering",
      millets: "vegetative",
      chickpea: "flowering",
      mustard: "flowering",
    };

    try {
      const data = await realFetch(
        "/api/live/farmer/advisory",
        {
          method: "POST",

          body: JSON.stringify({
            state: location.state,
            district: location.district,
            city: location.city,
            latitude:
              location.latitude,
            longitude:
              location.longitude,
            crop: activeCrop,
            growth_stage:
              growthStages[activeCrop]
              ||
              "vegetative",
            sowing_date: null,
            trap_count: null,
            scouting_count: null,
            language: "hinglish",
          }),
        }
      );

      state.farmer = data;

      const topPest =
        data.pest_predictions?.[0];

      if (sms) {
        sms.textContent =
          data.alert_preview ||
          data.advisory ||
          "No active threat detected. Continue regular monitoring.";
      }

      if (checklist) {
        const actions =
          (data.checklist || [])
            .map((item) => item.task)
            .filter(Boolean);

        checklist.innerHTML =
          actions.length
            ? actions
                .map(
                  (action) => `
                    <label class="check-item">
                      <input type="checkbox">
                      ${escapeHtml(action)}
                    </label>
                  `
                )
                .join("")
            : `
                <div style="
                  font-size:.7rem;
                  color:var(--text-muted);
                ">
                  No preventive action returned.
                </div>
              `;
      }

      const banner =
        document.getElementById(
          "warning-banner"
        );

      if (banner) {
        const title =
          banner.querySelector(
            ".wb-title"
          );

        const icon =
          document.getElementById(
            "farmer-warning-icon"
          );

        const badge =
          document.getElementById(
            "farmer-warning-label"
          );

        const sub =
          banner.querySelector(
            ".wb-sub"
          );

        const active = data.active_alert === true;

        banner.style.background = active
          ? "rgba(255,100,0,0.1)"
          : "rgba(0,255,136,0.12)";
        banner.style.border = active
          ? "2px solid #FF7B00"
          : "2px solid #00ff88";
        banner.style.boxShadow = active
          ? "0 0 60px rgba(255,100,0,0.2), 0 0 120px rgba(255,77,77,0.1)"
          : "0 0 40px rgba(0,255,136,0.18), 0 0 80px rgba(0,255,136,0.12)";
        banner.style.animation = active
          ? "emergencyPulse 2.5s ease-in-out infinite"
          : "none";

        if (icon) {
          icon.textContent = active ? "🚨" : "✅";
        }

        if (badge) {
          badge.textContent = active
            ? "⚠ EMERGENCY WARNING"
            : "✅ NO ACTIVE THREAT";
          badge.style.background = active ? "#FF7B00" : "#00FF88";
          badge.style.color = active ? "#ffffff" : "#003300";
        }

        if (title) {
          title.textContent = active
            ? `PEST RISK: ${String(data.risk_level || "UNKNOWN").toUpperCase()} — ${location.district.toUpperCase()}`
            : `NO ACTIVE THREAT — ${location.district.toUpperCase()}`;
        }

        if (sub) {
          sub.textContent = active
            ? data.disclaimer || "Field confirmation is required."
            : "Normal conditions detected. Maintain routine crop monitoring and local advisory checks.";
        }
      }

      const button =
        document.getElementById(
          "btn-crop-advisory"
        );

      if (
        button &&
        !button.dataset.realBound
      ) {
        button.dataset.realBound =
          "true";

        button.textContent =
          "🌾 Refresh Pest Risk";

        button.addEventListener(
          "click",
          async () => {
            button.disabled = true;
            button.textContent =
              "Checking Weather...";

            try {
              await loadRealFarmer();
            } finally {
              button.disabled = false;
              button.textContent =
                "🌾 Refresh Pest Risk";
            }
          }
        );
      }
    } catch (error) {
      showRealError(
        checklist || sms,
        "Pest risk advisory",
        error
      );
    }
  }

  const plantationResponseCache =
    new Map();

  const PLANTATION_CACHE_TTL_MS =
    10 * 60 * 1000;

  let latestPlantationRequestId = 0;


  function getPlantationCacheKey(
    location
  ) {
    const latitude =
      Number(location.latitude)
        .toFixed(3);

    const longitude =
      Number(location.longitude)
        .toFixed(3);

    return [
      location.state,
      location.district,
      latitude,
      longitude,
    ]
      .map((value) =>
        String(value || "")
          .trim()
          .toLowerCase()
      )
      .join("|");
  }


  async function fetchPlantationRecommendation(
    location,
    {
      force = false,
    } = {}
  ) {
    const key =
      getPlantationCacheKey(
        location
      );

    const cached =
      plantationResponseCache.get(
        key
      );

    if (
      !force &&
      cached &&
      Date.now() - cached.savedAt
        <
        PLANTATION_CACHE_TTL_MS
    ) {
      return {
        data: cached.data,
        fromCache: true,
      };
    }

    const data = await realFetch(
      "/api/live/plantation/recommendation",
      {
        method: "POST",

        body: JSON.stringify({
          state:
            location.state,

          district:
            location.district,

          city:
            location.city
            ||
            location.district,

          latitude:
            location.latitude,

          longitude:
            location.longitude,

          area_hectares: 5,

          purpose: "carbon",

          irrigation_level: "low",
        }),
      }
    );

    plantationResponseCache.set(
      key,
      {
        savedAt: Date.now(),
        data,
      }
    );

    return {
      data,
      fromCache: false,
    };
  }


  function showPlantationLoading(
    location
  ) {
    const speciesList =
      document.getElementById(
        "species-list"
      );

    if (speciesList) {
      speciesList.innerHTML = `
        <div class="species-loading-state">
          🌱 Analysing climate, soil and vegetation
          for
          <strong>
            ${escapeHtml(
              location.district
            )}
          </strong>...
        </div>
      `;
    }

    const locationPanel =
      document.getElementById(
        "sim-location"
      );

    if (locationPanel) {
      const name =
        locationPanel.querySelector(
          ".sim-loc-name"
        );

      const sub =
        locationPanel.querySelector(
          ".sim-loc-sub"
        );

      if (name) {
        name.textContent =
          `${location.district}, ${location.state}`;
      }

      if (sub) {
        sub.textContent =
          "Loading verified environmental sources...";
      }
    }
  }


  function previewPlantationLocation(
    location
  ) {
    const map =
      getMap("plantation");

    if (
      !map ||
      typeof L === "undefined"
    ) {
      return;
    }

    const layers =
      ensureRakshakMapLayers(map);

    clearMapData(
      map,
      ["selection"]
    );

    L.circleMarker(
      [
        location.latitude,
        location.longitude,
      ],
      {
        radius: 8,
        color: "#00d9ff",
        weight: 2,
        fillColor: "#00d9ff",
        fillOpacity: 0.25,
      }
    )
      .bindPopup(
        `<strong>${
          escapeHtml(
            location.district
          )
        }</strong><br>` +
        `Loading plantation analysis...`
      )
      .addTo(
        layers.selection
      );

    /*
    * Map moves immediately.
    * It does not wait for NASA/SoilGrids APIs.
    */
    map.setView(
      [
        location.latitude,
        location.longitude,
      ],
      8,
      {
        animate: true,
      }
    );

    setTimeout(() => {
      map.invalidateSize({
        pan: false,
      });
    }, 80);
  }


  function normaliseSoilPh(
    rawValue
  ) {
    const value =
      Number(rawValue);

    if (!Number.isFinite(value)) {
      return null;
    }

    /*
    * SoilGrids can return pH × 10,
    * for example 72 means 7.2.
    */
    return value > 14
      ? value / 10
      : value;
  }


  function formatPlantationValue(
    value,
    suffix = "",
    digits = 2
  ) {
    const number =
      Number(value);

    if (!Number.isFinite(number)) {
      return "Data unavailable";
    }

    return `${number.toFixed(
      digits
    )}${suffix}`;
  }


  function renderPlantationMetrics(
    data
  ) {
    const climate =
      data.real_inputs
        ?.nasa_power_365_day_climate
        ?.summary
      ||
      data.real_inputs
        ?.nasa_power_30_day_climate
        ?.summary
      ||
      {};

    const soil =
      data.real_inputs
        ?.soilgrids_topsoil
        ?.properties
      ||
      {};

    const ndviData =
      data.real_inputs
        ?.copernicus_ndvi
      ||
      {};

    const soilPh =
      normaliseSoilPh(
        soil.phh2o
        ??
        soil.ph
      );

    const ndvi =
      ndviData.current_mean_ndvi
      ??
      ndviData.mean_ndvi
      ??
      ndviData.ndvi
      ??
      null;

    const temperature =
      climate.mean_temperature_celsius;

    const rainfall =
      climate.total_precipitation_mm;

    const metrics = [
      {
        icon: "🌡",
        title: "Mean Temperature",
        source: "NASA POWER",
        value:
          formatPlantationValue(
            temperature,
            "°C",
            1
          ),
        available:
          Number.isFinite(
            Number(temperature)
          ),
        progress:
          Number.isFinite(
            Number(temperature)
          )
            ? Math.min(
                100,
                Math.max(
                  10,
                  Number(temperature)
                  /
                  50
                  *
                  100
                )
              )
            : 0,
      },

      {
        icon: "🌧",
        title: "Observed Precipitation",
        source: "NASA POWER",
        value:
          formatPlantationValue(
            rainfall,
            " mm",
            1
          ),
        available:
          Number.isFinite(
            Number(rainfall)
          ),
        progress:
          Number.isFinite(
            Number(rainfall)
          )
            ? Math.min(
                100,
                Math.max(
                  5,
                  Number(rainfall)
                  /
                  500
                  *
                  100
                )
              )
            : 0,
      },

      {
        icon: "🧪",
        title: "Topsoil pH",
        source: "SoilGrids",
        value:
          formatPlantationValue(
            soilPh,
            " pH",
            1
          ),
        available:
          Number.isFinite(
            Number(soilPh)
          ),
        progress:
          Number.isFinite(
            Number(soilPh)
          )
            ? Math.min(
                100,
                Number(soilPh)
                /
                14
                *
                100
              )
            : 0,
      },

      {
        icon: "🌿",
        title: "Vegetation Index",
        source: "Sentinel-2",
        value:
          formatPlantationValue(
            ndvi,
            " NDVI",
            2
          ),
        available:
          Number.isFinite(
            Number(ndvi)
          ),
        progress:
          Number.isFinite(
            Number(ndvi)
          )
            ? Math.min(
                100,
                Math.max(
                  0,
                  (
                    Number(ndvi)
                    +
                    1
                  )
                  /
                  2
                  *
                  100
                )
              )
            : 0,
      },
    ];

    const rows = [
      ...document.querySelectorAll(
        "#page-plantation .sim-metric"
      ),
    ];

    rows.forEach(
      (row, index) => {
        const metric =
          metrics[index];

        if (!metric) {
          return;
        }

        const label =
          row.querySelector(
            ".sm-label"
          );

        const before =
          row.querySelector(
            ".sm-before"
          );

        const arrow =
          row.querySelector(
            ".sm-arrow"
          );

        const after =
          row.querySelector(
            ".sm-after"
          );

        const delta =
          row.querySelector(
            ".sm-delta"
          );

        const progress =
          row.querySelector(
            ".im-bar-fill"
          );

        if (label) {
          label.innerHTML = `
            <span>
              ${metric.icon}
            </span>
            ${escapeHtml(
              metric.title
            )}
          `;
        }

        if (before) {
          before.textContent =
            metric.source;
        }

        if (arrow) {
          arrow.textContent = "";
        }

        if (after) {
          after.textContent =
            metric.value;
        }

        if (delta) {
          delta.textContent =
            metric.available
              ? "LIVE"
              : "N/A";

          delta.classList.toggle(
            "source-unavailable",
            !metric.available
          );
        }

        if (progress) {
          progress.style.width =
            `${metric.progress}%`;
        }
      }
    );
  }

  async function loadRealPlantation(
    locationOverride = null,
    {
      force = false,
    } = {}
  ) {
    const speciesList =
      document.getElementById(
        "species-list"
      );

    const location =
      locationOverride
      ||
      getSelectedLocation(
        "plant"
      );

    location.city =
      location.city
      ||
      location.district;

    const requestId =
      ++latestPlantationRequestId;

    /*
    * Immediate visual response.
    */
    showPlantationLoading(
      location
    );

    previewPlantationLocation(
      location
    );

    try {
      const {
        data,
        fromCache,
      } =
        await fetchPlantationRecommendation(
          location,
          {
            force,
          }
        );

      /*
      * User selected another location while
      * the previous request was still loading.
      * Ignore the older response.
      */
      if (
        requestId
        !==
        latestPlantationRequestId
      ) {
        return;
      }

      state.plantation = data;

      const species =
        data.recommended_species
        ||
        data.recommended_mix
        ||
        data.species
        ||
        [];

      if (speciesList) {
        speciesList.innerHTML =
          species.length
            ? species
                .map(
                  (item) => {
                    const score =
                      item.suitability_score
                      != null
                        ? `${
                            Number(
                              item.suitability_score
                            ).toFixed(1)
                          }/100`
                        : "Score unavailable";

                    const allocation =
                      item.allocation_percent
                      != null
                        ? `${
                            item.allocation_percent
                          }% mix`
                        : "Allocation unavailable";

                    return `
                      <div class="species-item">
                        <span class="species-icon">
                          🌳
                        </span>

                        <span class="species-name">
                          ${escapeHtml(
                            item.name
                            ||
                            "Unnamed species"
                          )}
                          ·
                          ${escapeHtml(
                            allocation
                          )}
                        </span>

                        <span class="species-sci">
                          ${escapeHtml(
                            item.scientific_name
                            ||
                            ""
                          )}
                        </span>

                        <span class="species-benefit">
                          <strong>
                            Suitability:
                            ${escapeHtml(
                              score
                            )}
                          </strong>

                          <br>

                          ${escapeHtml(
                            item.reason
                            ||
                            "Best available catalog match for this location."
                          )}
                        </span>
                      </div>
                    `;
                  }
                )
                .join("")
            : `
                <div class="species-empty-state">
                  No species were returned for
                  ${escapeHtml(
                    location.district
                  )}.

                  Check tree catalog coverage and
                  verified environmental inputs.
                </div>
              `;
      }

      const locationPanel =
        document.getElementById(
          "sim-location"
        );

      if (locationPanel) {
        const name =
          locationPanel.querySelector(
            ".sim-loc-name"
          );

        const sub =
          locationPanel.querySelector(
            ".sim-loc-sub"
          );

        const capacity =
          Number(
            data.estimated_tree_capacity
            ||
            0
          );

        const confidence =
          Math.round(
            Number(
              data.confidence
              ||
              0
            )
            *
            100
          );

        if (name) {
          name.textContent =
            `${location.district}, ${location.state}`;
        }

        if (sub) {
          sub.textContent =
            `${formatNumber(
              capacity
            )} planning capacity · ` +
            `confidence ${confidence}%` +
            (
              fromCache
                ? " · cached result"
                : ""
            );
        }
      }

      renderPlantationMetrics(
        data
      );

      const map =
        getMap("plantation");

      if (
        map &&
        typeof L !== "undefined"
      ) {
        const layers =
          ensureRakshakMapLayers(
            map
          );

        clearMapData(
          map,
          [
            "plantation",
            "selection",
          ]
        );

        L.circleMarker(
          [
            location.latitude,
            location.longitude,
          ],
          {
            radius: 10,
            color: "#00ff88",
            weight: 2,
            fillColor: "#00ff88",
            fillOpacity: 0.3,
          }
        )
          .bindPopup(
            `<strong>${
              escapeHtml(
                location.district
              )
            }</strong><br>` +
            `Capacity: ${
              formatNumber(
                data.estimated_tree_capacity
                ||
                0
              )
            } trees<br>` +
            `Site verification required`
          )
          .addTo(
            layers.plantation
          );

        map.setView(
          [
            location.latitude,
            location.longitude,
          ],
          9,
          {
            animate: true,
          }
        );

        setTimeout(() => {
          map.invalidateSize({
            pan: false,
          });
        }, 100);
      }

      const mapTitle =
        document.querySelector(
          "#page-plantation " +
          ".plantation-map-card " +
          ".card-title"
        );

      if (mapTitle) {
        mapTitle.textContent =
          `🗺 Plantation Plan — ${
            location.district
          }`;
      }

      /*
      * Priority Zone click ke baad species
      * section automatically visible hoga.
      */
      if (locationOverride) {
        setTimeout(() => {
          document
            .querySelector(
              ".recommended-species-card"
            )
            ?.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
            });
        }, 120);
      }
    } catch (error) {
      /*
      * Ignore errors belonging to an older request.
      */
      if (
        requestId
        !==
        latestPlantationRequestId
      ) {
        return;
      }

      showRealError(
        speciesList,
        "Plantation recommendation",
        error
      );
    }
  }

  function findSelectOption(
    selectElement,
    requestedValue
  ) {
    if (
      !selectElement ||
      !requestedValue
    ) {
      return null;
    }

    const normalisedRequest =
      String(requestedValue)
        .trim()
        .toLowerCase();

    return [
      ...selectElement.options,
    ].find((option) => {
      const optionValue =
        String(
          option.value || ""
        )
          .trim()
          .toLowerCase();

      const optionText =
        String(
          option.textContent || ""
        )
          .trim()
          .toLowerCase();

      return (
        optionValue
          ===
          normalisedRequest
        ||
        optionText
          ===
          normalisedRequest
      );
    }) || null;
  }


  async function selectPlantationPriorityZone(
    zone
  ) {
    if (!zone) {
      return;
    }

    const stateSelect =
      document.getElementById(
        "plant-state"
      );

    const districtSelect =
      document.getElementById(
        "plant-district"
      );

    if (
      !stateSelect ||
      !districtSelect
    ) {
      console.error(
        "[Rakshak] Plantation location selectors not found."
      );

      return;
    }

    /*
    * Show loading status immediately.
    */
    const speciesList =
      document.getElementById(
        "species-list"
      );

    if (speciesList) {
      speciesList.innerHTML = `
        <div class="species-loading-state">
          Analysing climate, soil and vegetation
          for ${escapeHtml(
            zone.district
          )}...
        </div>
      `;
    }

    /*
    * Find the requested state in the
    * already populated official state list.
    */
    let stateOption =
      findSelectOption(
        stateSelect,
        zone.state
      );

    /*
    * State list not ready or state missing:
    * reload official state data.
    */
    if (!stateOption) {
      await populateOfficialStates(
        "plant",
        zone.state,
        zone.district
      );

      stateOption =
        findSelectOption(
          stateSelect,
          zone.state
        );
    }

    if (!stateOption) {
      throw new Error(
        `State not found in location data: ${zone.state}`
      );
    }

    stateSelect.value =
      stateOption.value;

    /*
    * Load all official districts
    * belonging to selected state.
    */
    await populateOfficialDistricts(
      "plant",
      stateOption.value,
      zone.district
    );

    let districtOption =
      findSelectOption(
        districtSelect,
        zone.district
      );

    /*
    * Some datasets use slightly different
    * district naming. Try partial matching.
    */
    if (!districtOption) {
      const requestedDistrict =
        String(zone.district)
          .toLowerCase();

      districtOption = [
        ...districtSelect.options,
      ].find((option) => {
        const optionName =
          String(
            option.textContent || ""
          )
            .trim()
            .toLowerCase();

        return (
          optionName.includes(
            requestedDistrict
          )
          ||
          requestedDistrict.includes(
            optionName
          )
        );
      }) || null;
    }

    if (!districtOption) {
      throw new Error(
        `District not found in location data: ${zone.district}`
      );
    }

    districtSelect.value =
      districtOption.value;

    /*
    * Prefer district GeoJSON coordinates.
    * Zone coordinates act as safe fallback.
    */
    if (
      !districtOption.dataset.lat
      ||
      !Number.isFinite(
        Number(
          districtOption.dataset.lat
        )
      )
    ) {
      districtOption.dataset.lat =
        String(zone.latitude);
    }

    if (
      !districtOption.dataset.lon
      ||
      !Number.isFinite(
        Number(
          districtOption.dataset.lon
        )
      )
    ) {
      districtOption.dataset.lon =
        String(zone.longitude);
    }

    /*
    * This function:
    * - sends selected location to backend
    * - updates species
    * - updates simulation
    * - updates plantation map
    */
    await loadRealPlantation();

    if (
      typeof showToast
      ===
      "function"
    ) {
      showToast(
        `🌿 Species updated for ${districtOption.textContent}, ${stateOption.textContent}`
      );
    }
  }


  window.addEventListener(
    "rakshak:priority-zone-selected",
    (event) => {
      selectPlantationPriorityZone(
        event.detail
      ).catch((error) => {
        console.error(
          "[Rakshak] Priority Zone selection failed:",
          error
        );

        const speciesList =
          document.getElementById(
            "species-list"
          );

        showRealError(
          speciesList,
          "Priority Zone plantation analysis",
          error
        );
      });
    }
  );

  function checkActiveRealPage() {
    const jobs = [
      ["forest", loadRealForest],
      ["disaster", loadRealDisaster],
      ["farmer", loadRealFarmer],
      ["plantation", loadRealPlantation],
    ];
    jobs.forEach(([pageName, loader]) => {
      const page = document.getElementById(`page-${pageName}`);
      if (page?.classList.contains("active") && !pageLoaded[pageName]) {
        pageLoaded[pageName] = true;
        setTimeout(() => loader().catch(console.error), 1800);
      }
    });
  }

  function neutralizeShowcaseClaims() {
    updateStaticClaims();
    const heroBadge = document.querySelector(".hero-badge span:last-child");
    if (heroBadge) heroBadge.textContent = "Connecting verified environmental sources…";

    const heroCards = [...document.querySelectorAll(".hero-stat")];
    const heroLabels = [
      "NASA FIRMS Hotspots",
      "Official CAP Alerts",
      "Live Sources",
      "Feedback Responses",
    ];
    heroCards.slice(0, 4).forEach((card, index) => {
      const number = card.querySelector(".hero-stat-num");
      if (number) {
        number.dataset.target = "0";
        number.dataset.suffix = "";
        number.textContent = "--";
      }
      const label = card.querySelector(".hero-stat-label");
      if (label) label.textContent = heroLabels[index];
    });

    document.querySelectorAll(".ig-chip").forEach((chip, index) => {
      chip.lastChild.textContent = [
        "CONNECTING REAL SOURCES",
        "OFFICIAL ALERT CHECK",
        "SOURCE HEALTH CHECK",
      ][index] || "CONNECTING";
    });

    const sidebarLive = document.querySelector(".sidebar-live span:last-child");
    if (sidebarLive) sidebarLive.textContent = "LIVE · Connecting Sources";

    const sidebarLabels = ["Fire Hotspots", "Official Alerts", "Live Sources", "Feedback Responses"];
    document.querySelectorAll(".sidebar-stats .ss-item").forEach((card, index) => {
      const value = card.querySelector(".ss-val");
      const label = card.querySelector(".ss-label");
      if (value) value.textContent = "--";
      if (label) label.textContent = sidebarLabels[index] || "Live Metric";
    });

    document.getElementById("pilot-validation-report-panel")?.remove();
    document.getElementById("validation-summary-panel")?.remove();
  }

  async function start() {
    document
      .getElementById(
        "pilot-validation-report-panel"
      )
      ?.remove();

    document
      .getElementById(
        "validation-summary-panel"
      )
      ?.remove();

    /*
    * Must run before plantation,
    * farmer and disaster loaders.
    */
    await setupOfficialLocationControls();

    await loadLiveDashboard();

    const pages =
      document.getElementById(
        "pages-container"
      );

    if (pages) {
      new MutationObserver(
        checkActiveRealPage
      ).observe(
        pages,
        {
          subtree: true,
          attributes: true,
          attributeFilter: [
            "class",
            "style",
          ],
        }
      );
    }

    checkActiveRealPage();

    window.setInterval(
      loadLiveDashboard,
      5 * 60 * 1000
    );
  }

  function boot() {
    neutralizeShowcaseClaims();
    setTimeout(
      () => {
        start().catch((error) => {
          console.error(
            "[Rakshak] Startup failed:",
            error
          );
        });
      },
      250
    );
    // Legacy api.js may render later; re-apply real dashboard values afterwards.
    setTimeout(loadLiveDashboard, 4500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

/* Remove frontend Data Transparency cards only */
function removeDataTransparencyUI() {
  const selectors = [
    "#page-forest-transparency-card",
    "#page-disaster-transparency-card",
    "#page-farmer-transparency-card",
    "#page-plantation-transparency-card",
    '[id$="-transparency-card"]',
    ".data-transparency-card",
    ".hybrid-architecture-row",
  ];

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      element.remove();
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    removeDataTransparencyUI();
    setTimeout(removeDataTransparencyUI, 1000);
    setTimeout(removeDataTransparencyUI, 4000);
  });
} else {
  removeDataTransparencyUI();
  setTimeout(removeDataTransparencyUI, 1000);
  setTimeout(removeDataTransparencyUI, 4000);
}
