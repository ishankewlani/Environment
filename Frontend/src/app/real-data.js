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

  function clearMapData(map) {
    if (!map || typeof L === "undefined") return;
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        try { map.removeLayer(layer); } catch (_) {}
      }
    });
  }

  function renderDashboardMap(data) {
    const map = getMap("dashboard");
    if (!map || typeof L === "undefined") return;
    clearMapData(map);
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
      `).addTo(map);
    });
    L.circleMarker([26.4499, 74.6399], {
      radius: 7, color: "#00d9ff", weight: 2, fillColor: "#00d9ff", fillOpacity: .35,
    }).bindPopup(`
      <strong>Ajmer live weather</strong><br>
      Temperature: ${escapeHtml(data.metrics?.temperature_celsius ?? "--")}°C<br>
      Rainfall 1h: ${escapeHtml(data.metrics?.rainfall_1h_mm ?? "--")} mm
    `).addTo(map);
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

  async function loadRealDisaster() {
    const container = document.getElementById("risk-regions");
    if (!container) return;
    container.innerHTML = `<div style="padding:1rem;font-size:.72rem;color:var(--text-muted);">Loading live weather and official CAP alerts…</div>`;
    try {
      const data = await realFetch("/api/live/disaster/risk/Ajmer");
      state.disaster = data;
      const calculated = data.rakshak_calculated_risk || {};
      const official = data.official_alerts || [];
      container.innerHTML = `
        <div class="risk-item" style="outline:1px solid rgba(0,217,255,.4);">
          <div class="risk-item-top">
            <span class="ri-name">Ajmer <span style="font-size:.68rem;color:var(--text-muted);">Rakshak calculation</span></span>
            <span class="ri-score">Score ${escapeHtml(calculated.risk_score ?? "--")}/100</span>
          </div>
          <div class="ri-progress"><div class="ri-progress-fill ${calculated.overall_risk === "high" ? "high" : "moderate"}" style="width:${Math.min(100, Number(calculated.risk_score || 0))}%"></div></div>
          <span class="ri-alert ${calculated.overall_risk === "high" ? "high" : "moderate"}">${escapeHtml(String(calculated.overall_risk || "unknown").toUpperCase())} · rule-based on real inputs</span>
        </div>
        ${official.length
          ? official.slice(0, 8).map((alertItem) => `
            <div class="risk-item">
              <div class="risk-item-top">
                <span class="ri-name">${escapeHtml(alertItem.event || "Official alert")}</span>
                <span class="ri-score">${escapeHtml(alertItem.severity || "Official")}</span>
              </div>
              <div style="font-size:.69rem;line-height:1.55;color:var(--text-secondary);">${escapeHtml(alertItem.headline || alertItem.description || "")}</div>
              <span class="ri-alert high">OFFICIAL CAP · ${escapeHtml(alertItem.source_agency || "IMD")}</span>
            </div>`).join("")
          : `<div style="padding:.85rem;font-size:.7rem;color:var(--text-secondary);border:1px solid rgba(255,255,255,.08);border-radius:12px;">No location-matched official CAP alert found. The calculated weather risk above is not an official warning.</div>`}
      `;

      const sms = document.getElementById("sms-text");
      if (sms) {
        sms.textContent = official.length
          ? `[OFFICIAL CAP] ${official[0].headline || official[0].event}`
          : `[RAKSHAK CALCULATED RISK — NOT OFFICIAL] ${calculated.farmer_advisory || "No significant current weather risk."}`;
      }
      const notification = document.querySelector(".notif-body");
      if (notification) {
        notification.textContent = data.disclaimer;
      }
      const disasterMap = getMap("disaster");
      if (disasterMap && typeof L !== "undefined") {
        clearMapData(disasterMap);
        const score = Number(calculated.risk_score || 0);
        const color = score >= 75 ? "#ff4d4d" : score >= 45 ? "#ff9f1c" : "#00ff88";
        L.circleMarker([26.4499, 74.6399], {
          radius: 10, color, weight: 2, fillColor: color, fillOpacity: .35,
        }).bindPopup(`Ajmer Rakshak calculated risk<br>Score ${score}/100<br>This marker is not an official warning`).addTo(disasterMap);
        disasterMap.setView([26.4499, 74.6399], 7);
      }
      const disasterMapTitle = document.querySelector("#page-disaster .map-card .card-title, #page-disaster .card-title");
      if (disasterMapTitle && disasterMapTitle.textContent.includes("Map")) disasterMapTitle.textContent = "🗺 Real Weather Risk Pilot — Ajmer";
    } catch (error) {
      showRealError(container, "Live disaster data", error);
    }
  }

  async function loadRealFarmer() {
    const sms = document.getElementById("farmer-sms");
    const checklist = document.getElementById("farmer-checklist");
    try {
      const data = await realFetch("/api/live/farmer/advisory", {
        method: "POST",
        body: JSON.stringify({
          city: "Ajmer",
          latitude: 26.4499,
          longitude: 74.6399,
          crop: "Bajra",
          growth_stage: "vegetative",
          language: "hinglish",
        }),
      });
      state.farmer = data;
      if (sms) {
        sms.textContent = `[REAL WEATHER + NASA POWER · RULE-BASED] ${data.advisory || "No advisory returned."}`;
      }
      if (checklist) {
        const actions = (data.checklist || []).map((item) => item.task).filter(Boolean);
        checklist.innerHTML = actions.length
          ? actions
              .map(
                (action) => `<label class="check-item"><input type="checkbox"> ${escapeHtml(action)}</label>`
              )
              .join("")
          : `<div style="font-size:.7rem;color:var(--text-muted);">No additional preventive action triggered.</div>`;
      }
      const banner = document.getElementById("warning-banner");
      if (banner) {
        const title = banner.querySelector(".wb-title");
        const sub = banner.querySelector(".wb-sub");
        if (title) title.textContent = `CURRENT RISK: ${String(data.risk_level || "unknown").toUpperCase()} — AJMER`;
        if (sub) sub.textContent = data.disclaimer;
      }

      const button = document.getElementById("btn-crop-advisory");
      if (button) {
        const clean = button.cloneNode(true);
        clean.textContent = "🌾 Refresh Real Advisory";
        button.replaceWith(clean);
        clean.addEventListener("click", async () => {
          clean.disabled = true;
          clean.textContent = "Refreshing…";
          await loadRealFarmer();
          clean.disabled = false;
          clean.textContent = "🌾 Refresh Real Advisory";
        });
      }
    } catch (error) {
      showRealError(checklist || sms, "Real farmer advisory", error);
    }
  }

  async function loadRealPlantation() {
    const speciesList = document.getElementById("species-list");
    try {
      const data = await realFetch("/api/live/plantation/recommendation", {
        method: "POST",
        body: JSON.stringify({
          city: "Ajmer",
          latitude: 26.4499,
          longitude: 74.6399,
          area_hectares: 5,
        }),
      });
      state.plantation = data;
      if (speciesList) {
        const species = data.recommended_species || [];
        speciesList.innerHTML = species.length
          ? species
              .map(
                (item) => `
                  <div class="species-item">
                    <span class="species-icon">🌳</span>
                    <span class="species-name">${escapeHtml(item.name)}</span>
                    <span class="species-sci">${escapeHtml(item.scientific_name)}</span>
                    <span class="species-benefit">${escapeHtml(item.reason)}</span>
                  </div>`
              )
              .join("")
          : `<div style="font-size:.7rem;color:var(--text-muted);">No recommendation returned because required real inputs were unavailable.</div>`;
      }
      const loc = document.getElementById("sim-location");
      if (loc) {
        const name = loc.querySelector(".sim-loc-name");
        const sub = loc.querySelector(".sim-loc-sub");
        if (name) name.textContent = "Ajmer · Real environmental inputs";
        if (sub) {
          sub.textContent = `${formatNumber(data.estimated_tree_capacity)} planning capacity · confidence ${Math.round(Number(data.confidence || 0) * 100)}%`;
        }
      }
      const plantationMap = getMap("plantation");
      if (plantationMap && typeof L !== "undefined") {
        clearMapData(plantationMap);
        L.circleMarker([26.4499, 74.6399], {
          radius: 10, color: "#00ff88", weight: 2, fillColor: "#00ff88", fillOpacity: .3,
        }).bindPopup(`Ajmer real-input plantation pilot<br>Capacity estimate: ${formatNumber(data.estimated_tree_capacity)} trees<br>Requires site verification`).addTo(plantationMap);
        plantationMap.setView([26.4499, 74.6399], 10);
      }
      const plantationMapTitle = document.querySelector("#page-plantation .map-card .card-title, #page-plantation .plantation-map-card .card-title");
      if (plantationMapTitle) plantationMapTitle.textContent = "🗺 Real-Input Plantation Pilot — Ajmer";

      const rows = [...document.querySelectorAll("#page-plantation .sim-metric")];
      const climate = data.real_inputs?.nasa_power_30_day_climate?.summary || {};
      const soil = data.real_inputs?.soilgrids_topsoil?.properties || {};
      const ndvi = data.real_inputs?.copernicus_ndvi || {};
      const values = [
        [climate.mean_temperature_celsius, "°C", "30-day mean temperature"],
        [climate.total_precipitation_mm, " mm", "30-day precipitation"],
        [soil.phh2o, " pH", "SoilGrids topsoil pH"],
        [ndvi.current_mean_ndvi, " NDVI", "Sentinel-2 vegetation index"],
      ];
      rows.forEach((row, index) => {
        const [value, suffix, label] = values[index] || [];
        const before = row.querySelector(".sm-before");
        const after = row.querySelector(".sm-after");
        const delta = row.querySelector(".sm-delta");
        if (before) before.textContent = label || "Real input";
        if (after) after.textContent = value == null ? "Unavailable" : `${Number(value).toFixed(2)}${suffix}`;
        if (delta) delta.textContent = data.verified_inputs ? "Verified source" : "Source status unknown";
      });
    } catch (error) {
      showRealError(speciesList, "Real plantation inputs", error);
    }
  }

  const pageLoaded = {
    forest: false,
    disaster: false,
    farmer: false,
    plantation: false,
  };

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

  function start() {
    document.getElementById("pilot-validation-report-panel")?.remove();
    document.getElementById("validation-summary-panel")?.remove();
    loadLiveDashboard();

    const pages = document.getElementById("pages-container");
    if (pages) {
      new MutationObserver(checkActiveRealPage).observe(pages, {
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style"],
      });
    }
    checkActiveRealPage();
    window.setInterval(loadLiveDashboard, 5 * 60 * 1000);
  }

  function boot() {
    neutralizeShowcaseClaims();
    setTimeout(start, 250);
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
