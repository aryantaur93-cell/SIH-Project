/**
 * NEXTRA — Risk Intelligence Module
 * Fully backend-driven risk engine interface.
 * Connects to /api/risks/areas and /api/risks/routes.
 * Displays transparent multi-factor scoring, affected corridors, and recommended actions.
 */

let _cachedAreaRisks = [];
let _cachedRouteRisks = [];
let _activeRiskLevelFilter = "ALL";
let _activeRiskStateFilter = "ALL";

async function renderRiskIntelligence() {
    const container = document.getElementById("risk-intelligence-container") || document.getElementById("section-Risk Intelligence");
    if (!container) return;

    // Loading indicator
    container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--text-muted);">
            <div class="spinner" style="margin: 0 auto 12px;"></div>
            <p>⏳ Loading live regional risk intelligence from backend engine...</p>
        </div>
    `;

    try {
        const [areas, routes] = await Promise.all([
            NextraRisks.getAreas(),
            NextraRisks.getRoutes()
        ]);
        _cachedAreaRisks = Array.isArray(areas) ? areas : [];
        _cachedRouteRisks = Array.isArray(routes) ? routes : [];
    } catch (err) {
        console.warn("[NEXTRA Risk] Error fetching risk intelligence:", err);
        container.innerHTML = `
            <div class="alert alert-danger" style="margin: 20px;">
                Failed to load risk intelligence from backend: ${err.message}. Ensure backend is active.
            </div>
        `;
        return;
    }

    renderRiskIntelligenceView();
}

function renderRiskIntelligenceView() {
    const container = document.getElementById("risk-intelligence-container") || document.getElementById("section-Risk Intelligence");
    if (!container) return;

    // Filter area risks
    const filteredAreas = _cachedAreaRisks.filter(a => {
        if (_activeRiskStateFilter !== "ALL" && a.state.toLowerCase() !== _activeRiskStateFilter.toLowerCase()) {
            return false;
        }
        if (_activeRiskLevelFilter !== "ALL" && a.risk_level !== _activeRiskLevelFilter) {
            return false;
        }
        return true;
    });

    // Compute Summary KPIs
    const criticalCount = _cachedAreaRisks.filter(a => a.risk_level === "CRITICAL").length;
    const highCount = _cachedAreaRisks.filter(a => a.risk_level === "HIGH").length;
    const avgScore = _cachedAreaRisks.length > 0 
        ? Math.round(_cachedAreaRisks.reduce((acc, curr) => acc + curr.risk_score, 0) / _cachedAreaRisks.length) 
        : 0;
    const highestRiskArea = _cachedAreaRisks.length > 0 ? _cachedAreaRisks[0] : null;

    const states = ["Assam", "Arunachal Pradesh", "Meghalaya", "Manipur", "Mizoram", "Nagaland", "Tripura", "Sikkim"];

    container.innerHTML = `
        <div class="risk-intelligence-page">
            <!-- HEADER BAR -->
            <div class="dashboard-header-block">
                <div class="dash-title-group">
                    <span class="eyebrow dark-eyebrow">Tactical Geospatial Threat Assessment</span>
                    <h2>⚠️ NEXTRA Multi-Factor Risk Intelligence Engine</h2>
                    <p class="section-lede">
                        Live deterministic risk scoring across all 8 Northeast states. Integrated telemetry from meteorology, hill terrain passability, active ground hazards, and corridor blockades.
                    </p>
                </div>
                <div class="dash-badge-group">
                    <button type="button" class="btn-primary-large" onclick="triggerRiskRecalculation()" style="padding: 9px 16px; font-size: 12.5px;">
                        ⚡ Recalculate Risk Engine
                    </button>
                </div>
            </div>

            <!-- 4 SUMMARY KPI TILES -->
            <div class="cards" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 24px;">
                <div class="card">
                    <div class="card-top">
                        <h3>Critical Threat Zones</h3>
                        <div class="card-icon red">🚨</div>
                    </div>
                    <p class="number mono" style="font-size: 26px; color: ${criticalCount > 0 ? '#dc2626' : '#059669'};">${criticalCount}</p>
                    <div class="card-footer">
                        <span class="trend ${criticalCount > 0 ? 'warning-tag' : 'up-positive'}">${criticalCount > 0 ? 'Urgent Reroute Required' : '0 Emergency Zones'}</span>
                    </div>
                </div>

                <div class="card">
                    <div class="card-top">
                        <h3>Highest Sector Risk</h3>
                        <div class="card-icon amber">⚠️</div>
                    </div>
                    <p class="number mono" style="font-size: 24px; color: #ea580c;">${highestRiskArea ? `${highestRiskArea.risk_score}/100` : 'None'}</p>
                    <div class="card-footer">
                        <span class="context-text">${highestRiskArea ? highestRiskArea.location_name : 'All Normal'} (${highestRiskArea ? highestRiskArea.risk_level : 'LOW'})</span>
                    </div>
                </div>

                <div class="card">
                    <div class="card-top">
                        <h3>Regional Average Risk</h3>
                        <div class="card-icon blue">📊</div>
                    </div>
                    <p class="number mono" style="font-size: 24px;">${avgScore} / 100</p>
                    <div class="card-footer">
                        <span class="context-text">${avgScore >= 50 ? 'Challenging Monsoon Period' : 'Nominal Passability'}</span>
                    </div>
                </div>

                <div class="card">
                    <div class="card-top">
                        <h3>Monitored Corridors</h3>
                        <div class="card-icon green">🛣️</div>
                    </div>
                    <p class="number mono" style="font-size: 24px;">${_cachedRouteRisks.length}</p>
                    <div class="card-footer">
                        <span class="context-text">8 States Inter-Connected</span>
                    </div>
                </div>
            </div>

            <!-- FILTER CONTROLS TOOLBAR -->
            <div class="risk-filter-bar" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; background: #f8fafc; padding: 12px 18px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <span style="font-size: 12px; font-weight: 700; color: #475569;">Filter by Level:</span>
                    <button type="button" class="action-btn-sm ${_activeRiskLevelFilter === 'ALL' ? 'active' : ''}" onclick="setRiskLevelFilter('ALL')">All Levels</button>
                    <button type="button" class="action-btn-sm ${_activeRiskLevelFilter === 'CRITICAL' ? 'active' : ''}" style="color: #dc2626;" onclick="setRiskLevelFilter('CRITICAL')">Critical (75–100)</button>
                    <button type="button" class="action-btn-sm ${_activeRiskLevelFilter === 'HIGH' ? 'active' : ''}" style="color: #ea580c;" onclick="setRiskLevelFilter('HIGH')">High (50–74)</button>
                    <button type="button" class="action-btn-sm ${_activeRiskLevelFilter === 'MODERATE' ? 'active' : ''}" style="color: #d97706;" onclick="setRiskLevelFilter('MODERATE')">Moderate (25–49)</button>
                    <button type="button" class="action-btn-sm ${_activeRiskLevelFilter === 'LOW' ? 'active' : ''}" style="color: #059669;" onclick="setRiskLevelFilter('LOW')">Low (0–24)</button>
                </div>

                <div style="display: flex; align-items: center; gap: 8px;">
                    <label for="select-risk-state" style="font-size: 12px; font-weight: 700; color: #475569;">Sector:</label>
                    <select id="select-risk-state" class="map-filter-select" onchange="setRiskStateFilter(this.value)">
                        <option value="ALL">All 8 Northeast States</option>
                        ${states.map(s => `<option value="${s}" ${_activeRiskStateFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
            </div>

            <!-- AREA RISK CARDS GRID -->
            <div class="risk-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 18px; margin-bottom: 30px;">
                ${filteredAreas.map(a => getAreaRiskCardHTML(a)).join('')}
            </div>

            ${filteredAreas.length === 0 ? `
                <div style="padding: 40px; text-align: center; color: var(--text-muted); background: #f8fafc; border-radius: 8px; margin-bottom: 30px;">
                    No sectors match the selected filter criteria.
                </div>
            ` : ''}

            <!-- ARTERIAL CORRIDOR PASSABILITY & ROUTE RISKS TABLE -->
            <div class="data-table-container">
                <div class="table-header-bar">
                    <div>
                        <h2>🛣️ Arterial Highway Corridors — Passability & Route Risk</h2>
                        <p style="font-size: 12.5px; color: var(--text-muted); margin-top: 2px;">
                            Real-time transit conditions, mountain pass choke points, and route diversion recommendations.
                        </p>
                    </div>
                    <span class="status-badge status-green">${_cachedRouteRisks.length} Arterial Routes</span>
                </div>

                <table class="custom-table">
                    <thead>
                        <tr>
                            <th>Corridor Code</th>
                            <th>Highway Route Name</th>
                            <th>Origin ➔ Destination</th>
                            <th>Road Status</th>
                            <th>Risk Score</th>
                            <th>Risk Level</th>
                            <th>Primary Hazard</th>
                            <th>Operational Protocol</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${_cachedRouteRisks.map(r => {
                            const badgeColor = r.risk_level === 'CRITICAL' ? 'status-red' : (r.risk_level === 'HIGH' ? 'status-amber' : (r.risk_level === 'MODERATE' ? 'status-amber' : 'status-green'));
                            const statusColor = r.status === 'BLOCKED' ? 'status-red' : (r.status === 'CAUTION' || r.status === 'RESTRICTED' ? 'status-amber' : 'status-green');
                            return `
                                <tr>
                                    <td><strong class="mono" style="color: var(--primary);">${r.corridor_code}</strong></td>
                                    <td><strong>${r.route_name}</strong><br><small style="color:var(--text-muted);">${r.distance_km || 0} km · Approx ${r.estimated_hours || 0}h</small></td>
                                    <td>${r.origin_hub} ➔ ${r.destination_hub}</td>
                                    <td><span class="status-badge ${statusColor}">${r.status}</span></td>
                                    <td><strong class="mono" style="font-size: 14px;">${r.risk_score}/100</strong></td>
                                    <td><span class="status-badge ${badgeColor}">${r.risk_level}</span></td>
                                    <td><strong>${r.primary_hazard}</strong></td>
                                    <td><small style="color: #334155;">${r.recommended_action}</small></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function getAreaRiskCardHTML(a) {
    const levelColors = {
        "CRITICAL": { bg: "#fef2f2", border: "#fca5a5", text: "#b91c1c", badge: "status-red", bar: "#dc2626" },
        "HIGH": { bg: "#fff7ed", border: "#fdba74", text: "#c2410c", badge: "status-amber", bar: "#ea580c" },
        "MODERATE": { bg: "#fffbeb", border: "#fde68a", text: "#b45309", badge: "status-amber", bar: "#f59e0b" },
        "LOW": { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", badge: "status-green", bar: "#10b981" }
    };
    const c = levelColors[a.risk_level] || levelColors["LOW"];

    return `
        <div class="risk-dossier-card" style="background: #ffffff; border: 1px solid ${c.border}; border-top: 4px solid ${c.bar}; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
                <!-- Top Badge & Location -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div>
                        <span class="eyebrow dark-eyebrow" style="margin-bottom: 2px;">${a.state} Sector</span>
                        <h3 style="font-size: 17px; font-weight: 700; color: #0f172a; margin: 0;">${a.location_name}</h3>
                    </div>
                    <span class="status-badge ${c.badge}" style="font-size: 11px;">${a.risk_level}</span>
                </div>

                <!-- Visual Score & Bar -->
                <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px;">
                    <span class="mono" style="font-size: 32px; font-weight: 800; color: ${c.text};">${a.risk_score}</span>
                    <span style="font-size: 13px; color: #64748b; font-weight: 600;">/ 100 Risk Index</span>
                </div>

                <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-bottom: 14px;">
                    <div style="width: ${a.risk_score}%; height: 100%; background: ${c.bar}; transition: width 0.6s ease;"></div>
                </div>

                <!-- Primary Reason -->
                <div style="margin-bottom: 12px; background: ${c.bg}; border-radius: 6px; padding: 8px 10px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${c.text}; letter-spacing: 0.5px;">Primary Threat Vector</div>
                    <div style="font-size: 13px; font-weight: 600; color: #0f172a; margin-top: 2px;">
                        ${a.reason}
                    </div>
                </div>

                <!-- Contributing Factors -->
                <div style="margin-bottom: 14px;">
                    <div style="font-size: 11.5px; font-weight: 700; color: #475569; margin-bottom: 6px;">Contributing Telemetry Factors:</div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        ${a.contributing_factors.length > 0 ? a.contributing_factors.map(f => `
                            <div style="font-size: 11.5px; color: #334155; display: flex; align-items: center; gap: 6px;">
                                <span style="color: ${c.text}; font-size: 12px;">•</span>
                                <span>${f}</span>
                            </div>
                        `).join('') : '<div style="font-size: 11.5px; color: #64748b;">No adverse hazard factors detected.</div>'}
                    </div>
                </div>

                <!-- Affected Routes -->
                <div style="margin-bottom: 14px;">
                    <div style="font-size: 11.5px; font-weight: 700; color: #475569; margin-bottom: 4px;">Arterial Corridors in Sector:</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                        ${a.affected_routes.map(r => `<span class="status-badge" style="background: #f1f5f9; color: #334155; font-size: 10.5px; font-weight: 600;">${r}</span>`).join('')}
                    </div>
                </div>

                <!-- Recommended Action Box -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 16px;">
                    <div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">Operational Advisory:</div>
                    <p style="font-size: 12px; color: #334155; margin: 0; line-height: 1.4;">${a.recommended_action}</p>
                </div>
            </div>

            <!-- Action Buttons -->
            <div style="display: flex; gap: 8px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
                <button type="button" class="panel-action-btn primary" style="flex: 1; padding: 7px 10px;" onclick="locateRiskOnMap(${a.latitude}, ${a.longitude}, '${a.location_name}')">
                    🗺️ View on Map
                </button>
                <button type="button" class="panel-action-btn" style="padding: 7px 10px;" onclick="switchTab('Live-Map'); setTimeout(() => openAreaSidePanel('${a.state}'), 300);">
                    Sector Intel
                </button>
            </div>
        </div>
    `;
}

function setRiskLevelFilter(lvl) {
    _activeRiskLevelFilter = lvl;
    renderRiskIntelligenceView();
}

function setRiskStateFilter(st) {
    _activeRiskStateFilter = st;
    renderRiskIntelligenceView();
}

async function triggerRiskRecalculation() {
    if (typeof showToast === "function") {
        showToast("Recalculating risk scores across all sectors...");
    }
    try {
        await NextraRisks.recalculate();
        if (typeof showToast === "function") {
            showToast("Risk recalculation complete! Refreshing telemetry.");
        }
        await renderRiskIntelligence();
    } catch (e) {
        if (typeof showToast === "function") {
            showToast("Recalculation requires Admin authorization.");
        }
    }
}

// Locate specific risk area on map
function locateRiskOnMap(lat, lng, label) {
    if (typeof switchTab === "function") {
        switchTab("Live-Map");
    }
    setTimeout(() => {
        if (typeof panToCoords === "function") {
            panToCoords(lat, lng, 11);
        }
        if (typeof openRiskSidePanel === "function") {
            openRiskSidePanel(label);
        }
        if (typeof showToast === "function") {
            showToast(`Inspecting Threat Zone: ${label}`);
        }
    }, 350);
}
