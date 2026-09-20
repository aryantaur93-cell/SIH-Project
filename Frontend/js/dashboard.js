/**
 * NEXTRA - Role-Specific Dashboard Renderer
 * Assembles distinct dashboards tailored to Admin, Field Officer, Logistics, and Driver.
 */

function renderRoleDashboard(roleKey) {
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
}

// 1. ADMIN DASHBOARD TEMPLATE (Regional Intelligence Overview)
function getAdminDashboardHTML() {
    const shipments = NextraApi.getShipments();
    const trucks = NextraApi.getTrucks();
    const drivers = NextraApi.getDrivers();
    const verifications = NextraApi._get(NextraApi.KEYS.VERIFICATIONS);
    const pendingVer = verifications.filter(v => v.status === "PENDING").length;
    const verifiedVer = verifications.filter(v => v.status === "VERIFIED").length;

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
                <span class="status-badge status-amber">3 High Risk Corridors</span>
            </div>
        </div>

        <!-- 10 REGIONAL INTELLIGENCE KPI CARDS -->
        <div class="cards admin-kpi-grid">
            <div class="card" onclick="switchTab('Shipments')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Active Shipments</h3>
                    <div class="card-icon blue">📦</div>
                </div>
                <p class="number mono">${shipments.length + 20}</p>
                <div class="card-footer">
                    <span class="trend up-positive">↑ 87% On-Time</span>
                    <span class="context-text">Across 8 NE states</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Drivers')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Active Drivers</h3>
                    <div class="card-icon green">👤</div>
                </div>
                <p class="number mono">${drivers.length + 12}</p>
                <div class="card-footer">
                    <span class="trend up-positive">18 Hill Certified</span>
                    <span class="context-text">Live GPS tracked</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Trucks')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Available Trucks</h3>
                    <div class="card-icon green">🚛</div>
                </div>
                <p class="number mono">${trucks.filter(t => t.status === 'AVAILABLE').length + 28}</p>
                <div class="card-footer">
                    <span class="trend up-positive">32 Ready to Deploy</span>
                    <span class="context-text">Multi-axle &amp; 4x4</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Risk-Intelligence')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Risk Zones</h3>
                    <div class="card-icon red">⚠️</div>
                </div>
                <p class="number mono">4</p>
                <div class="card-footer">
                    <span class="trend text-danger">1 Critical (Sonapur)</span>
                    <span class="context-text">Geological &amp; weather</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Verification-Center')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Pending Verification</h3>
                    <div class="card-icon amber">🛡️</div>
                </div>
                <p class="number mono">${pendingVer}</p>
                <div class="card-footer">
                    <span class="trend text-amber">${pendingVer} Images Awaiting Review</span>
                    <span class="context-text">AI confidence analyzed</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Verification-Center')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Verified Evidence</h3>
                    <div class="card-icon green">✓</div>
                </div>
                <p class="number mono">${verifiedVer + 10}</p>
                <div class="card-footer">
                    <span class="trend up-positive">100% Ground Confirmed</span>
                    <span class="context-text">In shared system</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Accessibility')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Accessibility Score</h3>
                    <div class="card-icon blue">♿</div>
                </div>
                <p class="number mono">74<small>/100</small></p>
                <div class="card-footer">
                    <span class="trend up-positive">Regional Average</span>
                    <span class="context-text">Hill terrain gradient index</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Field-Officers')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Active Field Officers</h3>
                    <div class="card-icon purple">🔍</div>
                </div>
                <p class="number mono">8</p>
                <div class="card-footer">
                    <span class="trend up-positive">BRO &amp; Disaster Teams</span>
                    <span class="context-text">Coordinated patrol</span>
                </div>
            </div>
        </div>

        <!-- SHARED REAL MAP + ALERT PANEL (Mounts GIS Map) -->
        <div class="content-grid" style="margin-top: 24px;">
            <div class="map-box">
                <div class="map-header">
                    <div class="map-title">
                        <h2>🗺️ NEXTRA Live Northeast Operations Map</h2>
                        <p>Interactive geographic GIS view of Assam, Meghalaya, Arunachal, Nagaland, Manipur, Mizoram, Tripura &amp; Sikkim.</p>
                    </div>
                    <div class="state-selector-bar">
                        <button type="button" class="state-chip active" onclick="focusState('ALL')">All NE</button>
                        <button type="button" class="state-chip" onclick="focusState('ASSAM')">Assam</button>
                        <button type="button" class="state-chip" onclick="focusState('MEGHALAYA')">Meghalaya</button>
                        <button type="button" class="state-chip" onclick="focusState('ARUNACHAL')">Arunachal</button>
                        <button type="button" class="state-chip" onclick="focusState('NAGALAND')">Nagaland</button>
                        <button type="button" class="state-chip" onclick="focusState('MANIPUR')">Manipur</button>
                        <button type="button" class="state-chip" onclick="focusState('MIZORAM')">Mizoram</button>
                        <button type="button" class="state-chip" onclick="focusState('TRIPURA')">Tripura</button>
                        <button type="button" class="state-chip" onclick="focusState('SIKKIM')">Sikkim</button>
                    </div>
                </div>
                <div id="ne-map" class="map-container"></div>
                <div class="map-legend">
                    <div class="legend-item"><span class="legend-dot green"></span> Safe / Open</div>
                    <div class="legend-item"><span class="legend-dot amber"></span> Heavy Rain / Caution</div>
                    <div class="legend-item"><span class="legend-dot red"></span> Landslide / Critical Blockage</div>
                    <div class="legend-item"><span class="legend-dot blue"></span> Cold Storage Hub</div>
                </div>
            </div>

            <!-- REGIONAL LIVE ALERTS FEED -->
            <div class="alert-box">
                <div class="alert-header">
                    <h3>🚨 Real-Time Regional Hazards</h3>
                    <span class="badge badge-danger">3 Active</span>
                </div>
                <div class="alert-list">
                    <div class="alert-item risk-critical" onclick="panToAlert(25.10, 92.35, 'NH-6 Sonapur Tunnel')">
                        <div class="alert-item-top">
                            <strong>NH-6 Sonapur Landslide</strong>
                            <span class="alert-severity-badge">Critical</span>
                        </div>
                        <p>Mudslide obstructing both lanes. BRO clearing debris. Reroute via Umran active.</p>
                        <div class="alert-item-footer">
                            <span>Meghalaya · 4m ago</span>
                            <span class="alert-view-btn">Inspect GIS →</span>
                        </div>
                    </div>
                    <div class="alert-item risk-medium" onclick="panToAlert(25.5788, 91.8933, 'Shillong Plateau')">
                        <div class="alert-item-top">
                            <strong>Torrential Rainfall Warning</strong>
                            <span class="alert-severity-badge">Caution</span>
                        </div>
                        <p>65mm/hr rain on Shillong ridge. Low visibility and aquaplaning hazard.</p>
                        <div class="alert-item-footer">
                            <span>Meghalaya · 12m ago</span>
                            <span class="alert-view-btn">Inspect GIS →</span>
                        </div>
                    </div>
                    <div class="alert-item risk-medium" onclick="panToAlert(27.50, 92.10, 'Sela Pass')">
                        <div class="alert-item-top">
                            <strong>Sub-Zero Ice on Sela Pass</strong>
                            <span class="alert-severity-badge">Warning</span>
                        </div>
                        <p>Black ice above 13,000 ft on NH-13. Snow chains mandated by administration.</p>
                        <div class="alert-item-footer">
                            <span>Arunachal · 35m ago</span>
                            <span class="alert-view-btn">Inspect GIS →</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ADMIN EXCLUSIVE ACTIONS -->
        <div class="quick" style="margin-top: 24px;">
            <h2>⚡ Administrator Operations Console</h2>
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
    const user = getActiveUser();
    const area = user ? user.assigned_area : "MEGHALAYA";
    const verifications = NextraApi.getVerificationRecords();
    const pendingArea = verifications.filter(v => v.status === "PENDING" && (v.state === area || area === "ALL")).length;

    return `
        <!-- FIELD OFFICER SECTOR DASHBOARD -->
        <div class="dashboard-header-block">
            <div class="dash-title-group">
                <span class="eyebrow">Assigned Jurisdiction · VoidX™ Ground Truth · Meghalaya Sector (NH-6)</span>
                <h2>Ground Truth &amp; Sector Intelligence Console</h2>
                <p class="section-lede">Operational oversight for Jowai-Sonapur mountain corridor, BRO taskforce coordination, and ground truth photo verification.</p>
            </div>
            <div class="dash-badge-group">
                <span class="status-badge status-amber">Patrol Duty: Active</span>
                <span class="status-badge status-green">Meghalaya Grid Online</span>
            </div>
        </div>

        <!-- 8 SECTOR INTELLIGENCE KPI CARDS -->
        <div class="cards field-kpi-grid">
            <div class="card" onclick="focusState('MEGHALAYA')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Local Risk Zones</h3>
                    <div class="card-icon red">⚠️</div>
                </div>
                <p class="number mono">2</p>
                <div class="card-footer">
                    <span class="trend text-danger">NH-6 Sonapur Blocked</span>
                    <span class="context-text">Cherrapunji high rain</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Field-Reports')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Road Condition</h3>
                    <div class="card-icon amber">🚧</div>
                </div>
                <p class="number mono" style="font-size: 20px; line-height: 1.4;">RESTRICTED</p>
                <div class="card-footer">
                    <span class="trend text-amber">Single Lane Bypass</span>
                    <span class="context-text">Sonapur Mudslide</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Verification-Center')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Pending Area Review</h3>
                    <div class="card-icon green">🛡️</div>
                </div>
                <p class="number mono">${pendingArea}</p>
                <div class="card-footer">
                    <span class="trend text-amber">${pendingArea} Photos Awaiting Your Approval</span>
                    <span class="context-text">Ground confirmation required</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Logistics')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Sector Shipments</h3>
                    <div class="card-icon blue">📦</div>
                </div>
                <p class="number mono">6</p>
                <div class="card-footer">
                    <span class="trend up-positive">4 Moving · 1 Halted</span>
                    <span class="context-text">Transit across Meghalaya</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Drivers')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Drivers in Sector</h3>
                    <div class="card-icon green">👤</div>
                </div>
                <p class="number mono">5</p>
                <div class="card-footer">
                    <span class="trend up-positive">Rahul Borah (VX-104)</span>
                    <span class="context-text">Live safety link active</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Accessibility')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Sector Accessibility</h3>
                    <div class="card-icon blue">♿</div>
                </div>
                <p class="number mono">64<small>/100</small></p>
                <div class="card-footer">
                    <span class="trend text-amber">Steep Slope Vulnerability</span>
                    <span class="context-text">NEIGRIHMS route open</span>
                </div>
            </div>
        </div>

        <!-- SECTOR MAP & LOCAL ALERTS -->
        <div class="content-grid" style="margin-top: 24px;">
            <div class="map-box">
                <div class="map-header">
                    <div class="map-title">
                        <h2>🗺️ Meghalaya Sector Geographic Map</h2>
                        <p>Real-time telemetry focused on NH-6 Shillong-Jowai-Sonapur mountain passes.</p>
                    </div>
                    <button type="button" class="action-btn-sm active" onclick="focusState('MEGHALAYA')">Reset Sector Focus</button>
                </div>
                <div id="ne-map" class="map-container"></div>
            </div>

            <div class="alert-box">
                <div class="alert-header">
                    <h3>📍 Meghalaya Sector Alerts</h3>
                    <span class="badge badge-danger">2 Critical</span>
                </div>
                <div class="alert-list">
                    <div class="alert-item risk-critical">
                        <div class="alert-item-top">
                            <strong>Sonapur Mudslide Active</strong>
                            <span class="alert-severity-badge">Critical</span>
                        </div>
                        <p>Km 141.8: Both lanes blocked. BRO bulldozer on site. Clearance estimate: 4.5 hrs.</p>
                        <div class="alert-item-footer">
                            <span>Assigned to you · Ground verification required</span>
                            <button class="action-btn-sm" onclick="switchTab('Verification-Center')">Verify Photo →</button>
                        </div>
                    </div>
                    <div class="alert-item risk-medium">
                        <div class="alert-item-top">
                            <strong>Heavy Mountain Rainfall</strong>
                            <span class="alert-severity-badge">Caution</span>
                        </div>
                        <p>65mm/hr on Shillong Plateau. Fog warning issued to all freight operators.</p>
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
    const shipments = NextraApi.getShipments();
    const trucks = NextraApi.getTrucks();
    const drivers = NextraApi.getDrivers();
    const requests = NextraApi.getTransportationRequests();

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
            </div>
        </div>

        <!-- LOGISTICS KPI CARDS -->
        <div class="cards logistics-kpi-grid">
            <div class="card" onclick="switchTab('Shipments')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Active Shipments</h3>
                    <div class="card-icon blue">📦</div>
                </div>
                <p class="number mono">${shipments.length + 20}</p>
                <div class="card-footer">
                    <span class="trend up-positive">↑ 87% Moving</span>
                    <span class="context-text">Live tracking active</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Transport-Requests')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Pending Requests</h3>
                    <div class="card-icon amber">📑</div>
                </div>
                <p class="number mono">${requests.filter(r => r.status === 'PENDING').length || 3}</p>
                <div class="card-footer">
                    <span class="trend text-amber">Ready for Matching</span>
                    <span class="context-text">AI driver/truck assignment</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Trucks')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Available Trucks</h3>
                    <div class="card-icon green">🚛</div>
                </div>
                <p class="number mono">${trucks.filter(t => t.status === 'AVAILABLE').length + 12}</p>
                <div class="card-footer">
                    <span class="trend up-positive">15 Staged at Depots</span>
                    <span class="context-text">Refrigerated &amp; Flatbed</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Drivers')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Available Drivers</h3>
                    <div class="card-icon green">👤</div>
                </div>
                <p class="number mono">${drivers.filter(d => d.status === 'AVAILABLE').length + 10}</p>
                <div class="card-footer">
                    <span class="trend up-positive">12 Standby for Dispatch</span>
                    <span class="context-text">Hill permit verified</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Shipments')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Delayed Shipments</h3>
                    <div class="card-icon red">⏱️</div>
                </div>
                <p class="number mono">2</p>
                <div class="card-footer">
                    <span class="trend text-danger">SHP-803 Halted at Sonapur</span>
                    <span class="context-text">Weather detour computed</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Smart-Route')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Average ETA Window</h3>
                    <div class="card-icon blue">⚡</div>
                </div>
                <p class="number mono">4h 15m</p>
                <div class="card-footer">
                    <span class="trend up-positive">+12% vs Historical</span>
                    <span class="context-text">AI bypass optimization</span>
                </div>
            </div>
        </div>

        <!-- FREIGHT MAP & ACTIVE DISPATCH TABLE -->
        <div class="content-grid" style="margin-top: 24px;">
            <div class="map-box">
                <div class="map-header">
                    <div class="map-title">
                        <h2>🗺️ Active Freight Corridors &amp; Telemetry</h2>
                        <p>Real-time vehicle GPS positions and primary mountain supply lines.</p>
                    </div>
                </div>
                <div id="ne-map" class="map-container"></div>
            </div>

            <!-- RECENT TRANSPORTATION REQUESTS QUEUE -->
            <div class="alert-box">
                <div class="alert-header">
                    <h3>📦 Recent Transportation Requests</h3>
                    <button class="action-btn-sm" onclick="switchTab('Transport-Requests')">View All →</button>
                </div>
                <div class="alert-list" id="logistics-requests-preview">
                    ${requests.slice(0, 3).map(r => `
                        <div class="alert-item risk-low" style="border-left-color: var(--primary);">
                            <div class="alert-item-top">
                                <strong>${r.cargo_type} (${r.cargo_weight_kg} kg)</strong>
                                <span class="status-badge ${r.status === 'MATCHED' ? 'status-green' : 'status-amber'}">${r.status}</span>
                            </div>
                            <p>${r.pickup_location} → ${r.destination}</p>
                            <div class="alert-item-footer">
                                <span>${r.matched_truck ? `Assigned: ${r.matched_truck} (${r.matched_driver})` : 'Awaiting Match'}</span>
                                <span class="alert-view-btn">Inspect →</span>
                            </div>
                        </div>
                    `).join('')}
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
                <button type="button" class="action-btn" onclick="switchTab('Smart-Route')">
                    <div class="action-icon-circle">🗺️</div>
                    <div class="action-text">
                        <strong>AI Route Tradeoff</strong>
                        <span>Compare shortest vs safest bypass routes</span>
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
                <span class="eyebrow dark-eyebrow" style="color: #6ee7b7;">COMMERCIAL VEHICLE IN-CAB COCKPIT · POWERED BY VOIDX™ · TATA SIGNA 2823 (VX-104)</span>
                <h2>Active Route: Guwahati Central Hub → Shillong Civil Hospital</h2>
                <p>Consignment: Essential Medical Vaccines (Cold Chain · 2.4T) · Target Delivery: 11:42 AM IST</p>
            </div>
            <div class="cockpit-right">
                <div class="cockpit-speed-badge">
                    <span class="speed-val mono">42</span>
                    <span class="speed-unit">km/h</span>
                </div>
                <div class="cockpit-temp-badge">
                    <span class="temp-val mono">3.4°C</span>
                    <span class="temp-unit">Cargo Temp (Optimal)</span>
                </div>
            </div>
        </div>

        <!-- DRIVER 6-GAUGE REAL-TIME STATUS ROW -->
        <div class="cards driver-kpi-grid" style="margin-top: 20px;">
            <div class="card" onclick="switchTab('My-Route')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Remaining Distance</h3>
                    <div class="card-icon blue">🧭</div>
                </div>
                <p class="number mono">48 <small>km</small></p>
                <div class="card-footer">
                    <span class="trend up-positive">ETA: 1h 15m</span>
                    <span class="context-text">NH-6 Umiam Section</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Road-Alerts')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Road Condition Ahead</h3>
                    <div class="card-icon amber">🚧</div>
                </div>
                <p class="number mono" style="font-size: 18px; color: #f59e0b;">SLIPPERY / MIST</p>
                <div class="card-footer">
                    <span class="trend text-amber">Rain on Shillong Ridge</span>
                    <span class="context-text">Speed limit: 35 km/h</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Weather')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Weather Radar</h3>
                    <div class="card-icon blue">🌧️</div>
                </div>
                <p class="number mono">18°C</p>
                <div class="card-footer">
                    <span class="trend text-amber">65 mm/hr Rain</span>
                    <span class="context-text">Wipers active · Low visibility</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Nearby-Drivers')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Nearby Drivers</h3>
                    <div class="card-icon green">📡</div>
                </div>
                <p class="number mono">3 <small>Vehicles</small></p>
                <div class="card-footer">
                    <span class="trend up-positive">Nearest: 4.2 km</span>
                    <span class="context-text">Radio Channel 4 Active</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Area-Field-Officer')" style="cursor: pointer;">
                <div class="card-top">
                    <h3>Area Field Officer</h3>
                    <div class="card-icon purple">👮</div>
                </div>
                <p class="number mono" style="font-size: 17px;">Arjun Sharma</p>
                <div class="card-footer">
                    <span class="trend up-positive">BRO Meghalaya Sector</span>
                    <span class="context-text">+91 94361-28901</span>
                </div>
            </div>

            <div class="card" onclick="switchTab('Report-Issue')" style="cursor: pointer; border: 1px dashed var(--primary); background: #f0fdf4;">
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
            <div class="map-box">
                <div class="map-header">
                    <div class="map-title">
                        <h2>🗺️ Driver Highway Navigation (NH-6 Hill Section)</h2>
                        <p>Real-time vehicle GPS, terrain elevation, and hazards along your active route.</p>
                    </div>
                </div>
                <div id="ne-map" class="map-container"></div>
            </div>

            <div class="alert-box">
                <div class="alert-header">
                    <h3>🚨 Route Safety Alerts</h3>
                    <span class="badge badge-danger">1 Urgent</span>
                </div>
                <div class="alert-list">
                    <div class="alert-item risk-critical">
                        <div class="alert-item-top">
                            <strong>Sonapur Tunnel Blockade Warning</strong>
                            <span class="alert-severity-badge">Danger</span>
                        </div>
                        <p>Active landslide reported 38 km ahead on NH-6. If continuing past Shillong to Silchar, prepare to take Umran bypass.</p>
                    </div>
                    <div class="alert-item risk-medium">
                        <div class="alert-item-top">
                            <strong>Wet Surface Speed Advisory</strong>
                            <span class="alert-severity-badge">Caution</span>
                        </div>
                        <p>Dense mist between Km 40 and 65. Keep fog lamps on. Heavy truck convoys moving downhill.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
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
        }
    }, 150);
}

// Render "Area Intelligence" Deep Dive for Field Officer (Meghalaya Sector)
function renderAreaIntelligenceView() {
    const container = document.getElementById("area-intelligence-container");
    if (!container) return;

    container.innerHTML = `
        <div class="field-page-grid">
            <div class="planner-form-card" style="grid-column: span 2;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
                    <div>
                        <span class="eyebrow dark-eyebrow">Tactical Ground Truth Intelligence</span>
                        <h2>Meghalaya Sector · NH-6 Arterial Corridor</h2>
                        <p class="section-lede">Real-time clearance machinery, micro-climate weather telemetry, and choke-point monitoring for Khasi &amp; Jaintia Hills.</p>
                    </div>
                    <span class="status-badge status-amber">⚠️ 1 Active Obstruction (Sonapur)</span>
                </div>

                <!-- 4 TACTICAL STATUS TILES -->
                <div class="cards" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 24px;">
                    <div class="card">
                        <div class="card-top">
                            <h3>Sonapur Clearance</h3>
                            <div class="card-icon amber">🚜</div>
                        </div>
                        <p class="number mono" style="font-size: 22px;">68% Cleared</p>
                        <div class="card-footer">
                            <span class="trend warning-tag">Single Lane Open</span>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-top">
                            <h3>Sector Rain Gauge</h3>
                            <div class="card-icon blue">🌧️</div>
                        </div>
                        <p class="number mono" style="font-size: 22px;">65 mm/h</p>
                        <div class="card-footer">
                            <span class="trend warning-tag">Heavy Monsoon</span>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-top">
                            <h3>Optical Visibility</h3>
                            <div class="card-icon amber">🌫️</div>
                        </div>
                        <p class="number mono" style="font-size: 22px;">400 m</p>
                        <div class="card-footer">
                            <span class="trend warning-tag">Dense Mist</span>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-top">
                            <h3>Heavy Machinery</h3>
                            <div class="card-icon green">🏗️</div>
                        </div>
                        <p class="number mono" style="font-size: 22px;">3 Units</p>
                        <div class="card-footer">
                            <span class="trend up-positive">2 Excavators, 1 Dozer</span>
                        </div>
                    </div>
                </div>

                <!-- MACHINERY DEPLOYMENT & BOTTLENECK ANALYSIS -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div style="background: #f8fafc; border: 1px solid var(--border-card); border-radius: 10px; padding: 18px;">
                        <h3 style="font-size: 15px; margin-bottom: 12px; color: var(--text-dark);">🚜 Active Clearance Taskforce Deployment</h3>
                        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
                            <li style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
                                <span><strong>CAT 320D Excavator #1</strong> (South Face)</span>
                                <span class="status-badge status-green">OPERATIONAL</span>
                            </li>
                            <li style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
                                <span><strong>CAT 320D Excavator #2</strong> (North Face)</span>
                                <span class="status-badge status-green">OPERATIONAL</span>
                            </li>
                            <li style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
                                <span><strong>BEML BD50 Bulldozer</strong> (Boulder Pusher)</span>
                                <span class="status-badge status-green">OPERATIONAL</span>
                            </li>
                            <li style="display: flex; justify-content: space-between;">
                                <span><strong>Dumper Trucks (Tippers)</strong></span>
                                <span class="mono">4 Tippers Cycling Debris</span>
                            </li>
                        </ul>
                    </div>

                    <div style="background: #f8fafc; border: 1px solid var(--border-card); border-radius: 10px; padding: 18px;">
                        <h3 style="font-size: 15px; margin-bottom: 12px; color: var(--text-dark);">📍 Critical Sector Choke Points</h3>
                        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
                            <li style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
                                <span><strong>NH-6 Sonapur Mudslide Zone</strong></span>
                                <span class="status-badge status-red">45m Pilot Batches</span>
                            </li>
                            <li style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
                                <span><strong>Umiam Dam Viaduct (Km 78)</strong></span>
                                <span class="status-badge status-amber">24T Max Weight</span>
                            </li>
                            <li style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
                                <span><strong>Mawlai Hill Hairpin Descent</strong></span>
                                <span class="status-badge status-amber">30 km/h Limit</span>
                            </li>
                            <li style="display: flex; justify-content: space-between;">
                                <span><strong>Emergency Radio Frequency</strong></span>
                                <span class="mono" style="font-weight: 700; color: var(--primary);">BRO Ch. 4 (148.250 MHz)</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div style="margin-top: 20px; display: flex; gap: 12px;">
                    <button type="button" class="btn-primary-large" onclick="switchTab('Verification-Center')">
                        🛡️ Open Area Verification Queue →
                    </button>
                    <button type="button" class="action-btn-sm" style="padding: 10px 18px; font-weight: 700;" onclick="switchTab('Field-Reports')">
                        📋 Submit New Ground Truth Report
                    </button>
                </div>
            </div>
        </div>
    `;
}

