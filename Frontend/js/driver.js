/**
 * NEXTRA - Commercial Driver Portal & In-Cab Telemetry Modules
 * My Route, Nearby Drivers Radar, Area Field Officer Card, and Road Hazard Reporting with Photo.
 */

// Render "My Route" Turn-by-Turn Hill Corridor View
function renderMyRouteView() {
    const container = document.getElementById("driver-my-route-container");
    if (!container) return;

    container.innerHTML = `
        <div class="my-route-layout">
            <div class="route-summary-banner">
                <div>
                    <span class="eyebrow dark-eyebrow">Active Consignment: SHP-801 · Vehicle: VX-104</span>
                    <h2>NH-6 Mountain Corridor: Guwahati ➔ Shillong</h2>
                    <p>Total Distance: 104 km · Completed: 56 km · Remaining: 48 km</p>
                </div>
                <div class="route-eta-box">
                    <span class="eta-time mono">11:42 AM</span>
                    <span class="eta-sub">Estimated Arrival (1h 15m)</span>
                </div>
            </div>

            <!-- STEP-BY-STEP WAYPOINTS -->
            <div class="waypoints-timeline">
                <div class="waypoint-item passed">
                    <div class="wp-icon">✓</div>
                    <div class="wp-content">
                        <strong>Guwahati Central Freight Hub (Km 0)</strong>
                        <p>Departed at 08:30 AM IST · Temperature logged: 3.2°C (Optimal)</p>
                    </div>
                </div>

                <div class="waypoint-item passed">
                    <div class="wp-icon">✓</div>
                    <div class="wp-content">
                        <strong>Nongpoh Toll Plaza (Km 48)</strong>
                        <p>Passed at 09:45 AM IST · Weight check passed: 2.4T payload</p>
                    </div>
                </div>

                <div class="waypoint-item current">
                    <div class="wp-icon">📍</div>
                    <div class="wp-content">
                        <strong style="color: var(--primary);">Current Location: Umiam Lake Viaduct (Km 78)</strong>
                        <p>Speed: 42 km/h · Weather: 65mm/hr Rain &amp; Mist · Road: Wet tarmac</p>
                        <span class="status-badge status-green">Vehicle On Track</span>
                    </div>
                </div>

                <div class="waypoint-item upcoming alert-spot">
                    <div class="wp-icon" style="background: #ef4444; color: #fff;">⚠️</div>
                    <div class="wp-content">
                        <strong style="color: #ef4444;">Caution Zone: Mawlai Hill Descent (Km 92)</strong>
                        <p>Steep 12% slope gradient ahead. Heavy rainfall advisory in effect. Maintain 30 km/h.</p>
                    </div>
                </div>

                <div class="waypoint-item upcoming">
                    <div class="wp-icon">🏁</div>
                    <div class="wp-content">
                        <strong>Destination: Shillong Civil Hospital Depot (Km 104)</strong>
                        <p>Scheduled arrival 11:42 AM IST · Cold-chain storage team notified</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render "Nearby Drivers" Proximity Radar
function renderNearbyDriversList() {
    const container = document.getElementById("nearby-drivers-container");
    if (!container) return;

    const drivers = [
        { name: "Rahul Borah", vehicle: "Tata Signa 2823 (VX-104)", corridor: "NH-6 Umiam (Current User)", dist: "0.0 km", status: "DRIVING", phone: "+91 94350-12841" },
        { name: "Bikramjeet Chutia", vehicle: "14-Wheeler Multi-Axle (NE-7210)", corridor: "NH-29 Nagaon", dist: "8.4 km behind", status: "DRIVING", phone: "+91 94350-29314" },
        { name: "Pranab Kalita", vehicle: "Flatbed Container (NE-5532)", corridor: "Sonapur Bypass Rest Stop", dist: "18.2 km ahead", status: "HALTED", phone: "+91 98540-88312" },
        { name: "Sonam Dorjee", vehicle: "4x4 Mountain Transport (NE-9104)", corridor: "Guwahati Freight Yard", dist: "32.0 km", status: "AVAILABLE", phone: "+91 98620-41092" }
    ];

    container.innerHTML = `
        <div class="data-table-container">
            <div class="table-header-bar">
                <div>
                    <span class="eyebrow dark-eyebrow">Corridor Proximity Radar</span>
                    <h2>Nearby Commercial Drivers (NH-6 / NH-27)</h2>
                    <p style="font-size: 12.5px; color: var(--text-muted);">Coordinate convoy movements, safety warnings, and mutual roadside assistance.</p>
                </div>
                <span class="status-badge status-green">📡 4 Drivers in Sector</span>
            </div>

            <div class="nearby-drivers-grid">
                ${drivers.map(d => `
                    <div class="nearby-driver-card ${d.dist === '0.0 km' ? 'current-user-card' : ''}">
                        <div class="nd-header">
                            <div class="nd-avatar">👤</div>
                            <div>
                                <strong>${d.name} ${d.dist === '0.0 km' ? '<span class="status-badge status-green">(You)</span>' : ''}</strong>
                                <small>${d.vehicle}</small>
                            </div>
                            <span class="status-badge ${d.status === 'DRIVING' ? 'status-green' : 'status-amber'}">${d.status}</span>
                        </div>
                        <div class="nd-details">
                            <div>📍 <strong>Location:</strong> ${d.corridor}</div>
                            <div>📏 <strong>Proximity:</strong> <span class="mono">${d.dist}</span></div>
                        </div>
                        <div class="nd-action">
                            <button type="button" class="btn-primary-large" style="width: 100%; justify-content: center; padding: 8px;" onclick="initiateDriverCall('${d.name}', '${d.phone}')">
                                📞 Connect via Radio / Phone (${d.phone})
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Render "Area Field Officer" Card
function renderAreaFieldOfficerCard() {
    const container = document.getElementById("area-field-officer-container");
    if (!container) return;

    container.innerHTML = `
        <div class="field-officer-contact-card">
            <div class="foc-header">
                <div class="foc-avatar">👮</div>
                <div>
                    <span class="eyebrow dark-eyebrow">Designated Ground Truth Authority</span>
                    <h2>Arjun Sharma</h2>
                    <p>BRO Taskforce 44 &amp; Disaster Inspection Officer</p>
                </div>
                <span class="status-badge status-green">ON PATROL IN YOUR SECTOR</span>
            </div>

            <div class="foc-body">
                <div class="foc-info-grid">
                    <div>
                        <small>Assigned Sector</small>
                        <strong>Meghalaya Sector 4 (Khasi &amp; Jaintia Hills Corridor)</strong>
                    </div>
                    <div>
                        <small>Current Deployment</small>
                        <strong>NH-6 Sonapur Tunnel Clearance Zone</strong>
                    </div>
                    <div>
                        <small>Emergency Mobile / Satellite</small>
                        <strong class="mono">+91 94361-28901</strong>
                    </div>
                    <div>
                        <small>Radio Frequency</small>
                        <strong class="mono">NER-BRO Ch. 4 (148.250 MHz)</strong>
                    </div>
                </div>

                <div class="foc-actions" style="margin-top: 20px; display: flex; gap: 12px;">
                    <button type="button" class="btn-primary-large" onclick="initiateOfficerCall('+91 94361-28901')">
                        📞 Call Field Officer Directly
                    </button>
                    <button type="button" class="action-btn-sm" style="padding: 10px 16px; font-weight: 700;" onclick="switchTab('Report-Issue')">
                        📷 Transmit Road Photo to Officer
                    </button>
                </div>
            </div>
        </div>
    `;
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
        showToast(`Calling Field Officer Arjun Sharma at ${phone}...`);
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
                            <option value="Landslide &amp; Slope Collapse" selected>Landslide &amp; Slope Collapse</option>
                            <option value="Severe Road Surface Damage / Potholes">Severe Road Surface Damage / Potholes</option>
                            <option value="Vehicle Accident Obstruction">Vehicle Accident Obstruction</option>
                            <option value="River Flash Flood / Submerged Road">River Flash Flood / Submerged Road</option>
                            <option value="Dense Mountain Fog / Zero Visibility">Dense Mountain Fog / Zero Visibility</option>
                            <option value="Bridge / Culvert Structural Damage">Bridge / Culvert Structural Damage</option>
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
                                <option value="MEGHALAYA" selected>Meghalaya</option>
                                <option value="ASSAM">Assam</option>
                                <option value="ARUNACHAL">Arunachal Pradesh</option>
                                <option value="NAGALAND">Nagaland</option>
                                <option value="MANIPUR">Manipur</option>
                                <option value="MIZORAM">Mizoram</option>
                                <option value="TRIPURA">Tripura</option>
                                <option value="SIKKIM">Sikkim</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="issue-location">GPS Coordinates / Highway Landmark</label>
                        <input type="text" id="issue-location" class="form-input" value="25.1000° N, 92.3500° E (NH-6 Km 141.8 near Sonapur)" required>
                    </div>

                    <div class="form-group">
                        <label for="issue-description">Hazard Description &amp; Details</label>
                        <textarea id="issue-description" class="form-input" rows="3" placeholder="Describe obstruction size, vehicle passability, weather, etc." required>Large shale boulder and mudflow covers both lanes. Heavy vehicles halted. Clearance machinery needed.</textarea>
                    </div>

                    <button type="submit" class="btn-primary-large" style="width: 100%; justify-content: center;">
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
                    <p style="margin-bottom: 12px;"><strong>3. Human Field Verification:</strong> Your report is directly routed to your assigned Field Officer (Arjun Sharma) for official ground-truth verification.</p>
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

// Submits Driver Road Incident
function handleDriverReportSubmit(e) {
    e.preventDefault();

    const photoInput = document.getElementById("issue-photo-input");
    const previewImg = document.getElementById("photo-preview-img");
    const imageUrl = previewImg?.src || "assets/evidence_landslide.svg";

    const data = {
        report_type: document.getElementById("issue-type").value,
        severity: document.getElementById("issue-severity").value,
        state: document.getElementById("issue-state").value,
        location: document.getElementById("issue-location").value,
        description: document.getElementById("issue-description").value,
        image_url: imageUrl
    };

    try {
        const record = NextraApi.submitRoadIncident(data);
        if (typeof showToast === 'function') {
            showToast(`Hazard reported! Registered as ${record.id} in Verification Queue.`);
        }
        // Switch to Verification Center or Driver Dashboard
        switchTab("Dashboard");
    } catch (err) {
        alert(err.message);
    }
}
