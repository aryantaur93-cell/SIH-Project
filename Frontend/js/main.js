/**
 * NEXTRA - Main Application Controller & Event Orchestrator
 * Bootstraps platform modules, handles IST clock, global search, and modal management.
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize persistent storage layer
    NextraApi.initDatabase();

    // 2. Start Live Clock
    initClock();

    // 3. Restore session or show authentication gateway
    restoreSavedSession();

    // 4. Initialize real Leaflet GIS map
    initLeafletMap();

    // 5. Connect Deep Linking & Hash Routing
    syncTabFromHash();
    window.addEventListener("hashchange", syncTabFromHash);

    // 6. Global Search Shortcut ('/' key) & Escape Modal Close
    document.addEventListener("keydown", (e) => {
        if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA" && document.activeElement.tagName !== "SELECT") {
            e.preventDefault();
            const searchInput = document.getElementById("global-search");
            if (searchInput) searchInput.focus();
        }
        if (e.key === "Escape") {
            closeModals();
            if (typeof closeStateDrawer === 'function') closeStateDrawer();
        }
    });
});

// Live IST Clock
function initClock() {
    const clockEl = document.getElementById("live-ist-clock");
    if (!clockEl) return;

    function update() {
        const now = new Date();
        const options = { timeZone: "Asia/Kolkata", hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" };
        clockEl.textContent = `${now.toLocaleTimeString("en-GB", options)} IST`;
    }
    update();
    setInterval(update, 1000);
}

// Global Search across NE States, Trucks, and Corridors
function handleGlobalSearch(e) {
    if (e.key === "Enter") {
        const query = e.target.value.trim().toUpperCase();
        if (!query) return;

        // Check matching NE state
        const stateKey = Object.keys(NE_STATES_DATA).find(k => k.includes(query) || NE_STATES_DATA[k].name.toUpperCase().includes(query));
        if (stateKey) {
            focusState(stateKey);
            showToast(`Focusing regional GIS on ${NE_STATES_DATA[stateKey].name}`);
            return;
        }

        // Check matching shipment / truck
        const trucks = NextraApi.getTrucks();
        const matchedTruck = trucks.find(t => t.truck_id.includes(query) || t.driver_name.toUpperCase().includes(query));
        if (matchedTruck) {
            showToast(`Located vehicle ${matchedTruck.truck_id}: ${matchedTruck.current_location}`);
            switchTab("Shipments");
            return;
        }

        showToast(`Search for "${query}" completed across 8 North Eastern states.`);
    }
}

// Toast Notifications
function showToast(message) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
        <span style="font-size: 16px;">🛰️</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Modal Controllers
function closeModals() {
    document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.remove("active"));
}

// Responsive Drawer Handlers
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");
    if (sidebar) {
        const isOpen = sidebar.classList.toggle("mobile-open");
        if (backdrop) backdrop.classList.toggle("active", isOpen);
        document.body.classList.toggle("drawer-open", isOpen);
    }
}

function closeSidebar() {
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");
    if (sidebar) sidebar.classList.remove("mobile-open");
    if (backdrop) backdrop.classList.remove("active");
    document.body.classList.remove("drawer-open");
}

// Risk Table Filter
function filterRiskTable(filter) {
    const rows = document.querySelectorAll("#risk-matrix-tbody tr");
    document.querySelectorAll(".table-controls .action-btn-sm").forEach(b => b.classList.remove("active"));
    const btn = document.getElementById(`btn-risk-${filter.toLowerCase()}`);
    if (btn) btn.classList.add("active");

    rows.forEach(row => {
        if (filter === "ALL") {
            row.style.display = "";
        } else {
            const hasHigh = row.textContent.toUpperCase().includes("HIGH");
            row.style.display = hasHigh ? "" : "none";
        }
    });
}

// Lightbox Modal for Photo Evidence
function openImageModal(url, title) {
    let modal = document.getElementById("modal-image-preview");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-image-preview";
        modal.className = "modal-backdrop";
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 680px;">
            <div class="modal-header">
                <h3>📷 Ground Truth Inspection: ${title || 'Photo Evidence'}</h3>
                <button type="button" class="modal-close-btn" onclick="closeModals()">✕</button>
            </div>
            <div class="modal-body" style="text-align: center;">
                <img src="${url}" alt="${title}" style="max-width: 100%; border-radius: 8px; border: 1px solid var(--border-card); box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <div style="margin-top: 12px; font-size: 12.5px; color: var(--text-muted); display: flex; justify-content: center; gap: 16px;">
                    <span>📍 Verified GPS Stamp</span>
                    <span>•</span>
                    <span>🛰️ High-Resolution Telemetry</span>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="action-btn-sm" onclick="closeModals()">Close Preview</button>
            </div>
        </div>
    `;
    modal.classList.add("active");
}

// Route Planner Modal Open/Close
function openRoutePlannerModal() {
    const m = document.getElementById("modal-route");
    if (m) m.classList.add("active");
}

function openTrackModal() {
    const m = document.getElementById("modal-track");
    if (m) m.classList.add("active");
}

function openAlertsModal() {
    switchTab("Dashboard");
    const alertBox = document.querySelector(".alert-box");
    if (alertBox) {
        alertBox.scrollIntoView({ behavior: "smooth" });
        showToast("Reviewing active North East AI risk alerts");
    }
}

function markAllAlertsRead() {
    const count = document.getElementById("live-alert-count");
    if (count) count.textContent = "0 Active";
    const pill = document.getElementById("unread-alert-count");
    if (pill) pill.textContent = "0";
    showToast("All operational alerts marked as acknowledged.");
}

function toggleMoreTools() {
    const nav = document.getElementById("secondary-nav");
    const btn = document.getElementById("tools-toggle");
    if (nav) {
        const isShown = nav.style.display === "flex";
        nav.style.display = isShown ? "none" : "flex";
        if (btn) btn.setAttribute("aria-expanded", !isShown);
    }
}

function toggleAdvancedMonitoring() {
    const panel = document.getElementById("advanced-monitoring");
    const btn = document.getElementById("monitoring-toggle");
    if (panel) {
        const isShown = panel.style.display === "block";
        panel.style.display = isShown ? "none" : "block";
        if (btn) btn.setAttribute("aria-expanded", !isShown);
    }
}

function panToAlert(lat, lng, name) {
    if (typeof map !== 'undefined' && map) {
        map.setView([lat, lng], 11, { animate: true });
        showToast(`Focusing GIS radar on ${name} (${lat.toFixed(2)}, ${lng.toFixed(2)})`);
    }
}

function executeModalRoute() {
    const origin = document.getElementById("modal-origin")?.value;
    const dest = document.getElementById("modal-dest")?.value;
    closeModals();

    const originSelect = document.getElementById("route-origin");
    const destSelect = document.getElementById("route-destination");
    if (originSelect && origin) originSelect.value = origin;
    if (destSelect && dest) destSelect.value = dest;

    switchTab("Smart-Route");
    calculateSmartRoute();
}

function lookupShipment() {
    const idInput = document.getElementById("track-shipment-id");
    const id = idInput ? idInput.value.trim().toUpperCase() : "VX-104";
    const trucks = NextraApi.getTrucks();
    const truck = trucks.find(t => t.truck_id === id) || trucks[0];

    const resId = document.getElementById("track-res-id");
    const resStatus = document.getElementById("track-res-status");
    const resRoute = document.getElementById("track-res-route");
    const resCargo = document.getElementById("track-res-cargo");
    const resDriver = document.getElementById("track-res-driver");

    if (resId) resId.textContent = truck.truck_id;
    if (resStatus) resStatus.textContent = truck.status;
    if (resRoute) resRoute.innerHTML = `<strong>Corridor:</strong> ${truck.current_location}`;
    if (resCargo) resCargo.innerHTML = `<strong>Payload:</strong> ${truck.payload_cargo} (${truck.temp_c}°C Cold-Chain)`;
    if (resDriver) resDriver.innerHTML = `<strong>Operator:</strong> ${truck.driver_name} • Speed: ${truck.speed_kmh} km/h`;

    showToast(`Located consignment ${truck.truck_id}: ${truck.status}`);
}

function locateShipmentOnMap() {
    closeModals();
    switchTab("Dashboard");
    const trucks = NextraApi.getTrucks();
    const idInput = document.getElementById("track-shipment-id");
    const id = idInput ? idInput.value.trim().toUpperCase() : "VX-104";
    const truck = trucks.find(t => t.truck_id === id) || trucks[0];

    if (typeof map !== 'undefined' && map && truck.coords) {
        map.setView(truck.coords, 11, { animate: true });
        showToast(`Centered live map on truck ${truck.truck_id} (${truck.driver_name})`);
    }
}

function calculateSmartRoute() {
    const origin = document.getElementById("route-origin")?.value || "GUW";
    const dest = document.getElementById("route-destination")?.value || "IMP";

    const hubs = {
        GUW: { name: "Guwahati Central Hub", lat: 26.14, lng: 91.73 },
        SHL: { name: "Shillong Mountain Depot", lat: 25.57, lng: 91.89 },
        IMP: { name: "Imphal Logistics Center", lat: 24.81, lng: 93.93 },
        AGT: { name: "Agartala Cargo Complex", lat: 23.83, lng: 91.28 },
        AIZ: { name: "Aizawl Freight Terminal", lat: 23.72, lng: 92.71 },
        KOH: { name: "Kohima Staging Area", lat: 25.67, lng: 94.10 },
        ITN: { name: "Itanagar Northern Hub", lat: 27.08, lng: 93.60 },
        GTK: { name: "Gangtok Valley Depot", lat: 27.33, lng: 88.60 }
    };

    const h1 = hubs[origin] || hubs.GUW;
    const h2 = hubs[dest] || hubs.IMP;

    const latDiff = Math.abs(h1.lat - h2.lat);
    const lngDiff = Math.abs(h1.lng - h2.lng);
    const approxDist = Math.round(Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111 * 1.35) || 485;
    const approxHours = Math.floor(approxDist / 38);
    const approxMins = Math.round(((approxDist / 38) - approxHours) * 60);

    const distEl = document.getElementById("route-calc-dist");
    const etaEl = document.getElementById("route-calc-eta");
    const nameEl = document.getElementById("route-corridor-name");
    const advisoryEl = document.getElementById("route-calc-advisory");

    if (distEl) distEl.textContent = `${approxDist} km`;
    if (etaEl) etaEl.textContent = `${approxHours}h ${approxMins}m`;
    if (nameEl) nameEl.textContent = `${h1.name} ➔ ${h2.name}`;
    if (advisoryEl) {
        advisoryEl.textContent = `Real-time satellite analysis active. Terrain gradient assessed. Sonapur landslide alert bypassed if traversing Meghalaya-Barak Valley corridor.`;
    }

    showToast(`Optimal hill route computed: ${approxDist} km (${approxHours}h ${approxMins}m)`);
}

function updateAlternateRoutes() {
    calculateSmartRoute();
}

function plotRouteOnMainMap() {
    switchTab("Dashboard");
    showToast("Plotting optimal mountain corridor on Live Leaflet Map...");
}

function filterFleetTable() {
    const input = document.getElementById("fleet-search-input");
    const query = input ? input.value.toUpperCase() : "";
    const rows = document.querySelectorAll("#full-fleet-tbody tr");
    rows.forEach(r => {
        r.style.display = r.textContent.toUpperCase().includes(query) ? "" : "none";
    });
}

function submitFieldReport() {
    const loc = document.getElementById("report-location")?.value || "NH-6 Sonapur";
    const type = document.getElementById("report-type")?.value || "Landslide";
    const sev = document.getElementById("report-severity")?.value || "High";
    const desc = document.getElementById("report-description")?.value || "Ground verification report";

    showToast(`Field report submitted for ${loc}: ${type} (${sev}). Synced with Central Command.`);
    NextraApi.logAudit("FIELD_REPORT_SUBMITTED", `${type} reported at ${loc}`, "PENDING", "SUBMITTED");
}

let demoStep = 0;
function advanceDemoFlow() {
    const steps = ["01 Detect", "02 Predict", "03 Reroute", "04 Alert", "05 Verify"];
    demoStep = (demoStep + 1) % steps.length;
    const statusEl = document.getElementById("demo-flow-status");
    const cardEl = document.getElementById("demo-flow-card");

    if (statusEl) statusEl.textContent = `Scenario Stage: ${steps[demoStep]}`;
    if (cardEl) {
        if (demoStep === 1) {
            cardEl.innerHTML = `<div><strong>AI Prediction Engine</strong><span>Heavy precipitation in Meghalaya. 84% landslide probability.</span></div><div class="demo-flow-alert"><b>Action:</b> Compute alternative valley route.</div><button type="button" class="btn-primary-large demo-flow-button" onclick="advanceDemoFlow()">Compute Alternate Route →</button>`;
        } else if (demoStep === 2) {
            cardEl.innerHTML = `<div><strong>Rerouting Corridor</strong><span>Route B (East-West Bypass via NH-27) recommended.</span></div><div class="demo-flow-alert"><b>Impact:</b> Adds 42 km, eliminates 6h mountain stoppage.</div><button type="button" class="btn-primary-large demo-flow-button" onclick="advanceDemoFlow()">Push Driver Alert →</button>`;
        } else if (demoStep === 3) {
            cardEl.innerHTML = `<div><strong>Driver Notification Dispatched</strong><span>Driver Rahul Borah alerted in cockpit: divert via Umran.</span></div><div class="demo-flow-alert"><b>Driver Response:</b> Acknowledged at 10:14 IST.</div><button type="button" class="btn-primary-large demo-flow-button" onclick="advanceDemoFlow()">Verify Ground Truth →</button>`;
        } else if (demoStep === 4) {
            cardEl.innerHTML = `<div><strong>Field Officer Verification</strong><span>Arjun Sharma confirmed Sonapur mudslide. Clearance underway.</span></div><div class="demo-flow-alert"><b>Status:</b> Closed Loop Verified.</div><button type="button" class="btn-primary-large demo-flow-button" onclick="advanceDemoFlow()">Restart Scenario →</button>`;
        } else {
            cardEl.innerHTML = `<div><strong>Vehicle VX-104</strong><span>Route A · Shillong → Silchar · 42 km/h</span></div><div class="demo-flow-alert"><b>Route A is at risk:</b> Landslide signal detected 5.2 km ahead on NH-6 Sonapur.</div><button type="button" class="btn-primary-large demo-flow-button" onclick="advanceDemoFlow()">Run AI risk analysis →</button>`;
        }
    }
}

