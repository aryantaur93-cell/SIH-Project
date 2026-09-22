/**
 * NEXTRA - NE Region X-Intelligent Transport & Routing Assistant
 * AI-Powered Logistics, Multimodal Routing & Regional Accessibility Platform
 * Frontend Interactive Controller & Real Geographic Map Engine
 */

// Global state
let map = null;
let tileLayers = {};
let currentLayerIndex = 0;
let truckMarkers = [];
let hazardLayers = [];
let hubMarkers = [];
let routeLines = [];
let plannedRoutePolyline = null;
let alternateRouteLayers = [];
let weatherLayers = [];
let isFleetVisible = true;
let isHazardsVisible = true;
let areAlternateRoutesVisible = false;
let isWeatherVisible = false;
let liveFleetInterval = null;
let activeUser = null;
let demoFlowStep = 0;

// Role Profiles Configuration (Generic Operational Designations)
const ROLE_ACCESS = {
    admin: {
        label: "Admin",
        name: "Admin",
        initials: "ADM",
        email: "admin@ner.gov.in",
        password: "admin",
        title: "Regional Multi-Modal Command Console",
        description: "Full oversight of all 8 North Eastern states, high-priority risk mitigation, and cross-border multi-modal corridors.",
        actions: [
            { label: "Review 3 Critical Alerts", fn: "openAlertsModal()" },
            { label: "Inspect Live Fleet (124)", fn: "switchTab('Logistics')" },
            { label: "Check Landslide Matrix", fn: "switchTab('Risk Intelligence')" }
        ]
    },
    logistics: {
        label: "Logistics",
        name: "Logistics",
        initials: "LOG",
        email: "logistics@ner.gov.in",
        password: "logistics",
        title: "Freight Dispatch & Mountain Route Optimization",
        description: "Monitor consignment delivery windows, compute weather-aware bypasses, and manage mountain staging depots.",
        actions: [
            { label: "Plan Smart Route", fn: "openRoutePlannerModal()" },
            { label: "Track Shipment", fn: "openTrackModal()" },
            { label: "Open Logistics Fleet", fn: "switchTab('Logistics')" }
        ]
    },
    driver: {
        label: "Driver",
        name: "Driver",
        initials: "DRV",
        email: "driver@ner.gov.in",
        password: "driver",
        title: "Active Vehicle Telemetry & Mountain Safety",
        description: "Real-time safety channel for NH-6 and NH-29 hill corridors. Transmit road condition alerts and receive immediate mountain reroutes.",
        actions: [
            { label: "Report Road Hazard", fn: "openDriverReportModal()" },
            { label: "My Consignment (VX-104)", fn: "openTrackModal()" },
            { label: "Weather Warnings", fn: "switchTab('Risk Intelligence')" }
        ]
    },
    inspector: {
        label: "Field Officer",
        name: "Field Officer",
        initials: "INS",
        email: "inspector@ner.gov.in",
        password: "inspect",
        title: "Ground Truth & Infrastructure Clearance",
        description: "BRO taskforce coordination for road blockages, bridge load monitoring, and remote district accessibility.",
        actions: [
            { label: "Inspect NH-6 Sonapur Tunnel", fn: "focusState('MEGHALAYA')" },
            { label: "Examine Regional Accessibility", fn: "switchTab('Accessibility')" },
            { label: "8-State Hazard Matrix", fn: "switchTab('Risk Intelligence')" }
        ]
    }
};

// North East India 8 States Geo Data & Bounding Centers
const NE_STATES = {
    ALL: {
        name: "Entire North East Region",
        center: [26.15, 92.8],
        zoom: 7,
        desc: "Regional multi-modal logistics grid covering all 8 states"
    },
    ASSAM: {
        name: "Assam",
        center: [26.2006, 92.9376],
        zoom: 7.5,
        desc: "Gateway hub to NE; Brahmaputra logistics corridor & NH-27",
        hubs: ["Guwahati", "Tezpur", "Dibrugarh", "Silchar"]
    },
    MEGHALAYA: {
        name: "Meghalaya",
        center: [25.5788, 91.8933],
        zoom: 8.5,
        desc: "High altitude plateau; NH-6 lifeline to Barak Valley & Tripura",
        hubs: ["Shillong", "Cherrapunji", "Tura"]
    },
    ARUNACHAL: {
        name: "Arunachal Pradesh",
        center: [27.50, 94.00],
        zoom: 7.5,
        desc: "Himalayan frontier corridor; Trans-Arunachal Highway & Sela Pass",
        hubs: ["Itanagar", "Tawang", "Pasighat"]
    },
    NAGALAND: {
        name: "Nagaland",
        center: [25.80, 94.20],
        zoom: 8.5,
        desc: "Mountain supply ridge; NH-29 Dimapur-Kohima arterial route",
        hubs: ["Kohima", "Dimapur"]
    },
    MANIPUR: {
        name: "Manipur",
        center: [24.8170, 93.9368],
        zoom: 8.5,
        desc: "Imphal valley terminal & Asian Highway-1 connectivity",
        hubs: ["Imphal", "Churachandpur"]
    },
    MIZORAM: {
        name: "Mizoram",
        center: [23.40, 92.80],
        zoom: 8.5,
        desc: "Southern hill spine; Kaladan multi-modal transit corridor",
        hubs: ["Aizawl", "Lunglei"]
    },
    TRIPURA: {
        name: "Tripura",
        center: [23.8315, 91.2868],
        zoom: 8.5,
        desc: "Agartala integrated cross-border freight terminal",
        hubs: ["Agartala", "Udaipur"]
    },
    SIKKIM: {
        name: "Sikkim",
        center: [27.45, 88.55],
        zoom: 8.5,
        desc: "Eastern Himalayan corridor; NH-10 Teesta river gorge route",
        hubs: ["Gangtok", "Namchi"]
    }
};

// Key Logistics Hubs Coordinates & Metadata
const LOGISTICS_HUBS = [
    { id: "GUW", name: "Guwahati Central Freight Hub", state: "Assam", lat: 26.1445, lng: 91.7362, cap: "12,000 Tons/day", status: "Optimal", activeTrucks: 58 },
    { id: "SHL", name: "Shillong Mountain Depot", state: "Meghalaya", lat: 25.5788, lng: 91.8933, cap: "3,200 Tons/day", status: "Rain Alert", activeTrucks: 18 },
    { id: "IMP", name: "Imphal Logistics Center", state: "Manipur", lat: 24.8170, lng: 93.9368, cap: "2,800 Tons/day", status: "Operational", activeTrucks: 14 },
    { id: "AGT", name: "Agartala Multi-Modal Complex", state: "Tripura", lat: 23.8315, lng: 91.2868, cap: "4,100 Tons/day", status: "Optimal", activeTrucks: 21 },
    { id: "AIZ", name: "Aizawl Freight Terminal", state: "Mizoram", lat: 23.7271, lng: 92.7176, cap: "1,900 Tons/day", status: "Optimal", activeTrucks: 9 },
    { id: "KOH", name: "Kohima Staging Depot", state: "Nagaland", lat: 25.6751, lng: 94.1086, cap: "2,400 Tons/day", status: "Caution (Fog)", activeTrucks: 11 },
    { id: "ITN", name: "Itanagar Northern Base", state: "Arunachal", lat: 27.0844, lng: 93.6053, cap: "2,100 Tons/day", status: "Clear", activeTrucks: 8 },
    { id: "GTK", name: "Gangtok Valley Logistics Depot", state: "Sikkim", lat: 27.3389, lng: 88.6065, cap: "1,800 Tons/day", status: "Operational", activeTrucks: 7 },
    { id: "SLC", name: "Silchar Valley Hub", state: "Assam", lat: 24.8333, lng: 92.7789, cap: "3,500 Tons/day", status: "Bypass In Effect", activeTrucks: 15 }
];

// Active Fleet Telemetry Data (Real simulated GPS positions along highways)
const FLEET_DATA = [
    {
        id: "VX-104",
        driver: "Fleet Operator Unit #841",
        phone: "Dispatch Desk: +91 361-250001",
        route: "Guwahati → Shillong (NH-6)",
        cargo: "Essential Medical Vaccines (Cold Chain)",
        weight: "2.4 Tons",
        status: "MOVING",
        statusClass: "status-green",
        speed: "42 km/h",
        coords: [25.92, 91.82],
        corridor: "NH-6 Hill Section"
    },
    {
        id: "NE-7210",
        driver: "Freight Crew Unit #721",
        phone: "Dispatch Desk: +91 361-250002",
        route: "Guwahati → Imphal (NH-27 / NH-29)",
        cargo: "Electronics & FMCG Staples",
        weight: "14.8 Tons",
        status: "MOVING",
        statusClass: "status-green",
        speed: "55 km/h",
        coords: [26.05, 93.45],
        corridor: "NH-29 Foothills"
    },
    {
        id: "NE-5532",
        driver: "Heavy Haul Unit #553",
        phone: "Dispatch Desk: +91 361-250003",
        route: "Shillong → Silchar (NH-6)",
        cargo: "Steel & Construction Beams",
        weight: "22.5 Tons",
        status: "STOPPED",
        statusClass: "status-red",
        speed: "0 km/h (Stationary)",
        coords: [25.10, 92.35],
        corridor: "Sonapur Bypass Halt"
    },
    {
        id: "NE-9104",
        driver: "Hill Cargo Team #910",
        phone: "Dispatch Desk: +91 361-250004",
        route: "Siliguri → Gangtok (NH-10)",
        cargo: "Fresh High-Altitude Farm Produce",
        weight: "6.2 Tons",
        status: "MOVING",
        statusClass: "status-green",
        speed: "36 km/h",
        coords: [27.08, 88.48],
        corridor: "NH-10 Teesta Valley"
    },
    {
        id: "NE-3392",
        driver: "Valley Transport Unit #339",
        phone: "Dispatch Desk: +91 361-250005",
        route: "Dimapur → Kohima (NH-29)",
        cargo: "Processed Food & Dairy",
        weight: "8.5 Tons",
        status: "ROUTE DEVIATION",
        statusClass: "status-amber",
        speed: "24 km/h",
        coords: [25.75, 93.98],
        corridor: "Kohima Ghat Road"
    }
];

// Active Hazard & Risk Zones across North East India
const HAZARD_ZONES = [
    {
        id: "HZ-01",
        type: "Landslide & Road Blockage",
        level: "CRITICAL",
        location: "NH-6 Sonapur Tunnel, East Jaintia Hills",
        state: "Meghalaya",
        lat: 25.10,
        lng: 92.35,
        radius: 12000,
        color: "#ef4444",
        details: "Debris flow blocking both lanes. Border Roads Organisation (BRO) bulldozers on site. Expected clearance: 4.5 hours."
    },
    {
        id: "HZ-02",
        type: "Torrential Rain & Low Visibility",
        level: "WARNING",
        location: "Cherrapunji - Shillong Ridge",
        state: "Meghalaya",
        lat: 25.5788,
        lng: 91.8933,
        radius: 24000,
        color: "#f59e0b",
        details: "Precipitation exceeding 70 mm/hr. Heavy fog and risk of aquaplaning on downhill slopes."
    },
    {
        id: "HZ-03",
        type: "High Mountain Snow & Black Ice",
        level: "WARNING",
        location: "Sela Pass Corridor (NH-13)",
        state: "Arunachal Pradesh",
        lat: 27.50,
        lng: 92.10,
        radius: 18000,
        color: "#f59e0b",
        details: "Sub-zero temperatures creating icy stretches above 13,000 ft. Snow chains mandated by district administration."
    },
    {
        id: "HZ-04",
        type: "River Basin High Water Level",
        level: "CAUTION",
        location: "Brahmaputra Lowlands (Kaziranga)",
        state: "Assam",
        lat: 26.58,
        lng: 93.17,
        radius: 16000,
        color: "#0ea5e9",
        details: "River levels at warning mark. Speed limits reduced to 30 km/h to protect wildlife corridor."
    }
];

// Accessibility Pulse Data
const ACCESSIBILITY_PULSE = [
    { type: "Road", name: "NH-6 Sonapur Tunnel", state: "Meghalaya", status: "Restricted", detail: "Single lane clearance in progress", tone: "danger", updated: "4 min ago" },
    { type: "Bridge", name: "Saraighat Bridge approach", state: "Assam", status: "Slow movement", detail: "Heavy freight queue, 25 min delay", tone: "warning", updated: "8 min ago" },
    { type: "Mountain", name: "Sela Pass corridor", state: "Arunachal Pradesh", status: "Convoy only", detail: "Ice warning above 3,900 m", tone: "warning", updated: "12 min ago" },
    { type: "Road", name: "NH-29 Dimapur-Kohima", state: "Nagaland", status: "Open", detail: "Alternating lane traffic", tone: "safe", updated: "16 min ago" }
];

// Predictive Risk Forecasts
const RISK_FORECASTS = [
    { icon: "⛰️", type: "Landslide probability", place: "Jowai - Sonapur corridor", window: "Next 6 hours", score: "78%", tone: "danger", action: "Avoid heavy vehicles" },
    { icon: "🌊", type: "Flash flood watch", place: "Brahmaputra lowlands", window: "Next 12 hours", score: "61%", tone: "warning", action: "Monitor water gauges" },
    { icon: "🌧️", type: "Extreme rainfall", place: "Shillong - Cherrapunji ridge", window: "Next 24 hours", score: "69%", tone: "warning", action: "Reduce mountain speed" }
];

// Driver Safety Channel Alerts
const DRIVER_ALERTS = [
    { id: "DA-01", severity: "urgent", title: "Stop ahead: landslide clearance", message: "NH-6 Sonapur Tunnel is blocked in both directions.", meta: "For NE-5532 · 4 min ago", action: "Pull over safely" },
    { id: "DA-02", severity: "warning", title: "Heavy rain on your corridor", message: "Reduce speed to 30 km/h between Shillong and Cherrapunji.", meta: "For all Meghalaya drivers · 12 min ago", action: "Acknowledge" },
    { id: "DA-03", severity: "info", title: "Alternate route available", message: "A safer NH-27 detour can save 42 minutes on the Imphal run.", meta: "For NE-7210 · 18 min ago", action: "View detour" }
];

// Weather & Climate Points on Map
const MAP_WEATHER_POINTS = [
    { name: "Shillong Ridge", state: "Meghalaya", lat: 25.5788, lng: 91.8933, icon: "🌧️", color: "#367fc4", temperature: "18°C", rainfall: "70 mm/hr", condition: "Heavy rain and low visibility", climate: "Monsoon mountain belt" },
    { name: "Brahmaputra Basin", state: "Assam", lat: 26.58, lng: 93.17, icon: "🌊", color: "#5b78ba", temperature: "27°C", rainfall: "River level: warning", condition: "Flood watch near river basin", climate: "Wet lowland climate" },
    { name: "Sela Pass", state: "Arunachal Pradesh", lat: 27.50, lng: 92.10, icon: "❄️", color: "#6e8ea8", temperature: "-3°C", rainfall: "Snow and ice", condition: "Black ice risk above 3,900 m", climate: "High-altitude alpine climate" },
    { name: "Kohima Hills", state: "Nagaland", lat: 25.6751, lng: 94.1086, icon: "⛅", color: "#c4942f", temperature: "21°C", rainfall: "18 mm/hr", condition: "Scattered showers", climate: "Humid subtropical hills" }
];

// 8 States Risk Matrix Table Data
const RISK_MATRIX_DATA = [
    {
        state: "Meghalaya",
        corridor: "NH-6 (Shillong - Jowai - Silchar)",
        weather: "Heavy Rain (65mm/hr)",
        threat: "Landslide at Sonapur Tunnel",
        status: "High Risk (Restricted)",
        statusClass: "status-red",
        team: "BRO Taskforce 44 (+91 364-250012)"
    },
    {
        state: "Assam",
        corridor: "NH-27 (East-West Corridor)",
        weather: "Overcast / Light Drizzle",
        threat: "Riverbank Erosion near Kaziranga",
        status: "Operational (Caution)",
        statusClass: "status-amber",
        team: "Assam PWD Disaster Desk"
    },
    {
        state: "Arunachal Pradesh",
        corridor: "NH-13 / Balipara-Charduar-Tawang",
        weather: "Sub-zero / Dense Mountain Fog",
        threat: "Black Ice at Sela Pass",
        status: "4x4 & Heavy Convoy Only",
        statusClass: "status-amber",
        team: "BRO Project Vartak"
    },
    {
        state: "Nagaland",
        corridor: "NH-29 (Dimapur - Kohima)",
        weather: "Scattered Showers",
        threat: "Slope Instability at Pakala Pahar",
        status: "Single Lane Alternating",
        statusClass: "status-amber",
        team: "Nagaland NH Cell"
    },
    {
        state: "Manipur",
        corridor: "NH-37 / NH-2 (Imphal - Silchar)",
        weather: "Partly Cloudy (22°C)",
        threat: "Minor Pothole Deformations",
        status: "All Vehicles Open",
        statusClass: "status-green",
        team: "Manipur Transport Dept"
    },
    {
        state: "Mizoram",
        corridor: "NH-306 (Silchar - Vairengte - Aizawl)",
        weather: "Clear / Mild Humidity",
        threat: "Low Geological Threat",
        status: "All Vehicles Open",
        statusClass: "status-green",
        team: "Mizoram PWD Control"
    },
    {
        state: "Tripura",
        corridor: "NH-8 (Churaibari - Agartala)",
        weather: "Sunny (28°C)",
        threat: "None Reported",
        status: "Safe Corridors Active",
        statusClass: "status-green",
        team: "Tripura Road Corp"
    },
    {
        state: "Sikkim",
        corridor: "NH-10 (Sevoke - Rangpo - Gangtok)",
        weather: "Light Rain in Teesta Valley",
        threat: "Rockfall Netting Active",
        status: "Clearance Ongoing",
        statusClass: "status-amber",
        team: "Project Swastik BRO"
    }
];

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    // Keep the workspace locked until a user submits the login form.
    activeUser = null;

    restoreSavedSession();

    // Start Real Map and Clocks
    initClock();
    initLeafletMap();
    renderFleetTables();
    renderRiskMatrix();
    renderLiveIntelligence();
    renderDriverAlerts();
    updateAlternateRoutes();
    startSimulatedTelemetry();

    // Connect Deep Linking & Hash Routing
    syncTabFromHash();
    window.addEventListener("hashchange", syncTabFromHash);

    // Global shortcut for search ('/' key)
    document.addEventListener("keydown", (e) => {
        if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "SELECT") {
            e.preventDefault();
            const searchInput = document.getElementById("global-search");
            if (searchInput) searchInput.focus();
        }
        if (e.key === "Escape") {
            closeModals();
        }
    });
});

// ==========================================================================
// SEAMLESS IN-PAGE NAVIGATION (CONNECTING ALL PAGES)
// ==========================================================================
function switchTab(sectionName, e) {
    if (e && e.preventDefault) {
        e.preventDefault();
    }

    // Close mobile menu and backdrop if open
    closeSidebar();
    if (["Smart Route", "Accessibility", "Field Reports", "Analytics", "Settings"].includes(sectionName)) {
        toggleMoreTools(true);
    }

    // Hide all sections
    document.querySelectorAll(".section-panel").forEach((sec) => {
        sec.classList.remove("active");
    });

    // Remove active class from menu items
    document.querySelectorAll(".menu-item").forEach((item) => {
        item.classList.remove("active");
    });

    // Show target section
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.classList.add("active");
    }

    // Highlight target menu item
    const targetNav = document.getElementById(`nav-${sectionName}`);
    if (targetNav) {
        targetNav.classList.add("active");
    }

    // Update Topbar Breadcrumb
    const bcCurrent = document.getElementById("breadcrumb-current");
    if (bcCurrent) {
        bcCurrent.textContent = sectionName;
    }

    // Update URL hash without reload
    const slug = sectionName.toLowerCase().replace(/\s+/g, "-");
    try {
        history.replaceState(null, null, `#${slug}`);
    } catch (err) {
        window.location.hash = slug;
    }

    // Smooth scroll to top of workspace
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Invalidate Leaflet Map Size when entering Dashboard
    if (sectionName === "Dashboard" && map) {
        setTimeout(() => {
            map.invalidateSize();
        }, 150);
    }
}

// Sync Active Page Tab from URL Hash
function syncTabFromHash() {
    const hash = (window.location.hash || "").replace("#", "").toLowerCase();
    const mapHashToTab = {
        "dashboard": "Dashboard",
        "smart-route": "Smart Route",
        "smartroute": "Smart Route",
        "risk-intelligence": "Risk Intelligence",
        "risk": "Risk Intelligence",
        "accessibility": "Accessibility",
        "logistics": "Logistics",
        "fleet": "Logistics",
        "field-reports": "Field Reports",
        "reports": "Field Reports",
        "analytics": "Analytics",
        "settings": "Settings"
    };

    if (hash && mapHashToTab[hash]) {
        switchTab(mapHashToTab[hash]);
    }
}

// Toggle Mobile Navigation Drawer
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");
    if (sidebar) {
        const isOpen = sidebar.classList.toggle("mobile-open");
        if (backdrop) {
            backdrop.classList.toggle("active", isOpen);
        }
        document.body.classList.toggle("drawer-open", isOpen);
    }
}

function closeSidebar() {
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");
    if (sidebar) {
        sidebar.classList.remove("mobile-open");
    }
    if (backdrop) {
        backdrop.classList.remove("active");
    }
    document.body.classList.remove("drawer-open");
}

// ============================================================================
// ROLE AUTHENTICATION & LOGIN WORKFLOW
// ============================================================================
function handleLogin(event) {
    if (event && event.preventDefault) {
        event.preventDefault();
    }

    const roleSelect = document.getElementById("login-role");
    const role = roleSelect ? roleSelect.value : "admin";
    const account = ROLE_ACCESS[role] || ROLE_ACCESS.admin;
    const email = document.getElementById("login-email")?.value.trim().toLowerCase();
    const password = document.getElementById("login-password")?.value;
    const loginError = document.getElementById("login-error");

    if (email !== account.email || password !== account.password) {
        if (loginError) loginError.textContent = "Access details do not match this role. Check the official credentials or use Fill login details for this prototype.";
        return;
    }

    // Set Active Operational Role (No personal name lock)
    activeUser = account;
    saveSession(role);

    // Smoothly hide login screen
    const loginScreen = document.getElementById("login-screen");
    if (loginScreen) {
        loginScreen.classList.add("hidden");
    }

    // Update Topbar Operational Designation
    const userName = document.getElementById("user-name");
    const userRole = document.getElementById("user-role-label");
    const userAvatar = document.getElementById("user-avatar");
    const greeting = document.getElementById("workspace-greeting");
    const topbarSelect = document.getElementById("role-select");

    if (userName) userName.textContent = account.label;
    if (userRole) userRole.textContent = "NER Operations Desk";
    if (userAvatar) userAvatar.textContent = account.initials;
    if (greeting) greeting.textContent = `Welcome to NER Operations Control 👋 (${account.label})`;
    if (topbarSelect) topbarSelect.value = role;

    // Update Console & Dashboard
    renderRoleConsole();
    switchTab("Dashboard");

    if (map) {
        setTimeout(() => map.invalidateSize(), 150);
    }

    showToast(`Access granted: ${account.label}`);
}

function fillLoginDetails() {
    const roleSelect = document.getElementById("login-role");
    const role = roleSelect ? roleSelect.value : "admin";
    const account = ROLE_ACCESS[role] || ROLE_ACCESS.admin;
    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");
    const error = document.getElementById("login-error");

    if (emailInput) emailInput.value = account.email;
    if (passwordInput) passwordInput.value = account.password;
    if (error) error.textContent = "";
    showToast(`${account.label} login details filled`);
}

function toggleAdvancedMonitoring() {
    const panel = document.getElementById("advanced-monitoring");
    const button = document.getElementById("monitoring-toggle");
    if (!panel || !button) return;
    const isExpanded = panel.classList.toggle("expanded");
    button.setAttribute("aria-expanded", String(isExpanded));
    button.innerHTML = `<span>${isExpanded ? "−" : "＋"}</span> ${isExpanded ? "Hide extra monitoring" : "More monitoring"}`;
}

function toggleMoreTools(forceOpen = null) {
    const tools = document.getElementById("secondary-nav");
    const button = document.getElementById("tools-toggle");
    if (!tools || !button) return;
    const isExpanded = forceOpen === null ? !tools.classList.contains("expanded") : forceOpen;
    tools.classList.toggle("expanded", isExpanded);
    button.setAttribute("aria-expanded", String(isExpanded));
    button.innerHTML = `<span>${isExpanded ? "−" : "＋"}</span> ${isExpanded ? "Hide tools" : "More tools"}`;
}

function advanceDemoFlow() {
    const status = document.getElementById("demo-flow-status");
    const card = document.getElementById("demo-flow-card");
    const button = document.getElementById("demo-flow-button");
    const steps = document.querySelectorAll("#demo-flow-steps span");
    if (!status || !card || !button) return;

    demoFlowStep = Math.min(demoFlowStep + 1, 4);
    steps.forEach((step, index) => step.classList.toggle("active", index <= demoFlowStep));
    const states = [
        { status: "Risk detected", title: "High landslide risk detected", detail: "AI analysis flags Route A as unsafe. Confidence is simulated for this demo.", button: "Show alternative routes" },
        { status: "Alternative found", title: "Route B recommended", detail: "+18 km · +42 min · Low risk. Reason: avoids the blocked Sonapur section.", button: "Accept Route B" },
        { status: "Route accepted", title: "Route B accepted for VX-104", detail: "ETA updated to 11:42 AM. The dispatch route is now highlighted on the map.", button: "Send driver alert" },
        { status: "Driver alerted", title: "Driver alert delivered", detail: "VX-104 received: 'Landslide reported 5.2 km ahead. Use Alternative Route B.'", button: "Open field verification" },
        { status: "Ready to verify", title: "Field verification required", detail: "The field officer can now confirm the incident and update the shared system.", button: "Open verification form" }
    ];
    const state = states[demoFlowStep];
    status.textContent = state.status;
    card.querySelector(".demo-flow-alert").innerHTML = `<b>${state.title}</b><span>${state.detail}</span>`;
    button.innerHTML = `${state.button} <span>→</span>`;

    if (demoFlowStep >= 2 && map && !areAlternateRoutesVisible) toggleAlternateRoutesOnMap();
    if (demoFlowStep === 3) showToast("Driver alert sent to VX-104");
    if (demoFlowStep === 4) switchTab("Field Reports");
}

function submitFieldReport() {
    const type = document.getElementById("report-type")?.value || "Landslide";
    const severity = document.getElementById("report-severity")?.value || "High";
    const location = document.getElementById("report-location")?.value || "NH-6 Sonapur";
    const queue = document.getElementById("incident-queue");
    const count = document.getElementById("field-report-count");
    if (queue) {
        const report = document.createElement("div");
        report.className = "incident-queue-row verified-report";
        report.innerHTML = `<span class="queue-icon safe">✓</span><div><strong>${type} verified</strong><small>${location} · Submitted just now</small></div><span class="status-badge status-green">${severity} / Verified</span>`;
        queue.prepend(report);
    }
    if (count) count.textContent = "08";
    demoFlowStep = 4;
    document.getElementById("demo-flow-status")?.replaceChildren(document.createTextNode("System updated"));
    document.getElementById("demo-flow-card")?.querySelector(".demo-flow-alert")?.replaceChildren(
        Object.assign(document.createElement("b"), { textContent: "Field verification complete" }),
        Object.assign(document.createElement("span"), { textContent: "VX-104 incident is now verified and visible to the operations team." })
    );
    showToast("Verified field report added to the NEXTRA system");
}

function logout() {
    activeUser = null;
    localStorage.removeItem("nextraRole");
    localStorage.removeItem("antiGravityRole");
    const loginScreen = document.getElementById("login-screen");
    if (loginScreen) {
        loginScreen.classList.remove("hidden");
    }

    const passInput = document.getElementById("login-password");
    if (passInput) passInput.value = "";

    const errText = document.getElementById("login-error");
    if (errText) errText.textContent = "";

    showToast("Signed out. Returned to NEXTRA command portal.");
}

function saveSession(role) {
    localStorage.setItem("nextraRole", role);
}

function restoreSavedSession() {
    const savedRole = localStorage.getItem("nextraRole") || localStorage.getItem("antiGravityRole");
    const account = ROLE_ACCESS[savedRole];
    if (!account) return;

    activeUser = account;
    const loginScreen = document.getElementById("login-screen");
    if (loginScreen) loginScreen.classList.add("hidden");
    updateUserChrome(account, savedRole);
    renderRoleConsole();
}

function updateUserChrome(account, roleKey) {
    const userName = document.getElementById("user-name");
    const userRole = document.getElementById("user-role-label");
    const userAvatar = document.getElementById("user-avatar");
    const greeting = document.getElementById("workspace-greeting");
    const topbarSelect = document.getElementById("role-select");

    if (userName) userName.textContent = account.label;
    if (userRole) userRole.textContent = "NEXTRA Operations Desk";
    if (userAvatar) userAvatar.textContent = account.initials;
    if (greeting) greeting.textContent = `Welcome to NEXTRA Regional Command Console 👋 (${account.label})`;
    if (topbarSelect) topbarSelect.value = roleKey;
}

function navigateToPage(page) {
    window.location.href = page;
}

function switchRole(roleKey) {
    const account = ROLE_ACCESS[roleKey] || ROLE_ACCESS.admin;
    activeUser = account;

    // Update Topbar Operational Designation
    const userName = document.getElementById("user-name");
    const userRole = document.getElementById("user-role-label");
    const userAvatar = document.getElementById("user-avatar");
    const greeting = document.getElementById("workspace-greeting");

    if (userName) userName.textContent = account.label;
    if (userRole) userRole.textContent = "NEXTRA Operations Desk";
    if (userAvatar) userAvatar.textContent = account.initials;
    if (greeting) greeting.textContent = `Welcome to NEXTRA Regional Command Console 👋 (${account.label})`;

    renderRoleConsole();
    showToast(`Switched workspace perspective to: ${account.label}`);
}

function renderRoleConsole() {
    const account = activeUser || ROLE_ACCESS.admin;
    const consoleElement = document.getElementById("role-console");
    if (!consoleElement) return;

    consoleElement.innerHTML = `
        <div class="role-console-copy">
            <span class="eyebrow">${account.label} Workspace</span>
            <h3>${account.title}</h3>
            <p>${account.description}</p>
        </div>
        <div class="role-console-actions">
            ${account.actions.map((action) => `
                <button type="button" class="role-action" onclick="${action.fn}">
                    ${action.label} <span>→</span>
                </button>
            `).join("")}
        </div>
    `;
}

// ==========================================================================
// REAL MAP INITIALIZATION (LEAFLET.JS)
// ==========================================================================
function initLeafletMap() {
    const mapElement = document.getElementById("ne-map");
    if (!mapElement) return;

    // Center map specifically over North East India
    map = L.map("ne-map", {
        center: [26.15, 92.8],
        zoom: 7,
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: false
    });

    // Layer 1: CartoDB Voyager (Crisp, High-contrast, Logistics friendly)
    tileLayers.voyager = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 18,
        subdomains: "abcd"
    });

    // Layer 2: OpenStreetMap Standard
    tileLayers.osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18
    });

    // Layer 3: CartoDB Dark (High-tech command center view)
    tileLayers.dark = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 18,
        subdomains: "abcd"
    });

    // Add initial base tile layer
    tileLayers.voyager.addTo(map);

    // Render Map Layers
    drawKeyHighwayCorridors();
    drawLogisticsHubs();
    drawHazardZones();
    drawLiveFleet();
}

// Draw Major North Eastern Arterial Highway Corridors
function drawKeyHighwayCorridors() {
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
        color: "#2563eb",
        weight: 4,
        opacity: 0.85,
        dashArray: "4, 6"
    }).addTo(map);
    lineNH29.bindTooltip("🔵 NH-29 / AH-1 Manipur Supply Corridor", { sticky: true });
    routeLines.push(lineNH29);

    // NH-10: Siliguri -> Rangpo -> Gangtok
    const nh10Coords = [
        [26.72, 88.42], // Siliguri
        [27.17, 88.52], // Rangpo
        [27.3389, 88.6065] // Gangtok
    ];
    const lineNH10 = L.polyline(nh10Coords, {
        color: "#10b981",
        weight: 4,
        opacity: 0.8
    }).addTo(map);
    lineNH10.bindTooltip("🟢 NH-10 Sikkim Teesta Corridor", { sticky: true });
    routeLines.push(lineNH10);
}

// Draw Logistics Hub Markers on Map
function drawLogisticsHubs() {
    LOGISTICS_HUBS.forEach((hub) => {
        const hubIcon = L.divIcon({
            className: "custom-hub-pin",
            html: `<div class="hub-marker-icon" title="${hub.name}">🏛️</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        const marker = L.marker([hub.lat, hub.lng], { icon: hubIcon }).addTo(map);
        marker.bindPopup(`
            <div class="popup-title">${hub.name}</div>
            <div class="popup-subtitle">${hub.state} • Regional Hub</div>
            <div style="font-size: 12px; margin-bottom: 6px;">
                <strong>Daily Freight Capacity:</strong> ${hub.cap}<br>
                <strong>Active Assigned Fleet:</strong> ${hub.activeTrucks} Trucks<br>
                <strong>Corridor Status:</strong> <span style="color: ${hub.status.includes('Alert') ? '#f59e0b' : '#10b981'}; font-weight: 700;">${hub.status}</span>
            </div>
            <button type="button" class="action-btn-sm" style="width: 100%;" onclick="openRouteFromHub('${hub.id}')">
                Route From Here →
            </button>
        `);
        hubMarkers.push(marker);
    });
}

// Draw Pulsing Hazard Circles and Warning Markers
function drawHazardZones() {
    HAZARD_ZONES.forEach((hazard) => {
        const hazardIcon = L.divIcon({
            className: "custom-hazard-pulse",
            html: `<div class="hazard-marker-pulse ${hazard.level === 'CRITICAL' ? 'critical' : ''}">⚠️</div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
        });

        const marker = L.marker([hazard.lat, hazard.lng], { icon: hazardIcon }).addTo(map);
        marker.bindPopup(`
            <div class="popup-badge" style="background: ${hazard.color}; color: #ffffff;">${hazard.level}: ${hazard.type}</div>
            <div class="popup-title">${hazard.location}</div>
            <div class="popup-subtitle">${hazard.state}</div>
            <p style="font-size: 12px; color: #475569; margin: 6px 0;">${hazard.details}</p>
            <div style="font-size: 11px; color: #94a3b8;">BRO Emergency Highway Response Active</div>
        `);

        // Surrounding radius circle
        const circle = L.circle([hazard.lat, hazard.lng], {
            radius: hazard.radius,
            color: hazard.color,
            fillColor: hazard.color,
            fillOpacity: 0.14,
            weight: 1.5,
            dashArray: "4, 6"
        }).addTo(map);

        hazardLayers.push(marker);
        hazardLayers.push(circle);
    });
}

// Draw Weather & Climate Overlay Points on Map
function drawMapWeather() {
    weatherLayers.forEach((layer) => map.removeLayer(layer));
    weatherLayers = [];

    MAP_WEATHER_POINTS.forEach((point) => {
        const icon = L.divIcon({
            className: "custom-weather-pin",
            html: `<div class="weather-marker-pin" style="background: ${point.color};">${point.icon}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        const marker = L.marker([point.lat, point.lng], { icon }).addTo(map);
        marker.bindPopup(`
            <div class="popup-title">${point.icon} ${point.name}</div>
            <div class="popup-subtitle">${point.state} · ${point.climate}</div>
            <div style="font-size: 12px; margin-top: 6px; line-height: 1.6;">
                <strong>Temperature:</strong> ${point.temperature}<br>
                <strong>Precipitation:</strong> ${point.rainfall}<br>
                <strong>Advisory:</strong> ${point.condition}
            </div>
        `);
        weatherLayers.push(marker);
    });
}

// Draw Weather-Aware Alternate Routes on Map
function drawAlternateRoutesOnMap() {
    alternateRouteLayers.forEach((layer) => map.removeLayer(layer));
    alternateRouteLayers = [];

    const routes = [
        {
            name: "NH-27 East-West Bypass (Safe)",
            color: "#10b981",
            coords: [[26.1445, 91.7362], [26.35, 92.68], [25.90, 93.72], [24.8170, 93.9368]],
            info: "Recommended bypass avoiding Sonapur landslide · 521 km · 10h 32m"
        },
        {
            name: "NH-6 Mountain Corridor (Blocked at Sonapur)",
            color: "#ef4444",
            coords: [[26.1445, 91.7362], [25.5788, 91.8933], [25.10, 92.35], [24.8333, 92.7789]],
            info: "Direct route · Blockage reported · 467 km · Halted"
        }
    ];

    routes.forEach((route) => {
        const poly = L.polyline(route.coords, {
            color: route.color,
            weight: 5,
            opacity: 0.85,
            dashArray: route.color === "#10b981" ? "8, 6" : "4, 6"
        }).addTo(map);
        poly.bindTooltip(route.info, { sticky: true });
        alternateRouteLayers.push(poly);
    });
}

// Draw Live Delivery Fleet Trucks with Custom Moving Icons
function drawLiveFleet() {
    truckMarkers.forEach((m) => map.removeLayer(m));
    truckMarkers = [];

    FLEET_DATA.forEach((truck) => {
        const isDelayed = truck.status === "STOPPED" || truck.status === "DELAYED";
        const truckIcon = L.divIcon({
            className: "custom-truck-pin",
            html: `<div class="truck-marker-icon ${isDelayed ? 'delayed' : ''}" title="${truck.id}">🚚</div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17]
        });

        const marker = L.marker(truck.coords, { icon: truckIcon }).addTo(map);
        marker.bindPopup(`
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <span class="popup-title mono" style="color: #2563eb;">${truck.id}</span>
                <span class="status-badge ${truck.statusClass}">${truck.status}</span>
            </div>
            <div class="popup-subtitle">${truck.route}</div>
            <div style="font-size: 12px; line-height: 1.6;">
                <strong>Cargo:</strong> ${truck.cargo} (${truck.weight})<br>
                <strong>Assigned Unit:</strong> ${truck.driver} (${truck.phone})<br>
                <strong>Speed:</strong> <span class="mono" style="font-weight: 700;">${truck.speed}</span><br>
                <strong>Location:</strong> ${truck.corridor}
            </div>
        `);
        truckMarkers.push(marker);
    });

    const fleetChip = document.getElementById("fleet-count-chip");
    if (fleetChip) fleetChip.textContent = FLEET_DATA.length;
}

// ==========================================================================
// STATE FOCUS FILTER LOGIC
// ==========================================================================
function focusState(stateKey) {
    if (!map) return;

    // Switch to Dashboard if currently on another tab
    switchTab("Dashboard");

    // Update active button state
    document.querySelectorAll(".state-chip").forEach((btn) => {
        btn.classList.remove("active");
    });
    if (window.event && window.event.currentTarget && window.event.currentTarget.classList) {
        window.event.currentTarget.classList.add("active");
    }

    const stateData = NE_STATES[stateKey];
    if (!stateData) return;

    // Smooth Fly-To Animation
    map.flyTo(stateData.center, stateData.zoom, {
        duration: 1.2,
        easeLinearity: 0.25
    });

    // Update bottom label
    const label = document.getElementById("map-active-state-tag");
    if (label) {
        label.innerHTML = `📍 Focused: <strong>${stateData.name}</strong> — ${stateData.desc}`;
    }

    showToast(`Focused map camera on ${stateData.name}`);
}

function resetMapView() {
    focusState("ALL");
    const allBtn = document.querySelector(".state-chip");
    if (allBtn) {
        document.querySelectorAll(".state-chip").forEach((b) => b.classList.remove("active"));
        allBtn.classList.add("active");
    }
}

// ==========================================================================
// MAP CONTROLS & TOGGLES
// ==========================================================================
function toggleMapFleet() {
    const btn = document.getElementById("btn-toggle-fleet");
    if (isFleetVisible) {
        truckMarkers.forEach((m) => map.removeLayer(m));
        isFleetVisible = false;
        if (btn) btn.classList.remove("active");
        showToast("Live fleet markers hidden");
    } else {
        drawLiveFleet();
        isFleetVisible = true;
        if (btn) btn.classList.add("active");
        showToast("Live fleet markers enabled");
    }
}

function toggleMapHazards() {
    const btn = document.getElementById("btn-toggle-hazards");
    if (isHazardsVisible) {
        hazardLayers.forEach((l) => map.removeLayer(l));
        isHazardsVisible = false;
        if (btn) btn.classList.remove("active");
        showToast("Hazard zones hidden");
    } else {
        drawHazardZones();
        isHazardsVisible = true;
        if (btn) btn.classList.add("active");
        showToast("Hazard zones visible");
    }
}

function toggleAlternateRoutesOnMap() {
    const btn = document.getElementById("btn-toggle-routes");
    if (areAlternateRoutesVisible) {
        alternateRouteLayers.forEach((l) => map.removeLayer(l));
        areAlternateRoutesVisible = false;
        if (btn) btn.classList.remove("active");
        showToast("Alternate routes hidden");
    } else {
        drawAlternateRoutesOnMap();
        areAlternateRoutesVisible = true;
        if (btn) btn.classList.add("active");
        showToast("Showing weather-aware alternate bypass routes");
    }
}

function toggleMapWeather() {
    const btn = document.getElementById("btn-toggle-weather");
    if (isWeatherVisible) {
        weatherLayers.forEach((l) => map.removeLayer(l));
        isWeatherVisible = false;
        if (btn) btn.classList.remove("active");
        showToast("Weather points hidden");
    } else {
        drawMapWeather();
        isWeatherVisible = true;
        if (btn) btn.classList.add("active");
        showToast("Showing live weather & climate observations");
    }
}

function cycleMapLayer() {
    const layers = ["voyager", "dark", "osm"];
    const currentLayerName = layers[currentLayerIndex];
    map.removeLayer(tileLayers[currentLayerName]);

    currentLayerIndex = (currentLayerIndex + 1) % layers.length;
    const nextLayerName = layers[currentLayerIndex];
    tileLayers[nextLayerName].addTo(map);

    showToast(`Map tile switched to: ${nextLayerName.toUpperCase()}`);
}

// Pan Directly to an Alert Location
function panToAlert(lat, lng, name) {
    if (!map) return;
    switchTab("Dashboard");
    map.flyTo([lat, lng], 10, { duration: 1.2 });
    showToast(`Inspecting hazard: ${name}`);
}

// ==========================================================================
// RENDER LIVE INTELLIGENCE & DRIVER ALERTS
// ==========================================================================
function renderLiveIntelligence() {
    const accessList = document.getElementById("live-accessibility-list");
    const forecastList = document.getElementById("risk-forecast-list");

    if (accessList) {
        accessList.innerHTML = ACCESSIBILITY_PULSE.map((item) => `
            <button type="button" class="access-row" onclick="focusIntelligenceLocation('${item.state}')">
                <span class="access-type ${item.tone}">${item.type}</span>
                <span class="access-main"><strong>${item.name}</strong><small>${item.detail}</small></span>
                <span class="access-status ${item.tone}">${item.status}<small>${item.updated}</small></span>
            </button>
        `).join("");
    }

    if (forecastList) {
        forecastList.innerHTML = RISK_FORECASTS.map((item) => `
            <button type="button" class="forecast-row" onclick="switchTab('Risk Intelligence')">
                <span class="forecast-icon ${item.tone}">${item.icon}</span>
                <span class="forecast-main"><strong>${item.type}</strong><small>${item.place} · ${item.window}</small></span>
                <span class="forecast-score ${item.tone}">${item.score}<small>${item.action}</small></span>
            </button>
        `).join("");
    }
}

function focusIntelligenceLocation(stateName) {
    const stateKey = Object.keys(NE_STATES).find((key) => NE_STATES[key].name === stateName || key === stateName.toUpperCase());
    if (stateKey) {
        switchTab("Dashboard");
        focusState(stateKey);
    } else {
        showToast(`Opening live conditions for ${stateName}`);
    }
}

function renderDriverAlerts() {
    const list = document.getElementById("driver-alert-list");
    if (!list) return;

    list.innerHTML = DRIVER_ALERTS.map((alert) => `
        <div class="driver-alert-row ${alert.severity}" id="${alert.id}">
            <span class="driver-alert-icon">${alert.severity === "urgent" ? "!" : alert.severity === "warning" ? "⚠️" : "ℹ️"}</span>
            <div class="driver-alert-copy">
                <strong>${alert.title}</strong>
                <p>${alert.message}</p>
                <small>${alert.meta}</small>
            </div>
            <button type="button" class="driver-alert-action" onclick="handleDriverAlert('${alert.id}', '${alert.action}')">
                ${alert.action}
            </button>
        </div>
    `).join("");
}

function handleDriverAlert(alertId, action) {
    const alert = document.getElementById(alertId);
    if (action === "View detour") {
        switchTab("Smart Route");
        showToast("Opening weather-aware alternate route recommendations");
        return;
    }

    if (alert) {
        alert.classList.add("acknowledged");
        const button = alert.querySelector(".driver-alert-action");
        if (button) {
            button.textContent = "Acknowledged";
            button.disabled = true;
        }
    }

    const count = document.getElementById("driver-unread-count");
    if (count) {
        const remaining = document.querySelectorAll(".driver-alert-row:not(.acknowledged)").length;
        count.textContent = `${remaining} unread`;
    }

    showToast(`${action} recorded for driver safety channel`);
}

function markAllAlertsRead() {
    document.querySelectorAll("#alert-list-container .alert-item").forEach((alert) => alert.classList.add("is-read"));
    const count = document.getElementById("live-alert-count");
    const unread = document.getElementById("unread-alert-count");
    if (count) count.textContent = "0 Active";
    if (unread) unread.textContent = "0";
    showToast("All risk alerts marked as read");
}

// ==========================================================================
// RENDER DATA TABLES & CARDS
// ==========================================================================
function renderFleetTables() {
    const dashTbody = document.getElementById("dashboard-fleet-tbody");
    const fullTbody = document.getElementById("full-fleet-tbody");

    if (dashTbody) dashTbody.innerHTML = "";
    if (fullTbody) fullTbody.innerHTML = "";

    FLEET_DATA.forEach((truck) => {
        // Mini preview on dashboard
        if (dashTbody) {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><strong class="mono" style="color: #2563eb;">${truck.id}</strong></td>
                <td>${truck.route}</td>
                <td>${truck.cargo}</td>
                <td><span style="font-size: 11.5px; color: #64748b;">${truck.corridor}</span></td>
                <td><span class="status-badge ${truck.statusClass}">${truck.status}</span></td>
                <td>
                    <button type="button" class="action-btn-sm" onclick="locateTruck('${truck.id}')">Locate</button>
                </td>
            `;
            dashTbody.appendChild(row);
        }

        // Full fleet table
        if (fullTbody) {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>
                    <strong class="mono" style="font-size: 13.5px; color: #2563eb;">${truck.id}</strong>
                    <div style="font-size: 11px; color: #94a3b8;">GPS: ${truck.coords[0].toFixed(2)}°N, ${truck.coords[1].toFixed(2)}°E</div>
                </td>
                <td>
                    <strong>${truck.driver}</strong>
                    <div style="font-size: 11px; color: #64748b;">${truck.phone}</div>
                </td>
                <td>${truck.route}</td>
                <td>
                    <strong>${truck.cargo}</strong>
                    <div style="font-size: 11px; color: #64748b;">Gross: ${truck.weight}</div>
                </td>
                <td>
                    <strong class="mono">${truck.speed}</strong>
                    <div style="font-size: 11px; color: #64748b;">Corridor: ${truck.corridor}</div>
                </td>
                <td><span class="status-badge ${truck.statusClass}">${truck.status}</span></td>
                <td>
                    <button type="button" class="action-btn-sm" onclick="locateTruck('${truck.id}')">Track on Map</button>
                </td>
            `;
            fullTbody.appendChild(row);
        }
    });
}

function renderRiskMatrix(filter = "ALL") {
    const tbody = document.getElementById("risk-matrix-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const data = filter === "HIGH" 
        ? RISK_MATRIX_DATA.filter((r) => r.status.includes("High"))
        : RISK_MATRIX_DATA;

    data.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${item.state}</strong></td>
            <td>${item.corridor}</td>
            <td>${item.weather}</td>
            <td>${item.threat}</td>
            <td><span class="status-badge ${item.statusClass}">${item.status}</span></td>
            <td><span style="font-size: 12px; color: #475569;">${item.team}</span></td>
        `;
        tbody.appendChild(row);
    });
}

function filterRiskTable(type) {
    const allBtn = document.getElementById("btn-risk-all");
    const highBtn = document.getElementById("btn-risk-high");
    if (type === "HIGH") {
        highBtn?.classList.add("active");
        allBtn?.classList.remove("active");
    } else {
        allBtn?.classList.add("active");
        highBtn?.classList.remove("active");
    }

    renderRiskMatrix(type);
    showToast(`Risk matrix filtered by: ${type}`);
}

function filterFleetTable() {
    const input = document.getElementById("fleet-search-input");
    const filter = input ? input.value.toUpperCase() : "";
    const rows = document.querySelectorAll("#full-fleet-tbody tr");

    rows.forEach((r) => {
        const text = r.textContent || r.innerText;
        r.style.display = text.toUpperCase().includes(filter) ? "" : "none";
    });
}

// Locate Truck on Map
function locateTruck(truckId) {
    const truck = FLEET_DATA.find((t) => t.id === truckId);
    if (!truck || !map) return;

    switchTab("Dashboard");
    map.flyTo(truck.coords, 9.5, { duration: 1.2 });

    // Open popup of matching marker
    const markerIndex = FLEET_DATA.findIndex((t) => t.id === truckId);
    if (truckMarkers[markerIndex]) {
        truckMarkers[markerIndex].openPopup();
    }

    showToast(`Tracking vehicle ${truck.id} on live corridor map`);
}

// ==========================================================================
// SMART ROUTE CALCULATOR & ALTERNATE ROUTES
// ==========================================================================
function updateAlternateRoutes() {
    const origin = document.getElementById("route-origin")?.value || "GUW";
    const dest = document.getElementById("route-destination")?.value || "IMP";
    renderAlternateRoutes(origin, dest);
}

function renderAlternateRoutes(originId, destinationId) {
    const list = document.getElementById("alternate-route-list");
    if (!list) return;

    const origin = LOGISTICS_HUBS.find((hub) => hub.id === originId) || LOGISTICS_HUBS[0];
    const destination = LOGISTICS_HUBS.find((hub) => hub.id === destinationId) || LOGISTICS_HUBS[1];
    const directDistance = Math.round(Math.sqrt((origin.lat - destination.lat) ** 2 + (origin.lng - destination.lng) ** 2) * 111 * 1.35);

    const routes = [
        {
            name: "Recommended · NH-27 East-West Bypass",
            distance: directDistance + 36,
            eta: "10h 32m",
            weather: "Light rain (Safe)",
            risk: "Low Risk",
            tone: "safe"
        },
        {
            name: "Direct Corridor · NH-29 Mountain Ridge",
            distance: directDistance,
            eta: "11h 15m",
            weather: "Heavy showers",
            risk: "Medium Risk",
            tone: "warning"
        },
        {
            name: "Southern Mountain · NH-6 Route",
            distance: directDistance - 18,
            eta: "9h 48m",
            weather: "Landslide watch",
            risk: "High Risk",
            tone: "danger"
        }
    ];

    list.innerHTML = routes.map((route, index) => `
        <button type="button" class="alternate-route ${index === 0 ? "selected" : ""}" onclick="selectAlternateRoute(this, '${route.name}')">
            <span class="route-radio"></span>
            <span class="alternate-route-name">
                <strong>${route.name}</strong>
                <small>${origin.name} to ${destination.name}</small>
            </span>
            <span class="alternate-route-stat">
                <strong>${route.distance} km</strong>
                <small>${route.eta}</small>
            </span>
            <span class="weather-chip ${route.tone}">${route.weather}</span>
            <span class="route-risk ${route.tone}">${route.risk}</span>
        </button>
    `).join("");
}

function selectAlternateRoute(button, routeName) {
    document.querySelectorAll(".alternate-route").forEach((route) => route.classList.remove("selected"));
    button.classList.add("selected");
    showToast(`Route option selected: ${routeName}`);
}

function calculateSmartRoute() {
    const origin = document.getElementById("route-origin").value;
    const dest = document.getElementById("route-destination").value;

    const originHub = LOGISTICS_HUBS.find((h) => h.id === origin) || LOGISTICS_HUBS[0];
    const destHub = LOGISTICS_HUBS.find((h) => h.id === dest) || LOGISTICS_HUBS[1];

    if (origin === dest) {
        showToast("Please select different origin and destination hubs.");
        return;
    }

    // Distance calculation approximation
    const latDiff = Math.abs(originHub.lat - destHub.lat);
    const lngDiff = Math.abs(originHub.lng - destHub.lng);
    const approxDist = Math.round(Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111 * 1.35); // Hill winding factor
    const approxHours = Math.floor(approxDist / 38);
    const approxMins = Math.round(((approxDist / 38) - approxHours) * 60);

    // Update UI
    const distEl = document.getElementById("route-calc-dist");
    const etaEl = document.getElementById("route-calc-eta");
    const nameEl = document.getElementById("route-corridor-name");
    const advisoryEl = document.getElementById("route-calc-advisory");

    if (distEl) distEl.textContent = `${approxDist} km`;
    if (etaEl) etaEl.textContent = `${approxHours}h ${approxMins}m`;
    if (nameEl) nameEl.textContent = `${originHub.name} → ${destHub.name}`;

    if (advisoryEl) {
        advisoryEl.textContent = `Route connects ${originHub.state} to ${destHub.state}. Detour check complete: Mountain bypass recommended around Sonapur NH-6 if heading south. All main highways monitored.`;
    }

    renderAlternateRoutes(origin, dest);
    showToast(`Optimal route computed: ${approxDist} km (${approxHours}h ${approxMins}m)`);
}

function plotRouteOnMainMap() {
    const origin = document.getElementById("route-origin").value;
    const dest = document.getElementById("route-destination").value;

    const originHub = LOGISTICS_HUBS.find((h) => h.id === origin) || LOGISTICS_HUBS[0];
    const destHub = LOGISTICS_HUBS.find((h) => h.id === dest) || LOGISTICS_HUBS[1];

    switchTab("Dashboard");

    if (plannedRoutePolyline) {
        map.removeLayer(plannedRoutePolyline);
    }

    // Draw high-visibility route line
    const waypoints = [
        [originHub.lat, originHub.lng],
        [(originHub.lat + destHub.lat) / 2 + 0.1, (originHub.lng + destHub.lng) / 2],
        [destHub.lat, destHub.lng]
    ];

    plannedRoutePolyline = L.polyline(waypoints, {
        color: "#8b5cf6",
        weight: 6,
        opacity: 0.9,
        dashArray: "8, 8"
    }).addTo(map);

    map.fitBounds(plannedRoutePolyline.getBounds(), { padding: [50, 50] });
    showToast(`Plotted dispatch route on live map: ${originHub.name} to ${destHub.name}`);
}

function openRouteFromHub(hubId) {
    switchTab("Smart Route");
    const originSelect = document.getElementById("route-origin");
    if (originSelect) originSelect.value = hubId;
    calculateSmartRoute();
}

// ==========================================================================
// MODAL HANDLERS
// ==========================================================================
function openRoutePlannerModal() {
    const modal = document.getElementById("modal-route");
    if (modal) modal.classList.add("active");
}

function openTrackModal() {
    const modal = document.getElementById("modal-track");
    if (modal) modal.classList.add("active");
}

function openAlertsModal() {
    switchTab("Dashboard");
    const alertBox = document.querySelector(".alert-box");
    if (alertBox) {
        alertBox.scrollIntoView({ behavior: "smooth" });
        showToast("Reviewing active North East AI risk alerts");
    }
}

function openDriverReportModal() {
    const road = window.prompt("Driver Safety Incident: Please enter location/corridor needing attention:", "NH-6 near Sonapur Tunnel");
    if (road) {
        showToast(`Hazard alert logged for ${road}. BRO and disaster inspection team notified.`);
    }
}

function closeModals() {
    document.querySelectorAll(".modal-backdrop").forEach((m) => {
        m.classList.remove("active");
    });
}

function executeModalRoute() {
    const origin = document.getElementById("modal-origin").value;
    const dest = document.getElementById("modal-dest").value;
    closeModals();

    const originSelect = document.getElementById("route-origin");
    const destSelect = document.getElementById("route-destination");
    if (originSelect) originSelect.value = origin;
    if (destSelect) destSelect.value = dest;

    switchTab("Smart Route");
    calculateSmartRoute();
}

function lookupShipment() {
    const id = document.getElementById("track-shipment-id").value.trim().toUpperCase();
    const truck = FLEET_DATA.find((t) => t.id === id) || FLEET_DATA[0];

    document.getElementById("track-res-id").textContent = truck.id;
    document.getElementById("track-res-status").textContent = truck.status;
    document.getElementById("track-res-status").className = `status-badge ${truck.statusClass}`;
    document.getElementById("track-res-route").innerHTML = `<strong>Route:</strong> ${truck.route}`;
    document.getElementById("track-res-cargo").innerHTML = `<strong>Cargo:</strong> ${truck.cargo} (${truck.weight})`;
    document.getElementById("track-res-driver").innerHTML = `<strong>Assigned Unit:</strong> ${truck.driver} (${truck.phone}) • Speed: ${truck.speed}`;

    showToast(`Found telemetry for consignment ${truck.id}`);
}

function locateShipmentOnMap() {
    const id = document.getElementById("track-res-id").textContent;
    closeModals();
    locateTruck(id);
}

// Global Search
function handleGlobalSearch(e) {
    if (e.key === "Enter") {
        const query = e.target.value.trim().toUpperCase();
        if (!query) return;

        // Check if matching state
        const stateKey = Object.keys(NE_STATES).find((k) => k.includes(query) || NE_STATES[k].name.toUpperCase().includes(query));
        if (stateKey) {
            focusState(stateKey);
            return;
        }

        // Check if matching fleet
        const truck = FLEET_DATA.find((t) => t.id.includes(query) || t.driver.toUpperCase().includes(query));
        if (truck) {
            locateTruck(truck.id);
            return;
        }

        // Check if matching tab
        const tabs = ["Dashboard", "Smart Route", "Risk Intelligence", "Accessibility", "Field Reports", "Analytics", "Settings", "Logistics"];
        const matchTab = tabs.find((t) => t.toUpperCase().includes(query));
        if (matchTab) {
            switchTab(matchTab);
            return;
        }

        showToast(`Search for "${query}" completed across 8 states.`);
    }
}

// ==========================================================================
// SIMULATED LIVE TELEMETRY & CLOCK
// ==========================================================================
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

function startSimulatedTelemetry() {
    // Subtle GPS position shifting every 10 seconds to show live movement
    liveFleetInterval = setInterval(() => {
        FLEET_DATA.forEach((truck, index) => {
            if (truck.status !== "STOPPED" && truck.status !== "DELAYED") {
                truck.coords[0] += (Math.random() - 0.5) * 0.006;
                truck.coords[1] += (Math.random() - 0.5) * 0.006;
                if (truckMarkers[index]) {
                    truckMarkers[index].setLatLng(truck.coords);
                }
            }
        });
        const updateLabel = document.getElementById("gps-last-update");
        if (updateLabel) updateLabel.textContent = "Updated just now";
    }, 10000);
}

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
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
    }, 3200);
}

// ==========================================================================
// RESPONSIVE RESIZE & ORIENTATION CHANGE LISTENER FOR LEAFLET MAP
// ==========================================================================
let mapResizeDebounceTimer;
window.addEventListener("resize", () => {
    clearTimeout(mapResizeDebounceTimer);
    mapResizeDebounceTimer = setTimeout(() => {
        if (map && typeof map.invalidateSize === "function") {
            map.invalidateSize();
        }
    }, 200);
});

window.addEventListener("orientationchange", () => {
    setTimeout(() => {
        if (map && typeof map.invalidateSize === "function") {
            map.invalidateSize();
        }
    }, 300);
});