/**
 * NEXTRA - Main Application Controller & Event Orchestrator
 * Bootstraps platform modules, handles IST clock, global search, and modal management.
 */

document.addEventListener("DOMContentLoaded", async () => {
    // Authenticate before starting modules that issue protected API requests.
    const sessionReady = await restoreSavedSession();
    if (!sessionReady) return;

    // 1. Initialize persistent storage layer
    NextraApi.initDatabase();

    // 2. Start Live Clock
    initClock();

    // 3. Initialize real Leaflet GIS map
    initLeafletMap();

    // 4. Connect Deep Linking & Hash Routing
    syncTabFromHash();
    window.addEventListener("hashchange", syncTabFromHash);

    // 5. Global Search Shortcut ('/' key) & Escape Modal Close
    document.addEventListener("keydown", (e) => {
        if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA" && document.activeElement.tagName !== "SELECT") {
            e.preventDefault();
            const searchInput = document.getElementById("global-search");
            if (searchInput) searchInput.focus();
        }
        if (e.key === "Escape") {
            closeModals();
            if (typeof closeAlertDetail === 'function') closeAlertDetail();
            if (typeof closeStateDrawer === 'function') closeStateDrawer();
        }
    });

    // 5b. Close modals on backdrop click or touch
    document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
        const handleBackdropClose = (e) => {
            if (e.target === backdrop) {
                closeModals();
                if (typeof closeAlertDetail === 'function') closeAlertDetail();
            }
        };
        backdrop.addEventListener("click", handleBackdropClose);
        backdrop.addEventListener("touchend", handleBackdropClose);
    });

    // 6. Load Initial Real-time Database Tables & Alerts
    if (typeof loadDashboardFleetTable === 'function') loadDashboardFleetTable();
    if (typeof renderRoadAlerts === 'function') renderRoadAlerts();
    if (typeof loadNotificationCount === 'function') loadNotificationCount();
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

// Global Search across NE States, Trucks, and Corridors using Live Backend
async function handleGlobalSearch(e) {
    if (e.key === "Enter") {
        const query = e.target.value.trim().toUpperCase();
        if (!query) return;

        // Check matching NE state
        const stateKey = typeof NE_STATES_DATA !== "undefined" && Object.keys(NE_STATES_DATA).find(k => k.includes(query) || NE_STATES_DATA[k].name.toUpperCase().includes(query));
        if (stateKey) {
            focusState(stateKey);
            showToast(`Focusing regional GIS on ${NE_STATES_DATA[stateKey].name}`);
            return;
        }

        // Check matching shipment or vehicle from live backend
        try {
            if (typeof NextraVehicles !== "undefined" && typeof NextraVehicles.getAll === "function") {
                const vehicles = await NextraVehicles.getAll();
                const matched = Array.isArray(vehicles) && vehicles.find(v => (v.registration || '').toUpperCase().includes(query) || (v.driver_name || '').toUpperCase().includes(query));
                if (matched) {
                    showToast(`Located vehicle ${matched.registration}: ${matched.current_location || 'Active in sector'}`);
                    switchTab("Trucks");
                    return;
                }
            }
        } catch (_) {}

        try {
            if (typeof NextraShipments !== "undefined" && typeof NextraShipments.getAll === "function") {
                const shipments = await NextraShipments.getAll();
                const matchedShip = Array.isArray(shipments) && shipments.find(s => (s.shipment_code || `SHP-${s.id}`).toUpperCase().includes(query) || (s.cargo_type || '').toUpperCase().includes(query));
                if (matchedShip) {
                    showToast(`Located shipment ${matchedShip.shipment_code || ('SHP-' + matchedShip.id)}: ${matchedShip.origin} → ${matchedShip.destination}`);
                    switchTab("Shipments");
                    return;
                }
            }
        } catch (_) {}

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
    document.querySelectorAll(".modal-backdrop").forEach(m => {
        m.classList.remove("active");
        m.style.display = "none";
    });
    if (typeof closeAlertDetail === "function") {
        closeAlertDetail();
    }
    window.currentSelectedAlertId = null;
}
window.closeModals = closeModals;

// ── Dedicated Alert Detail Modal Controller ────────────────
let currentSelectedAlertId = null;

async function openAlertDetail(alertId) {
    window.currentSelectedAlertId = Number(alertId);
    let alert = null;
    if (window.currentAlertsList && Array.isArray(window.currentAlertsList)) {
        alert = window.currentAlertsList.find(a => a.id === Number(alertId));
    }
    if (!alert && window.NEXTRA_MAP_CACHE && window.NEXTRA_MAP_CACHE.alerts) {
        alert = window.NEXTRA_MAP_CACHE.alerts.find(a => a.id === Number(alertId));
    }
    if (!alert) {
        try {
            const allAlerts = (typeof NextraAlerts !== "undefined" && typeof NextraAlerts.getAll === "function")
                ? await NextraAlerts.getAll()
                : [];
            window.currentAlertsList = allAlerts;
            alert = allAlerts.find(a => a.id === Number(alertId));
        } catch (e) {
            console.warn("[NEXTRA] Could not fetch alert details:", e);
        }
    }
    if (!alert) {
        if (typeof showToast === "function") showToast("Alert record not found.");
        return;
    }

    const modal = document.getElementById("modal-alert-detail");
    const elTitle = document.getElementById("alert-detail-title");
    const elBody = document.getElementById("alert-detail-body");
    const btnMap = document.getElementById("btn-alert-view-map");

    if (elTitle) elTitle.textContent = `🚨 ${alert.title}`;

    const isCritical = (alert.severity === "CRITICAL");
    const isHigh = (alert.severity === "HIGH");
    const sevColor = isCritical ? "#dc2626" : (isHigh ? "#ea580c" : "#d97706");
    const badgeClass = isCritical ? "chip-critical" : (isHigh ? "chip-high" : "chip-medium");
    const lat = alert.latitude != null ? parseFloat(alert.latitude) : null;
    const lng = alert.longitude != null ? parseFloat(alert.longitude) : null;
    const hasGps = (lat != null && !isNaN(lat) && lng != null && !isNaN(lng));
    const timeAgo = (typeof formatTimeAgo === "function" && alert.created_at) ? formatTimeAgo(alert.created_at) : "Active";

    if (elBody) {
        elBody.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span class="severity-chip ${badgeClass}">${alert.severity || 'URGENT'}</span>
                    <span style="font-size:12px; color:var(--text-muted); font-weight:600;">Type: ${alert.alert_type || 'ROAD_HAZARD'}</span>
                </div>
                <span style="font-size:11.5px; color:var(--text-muted);">Broadcast: ${timeAgo}</span>
            </div>

            <div style="background:#fef2f2; border:1px solid #fee2e2; border-radius:8px; padding:12px; margin-bottom:14px;">
                <div style="font-size:11px; text-transform:uppercase; font-weight:700; color:#991b1b; letter-spacing:0.5px; margin-bottom:4px;">Official Advisory Broadcast</div>
                <div style="font-size:13.5px; color:#1e293b; line-height:1.5;">${alert.description || alert.message || 'Regional hazard broadcast.'}</div>
            </div>

            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12.5px; margin-bottom:12px;">
                <div>
                    <span style="color:var(--text-muted); display:block; font-size:11px;">State / Sector</span>
                    <strong>${alert.state || 'Northeast'}</strong>
                </div>
                <div>
                    <span style="color:var(--text-muted); display:block; font-size:11px;">District / Corridor</span>
                    <strong>${alert.district || 'Regional Pass'}</strong>
                </div>
                <div>
                    <span style="color:var(--text-muted); display:block; font-size:11px;">GPS Coordinates</span>
                    <strong>${hasGps ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : '<span style="color:#64748b;">Regional Centroid</span>'}</strong>
                </div>
                <div>
                    <span style="color:var(--text-muted); display:block; font-size:11px;">Operational Status</span>
                    <strong style="color:${sevColor};">${alert.active ? 'ACTIVE BROADCAST' : 'ARCHIVED'}</strong>
                </div>
            </div>
        `;
    }

    if (btnMap) {
        btnMap.onclick = (e) => {
            if (e && e.preventDefault) e.preventDefault();
            closeAlertDetail();
            if (typeof panToAlert === "function") {
                panToAlert(lat, lng, alert.title, alert.id);
            }
        };
    }

    if (modal) {
        modal.classList.add("active");
        modal.style.display = "flex";
    }
}
window.openAlertDetail = openAlertDetail;

function closeAlertDetail() {
    const modal = document.getElementById("modal-alert-detail");
    if (modal) {
        modal.classList.remove("active");
        modal.style.display = "none";
    }
    window.currentSelectedAlertId = null;
}
window.closeAlertDetail = closeAlertDetail;

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

// Shipment Tracker Modal Actions
let lastLookedUpShipmentId = null;

async function lookupShipment() {
    const input = document.getElementById("track-shipment-id");
    if (!input) return;
    const query = input.value.trim();
    if (!query) {
        if (typeof showToast === 'function') showToast("Please enter a shipment code, ID, or vehicle number.", "warning");
        return;
    }

    const resBox = document.getElementById("track-result-box");
    const elId = document.getElementById("track-res-id");
    const elStatus = document.getElementById("track-res-status");
    const elRoute = document.getElementById("track-res-route");
    const elCargo = document.getElementById("track-res-cargo");
    const elDriver = document.getElementById("track-res-driver");

    if (elStatus) elStatus.textContent = "Searching...";

    let matched = null;
    try {
        const shipments = await NextraShipments.getAll();
        const qUpper = query.toUpperCase();
        matched = shipments.find(s => {
            const sc = (s.shipment_code || `SHP-${s.id}`).toUpperCase();
            const sid = String(s.id);
            const vr = (s.vehicle_registration || '').toUpperCase();
            return sc === qUpper || sc.includes(qUpper) || sid === qUpper || vr.includes(qUpper);
        });
    } catch (err) {
        console.warn("Error querying shipments for tracker:", err);
    }

    if (!matched) {
        if (typeof showToast === 'function') showToast(`No shipment found matching '${query}'`, "error");
        if (elStatus) {
            elStatus.textContent = "Not Found";
            elStatus.className = "status-badge status-red";
        }
        return;
    }

    lastLookedUpShipmentId = matched.id;
    const shipCode = matched.shipment_code || `SHP-${String(matched.id).padStart(3, '0')}`;
    const status = (matched.status || 'IN_TRANSIT').replace('_', ' ');
    const origin = matched.origin || matched.pickup_location || 'Origin Hub';
    const dest = matched.destination || 'Destination Hub';
    const corridor = matched.route_name || matched.corridor || `${origin} → ${dest}`;
    const cargo = matched.cargo || 'General Freight';
    const weight = matched.weight ? `${matched.weight} Tons` : '2.4 Tons';
    const driver = matched.driver_name || 'Assigned Driver';
    const phone = matched.driver_phone ? ` (${matched.driver_phone})` : '';
    const vehicle = matched.vehicle_registration || (matched.vehicle_id ? `VX-${matched.vehicle_id}` : 'Assigned Fleet');

    if (elId) elId.textContent = `${shipCode} (${vehicle})`;
    if (elStatus) {
        elStatus.textContent = status;
        elStatus.className = `status-badge ${status === 'DELAYED' ? 'status-red' : (status === 'COMPLETED' ? 'status-green' : 'status-blue')}`;
    }
    if (elRoute) elRoute.innerHTML = `<strong>Route Corridor:</strong> ${corridor}`;
    if (elCargo) elCargo.innerHTML = `<strong>Cargo:</strong> ${cargo} (${weight})`;
    if (elDriver) elDriver.innerHTML = `<strong>Assigned Unit:</strong> ${driver}${phone} · ETA: ${matched.eta || 'On Schedule'}`;
    if (resBox) resBox.style.display = "block";

    if (typeof showToast === 'function') showToast(`Located telemetry for ${shipCode}`);
}

function locateShipmentOnMap() {
    closeModals();
    if (lastLookedUpShipmentId) {
        if (typeof trackAndHighlightShipment === 'function') {
            trackAndHighlightShipment(lastLookedUpShipmentId);
        }
    } else {
        if (typeof switchTab === 'function') switchTab('Live-Map');
    }
}


// ==========================================================================
// NOTIFICATIONS & REGIONAL ALERTS SYSTEM (PHASE 9)
// ==========================================================================

function toggleNotificationDrawer(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById("notifications-dropdown");
    if (!dropdown) return;

    const isHidden = dropdown.classList.contains("hidden");
    if (isHidden) {
        dropdown.classList.remove("hidden");
        loadNotificationsDrawer();
    } else {
        dropdown.classList.add("hidden");
    }
}

// Close drawer on click outside
document.addEventListener("click", function(event) {
    const wrapper = document.getElementById("notification-bell-wrapper");
    const dropdown = document.getElementById("notifications-dropdown");
    if (dropdown && !dropdown.classList.contains("hidden")) {
        if (wrapper && !wrapper.contains(event.target)) {
            dropdown.classList.add("hidden");
        }
    }
});

async function loadNotificationsDrawer() {
    const listContainer = document.getElementById("notifications-dropdown-list");
    if (!listContainer) return;

    try {
        const notifs = await NextraNotifications.getAll();
        updateNotificationBadges(notifs);

        if (!notifs || notifs.length === 0) {
            listContainer.innerHTML = `
                <div style="padding: 32px 16px; text-align: center; color: var(--text-muted);">
                    <span style="font-size: 28px; display: block; margin-bottom: 6px;">🔔</span>
                    <strong style="color: #334155; font-size: 13px;">No Notifications</strong>
                    <p style="font-size: 11.5px; margin-top: 4px;">You have acknowledged all system updates and incident reports.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = notifs.map(n => {
            const isUnread = (n.is_read === 0);
            const tagClass = `tag-${(n.type || 'system').toLowerCase()}`;
            const timeAgo = formatTimeAgo(n.created_at);

            return `
                <div class="notif-item ${isUnread ? 'unread' : ''}" onclick="handleNotificationClick(${n.id}, '${n.type || 'SYSTEM'}')">
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <span class="notif-type-tag ${tagClass}">${n.type || 'SYSTEM'}</span>
                            <span style="font-size: 11px; color: var(--text-muted);">${timeAgo}</span>
                        </div>
                        <div style="font-weight: 700; font-size: 12.5px; color: #0f172a; margin-bottom: 2px;">${n.title}</div>
                        <div style="font-size: 12px; color: #475569; line-height: 1.4;">${n.message || ''}</div>
                    </div>
                    ${isUnread ? `
                        <button type="button" class="action-btn-sm" style="align-self: flex-start; padding: 2px 6px; font-size: 10px;" onclick="handleMarkNotificationRead(${n.id}, event)" title="Mark as read">✓</button>
                        <span class="notif-dot"></span>
                    ` : ''}
                </div>
            `;
        }).join("");

    } catch (err) {
        console.warn("[NEXTRA] Error loading notifications list:", err);
        listContainer.innerHTML = `<div style="padding: 16px; text-align: center; color: #dc2626; font-size: 12px;">Failed to load notifications.</div>`;
    }
}

async function handleNotificationClick(notifId, type) {
    try {
        await NextraNotifications.markRead(notifId);
        loadNotificationCount();
        const dropdown = document.getElementById("notifications-dropdown");
        if (dropdown) dropdown.classList.add("hidden");

        // Navigate to related workspace
        const upperType = (type || "").toUpperCase();
        if (upperType === "REPORT" || upperType === "VERIFICATION") {
            switchTab("Verification-Center");
        } else if (upperType === "SHIPMENT") {
            switchTab("Shipments");
        } else if (upperType === "RISK" || upperType === "ALERT") {
            switchTab("Live-Map");
        }
    } catch (err) {
        console.warn("Could not mark notification read:", err);
    }
}

async function handleMarkNotificationRead(notifId, event) {
    if (event) event.stopPropagation();
    try {
        await NextraNotifications.markRead(notifId);
        loadNotificationCount();
        loadNotificationsDrawer();
    } catch (err) {
        console.warn("Could not mark notification read:", err);
    }
}

async function handleMarkAllNotificationsRead(event) {
    if (event) event.stopPropagation();
    try {
        await NextraNotifications.markAllRead();
        loadNotificationCount();
        loadNotificationsDrawer();
        if (typeof showToast === 'function') {
            showToast("All notifications marked as read.");
        }
    } catch (err) {
        console.warn("Could not mark all notifications read:", err);
    }
}

function updateNotificationBadges(notifs) {
    const unread = (notifs || []).filter(n => n.is_read === 0).length;
    const pill = document.getElementById("notification-unread-count");
    const headerUnread = document.getElementById("notif-header-unread");

    if (pill) {
        pill.textContent = unread;
        if (unread > 0) pill.classList.add("pulse");
        else pill.classList.remove("pulse");
    }
    if (headerUnread) {
        headerUnread.textContent = `${unread} unread`;
    }
}

async function loadNotificationCount() {
    try {
        const data = await NextraNotifications.getUnreadCount();
        const count = data.unread_count || 0;
        const pill = document.getElementById("notification-unread-count");
        const headerUnread = document.getElementById("notif-header-unread");

        if (pill) {
            pill.textContent = count;
            if (count > 0) pill.classList.add("pulse");
            else pill.classList.remove("pulse");
        }
        if (headerUnread) {
            headerUnread.textContent = `${count} unread`;
        }
    } catch (err) {
        console.warn("[NEXTRA] Could not load notification count:", err);
    }
}

// ── Regional Alerts Viewer ──────────────────────────────────
async function openAlertsModal() {
    const modal = document.getElementById("modal-alerts-viewer");
    const listContainer = document.getElementById("alerts-modal-list");

    if (modal) {
        modal.classList.add("active");
        modal.style.display = "flex";
    }

    if (!listContainer) return;
    listContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">Retrieving active regional hazard broadcasts...</div>`;

    try {
        const alerts = await NextraAlerts.getAll();
        window.currentAlertsList = alerts || [];
        updateActiveAlertsBadge(alerts);

        if (!alerts || alerts.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 24px; color: var(--text-muted);">
                    <span style="font-size: 32px;">🛡️</span>
                    <strong style="display: block; margin-top: 6px;">No Active Regional Hazards</strong>
                    <p style="font-size: 12px;">All Northeast arterial highways are operating under standard conditions.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = alerts.map(a => {
            const isCritical = (a.severity === "CRITICAL");
            const isHigh = (a.severity === "HIGH");
            const chipClass = isCritical ? 'chip-critical' : isHigh ? 'chip-high' : 'chip-medium';
            const lat = a.latitude || 26.14;
            const lng = a.longitude || 91.73;
            const escapedTitle = (a.title || '').replace(/'/g, "\\'");

            return `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; cursor: pointer;" onclick="openAlertDetail(${a.id})">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span class="severity-chip ${chipClass}">${a.severity || 'URGENT'}</span>
                            <strong style="color: #0f172a; font-size: 13.5px;">${a.title}</strong>
                        </div>
                        <span style="font-size: 11px; color: var(--text-muted);">📍 ${a.state || 'Northeast'}</span>
                    </div>
                    <p style="font-size: 12.5px; color: #475569; margin: 4px 0 8px;">${a.description || a.message || 'Regional hazard broadcast'}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 11px; color: var(--text-muted);">Sector: ${a.district || a.state || 'Highlands'}</span>
                        <div style="display: flex; gap: 6px;">
                            <button type="button" class="action-btn-sm alert-locate-btn" onclick="event.stopPropagation(); closeModals(); panToAlert(${lat}, ${lng}, '${escapedTitle}', ${a.id});" title="Locate on Live Map">
                                Locate 🗺️
                            </button>
                            <button type="button" class="action-btn-sm" style="background:#f1f5f9;" onclick="event.stopPropagation(); openAlertDetail(${a.id});">
                                Details ℹ️
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

    } catch (err) {
        console.warn("[NEXTRA] Error loading alerts modal:", err);
        listContainer.innerHTML = `<div style="color: #dc2626; padding: 12px;">Failed to load alerts from backend.</div>`;
    }
}

function updateActiveAlertsBadge(alerts) {
    const count = (alerts || []).length;
    const badge = document.getElementById("unread-alert-count");
    if (badge) badge.textContent = count;
}

async function loadActiveAlertsCount() {
    try {
        const alerts = await NextraAlerts.getAll();
        updateActiveAlertsBadge(alerts);
    } catch (err) {
        console.warn("[NEXTRA] Could not load alerts count:", err);
    }
}

function formatTimeAgo(isoString) {
    if (!isoString) return "Recently";
    try {
        const diffSecs = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
        if (diffSecs < 60) return "Just now";
        if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
        if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
        return `${Math.floor(diffSecs / 86400)}d ago`;
    } catch { return "Recently"; }
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

// Authoritative panToAlert is implemented in js/map.js.
// Fallback only if map.js has not loaded yet:
if (typeof window.panToAlert !== 'function') {
    window.panToAlert = function(lat, lng, name, alertId) {
        if (typeof switchTab === 'function') switchTab("Live-Map");
        if (typeof map !== 'undefined' && map) {
            map.setView([lat, lng], 12, { animate: true });
        }
    };
}

function executeModalRoute() {
    const origin = document.getElementById("modal-origin")?.value;
    const dest = document.getElementById("modal-dest")?.value;
    closeModals();

    const originSelect = document.getElementById("route-origin");
    const destSelect = document.getElementById("route-destination");
    if (originSelect && origin) originSelect.value = origin;
    if (destSelect && dest) destSelect.value = dest;

    switchTab("Live-Map");
    if (typeof calculateSmartRoute === 'function') calculateSmartRoute();
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

// ==========================================================================
// FIELD OFFICER REPORT SUBMISSION & RECENT REPORTS FEED (PHASE 8)
// ==========================================================================

function handleFOPhotoSelect(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            const previewBox = document.getElementById("fo-photo-preview-box");
            const previewImg = document.getElementById("fo-photo-preview-img");
            if (previewBox && previewImg) {
                previewImg.src = evt.target.result;
                previewBox.style.display = "block";
            }
        };
        reader.readAsDataURL(file);
    }
}

async function handleFieldOfficerReportSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById("fo-report-submit-btn");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = "⏳ Transmitting Report to Central Grid...";
    }

    const photoInput = document.getElementById("fo-report-photo-input");
    const file = (photoInput && photoInput.files && photoInput.files[0]) ? photoInput.files[0] : null;

    const incidentType = document.getElementById("fo-report-type").value;
    const severity = document.getElementById("fo-report-severity").value;
    const state = document.getElementById("fo-report-state").value;
    const locationStr = document.getElementById("fo-report-location").value.trim();
    const gpsStr = document.getElementById("fo-report-gps").value.trim();
    const description = document.getElementById("fo-report-description").value.trim();

    // Coordinates parsing
    let lat = null, lng = null;
    const gpsMatch = (gpsStr || locationStr).match(/([0-9]+\.[0-9]+)°?\s*N[,\s]+([0-9]+\.[0-9]+)°?\s*E/i);
    if (gpsMatch) {
        lat = parseFloat(gpsMatch[1]);
        lng = parseFloat(gpsMatch[2]);
    }

    // 1. If currently offline, save locally in IndexedDB / localStorage (Phase 15 requirement)
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
                showToast(`📡 Network Unavailable: Saved locally (${saved.client_report_id}). Status: SYNC PENDING.`);
            }

            // Reset form
            const form = document.getElementById("fo-report-form");
            if (form) form.reset();
            const previewBox = document.getElementById("fo-photo-preview-box");
            if (previewBox) previewBox.style.display = "none";

        } catch (saveErr) {
            console.error("Failed to save offline report:", saveErr);
            alert("Error saving offline report: " + saveErr.message);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = "🚀 Submit Field Report <span>→</span>";
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
            showToast(`Field report transmitted! Registered as ${report.report_code || 'RPT'}. Verified team alerted.`);
        }

        // Refresh live platform state across all modules
        if (typeof window.refreshNextraLiveData === 'function') {
            await window.refreshNextraLiveData();
        } else {
            loadRecentFieldReports();
            if (typeof loadAndRenderMapData === 'function') loadAndRenderMapData();
            if (typeof loadNotificationCount === 'function') loadNotificationCount();
        }

        // Reset form
        const form = document.getElementById("fo-report-form");
        if (form) form.reset();
        const previewBox = document.getElementById("fo-photo-preview-box");
        if (previewBox) previewBox.style.display = "none";

    } catch (err) {
        console.error("Error submitting Field Officer report:", err);
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
                    showToast(`📡 Network Error: Report saved locally (${saved.client_report_id}). Status: SYNC PENDING.`);
                }

                const form = document.getElementById("fo-report-form");
                if (form) form.reset();
                const previewBox = document.getElementById("fo-photo-preview-box");
                if (previewBox) previewBox.style.display = "none";
                return;
            } catch (saveErr) {
                console.error("Failed to save report offline on network error:", saveErr);
            }
        }
        alert(err.message || "Failed to submit field report.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "🚀 Submit Field Report <span>→</span>";
        }
    }
}

async function loadRecentFieldReports() {
    const container = document.getElementById("fo-assigned-reports-container");
    if (!container) return;

    if (window.NextraOffline) {
        NextraOffline.renderBanner();
        NextraOffline.renderQueue();
    }

    try {
        const reports = await NextraReports.getAll();
        if (!reports || reports.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 24px;">
                    <span>🛡️</span>
                    <p style="font-size: 12.5px; margin-top: 4px;">No field reports submitted yet.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = reports.slice(0, 8).map(r => {
            const isCritical = (r.severity === "CRITICAL");
            const isVerified = (r.status === "VERIFIED");
            const isRejected = (r.status === "REJECTED");
            const statusClass = isVerified ? "status-green" : isRejected ? "status-red" : "status-amber";
            let imgHtml = "";
            if (r.image_url) {
                let src = r.image_url;
                if (src.startsWith("/uploads/") && typeof API_BASE !== "undefined" && API_BASE) src = `${API_BASE}${src}`;
                imgHtml = `<img src="${src}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1;" onerror="this.style.display='none';">`;
            }

            return `
                <div class="incident-queue-row" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${imgHtml || `<span class="queue-icon ${isCritical ? 'danger' : 'warning'}">!</span>`}
                        <div>
                            <strong style="font-size: 13px; color: #0f172a;">${r.report_code}: ${(r.incident_type || 'Incident').replace(/_/g, ' ')}</strong>
                            <small style="display: block; font-size: 11px; color: var(--text-muted);">${r.location_name || r.district || ''}, ${r.state} · By ${r.reporter_name || 'Reporter'}</small>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                        <span class="status-badge ${statusClass}">${r.status}</span>
                        <span style="font-size: 10px; color: var(--text-muted);">${r.severity}</span>
                    </div>
                </div>
            `;
        }).join("");

    } catch (err) {
        console.warn("[NEXTRA] Error loading recent field reports:", err);
        if (window.NextraOffline && !NextraOffline.isOnline()) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 24px;">
                    <span style="font-size: 24px;">📡</span>
                    <p style="font-size: 13px; font-weight: 600; margin-top: 6px; color: #475569;">Field Unit Offline</p>
                    <p style="font-size: 11.5px; color: #94a3b8; margin-top: 2px;">Central server feed paused. Local reports are buffered in the queue above.</p>
                </div>
            `;
        } else {
            container.innerHTML = `<div style="color: #dc2626; font-size: 12px; padding: 12px;">Failed to load reports.</div>`;
        }
    } finally {
        if (window.NextraOffline) {
            NextraOffline.renderQueue();
        }
    }
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

// ==========================================================================
// ACCESSIBILITY, WEATHER & ROAD ALERTS VIEWS (API-DRIVEN)
// ==========================================================================

// Helper for Canonical Accessibility Badges (OPEN, PARTIALLY AFFECTED, BLOCKED, CLOSED)
function getAccessibilityBadgeHtml(status) {
    const s = (status || "OPEN").toUpperCase();
    if (s === "CLOSED") {
        return `<span style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">⛔ CLOSED</span>`;
    } else if (s === "BLOCKED") {
        return `<span style="background: #ffedd5; color: #ea580c; border: 1px solid #fed7aa; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">🛑 BLOCKED</span>`;
    } else if (s === "PARTIALLY AFFECTED") {
        return `<span style="background: #fef3c7; color: #d97706; border: 1px solid #fde68a; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">⚠️ PARTIALLY AFFECTED</span>`;
    } else {
        return `<span style="background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">🟢 OPEN</span>`;
    }
}

function formatWeatherTimestamp(ts) {
    if (!ts) return "Real-time Telemetry";
    try {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return String(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " · " + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
        return String(ts);
    }
}

async function renderAccessibilityView() {
    const container = document.getElementById("accessibility-cards-container");
    if (!container) return;

    container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-muted); grid-column: span 3;">⏳ Loading regional logistics accessibility indices from database...</div>`;

    try {
        const [accessList, weatherList] = await Promise.all([
            (typeof NextraAccessibility !== "undefined" && typeof NextraAccessibility.getAll === "function")
                ? NextraAccessibility.getAll().catch(() => [])
                : ((typeof NextraRegions !== "undefined") ? NextraRegions.getAll().catch(() => []) : []),
            (typeof NextraWeather !== "undefined" && typeof NextraWeather.getAll === "function")
                ? NextraWeather.getAll().catch(() => [])
                : []
        ]);

        if (!accessList || accessList.length === 0) {
            container.innerHTML = `<div style="padding: 20px; color: var(--text-muted); text-align: center; grid-column: span 3;">No regional accessibility records found in database.</div>`;
            return;
        }

        const weatherMap = new Map();
        weatherList.forEach(w => {
            if (w && w.state) weatherMap.set(w.state.toLowerCase(), w);
        });

        const activeUser = typeof getActiveUser === 'function' ? getActiveUser() : null;
        const canManage = activeUser && (activeUser.role === 'admin' || activeUser.role === 'field_officer');

        container.innerHTML = accessList.map(reg => {
            const score = reg.accessibility_score !== undefined ? reg.accessibility_score : 70;
            const scoreColor = score >= 75 ? "#10b981" : (score >= 55 ? "#f59e0b" : "#ef4444");
            const canonicalStatus = reg.accessibility_status || (score >= 75 ? "OPEN" : (score >= 55 ? "PARTIALLY AFFECTED" : "BLOCKED"));
            const desc = reg.description || `${reg.state} transport corridor monitoring.`;
            const risk = reg.risk_level || "MEDIUM";
            const w = weatherMap.get((reg.state || "").toLowerCase());
            const disruptions = reg.active_disruptions_count || 0;

            const temp = (w && (w.temperature !== undefined && w.temperature !== null ? w.temperature : w.temperature_c)) ?? 24;
            const rain = (w && (w.rainfall !== undefined && w.rainfall !== null ? w.rainfall : w.rainfall_mm)) ?? 0;
            const wind = (w && (w.wind !== undefined && w.wind !== null ? w.wind : w.wind_speed_kmh)) ?? 10;
            const cond = (w && w.condition) ? w.condition : "Clear";

            return `
                <div class="access-card" style="display: flex; flex-direction: column; justify-content: space-between; border-top: 3px solid ${scoreColor};">
                    <div>
                        <div class="access-header">
                            <div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <strong style="font-size: 15px;">${reg.state} Sector</strong>
                                </div>
                                <div style="margin-top: 4px;">
                                    ${getAccessibilityBadgeHtml(canonicalStatus)}
                                </div>
                            </div>
                            <div class="access-score-circle" style="border-color: ${scoreColor}; color: ${scoreColor}; font-weight: 700;">
                                ${score}%
                            </div>
                        </div>

                        <p style="font-size: 12.5px; color: var(--text-muted); margin: 10px 0 8px 0; line-height: 1.4;">
                            ${desc}
                        </p>

                        <!-- Live Linked Weather Telemetry -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; margin: 8px 0; font-size: 11.5px; color: #334155;">
                            <div style="font-weight: 600; color: #64748b; margin-bottom: 3px; display: flex; justify-content: space-between;">
                                <span>🌦️ Linked Weather Feed</span>
                                <span style="color: ${rain >= 45 ? '#ef4444' : '#10b981'}; font-weight: 700;">${cond}</span>
                            </div>
                            <span>🌡️ ${temp}°C · 🌧️ ${rain} mm/h · 💨 ${wind} km/h</span>
                        </div>

                        <div>
                            <div style="display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 600; margin-bottom: 4px;">
                                <span>All-Weather Connectivity</span>
                                <span style="color: ${scoreColor};">${score}%</span>
                            </div>
                            <div class="progress-container">
                                <div class="progress-fill" style="width: ${score}%; background: ${scoreColor};"></div>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-top: 10px; color: #64748b;">
                            <span>Active Disruptions: <strong style="color: ${disruptions > 0 ? '#ef4444' : '#10b981'};">${disruptions}</strong></span>
                            <span>Terrain Threat: <strong style="color: ${risk === 'HIGH' || risk === 'CRITICAL' ? '#ef4444' : (risk === 'MEDIUM' ? '#f59e0b' : '#10b981')}">${risk}</strong></span>
                        </div>
                    </div>

                    <div style="margin-top: 14px; font-size: 11.5px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 10px;">
                        ${canManage ? `
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <label style="font-size: 11px; color: var(--text-muted);">Status:</label>
                                <select class="form-select" style="font-size: 11px; padding: 2px 6px; width: auto; height: 26px;" onchange="handleAccessibilityStatusUpdate('${reg.state}', this.value)">
                                    <option value="OPEN" ${canonicalStatus === 'OPEN' ? 'selected' : ''}>OPEN</option>
                                    <option value="PARTIALLY AFFECTED" ${canonicalStatus === 'PARTIALLY AFFECTED' ? 'selected' : ''}>PARTIALLY AFFECTED</option>
                                    <option value="BLOCKED" ${canonicalStatus === 'BLOCKED' ? 'selected' : ''}>BLOCKED</option>
                                    <option value="CLOSED" ${canonicalStatus === 'CLOSED' ? 'selected' : ''}>CLOSED</option>
                                </select>
                            </div>
                        ` : `<span></span>`}
                        <button type="button" class="action-btn-sm" onclick="switchTab('Dashboard'); if(typeof focusState==='function') focusState('${reg.state}');" style="font-size: 11.5px; padding: 4px 10px;">
                            Focus GIS Radar →
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.warn("[Accessibility] Error loading accessibility view:", err);
        container.innerHTML = `<div style="padding: 20px; color: #dc2626; text-align: center; grid-column: span 3;">Failed to load regional accessibility index.</div>`;
    }
}

async function renderWeatherView() {
    const container = document.getElementById("weather-cards-container");
    if (!container) return;

    container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-muted); grid-column: span 3;">⏳ Loading real-time meteorological observations and system linkages from database...</div>`;

    try {
        const [weatherList, accessList, alertsList] = await Promise.all([
            (typeof NextraWeather !== "undefined" && typeof NextraWeather.getAll === "function")
                ? NextraWeather.getAll().catch(() => [])
                : [],
            (typeof NextraAccessibility !== "undefined" && typeof NextraAccessibility.getAll === "function")
                ? NextraAccessibility.getAll().catch(() => [])
                : ((typeof NextraRegions !== "undefined") ? NextraRegions.getAll().catch(() => []) : []),
            (typeof NextraAlerts !== "undefined" && typeof NextraAlerts.getAll === "function")
                ? NextraAlerts.getAll().catch(() => [])
                : []
        ]);

        if (!weatherList || weatherList.length === 0) {
            container.innerHTML = `<div style="padding: 20px; color: var(--text-muted); text-align: center; grid-column: span 3;">No active weather telemetry records returned from database.</div>`;
            return;
        }

        const accessMap = new Map();
        accessList.forEach(a => {
            if (a && a.state) accessMap.set(a.state.toLowerCase(), a);
        });

        const alertCountMap = new Map();
        alertsList.forEach(al => {
            const st = (al.state || "").toLowerCase();
            alertCountMap.set(st, (alertCountMap.get(st) || 0) + 1);
        });

        container.innerHTML = weatherList.map(w => {
            const temp = (w.temperature !== undefined && w.temperature !== null) ? w.temperature : ((w.temperature_c !== null && w.temperature_c !== undefined) ? w.temperature_c : 24);
            const rain = (w.rainfall !== undefined && w.rainfall !== null) ? w.rainfall : (w.rainfall_mm || 0);
            const wind = (w.wind !== undefined && w.wind !== null) ? w.wind : (w.wind_speed_kmh || 0);
            const cond = w.condition || "Clear";
            const ts = w.timestamp || w.updated_at || w.recorded_at;
            const timeFormatted = formatWeatherTimestamp(ts);

            const acc = accessMap.get((w.state || "").toLowerCase());
            const canonicalStatus = acc?.accessibility_status || (rain >= 70 ? "BLOCKED" : (rain >= 45 ? "PARTIALLY AFFECTED" : "OPEN"));
            const riskLevel = acc?.risk_level || (rain >= 70 ? "CRITICAL" : (rain >= 45 ? "HIGH" : (rain >= 20 ? "MEDIUM" : "LOW")));
            const alertCount = alertCountMap.get((w.state || "").toLowerCase()) || 0;

            const tempColor = temp <= 0 ? "#6366f1" : (temp < 15 ? "#0ea5e9" : (temp < 28 ? "#10b981" : "#f59e0b"));
            const isHeavyRain = rain >= 45;
            const isTorrential = rain >= 70;

            return `
                <div class="access-card weather-intel-card" style="display: flex; flex-direction: column; justify-content: space-between; border-top: 3px solid ${isTorrential ? '#dc2626' : (isHeavyRain ? '#f59e0b' : '#0ea5e9')};">
                    <div>
                        <!-- Header with State and Temp -->
                        <div class="access-header">
                            <div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <strong style="font-size: 15px;">${w.state} Sector</strong>
                                </div>
                                <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                                    ${w.district || 'Regional Highway Corridor'} · <strong style="color: ${isHeavyRain ? '#ef4444' : '#334155'};">${cond}</strong>
                                </div>
                            </div>
                            <div class="access-score-circle" style="border-color: ${tempColor}; color: ${tempColor}; font-size: 18px; font-weight: 700;">
                                ${temp}°
                            </div>
                        </div>

                        <!-- 5 Required Core Meteorological Fields -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin: 10px 0;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                                <div>
                                    <span style="color: #64748b; display: block; font-size: 10.5px; text-transform: uppercase;">Precipitation</span>
                                    <strong style="color: ${isTorrential ? '#dc2626' : (isHeavyRain ? '#d97706' : '#1e293b')}; font-size: 13px;">
                                        🌧️ ${rain} mm/h
                                    </strong>
                                </div>
                                <div>
                                    <span style="color: #64748b; display: block; font-size: 10.5px; text-transform: uppercase;">Wind Speed</span>
                                    <strong style="color: #1e293b; font-size: 13px;">
                                        💨 ${wind} km/h
                                    </strong>
                                </div>
                                <div>
                                    <span style="color: #64748b; display: block; font-size: 10.5px; text-transform: uppercase;">Temperature</span>
                                    <strong style="color: #1e293b; font-size: 13px;">
                                        🌡️ ${temp}°C
                                    </strong>
                                </div>
                                <div>
                                    <span style="color: #64748b; display: block; font-size: 10.5px; text-transform: uppercase;">Condition</span>
                                    <strong style="color: #1e293b; font-size: 13px;">
                                        ⛅ ${cond}
                                    </strong>
                                </div>
                            </div>
                            <div style="margin-top: 6px; font-size: 10.5px; color: #94a3b8; border-top: 1px solid #edf2f7; padding-top: 4px; display: flex; justify-content: space-between;">
                                <span>Sensor Telemetry Timestamp:</span>
                                <span style="font-weight: 600; color: #64748b;">${timeFormatted}</span>
                            </div>
                        </div>

                        <!-- System Intelligence Integration (Weather Feeds Intelligence) -->
                        <div style="border: 1px dashed #cbd5e1; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; font-size: 11.5px; background: #ffffff;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <span style="color: #64748b; font-weight: 600;">♿ Linked Accessibility:</span>
                                ${getAccessibilityBadgeHtml(canonicalStatus)}
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <span style="color: #64748b; font-weight: 600;">⚠️ Terrain & Route Threat:</span>
                                <strong style="color: ${riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? '#ef4444' : (riskLevel === 'MEDIUM' ? '#f59e0b' : '#10b981')};">
                                    ${riskLevel}
                                </strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #64748b; font-weight: 600;">🚨 Active Road Alerts:</span>
                                <span style="font-weight: 700; color: ${alertCount > 0 ? '#ef4444' : '#10b981'};">
                                    ${alertCount > 0 ? `🚨 ${alertCount} Active Alert${alertCount > 1 ? 's' : ''}` : '🟢 0 Active'}
                                </span>
                            </div>
                        </div>

                        ${isHeavyRain ? `
                            <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 6px; padding: 6px 10px; font-size: 11px; color: #991b1b; margin-bottom: 8px;">
                                ⚡ <strong>Hazard Advisory:</strong> Heavy rainfall triggering active risk escalation across connecting freight corridors.
                            </div>
                        ` : ''}
                    </div>

                    <!-- Action Bar -->
                    <div style="margin-top: 10px; font-size: 11px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 8px; gap: 8px;">
                        <button type="button" class="action-btn-sm" onclick="openWeatherSimulationModal('${w.state}')" style="font-size: 11px; padding: 4px 8px; background: #f8fafc;" title="Simulate weather change for ${w.state}">
                            ⚡ Simulate Hazard
                        </button>
                        <span style="color: var(--primary); font-weight: 600; cursor: pointer;" onclick="switchTab('Dashboard'); if(typeof focusState==='function') focusState('${w.state}');">
                            View GIS Radar →
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.warn("[Weather] Error loading weather view:", err);
        container.innerHTML = `<div style="padding: 20px; color: #dc2626; text-align: center; grid-column: span 3;">Failed to load live weather observations.</div>`;
    }
}

// Phase 14 Weather Simulation Modal Controllers
function openWeatherSimulationModal(stateName) {
    const modal = document.getElementById("modal-simulate-weather");
    if (!modal) return;

    if (stateName) {
        const stateSelect = document.getElementById("sim-weather-state");
        if (stateSelect) stateSelect.value = stateName;
        const distInput = document.getElementById("sim-weather-district");
        if (distInput) distInput.value = `${stateName} Corridor`;
    }

    modal.classList.add("active");
}

function setWeatherSimPreset(rainfall, condition, temp, wind) {
    const rainInput = document.getElementById("sim-weather-rainfall");
    const condInput = document.getElementById("sim-weather-condition");
    const tempInput = document.getElementById("sim-weather-temp");
    const windInput = document.getElementById("sim-weather-wind");

    if (rainInput) rainInput.value = rainfall;
    if (condInput) condInput.value = condition;
    if (tempInput) tempInput.value = temp;
    if (windInput) windInput.value = wind;
}

async function handleWeatherSimulationSubmit(event) {
    if (event && event.preventDefault) event.preventDefault();

    const submitBtn = document.getElementById("btn-submit-weather-sim");
    const origHtml = submitBtn ? submitBtn.innerHTML : "";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = "⏳ Processing Cascade...";
    }

    try {
        const state = document.getElementById("sim-weather-state")?.value || "Meghalaya";
        const district = document.getElementById("sim-weather-district")?.value || `${state} Corridor`;
        const rainfall = parseFloat(document.getElementById("sim-weather-rainfall")?.value || 0);
        const temp = parseFloat(document.getElementById("sim-weather-temp")?.value || 20);
        const wind = parseFloat(document.getElementById("sim-weather-wind")?.value || 30);
        const humidity = parseFloat(document.getElementById("sim-weather-humidity")?.value || 90);
        const condition = document.getElementById("sim-weather-condition")?.value || "Torrential Downpour";

        const payload = {
            state: state,
            district: district,
            rainfall_mm: rainfall,
            temperature_c: temp,
            wind_speed_kmh: wind,
            humidity_pct: humidity,
            condition: condition,
            temperature: temp,
            rainfall: rainfall,
            wind: wind
        };

        const res = await NextraWeather.update(payload);
        closeModals();

        const casc = res?.cascade || {};
        const alertCreated = casc.alert_generated ? "🚨 Alert Broadcasted!" : "Nominal Alert Level";
        if (typeof showToast === 'function') {
            showToast(`⚡ Weather cascade completed for ${state}! Accessibility: ${casc.accessibility_status || 'Updated'} · Risk: ${casc.risk_level || 'Updated'} · ${alertCreated}`);
        }

        // Re-render linked components
        await Promise.all([
            typeof renderWeatherView === 'function' ? renderWeatherView() : null,
            typeof renderAccessibilityView === 'function' ? renderAccessibilityView() : null,
            typeof renderRoadAlerts === 'function' ? renderRoadAlerts() : null,
            typeof loadDashboardData === 'function' ? loadDashboardData() : null,
            typeof fetchAndPlotMapData === 'function' ? fetchAndPlotMapData() : null
        ]);
    } catch (err) {
        console.error("Error submitting weather simulation:", err);
        if (typeof showToast === 'function') {
            showToast(`Weather cascade error: ${err.message || err}`);
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origHtml;
        }
    }
}

async function handleAccessibilityStatusUpdate(state, newStatus) {
    try {
        if (typeof showToast === 'function') showToast(`Updating ${state} accessibility to ${newStatus}...`);
        await NextraAccessibility.update(state, { accessibility_status: newStatus });
        if (typeof showToast === 'function') showToast(`✅ ${state} accessibility set to ${newStatus}`);

        await Promise.all([
            typeof renderAccessibilityView === 'function' ? renderAccessibilityView() : null,
            typeof renderWeatherView === 'function' ? renderWeatherView() : null,
            typeof loadDashboardData === 'function' ? loadDashboardData() : null,
            typeof fetchAndPlotMapData === 'function' ? fetchAndPlotMapData() : null
        ]);
    } catch (err) {
        console.error("Error updating accessibility status:", err);
        if (typeof showToast === 'function') showToast(`Failed to update accessibility: ${err.message || err}`);
    }
}

async function renderRoadAlerts() {
    const container = document.getElementById("road-alerts-container");
    const countPill = document.getElementById("live-alert-count");
    if (!container) return;

    container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-muted);">⏳ Loading real-time corridor alerts from database...</div>`;

    try {
        const alerts = (typeof NextraAlerts !== "undefined" && typeof NextraAlerts.getAll === "function")
            ? await NextraAlerts.getAll()
            : [];

        window.currentAlertsList = alerts || [];

        if (countPill) countPill.textContent = `${alerts ? alerts.length : 0} Active`;

        if (!alerts || alerts.length === 0) {
            container.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-muted);">All mountain corridors open. Zero active road hazard alerts in database.</div>`;
            return;
        }

        container.innerHTML = alerts.map(a => {
            const isCrit = (a.severity === "CRITICAL");
            const isHigh = (a.severity === "HIGH");
            const riskClass = isCrit ? "risk-critical" : (isHigh ? "risk-high" : "risk-medium");
            const lat = a.latitude != null ? a.latitude : 26.14;
            const lng = a.longitude != null ? a.longitude : 91.73;
            const timeAgo = (typeof formatTimeAgo === 'function' && a.created_at) ? formatTimeAgo(a.created_at) : 'Active';
            const escapedTitle = (a.title || '').replace(/'/g, "\\'");

            return `
                <div class="alert-item ${riskClass}" onclick="openAlertDetail(${a.id})" style="cursor: pointer;" title="Click to view alert details">
                    <div class="alert-item-top">
                        <strong>${a.title}</strong>
                        <span class="alert-severity-badge">${a.severity || 'Caution'}</span>
                    </div>
                    <p>${a.description || a.message || 'Safety advisory'}</p>
                    <div class="alert-item-footer">
                        <span>${a.state || 'Northeast'} · ${a.district || 'Corridor'} (${timeAgo})</span>
                        <div style="display: flex; gap: 8px;">
                            <button type="button" class="alert-view-btn alert-locate-btn" onclick="event.stopPropagation(); panToAlert(${lat}, ${lng}, '${escapedTitle}', ${a.id});" title="Locate on Live GIS Map">
                                Locate 🗺️
                            </button>
                            <button type="button" class="alert-view-btn" style="background: rgba(15, 23, 42, 0.08); color: var(--text-main);" onclick="event.stopPropagation(); openAlertDetail(${a.id});" title="Open Alert Details">
                                Details ℹ️
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.warn("[Alerts] Error loading road alerts view:", err);
        container.innerHTML = `<div style="padding: 20px; color: #dc2626; text-align: center;">Failed to load road alerts.</div>`;
    }
}

async function loadDashboardFleetTable() {
    const tbody = document.getElementById("dashboard-fleet-tbody");
    if (!tbody) return;

    try {
        const shipments = (typeof NextraShipments !== "undefined" && typeof NextraShipments.getAll === "function")
            ? await NextraShipments.getAll()
            : [];

        if (!shipments || shipments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:16px;">No active freight shipments staged in database.</td></tr>`;
            return;
        }

        tbody.innerHTML = shipments.slice(0, 10).map(s => {
            const code = s.shipment_code || `SHP-${String(s.id).padStart(3, '0')}`;
            const status = s.status || "IN_TRANSIT";
            const statusClass = status === "DELAYED" ? "status-red" : (status === "COMPLETED" ? "status-green" : "status-blue");
            const origin = s.origin || "Origin Hub";
            const dest = s.destination || "Destination Hub";
            const cargo = s.cargo_type || "General Freight";
            const actualWeight = s.weight_kg != null ? s.weight_kg : (s.weight != null ? s.weight : s.cargo_weight_kg);
            const weight = actualWeight ? (actualWeight >= 100 ? `${(actualWeight / 1000).toFixed(1)}T` : `${actualWeight}T`) : "--";
            const corridor = s.route_name || `${origin} → ${dest}`;

            return `
                <tr>
                    <td><strong class="mono" style="color: var(--primary);">${code}</strong></td>
                    <td>${origin} → ${dest}</td>
                    <td>${cargo} (${weight})</td>
                    <td>${corridor}</td>
                    <td><span class="status-badge ${statusClass}">${status.replace(/_/g, ' ')}</span></td>
                    <td>
                        <button type="button" class="action-btn-sm" onclick="if(typeof trackAndHighlightShipment === 'function') trackAndHighlightShipment(${s.id}); else { switchTab('Shipments'); }">
                            Track GIS →
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.warn("[Dashboard] Error loading fleet telemetry table:", err);
    }
}

// Unified Reactivity Event Bus across all NEXTRA modules
window.refreshNextraLiveData = async function() {
    try {
        const user = typeof getActiveUser === 'function' ? getActiveUser() : null;
        const role = user ? user.role : 'admin';

        // 1. Refresh Topbar Notifications & Badges
        if (typeof loadNotificationCount === 'function') await loadNotificationCount();

        // 2. Refresh Dashboard Live KPIs & Alerts & Telemetry
        if (typeof updateDashboardLiveKPIs === 'function') await updateDashboardLiveKPIs(role);
        if (typeof loadDashboardLiveAlerts === 'function') await loadDashboardLiveAlerts();
        if (typeof loadDashboardFleetTable === 'function') await loadDashboardFleetTable();

        // 3. Refresh Live Map layers & markers
        if (typeof loadAndRenderMapData === 'function') await loadAndRenderMapData();

        // 4. Refresh active views if open
        const activeSection = document.querySelector(".section-panel.active");
        const activeId = activeSection ? activeSection.id : "";

        if (activeId === "section-Verification-Center" && typeof renderVerificationCenter === 'function') {
            await renderVerificationCenter();
        } else if (activeId === "section-Field-Reports" && typeof loadRecentFieldReports === 'function') {
            await loadRecentFieldReports();
        } else if (activeId === "section-Shipments" && typeof renderShipmentsList === 'function') {
            await renderShipmentsList();
        } else if (activeId === "section-Transport-Requests" && typeof renderTransportRequestsList === 'function') {
            await renderTransportRequestsList();
        } else if (activeId === "section-Road-Alerts" && typeof renderRoadAlerts === 'function') {
            await renderRoadAlerts();
        } else if (activeId === "section-Weather" && typeof renderWeatherView === 'function') {
            await renderWeatherView();
        } else if (activeId === "section-Drivers" && typeof renderDriversRoster === 'function') {
            await renderDriversRoster();
        } else if (activeId === "section-Trucks" && typeof renderTrucksFleet === 'function') {
            await renderTrucksFleet();
        } else if (activeId === "section-Accessibility" && typeof renderAccessibilityView === 'function') {
            await renderAccessibilityView();
        } else if (activeId === "section-User-Management" && typeof renderUserManagementTable === 'function') {
            await renderUserManagementTable();
        }
    } catch (err) {
        console.warn("[NEXTRA] Error in refreshNextraLiveData:", err);
    }
};


