/* ════════════════════════════════════════════════════════════════
   EARTH IMMUNE SYSTEM AI — api.js
   Backend API Integration - Phase 3A + Phase 3B All Pages

   Phase 3A: Dashboard (overview, alerts, activity, health)
   Phase 3B: Forest Monitor, Disaster Risk, Farmer Advisory,
             Tree Plantation Planner

   Strategy:
   - Each page fetches from backend on first visit
   - app.js modules still do their own DOM init (renderFeed etc.)
   - api.js overrides the content after app.js renders it
   - Every fetch has fallback data so the app works offline
   - initAllPageAPI() is safe to call multiple times (idempotent)
   ════════════════════════════════════════════════════════════════ */

// Backend API Integration - Phase 3A
const API_BASE_URL = "http://localhost:8000";

/* Fix Leaflet heatmap redraw error on hidden zero-size map containers */
if (window.L && L.HeatLayer && L.HeatLayer.prototype && !L.HeatLayer.prototype._earthAISafePatch) {
  const originalRedraw = L.HeatLayer.prototype._redraw;

  L.HeatLayer.prototype._redraw = function safeHeatmapRedraw() {
    try {
      const container = this._map && this._map._container;
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
        return this;
      }
      return originalRedraw.apply(this, arguments);
    } catch (error) {
      if (error && error.name === "IndexSizeError") {
        return this;
      }
      throw error;
    }
  };

  L.HeatLayer.prototype._earthAISafePatch = true;
}

/* ── Core fetch helper ──────────────────────────────────────────
   Returns parsed JSON on success, or fallbackData on any error.
   Never throws — the app always has something to render.
────────────────────────────────────────────────────────────────── */
async function fetchFromAPI(endpoint, fallbackData) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(`[EarthAI] Backend unavailable for ${endpoint}, using fallback:`, error.message);
    return fallbackData;
  }
}

async function postToAPI(endpoint, body, fallbackData) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(`[EarthAI] POST unavailable for ${endpoint}:`, error.message);
    return fallbackData;
  }
}

/* ════════════════════════════════════════════════════════════════
   FALLBACK DATA — mirrors backend JSON so pages look identical
   when the backend is offline.
   ════════════════════════════════════════════════════════════════ */
const FALLBACK = {

  // ── Phase 3A: Dashboard ───────────────────────────────────────
  overview: {
    forest_area_monitored: "2.4M km²",
    trees_saved: "8.2M",
    farmers_protected: "1.3M",
    active_alerts: 147,
    coverage: 98.7,
    satellite_feed: "Active",
    ai_model: "Running",
    live_data_points: "4.2M",
  },
  alerts: {
    total: 147,
    items: [
      { title: "Deforestation detected",   region: "Assam Sector 18",   type: "forest",  severity: "critical", timestamp: "" },
      { title: "Wetland encroachment",     region: "Assam Wetlands",    type: "wetland", severity: "high",     timestamp: "" },
      { title: "Flood risk rising",        region: "Darbhanga, Bihar",  type: "flood",   severity: "high",     timestamp: "" },
      { title: "Plantation priority",      region: "Barmer, Rajasthan", type: "plantation", severity: "medium", timestamp: "" },
      { title: "Farmer advisory sent",     region: "Punjab",            type: "farmer",  severity: "warning",  timestamp: "" },
      { title: "Cyclone watch active",     region: "Puri Coast, Odisha",type: "storm",   severity: "medium",   timestamp: "" },
      { title: "Illegal logging activity", region: "Balaghat, MP",      type: "forest",  severity: "high",     timestamp: "" },
      { title: "Extreme heat advisory",    region: "Barmer, Rajasthan", type: "heat",    severity: "high",     timestamp: "" },
    ],
  },
  activity: {
    items: [
      { message: "Satellite scan completed — 847 zones analyzed",         timestamp: "" },
      { message: "AI model updated deforestation risk scores",             timestamp: "" },
      { message: "SMS alert dispatched to 1,240 farmers — Bihar",         timestamp: "" },
      { message: "Status report generated for Bihar flood risk",           timestamp: "" },
      { message: "Critical deforestation alert raised — Assam Sector 18", timestamp: "" },
      { message: "Thermal imaging scan completed — Rajasthan",            timestamp: "" },
      { message: "AI flood prediction model recalibrated",                timestamp: "" },
      { message: "Monthly forest coverage report published",               timestamp: "" },
    ],
  },

  // ── Phase 3B: Forest Monitor ──────────────────────────────────
  forestDetections: {
    total: 7,
    detections: [
      { id:"FD-ASSAM-18",    sector:"Assam Sector 18",         state:"Assam",        severity:"critical", trees_removed:1240, area_km2:4.2,  lat:26.14, lng:91.74, time_ago:"2 hours ago",  description:"Large-scale illegal deforestation detected." },
      { id:"FD-KERALA-WD",   sector:"Kerala Wayanad",          state:"Kerala",       severity:"high",     trees_removed:500,  area_km2:1.8,  lat:11.69, lng:76.13, time_ago:"3.5 hours ago",description:"Encroachment into forest buffer zone." },
      { id:"FD-MP-Z12",      sector:"MP Zone 12",              state:"Madhya Pradesh",severity:"medium",  trees_removed:380,  area_km2:1.2,  lat:21.80, lng:80.19, time_ago:"5 hours ago",  description:"Selective logging in Kanha buffer zone." },
      { id:"FD-CG-Z5",       sector:"Chhattisgarh Zone 5",     state:"Chhattisgarh", severity:"high",     trees_removed:415,  area_km2:1.5,  lat:22.36, lng:82.75, time_ago:"7 hours ago",  description:"Deforestation near mining expansion zone." },
      { id:"FD-MANIPUR-ES",  sector:"Manipur Eastern Sector",  state:"Manipur",      severity:"critical", trees_removed:289,  area_km2:0.9,  lat:24.33, lng:93.63, time_ago:"12 hours ago", description:"Critical green cover loss in hill district." },
      { id:"FD-ODISHA-S3",   sector:"Odisha Simlipal Zone 3",  state:"Odisha",       severity:"medium",   trees_removed:270,  area_km2:0.95, lat:21.63, lng:85.65, time_ago:"15 hours ago", description:"Forest thinning near Simlipal Tiger Reserve." },
      { id:"FD-UTTARAKHAND-D4",sector:"Uttarakhand Dehradun Zone 4",state:"Uttarakhand",severity:"low",   trees_removed:95,   area_km2:0.3,  lat:30.32, lng:78.03, time_ago:"18 hours ago", description:"Minor clearance, possibly road widening." },
    ],
  },
  forestImpact: {
    scenario: "1,240 trees removed from Assam Sector 18",
    threat_level: "critical",
    predicted_environmental_impact_duration_months: 59,
    metrics: {
      temperature_increase_celsius: 2.4,
      flood_risk_increase_percent: 2.9,
      groundwater_reduction_percent: 18.0,
      air_quality_impact_aqi: -2594,
      biodiversity_loss_species: 31,
    },
    recommendations: [
      "Alert forest department immediately",
      "Start ground verification within 24 hours",
      "Restrict further tree cutting in the affected zone",
    ],
  },

  // ── Phase 3B: Disaster Risk ───────────────────────────────────
  disasterZones: {
    total: 7,
    zones: [
      { id:"DR-BIHAR-001",       state:"Bihar",        district:"Darbhanga",  risk_type:"flood",    risk_score:92, alert_level:"high",     severity:"high",     affected_population:2400000, description:"Kosi and Gandak rivers at 91% capacity." },
      { id:"DR-UTTARAKHAND-002", state:"Uttarakhand",  district:"Chamoli",    risk_type:"flood",    risk_score:92, alert_level:"high",     severity:"high",     affected_population:480000,  description:"Cloudburst risk elevated in Chamoli." },
      { id:"DR-ASSAM-003",       state:"Assam",        district:"Jorhat",     risk_type:"flood",    risk_score:88, alert_level:"high",     severity:"high",     affected_population:1800000, description:"Brahmaputra river embankment stress." },
      { id:"DR-RAJASTHAN-004",   state:"Rajasthan",    district:"Barmer",     risk_type:"heatwave", risk_score:84, alert_level:"high",     severity:"high",     affected_population:1100000, description:"Surface temperatures at 48-51°C." },
      { id:"DR-ODISHA-005",      state:"Odisha",       district:"Puri",       risk_type:"cyclone",  risk_score:75, alert_level:"moderate", severity:"moderate", affected_population:950000,  description:"Low pressure in Bay of Bengal intensifying." },
      { id:"DR-KERALA-006",      state:"Kerala",       district:"Ernakulam",  risk_type:"flood",    risk_score:45, alert_level:"moderate", severity:"moderate", affected_population:340000,  description:"Heavy monsoon rainfall expected." },
      { id:"DR-GUJARAT-007",     state:"Gujarat",      district:"Kutch",      risk_type:"cyclone",  risk_score:68, alert_level:"moderate", severity:"moderate", affected_population:720000,  description:"Arabian Sea cyclonic circulation strengthening." },
    ],
  },
  disasterForecast: {
    zone_id: "DR-BIHAR-001",
    state: "Bihar",
    risk_type: "flood",
    current_condition: "Extreme Flood Warning",
    risk_score: 92,
    alert_level: "high",
    forecast_window_hours: 48,
    predicted_peak_time: "14:00 to 18:00 hrs",
    predicted_duration_days: 4,
    confidence: 94,
    sms_preview: "EMERGENCY: Extreme Flood Warning for Bihar. Immediate evacuation in low-lying areas. Contact NDRF helpline: 011-24363260.",
    dashboard_notification: "High Risk Alert: Severe weather in Bihar. Emergency protocols required.",
    timeline: [
      { stage:"warning_issued", label:"Warning Issued", status:"completed" },
      { stage:"rainfall_peak",  label:"Peak Rainfall",  status:"upcoming"  },
      { stage:"flood_peak",     label:"Flood Peak",     status:"upcoming"  },
      { stage:"recovery",       label:"Recovery Phase", status:"pending"   },
    ],
    recommended_actions: ["Activate district emergency response team","Move people from low-lying areas","Prepare relief shelters","Notify farmers and local authorities"],
  },

  // ── Phase 3B: Farmer Advisory ─────────────────────────────────
  farmerAdvisories: {
    total: 7,
    advisories: [
      { id:"FA-BIHAR-001",       state:"Bihar",       crop:"Paddy",        risk_type:"flood",    risk_level:"high",     farmers_affected:1240, sms_preview:"Flood risk detected in your area within the next 48 hours. Please move equipment and protect crops where possible.", simple_advisory:"Agle 48 ghante me flood ka risk hai. Kripya kheti ka saman safe jagah par rakh dein.", checklist:[{task:"Move equipment to higher ground",priority:"high",completed:false},{task:"Clear field drainage channels",priority:"high",completed:false},{task:"Cover stored grain with waterproof sheet",priority:"high",completed:false},{task:"Move livestock to safe area",priority:"medium",completed:false},{task:"Stop additional irrigation",priority:"medium",completed:false}] },
      { id:"FA-RAJASTHAN-003",   state:"Rajasthan",  crop:"Bajra",        risk_type:"heatwave", risk_level:"high",     farmers_affected:620,  sms_preview:"Extreme heat warning in Barmer. Avoid working in fields between 10am-4pm.", simple_advisory:"Bahut tez garmi aa rahi hai. Dopahar khet mein mat jaayein.", checklist:[{task:"Set up shade for livestock",priority:"high",completed:false},{task:"Increase irrigation to twice daily",priority:"high",completed:false},{task:"Apply mulch around crop base",priority:"medium",completed:false}] },
      { id:"FA-ASSAM-004",       state:"Assam",      crop:"Tea and Paddy",risk_type:"flood",    risk_level:"high",     farmers_affected:980,  sms_preview:"Flood warning in Jorhat. Move tea garden equipment and paddy seed stock to safety.", simple_advisory:"Jorhat mein baadh ka khatraa hai. Saman surakshit jagah rakhein.", checklist:[{task:"Move tea machinery to higher ground",priority:"high",completed:false},{task:"Protect paddy seedling nurseries",priority:"high",completed:false}] },
      { id:"FA-PUNJAB-002",      state:"Punjab",     crop:"Wheat",        risk_type:"flood",    risk_level:"moderate", farmers_affected:870,  sms_preview:"Heavy rain expected in Ludhiana in 36 hours. Check field drainage and avoid pesticide spraying.", simple_advisory:"Barish aane wali hai. Drainage check karein.", checklist:[{task:"Inspect and clear field drainage",priority:"high",completed:false},{task:"Move farm machinery into sheds",priority:"high",completed:false}] },
      { id:"FA-MAHARASHTRA-005", state:"Maharashtra",crop:"Soybean",      risk_type:"flood",    risk_level:"moderate", farmers_affected:540,  sms_preview:"Heavy rainfall expected in Latur. Soybean fields need drainage attention.", simple_advisory:"Latur mein bhari barish aane wali hai. Drainage saaf rakhein.", checklist:[{task:"Clear inter-row drainage",priority:"high",completed:false},{task:"Stop all additional irrigation",priority:"high",completed:false}] },
      { id:"FA-ODISHA-006",      state:"Odisha",     crop:"Paddy",        risk_type:"storm",    risk_level:"moderate", farmers_affected:760,  sms_preview:"Cyclone watch active for Puri coast. Paddy farmers: secure crops within 60 hours.", simple_advisory:"Puri mein toofan ka khatra hai. Fasal surakshit karein.", checklist:[{task:"Harvest mature paddy sections early",priority:"high",completed:false},{task:"Secure all farm tools and equipment",priority:"high",completed:false}] },
      { id:"FA-GUJARAT-007",     state:"Gujarat",    crop:"Cotton",       risk_type:"storm",    risk_level:"moderate", farmers_affected:430,  sms_preview:"Cyclone advisory for Kutch. Cotton farmers: secure drip lines, protect young plants.", simple_advisory:"Kutch mein aandhi aa sakti hai. Drip line bandh karein.", checklist:[{task:"Shut and secure drip irrigation lines",priority:"high",completed:false},{task:"Protect young cotton plants from wind",priority:"high",completed:false}] },
    ],
  },

  // ── Phase 3B: Plantation Planner ──────────────────────────────
  plantationZones: {
    total: 7,
    zones: [
      { id:"PL-DELHI-002", state:"Delhi",         district:"South Delhi",    city_or_area:"Delhi NCR Urban Zone",    priority_level:"critical", heat_index:47, green_cover_percent:6,  recommended_trees_count:32000, main_reason:"Urban heat island, critically low green cover" },
      { id:"PL-GUJ-006",   state:"Gujarat",       district:"Kutch",          city_or_area:"Kutch Dry Zone",          priority_level:"critical", heat_index:46, green_cover_percent:5,  recommended_trees_count:28000, main_reason:"Extreme heat, saline soil degradation" },
      { id:"PL-RAJ-001",   state:"Rajasthan",     district:"Ajmer",          city_or_area:"Ajmer City",              priority_level:"high",     heat_index:44, green_cover_percent:9,  recommended_trees_count:18500, main_reason:"High temperature, low green cover" },
      { id:"PL-MAH-003",   state:"Maharashtra",   district:"Vidarbha Region",city_or_area:"Vidarbha Plateau",        priority_level:"high",     heat_index:42, green_cover_percent:14, recommended_trees_count:22000, main_reason:"Heat stress, groundwater depletion" },
      { id:"PL-BIHAR-004", state:"Bihar",         district:"Patna",          city_or_area:"Patna River Belt",        priority_level:"high",     heat_index:38, green_cover_percent:12, recommended_trees_count:19800, main_reason:"Flood buffer plantation priority" },
      { id:"PL-ASSAM-005", state:"Assam",         district:"Kamrup Metro",   city_or_area:"Guwahati Urban & Fringe", priority_level:"high",     heat_index:36, green_cover_percent:18, recommended_trees_count:16500, main_reason:"Flood buffer, urban sprawl" },
      { id:"PL-TEL-007",   state:"Telangana",     district:"Hyderabad",      city_or_area:"Hyderabad Urban Periphery",priority_level:"medium",  heat_index:40, green_cover_percent:16, recommended_trees_count:14200, main_reason:"Urban expansion, heat island growing" },
    ],
  },
  plantationSpecies: {
    total: 10,
    species: [
      { name:"Neem",    scientific_name:"Azadirachta indica",  benefits:["air purification","pest control","heat reduction"] },
      { name:"Peepal",  scientific_name:"Ficus religiosa",     benefits:["24-hour oxygen production","urban heat reduction"] },
      { name:"Banyan",  scientific_name:"Ficus benghalensis",  benefits:["massive canopy shade","groundwater recharge"] },
      { name:"Arjun",   scientific_name:"Terminalia arjuna",   benefits:["riverbank stabilisation","flood buffer"] },
      { name:"Jamun",   scientific_name:"Syzygium cumini",     benefits:["groundwater recharge","wildlife food source"] },
      { name:"Khejri",  scientific_name:"Prosopis cineraria",  benefits:["extreme drought tolerance","nitrogen fixation"] },
      { name:"Teak",    scientific_name:"Tectona grandis",     benefits:["high carbon sequestration","dense canopy"] },
      { name:"Bamboo",  scientific_name:"Bambusoideae spp.",   benefits:["fastest growing","flood buffer","soil binder"] },
      { name:"Mango",   scientific_name:"Mangifera indica",    benefits:["large canopy shade","fruit production"] },
      { name:"Shisham", scientific_name:"Dalbergia sissoo",    benefits:["nitrogen fixation","erosion control"] },
    ],
  },
  plantationRec: {
    zone_id: "PL-RAJ-001",
    state: "Rajasthan",
    district: "Ajmer",
    priority_level: "high",
    current_condition: { temperature_celsius: 44, green_cover_percent: 9, rainfall_mm: 520, soil_type: "sandy loam", groundwater_status: "low" },
    recommended_trees_count: 18500,
    recommended_species: [
      { name:"Khejri", reason:"Best suited for dry Rajasthan climate and sandy soil" },
      { name:"Neem",   reason:"Heat tolerant and improves air quality" },
      { name:"Banyan", reason:"Provides high shade and long-term ecological benefit" },
    ],
    environmental_simulation: {
      temperature_reduction_celsius: 2.1,
      flood_risk_reduction_percent: 8,
      groundwater_recharge_improvement_percent: 14,
      air_quality_improvement_percent: 19,
      environmental_health_score_improvement: 31,
      carbon_absorption_tons_per_year: 407,
    },
    implementation_plan: [
      "Start plantation before monsoon",
      "Use native drought-resistant species",
      "Create water harvesting pits near plantation zones",
      "Monitor survival rate every 30 days",
    ],
  },
};

/* ════════════════════════════════════════════════════════════════
   SHARED HELPERS
   ════════════════════════════════════════════════════════════════ */

function severityToType(severity) {
  if (severity === "critical") return "critical";
  if (severity === "high" || severity === "warning") return "warning";
  return "info";
}

function severityToTag(severity, type) {
  const tags = { critical:"CRITICAL", high:"HIGH", warning:"WARNING", medium:"MEDIUM", low:"INFO" };
  if (type === "forest")  return "FOREST";
  if (type === "wetland") return "WETLAND";
  if (type === "flood")   return "FLOOD";
  if (type === "farmer")  return "FARMER";
  if (type === "storm")   return "STORM";
  return tags[severity] || "INFO";
}

function relativeTime(isoTimestamp) {
  if (!isoTimestamp) return "";
  try {
    const diff = Date.now() - new Date(isoTimestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs} hr ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch { return ""; }
}

function parseOverviewNumber(value) {
  if (typeof value === "number") return value;

  const str = String(value).trim().toUpperCase().replace(/,/g, "");
  const num = parseFloat(str.replace(/[^\d.]/g, ""));

  if (!Number.isFinite(num)) return 0;

  if (str.includes("M")) return num * 1_000_000;
  if (str.includes("K")) return num * 1_000;

  return num;
}

/* ════════════════════════════════════════════════════════════════
   PHASE 3A — DASHBOARD
   ════════════════════════════════════════════════════════════════ */

function applyOverview(data) {
  const mappings = [
    { selector: '.stat-num[data-count="2400000"]', key: "forest_area_monitored" },
    { selector: '.stat-num[data-count="8200000"]', key: "trees_saved"           },
    { selector: '.stat-num[data-count="147"]',      key: "active_alerts"         },
    { selector: '.stat-num[data-count="1300000"]',  key: "farmers_protected"     },
  ];
  mappings.forEach(({ selector, key }) => {
    const el = document.querySelector(selector);
    if (!el || data[key] == null) return;
    el.dataset.count = parseOverviewNumber(data[key]);
  });

  document.querySelectorAll(".badge-count, .alert-count-badge").forEach((badge) => {
    if (data.active_alerts != null) {
      badge.textContent = data.active_alerts;
    }
  });

  const coverageChip = document.querySelector(".coverage-chip");
  if (coverageChip && data.coverage != null)
    coverageChip.innerHTML = `<span class="pulse-dot sm"></span><span>${data.coverage}% Coverage</span>`;

  document.querySelectorAll(".ss-item").forEach(item => {
    const label = item.querySelector(".ss-label")?.textContent?.trim();
    const val   = item.querySelector(".ss-val");
    if (!val) return;
    if (label === "Forests Monitored"  && data.forest_area_monitored) val.textContent = data.forest_area_monitored;
    if (label === "Active Alerts"      && data.active_alerts != null)  val.textContent = data.active_alerts;
    if (label === "Trees Saved"        && data.trees_saved)            val.textContent = data.trees_saved;
    if (label === "Farmers Protected"  && data.farmers_protected)      val.textContent = data.farmers_protected;
  });

  const sidebarLive = document.querySelector(".sidebar-live");
  if (sidebarLive && data.live_data_points)
    sidebarLive.innerHTML = `<span class="live-dot"></span><span>LIVE · ${data.live_data_points} Data Points</span>`;

  document.querySelectorAll(".sys-status .ss-row").forEach(row => {
    const text = row.textContent;
    if (text.includes("Satellite Feed") && data.satellite_feed)
      row.innerHTML = `<span class="pulse-dot sm"></span>Satellite Feed · ${data.satellite_feed}`;
    if (text.includes("AI Model") && data.ai_model)
      row.innerHTML = `<span class="pulse-dot sm cyan"></span>AI Model · ${data.ai_model}`;
  });
}

function applyAlerts(alertsData) {
  const items = alertsData.items || [];
  const converted = items.map(a => ({
    type: severityToType(a.severity),
    tag:  severityToTag(a.severity, a.type),
    msg:  `${a.title} — ${a.region}`,
    time: relativeTime(a.timestamp),
  }));
  if (!converted.length) return;

  const container = document.getElementById("dashboard-alerts");
  if (!container) return;
  container.innerHTML = "";

  converted.forEach(a => {
    const div = document.createElement("div");
    div.className = `alert-item ${a.type}`;
    div.innerHTML = `
      <span class="alert-tag ${a.type === "critical" ? "critical" : a.type === "warning" ? "warning" : "info"}">${a.tag}</span>
      <span class="alert-msg">${a.msg}</span>
      <span class="alert-time">${a.time}</span>
    `;
    container.appendChild(div);
  });

  document.querySelectorAll(".badge-count, .alert-count-badge").forEach((badge) => {
    if (alertsData.total != null) {
      badge.textContent = alertsData.total;
    }
  });
}
function applyActivity(activityData) {
  const items = activityData.items || [];
  if (!items.length) return;

  const container = document.getElementById("activity-feed");
  if (!container) return;
  container.innerHTML = "";

  items.forEach(a => {
    const div = document.createElement("div");
    div.className = "activity-item";
    div.innerHTML = `
      <div class="activity-dot"></div>
      <div>
        <span style="color:var(--text-primary)">${a.message}</span><br/>
        <span style="font-size:0.68rem;font-family:var(--font-mono);color:var(--text-muted)">${relativeTime(a.timestamp)}</span>
      </div>
    `;
    container.appendChild(div);
  });
}

function applyHealthStatus(isOnline) {
  const statusBox = document.querySelector(".sys-status");
  if (!statusBox) return;
  const existing = statusBox.querySelector(".backend-status-row");
  if (existing) existing.remove();

  const row = document.createElement("span");
  row.className = "ss-row backend-status-row";
  if (isOnline) {
    row.innerHTML = `<span class="pulse-dot sm"></span>Backend · Connected`;
    row.style.color = "var(--neon, #00E840)";
  } else {
    row.innerHTML = `<span style="font-size:0.6rem">⚠</span> Backend · Demo Mode`;
    row.style.color = "var(--text-muted, #666)";
  }
  statusBox.appendChild(row);
}

async function initDashboardAPI() {
  // Backend API Integration - Phase 3A
  const health = await fetchFromAPI("/health", null);
  const isOnline = health !== null && health.status === "healthy";
  applyHealthStatus(isOnline);

  const overview = await fetchFromAPI("/api/dashboard/overview", FALLBACK.overview);
  applyOverview(overview);

  const alerts = await fetchFromAPI("/api/alerts/live", FALLBACK.alerts);
  applyAlerts(alerts);

  const activity = await fetchFromAPI("/api/dashboard/activity", FALLBACK.activity);
  applyActivity(activity);

  if (typeof Dashboard !== "undefined" && typeof Dashboard.renderStats === "function") {
    Dashboard.renderStats();
  }

  if (isOnline) {
    console.log("[EarthAI] ✅ Backend connected — dashboard loaded from API");
  } else {
    console.log("[EarthAI] ⚠ Backend offline — dashboard in demo mode");
  }
}

/* ════════════════════════════════════════════════════════════════
   PHASE 3B — FOREST MONITOR
   ════════════════════════════════════════════════════════════════ */

// Holds the current detection id for the alert button POST
let _activeDetectionId = "FD-ASSAM-18";

function _severityTagClass(severity) {
  if (severity === "critical") return "critical";
  if (severity === "high")     return "warning";
  return "info";
}

function renderForestDetections(data, impactData) {
  const container = document.getElementById("detection-feed");
  if (!container) return;
  container.innerHTML = "";

  const detections = data.detections || [];

  detections.forEach((d, i) => {
    const div = document.createElement("div");
    div.className = `detection-item ${d.severity}`;
    div.style.opacity = "0";
    div.style.transform = "translateY(8px)";
    div.style.cursor = "pointer";

    const tagClass = _severityTagClass(d.severity);
    const tag = d.severity === "critical" ? "CRITICAL" : d.severity === "high" ? "HIGH" : d.severity === "medium" ? "MEDIUM" : "INFO";
    const coords = `${d.lat.toFixed(2)}°N, ${d.lng.toFixed(2)}°E`;

    div.innerHTML = `
      <span class="alert-tag ${tagClass}">${tag}</span>
      <span class="alert-msg" style="font-size:0.88rem;font-weight:600;">${d.sector}</span>
      <span class="alert-msg" style="font-size:0.78rem;color:var(--text-secondary);">${d.trees_removed.toLocaleString()} trees removed</span>
      <div style="display:flex;justify-content:space-between;margin-top:0.3rem;">
        <span style="font-size:0.68rem;font-family:var(--font-mono);color:var(--text-muted);">${coords}</span>
        <span style="font-size:0.68rem;font-family:var(--font-mono);color:var(--text-muted);">${d.area_km2} km²</span>
      </div>
      <span class="alert-time">${d.time_ago || relativeTime(d.detected_at)}</span>
    `;

    // Click → fetch and display impact prediction for this detection
    div.addEventListener("click", async () => {
      document.querySelectorAll(".detection-item").forEach(el => el.style.outline = "none");
      div.style.outline = "1px solid rgba(0,255,136,0.4)";
      _activeDetectionId = d.id;
      const pred = await fetchFromAPI(
        `/api/forest/impact-prediction/${d.id}`,
        FALLBACK.forestImpact
      );
      renderForestImpact(pred);
    });

    container.appendChild(div);
    setTimeout(() => {
      div.style.transition = "opacity 0.4s ease, transform 0.4s ease";
      div.style.opacity = "1";
      div.style.transform = "translateY(0)";
    }, i * 100);
  });

  // Auto-highlight first item (FD-ASSAM-18)
  if (container.firstChild) {
    container.firstChild.style.outline = "1px solid rgba(0,255,136,0.4)";
  }

  // Render the initial impact (already fetched)
  if (impactData) renderForestImpact(impactData);
}

function renderForestImpact(pred) {
  const titleEl = document.getElementById("scenario-title");
  if (titleEl) titleEl.textContent = `Scenario: ${pred.scenario}`;

  const subEl = document.querySelector("#scenario-box .scenario-sub");
  if (subEl) subEl.textContent = `Predicted environmental threat level: ${pred.predicted_environmental_impact_duration_months} months`;

  const container = document.getElementById("impact-metrics");
  if (!container) return;
  container.innerHTML = "";

  const m = pred.metrics;
  const impacts = [
    { icon:"🌡", label:"Temperature Increase",  value:`+${m.temperature_increase_celsius}°C`,    badge:pred.threat_level.toUpperCase(), badgeClass:"high",     barClass:"red",    barW:`${Math.min(100, m.temperature_increase_celsius * 20)}%` },
    { icon:"🌊", label:"Flood Risk Increase",    value:`+${m.flood_risk_increase_percent}%`,       badge:"FLOOD",                         badgeClass:"critical", barClass:"orange", barW:`${Math.min(100, m.flood_risk_increase_percent * 8)}%` },
    { icon:"💧", label:"Groundwater Reduction",  value:`−${m.groundwater_reduction_percent}%`,     badge:"CRITICAL",                      badgeClass:"cyan",     barClass:"cyan",   barW:`${Math.min(100, m.groundwater_reduction_percent * 2.5)}%` },
    { icon:"💨", label:"Air Quality Impact",     value:`${m.air_quality_impact_aqi.toLocaleString()}`, badge:"POOR",                     badgeClass:"high",     barClass:"red",    barW:`${Math.min(100, Math.abs(m.air_quality_impact_aqi) / 40)}%` },
    { icon:"🦋", label:"Biodiversity Loss",      value:`−${m.biodiversity_loss_species} species`,  badge:"MGN",                           badgeClass:"gold",     barClass:"gold",   barW:`${Math.min(100, m.biodiversity_loss_species * 2)}%` },
  ];

  impacts.forEach(im => {
    const div = document.createElement("div");
    div.className = "impact-metric";
    div.innerHTML = `
      <div class="im-header">
        <span class="im-icon">${im.icon}</span>
        <span class="im-label">${im.label}</span>
        <span class="im-badge ${im.badgeClass}">${im.badge}</span>
      </div>
      <div class="im-value ${im.barClass}">${im.value}</div>
      <div class="im-bar"><div class="im-bar-fill ${im.barClass}" style="width:0%"></div></div>
    `;
    container.appendChild(div);
    requestAnimationFrame(() => {
      setTimeout(() => {
        const fill = div.querySelector(".im-bar-fill");
        if (fill) fill.style.width = im.barW;
      }, 100);
    });
  });
}

function setupForestAlertButton() {
  const btn = document.querySelector(".btn-alert-auth");
  if (!btn || btn._apiConnected) return;
  btn._apiConnected = true;

  // Override the existing click listener by replacing the button clone
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  newBtn.addEventListener("click", async () => {
    newBtn.textContent = "⏳ Alerting Authorities...";
    newBtn.disabled = true;

    const result = await postToAPI(
      "/api/forest/alert-authorities",
      { detection_id: _activeDetectionId, message: `Deforestation detected — ${_activeDetectionId}` },
      { success: true, mode: "demo", recipients: ["Forest Department", "NDRF", "District Authority", "State Police"], alert_reference: "FOREST-ALERT-DEMO" }
    );

    if (result.success) {
      newBtn.style.background = "linear-gradient(135deg, #00FF88, #00CC6E)";
      newBtn.style.color = "#07120A";
      newBtn.textContent = "✅ Authorities Alerted";
      if (typeof showToast === "function") {
        showToast(`🚨 Alert sent! Ref: ${result.alert_reference} · Recipients: ${result.recipients.join(", ")}`);
      }
    } else {
      newBtn.textContent = "⚠ Alert Failed (Demo)";
    }

    setTimeout(() => {
      newBtn.style.background = "";
      newBtn.style.color = "";
      newBtn.textContent = "🚨 Alert Authorities Now";
      newBtn.disabled = false;
    }, 3500);
  });
}

async function initForestAPI() {
  // Backend API Integration - Phase 3B Forest Monitor
  const [detectionsData, impactData] = await Promise.all([
    fetchFromAPI("/api/forest/detections", FALLBACK.forestDetections),
    fetchFromAPI("/api/forest/impact-prediction/FD-ASSAM-18", FALLBACK.forestImpact),
  ]);
  renderForestDetections(detectionsData, impactData);
  setupForestAlertButton();
}

/* ════════════════════════════════════════════════════════════════
   PHASE 3B — DISASTER RISK
   ════════════════════════════════════════════════════════════════ */

function _alertLevelClass(level) {
  if (level === "critical") return "high";  // uses same CSS class
  if (level === "high")     return "high";
  if (level === "moderate") return "moderate";
  return "low";
}

function renderDisasterZones(data, forecastData) {
  const container = document.getElementById("risk-regions");
  if (!container) return;
  container.innerHTML = "";

  const zones = data.zones || [];

  zones.forEach(z => {
    const div = document.createElement("div");
    div.className = "risk-item";
    const lvlClass = _alertLevelClass(z.alert_level);
    const levelLabel = z.alert_level.charAt(0).toUpperCase() + z.alert_level.slice(1);

    div.innerHTML = `
      <div class="risk-item-top">
        <span class="ri-name">${z.state} <span style="font-size:0.7rem;color:var(--text-muted)">(${z.risk_type})</span></span>
        <span class="ri-score">Risk Score: ${z.risk_score}/100</span>
      </div>
      <div class="ri-progress">
        <div class="ri-progress-fill ${lvlClass}" style="width:0%"></div>
      </div>
      <span class="ri-alert ${lvlClass}">Alert Level: ${levelLabel}</span>
    `;

    div.style.cursor = "pointer";
    div.addEventListener("click", async () => {
      document.querySelectorAll(".risk-item").forEach(el => el.style.outline = "none");
      div.style.outline = "1px solid rgba(255,77,77,0.4)";
      const fc = await fetchFromAPI(
        `/api/disaster/forecast/${z.id}`,
        FALLBACK.disasterForecast
      );
      applyDisasterForecast(fc);
      if (typeof showToast === "function") showToast(`⚠️ ${z.state} selected — risk data loaded`);
    });

    container.appendChild(div);
    setTimeout(() => {
      const fill = div.querySelector(".ri-progress-fill");
      if (fill) fill.style.width = `${z.risk_score}%`;
    }, 300);
  });

  // Auto-select Bihar (first zone) and show its forecast
  if (container.firstChild) {
    container.firstChild.style.outline = "1px solid rgba(255,77,77,0.4)";
  }
  if (forecastData) applyDisasterForecast(forecastData);
}

function applyDisasterForecast(fc) {
  // SMS preview
  const smsEl = document.getElementById("sms-text");
  if (smsEl && fc.sms_preview) smsEl.textContent = fc.sms_preview;

  // Dashboard notification
  const notifEl = document.querySelector(".notif-body");
  if (notifEl && fc.dashboard_notification) notifEl.textContent = fc.dashboard_notification;

  // Timeline meta
  const tlMeta = document.querySelector("#page-disaster .timeline-meta");
  if (tlMeta) {
    tlMeta.textContent = `Peak predicted ${fc.predicted_peak_time} · Duration: ${fc.predicted_duration_days} days`;
  }
}

function setupDisasterReportBtn() {
  const btn = document.getElementById("btn-disaster-report");
  if (!btn || btn._apiConnected) return;
  btn._apiConnected = true;

  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  newBtn.addEventListener("click", async () => {
    newBtn.textContent = "⏳ Generating Status Report...";
    newBtn.disabled = true;

    const result = await postToAPI(
      "/api/disaster/generate-report",
      { region: "India", risk_types: ["flood", "heatwave", "cyclone", "storm"], format: "pdf" },
      { success: true, mode: "demo", report_status: "ready", report_id: "DR-REPORT-DEMO", message: "Status report generated with all risk zones. PDF ready." }
    );

    newBtn.textContent = "✅ Status Report Ready";
    newBtn.style.background = "linear-gradient(135deg, #00D9FF, #0099CC)";
    if (typeof showToast === "function") {
      showToast(`📊 ${result.message} · ID: ${result.report_id}`);
    }
    setTimeout(() => {
      newBtn.textContent = "📊 Generate Status Report";
      newBtn.style.background = "";
      newBtn.disabled = false;
    }, 3500);
  });
}

async function initDisasterAPI() {
  // Backend API Integration - Phase 3B Disaster Risk
  const [zonesData, forecastData] = await Promise.all([
    fetchFromAPI("/api/disaster/risk-zones", FALLBACK.disasterZones),
    fetchFromAPI("/api/disaster/forecast/DR-BIHAR-001", FALLBACK.disasterForecast),
  ]);
  renderDisasterZones(zonesData, forecastData);
  setupDisasterReportBtn();
}

/* ════════════════════════════════════════════════════════════════
   PHASE 3B — FARMER ADVISORY
   ════════════════════════════════════════════════════════════════ */

function renderFarmerWarnings(advisories) {
  // #farmer-warnings appears twice in the HTML (panel + right sidebar)
  // Update ALL instances
  document.querySelectorAll("#farmer-warnings").forEach(container => {
    container.innerHTML = "";
    const top3 = advisories.slice(0, 3);
    top3.forEach(a => {
      const div = document.createElement("div");
      div.className = `warn-item ${a.risk_type}`;
      div.innerHTML = `
        <div class="warn-type ${a.risk_type}">${a.risk_type.toUpperCase()}</div>
        <div class="warn-msg">${a.state} — ${a.crop}: ${a.risk_level} risk, ${a.farmers_affected.toLocaleString()} farmers affected</div>
      `;
      container.appendChild(div);
    });
  });
}

function applyFarmerAdvisory(advisory) {
  // SMS preview
  const smsEl = document.getElementById("farmer-sms");
  if (smsEl && advisory.sms_preview) smsEl.textContent = advisory.sms_preview;

  // Checklist
  const checklistEl = document.getElementById("farmer-checklist");
  if (checklistEl && advisory.checklist) {
    checklistEl.innerHTML = "";
    advisory.checklist.forEach((item, i) => {
      const label = document.createElement("label");
      label.className = "check-item";
      const checked = item.completed || i === 2;
      label.innerHTML = `<input type="checkbox" ${checked ? "checked" : ""} /> ${item.task}`;
      // Visual-only toggle (no persistence in Phase 3B)
      label.querySelector("input").addEventListener("change", function () {
        label.style.opacity = this.checked ? "0.7" : "1";
      });
      checklistEl.appendChild(label);
    });
  }

  // Warning banner
  const banner = document.getElementById("warning-banner");
  if (banner && advisory.risk_level) {
    const colorMap = {
      critical: { bg:"rgba(255,77,77,0.12)",   border:"rgba(255,77,77,0.35)",   accent:"#FF4444", btnBg:"#FF4444" },
      high:     { bg:"rgba(255,159,28,0.12)",  border:"rgba(255,159,28,0.35)", accent:"#FF9F1C", btnBg:"#FF9F1C" },
      moderate: { bg:"rgba(255,159,28,0.12)",  border:"rgba(255,159,28,0.35)", accent:"#FF9F1C", btnBg:"#FF9F1C" },
      low:      { bg:"rgba(255,209,102,0.10)", border:"rgba(255,209,102,0.3)", accent:"#FFD166", btnBg:"#FFD166" },
    };
    const c = colorMap[advisory.risk_level] || colorMap.moderate;
    banner.style.background = c.bg;
    banner.style.borderColor = c.border;
    const wbTitle = banner.querySelector(".wb-title");
    if (wbTitle) wbTitle.innerHTML = `CURRENT WARNING: <span class="wb-level-text" style="color:${c.accent}">${advisory.risk_level.toUpperCase()} RISK — ${advisory.state}</span>`;
    const wbSub = banner.querySelector(".wb-sub");
    if (wbSub && advisory.simple_advisory) wbSub.textContent = advisory.simple_advisory;
    const wbLevel = banner.querySelector(".wb-level");
    if (wbLevel) wbLevel.style.background = c.btnBg;
  }
}

function setupFarmerAdvisoryBtn(advisory) {
  const btn = document.getElementById("btn-crop-advisory");
  if (!btn || btn._apiConnected) return;
  btn._apiConnected = true;

  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  newBtn.addEventListener("click", async () => {
    newBtn.textContent = "⏳ Generating Advisory...";
    newBtn.disabled = true;

    const result = await postToAPI(
      "/api/farmer/send-sms-preview",
      { advisory_id: advisory.advisory_id || "FA-BIHAR-001", language: "simple_hinglish" },
      { success: true, mode: "demo", recipients_count: advisory.farmers_affected || 1240, reference: "FARMER-SMS-DEMO", sms_preview: advisory.sms_preview || "" }
    );

    newBtn.textContent = "✅ Advisory Sent via SMS!";
    newBtn.style.background = "linear-gradient(135deg, #00D9FF, #0099CC)";
    if (typeof showToast === "function") {
      showToast(`📱 Advisory SMS dispatched to ${(result.recipients_count || 0).toLocaleString()} farmers · Ref: ${result.reference}`);
    }
    setTimeout(() => {
      newBtn.textContent = "🌾 Request Crop Advisory";
      newBtn.style.background = "";
      newBtn.disabled = false;
    }, 3500);
  });
}

async function initFarmerAPI() {
  // Backend API Integration - Phase 3B Farmer Advisory
  const [advisoriesData, advisoryDetail] = await Promise.all([
    fetchFromAPI("/api/farmer/advisories", FALLBACK.farmerAdvisories),
    fetchFromAPI("/api/farmer/advisory/FA-BIHAR-001", {
      advisory_id: "FA-BIHAR-001",
      ...FALLBACK.farmerAdvisories.advisories[0],
    }),
  ]);

  renderFarmerWarnings(advisoriesData.advisories || []);
  applyFarmerAdvisory(advisoryDetail);
  setupFarmerAdvisoryBtn(advisoryDetail);
}

/* ════════════════════════════════════════════════════════════════
   PHASE 3B — TREE PLANTATION PLANNER
   ════════════════════════════════════════════════════════════════ */

function renderPriorityZones(data, recData) {
  const container = document.getElementById("priority-zones");
  if (!container) return;
  container.innerHTML = "";

  const zones = data.zones || [];
  const tagMap = { critical:"CRITICAL", high:"HIGH", medium:"MEDIUM", low:"LOW" };
  const borderMap = { critical:"high", high:"medium", medium:"medium", low:"low" };

  zones.forEach(z => {
    const div = document.createElement("div");
    div.className = `pz-item ${borderMap[z.priority_level] || "medium"}`;
    div.style.cursor = "pointer";
    div.innerHTML = `
      <span class="pz-tag ${z.priority_level}">${tagMap[z.priority_level] || "MEDIUM"}</span>
      <div class="pz-title">${z.state} — ${z.district}</div>
      <div class="pz-sub">${z.heat_index}°C heat index · ${z.green_cover_percent}% green cover</div>
    `;

    div.addEventListener("click", async () => {
      const rec = await fetchFromAPI(
        `/api/plantation/recommendation/${z.id}`,
        FALLBACK.plantationRec
      );
      applyPlantationRec(rec);
      if (typeof showToast === "function") showToast(`📍 Selected: ${z.state} — ${z.district}`);
    });

    container.appendChild(div);
  });

  // Auto-load Rajasthan (PL-RAJ-001) recommendation
  if (recData) applyPlantationRec(recData);
}

function renderSpeciesList(data) {
  const container = document.getElementById("species-list");
  if (!container) return;
  container.innerHTML = "";

  const icons = ["🌿","🪴","🌳","🌲","🌵","🌾","🌴","🎋","🥭","🌲"];
  const species = data.species || [];

  species.forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "species-item";
    const benefit = Array.isArray(s.benefits) ? s.benefits.slice(0, 2).join(" · ") : (s.benefit || "");
    div.innerHTML = `
      <span class="species-icon">${icons[i] || "🌿"}</span>
      <span class="species-name">${s.name}</span>
      <span class="species-sci">${s.scientific_name}</span>
      <span class="species-benefit">${benefit}</span>
    `;
    container.appendChild(div);
  });
}

function applyPlantationRec(rec) {
  // sim-location header
  const locEl = document.getElementById("sim-location");
  if (locEl) {
    const nameEl = locEl.querySelector(".sim-loc-name");
    const subEl  = locEl.querySelector(".sim-loc-sub");
    if (nameEl) nameEl.textContent = `${rec.state} — ${rec.district}`;
    if (subEl) {
      const topSpecies = (rec.recommended_species || []).map(s => s.name).slice(0, 2).join(", ");
      subEl.textContent = `Plant ${rec.recommended_trees_count.toLocaleString()} trees · ${topSpecies}`;
    }
  }

  // Simulation metrics — uses existing .sim-metric rows in #simulation-result
  const sim = rec.environmental_simulation;
  if (!sim) return;

  const cc = rec.current_condition || {};
  const tempAfter = (cc.temperature_celsius || 44) - sim.temperature_reduction_celsius;
  const rows = document.querySelectorAll(".sim-metric");
  const metrics = [
    { before:`${cc.temperature_celsius || 44}°C`, after:`${tempAfter.toFixed(1)}°C`, delta:`−${sim.temperature_reduction_celsius}°C`, barW:`${Math.min(100, sim.temperature_reduction_celsius * 20)}%`, cls:"neon" },
    { before:`High`,  after:`${(100 - sim.flood_risk_reduction_percent).toFixed(0)}%`, delta:`−${sim.flood_risk_reduction_percent}%`, barW:`${Math.min(100, sim.flood_risk_reduction_percent * 3)}%`, cls:"cyan" },
    { before:cc.groundwater_status || "Low", after:"Moderate", delta:`+${sim.groundwater_recharge_improvement_percent}%`, barW:`${Math.min(100, sim.groundwater_recharge_improvement_percent * 2)}%`, cls:"neon" },
    { before:"32/100", after:`${32 + sim.environmental_health_score_improvement}/100`, delta:`+${sim.environmental_health_score_improvement} pts`, barW:`${Math.min(100, 32 + sim.environmental_health_score_improvement)}%`, cls:"gold" },
  ];

  rows.forEach((row, idx) => {
    if (idx >= metrics.length) return;
    const m = metrics[idx];
    const bEl = row.querySelector(".sm-before");
    const aEl = row.querySelector(".sm-after");
    const dEl = row.querySelector(".sm-delta");
    const fill = row.querySelector(".im-bar-fill");
    if (bEl) bEl.textContent = m.before;
    if (aEl) { aEl.textContent = m.after; aEl.className = `sm-after green`; }
    if (dEl) { dEl.textContent = m.delta; dEl.className = `sm-delta neon`; }
    if (fill) {
      fill.style.width = "0%";
      fill.className = `im-bar-fill ${m.cls}`;
      setTimeout(() => { fill.style.width = m.barW; }, 150);
    }
  });
}

async function initPlantationAPI() {
  // Backend API Integration - Phase 3B Tree Plantation Planner
  const [zonesData, speciesData, recData] = await Promise.all([
    fetchFromAPI("/api/plantation/priority-zones", FALLBACK.plantationZones),
    fetchFromAPI("/api/plantation/species", FALLBACK.plantationSpecies),
    fetchFromAPI("/api/plantation/recommendation/PL-RAJ-001", FALLBACK.plantationRec),
  ]);
  renderPriorityZones(zonesData, recData);
  renderSpeciesList(speciesData);
}

/* ════════════════════════════════════════════════════════════════
   PHASE 3B ORCHESTRATOR
   Hooks into app.js page switching by polling for the active page.
   Each page init is guarded so it only runs once.
   ════════════════════════════════════════════════════════════════ */

// Backend API Integration - Phase 3B All Pages
const _pageInited = { forest: false, disaster: false, farmer: false, plantation: false };

function initAllPageAPI() {
  // Watch for page visibility and init each page on first view
  // app.js shows pages by setting display:block and adding class "active"
  // We use a MutationObserver on #pages-container to catch these changes.

  const pagesContainer = document.getElementById("pages-container");
  if (!pagesContainer) return;

  function checkAndInitPage() {
    // Forest Monitor
    if (!_pageInited.forest) {
      const fp = document.getElementById("page-forest");
      if (fp && fp.classList.contains("active")) {
        _pageInited.forest = true;
        setTimeout(() => {
          initForestAPI().catch(e => console.warn("[EarthAI] Forest API error:", e));
        }, 700);
      }
    }
    // Disaster Risk
    if (!_pageInited.disaster) {
      const dp = document.getElementById("page-disaster");
      if (dp && dp.classList.contains("active")) {
        _pageInited.disaster = true;
        initDisasterAPI().catch(e => console.warn("[EarthAI] Disaster API error:", e));
      }
    }
    // Farmer Advisory
    if (!_pageInited.farmer) {
      const fp2 = document.getElementById("page-farmer");
      if (fp2 && fp2.classList.contains("active")) {
        _pageInited.farmer = true;
        initFarmerAPI().catch(e => console.warn("[EarthAI] Farmer API error:", e));
      }
    }
    // Tree Plantation Planner
    if (!_pageInited.plantation) {
      const pp = document.getElementById("page-plantation");
      if (pp && pp.classList.contains("active")) {
        _pageInited.plantation = true;
        initPlantationAPI().catch(e => console.warn("[EarthAI] Plantation API error:", e));
      }
    }
  }

  // Observe class/style changes on child pages
  const observer = new MutationObserver(checkAndInitPage);
  observer.observe(pagesContainer, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });

  // Also check immediately in case a page is already active
  checkAndInitPage();
}

/* ── DOM ready gate ────────────────────────────────────────────── */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initDashboardAPI();
    initAllPageAPI();
  });
} else {
  initDashboardAPI();
  initAllPageAPI();
}
