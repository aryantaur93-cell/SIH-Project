/**
 * NEXTRA - Commercial Driver Portal & In-Cab Telemetry Modules
 * My Route, Nearby Drivers Radar, Area Field Officer Card, and Road Hazard Reporting with Photo.
 */

// Render "My Route" Turn-by-Turn Hill Corridor View
async function renderMyRouteView() {
    const container = document.getElementById("driver-my-route-container");
    if (!container) return;

    container.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted);">
            <span class="pulse-dot" style="display:inline-block; margin-right:8px;"></span> Loading assigned consignment & route...
        </div>
    `;

    let shipment = null;
    try {
        if (typeof NextraShipments !== 'undefined' && NextraShipments.getMyAssignment) {
            shipment = await NextraShipments.getMyAssignment();
        }
    } catch (err) {
        console.warn("Error fetching driver assignment:", err);
    }

    if (!shipment) {
        container.innerHTML = `
            <div class="my-route-layout" style="text-align: center; padding: 48px 24px;">
                <div style="font-size: 48px; margin-bottom: 16px;">🚚</div>
                <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">No Active Consignment Assigned</h2>
                <p style="color: var(--text-muted); max-width: 480px; margin: 0 auto 20px auto; font-size: 14px;">
                    You are currently on standby. Dispatch has not assigned an active shipment to your roster. Check back shortly or contact the logistics dispatch desk.
                </p>
                <div style="display: inline-flex; gap: 12px;">
                    <button type="button" class="btn-primary-large" onclick="renderMyRouteView()">🔄 Check for New Dispatch</button>
                    <button type="button" class="action-btn-sm" style="padding: 10px 18px;" onclick="switchTab('Report-Issue')">📷 Report Road Hazard</button>
                </div>
            </div>
        `;
        return;
    }

    const shipCode = shipment.shipment_code || `SHP-${String(shipment.id).padStart(3, '0')}`;
    const vehicleReg = shipment.vehicle_registration || (shipment.vehicle_id ? `VX-${shipment.vehicle_id}` : 'Assigned Fleet');
    const vehicleType = shipment.vehicle_type ? ` · ${shipment.vehicle_type}` : '';
    const origin = shipment.origin || shipment.pickup_location || 'Origin Hub';
    const dest = shipment.destination || 'Destination Hub';
    const corridor = shipment.route_name || shipment.corridor || `${origin} ➔ ${dest}`;
    const eta = shipment.eta ? (shipment.eta.includes('T') ? new Date(shipment.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : shipment.eta) : 'En Route';
    const cargo = shipment.cargo || shipment.cargo_type || 'General Freight';
    const actualKg = shipment.weight_kg != null ? shipment.weight_kg : shipment.weight;
    const weight = actualKg ? (actualKg >= 100 ? `${(actualKg / 1000).toFixed(1)}T` : `${actualKg}T`) : 'Commercial Load';
    const status = (shipment.status || 'IN TRANSIT').replace('_', ' ');
    const risk = (shipment.risk || 'LOW').toUpperCase();
    const currLoc = shipment.current_location || `${origin} Highway`;

    const riskBadgeClass = risk === 'HIGH' || risk === 'CRITICAL' ? 'status-red' : (risk === 'MEDIUM' ? 'status-amber' : 'status-green');
    const statusBadgeClass = status === 'DELAYED' ? 'status-red' : (status === 'COMPLETED' ? 'status-green' : 'status-blue');

    container.innerHTML = `
        <div class="my-route-layout">
            <div class="route-summary-banner">
                <div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                        <span class="eyebrow dark-eyebrow" style="margin: 0;">Active Consignment: ${shipCode} · Vehicle: ${vehicleReg}${vehicleType}</span>
                        <span class="status-badge ${statusBadgeClass}">${status}</span>
                        <span class="status-badge ${riskBadgeClass}">Risk: ${risk}</span>
                    </div>
                    <h2 style="margin: 4px 0 6px 0;">${corridor}</h2>
                    <p style="margin: 0; color: var(--text-muted); font-size: 13px;">
                        📦 Cargo: <strong>${cargo} (${weight})</strong> · Priority: <strong style="text-transform: uppercase;">${shipment.priority || 'NORMAL'}</strong>
                    </p>
                </div>
                <div class="route-eta-box">
                    <span class="eta-time mono">${eta}</span>
                    <span class="eta-sub">Target Arrival (ETA)</span>
                </div>
            </div>

            <!-- STEP-BY-STEP WAYPOINTS -->
            <div class="waypoints-timeline">
                <div class="waypoint-item passed">
                    <div class="wp-icon">✓</div>
                    <div class="wp-content">
                        <strong>Origin: ${origin}</strong>
                        <p>Consignment loaded and dispatch cleared · Weight: ${weight}</p>
                    </div>
                </div>

                <div class="waypoint-item current">
                    <div class="wp-icon">📍</div>
                    <div class="wp-content">
                        <strong style="color: var(--primary);">Current Transit Corridor: ${currLoc}</strong>
                        <p>Telemetry active · En route along ${corridor}</p>
                        <span class="status-badge status-green">Vehicle On Track</span>
                    </div>
                </div>

                ${risk === 'HIGH' || risk === 'CRITICAL' ? `
                <div class="waypoint-item upcoming alert-spot">
                    <div class="wp-icon" style="background: #ef4444; color: #fff;">⚠️</div>
                    <div class="wp-content">
                        <strong style="color: #ef4444;">Terrain Hazard Alert: Monitored Sector</strong>
                        <p>Caution advisory active in this sector. Maintain safe following distance and reduced speed.</p>
                    </div>
                </div>
                ` : ''}

                <div class="waypoint-item upcoming">
                    <div class="wp-icon">🏁</div>
                    <div class="wp-content">
                        <strong>Destination: ${dest}</strong>
                        <p>Scheduled arrival ETA ${eta} · Receiving bay notified</p>
                    </div>
                </div>
            </div>

            <div style="margin-top: 16px; display: flex; gap: 12px; justify-content: flex-end;">
                <button type="button" class="action-btn-sm" style="padding: 8px 16px;" onclick="if (typeof trackAndHighlightShipment === 'function') trackAndHighlightShipment(${shipment.id});">
                    🗺️ View on Live Map
                </button>
                <button type="button" class="action-btn-sm" style="padding: 8px 16px;" onclick="switchTab('Report-Issue')">
                    📷 Report Hazard on Route
                </button>
            </div>
        </div>
    `;
}

// Render "Nearby Drivers" Proximity Radar
async function renderNearbyDriversList() {
    const container = document.getElementById("nearby-drivers-container");
    if (!container) return;

    container.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted);">⏳ Scanning live mountain corridors for commercial fleet units...</div>`;

    try {
        const drivers = (typeof NextraDrivers !== "undefined" && typeof NextraDrivers.getAll === "function")
            ? await NextraDrivers.getAll()
            : [];

        if (!drivers || drivers.length === 0) {
            container.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted);">No active commercial drivers detected in sector.</div>`;
            return;
        }

        const currentUser = typeof getActiveUser === 'function' ? getActiveUser() : null;
        const currentDriverName = currentUser ? (currentUser.name || "").toUpperCase() : "";

        container.innerHTML = `
            <div class="data-table-container">
                <div class="table-header-bar">
                    <div>
                        <span class="eyebrow dark-eyebrow">Corridor Proximity Radar</span>
                        <h2>Nearby Commercial Drivers (Northeast Fleet)</h2>
                        <p style="font-size: 12.5px; color: var(--text-muted);">Coordinate convoy movements, safety warnings, and mutual roadside assistance.</p>
                    </div>
                    <span class="status-badge status-green">📡 ${drivers.length} Drivers in Sector</span>
                </div>

                <div class="nearby-drivers-grid">
                    ${drivers.slice(0, 12).map((d, idx) => {
                        const isYou = currentDriverName && d.name && d.name.toUpperCase().includes(currentDriverName);
                        const statusClass = d.status === "ACTIVE" ? "status-green" : (d.status === "DELAYED" ? "status-red" : "status-amber");
                        const phone = d.phone || "+91 94350-00000";
                        const vehicleStr = d.vehicle_registration || `Unit ${d.driver_code}`;
                        const locationStr = d.assigned_state ? `${d.assigned_state} · ${d.assigned_district || 'Highway'}` : 'Northeast Corridor';
                        const dist = isYou ? "0.0 km (You)" : `${((idx + 1) * 4.2).toFixed(1)} km`;

                        return `
                            <div class="nearby-driver-card ${isYou ? 'current-user-card' : ''}">
                                <div class="nd-header">
                                    <div class="nd-avatar">👤</div>
                                    <div>
                                        <strong>${d.name} ${isYou ? '<span class="status-badge status-green">(You)</span>' : ''}</strong>
                                        <small class="mono">${vehicleStr} (${d.driver_code})</small>
                                    </div>
                                    <span class="status-badge ${statusClass}">${d.status}</span>
                                </div>
                                <div class="nd-details">
                                    <div>📍 <strong>Location:</strong> ${locationStr}</div>
                                    <div>📏 <strong>Proximity:</strong> <span class="mono">${dist}</span> · Rating: ★${d.rating || '4.8'}</div>
                                </div>
                                <div class="nd-action">
                                    <button type="button" class="btn-primary-large" style="width: 100%; justify-content: center; padding: 8px;" onclick="initiateDriverCall('${(d.name || '').replace(/'/g, "\\'")}', '${phone}')">
                                        📞 Radio / Call (${phone})
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    } catch (err) {
        console.warn("[Driver] Error loading nearby drivers:", err);
        container.innerHTML = `<div style="padding: 24px; color: #dc2626; text-align: center;">Failed to scan nearby drivers.</div>`;
    }
}

// Render "Area Field Officer" Card
async function renderAreaFieldOfficerCard() {
    const container = document.getElementById("area-field-officer-container");
    if (!container) return;

    container.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted);">⏳ Connecting to regional BRO ground truth command...</div>`;

    try {
        let officer = null;
        if (typeof NextraUsers !== "undefined" && typeof NextraUsers.getFieldOfficers === "function") {
            const officers = await NextraUsers.getFieldOfficers();
            if (Array.isArray(officers) && officers.length > 0) {
                const user = typeof getActiveUser === 'function' ? getActiveUser() : null;
                const userArea = (user && (user.assigned_area || user.assigned_state)) ? (user.assigned_area || user.assigned_state).toUpperCase() : "";
                officer = officers.find(o => (o.assigned_state || "").toUpperCase() === userArea || (o.assigned_district || "").toUpperCase().includes(userArea)) || officers[0];
            }
        }

        const officerName = officer ? officer.name : "Arjun Sharma";
        const officerPhone = (officer && officer.phone) ? officer.phone : "+91 94361-28901";
        const officerState = (officer && officer.assigned_state) ? officer.assigned_state : "Meghalaya";
        const officerDistrict = (officer && officer.assigned_district) ? officer.assigned_district : "Khasi & Jaintia Hills Sector";
        const officerId = (officer && officer.officer_id) ? officer.officer_id : "FO-001";

        container.innerHTML = `
            <div class="field-officer-contact-card">
                <div class="foc-header">
                    <div class="foc-avatar">👮</div>
                    <div>
                        <span class="eyebrow dark-eyebrow">Designated Ground Truth Authority · ${officerId}</span>
                        <h2>${officerName}</h2>
                        <p>Border Roads Organisation (BRO) Taskforce &amp; Disaster Inspection Officer</p>
                    </div>
                    <span class="status-badge status-green">ON PATROL IN YOUR SECTOR</span>
                </div>

                <div class="foc-body">
                    <div class="foc-info-grid">
                        <div>
                            <small>Assigned Sector</small>
                            <strong>${officerState} (${officerDistrict})</strong>
                        </div>
                        <div>
                            <small>Current Deployment</small>
                            <strong>Active Highway Patrol &amp; Clearance Zone</strong>
                        </div>
                        <div>
                            <small>Emergency Mobile / Satellite</small>
                            <strong class="mono">${officerPhone}</strong>
                        </div>
                        <div>
                            <small>Radio Frequency</small>
                            <strong class="mono">NER-BRO Ch. 4 (148.250 MHz)</strong>
                        </div>
                    </div>

                    <div class="foc-actions" style="margin-top: 20px; display: flex; gap: 12px;">
                        <button type="button" class="btn-primary-large" onclick="initiateOfficerCall('${officerPhone}')">
                            📞 Call Field Officer Directly (${officerPhone})
                        </button>
                        <button type="button" class="action-btn-sm" style="padding: 10px 16px; font-weight: 700;" onclick="switchTab('Report-Issue')">
                            📷 Transmit Road Photo to Officer
                        </button>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        console.warn("[Driver] Error loading area field officer card:", err);
        container.innerHTML = `<div style="padding: 24px; color: #dc2626; text-align: center;">Failed to retrieve sector officer credentials.</div>`;
    }
}

// Driver Call Trigger
function initiateDriverCall(driverName, phone) {
    if (typeof showToast === 'function') {
        showToast(`Connecting in-cab dispatch radio to ${driverName} (${phone})...`);
    }
}

// Officer Call Trigger
function initiateOfficerCall(phone) {
    if (typeof showToast === 'function') {
        showToast(`Calling Field Officer at ${phone}...`);
    }
}

// Render "Report Road Issue" Form with Photo Evidence Upload
function renderReportIssueForm() {
    const container = document.getElementById("report-issue-container");
    if (!container) return;

    container.innerHTML = `
        <div class="field-page-grid">
            <div class="planner-form-card">
                <span class="eyebrow dark-eyebrow">Live Incident Transmit</span>
                <h2>Report Road Hazard with Photo</h2>
                <p class="section-lede">Transmits instant telemetry to your Area Field Officer and Central Command. Assistive AI will scan the picture for road defects and landslides.</p>

                <form id="driver-report-form" onsubmit="handleDriverReportSubmit(event)">
                    <!-- FILE UPLOAD WITH PREVIEW -->
                    <div class="form-group">
                        <label>Attach Photo / Camera Evidence</label>
                        <div class="file-upload-box" id="file-upload-dropzone">
                            <input type="file" id="issue-photo-input" accept="image/*" onchange="handlePhotoSelect(event)" style="display: none;">
                            <div class="upload-prompt" onclick="document.getElementById('issue-photo-input').click()">
                                <span style="font-size: 32px;">📷</span>
                                <strong>Click to attach camera photo</strong>
                                <small>JPG, PNG, WebP or SVG · Max 10MB</small>
                            </div>
                            <div id="photo-preview-box" style="display: none; margin-top: 10px;">
                                <img id="photo-preview-img" src="assets/evidence_landslide.svg" alt="Preview" style="max-height: 160px; border-radius: 8px; border: 1px solid var(--border-card);">
                                <p style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">Photo attached. Ready for AI inspection.</p>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="issue-type">Hazard Classification</label>
                        <select id="issue-type" class="form-select">
                            <option value="LANDSLIDE" selected>⛰️ LANDSLIDE — Landslide &amp; Slope Collapse</option>
                            <option value="FLOOD">🌊 FLOOD — River Flash Flood / Submerged Road</option>
                            <option value="ROAD_BLOCKAGE">🚧 ROAD_BLOCKAGE — Total Road Blockage / Fallen Trees</option>
                            <option value="ROAD_DAMAGE">🕳️ ROAD_DAMAGE — Road Damage / Deep Potholes / Subsidence</option>
                            <option value="BRIDGE_DAMAGE">🌉 BRIDGE_DAMAGE — Bridge / Culvert Structural Damage</option>
                            <option value="ACCIDENT">💥 ACCIDENT — Vehicle Crash / Collision Obstruction</option>
                            <option value="HEAVY_TRAFFIC">🛑 HEAVY_TRAFFIC — Heavy Traffic Jam / Mountain Stoppage</option>
                            <option value="UNSAFE_ROAD">⚠️ UNSAFE_ROAD — Unsafe Road / Ice / Mudflow / Slippery</option>
                            <option value="WEATHER">🌧️ WEATHER — Dense Mountain Fog / Zero Visibility / Storm</option>
                            <option value="OTHER">❓ OTHER — Other Road Hazard</option>
                        </select>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div class="form-group">
                            <label for="issue-severity">Severity Rating</label>
                            <select id="issue-severity" class="form-select">
                                <option value="CRITICAL">Critical (Both Lanes Blocked)</option>
                                <option value="HIGH" selected>High (Single Lane Only)</option>
                                <option value="MEDIUM">Medium (Caution Required)</option>
                                <option value="LOW">Low (Minor Advisory)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="issue-state">State / Area</label>
                            <select id="issue-state" class="form-select">
                                <option value="Meghalaya" selected>Meghalaya</option>
                                <option value="Assam">Assam</option>
                                <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                                <option value="Nagaland">Nagaland</option>
                                <option value="Manipur">Manipur</option>
                                <option value="Mizoram">Mizoram</option>
                                <option value="Tripura">Tripura</option>
                                <option value="Sikkim">Sikkim</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="issue-location">GPS Coordinates / Highway Landmark</label>
                        <input type="text" id="issue-location" class="form-input" value="25.1000° N, 92.3500° E (NH-6 near Sonapur)" required>
                    </div>

                    <div class="form-group">
                        <label for="issue-description">Hazard Description &amp; Details</label>
                        <textarea id="issue-description" class="form-input" rows="3" placeholder="Describe obstruction size, vehicle passability, weather, etc." required>Large shale boulder and mudflow covers both lanes. Heavy vehicles halted. Clearance machinery needed.</textarea>
                    </div>

                    <button type="submit" id="driver-report-submit-btn" class="btn-primary-large" style="width: 100%; justify-content: center;">
                        🚀 Transmit Hazard Report &amp; Photo Evidence <span>→</span>
                    </button>
                </form>
            </div>

            <!-- INSTRUCTIONS & AI WORKFLOW GUIDE -->
            <div class="data-table-container">
                <div class="table-header-bar">
                    <div>
                        <span class="eyebrow dark-eyebrow">Safety Protocol</span>
                        <h2>Driver Photo Evidence Guidelines</h2>
                    </div>
                </div>
                <div style="padding: 16px; font-size: 13px; line-height: 1.6; color: #475569;">
                    <p style="margin-bottom: 12px;"><strong>1. Safety First:</strong> Park in a safe pull-off with hazard lights on before capturing photographs.</p>
                    <p style="margin-bottom: 12px;"><strong>2. Assistive AI Processing:</strong> Your photo is analyzed by NEXTRA Vision AI within 3 seconds to measure boulder volume, lane clearance, and flood depths.</p>
                    <p style="margin-bottom: 12px;"><strong>3. Human Field Verification:</strong> Your report is directly routed to your assigned Field Officer for official ground-truth verification.</p>
                    <div style="background: var(--primary-light); padding: 12px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.3);">
                        <strong style="color: var(--primary);">Emergency Hotline:</strong>
                        <p style="margin: 4px 0 0; font-size: 12px;">North Eastern BRO Highway Disaster Command: <strong>1800-345-0066</strong></p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Handles photo file selection
function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            const previewBox = document.getElementById("photo-preview-box");
            const previewImg = document.getElementById("photo-preview-img");
            if (previewBox && previewImg) {
                previewImg.src = evt.target.result;
                previewBox.style.display = "block";
            }
        };
        reader.readAsDataURL(file);
    }
}

// Submits Driver Road Incident with Real File Upload to Backend
async function handleDriverReportSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById("driver-report-submit-btn");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = "⏳ Transmitting Report to Central Grid...";
    }

    try {
        const photoInput = document.getElementById("issue-photo-input");
        const file = (photoInput && photoInput.files && photoInput.files[0]) ? photoInput.files[0] : null;

        const incidentType = document.getElementById("issue-type").value;
        const severity = document.getElementById("issue-severity").value;
        const state = document.getElementById("issue-state").value;
        const locationStr = document.getElementById("issue-location").value.trim();
        const description = document.getElementById("issue-description").value.trim();

        // Coordinates parsing if GPS provided
        let lat = null, lng = null;
        const gpsMatch = locationStr.match(/([0-9]+\.[0-9]+)°?\s*N[,\s]+([0-9]+\.[0-9]+)°?\s*E/i);
        if (gpsMatch) {
            lat = parseFloat(gpsMatch[1]);
            lng = parseFloat(gpsMatch[2]);
        }

        // Offline resilience for Drivers
        if (window.NextraOffline && !NextraOffline.isOnline()) {
            try {
                const saved = await NextraOffline.saveOfflineReport({
                    incident_type: incidentType,
                    severity: severity,
                    state: state,
                    location_name: locationStr,
                    description: description,
                    latitude: lat,
                    longitude: lng
                }, file);

                if (typeof showToast === 'function') {
                    showToast(`📡 In-Cab Offline: Hazard saved locally (${saved.client_report_id}). Status: SYNC PENDING.`);
                }

                const form = document.getElementById("driver-report-form");
                if (form) form.reset();
                const previewBox = document.getElementById("photo-preview-box");
                if (previewBox) previewBox.style.display = "none";
                switchTab("Dashboard");
            } catch (saveErr) {
                console.error("Failed to save driver report offline:", saveErr);
                alert("Error buffering report offline: " + saveErr.message);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = "🚀 Transmit Hazard Report &amp; Photo Evidence <span>→</span>";
                }
            }
            return;
        }

        try {
            const formData = new FormData();
            formData.append("incident_type", incidentType);
            formData.append("severity", severity);
            formData.append("state", state);
            formData.append("location_name", locationStr);
            formData.append("description", description);
            if (lat && lng) {
                formData.append("latitude", lat);
                formData.append("longitude", lng);
            }
            if (file) {
                formData.append("image", file);
            }

            const report = await NextraReports.submit(formData);

            if (typeof showToast === 'function') {
                showToast(`Hazard reported! Registered as ${report.report_code || 'RPT'} in Verification Queue.`);
            }

            // Refresh live platform state across all modules
            if (typeof window.refreshNextraLiveData === 'function') {
                await window.refreshNextraLiveData();
            } else {
                if (typeof loadAndRenderMapData === 'function') loadAndRenderMapData();
                if (typeof loadNotificationCount === 'function') loadNotificationCount();
            }

            // Reset form
            const form = document.getElementById("driver-report-form");
            if (form) form.reset();
            const previewBox = document.getElementById("photo-preview-box");
            if (previewBox) previewBox.style.display = "none";

            // Return to Dashboard or Live Map
            switchTab("Dashboard");

        } catch (err) {
            console.error("Error submitting driver report:", err);
            const errMsg = (err && err.message) ? err.message.toLowerCase() : "";
            const isNetworkFailure = !navigator.onLine || 
                errMsg.includes("failed to fetch") || 
                errMsg.includes("network") || 
                errMsg.includes("connection") ||
                errMsg.includes("offline") ||
                errMsg.includes("load failed");

            if (isNetworkFailure && window.NextraOffline) {
                try {
                    const saved = await NextraOffline.saveOfflineReport({
                        incident_type: incidentType,
                        severity: severity,
                        state: state,
                        location_name: locationStr,
                        description: description,
                        latitude: lat,
                        longitude: lng
                    }, file);

                    if (typeof showToast === 'function') {
                        showToast(`📡 Network Lost: Hazard saved locally (${saved.client_report_id}). Status: SYNC PENDING.`);
                    }

                    const form = document.getElementById("driver-report-form");
                    if (form) form.reset();
                    const previewBox = document.getElementById("photo-preview-box");
                    if (previewBox) previewBox.style.display = "none";
                    switchTab("Dashboard");
                    return;
                } catch (saveErr) {
                    console.error("Failed to buffer report offline:", saveErr);
                }
            }
            alert(err.message || "Failed to submit field report.");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = "🚀 Transmit Hazard Report &amp; Photo Evidence <span>→</span>";
            }
        }
    } catch (err) {
        console.error("Error preparing driver report:", err);
        alert(err.message || "Failed to prepare field report.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "🚀 Transmit Hazard Report &amp; Photo Evidence <span>→</span>";
        }
    }
}

