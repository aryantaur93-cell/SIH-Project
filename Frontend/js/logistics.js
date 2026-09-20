/**
 * NEXTRA - Logistics, Transportation Requests & Fleet Optimization Engine
 * Manages freight dispatch, driver/truck matching algorithm, and route tradeoff comparisons.
 */

// Render Transportation Requests List & Creation Form
function renderTransportRequestsList() {
    const container = document.getElementById("transport-requests-container");
    if (!container) return;

    const requests = NextraApi.getTransportationRequests();
    const user = getActiveUser();
    const canCreate = (user && (user.role === 'logistics' || user.role === 'admin'));

    container.innerHTML = `
        <div class="field-page-grid">
            <!-- CREATE REQUEST FORM -->
            <div class="planner-form-card">
                <span class="eyebrow dark-eyebrow">Freight Dispatch Portal</span>
                <h2>Create Transportation Request</h2>
                <p class="section-lede">Specify consignment parameters. Our AI matching engine will identify suitable available trucks and certified hill drivers.</p>

                <form id="transport-request-form" onsubmit="handleCreateTransportRequest(event)">
                    <div class="form-group">
                        <label for="req-pickup">Pickup Logistics Hub</label>
                        <select id="req-pickup" class="form-select" required>
                            <option value="Guwahati Central Hub">Guwahati Central Hub (Assam)</option>
                            <option value="Shillong Mountain Depot">Shillong Mountain Depot (Meghalaya)</option>
                            <option value="Silchar Valley Hub">Silchar Valley Hub (Assam)</option>
                            <option value="Dimapur Rail Terminal">Dimapur Rail Terminal (Nagaland)</option>
                            <option value="Agartala Multi-Modal Complex">Agartala Complex (Tripura)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="req-destination">Destination Logistics Hub</label>
                        <select id="req-destination" class="form-select" required>
                            <option value="Shillong Mountain Depot" selected>Shillong Mountain Depot (Meghalaya)</option>
                            <option value="Imphal Logistics Center">Imphal Logistics Center (Manipur)</option>
                            <option value="Aizawl Freight Terminal">Aizawl Freight Terminal (Mizoram)</option>
                            <option value="Itanagar Northern Base">Itanagar Northern Base (Arunachal)</option>
                            <option value="Gangtok Valley Depot">Gangtok Valley Depot (Sikkim)</option>
                        </select>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div class="form-group">
                            <label for="req-cargo">Cargo Type</label>
                            <input type="text" id="req-cargo" class="form-input" placeholder="e.g. Fresh Vegetables, Medicines" value="Organic Agri-Vegetables" required>
                        </div>
                        <div class="form-group">
                            <label for="req-weight">Cargo Weight (kg)</label>
                            <input type="number" id="req-weight" class="form-input" placeholder="e.g. 2500" value="2500" required>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div class="form-group">
                            <label for="req-vehicle">Required Vehicle Type</label>
                            <select id="req-vehicle" class="form-select">
                                <option value="Refrigerated Truck">Refrigerated Truck (Cold-Chain)</option>
                                <option value="Heavy Multi-Axle Carrier">Heavy Multi-Axle (14-Wheeler)</option>
                                <option value="All-Terrain 4x4 Mountain Transport">All-Terrain 4x4 Mountain Transport</option>
                                <option value="Covered Medium Freight">Covered Medium Freight</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="req-priority">Priority Level</label>
                            <select id="req-priority" class="form-select">
                                <option value="HIGH">High (Perishable / Urgent)</option>
                                <option value="NORMAL" selected>Normal Supply Chain</option>
                                <option value="LOW">Low (Bulk Material)</option>
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
                        <label for="req-notes">Additional Mountain Transit Notes</label>
                        <textarea id="req-notes" class="form-input" rows="2" placeholder="e.g. Temperature must be maintained below 4°C; avoid steep unpaved bypasses."></textarea>
                    </div>

                    ${canCreate ? `
                        <button type="submit" class="btn-primary-large" style="width: 100%; justify-content: center;">
                            🔍 Find Transport &amp; Match Fleet <span>→</span>
                        </button>
                    ` : `
                        <p style="font-size: 12px; color: var(--text-muted); text-align: center;">Logistics or Administrator permissions required to submit requests.</p>
                    `}
                </form>

                <!-- REAL-TIME MATCH RESULT BOX -->
                <div id="match-result-container" style="display: none; margin-top: 20px;"></div>
            </div>

            <!-- REQUESTS FEED TABLE -->
            <div class="data-table-container">
                <div class="table-header-bar">
                    <div>
                        <span class="eyebrow dark-eyebrow">Active Pipeline</span>
                        <h2>Transportation Requests Queue</h2>
                    </div>
                    <span class="status-badge status-green">${requests.length} Requests</span>
                </div>

                <div class="requests-list">
                    ${requests.map(req => `
                        <div class="transport-req-card">
                            <div class="tr-card-header">
                                <strong>${req.request_id} · ${req.cargo_type}</strong>
                                <span class="status-badge ${req.priority === 'HIGH' ? 'status-red' : 'status-amber'}">${req.priority} PRIORITY</span>
                            </div>
                            <div class="tr-card-corridor">
                                <span>📍 ${req.pickup_location}</span>
                                <span style="color: var(--primary);">➔</span>
                                <span>🏁 ${req.destination}</span>
                            </div>
                            <div class="tr-card-meta">
                                <span>⚖️ ${req.cargo_weight_kg} kg</span>
                                <span>•</span>
                                <span>🚛 ${req.required_vehicle}</span>
                                <span>•</span>
                                <span>📅 ${req.required_date}</span>
                            </div>
                            ${req.matched_truck ? `
                                <div class="tr-card-matched">
                                    <span class="matched-pill">✓ Matched Vehicle</span>
                                    <span><strong>${req.matched_truck}</strong> (Driver: ${req.matched_driver})</span>
                                    <span class="status-badge status-green">CONFIRMED</span>
                                </div>
                            ` : `
                                <div class="tr-card-unmatched">
                                    <span>Awaiting Vehicle Match</span>
                                    <button class="action-btn-sm" onclick="showMatchFor('${req.request_id}')">Match Fleet →</button>
                                </div>
                            `}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// Handles form submission to create transportation request
function handleCreateTransportRequest(e) {
    e.preventDefault();

    const data = {
        pickup_location: document.getElementById("req-pickup").value,
        destination: document.getElementById("req-destination").value,
        cargo_type: document.getElementById("req-cargo").value,
        cargo_weight_kg: document.getElementById("req-weight").value,
        required_vehicle: document.getElementById("req-vehicle").value,
        priority: document.getElementById("req-priority").value,
        required_date: document.getElementById("req-date").value,
        required_time: document.getElementById("req-time").value,
        notes: document.getElementById("req-notes").value
    };

    try {
        const req = NextraApi.createTransportationRequest(data);
        const matchBox = document.getElementById("match-result-container");
        if (matchBox) {
            matchBox.style.display = "block";
            matchBox.innerHTML = `
                <div class="match-success-card">
                    <span class="status-badge status-green">✓ Fleet Matched Successfully</span>
                    <h4 style="margin: 8px 0 4px; font-size: 15px;">Assigned Truck: ${req.matched_truck}</h4>
                    <p style="font-size: 12.5px; margin-bottom: 8px;"><strong>Driver:</strong> ${req.matched_driver} · <strong>Capacity:</strong> ${req.cargo_weight_kg} kg · <strong>Status:</strong> Ready for Pickup</p>
                    <button type="button" class="btn-primary-large" style="padding: 7px 12px; font-size: 11.5px;" onclick="renderTransportRequestsList()">
                        Save &amp; View in Pipeline <span>→</span>
                    </button>
                </div>
            `;
        }
        if (typeof showToast === 'function') {
            showToast(`Transportation Request ${req.request_id} created and matched with ${req.matched_truck}!`);
        }
    } catch (err) {
        alert(err.message);
    }
}

// Render Shipments Roster
function renderShipmentsTable() {
    const container = document.getElementById("shipments-table-container");
    if (!container) return;

    const shipments = NextraApi.getShipments();

    container.innerHTML = `
        <div class="data-table-container">
            <div class="table-header-bar">
                <div>
                    <h2>🚚 Active Consignments &amp; Mountain Shipments</h2>
                    <p style="font-size: 12.5px; color: var(--text-muted);">Real-time tracking, corridor status, ETA, and cargo temperatures across the North Eastern Region.</p>
                </div>
                <span class="status-badge status-green">${shipments.length} Active Consignments</span>
            </div>

            <table class="custom-table">
                <thead>
                    <tr>
                        <th>Tracking Code</th>
                        <th>Origin → Destination</th>
                        <th>Cargo &amp; Weight</th>
                        <th>Assigned Unit</th>
                        <th>Corridor Route</th>
                        <th>ETA / Status</th>
                        <th>Risk Assessment</th>
                    </tr>
                </thead>
                <tbody>
                    ${shipments.map(s => `
                        <tr>
                            <td><strong class="mono" style="color: var(--primary);">${s.tracking_code}</strong></td>
                            <td>${s.origin} ➔<br><small style="color: var(--text-muted);">${s.destination}</small></td>
                            <td>${s.cargo}<br><small class="mono">${s.weight_kg} kg</small></td>
                            <td><strong>${s.truck_id}</strong><br><small>${s.driver_name}</small></td>
                            <td>${s.corridor}</td>
                            <td>
                                <span class="status-badge ${s.status_class}">${s.status}</span><br>
                                <small>${s.eta}</small>
                            </td>
                            <td>
                                <span class="status-badge ${s.risk_level === 'CRITICAL' ? 'status-red' : s.risk_level === 'MEDIUM' ? 'status-amber' : 'status-green'}">${s.risk_level}</span><br>
                                <small style="font-size: 10px; color: var(--text-muted);">${s.risk_reason}</small>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Render Drivers Directory
function renderDriversRoster() {
    const container = document.getElementById("drivers-roster-container");
    if (!container) return;

    const drivers = NextraApi.getDrivers();

    container.innerHTML = `
        <div class="data-table-container">
            <div class="table-header-bar">
                <div>
                    <h2>👤 Certified Commercial Fleet Operators (Drivers)</h2>
                    <p style="font-size: 12.5px; color: var(--text-muted);">Mountain driving certified personnel, live corridor positions, and dispatch availability.</p>
                </div>
                <span class="status-badge status-green">${drivers.length} Registered Drivers</span>
            </div>

            <table class="custom-table">
                <thead>
                    <tr>
                        <th>Driver ID</th>
                        <th>Full Name</th>
                        <th>License Number</th>
                        <th>Phone / Dispatch</th>
                        <th>Assigned Truck</th>
                        <th>Current Corridor Location</th>
                        <th>Safety Rating</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${drivers.map(d => `
                        <tr>
                            <td><strong class="mono">${d.id}</strong></td>
                            <td><strong>${d.name}</strong><br><small>${d.experience_years} Years Mountain Exp</small></td>
                            <td><span class="mono">${d.license}</span></td>
                            <td>${d.phone}</td>
                            <td><strong style="color: var(--primary);">${d.assigned_truck}</strong></td>
                            <td>${d.current_location}</td>
                            <td>⭐ ${d.rating} <small>(${d.safety_score})</small></td>
                            <td><span class="status-badge ${d.status === 'AVAILABLE' ? 'status-green' : d.status === 'IN_TRANSIT' ? 'status-blue' : 'status-red'}">${d.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Render Trucks Fleet
function renderTrucksFleet() {
    const container = document.getElementById("trucks-fleet-container");
    if (!container) return;

    const trucks = NextraApi.getTrucks();

    container.innerHTML = `
        <div class="data-table-container">
            <div class="table-header-bar">
                <div>
                    <h2>🚛 Commercial Freight Vehicle Fleet (Trucks)</h2>
                    <p style="font-size: 12.5px; color: var(--text-muted);">Vehicle specifications, cold-chain temperature telemetry, maintenance logs, and load limits.</p>
                </div>
                <span class="status-badge status-green">${trucks.length} Vehicles in Roster</span>
            </div>

            <table class="custom-table">
                <thead>
                    <tr>
                        <th>Truck ID</th>
                        <th>Plate Number</th>
                        <th>Vehicle Classification</th>
                        <th>Payload Capacity</th>
                        <th>Current Staging Location</th>
                        <th>Assigned Driver</th>
                        <th>Active Assignment</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${trucks.map(t => `
                        <tr>
                            <td><strong class="mono" style="color: var(--primary);">${t.truck_id}</strong></td>
                            <td><span class="mono">${t.plate_number}</span></td>
                            <td>${t.vehicle_type}<br><small>Temp: ${t.temp_celsius}</small></td>
                            <td><strong class="mono">${(t.capacity_kg / 1000).toFixed(1)} Tons</strong></td>
                            <td>${t.current_location}</td>
                            <td>${t.driver_name}</td>
                            <td><small>${t.current_assignment}</small></td>
                            <td><span class="status-badge ${t.status === 'AVAILABLE' ? 'status-green' : t.status === 'IN_TRANSIT' ? 'status-blue' : 'status-red'}">${t.status}</span></td>
                        </tr>
                    `).join('')}
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
