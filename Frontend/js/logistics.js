/**
 * NEXTRA - Logistics, Transportation Requests & Fleet Optimization Engine
 * Manages freight dispatch, driver/truck matching algorithm, and route tradeoff comparisons.
 */

// ── 1. Transportation Requests Engine (Phase 10) ───────────
async function renderTransportRequestsList() {
    const container = document.getElementById("transport-requests-container");
    if (!container) return;

    const user = typeof getActiveUser === "function" ? getActiveUser() : null;
    const canCreate = (user && (user.role === 'logistics' || user.role === 'admin'));

    container.innerHTML = `
        <div style="padding: 30px; text-align: center; color: var(--text-muted);">
            <p>⏳ Loading transportation requests from central freight grid...</p>
        </div>
    `;

    let requests = [];
    try {
        if (typeof NextraTransportRequests !== "undefined" && typeof NextraTransportRequests.getAll === "function") {
            requests = await NextraTransportRequests.getAll();
        }
    } catch (err) {
        console.warn("[NEXTRA Logistics] Error loading transport requests:", err);
    }

    container.innerHTML = `
        <div class="field-page-grid">
            <!-- CREATE REQUEST FORM -->
            <div class="planner-form-card">
                <span class="eyebrow dark-eyebrow">Freight Dispatch Portal</span>
                <h2>Create Transportation Request</h2>
                <p class="section-lede">Specify consignment parameters. Central matching will identify certified hill drivers and commercial vehicles.</p>

                <form id="transport-request-form" onsubmit="handleCreateTransportRequest(event)">
                    <div class="form-group">
                        <label for="req-pickup">Pickup Logistics Hub</label>
                        <select id="req-pickup" class="form-select" required>
                            <option value="Guwahati Central Hub" selected>Guwahati Central Hub (Assam)</option>
                            <option value="Shillong Mountain Depot">Shillong Mountain Depot (Meghalaya)</option>
                            <option value="Silchar Valley Hub">Silchar Valley Hub (Assam)</option>
                            <option value="Dimapur Rail Freight Hub">Dimapur Rail Freight Hub (Nagaland)</option>
                            <option value="Agartala Multi-Modal Complex">Agartala Complex (Tripura)</option>
                            <option value="Siliguri Corridor Entry">Siliguri Corridor Entry (WB/NER)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="req-destination">Destination Logistics Hub</label>
                        <select id="req-destination" class="form-select" required>
                            <option value="Shillong Civil Hospital">Shillong Civil Hospital (Meghalaya)</option>
                            <option value="Imphal Logistics Center" selected>Imphal Logistics Center (Manipur)</option>
                            <option value="Aizawl Freight Terminal">Aizawl Freight Terminal (Mizoram)</option>
                            <option value="Itanagar Northern Base">Itanagar Northern Base (Arunachal)</option>
                            <option value="Gangtok Valley Depot">Gangtok Valley Depot (Sikkim)</option>
                            <option value="Kohima Staging Depot">Kohima Staging Depot (Nagaland)</option>
                        </select>
                    </div>

                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px;">
                        <div class="form-group">
                            <label for="req-cargo">Cargo Type</label>
                            <input type="text" id="req-cargo" class="form-input" placeholder="e.g. Essential Medical Vaccines, Agri-Vegetables" value="Organic Agri-Produce" required>
                        </div>
                        <div class="form-group">
                            <label for="req-weight">Weight (kg)</label>
                            <input type="number" id="req-weight" class="form-input" placeholder="e.g. 2500" value="2800" required>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                        <div class="form-group">
                            <label for="req-vehicle">Vehicle Type</label>
                            <select id="req-vehicle" class="form-select">
                                <option value="Refrigerated Medium Truck" selected>Refrigerated Medium Truck</option>
                                <option value="Heavy Multi-Axle Carrier">Heavy Multi-Axle Carrier</option>
                                <option value="All-Terrain 4x4 Mountain Transport">All-Terrain 4x4</option>
                                <option value="Covered Medium Freight">Covered Medium Freight</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="req-capacity">Payload Capacity (kg)</label>
                            <input type="number" id="req-capacity" class="form-input" placeholder="e.g. 5000" value="5000">
                        </div>
                        <div class="form-group">
                            <label for="req-priority">Priority</label>
                            <select id="req-priority" class="form-select">
                                <option value="HIGH">High (Urgent / Perishable)</option>
                                <option value="NORMAL" selected>Normal</option>
                                <option value="LOW">Low</option>
                                <option value="URGENT">Urgent</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div class="form-group">
                            <label for="req-date">Required Date</label>
                            <input type="date" id="req-date" class="form-input" value="2026-09-25" required>
                        </div>
                        <div class="form-group">
                            <label for="req-time">Required Time</label>
                            <input type="time" id="req-time" class="form-input" value="09:00" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="req-notes">Mountain Transit Notes</label>
                        <textarea id="req-notes" class="form-input" rows="2" placeholder="e.g. Cold-chain storage mandatory; bypass Sonapur rockfall section."></textarea>
                    </div>

                    ${canCreate ? `
                        <button type="submit" id="btn-submit-req" class="btn-primary-large" style="width: 100%; justify-content: center;">
                            🔍 Submit Request &amp; Match Fleet <span>→</span>
                        </button>
                    ` : `
                        <p style="font-size: 12px; color: var(--text-muted); text-align: center;">Logistics or Admin permissions required to submit requests.</p>
                    `}
                </form>

                <div id="match-result-container" style="display: none; margin-top: 20px;"></div>
            </div>

            <!-- REQUESTS FEED TABLE -->
            <div class="data-table-container">
                <div class="table-header-bar">
                    <div>
                        <span class="eyebrow dark-eyebrow">Active Pipeline</span>
                        <h2>Transportation Requests Queue</h2>
                    </div>
                    <span class="status-badge status-green" id="req-count-badge">${requests.length} Requests</span>
                </div>

                <div class="requests-list" id="transport-requests-list">
                    ${requests.length === 0 ? `
                        <div style="padding: 30px; text-align: center; color: var(--text-muted);">
                            <p>No transportation requests currently submitted.</p>
                        </div>
                    ` : requests.map(req => {
                        const code = req.request_code || req.request_id || `TR-${req.id}`;
                        const isMatched = req.matched_vehicle_registration || req.matched_truck;
                        const statusColors = {
                            "REQUESTED": "status-amber",
                            "MATCHING": "status-amber",
                            "ASSIGNED": "status-blue",
                            "IN TRANSIT": "status-green",
                            "IN_TRANSIT": "status-green",
                            "DELAYED": "status-red",
                            "COMPLETED": "status-green",
                            "CANCELLED": "status-gray"
                        };
                        const statColor = statusColors[req.status] || "status-amber";

                        return `
                            <div class="transport-req-card" id="tr-card-${req.id}">
                                <div class="tr-card-header">
                                    <strong>${code} · ${req.cargo_type}</strong>
                                    <div style="display: flex; gap: 6px; align-items: center;">
                                        <span class="status-badge ${req.priority === 'HIGH' || req.priority === 'URGENT' ? 'status-red' : 'status-amber'}">${req.priority}</span>
                                        <span class="status-badge ${statColor}">${req.status}</span>
                                    </div>
                                </div>
                                <div class="tr-card-corridor">
                                    <span>📍 ${req.pickup_location}</span>
                                    <span style="color: var(--primary);">➔</span>
                                    <span>🏁 ${req.destination}</span>
                                </div>
                                <div class="tr-card-meta">
                                    <span>⚖️ ${req.weight_kg} kg</span>
                                    <span>•</span>
                                    <span>🚛 ${req.vehicle_type || 'Commercial Freight'}</span>
                                    <span>•</span>
                                    <span>📅 ${req.required_date || 'Standard'} ${req.required_time || ''}</span>
                                </div>
                                ${isMatched ? `
                                    <div class="tr-card-matched" style="display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <span class="matched-pill">✓ Matched Vehicle</span>
                                            <span><strong>${req.matched_vehicle_registration || req.matched_truck}</strong> (Driver: ${req.matched_driver_name || req.matched_driver || 'Assigned'})</span>
                                        </div>
                                        <select class="map-filter-select" style="padding: 4px 8px; font-size: 11px;" onchange="handleTransportRequestStatusChange(${req.id}, this.value)">
                                            <option value="">Update Status...</option>
                                            <option value="ASSIGNED" ${req.status === 'ASSIGNED' ? 'selected' : ''}>ASSIGNED</option>
                                            <option value="IN TRANSIT" ${req.status === 'IN TRANSIT' || req.status === 'IN_TRANSIT' ? 'selected' : ''}>IN TRANSIT</option>
                                            <option value="DELAYED" ${req.status === 'DELAYED' ? 'selected' : ''}>DELAYED</option>
                                            <option value="COMPLETED" ${req.status === 'COMPLETED' ? 'selected' : ''}>COMPLETED</option>
                                            <option value="CANCELLED" ${req.status === 'CANCELLED' ? 'selected' : ''}>CANCELLED</option>
                                        </select>
                                    </div>
                                ` : `
                                    <div class="tr-card-unmatched" style="display: flex; justify-content: space-between; align-items: center;">
                                        <span>Awaiting Vehicle Match</span>
                                        <button class="action-btn-sm" onclick="handleMatchTransportRequest(${req.id})">⚡ Match Fleet Now →</button>
                                    </div>
                                `}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
}

// Handles form submission to create transportation request
async function handleCreateTransportRequest(e) {
    e.preventDefault();

    const submitBtn = document.getElementById("btn-submit-req");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = "⏳ Submitting Request...";
    }

    const data = {
        pickup_location: document.getElementById("req-pickup").value,
        destination: document.getElementById("req-destination").value,
        cargo_type: document.getElementById("req-cargo").value,
        weight_kg: parseFloat(document.getElementById("req-weight").value) || 2500,
        vehicle_type: document.getElementById("req-vehicle").value,
        capacity_kg: parseFloat(document.getElementById("req-capacity")?.value) || 5000,
        priority: document.getElementById("req-priority").value,
        required_date: document.getElementById("req-date").value,
        required_time: document.getElementById("req-time").value,
        notes: document.getElementById("req-notes").value
    };

    try {
        let req = null;
        if (typeof NextraTransportRequests !== "undefined" && typeof NextraTransportRequests.create === "function") {
            req = await NextraTransportRequests.create(data);
        }

        if (typeof showToast === 'function' && req) {
            showToast(`Transportation Request ${req.request_code || req.request_id || 'TR'} created!`);
        }

        // Auto-match fleet immediately
        if (req && req.id && typeof NextraTransportRequests !== "undefined" && typeof NextraTransportRequests.match === "function") {
            try {
                const matched = await NextraTransportRequests.match(req.id);
                req = matched;
            } catch (mErr) {
                console.warn("[Logistics] Auto-match skipped:", mErr);
            }
        }

        renderTransportRequestsList();
        if (typeof window.refreshNextraLiveData === 'function') {
            await window.refreshNextraLiveData();
        } else if (typeof loadNotificationCount === 'function') {
            loadNotificationCount();
        }

    } catch (err) {
        console.error("Error creating transportation request:", err);
        alert(err.message || "Failed to create transportation request.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "🔍 Submit Request &amp; Match Fleet <span>→</span>";
        }
    }
}

// Match fleet for an existing request
async function handleMatchTransportRequest(requestId) {
    try {
        if (typeof NextraTransportRequests !== "undefined" && typeof NextraTransportRequests.match === "function") {
            const updated = await NextraTransportRequests.match(requestId);
            if (typeof showToast === 'function') {
                showToast(`Request ${updated.request_code} matched with ${updated.matched_vehicle_registration || 'Vehicle'}!`);
            }
            renderTransportRequestsList();
            if (typeof window.refreshNextraLiveData === 'function') {
                await window.refreshNextraLiveData();
            } else if (typeof loadNotificationCount === 'function') {
                loadNotificationCount();
            }
        }
    } catch (err) {
        alert(err.message || "Failed to match fleet.");
    }
}

// Status update for transport request
async function handleTransportRequestStatusChange(requestId, newStatus) {
    if (!newStatus) return;
    try {
        if (typeof NextraTransportRequests !== "undefined" && typeof NextraTransportRequests.updateStatus === "function") {
            await NextraTransportRequests.updateStatus(requestId, { status: newStatus });
            if (typeof showToast === 'function') {
                showToast(`Request updated to ${newStatus}`);
            }
            renderTransportRequestsList();
            if (typeof window.refreshNextraLiveData === 'function') {
                await window.refreshNextraLiveData();
            } else if (typeof loadNotificationCount === 'function') {
                loadNotificationCount();
            }
        }
    } catch (err) {
        alert(err.message || "Failed to update request status.");
    }
}

// ── 2. Shipments Roster & Telemetry (Phase 10) ─────────────
let _cachedShipmentsList = [];

async function renderShipmentsTable() {
    const container = document.getElementById("shipments-table-container");
    if (!container) return;

    container.innerHTML = `
        <div style="padding: 30px; text-align: center; color: var(--text-muted);">
            <p>⏳ Loading active mountain consignments from database...</p>
        </div>
    `;

    try {
        let shipments = [];
        if (typeof NextraShipments !== "undefined" && typeof NextraShipments.getAll === "function") {
            shipments = await NextraShipments.getAll();
        }
        _cachedShipmentsList = Array.isArray(shipments) ? shipments : [];
    } catch (e) {
        console.warn("[Logistics] Error fetching shipments:", e);
        _cachedShipmentsList = [];
    }

    applyShipmentsTableFilter();
}

function applyShipmentsTableFilter() {
    const container = document.getElementById("shipments-table-container");
    if (!container) return;

    const statusVal = (document.getElementById("filter-shipment-status")?.value || "ALL").toUpperCase();
    const searchVal = (document.getElementById("filter-shipment-search")?.value || "").trim().toLowerCase();

    const filtered = _cachedShipmentsList.filter(s => {
        const stat = (s.status || "PLANNED").toUpperCase().replace(" ", "_");
        if (statusVal !== "ALL") {
            const targetStat = statusVal.replace(" ", "_");
            if (stat !== targetStat && (s.status || "").toUpperCase() !== statusVal) return false;
        }
        if (searchVal) {
            const code = (s.shipment_code || s.tracking_code || "").toLowerCase();
            const cargo = (s.cargo_type || s.cargo || "").toLowerCase();
            const origin = (s.pickup_location || s.origin || "").toLowerCase();
            const dest = (s.destination || "").toLowerCase();
            const drv = (s.driver_name || "").toLowerCase();
            const veh = (s.vehicle_registration || s.truck_id || "").toLowerCase();
            if (!code.includes(searchVal) && !cargo.includes(searchVal) && !origin.includes(searchVal) && !dest.includes(searchVal) && !drv.includes(searchVal) && !veh.includes(searchVal)) return false;
        }
        return true;
    });

    const statusBadgeClasses = {
        "IN_TRANSIT": "status-green",
        "IN TRANSIT": "status-green",
        "ASSIGNED": "status-blue",
        "REQUESTED": "status-amber",
        "MATCHING": "status-amber",
        "DELAYED": "status-red",
        "AT_RISK": "status-red",
        "COMPLETED": "status-green",
        "DELIVERED": "status-green",
        "PLANNED": "status-amber",
        "CANCELLED": "status-gray"
    };

    container.innerHTML = `
        <div class="data-table-container">
            <div class="table-header-bar" style="flex-wrap: wrap; gap: 12px;">
                <div>
                    <h2>🚚 Active Consignments &amp; Mountain Shipments</h2>
                    <p style="font-size: 12.5px; color: var(--text-muted);">Real-time tracking, corridor routes, ETA, and cargo telemetry across the North Eastern Region.</p>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span class="status-badge status-green">${filtered.length} of ${_cachedShipmentsList.length} Active Consignments</span>
                    <button type="button" class="btn-primary-large" onclick="openCreateShipmentModal()" style="padding: 8px 14px; font-size: 12px;">
                        + New Shipment
                    </button>
                </div>
            </div>

            <!-- Shipments Filter Bar -->
            <div style="display: flex; gap: 10px; flex-wrap: wrap; padding: 12px 18px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; align-items: center;">
                <input type="text" id="filter-shipment-search" class="map-filter-input" placeholder="Search code, cargo, hub..." value="${document.getElementById('filter-shipment-search')?.value || ''}" oninput="applyShipmentsTableFilter()" style="max-width: 220px;">
                
                <select id="filter-shipment-status" class="map-filter-select" onchange="applyShipmentsTableFilter()">
                    <option value="ALL">All Statuses</option>
                    <option value="IN TRANSIT" ${statusVal === 'IN TRANSIT' || statusVal === 'IN_TRANSIT' ? 'selected' : ''}>IN TRANSIT</option>
                    <option value="ASSIGNED" ${statusVal === 'ASSIGNED' ? 'selected' : ''}>ASSIGNED</option>
                    <option value="DELAYED" ${statusVal === 'DELAYED' ? 'selected' : ''}>DELAYED</option>
                    <option value="COMPLETED" ${statusVal === 'COMPLETED' ? 'selected' : ''}>COMPLETED</option>
                    <option value="REQUESTED" ${statusVal === 'REQUESTED' ? 'selected' : ''}>REQUESTED</option>
                    <option value="CANCELLED" ${statusVal === 'CANCELLED' ? 'selected' : ''}>CANCELLED</option>
                </select>

                <button type="button" class="btn-filter-reset" onclick="document.getElementById('filter-shipment-search').value=''; document.getElementById('filter-shipment-status').value='ALL'; applyShipmentsTableFilter();">Reset</button>
            </div>

            <table class="custom-table">
                <thead>
                    <tr>
                        <th>Consignment Code</th>
                        <th>Origin → Destination</th>
                        <th>Cargo &amp; Weight</th>
                        <th>Assigned Unit</th>
                        <th>Route Corridor</th>
                        <th>Status</th>
                        <th>ETA</th>
                        <th>Risk Assessment</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.length === 0 ? `
                        <tr><td colspan="9" style="text-align:center; padding:24px; color:var(--text-muted);">No shipments match the selected filters.</td></tr>
                    ` : filtered.map(s => {
                        const code = s.shipment_code || s.tracking_code || `SHP-${s.id}`;
                        const origin = s.pickup_location || s.origin || "NER Hub";
                        const dest = s.destination || "Destination Hub";
                        const cargo = s.cargo_type || s.cargo || "Consignment";
                        const weight = s.weight_kg || 0;
                        const drv = s.driver_name || (s.driver ? s.driver.name : "Unassigned");
                        const veh = s.vehicle_registration || s.truck_id || (s.vehicle ? s.vehicle.registration : "Unassigned");
                        const corridor = s.route_name || s.corridor || "Direct Highway";
                        const stat = (s.status || "PLANNED").toUpperCase();
                        const bClass = statusBadgeClasses[stat] || statusBadgeClasses[stat.replace(" ", "_")] || "status-green";
                        const risk = (s.risk_level || "LOW").toUpperCase();
                        const riskClass = risk === 'CRITICAL' ? 'status-red' : risk === 'HIGH' ? 'status-amber' : risk === 'MEDIUM' ? 'status-amber' : 'status-green';

                        return `
                            <tr>
                                <td>
                                    <strong class="mono" style="color: var(--primary);">${code}</strong>
                                    <br><span class="status-badge ${s.priority === 'HIGH' || s.priority === 'URGENT' ? 'status-red' : ''}" style="font-size:10px;">${s.priority || 'NORMAL'}</span>
                                </td>
                                <td>
                                    <strong>${origin}</strong> ➔<br>
                                    <small style="color: var(--text-muted);">${dest}</small>
                                </td>
                                <td>
                                    ${cargo}<br>
                                    <small class="mono">${weight} kg</small>
                                </td>
                                <td>
                                    <strong class="mono" style="color:#0f172a;">${veh}</strong><br>
                                    <small>👤 ${drv}</small>
                                </td>
                                <td>
                                    <span style="font-size: 12px;">🛣️ ${corridor}</span>
                                </td>
                                <td>
                                    <select class="map-filter-select" style="padding: 4px 6px; font-size: 11px; font-weight:700;" onchange="handleShipmentStatusChange(${s.id}, this.value)">
                                        <option value="ASSIGNED" ${stat === 'ASSIGNED' ? 'selected' : ''}>ASSIGNED</option>
                                        <option value="IN TRANSIT" ${stat === 'IN TRANSIT' || stat === 'IN_TRANSIT' ? 'selected' : ''}>IN TRANSIT</option>
                                        <option value="DELAYED" ${stat === 'DELAYED' ? 'selected' : ''}>DELAYED</option>
                                        <option value="COMPLETED" ${stat === 'COMPLETED' || stat === 'DELIVERED' ? 'selected' : ''}>COMPLETED</option>
                                        <option value="CANCELLED" ${stat === 'CANCELLED' ? 'selected' : ''}>CANCELLED</option>
                                    </select>
                                </td>
                                <td>
                                    <strong class="mono" style="font-size: 11.5px;">${s.eta || 'On Schedule'}</strong>
                                </td>
                                <td>
                                    <span class="status-badge ${riskClass}">${risk}</span>
                                    ${s.risk_reason ? `<br><small style="font-size: 10px; color: #dc2626;">⚠️ ${s.risk_reason}</small>` : ''}
                                </td>
                                <td>
                                    <button type="button" class="action-btn-sm" style="white-space: nowrap;" onclick="trackAndHighlightShipment(${s.id})">
                                        🗺️ Track
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ── 3. Shipment Creation & Status Actions (Phase 10) ───────
async function openCreateShipmentModal() {
    const modal = document.getElementById("modal-create-shipment");
    if (modal) {
        modal.style.display = "flex";
        modal.classList.add("active");
    }

    const driverSelect = document.getElementById("shp-driver");
    const vehicleSelect = document.getElementById("shp-vehicle");
    const routeSelect = document.getElementById("shp-route");

    // Populate Drivers
    if (driverSelect) {
        try {
            const drivers = await NextraDrivers.getAll();
            driverSelect.innerHTML = `<option value="">Select driver...</option>` +
                drivers.map(d => `<option value="${d.id}">${d.name} (${d.driver_code || d.driver_id || 'DRV'} · ${d.status})</option>`).join("");
        } catch (e) {
            console.warn("Could not load drivers for modal:", e);
        }
    }

    // Populate Vehicles
    if (vehicleSelect) {
        try {
            const vehicles = await NextraVehicles.getAll();
            vehicleSelect.innerHTML = `<option value="">Select vehicle...</option>` +
                vehicles.map(v => `<option value="${v.id}">${v.registration_number || v.registration} - ${v.vehicle_type} (${((v.capacity_kg || 16000) / 1000).toFixed(1)}T)</option>`).join("");
        } catch (e) {
            console.warn("Could not load vehicles for modal:", e);
        }
    }

    // Populate Routes
    if (routeSelect) {
        try {
            const routes = await NextraRoutes.getAll();
            routeSelect.innerHTML = `<option value="">Select highway corridor...</option>` +
                routes.map(r => `<option value="${r.id}">${r.name} (${r.origin} ➔ ${r.destination})</option>`).join("");
        } catch (e) {
            console.warn("Could not load routes for modal:", e);
        }
    }
}

async function handleCreateShipmentSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById("btn-submit-shipment");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = "⏳ Dispatching Consignment...";
    }

    const driverId = document.getElementById("shp-driver").value;
    const vehicleId = document.getElementById("shp-vehicle").value;
    const routeId = document.getElementById("shp-route").value;

    const data = {
        origin: document.getElementById("shp-origin").value,
        pickup_location: document.getElementById("shp-origin").value,
        destination: document.getElementById("shp-destination").value,
        cargo_type: document.getElementById("shp-cargo").value,
        weight_kg: parseFloat(document.getElementById("shp-weight").value) || 3500,
        priority: document.getElementById("shp-priority").value,
        driver_id: driverId ? parseInt(driverId) : null,
        vehicle_id: vehicleId ? parseInt(vehicleId) : null,
        route_id: routeId ? parseInt(routeId) : null,
        eta: document.getElementById("shp-eta").value || "On Schedule",
        corridor: `${document.getElementById("shp-origin").value} ➔ ${document.getElementById("shp-destination").value}`,
        notes: document.getElementById("shp-notes").value
    };

    try {
        const shp = await NextraShipments.create(data);
        if (typeof showToast === 'function') {
            showToast(`Shipment ${shp.shipment_code} created and dispatched!`);
        }

        closeModals();
        renderShipmentsTable();

        if (typeof window.refreshNextraLiveData === 'function') {
            await window.refreshNextraLiveData();
        } else {
            if (typeof loadAndRenderMapData === 'function') loadAndRenderMapData();
            if (typeof loadNotificationCount === 'function') loadNotificationCount();
        }

    } catch (err) {
        console.error("Error creating shipment:", err);
        alert(err.message || "Failed to create shipment.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "🚀 Dispatch Shipment <span>→</span>";
        }
    }
}

async function handleShipmentStatusChange(shipmentId, newStatus) {
    if (!newStatus) return;
    try {
        const updated = await NextraShipments.updateStatus(shipmentId, { status: newStatus });
        if (typeof showToast === 'function') {
            showToast(`Shipment ${updated.shipment_code} status changed to ${newStatus}`);
        }
        renderShipmentsTable();
        if (typeof window.refreshNextraLiveData === 'function') {
            await window.refreshNextraLiveData();
        } else {
            if (typeof loadAndRenderMapData === 'function') loadAndRenderMapData();
            if (typeof loadNotificationCount === 'function') loadNotificationCount();
        }
    } catch (err) {
        alert(err.message || "Failed to update shipment status.");
    }
}

// ── Live Drivers Directory (Connected to Backend API) ──────────
let _cachedDriversList = [];

async function renderDriversRoster() {
    const container = document.getElementById("drivers-roster-container");
    if (!container) return;

    container.innerHTML = `
        <div style="padding: 30px; text-align: center; color: var(--text-muted);">
            <p>⏳ Loading live driver roster from backend...</p>
        </div>
    `;

    try {
        let drivers = [];
        if (typeof NextraDrivers !== "undefined" && typeof NextraDrivers.getAll === "function") {
            drivers = await NextraDrivers.getAll();
        }
        _cachedDriversList = Array.isArray(drivers) ? drivers : [];
    } catch (e) {
        console.warn("[Logistics] Fallback loading drivers:", e);
        _cachedDriversList = [];
    }

    applyDriversTableFilter();
}

function applyDriversTableFilter() {
    const container = document.getElementById("drivers-roster-container");
    if (!container) return;

    const stateVal = (document.getElementById("filter-driver-state")?.value || "ALL").toLowerCase();
    const statusVal = (document.getElementById("filter-driver-status")?.value || "ALL").toUpperCase();
    const searchVal = (document.getElementById("filter-driver-search")?.value || "").trim().toLowerCase();

    const filtered = _cachedDriversList.filter(d => {
        const area = (d.assigned_area || (d.current_location && d.current_location.state) || d.current_location || "").toLowerCase();
        if (stateVal !== "all" && !area.includes(stateVal)) return false;

        const stat = (d.status || "ACTIVE").toUpperCase();
        if (statusVal !== "ALL" && stat !== statusVal) return false;

        if (searchVal) {
            const name = (d.name || "").toLowerCase();
            const id = (d.driver_id || d.id || "").toLowerCase();
            const phone = (d.phone || "").toLowerCase();
            const lic = (d.license_number || d.license || "").toLowerCase();
            if (!name.includes(searchVal) && !id.includes(searchVal) && !phone.includes(searchVal) && !lic.includes(searchVal)) return false;
        }
        return true;
    });

    const statusBadgeClasses = {
        "ACTIVE": "status-green",
        "IDLE": "status-amber",
        "DELAYED": "status-red",
        "OFFLINE": "status-gray",
        "MAINTENANCE": "status-purple",
        "AVAILABLE": "status-green",
        "IN_TRANSIT": "status-blue"
    };

    container.innerHTML = `
        <div class="data-table-container">
            <div class="table-header-bar" style="flex-wrap: wrap; gap: 14px;">
                <div>
                    <h2>👤 Drivers</h2>
                    <p style="font-size: 12.5px; color: var(--text-muted);">Mountain driving certified personnel, live corridor positions, and dispatch availability from backend.</p>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span class="status-badge status-green">${filtered.length} of ${_cachedDriversList.length} Active Drivers</span>
                </div>
            </div>

            <!-- Table Filters Bar -->
            <div style="display:flex; gap:10px; flex-wrap:wrap; padding:12px 18px; background:#f8fafc; border-bottom:1px solid #e2e8f0; align-items:center;">
                <input type="text" id="filter-driver-search" class="map-filter-input" placeholder="Search name, ID, phone..." value="${document.getElementById('filter-driver-search')?.value || ''}" oninput="applyDriversTableFilter()" style="max-width:200px;">
                
                <select id="filter-driver-state" class="map-filter-select" onchange="applyDriversTableFilter()">
                    <option value="ALL">All States</option>
                    <option value="Assam" ${stateVal === 'assam' ? 'selected' : ''}>Assam</option>
                    <option value="Arunachal Pradesh" ${stateVal === 'arunachal pradesh' ? 'selected' : ''}>Arunachal Pradesh</option>
                    <option value="Meghalaya" ${stateVal === 'meghalaya' ? 'selected' : ''}>Meghalaya</option>
                    <option value="Manipur" ${stateVal === 'manipur' ? 'selected' : ''}>Manipur</option>
                    <option value="Mizoram" ${stateVal === 'mizoram' ? 'selected' : ''}>Mizoram</option>
                    <option value="Nagaland" ${stateVal === 'nagaland' ? 'selected' : ''}>Nagaland</option>
                    <option value="Tripura" ${stateVal === 'tripura' ? 'selected' : ''}>Tripura</option>
                    <option value="Sikkim" ${stateVal === 'sikkim' ? 'selected' : ''}>Sikkim</option>
                </select>

                <select id="filter-driver-status" class="map-filter-select" onchange="applyDriversTableFilter()">
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE" ${statusVal === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
                    <option value="IDLE" ${statusVal === 'IDLE' ? 'selected' : ''}>IDLE</option>
                    <option value="DELAYED" ${statusVal === 'DELAYED' ? 'selected' : ''}>DELAYED</option>
                    <option value="OFFLINE" ${statusVal === 'OFFLINE' ? 'selected' : ''}>OFFLINE</option>
                    <option value="MAINTENANCE" ${statusVal === 'MAINTENANCE' ? 'selected' : ''}>MAINTENANCE</option>
                </select>
                
                <button type="button" class="btn-filter-reset" onclick="document.getElementById('filter-driver-search').value=''; document.getElementById('filter-driver-state').value='ALL'; document.getElementById('filter-driver-status').value='ALL'; applyDriversTableFilter();">Reset</button>
            </div>

            <table class="custom-table">
                <thead>
                    <tr>
                        <th>Driver ID</th>
                        <th>Full Name</th>
                        <th>License Number</th>
                        <th>Phone / Dispatch</th>
                        <th>Assigned Truck</th>
                        <th>Assigned Area / Location</th>
                        <th>Safety Rating</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(d => {
                        const drvId = d.driver_id || d.id || `DRV-${d.id}`;
                        const truckPlate = d.assigned_vehicle_reg || (d.vehicle ? d.vehicle.registration : (d.assigned_truck || "Unassigned"));
                        const locStr = d.assigned_area || (d.current_location ? `${d.current_location.district}, ${d.current_location.state}` : (d.current_location || "NER Corridor"));
                        const stat = (d.status || "ACTIVE").toUpperCase();
                        const bClass = statusBadgeClasses[stat] || "status-green";
                        return `
                            <tr>
                                <td><strong class="mono" style="color:var(--primary);">${drvId}</strong></td>
                                <td><strong>${d.name}</strong><br><small>${d.experience_years || 5} Yrs Mountain Exp</small></td>
                                <td><span class="mono">${d.license_number || d.license || 'DL-NER-2024'}</span></td>
                                <td><a href="tel:${d.phone}" style="color:var(--primary); text-decoration:none;">${d.phone}</a></td>
                                <td><strong class="mono" style="color:#0f172a;">${truckPlate}</strong></td>
                                <td>${locStr}</td>
                                <td>⭐ ${d.rating || 4.8} <small>(${d.safety_score ? (typeof d.safety_score === 'number' ? Math.round(d.safety_score * 100) + '%' : d.safety_score) : '95%'})</small></td>
                                <td><span class="status-badge ${bClass}">${stat}</span></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ── Live Trucks Fleet (Connected to Backend API) ─────────────
let _cachedTrucksList = [];

async function renderTrucksFleet() {
    const container = document.getElementById("trucks-fleet-container");
    if (!container) return;

    container.innerHTML = `
        <div style="padding: 30px; text-align: center; color: var(--text-muted);">
            <p>⏳ Loading live commercial fleet from backend...</p>
        </div>
    `;

    try {
        let trucks = [];
        if (typeof NextraVehicles !== "undefined" && typeof NextraVehicles.getAll === "function") {
            trucks = await NextraVehicles.getAll();
        }
        _cachedTrucksList = Array.isArray(trucks) ? trucks : [];
    } catch (e) {
        console.warn("[Logistics] Fallback loading trucks:", e);
        _cachedTrucksList = [];
    }

    applyTrucksTableFilter();
}

function applyTrucksTableFilter() {
    const container = document.getElementById("trucks-fleet-container");
    if (!container) return;

    const stateVal = (document.getElementById("filter-truck-state")?.value || "ALL").toLowerCase();
    const statusVal = (document.getElementById("filter-truck-status")?.value || "ALL").toUpperCase();
    const searchVal = (document.getElementById("filter-truck-search")?.value || "").trim().toLowerCase();

    const filtered = _cachedTrucksList.filter(t => {
        const area = (t.state || (t.current_location && t.current_location.state) || t.current_location || "").toLowerCase();
        if (stateVal !== "all" && !area.includes(stateVal)) return false;

        const stat = (t.status || "ACTIVE").toUpperCase();
        if (statusVal !== "ALL" && stat !== statusVal) return false;

        if (searchVal) {
            const id = (t.vehicle_id || t.truck_id || "").toLowerCase();
            const plate = (t.registration || t.plate_number || "").toLowerCase();
            const type = (t.vehicle_type || "").toLowerCase();
            const drv = (t.driver ? t.driver.name : (t.driver_name || "")).toLowerCase();
            if (!id.includes(searchVal) && !plate.includes(searchVal) && !type.includes(searchVal) && !drv.includes(searchVal)) return false;
        }
        return true;
    });

    const statusBadgeClasses = {
        "ACTIVE": "status-green",
        "IDLE": "status-amber",
        "DELAYED": "status-red",
        "OFFLINE": "status-gray",
        "MAINTENANCE": "status-purple",
        "AVAILABLE": "status-green",
        "IN_TRANSIT": "status-blue"
    };

    container.innerHTML = `
        <div class="data-table-container">
            <div class="table-header-bar" style="flex-wrap: wrap; gap: 14px;">
                <div>
                    <h2>🚛 Commercial Freight Vehicle Fleet (Trucks)</h2>
                    <p style="font-size: 12.5px; color: var(--text-muted);">Real-time telemetry, capacity specifications, active consignments, and driver pairings from backend.</p>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span class="status-badge status-green">${filtered.length} of ${_cachedTrucksList.length} Vehicles in Roster</span>
                </div>
            </div>

            <!-- Table Filters Bar -->
            <div style="display:flex; gap:10px; flex-wrap:wrap; padding:12px 18px; background:#f8fafc; border-bottom:1px solid #e2e8f0; align-items:center;">
                <input type="text" id="filter-truck-search" class="map-filter-input" placeholder="Search plate, ID, type..." value="${document.getElementById('filter-truck-search')?.value || ''}" oninput="applyTrucksTableFilter()" style="max-width:200px;">
                
                <select id="filter-truck-state" class="map-filter-select" onchange="applyTrucksTableFilter()">
                    <option value="ALL">All States</option>
                    <option value="Assam" ${stateVal === 'assam' ? 'selected' : ''}>Assam</option>
                    <option value="Arunachal Pradesh" ${stateVal === 'arunachal pradesh' ? 'selected' : ''}>Arunachal Pradesh</option>
                    <option value="Meghalaya" ${stateVal === 'meghalaya' ? 'selected' : ''}>Meghalaya</option>
                    <option value="Manipur" ${stateVal === 'manipur' ? 'selected' : ''}>Manipur</option>
                    <option value="Mizoram" ${stateVal === 'mizoram' ? 'selected' : ''}>Mizoram</option>
                    <option value="Nagaland" ${stateVal === 'nagaland' ? 'selected' : ''}>Nagaland</option>
                    <option value="Tripura" ${stateVal === 'tripura' ? 'selected' : ''}>Tripura</option>
                    <option value="Sikkim" ${stateVal === 'sikkim' ? 'selected' : ''}>Sikkim</option>
                </select>

                <select id="filter-truck-status" class="map-filter-select" onchange="applyTrucksTableFilter()">
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE" ${statusVal === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
                    <option value="IDLE" ${statusVal === 'IDLE' ? 'selected' : ''}>IDLE</option>
                    <option value="DELAYED" ${statusVal === 'DELAYED' ? 'selected' : ''}>DELAYED</option>
                    <option value="OFFLINE" ${statusVal === 'OFFLINE' ? 'selected' : ''}>OFFLINE</option>
                    <option value="MAINTENANCE" ${statusVal === 'MAINTENANCE' ? 'selected' : ''}>MAINTENANCE</option>
                </select>
                
                <button type="button" class="btn-filter-reset" onclick="document.getElementById('filter-truck-search').value=''; document.getElementById('filter-truck-state').value='ALL'; document.getElementById('filter-truck-status').value='ALL'; applyTrucksTableFilter();">Reset</button>
            </div>

            <table class="custom-table">
                <thead>
                    <tr>
                        <th>Truck ID</th>
                        <th>Registration Plate</th>
                        <th>Classification</th>
                        <th>Payload Capacity</th>
                        <th>Staging Location</th>
                        <th>Assigned Driver</th>
                        <th>Active Consignment</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(t => {
                        const vehId = t.vehicle_id || t.truck_id || `TRK-${t.id}`;
                        const plate = t.registration || t.plate_number;
                        const capTons = ((t.capacity_kg || 16000) / 1000).toFixed(1);
                        const locStr = t.current_location ? `${t.current_location.district}, ${t.current_location.state}` : (t.state || "NER Hub");
                        const drvName = t.driver ? t.driver.name : (t.driver_name || "Unassigned");
                        const shpStr = t.current_shipment ? `📦 ${t.current_shipment.shipment_code} (${t.current_shipment.cargo_type})` : (t.current_assignment || "Staged & Available");
                        const stat = (t.status || "ACTIVE").toUpperCase();
                        const bClass = statusBadgeClasses[stat] || "status-green";
                        return `
                            <tr>
                                <td><strong class="mono" style="color: var(--primary);">${vehId}</strong></td>
                                <td><span class="mono" style="font-weight:700; color:#0f172a;">${plate}</span></td>
                                <td>${t.vehicle_type}<br><small style="color:var(--text-muted);">${t.temp_celsius || 'Ambient (21°C)'}</small></td>
                                <td><strong class="mono">${capTons} Tons</strong></td>
                                <td>${locStr}</td>
                                <td>${drvName}</td>
                                <td><small>${shpStr}</small></td>
                                <td><span class="status-badge ${bClass}">${stat}</span></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Route Tradeoff Comparator
function renderRoutePlanningTradeoffs() {
    const container = document.getElementById("route-tradeoffs-container");
    if (!container) return;

    container.innerHTML = `
        <div class="route-comparison-card">
            <div class="rc-header">
                <h3>⚡ AI Mountain Route Tradeoff Comparison</h3>
                <span class="eyebrow dark-eyebrow">Corridor: Guwahati Central Hub ➔ Silchar Valley Hub</span>
            </div>

            <div class="rc-grid">
                <!-- ROUTE A (SHORTEST) -->
                <div class="rc-option-box">
                    <div class="rc-box-top">
                        <h4>Route A: Direct NH-6 via Sonapur</h4>
                        <span class="status-badge status-red">CRITICAL RISK</span>
                    </div>
                    <ul class="rc-specs">
                        <li><strong>Distance:</strong> 310 km</li>
                        <li><strong>Standard ETA:</strong> 8h 15m</li>
                        <li><strong>Road Condition:</strong> <span class="text-danger">Active Mudslide at Km 141.8</span></li>
                        <li><strong>Weather:</strong> Heavy Rain (70 mm/hr)</li>
                        <li><strong>Traffic Delay:</strong> +4h 30m stoppage</li>
                        <li><strong>Accessibility:</strong> Restricted (Heavy Vehicles Blocked)</li>
                    </ul>
                </div>

                <!-- ROUTE B (AI RECOMMENDED) -->
                <div class="rc-option-box recommended">
                    <div class="rc-box-top">
                        <h4>Route B: Umran-Bhoirymbong Bypass</h4>
                        <span class="status-badge status-green">AI RECOMMENDED</span>
                    </div>
                    <ul class="rc-specs">
                        <li><strong>Distance:</strong> 328 km (+18 km)</li>
                        <li><strong>Predicted ETA:</strong> 8h 55m (+40 min travel)</li>
                        <li><strong>Road Condition:</strong> Paved all-weather road</li>
                        <li><strong>Weather:</strong> Light Drizzle (18 mm/hr)</li>
                        <li><strong>Traffic Delay:</strong> Smooth corridor (0 min delay)</li>
                        <li><strong>Accessibility:</strong> Full 40T load capacity</li>
                    </ul>
                    <div class="rc-ai-reason">
                        <strong>Why AI Recommends Route B:</strong> Although Route B is 18 km longer, it completely bypasses the blocked Sonapur tunnel where 4+ hour clearance is in progress, saving an estimated 3 hours and 50 minutes of idle delay while protecting cold-chain cargo integrity.
                    </div>
                </div>
            </div>
        </div>
    `;
}
