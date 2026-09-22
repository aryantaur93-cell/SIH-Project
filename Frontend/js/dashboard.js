/**
 * NEXTRA - Role-Specific Dashboard Renderer
 * Assembles distinct dashboards tailored to Admin, Field Officer, Logistics, and Driver.
 */

async function renderRoleDashboard(roleKey) {
    const container = document.getElementById("section-Dashboard");
    if (!container) return;

    if (roleKey === "admin") {
        container.innerHTML = getAdminDashboardHTML();
    } else if (roleKey === "field_officer") {
        container.innerHTML = getFieldOfficerDashboardHTML();
    } else if (roleKey === "logistics") {
        container.innerHTML = getLogisticsDashboardHTML();
    } else if (roleKey === "driver") {
        container.innerHTML = getDriverDashboardHTML();
    } else {
        container.innerHTML = getAdminDashboardHTML();
    }

    // Attach interactive map to the dashboard container
    attachDashboardMap();

    // Fetch and populate live KPIs and alerts from live SQLite database
    await updateDashboardLiveKPIs(roleKey);
}


// Reusable Shared Leaflet Map Container for all Role Dashboards
function getSharedMapBoxHTML(title = "🗺️ NEXTRA Live Northeast Operations Map", subtitle = "Interactive geographic GIS view of Assam, Meghalaya, Arunachal, Nagaland, Manipur, Mizoram, Tripura & Sikkim.") {
    return `
        <div class="map-box">
            <div class="map-header">
                <div class="map-title">
                    <h2>${title}</h2>
                    <p>${subtitle}</p>
                </div>

                <!-- Operational Telemetry HUD -->
                <div class="map-operational-hud">
                    <div class="hud-metric">
                        <span class="hud-metric-label">Fleet Telemetry</span>
                        <span class="hud-metric-value" id="hud-val-vehicles">-- Units</span>
                    </div>
                    <div class="hud-metric">
                        <span class="hud-metric-label">Active Drivers</span>
                        <span class="hud-metric-value" id="hud-val-drivers">-- Active</span>
                    </div>
                    <div class="hud-metric">
                        <span class="hud-metric-label">Consignments</span>
                        <span class="hud-metric-value" id="hud-val-shipments">-- Cargo</span>
                    </div>
                    <div class="hud-metric">
                        <span class="hud-metric-label">Affected Corridors</span>
                        <span class="hud-metric-value" id="hud-val-affected" style="color:#dc2626;">-- Corridors</span>
                    </div>
                    <div class="hud-metric">
                        <span class="hud-metric-label">Safety Alerts</span>
                        <span class="hud-metric-value" id="hud-val-alerts" style="color:#ea580c;">-- Active</span>
                    </div>
                </div>

                <!-- Quick State Focus Filter Chips (8 States + All NE) -->
                <div class="state-selector-bar" id="map-state-filters">
                    <button type="button" class="state-chip active" id="chip-ALL" onclick="focusState('ALL')">All NE (8 States)</button>
                    <button type="button" class="state-chip" id="chip-Assam" onclick="focusState('Assam')">Assam</button>
                    <button type="button" class="state-chip" id="chip-Arunachal-Pradesh" onclick="focusState('Arunachal Pradesh')">Arunachal</button>
                    <button type="button" class="state-chip" id="chip-Meghalaya" onclick="focusState('Meghalaya')">Meghalaya</button>
                    <button type="button" class="state-chip" id="chip-Manipur" onclick="focusState('Manipur')">Manipur</button>
                    <button type="button" class="state-chip" id="chip-Mizoram" onclick="focusState('Mizoram')">Mizoram</button>
                    <button type="button" class="state-chip" id="chip-Nagaland" onclick="focusState('Nagaland')">Nagaland</button>
                    <button type="button" class="state-chip" id="chip-Tripura" onclick="focusState('Tripura')">Tripura</button>
                    <button type="button" class="state-chip" id="chip-Sikkim" onclick="focusState('Sikkim')">Sikkim</button>
                </div>

                <!-- Multi-Parameter Fleet & GIS Filters -->
                <div class="map-filter-toolbar" id="map-filter-toolbar">
                    <div class="filter-group">
                        <label for="filter-map-state">State</label>
                        <select id="filter-map-state" class="map-filter-select" onchange="focusState(this.value)">
                            <option value="ALL">All 8 States</option>
                            <option value="Assam">Assam</option>
                            <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                            <option value="Meghalaya">Meghalaya</option>
                            <option value="Manipur">Manipur</option>
                            <option value="Mizoram">Mizoram</option>
                            <option value="Nagaland">Nagaland</option>
                            <option value="Tripura">Tripura</option>
                            <option value="Sikkim">Sikkim</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label for="filter-map-district">District</label>
                        <input type="text" id="filter-map-district" class="map-filter-input" placeholder="e.g. Kamrup, East Khasi..." oninput="applyMapFilters()">
                    </div>

                    <div class="filter-group">
                        <label for="filter-map-status">Vehicle / Driver Status</label>
                        <select id="filter-map-status" class="map-filter-select" onchange="applyMapFilters()">
                            <option value="ALL">All Statuses</option>
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="IDLE">IDLE</option>
                            <option value="DELAYED">DELAYED</option>
                            <option value="OFFLINE">OFFLINE</option>
                            <option value="MAINTENANCE">MAINTENANCE</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label for="filter-map-risk">Risk Level</label>
                        <select id="filter-map-risk" class="map-filter-select" onchange="applyMapFilters()">
                            <option value="ALL">All Risks</option>
                            <option value="LOW">LOW</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="HIGH">HIGH</option>
                            <option value="CRITICAL">CRITICAL</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label for="filter-map-driver">Search Driver / Truck / Consignment</label>
                        <input type="text" id="filter-map-driver" class="map-filter-input" placeholder="Search driver, vehicle reg, code..." oninput="applyMapFilters()">
                    </div>

                    <div class="filter-group filter-actions">
                        <button type="button" class="btn-filter-reset" onclick="resetMapFilters()" title="Clear all filters">✕ Reset</button>
                    </div>
                </div>
            </div>

            <!-- Leaflet Real Map Canvas Wrapper -->
            <div class="map-wrapper">
                <div id="ne-map"></div>

                <!-- In-Map 8 Layer Controls -->
                <div class="map-overlay-controls" id="map-overlay-controls">
                    <button type="button" class="map-control-btn active" id="btn-layer-drivers" onclick="toggleMapLayer('drivers')" title="Toggle live driver markers">
                        👤 Drivers (<span id="layer-count-drivers">--</span>)
                    </button>
                    <button type="button" class="map-control-btn active" id="btn-layer-vehicles" onclick="toggleMapLayer('vehicles')" title="Toggle live vehicle markers">
                        🚚 Vehicles (<span id="layer-count-vehicles">--</span>)
                    </button>
                    <button type="button" class="map-control-btn active" id="btn-layer-shipments" onclick="toggleMapLayer('shipments')" title="Toggle active shipments">
                        📦 Shipments (<span id="layer-count-shipments">--</span>)
                    </button>
                    <button type="button" class="map-control-btn active" id="btn-layer-reports" onclick="toggleMapLayer('reports')" title="Toggle field incident reports">
                        📋 Field Reports (<span id="layer-count-reports">--</span>)
                    </button>
                    <button type="button" class="map-control-btn active" id="btn-layer-risks" onclick="toggleMapLayer('risks')" title="Toggle risk and hazard zones">
                        ⚠️ Risk Areas (<span id="layer-count-risks">--</span>)
                    </button>
                    <button type="button" class="map-control-btn active" id="btn-layer-alerts" onclick="toggleMapLayer('alerts')" title="Toggle road safety broadcast alerts">
                        🚨 Alerts (<span id="layer-count-alerts">--</span>)
                    </button>
                    <button type="button" class="map-control-btn active" id="btn-layer-routes" onclick="toggleMapLayer('routes')" title="Toggle arterial highway corridors">
                        🛣️ Routes (<span id="layer-count-routes">--</span>)
                    </button>
                    <button type="button" class="map-control-btn active" id="btn-layer-affectedRoads" onclick="toggleMapLayer('affectedRoads')" title="Toggle blocked and high-risk corridors">
                        ⛔ Affected Roads (<span id="layer-count-affected">--</span>)
                    </button>
                    <button type="button" class="map-control-btn active" id="btn-layer-accessibility" onclick="toggleMapLayer('accessibility')" title="Toggle regional accessibility scores">
                        ♿ Access
                    </button>
                    <button type="button" class="map-control-btn" id="btn-cycle-tiles" onclick="cycleMapLayer()" title="Switch OpenStreetMap / Voyager / Dark tiles">
                        🛰️ Tiles
                    </button>
                    <button type="button" class="map-control-btn" onclick="resetMapView()" title="Reset view to whole NE region">
                        🔄 Reset
                    </button>
                </div>

                <!-- Interactive Map Side Panel (Selected Area / Entity Details) -->
                <div class="map-side-panel hidden" id="map-side-panel">
                    <div class="panel-header">
                        <div class="panel-title-group">
                            <span class="panel-eyebrow" id="panel-eyebrow">SECTOR INTELLIGENCE</span>
                            <h3 id="panel-title">Assam Sector</h3>
                        </div>
                        <button type="button" class="panel-close-btn" onclick="closeMapSidePanel()" title="Close side panel">✕</button>
                    </div>
                    <div class="panel-body" id="panel-body">
                        <!-- Populated dynamically by map.js -->
                    </div>
                </div>
            </div>

            <!-- Map Footer Strip & 8-Layer Legend -->
            <div class="map-footer-strip">
                <div class="legend-items">
                    <div class="legend-item"><span class="legend-badge" style="background:#0284c7;"></span><span>👤 Drivers</span></div>
                    <div class="legend-item"><span class="legend-badge fleet"></span><span>🚚 Vehicles</span></div>
                    <div class="legend-item"><span class="legend-badge shipment"></span><span>📦 Shipments</span></div>
                    <div class="legend-item"><span class="legend-badge report"></span><span>📋 Field Reports</span></div>
                    <div class="legend-item"><span class="legend-badge blocked"></span><span>⚠️ Risk Areas</span></div>
                    <div class="legend-item"><span class="legend-badge alert"></span><span>🚨 Alerts</span></div>
                    <div class="legend-item"><span class="legend-badge passable"></span><span>🛣️ Routes</span></div>
                    <div class="legend-item"><span class="legend-badge" style="background:#dc2626;"></span><span>⛔ Affected Roads</span></div>
                </div>
                <div class="map-meta-tags">
                    <span class="meta-tag">Leaflet + OpenStreetMap GIS</span>
                    <span class="meta-tag live-tag"><span class="live-dot"></span> Backend Live</span>
                </div>
            </div>
        </div>
    `;
}

// 1. ADMIN DASHBOARD TEMPLATE (Regional Intelligence Overview)
function getAdminDashboardHTML() {
    return `
        <!-- ADMIN OVERALL REGIONAL INTELLIGENCE DASHBOARD -->
        <div class="dashboard-header-block">
            <div class="dash-title-group">
                <span class="eyebrow">Central Command Overview · Powered by VoidX™ · All 8 States</span>
                <h2>Regional Multi-Modal Operations Intelligence</h2>
                <p class="section-lede">Real-time surveillance across Assam, Meghalaya, Arunachal Pradesh, Nagaland, Manipur, Mizoram, Tripura &amp; Sikkim.</p>
            </div>
            <div class="dash-badge-group">
                <span class="status-badge status-green">● 8 States Synchronized</span>
                <span class="status-badge status-amber">Live Corridor Risk</span>
                <span class="dashboard-data-status" id="dashboard-data-status" role="status">Loading live data...</span>
            </div>
        </div>

        <!-- 12 REGIONAL INTELLIGENCE KPI CARDS -->
        <div class="cards admin-kpi-grid">
            <div class="card" onclick="switchTab('Shipments')" style="cursor: pointer;" title="Inspect active consignments">
                <div class="card-top">
                    <h3>Active Shipments</h3>
                    <div class="card-icon blue">📦</div>
                </div>
                <p class="number mono" id="kpi-active-shipments">--</p>
                <div class="card-footer">
                    <span class="trend up-positive">Live Database</span>
                    <span class="context-text"><span id="kpi-total-shipments">--</span> Total Consignments</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Trucks')" style="cursor: pointer;" title="Inspect commercial fleet">
                <div class="card-top">
                    <h3>Available Fleet</h3>
                    <div class="card-icon green">🚛</div>
                </div>
                <p class="number mono" id="kpi-available-trucks">--</p>
                <div class="card-footer">
                    <span class="trend up-positive">Ready to Deploy</span>
                    <span class="context-text"><span id="kpi-total-vehicles">--</span> Total Vehicles</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Drivers')" style="cursor: pointer;" title="Inspect driver roster">
                <div class="card-top">
                    <h3>Active Drivers</h3>
                    <div class="card-icon green">👤</div>
                </div>
                <p class="number mono" id="kpi-active-drivers">--</p>
                <div class="card-footer">
                    <span class="trend up-positive">Hill Certified</span>
                    <span class="context-text"><span id="kpi-total-drivers">--</span> Registered Drivers</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Live-Map')" style="cursor: pointer;" title="Inspect arterial corridors">
                <div class="card-top">
                    <h3>Active Corridors</h3>
                    <div class="card-icon blue">🛣️</div>
                </div>
                <p class="number mono" id="kpi-active-routes">--</p>
                <div class="card-footer">
                    <span class="trend up-positive">Open Routes</span>
                    <span class="context-text"><span id="kpi-total-routes">--</span> Total Monitored</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Risk-Intelligence')" style="cursor: pointer;" title="Inspect regional hazard zones">
                <div class="card-top">
                    <h3>Risk Zones</h3>
                    <div class="card-icon red">⚠️</div>
                </div>
                <p class="number mono" id="kpi-risk-zones">--</p>
                <div class="card-footer">
                    <span class="trend text-danger">Active Threats</span>
                    <span class="context-text"><span id="kpi-critical-risks">--</span> Critical Hazards</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Field-Reports')" style="cursor: pointer;" title="Inspect ground incident reports">
                <div class="card-top">
                    <h3>Field Reports</h3>
                    <div class="card-icon gold">📋</div>
                </div>
                <p class="number mono" id="kpi-field-reports">--</p>
                <div class="card-footer">
                    <span class="trend info-tag">Ground Truth</span>
                    <span class="context-text">Surveillance logs</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Verification-Center')" style="cursor: pointer;" title="Inspect verification queue">
                <div class="card-top">
                    <h3>Pending Verification</h3>
                    <div class="card-icon amber">🛡️</div>
                </div>
                <p class="number mono" id="kpi-pending-verifications">--</p>
                <div class="card-footer">
                    <span class="trend text-amber">Awaiting Review</span>
                    <span class="context-text">AI confidence analyzed</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Verification-Center')" style="cursor: pointer;" title="Inspect verified evidence">
                <div class="card-top">
                    <h3>Verified Evidence</h3>
                    <div class="card-icon green">✓</div>
                </div>
                <p class="number mono" id="kpi-verified-evidence">--</p>
                <div class="card-footer">
                    <span class="trend up-positive">Confirmed</span>
                    <span class="context-text">Ground truth verified</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Road-Alerts')" style="cursor: pointer;" title="Inspect emergency broadcasts">
                <div class="card-top">
                    <h3>Safety Alerts</h3>
                    <div class="card-icon red">🚨</div>
                </div>
                <p class="number mono" id="kpi-active-alerts">--</p>
                <div class="card-footer">
                    <span class="trend text-danger">Emergency</span>
                    <span class="context-text">Broadcast advisories</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Accessibility')" style="cursor: pointer;" title="Inspect regional accessibility index">
                <div class="card-top">
                    <h3>Accessibility Score</h3>
                    <div class="card-icon blue">♿</div>
                </div>
                <p class="number mono"><span id="kpi-accessibility-score">--</span><small>/100</small></p>
                <div class="card-footer">
                    <span class="trend up-positive">Regional Average</span>
                    <span class="context-text">Topographic resilience</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Field-Officers')" style="cursor: pointer;" title="Inspect field officer roster">
                <div class="card-top">
                    <h3>Field Officers</h3>
                    <div class="card-icon purple">🔍</div>
                </div>
                <p class="number mono" id="kpi-field-officers">--</p>
                <div class="card-footer">
                    <span class="trend up-positive">BRO &amp; State Teams</span>
                    <span class="context-text">Coordinated patrol</span>
                </div>
            </div>

            <div class="card" onclick="if(typeof toggleNotificationDrawer === 'function') toggleNotificationDrawer();" style="cursor: pointer;" title="Open notifications drawer">
                <div class="card-top">
                    <h3>System Alerts</h3>
                    <div class="card-icon amber">🔔</div>
                </div>
                <p class="number mono" id="kpi-unread-notifications">--</p>
                <div class="card-footer">
                    <span class="trend text-amber">Notifications</span>
                    <span class="context-text">Click to open drawer</span>
                </div>
            </div>
        </div>

        <!-- SHARED REAL MAP + ALERT PANEL (Mounts GIS Map) -->
        <div class="content-grid" style="margin-top: 24px;">
            ${getSharedMapBoxHTML("🗺️ NEXTRA Live Northeast Operations Map", "Real-time geographic GIS view of Assam, Meghalaya, Arunachal, Nagaland, Manipur, Mizoram, Tripura &amp; Sikkim.")}

            <!-- REGIONAL LIVE ALERTS FEED -->
            <div class="alert-box">
                <div class="alert-header">
                    <h3>🚨 Real-Time Regional Hazards</h3>
                    <span class="badge badge-danger" id="dash-alerts-count-badge">Syncing...</span>
                </div>
                <div class="alert-list" id="dashboard-live-alerts-list">
                    <div style="padding: 24px 16px; text-align: center; color: var(--text-muted);">
                        <div class="spinner-sm" style="width: 22px; height: 22px; margin: 0 auto 8px; border: 2px solid rgba(0,212,170,0.2); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                        <p style="font-size: 13px;">Loading real-time regional alerts from database...</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- ADMIN EXCLUSIVE ACTIONS -->
        <div class="quick" style="margin-top: 24px;">
            <h2>⚡ Admin Operations Console</h2>
            <div class="quick-buttons">
                <button type="button" class="action-btn" onclick="switchTab('User-Management')">
                    <div class="action-icon-circle">👥</div>
                    <div class="action-text">
                        <strong>User Management</strong>
                        <span>Create, edit, activate &amp; assign roles</span>
                    </div>
                </button>
                <button type="button" class="action-btn" onclick="switchTab('Verification-Center')">
                    <div class="action-icon-circle">🛡️</div>
                    <div class="action-text">
                        <strong>Verification Center</strong>
                        <span>Review all 8-state image evidence</span>
                    </div>
                </button>
                <button type="button" class="action-btn" onclick="switchTab('Audit-Logs')">
                    <div class="action-icon-circle">📜</div>
                    <div class="action-text">
                        <strong>Security Audit Trail</strong>
                        <span>Inspect platform activity history</span>
                    </div>
                </button>
                <button type="button" class="action-btn" onclick="switchTab('Settings')">
                    <div class="action-icon-circle">⚙️</div>
                    <div class="action-text">
                        <strong>System Settings</strong>
                        <span>Regional configuration &amp; integrations</span>
                    </div>
                </button>
            </div>
        </div>
    `;
}

// 2. FIELD OFFICER DASHBOARD TEMPLATE (Assigned Sector Intelligence)
function getFieldOfficerDashboardHTML() {
    const user = typeof getActiveUser === 'function' ? getActiveUser() : null;
    const area = (user && (user.assigned_state || user.assigned_area)) ? (user.assigned_state || user.assigned_area) : "Assam";

    return `
        <!-- FIELD OFFICER SECTOR DASHBOARD -->
        <div class="dashboard-header-block">
            <div class="dash-title-group">
                <span class="eyebrow" id="fo-sector-subtitle">Assigned Jurisdiction · VoidX™ Ground Truth · ${area} Sector</span>
                <h2 id="fo-sector-title">${area} Sector Intelligence Console</h2>
                <p class="section-lede">Operational oversight for mountain corridors, BRO taskforce coordination, and ground truth photo verification.</p>
            </div>
            <div class="dash-badge-group">
                <span class="status-badge status-amber">Patrol Duty: Active</span>
                <span class="status-badge status-green" id="fo-status-badge">${area} Grid Online</span>
                <span class="dashboard-data-status" id="dashboard-data-status" role="status">Loading live data...</span>
            </div>
        </div>

        <!-- 8 SECTOR INTELLIGENCE KPI CARDS -->
        <div class="cards field-kpi-grid">
            <div class="card" onclick="focusState('${area}')" style="cursor: pointer;" title="Focus GIS on assigned sector">
                <div class="card-top">
                    <h3>Sector Hazard Zones</h3>
                    <div class="card-icon red">⚠️</div>
                </div>
                <p class="number mono" id="kpi-fo-risk-zones">--</p>
                <div class="card-footer">
                    <span class="trend text-danger">Active Threats</span>
                    <span class="context-text">Sector hazards</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Field-Reports')" style="cursor: pointer;" title="Inspect corridor passability">
                <div class="card-top">
                    <h3>Road Passability</h3>
                    <div class="card-icon amber">🚧</div>
                </div>
                <p class="number mono" id="kpi-fo-road-condition" style="font-size: 20px; line-height: 1.4;">--</p>
                <div class="card-footer">
                    <span class="trend text-amber">Telemetry Status</span>
                    <span class="context-text">Live corridor telemetry</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Verification-Center')" style="cursor: pointer;" title="Inspect sector verification queue">
                <div class="card-top">
                    <h3>Pending Area Review</h3>
                    <div class="card-icon green">🛡️</div>
                </div>
                <p class="number mono" id="kpi-fo-pending-verifications">--</p>
                <div class="card-footer">
                    <span class="trend text-amber" id="kpi-fo-pending-footer">Photos Awaiting Review</span>
                    <span class="context-text">Ground confirmation required</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Field-Reports')" style="cursor: pointer;" title="Inspect sector reports">
                <div class="card-top">
                    <h3>Sector Field Reports</h3>
                    <div class="card-icon gold">📋</div>
                </div>
                <p class="number mono" id="kpi-fo-reports">--</p>
                <div class="card-footer">
                    <span class="trend info-tag">Ground Logs</span>
                    <span class="context-text">Incident observations</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Logistics')" style="cursor: pointer;" title="Inspect consignments in sector">
                <div class="card-top">
                    <h3>Sector Shipments</h3>
                    <div class="card-icon blue">📦</div>
                </div>
                <p class="number mono" id="kpi-fo-shipments">--</p>
                <div class="card-footer">
                    <span class="trend up-positive">Sector Freight</span>
                    <span class="context-text">Active cargo in transit</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Trucks')" style="cursor: pointer;" title="Inspect fleet operating in sector">
                <div class="card-top">
                    <h3>Fleet in Sector</h3>
                    <div class="card-icon green">🚛</div>
                </div>
                <p class="number mono" id="kpi-fo-vehicles">--</p>
                <div class="card-footer">
                    <span class="trend up-positive">Commercial Fleet</span>
                    <span class="context-text">Tracked vehicles</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Road-Alerts')" style="cursor: pointer;" title="Inspect sector alerts">
                <div class="card-top">
                    <h3>Sector Alerts</h3>
                    <div class="card-icon red">🚨</div>
                </div>
                <p class="number mono" id="kpi-fo-alerts">--</p>
                <div class="card-footer">
                    <span class="trend text-danger">Broadcasts</span>
                    <span class="context-text">Local hazard warnings</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Accessibility')" style="cursor: pointer;" title="Inspect terrain accessibility">
                <div class="card-top">
                    <h3>Sector Accessibility</h3>
                    <div class="card-icon blue">♿</div>
                </div>
                <p class="number mono" id="kpi-fo-accessibility">--<small>/100</small></p>
                <div class="card-footer">
                    <span class="trend text-amber">Topographic Index</span>
                    <span class="context-text">Regional resilience</span>
                </div>
            </div>
        </div>

        <!-- SECTOR MAP & LOCAL ALERTS -->
        <div class="content-grid" style="margin-top: 24px;">
            ${getSharedMapBoxHTML("🗺️ " + area + " Sector Geographic Map", "Real-time telemetry focused on " + area + " arterial passes and highway corridors.")}

            <div class="alert-box">
                <div class="alert-header">
                    <h3>📍 Sector Alerts</h3>
                    <span class="badge badge-danger" id="dash-fo-alerts-count-badge">Syncing...</span>
                </div>
                <div class="alert-list" id="dashboard-fo-alerts-list">
                    <div style="padding: 24px 16px; text-align: center; color: var(--text-muted);">
                        <div class="spinner-sm" style="width: 20px; height: 20px; margin: 0 auto 8px; border: 2px solid rgba(0,212,170,0.2); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                        <p style="font-size: 13px;">Loading real-time sector alerts from database...</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- FIELD OFFICER QUICK ACTIONS -->
        <div class="quick" style="margin-top: 24px;">
            <h2>⚡ Field Officer Ground Actions</h2>
            <div class="quick-buttons">
                <button type="button" class="action-btn" onclick="switchTab('Field-Reports')">
                    <div class="action-icon-circle">📋</div>
                    <div class="action-text">
                        <strong>Create Field Report</strong>
                        <span>Submit ground truth with GPS &amp; observations</span>
                    </div>
                </button>
                <button type="button" class="action-btn" onclick="switchTab('Verification-Center')">
                    <div class="action-icon-circle">🛡️</div>
                    <div class="action-text">
                        <strong>Verify Uploaded Photos</strong>
                        <span>Approve or reject road hazard evidence</span>
                    </div>
                </button>
                <button type="button" class="action-btn" onclick="switchTab('Area-Intelligence')">
                    <div class="action-icon-circle">📍</div>
                    <div class="action-text">
                        <strong>Area Infrastructure Status</strong>
                        <span>Bridge loads, slope stability &amp; weather</span>
                    </div>
                </button>
            </div>
        </div>
    `;
}

// 3. LOGISTICS DASHBOARD TEMPLATE (Transportation & Fleet Focus)
function getLogisticsDashboardHTML() {
    return `
        <!-- LOGISTICS FREIGHT OPERATIONS DASHBOARD -->
        <div class="dashboard-header-block">
            <div class="dash-title-group">
                <span class="eyebrow">Freight Dispatch Grid · VoidX™ Logistics Engine</span>
                <h2>NEXTRA Multi-Modal Transport Management</h2>
                <p class="section-lede">Real-time consignment dispatching, vehicle matching, mountain route optimization, and delay mitigation.</p>
            </div>
            <div class="dash-badge-group">
                <button type="button" class="btn-primary-large" onclick="switchTab('Transport-Requests')" style="padding: 8px 14px; font-size: 12px;">+ Create Transport Request</button>
                <span class="dashboard-data-status" id="dashboard-data-status" role="status">Loading live data...</span>
            </div>
        </div>

        <!-- 8 LOGISTICS KPI CARDS -->
        <div class="cards logistics-kpi-grid">
            <div class="card" onclick="switchTab('Shipments')" style="cursor: pointer;" title="Inspect active consignments">
                <div class="card-top">
                    <h3>Active Shipments</h3>
                    <div class="card-icon blue">📦</div>
                </div>
                <p class="number mono" id="kpi-log-active-shipments">--</p>
                <div class="card-footer">
                    <span class="trend up-positive">Live Database</span>
                    <span class="context-text"><span id="kpi-log-total-shipments">--</span> Total Consignments</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Shipments')" style="cursor: pointer;" title="Inspect delayed shipments">
                <div class="card-top">
                    <h3>Delayed Shipments</h3>
                    <div class="card-icon red">⏱️</div>
                </div>
                <p class="number mono" id="kpi-log-delayed-shipments">--</p>
                <div class="card-footer">
                    <span class="trend text-danger">Critical Delays</span>
                    <span class="context-text">Action required</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Transport-Requests')" style="cursor: pointer;" title="Inspect transport requests">
                <div class="card-top">
                    <h3>Pending Requests</h3>
                    <div class="card-icon amber">📑</div>
                </div>
                <p class="number mono" id="kpi-log-pending-requests">--</p>
                <div class="card-footer">
                    <span class="trend text-amber">Awaiting Match</span>
                    <span class="context-text">AI truck assignment</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Trucks')" style="cursor: pointer;" title="Inspect available fleet">
                <div class="card-top">
                    <h3>Available Trucks</h3>
                    <div class="card-icon green">🚛</div>
                </div>
                <p class="number mono" id="kpi-log-available-trucks">--</p>
                <div class="card-footer">
                    <span class="trend up-positive">Ready to Deploy</span>
                    <span class="context-text"><span id="kpi-log-total-vehicles">--</span> Total Fleet</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Drivers')" style="cursor: pointer;" title="Inspect driver roster">
                <div class="card-top">
                    <h3>Available Drivers</h3>
                    <div class="card-icon green">👤</div>
                </div>
                <p class="number mono" id="kpi-log-available-drivers">--</p>
                <div class="card-footer">
                    <span class="trend up-positive">Standby for Dispatch</span>
                    <span class="context-text"><span id="kpi-log-total-drivers">--</span> Total Drivers</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Live-Map')" style="cursor: pointer;" title="Inspect arterial corridors">
                <div class="card-top">
                    <h3>Supply Corridors</h3>
                    <div class="card-icon blue">🛣️</div>
                </div>
                <p class="number mono" id="kpi-log-active-routes">--</p>
                <div class="card-footer">
                    <span class="trend up-positive">Open Arterials</span>
                    <span class="context-text"><span id="kpi-log-total-routes">--</span> Total Corridors</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Risk-Intelligence')" style="cursor: pointer;" title="Inspect route hazards">
                <div class="card-top">
                    <h3>Critical Route Risks</h3>
                    <div class="card-icon red">⚠️</div>
                </div>
                <p class="number mono" id="kpi-log-critical-risks">--</p>
                <div class="card-footer">
                    <span class="trend text-danger">Severe Hazards</span>
                    <span class="context-text">Landslides &amp; Floods</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Road-Alerts')" style="cursor: pointer;" title="Inspect regional hazard alerts">
                <div class="card-top">
                    <h3>Regional Alerts</h3>
                    <div class="card-icon amber">🚨</div>
                </div>
                <p class="number mono" id="kpi-log-active-alerts">--</p>
                <div class="card-footer">
                    <span class="trend text-amber">Active Warnings</span>
                    <span class="context-text">Road advisories</span>
                </div>
            </div>
        </div>

        <!-- FREIGHT MAP & ACTIVE DISPATCH TABLE -->
        <div class="content-grid" style="margin-top: 24px;">
            ${getSharedMapBoxHTML("🗺️ Active Freight Corridors &amp; Telemetry", "Real-time vehicle GPS positions and primary mountain supply lines.")}

            <!-- RECENT TRANSPORTATION REQUESTS QUEUE -->
            <div class="alert-box">
                <div class="alert-header">
                    <h3>📦 Recent Transportation Requests</h3>
                    <button class="action-btn-sm" onclick="switchTab('Transport-Requests')">View All →</button>
                </div>
                <div class="alert-list" id="logistics-requests-preview">
                    <div style="padding: 24px 16px; text-align: center; color: var(--text-muted);">
                        <div class="spinner-sm" style="width: 20px; height: 20px; margin: 0 auto 8px; border: 2px solid rgba(0,212,170,0.2); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                        <p style="font-size: 13px;">Loading live transportation requests from database...</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- LOGISTICS QUICK ACTIONS -->
        <div class="quick" style="margin-top: 24px;">
            <h2>⚡ Logistics Quick Actions</h2>
            <div class="quick-buttons">
                <button type="button" class="action-btn" onclick="switchTab('Transport-Requests')">
                    <div class="action-icon-circle">📦</div>
                    <div class="action-text">
                        <strong>New Transport Request</strong>
                        <span>Book freight, specify cargo &amp; match trucks</span>
                    </div>
                </button>
                <button type="button" class="action-btn" onclick="switchTab('Live-Map')">
                    <div class="action-icon-circle">🗺️</div>
                    <div class="action-text">
                        <strong>Live Route Map</strong>
                        <span>Inspect live corridors and real-time mountain terrain</span>
                    </div>
                </button>
                <button type="button" class="action-btn" onclick="switchTab('Shipments')">
                    <div class="action-icon-circle">🚚</div>
                    <div class="action-text">
                        <strong>Shipment Telemetry</strong>
                        <span>Inspect delivery progress and live ETA</span>
                    </div>
                </button>
            </div>
        </div>
    `;
}

// 4. DRIVER DASHBOARD TEMPLATE (In-Cab Real-Time Cockpit)
function getDriverDashboardHTML() {
    return `
        <!-- DRIVER IN-CAB COCKPIT DASHBOARD -->
        <div class="driver-cockpit-banner">
            <div class="cockpit-left">
                <span class="eyebrow dark-eyebrow" id="driver-cockpit-eyebrow" style="color: #6ee7b7;">COMMERCIAL VEHICLE IN-CAB COCKPIT · POWERED BY VOIDX™</span>
                <h2 id="driver-cockpit-route-title">Active Route: Querying Assigned Consignment...</h2>
                <p id="driver-cockpit-consignment">Consignment: Checking dispatch assignment with logistics hub...</p>
                <span class="dashboard-data-status dashboard-data-status-dark" id="dashboard-data-status" role="status">Loading live data...</span>
            </div>
            <div class="cockpit-right">
                <div class="cockpit-speed-badge">
                    <span class="speed-val mono" id="driver-cockpit-speed">--</span>
                    <span class="speed-unit">km/h</span>
                </div>
                <div class="cockpit-temp-badge">
                    <span class="temp-val mono" id="driver-cockpit-cargo-temp">--</span>
                    <span class="temp-unit">Cargo Temp</span>
                </div>
            </div>
        </div>

        <!-- DRIVER 6-GAUGE REAL-TIME STATUS ROW -->
        <div class="cards driver-kpi-grid" style="margin-top: 20px;">
            <div class="card" onclick="switchTab('My-Route')" style="cursor: pointer;" title="Inspect turn-by-turn route navigation">
                <div class="card-top">
                    <h3>Remaining Distance</h3>
                    <div class="card-icon blue">🧭</div>
                </div>
                <p class="number mono" id="kpi-driver-distance">-- <small>km</small></p>
                <div class="card-footer">
                    <span class="trend up-positive">Target Corridor</span>
                    <span class="context-text">Live telemetry tracking</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Road-Alerts')" style="cursor: pointer;" title="Inspect corridor hazards">
                <div class="card-top">
                    <h3>Road Condition Ahead</h3>
                    <div class="card-icon amber">🚧</div>
                </div>
                <p class="number mono" id="kpi-driver-road-condition" style="font-size: 18px; color: #f59e0b;">CHECKING...</p>
                <div class="card-footer">
                    <span class="trend text-amber">Real-Time Hazards</span>
                    <span class="context-text">Speed limit advisory</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Weather')" style="cursor: pointer;" title="Inspect mountain weather radar">
                <div class="card-top">
                    <h3>Weather Radar</h3>
                    <div class="card-icon blue">🌧️</div>
                </div>
                <p class="number mono" id="kpi-driver-weather">--°C</p>
                <div class="card-footer">
                    <span class="trend text-amber">Mountain Sensor</span>
                    <span class="context-text">Live telemetry reading</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Nearby-Drivers')" style="cursor: pointer;" title="Inspect nearby commercial vehicles">
                <div class="card-top">
                    <h3>Nearby Drivers</h3>
                    <div class="card-icon green">📡</div>
                </div>
                <p class="number mono" id="kpi-driver-nearby">-- <small>Vehicles</small></p>
                <div class="card-footer">
                    <span class="trend up-positive">Radio Link</span>
                    <span class="context-text">Nearby commercial convoys</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Area-Field-Officer')" style="cursor: pointer;" title="Contact assigned sector field officer">
                <div class="card-top">
                    <h3>Area Field Officer</h3>
                    <div class="card-icon purple">👮</div>
                </div>
                <p class="number mono" id="kpi-driver-officer-name" style="font-size: 17px;">--</p>
                <div class="card-footer">
                    <span class="trend up-positive">BRO Ground Officer</span>
                    <span class="context-text" id="kpi-driver-officer-phone">Emergency Dispatch</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Report-Issue')" style="cursor: pointer; border: 1px dashed var(--primary); background: #f0fdf4;" title="Report road hazard with photo evidence">
                <div class="card-top">
                    <h3 style="color: var(--primary);">Report Road Hazard</h3>
                    <div class="card-icon green">📷</div>
                </div>
                <p class="number mono" style="font-size: 17px; color: var(--primary);">+ Photo Evidence</p>
                <div class="card-footer">
                    <span class="trend up-positive">One-Touch Submit</span>
                    <span class="context-text">Alerts dispatch &amp; BRO</span>
                </div>
            </div>
        </div>

        <!-- DRIVER ROAD MAP & INCIDENTS -->
        <div class="content-grid" style="margin-top: 24px;">
            ${getSharedMapBoxHTML("🗺️ Driver Highway Navigation", "Real-time vehicle GPS, terrain elevation, and hazards along your active route.")}

            <div class="alert-box">
                <div class="alert-header">
                    <h3>🚨 Route Safety Alerts</h3>
                    <span class="badge badge-danger">Live</span>
                </div>
                <div class="alert-list" id="driver-route-alerts-list">
                    <div style="padding: 24px 16px; text-align: center; color: var(--text-muted);">
                        <div class="spinner-sm" style="width: 20px; height: 20px; margin: 0 auto 8px; border: 2px solid rgba(0,212,170,0.2); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                        <p style="font-size: 13px;">Fetching highway alerts along corridor...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Updates all Role Dashboards with live data from SQLite via NextraDashboard and other live APIs
async function updateDashboardLiveKPIs(roleKey) {
    const statusEl = document.getElementById("dashboard-data-status");
    const setDashboardStatus = (state, message) => {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.dataset.state = state;
    };

    setDashboardStatus("loading", "Loading live data...");

    try {
        const summary = (typeof NextraDashboard !== "undefined" && typeof NextraDashboard.getSummary === "function")
            ? await NextraDashboard.getSummary()
            : null;

        if (!summary) {
            throw new Error("Dashboard summary unavailable");
        }

        const setNum = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = (val !== undefined && val !== null) ? val : "--";
        };

        const setHTML = (id, html) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = html;
        };

        if (summary) {
            // Populate HUD counters immediately from live summary data
            const hudFleet = document.getElementById("hud-val-vehicles");
            const hudDrivers = document.getElementById("hud-val-drivers");
            const hudCargo = document.getElementById("hud-val-shipments");
            const hudAffected = document.getElementById("hud-val-affected");
            const hudAlerts = document.getElementById("hud-val-alerts");
            if (hudFleet && summary.total_vehicles != null) hudFleet.textContent = `${summary.total_vehicles} Units`;
            if (hudDrivers && summary.active_drivers != null) hudDrivers.textContent = `${summary.active_drivers} Active`;
            if (hudCargo && summary.active_shipments != null) hudCargo.textContent = `${summary.active_shipments} Cargo`;
            if (hudAffected && summary.critical_risks != null) hudAffected.textContent = `${summary.critical_risks} Corridors`;
            if (hudAlerts && summary.active_alerts != null) hudAlerts.textContent = `${summary.active_alerts} Active`;

            if (roleKey === "admin") {
                setNum("kpi-active-shipments", summary.active_shipments);
                setNum("kpi-total-shipments", summary.total_shipments);
                setNum("kpi-active-drivers", summary.active_drivers);
                setNum("kpi-total-drivers", summary.total_drivers);
                setNum("kpi-available-trucks", summary.available_vehicles);
                setNum("kpi-total-vehicles", summary.total_vehicles);
                setNum("kpi-active-routes", summary.active_routes != null ? summary.active_routes : "--");
                setNum("kpi-total-routes", summary.total_routes != null ? summary.total_routes : "--");
                setNum("kpi-risk-zones", summary.risk_zones);
                setNum("kpi-critical-risks", summary.critical_risks);
                setNum("kpi-field-reports", summary.total_reports);
                setNum("kpi-pending-verifications", summary.pending_verifications);
                setNum("kpi-verified-evidence", summary.verified_count);
                setNum("kpi-active-alerts", summary.active_alerts);
                setNum("kpi-accessibility-score", summary.accessibility_score != null ? Math.round(summary.accessibility_score) : "--");
                setNum("kpi-field-officers", summary.total_field_officers);
                setNum("kpi-unread-notifications", summary.unread_notifications);
            } else if (roleKey === "field_officer") {
                const user = typeof getActiveUser === "function" ? getActiveUser() : null;
                const area = (user && (user.assigned_state || user.assigned_area)) ? (user.assigned_state || user.assigned_area) : (summary.assigned_area || "Assam");

                setNum("kpi-fo-risk-zones", summary.area_risks);
                setNum("kpi-fo-pending-verifications", summary.area_pending_verifications);
                setNum("kpi-fo-reports", summary.area_reports);
                setNum("kpi-fo-shipments", summary.area_shipments);
                setNum("kpi-fo-vehicles", summary.area_vehicles);
                setNum("kpi-fo-alerts", summary.area_alerts);
                const foAccess = summary.area_accessibility != null ? summary.area_accessibility : summary.accessibility_score;
                setHTML("kpi-fo-accessibility", `${foAccess != null ? Math.round(foAccess) : "--"}<small>/100</small>`);

                const footerEl = document.getElementById("kpi-fo-pending-footer");
                if (footerEl) footerEl.textContent = `${summary.area_pending_verifications || 0} Photos Awaiting Your Approval`;

                const isRestricted = summary.area_road_status && (summary.area_road_status.includes("BLOCKED") || summary.area_road_status.includes("RESTRICTED"));
                setHTML("kpi-fo-road-condition", isRestricted ? `<span style="color:#ef4444; font-weight:700;">RESTRICTED</span>` : `<span style="color:#10b981; font-weight:700;">PASSABLE</span>`);

                // Ensure title and subtitle accurately reflect officer's assigned sector
                const titleEl = document.getElementById("fo-sector-title");
                if (titleEl) titleEl.textContent = `${area} Sector Intelligence Console`;
                const subEl = document.getElementById("fo-sector-subtitle");
                if (subEl) subEl.textContent = `Assigned Jurisdiction · VoidX™ Ground Truth · ${area} Sector`;
                const badgeEl = document.getElementById("fo-status-badge");
                if (badgeEl) badgeEl.textContent = `${area} Grid Online`;
            } else if (roleKey === "logistics") {
                setNum("kpi-log-active-shipments", summary.active_shipments);
                setNum("kpi-log-total-shipments", summary.total_shipments);
                setNum("kpi-log-delayed-shipments", summary.delayed_shipments);
                setNum("kpi-log-pending-requests", summary.pending_transport_requests);
                setNum("kpi-log-available-trucks", summary.available_vehicles);
                setNum("kpi-log-total-vehicles", summary.total_vehicles);
                setNum("kpi-log-available-drivers", summary.available_drivers);
                setNum("kpi-log-total-drivers", summary.total_drivers);
                setNum("kpi-log-active-routes", summary.active_routes != null ? summary.active_routes : "--");
                setNum("kpi-log-total-routes", summary.total_routes != null ? summary.total_routes : "--");
                setNum("kpi-log-critical-risks", summary.critical_risks);
                setNum("kpi-log-active-alerts", summary.active_alerts);

                try {
                    if (typeof NextraTransportRequests !== "undefined" && typeof NextraTransportRequests.getAll === "function") {
                        const reqs = await NextraTransportRequests.getAll();
                        const previewEl = document.getElementById("logistics-requests-preview");
                        if (previewEl) {
                            if (!Array.isArray(reqs) || reqs.length === 0) {
                                previewEl.innerHTML = `
                                    <div style="padding: 24px 16px; text-align: center; color: var(--text-muted);">
                                        <div style="font-size: 24px; margin-bottom: 6px;">📦</div>
                                        <strong style="color: var(--text-main); font-size: 13px;">No Pending Transportation Requests</strong>
                                        <p style="font-size: 12px; margin-top: 4px;">All freight orders have been matched or delivered.</p>
                                    </div>
                                `;
                            } else {
                                previewEl.innerHTML = reqs.slice(0, 4).map(r => `
                                    <div class="alert-item risk-low" style="border-left-color: var(--primary); cursor:pointer;" onclick="switchTab('Transport-Requests')">
                                        <div class="alert-item-top">
                                            <strong>${r.cargo_type || 'Cargo'} (${r.cargo_weight_kg || r.weight_kg || r.weight || 0} kg)</strong>
                                            <span class="status-badge ${r.status === 'MATCHED' || r.status === 'ASSIGNED' || r.status === 'COMPLETED' ? 'status-green' : (r.status === 'CANCELLED' ? 'status-red' : 'status-amber')}">${r.status}</span>
                                        </div>
                                        <p>${r.pickup_location || r.pickup || 'Pickup'} → ${r.destination || 'Destination'}</p>
                                        <div class="alert-item-footer">
                                            <span>${r.matched_vehicle_registration || r.matched_truck || r.vehicle_type || 'Awaiting Allocation'}</span>
                                            <span class="alert-view-btn">Inspect →</span>
                                        </div>
                                    </div>
                                `).join('');
                            }
                        }
                    }
                } catch (e) {
                    console.warn("[Dashboard] Error loading logistics requests preview:", e);
                    const previewEl = document.getElementById("logistics-requests-preview");
                    if (previewEl) {
                        previewEl.innerHTML = `<p style="padding:15px; color:var(--text-muted);">No pending freight requests found.</p>`;
                    }
                }
            } else if (roleKey === "driver") {
                let assignment = null;
                try {
                    if (typeof NextraShipments !== "undefined" && typeof NextraShipments.getMyAssignment === "function") {
                        assignment = await NextraShipments.getMyAssignment();
                    }
                    if (assignment) {
                        setHTML("driver-cockpit-route-title", `Active Route: ${assignment.origin} → ${assignment.destination}`);
                        setHTML("driver-cockpit-consignment", `Consignment: ${assignment.cargo_type || 'General Freight'} · Priority: ${assignment.priority || 'NORMAL'} · Target ETA: ${assignment.eta || 'On Schedule'}`);
                        const distVal = assignment.distance_km != null ? assignment.distance_km : '--';
                        setHTML("kpi-driver-distance", `${distVal} <small>km</small>`);
                        setNum("driver-cockpit-speed", assignment.speed_kmh != null ? Math.round(assignment.speed_kmh) : 0);
                        setNum("driver-cockpit-cargo-temp", assignment.temperature_celsius || 'Optimal');
                    } else {
                        setHTML("driver-cockpit-route-title", `Standby: No Active Consignment Dispatched`);
                        setHTML("driver-cockpit-consignment", `Vehicle status: AVAILABLE · Ready for dispatch across Northeast mountain corridors`);
                        setHTML("kpi-driver-distance", `0 <small>km</small>`);
                        setNum("driver-cockpit-speed", "0");
                        setNum("driver-cockpit-cargo-temp", "Ambient");
                    }
                } catch (e) {
                    console.warn("[Dashboard] Error loading driver assignment:", e);
                }

                try {
                    if (typeof NextraWeather !== "undefined" && typeof NextraWeather.getAll === "function") {
                        const weatherReports = await NextraWeather.getAll();
                        if (Array.isArray(weatherReports) && weatherReports.length > 0) {
                            const dest = (assignment && (assignment.destination || assignment.origin)) || "Assam";
                            const matchedWeather = weatherReports.find(w => dest.toLowerCase().includes((w.state || "").toLowerCase())) || weatherReports[0];
                            const temp = (matchedWeather && matchedWeather.temperature != null) ? matchedWeather.temperature : "--";
                            setHTML("kpi-driver-weather", `${temp}°C`);
                        }
                    }
                } catch (_) {}

                try {
                    if (typeof NextraUsers !== "undefined" && typeof NextraUsers.getFieldOfficers === "function") {
                        const officers = await NextraUsers.getFieldOfficers();
                        if (Array.isArray(officers) && officers.length > 0) {
                            const dest = (assignment && (assignment.destination || assignment.origin)) || "Assam";
                            const matchedOfficer = officers.find(o => dest.toLowerCase().includes((o.assigned_state || "").toLowerCase())) || officers[0];
                            setNum("kpi-driver-officer-name", matchedOfficer.name || matchedOfficer.full_name || "--");
                            setNum("kpi-driver-officer-phone", matchedOfficer.phone || "Emergency Patrol");
                        } else {
                            setNum("kpi-driver-officer-name", "--");
                            setNum("kpi-driver-officer-phone", "Unassigned");
                        }
                    }
                } catch (_) {}

                try {
                    if (typeof NextraDrivers !== "undefined" && typeof NextraDrivers.getAll === "function") {
                        const allDrivers = await NextraDrivers.getAll();
                        if (Array.isArray(allDrivers)) {
                            const activeInSector = allDrivers.filter(d => d.status === "ACTIVE" || d.status === "DRIVING");
                            const count = activeInSector.length > 0 ? activeInSector.length : allDrivers.length;
                            setHTML("kpi-driver-nearby", `${count} <small>Vehicles</small>`);
                        }
                    }
                } catch (_) {}

                try {
                    if (typeof NextraAlerts !== "undefined" && typeof NextraAlerts.getAll === "function") {
                        const alerts = await NextraAlerts.getAll();
                        const alertsEl = document.getElementById("driver-route-alerts-list");
                        if (alertsEl) {
                            if (!Array.isArray(alerts) || alerts.length === 0) {
                                alertsEl.innerHTML = `
                                    <div style="padding: 20px 16px; text-align: center; color: var(--text-muted);">
                                        <div style="font-size: 20px; margin-bottom: 4px;">🟢</div>
                                        <strong style="color: var(--text-main); font-size: 13px;">Corridor All Clear</strong>
                                        <p style="font-size: 12px; margin-top: 2px;">Zero active emergency hazards reported along your route.</p>
                                    </div>
                                `;
                                setHTML("kpi-driver-road-condition", `<span style="color:#10b981; font-weight:700;">ALL CLEAR</span>`);
                            } else {
                                const crit = alerts.some(a => a.severity === "CRITICAL");
                                setHTML("kpi-driver-road-condition", crit ? `<span style="color:#ef4444; font-weight:700;">HAZARD AHEAD</span>` : `<span style="color:#f59e0b; font-weight:700;">CAUTION</span>`);
                                alertsEl.innerHTML = alerts.slice(0, 3).map(a => `
                                    <div class="alert-item ${a.severity === 'CRITICAL' ? 'risk-critical' : 'risk-medium'}" onclick="panToAlert(${a.latitude || 26.14}, ${a.longitude || 91.73}, '${(a.title || '').replace(/'/g, "\\'")}', ${a.id})" style="cursor: pointer;" title="Inspect on GIS Map">
                                        <div class="alert-item-top">
                                            <strong>${a.title}</strong>
                                            <span class="alert-severity-badge">${a.severity}</span>
                                        </div>
                                        <p>${a.description || a.message || 'Safety advisory'}</p>
                                    </div>
                                `).join('');
                            }
                        }
                    }
                } catch (_) {}
            }
        }
        setDashboardStatus("ready", "Live data synced");
    } catch (err) {
        setDashboardStatus("error", "Live data unavailable");
        console.warn("[Dashboard] Error updating live KPIs:", err);
    }
}


// Re-attaches Leaflet Map to the newly rendered Dashboard map container
function attachDashboardMap() {
    setTimeout(() => {
        const mapEl = document.getElementById("ne-map");
        if (!mapEl) return;

        // If map was previously initialized on another container, cleanly remove it first
        if (typeof map !== 'undefined' && map) {
            try {
                map.remove();
            } catch (e) {
                console.warn("Leaflet cleanup:", e);
            }
            map = null;
        }

        if (typeof initLeafletMap === 'function') {
            initLeafletMap();
            const user = typeof getActiveUser === 'function' ? getActiveUser() : null;
            const area = (user && (user.assigned_state || user.assigned_area)) ? (user.assigned_state || user.assigned_area) : "Assam";
            if (user && user.role === 'field_officer' && area && typeof focusState === 'function') {
                setTimeout(() => {
                    focusState(area);
                }, 400);
            }
        }

        // Connect dynamic regional alerts
        loadDashboardLiveAlerts();
    }, 150);
}

// Dynamically populates dashboard alerts box with real database alerts
async function loadDashboardLiveAlerts() {
    const adminList = document.getElementById("dashboard-live-alerts-list");
    const adminBadge = document.getElementById("dash-alerts-count-badge");
    const foList = document.getElementById("dashboard-fo-alerts-list");
    const foBadge = document.getElementById("dash-fo-alerts-count-badge");

    try {
        if (typeof NextraAlerts === "undefined" || typeof NextraAlerts.getAll !== "function") return;
        const alerts = await NextraAlerts.getAll();

        // Admin dashboard alerts feed
        if (adminList) {
            if (!Array.isArray(alerts) || alerts.length === 0) {
                if (adminBadge) {
                    adminBadge.textContent = "0 Active";
                    adminBadge.className = "badge status-green";
                }
                adminList.innerHTML = `
                    <div style="padding: 24px 16px; text-align: center; color: var(--text-muted);">
                        <div style="font-size: 24px; margin-bottom: 6px;">🛡️</div>
                        <strong style="color: var(--text-main); font-size: 14px;">No Active Regional Hazards</strong>
                        <p style="font-size: 12px; margin-top: 4px;">All 8 North Eastern arterial corridors report normal passage.</p>
                    </div>
                `;
            } else {
                if (adminBadge) {
                    adminBadge.textContent = `${alerts.length} Active`;
                    adminBadge.className = "badge badge-danger";
                }
                adminList.innerHTML = alerts.slice(0, 5).map(a => {
                    const isCritical = (a.severity === "CRITICAL");
                    const isHigh = (a.severity === "HIGH");
                    const riskClass = isCritical ? "risk-critical" : isHigh ? "risk-high" : "risk-medium";
                    const lat = a.latitude || 26.14;
                    const lng = a.longitude || 91.73;
                    const msg = a.description || a.message || "Hazard broadcast";
                    return `
                        <div class="alert-item ${riskClass}" onclick="panToAlert(${lat}, ${lng}, '${(a.title || '').replace(/'/g, "\\'")}', ${a.id})" style="cursor: pointer;" title="Inspect on GIS Map">
                            <div class="alert-item-top">
                                <strong>${a.title}</strong>
                                <span class="alert-severity-badge">${a.severity || 'Caution'}</span>
                            </div>
                            <p>${msg}</p>
                            <div class="alert-item-footer">
                                <span>${a.state || 'Northeast'} · ${a.district || 'Corridor'}</span>
                                <span class="alert-view-btn alert-locate-btn">Locate 🗺️</span>
                            </div>
                        </div>
                    `;
                }).join("");
            }
        }

        // Field Officer dashboard alerts feed
        if (foList) {
            const user = typeof getActiveUser === "function" ? getActiveUser() : null;
            const area = (user && (user.assigned_state || user.assigned_area)) ? (user.assigned_state || user.assigned_area).toLowerCase() : "assam";
            const filtered = (Array.isArray(alerts) && area)
                ? alerts.filter(a => (a.state || "").toLowerCase().includes(area) || area.includes((a.state || "").toLowerCase()))
                : (alerts || []);

            if (filtered.length === 0) {
                if (foBadge) {
                    foBadge.textContent = "0 Active";
                    foBadge.className = "badge status-green";
                }
                foList.innerHTML = `
                    <div style="padding: 24px 16px; text-align: center; color: var(--text-muted);">
                        <div style="font-size: 22px; margin-bottom: 6px;">🟢</div>
                        <strong style="color: var(--text-main); font-size: 13px;">Sector All Clear</strong>
                        <p style="font-size: 12px; margin-top: 4px;">Zero active emergency hazard alerts in assigned jurisdiction.</p>
                    </div>
                `;
            } else {
                if (foBadge) {
                    foBadge.textContent = `${filtered.length} Active`;
                    foBadge.className = "badge badge-danger";
                }
                foList.innerHTML = filtered.slice(0, 5).map(a => {
                    const isCritical = (a.severity === "CRITICAL");
                    const isHigh = (a.severity === "HIGH");
                    const riskClass = isCritical ? "risk-critical" : isHigh ? "risk-high" : "risk-medium";
                    const lat = a.latitude || 26.14;
                    const lng = a.longitude || 91.73;
                    const msg = a.description || a.message || "Hazard broadcast";
                    return `
                        <div class="alert-item ${riskClass}" onclick="panToAlert(${lat}, ${lng}, '${(a.title || '').replace(/'/g, "\\'")}', ${a.id})" style="cursor: pointer;" title="Inspect on GIS Map">
                            <div class="alert-item-top">
                                <strong>${a.title}</strong>
                                <span class="alert-severity-badge">${a.severity || 'Caution'}</span>
                            </div>
                            <p>${msg}</p>
                            <div class="alert-item-footer">
                                <span>${a.state || 'Assigned Sector'} · Ground verification</span>
                                <button class="action-btn-sm" onclick="event.stopPropagation(); switchTab('Verification-Center')">Verify Photo →</button>
                            </div>
                        </div>
                    `;
                }).join("");
            }
        }
    } catch (err) {
        console.warn("[Dashboard] Could not load live alerts:", err);
        if (adminList) {
            adminList.innerHTML = `<p style="padding:15px; color:var(--text-muted); text-align:center;">Unable to load hazard alerts at this moment.</p>`;
        }
        if (foList) {
            foList.innerHTML = `<p style="padding:15px; color:var(--text-muted); text-align:center;">Unable to load sector alerts at this moment.</p>`;
        }
    }
}

// Render "Area Intelligence" Deep Dive with Live Sector Switcher & 11-Point Telemetry
async function renderAreaIntelligenceView(stateName) {
    const container = document.getElementById("area-intelligence-container");
    if (!container) return;

    const user = typeof getActiveUser === 'function' ? getActiveUser() : null;
    const currentState = stateName || (user && user.assigned_area ? user.assigned_area : "Meghalaya");

    container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--text-muted);">
            <p>⏳ Loading tactical intelligence for ${currentState} Sector from backend...</p>
        </div>
    `;

    let intel = null;
    try {
        if (typeof NextraRegions !== "undefined" && typeof NextraRegions.getIntelligence === "function") {
            intel = await NextraRegions.getIntelligence(currentState);
        } else {
            const res = await fetch(`/api/regions/${encodeURIComponent(currentState)}/intelligence`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("nextra_jwt") || ""}` }
            });
            if (res.ok) intel = await res.json();
        }
    } catch (e) {
        console.warn("[Dashboard] Error fetching area intelligence:", e);
    }

    if (!intel) {
        container.innerHTML = `<div class="alert alert-danger" style="margin:20px;">Could not load intelligence for ${currentState}.</div>`;
        return;
    }

    const accessScore = intel.accessibility.score || 70;
    const accessColor = accessScore >= 75 ? "status-green" : (accessScore >= 55 ? "status-amber" : "status-red");
    const states = ["Assam", "Arunachal Pradesh", "Meghalaya", "Manipur", "Mizoram", "Nagaland", "Tripura", "Sikkim"];

    container.innerHTML = `
        <div class="field-page-grid">
            <div class="planner-form-card" style="grid-column: span 2;">
                <!-- HEADER WITH STATE SELECTOR -->
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 20px;">
                    <div>
                        <span class="eyebrow dark-eyebrow">Tactical Ground Truth Intelligence</span>
                        <h2 style="display:flex; align-items:center; gap:8px;">
                            ${intel.name || intel.state} Sector Intelligence
                        </h2>
                        <p class="section-lede">Live surveillance telemetry across ${intel.state}: Passability, drivers, fleet, weather, hazard events, and logistics bottlenecks.</p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <label for="area-intel-state-select" style="font-size:12px; font-weight:700; color:var(--text-muted);">Switch Sector:</label>
                        <select id="area-intel-state-select" class="map-filter-select" style="padding: 7px 12px; font-weight: 600;" onchange="renderAreaIntelligenceView(this.value)">
                            ${states.map(s => `<option value="${s}" ${s.toLowerCase() === currentState.toLowerCase() ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <!-- 11-POINT KPI MATRIX -->
                <div class="cards" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 24px;">
                    <!-- 1. Accessibility -->
                    <div class="card">
                        <div class="card-top">
                            <h3>Accessibility</h3>
                            <div class="card-icon green">♿</div>
                        </div>
                        <p class="number mono" style="font-size: 22px;">${intel.accessibility.score} / 100</p>
                        <div class="card-footer">
                            <span class="trend ${accessColor}">${intel.accessibility.label}</span>
                        </div>
                    </div>

                    <!-- 2. Active Drivers -->
                    <div class="card">
                        <div class="card-top">
                            <h3>Active Drivers</h3>
                            <div class="card-icon green">👤</div>
                        </div>
                        <p class="number mono" style="font-size: 22px;">${intel.active_drivers.count}</p>
                        <div class="card-footer">
                            <span class="context-text">Deployed in sector</span>
                        </div>
                    </div>

                    <!-- 3. Active Vehicles -->
                    <div class="card">
                        <div class="card-top">
                            <h3>Active Vehicles</h3>
                            <div class="card-icon blue">🚚</div>
                        </div>
                        <p class="number mono" style="font-size: 22px;">${intel.active_vehicles.count}</p>
                        <div class="card-footer">
                            <span class="context-text">Fleet operating</span>
                        </div>
                    </div>

                    <!-- 4. Shipments -->
                    <div class="card">
                        <div class="card-top">
                            <h3>Shipments</h3>
                            <div class="card-icon blue">📦</div>
                        </div>
                        <p class="number mono" style="font-size: 22px;">${intel.shipments.count}</p>
                        <div class="card-footer">
                            <span class="context-text">In-transit / staging</span>
                        </div>
                    </div>

                    <!-- 5. Delays -->
                    <div class="card">
                        <div class="card-top">
                            <h3>Active Delays</h3>
                            <div class="card-icon ${intel.delays.count > 0 ? 'amber' : 'green'}">⏳</div>
                        </div>
                        <p class="number mono" style="font-size: 22px; color:${intel.delays.count > 0 ? '#dc2626' : '#059669'};">${intel.delays.count}</p>
                        <div class="card-footer">
                            <span class="trend ${intel.delays.count > 0 ? 'warning-tag' : 'up-positive'}">${intel.delays.count > 0 ? 'Action needed' : 'On Schedule'}</span>
                        </div>
                    </div>

                    <!-- 6. Risks -->
                    <div class="card">
                        <div class="card-top">
                            <h3>Hazard Zones</h3>
                            <div class="card-icon amber">⚠️</div>
                        </div>
                        <p class="number mono" style="font-size: 22px;">${intel.risks.count}</p>
                        <div class="card-footer">
                            <span class="trend warning-tag">${intel.risks.count > 0 ? 'High alert zones' : 'Clear'}</span>
                        </div>
                    </div>

                    <!-- 7. Alerts -->
                    <div class="card">
                        <div class="card-top">
                            <h3>Safety Alerts</h3>
                            <div class="card-icon red">🚨</div>
                        </div>
                        <p class="number mono" style="font-size: 22px; color:${intel.alerts.count > 0 ? '#dc2626' : '#059669'};">${intel.alerts.count}</p>
                        <div class="card-footer">
                            <span class="context-text">Broadcast warnings</span>
                        </div>
                    </div>

                    <!-- 8. Weather -->
                    <div class="card">
                        <div class="card-top">
                            <h3>Weather Telemetry</h3>
                            <div class="card-icon blue">🌧️</div>
                        </div>
                        <p class="number mono" style="font-size: 20px;">${intel.weather.temperature || 24}°C</p>
                        <div class="card-footer">
                            <span class="trend warning-tag">${intel.weather.condition || 'Cloudy'} · ${intel.weather.rainfall || 0} mm/h</span>
                        </div>
                    </div>
                </div>

                <!-- DETAILED SECTOR BREAKDOWN (ROUTES, FLEET, REPORTS, HAZARDS) -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <!-- CORRIDORS & ROUTES -->
                    <div style="background: #f8fafc; border: 1px solid var(--border-card); border-radius: 10px; padding: 18px;">
                        <h3 style="font-size: 15px; margin-bottom: 12px; color: var(--text-dark);">🛣️ Corridor Passability (Open vs Blocked)</h3>
                        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:8px; border-bottom:1px solid #e2e8f0;">
                                <span><strong>Open Corridors (${intel.open_routes.count})</strong></span>
                                <span class="status-badge status-green">PASSIBLE</span>
                            </div>
                            <div style="color:#475569; font-size:12px; margin-top:-4px;">
                                ${intel.open_routes.corridors.length > 0 ? intel.open_routes.corridors.join(' · ') : 'All standard arterial roads open'}
                            </div>

                            <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:8px; border-bottom:1px solid #e2e8f0; margin-top:6px;">
                                <span><strong>Blocked Corridors (${intel.blocked_routes.count})</strong></span>
                                <span class="status-badge ${intel.blocked_routes.count > 0 ? 'status-red' : 'status-green'}">
                                    ${intel.blocked_routes.count > 0 ? 'RESTRICTED' : 'CLEAR'}
                                </span>
                            </div>
                            <div style="color:#dc2626; font-size:12px; margin-top:-4px;">
                                ${intel.blocked_routes.corridors.length > 0 ? intel.blocked_routes.corridors.join(' · ') : 'Zero blocked corridors detected in this sector.'}
                            </div>
                        </div>
                    </div>

                    <!-- DEPLOYED FLEET & DRIVERS -->
                    <div style="background: #f8fafc; border: 1px solid var(--border-card); border-radius: 10px; padding: 18px;">
                        <h3 style="font-size: 15px; margin-bottom: 12px; color: var(--text-dark);">🚚 Assigned Sector Fleet &amp; Personnel</h3>
                        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; font-size: 12.5px;">
                            ${intel.active_drivers.drivers && intel.active_drivers.drivers.length > 0 ? intel.active_drivers.drivers.slice(0, 4).map(d => `
                                <li style="display:flex; justify-content:space-between; padding-bottom:6px; border-bottom:1px solid #e2e8f0;">
                                    <span>👤 <strong>${d.name}</strong> (${d.driver_id})</span>
                                    <span class="status-badge status-green">${d.status}</span>
                                </li>
                            `).join('') : '<li style="color:#64748b;">No active drivers staged in sector.</li>'}
                            ${intel.active_vehicles.vehicles && intel.active_vehicles.vehicles.length > 0 ? intel.active_vehicles.vehicles.slice(0, 4).map(v => `
                                <li style="display:flex; justify-content:space-between; padding-bottom:6px; border-bottom:1px solid #e2e8f0;">
                                    <span>🚚 <strong class="mono">${v.registration}</strong> (${v.vehicle_type})</span>
                                    <span class="mono">${((v.capacity_kg || 16000) / 1000).toFixed(1)}T</span>
                                </li>
                            `).join('') : ''}
                        </ul>
                    </div>
                </div>

                <!-- ACTIONS & REPORT SUBMISSION -->
                <div style="margin-top: 20px; display: flex; gap: 12px; flex-wrap: wrap;">
                    <button type="button" class="btn-primary-large" onclick="switchTab('Live-Map'); setTimeout(() => focusState('${currentState}'), 300);">
                        🗺️ Inspect on Live Map →
                    </button>
                    <button type="button" class="action-btn-sm" style="padding: 10px 18px; font-weight: 700;" onclick="switchTab('Field-Reports')">
                        📋 Submit Ground Truth Report
                    </button>
                    <button type="button" class="action-btn-sm" style="padding: 10px 18px; font-weight: 700;" onclick="switchTab('Verification-Center')">
                        🛡️ Open Verification Queue
                    </button>
                </div>
            </div>
        </div>
    `;
}

