/**
 * NEXTRA - North East India GIS & Real Geographic Map Engine (Leaflet.js)
 * High-precision geospatial layers, 8-state boundaries, arterial corridors, and vehicle telemetry.
 */

let map = null;
let tileLayers = {};
let currentLayerIndex = 0;
let truckMarkers = [];
let hazardLayers = [];
let hubMarkers = [];
let routeLines = [];
let plannedRoutePolyline = null;
let alternateRouteLayers = [];
let isFleetVisible = true;
let isHazardsVisible = true;
let areAlternateRoutesVisible = false;
let liveFleetInterval = null;

// Initialize Leaflet Map
function initLeafletMap() {
    const mapElement = document.getElementById("ne-map");
    if (!mapElement) return;

    // Center map over North East India
    map = L.map("ne-map", {
        center: [26.15, 92.8],
        zoom: 7,
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: false
    });

    // CartoDB Voyager (Crisp, High-contrast, Logistics friendly)
    tileLayers.voyager = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 18,
        subdomains: "abcd"
    });

    // OpenStreetMap Standard
    tileLayers.osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18
    });

    // CartoDB Dark (High-tech command view)
    tileLayers.dark = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 18,
        subdomains: "abcd"
    });

    tileLayers.voyager.addTo(map);

    // Draw Map Features
    drawKeyHighwayCorridors();
    drawLogisticsHubs();
    drawHazardZones();
    drawLiveFleet();
    startSimulatedTelemetry();
}

// Draw Major North Eastern Arterial Highway Corridors
function drawKeyHighwayCorridors() {
    // Clear old lines if any
    routeLines.forEach(l => map.removeLayer(l));
    routeLines = [];

    // NH-27: Siliguri -> Bongaigaon -> Guwahati -> Nagaon
    const nh27Coords = [
        [26.72, 88.42], // Siliguri
        [26.50, 90.54], // Bongaigaon
        [26.1445, 91.7362], // Guwahati
        [26.35, 92.68]  // Nagaon
    ];
    const lineNH27 = L.polyline(nh27Coords, {
        color: "#10b981",
        weight: 4.5,
        opacity: 0.85,
        dashArray: "6, 8",
        lineCap: "round"
    }).addTo(map);
    lineNH27.bindTooltip("🟢 NH-27 East-West Expressway (Safe Corridor)", { sticky: true });
    routeLines.push(lineNH27);

    // NH-6: Guwahati -> Shillong -> Jowai -> Sonapur -> Silchar -> Agartala
    const nh6Coords = [
        [26.1445, 91.7362], // Guwahati
        [25.5788, 91.8933], // Shillong
        [25.44, 92.20],     // Jowai
        [25.10, 92.35],     // Sonapur Tunnel
        [24.8333, 92.7789], // Silchar
        [24.20, 92.00],
        [23.8315, 91.2868]  // Agartala
    ];
    const lineNH6 = L.polyline(nh6Coords, {
        color: "#f59e0b",
        weight: 4.5,
        opacity: 0.85,
        lineCap: "round"
    }).addTo(map);
    lineNH6.bindTooltip("🟠 NH-6 Mountain Lifeline (Sonapur Mudslide Warning)", { sticky: true });
    routeLines.push(lineNH6);

    // NH-29: Nagaon -> Dimapur -> Kohima -> Imphal
    const nh29Coords = [
        [26.35, 92.68],     // Nagaon
        [25.90, 93.72],     // Dimapur
        [25.6751, 94.1086], // Kohima
        [24.8170, 93.9368]  // Imphal
    ];
    const lineNH29 = L.polyline(nh29Coords, {
        color: "#10b981",
        weight: 4,
        opacity: 0.85,
        lineCap: "round"
    }).addTo(map);
    lineNH29.bindTooltip("🟢 NH-29 / AH-1 Mountain Freight Route", { sticky: true });
    routeLines.push(lineNH29);

    // NH-10: Siliguri -> Sevoke -> Gangtok
    const nh10Coords = [
        [26.72, 88.42],
        [26.88, 88.47],
        [27.17, 88.52],
        [27.3389, 88.6065]
    ];
    const lineNH10 = L.polyline(nh10Coords, {
        color: "#f59e0b",
        weight: 4,
        opacity: 0.85,
        lineCap: "round"
    }).addTo(map);
    lineNH10.bindTooltip("🟠 NH-10 Teesta Gorge (Rockfall Netting Active)", { sticky: true });
    routeLines.push(lineNH10);
}

// Draw Logistics Hubs
function drawLogisticsHubs() {
    hubMarkers.forEach(m => map.removeLayer(m));
    hubMarkers = [];

    const hubs = [
        { id: "GUW", name: "Guwahati Central Freight Hub", state: "Assam", lat: 26.1445, lng: 91.7362, cap: "12,000 Tons/day" },
        { id: "SHL", name: "Shillong Mountain Depot", state: "Meghalaya", lat: 25.5788, lng: 91.8933, cap: "3,200 Tons/day" },
        { id: "IMP", name: "Imphal Logistics Center", state: "Manipur", lat: 24.8170, lng: 93.9368, cap: "2,800 Tons/day" },
        { id: "AGT", name: "Agartala Multi-Modal Complex", state: "Tripura", lat: 23.8315, lng: 91.2868, cap: "4,100 Tons/day" },
        { id: "AIZ", name: "Aizawl Freight Terminal", state: "Mizoram", lat: 23.7271, lng: 92.7176, cap: "1,900 Tons/day" },
        { id: "KOH", name: "Kohima Staging Depot", state: "Nagaland", lat: 25.6751, lng: 94.1086, cap: "2,400 Tons/day" },
        { id: "ITN", name: "Itanagar Northern Base", state: "Arunachal", lat: 27.0844, lng: 93.6053, cap: "2,100 Tons/day" },
        { id: "GTK", name: "Gangtok Valley Depot", state: "Sikkim", lat: 27.3389, lng: 88.6065, cap: "1,800 Tons/day" },
        { id: "SLC", name: "Silchar Valley Hub", state: "Assam", lat: 24.8333, lng: 92.7789, cap: "3,500 Tons/day" }
    ];

    hubs.forEach(hub => {
        const iconHtml = `
            <div style="background: #059669; border: 2px solid #ffffff; width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 0 8px rgba(5,150,105,0.6);"></div>
        `;
        const icon = L.divIcon({ html: iconHtml, className: "custom-hub-icon", iconSize: [14, 14], iconAnchor: [7, 7] });
        const marker = L.marker([hub.lat, hub.lng], { icon: icon }).addTo(map);
        marker.bindPopup(`
            <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
                <strong style="color: #059669; font-size: 13px;">${hub.name}</strong><br>
                <span>State: ${hub.state}</span><br>
                <span>Capacity: <strong>${hub.cap}</strong></span>
            </div>
        `);
        hubMarkers.push(marker);
    });
}

// Draw Hazard & Risk Zones
function drawHazardZones() {
    hazardLayers.forEach(l => map.removeLayer(l));
    hazardLayers = [];

    const hazards = [
        {
            id: "HZ-01",
            type: "Landslide & Road Blockage",
            level: "CRITICAL",
            location: "NH-6 Sonapur Tunnel, East Jaintia Hills",
            lat: 25.10,
            lng: 92.35,
            radius: 12000,
            color: "#ef4444",
            details: "Debris flow blocking dual lanes. Clearance team active."
        },
        {
            id: "HZ-02",
            type: "Torrential Rain & Low Visibility",
            level: "WARNING",
            location: "Cherrapunji - Shillong Ridge",
            lat: 25.5788,
            lng: 91.8933,
            radius: 20000,
            color: "#f59e0b",
            details: "Precipitation exceeding 65 mm/hr. Reduced speed advisory."
        },
        {
            id: "HZ-03",
            type: "High Mountain Snow & Black Ice",
            level: "WARNING",
            location: "Sela Pass Corridor (NH-13)",
            lat: 27.50,
            lng: 92.10,
            radius: 18000,
            color: "#f59e0b",
            details: "Sub-zero temperatures. Snow chains mandated by administration."
        }
    ];

    hazards.forEach(h => {
        const circle = L.circle([h.lat, h.lng], {
            color: h.color,
            fillColor: h.color,
            fillOpacity: 0.22,
            radius: h.radius,
            weight: 2
        }).addTo(map);

        circle.bindPopup(`
            <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
                <strong style="color: ${h.color}; font-size: 13px;">${h.type} (${h.level})</strong><br>
                <strong>Location:</strong> ${h.location}<br>
                <p style="margin-top: 4px;">${h.details}</p>
            </div>
        `);
        hazardLayers.push(circle);
    });
}

// Draw Live Vehicle Fleet
function drawLiveFleet() {
    truckMarkers.forEach(m => map.removeLayer(m));
    truckMarkers = [];

    const fleet = [
        { id: "VX-104", driver: "Rahul Borah", route: "Guwahati → Shillong", coords: [25.92, 91.82], status: "MOVING", color: "#10b981" },
        { id: "NE-7210", driver: "Bikramjeet Chutia", route: "Guwahati → Imphal", coords: [26.05, 93.45], status: "MOVING", color: "#10b981" },
        { id: "NE-5532", driver: "Pranab Kalita", route: "Shillong → Silchar", coords: [25.10, 92.35], status: "STOPPED", color: "#ef4444" },
        { id: "NE-9104", driver: "Sonam Dorjee", route: "Siliguri → Gangtok", coords: [27.08, 88.48], status: "MOVING", color: "#10b981" }
    ];

    fleet.forEach(truck => {
        const iconHtml = `
            <div style="background: ${truck.color}; color: #ffffff; font-weight: 800; font-size: 9px; padding: 2px 5px; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); white-space: nowrap; border: 1px solid #ffffff; font-family: monospace;">
                🚚 ${truck.id}
            </div>
        `;
        const icon = L.divIcon({ html: iconHtml, className: "custom-truck-icon", iconSize: [52, 18], iconAnchor: [26, 9] });
        const marker = L.marker(truck.coords, { icon: icon }).addTo(map);
        marker.bindPopup(`
            <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
                <strong style="color: ${truck.color}; font-size: 13px;">Unit: ${truck.id}</strong><br>
                <span>Driver: <strong>${truck.driver}</strong></span><br>
                <span>Route: ${truck.route}</span><br>
                <span>Status: <strong>${truck.status}</strong></span>
            </div>
        `);
        truckMarkers.push(marker);
    });
}

// Focus State Function & Details Drawer
function focusState(stateKey) {
    const data = NE_STATES_DATA[stateKey] || NE_STATES_DATA.ALL;
    if (map) {
        map.flyTo(data.center, data.zoom, { duration: 1.2 });
    }

    // Highlight active chip
    document.querySelectorAll(".state-chip").forEach(chip => {
        chip.classList.toggle("active", chip.textContent.toUpperCase().includes(stateKey) || (stateKey === 'ALL' && chip.textContent.includes('All')));
    });

    if (stateKey !== 'ALL') {
        showStateDetailsDrawer(stateKey, data);
    }
}

// Display state details drawer
function showStateDetailsDrawer(stateKey, data) {
    let drawer = document.getElementById("state-details-drawer");
    if (!drawer) {
        drawer = document.createElement("div");
        drawer.id = "state-details-drawer";
        drawer.className = "state-drawer";
        document.body.appendChild(drawer);
    }

    drawer.innerHTML = `
        <div class="state-drawer-header">
            <div>
                <span class="eyebrow dark-eyebrow">State Operations Snapshot</span>
                <h3>${data.name}</h3>
            </div>
            <button type="button" class="drawer-close" onclick="closeStateDrawer()">✕</button>
        </div>
        <div class="state-drawer-body">
            <div class="sd-status-row">
                <span class="status-badge ${data.risk === 'HIGH' ? 'status-red' : data.risk === 'MODERATE' ? 'status-amber' : 'status-green'}">
                    Risk: ${data.risk}
                </span>
                <span class="status-badge status-blue">Accessibility Score: ${data.accessibilityScore}/100</span>
            </div>
            <div class="sd-info-item">
                <small>Weather &amp; Climate</small>
                <strong>${data.weather || 'Monsoon Mountain Belt'}</strong>
            </div>
            <div class="sd-info-item">
                <small>Highway Road Status</small>
                <strong>${data.roadStatus || 'Open with hill caution'}</strong>
            </div>
            <div class="sd-info-item">
                <small>Active Shipments in Transit</small>
                <strong>${data.activeShipments} Consignments</strong>
            </div>
            <div class="sd-info-item">
                <small>Major Logistics Hubs</small>
                <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
                    ${(data.hubs || []).map(h => `<span class="ai-tag">${h}</span>`).join('')}
                </div>
            </div>
        </div>
    `;
    drawer.classList.add("open");
}

function closeStateDrawer() {
    const drawer = document.getElementById("state-details-drawer");
    if (drawer) drawer.classList.remove("open");
}

// Pan to Alert
function panToAlert(lat, lng, name) {
    if (map) {
        map.flyTo([lat, lng], 10, { duration: 1.2 });
        if (typeof showToast === 'function') {
            showToast(`Inspecting hazard at ${name}`);
        }
    }
}

// Telemetry Jitter
function startSimulatedTelemetry() {
    if (liveFleetInterval) clearInterval(liveFleetInterval);
    liveFleetInterval = setInterval(() => {
        truckMarkers.forEach(m => {
            const pos = m.getLatLng();
            pos.lat += (Math.random() - 0.5) * 0.003;
            pos.lng += (Math.random() - 0.5) * 0.003;
            m.setLatLng(pos);
        });
    }, 10000);
}
