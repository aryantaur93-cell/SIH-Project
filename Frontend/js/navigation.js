/**
 * NEXTRA - Role-Based Navigation & Dynamic Sidebar Engine
 * Generates role-specific sidebars and enforces client-side tab navigation authorization.
 */

// Sidebars Configuration explicitly matching user requirements
const ROLE_SIDEBAR_MENUS = {
    admin: [
        { id: "Dashboard", label: "Dashboard", icon: "🏠", badge: "Live", perm: "view_global_dashboard" },
        { id: "Live-Map", label: "Live Map", icon: "🗺️", badge: "GIS", perm: "view_live_map" },
        { id: "Smart-Route", label: "Smart Route", icon: "⚡", badge: "AI", perm: "view_smart_route" },
        { id: "Risk-Intelligence", label: "Risk Intelligence", icon: "⚠️", badge: "3 High", badgeClass: "badge-danger", perm: "view_risk_intelligence" },
        { id: "Accessibility", label: "Accessibility", icon: "♿", badge: "Index", perm: "view_accessibility" },
        { id: "Logistics", label: "Logistics", icon: "📦", badge: "124", perm: "view_logistics" },
        { id: "Shipments", label: "Shipments", icon: "🚚", badge: "24", perm: "manage_shipments" },
        { id: "Drivers", label: "Drivers", icon: "👤", badge: "18", perm: "manage_drivers" },
        { id: "Trucks", label: "Trucks", icon: "🚛", badge: "32", perm: "manage_trucks" },
        { id: "Field-Officers", label: "Field Officers", icon: "🔍", badge: "8", perm: "view_field_officers" },
        { id: "Field-Reports", label: "Reports", icon: "📋", badge: "Live", perm: "view_reports" },
        { id: "Verification-Center", label: "Verification Center", icon: "🛡️", badge: "Pending", badgeClass: "badge-amber", perm: "verify_all_images" },
        { id: "User-Management", label: "User Management", icon: "👥", badge: "Admin", badgeClass: "badge-admin", perm: "manage_users" },
        { id: "Audit-Logs", label: "Audit Logs", icon: "📜", badge: "Sec", perm: "view_audit_logs" },
        { id: "Settings", label: "Settings", icon: "⚙️", badge: "", perm: "manage_settings" }
    ],

    field_officer: [
        { id: "Dashboard", label: "Dashboard", icon: "🏠", badge: "Sector", perm: "view_area_dashboard" },
        { id: "Live-Map", label: "Live Map", icon: "🗺️", badge: "GIS", perm: "view_live_map" },
        { id: "Smart-Route", label: "Smart Route", icon: "⚡", badge: "AI", perm: "view_smart_route" },
        { id: "Risk-Intelligence", label: "Risk Intelligence", icon: "⚠️", badge: "Local", badgeClass: "badge-danger", perm: "view_risk_intelligence" },
        { id: "Accessibility", label: "Accessibility", icon: "♿", badge: "Index", perm: "view_accessibility" },
        { id: "Logistics", label: "Logistics", icon: "📦", badge: "Area", perm: "view_logistics" },
        { id: "Drivers", label: "Drivers", icon: "👤", badge: "Nearby", perm: "view_drivers" },
        { id: "Trucks", label: "Trucks", icon: "🚛", badge: "Sector", perm: "view_trucks" },
        { id: "Field-Reports", label: "Field Reports", icon: "📋", badge: "Submit", perm: "create_field_reports" },
        { id: "Verification-Center", label: "Verification Center", icon: "🛡️", badge: "Area Review", badgeClass: "badge-amber", perm: "verify_area_images" },
        { id: "Area-Intelligence", label: "Area Intelligence", icon: "📍", badge: "Meghalaya", perm: "view_area_intelligence" }
    ],

    logistics: [
        { id: "Dashboard", label: "Dashboard", icon: "🏠", badge: "Freight", perm: "view_logistics_dashboard" },
        { id: "Live-Map", label: "Live Map", icon: "🗺️", badge: "GIS", perm: "view_live_map" },
        { id: "Smart-Route", label: "Smart Route", icon: "⚡", badge: "AI", perm: "view_smart_route" },
        { id: "Risk-Intelligence", label: "Risk Intelligence", icon: "⚠️", badge: "Routes", perm: "view_risk_intelligence" },
        { id: "Accessibility", label: "Accessibility", icon: "♿", badge: "Index", perm: "view_accessibility" },
        { id: "Shipments", label: "Shipments", icon: "🚚", badge: "Track", perm: "manage_shipments" },
        { id: "Drivers", label: "Drivers", icon: "👤", badge: "Available", perm: "view_drivers" },
        { id: "Trucks", label: "Trucks", icon: "🚛", badge: "Fleet", perm: "view_trucks" },
        { id: "Transport-Requests", label: "Transportation Requests", icon: "📦", badge: "New", badgeClass: "badge-green", perm: "create_transport_requests" },
        { id: "Route-Planning", label: "Route Planning", icon: "🗺️", badge: "Compare", perm: "plan_routes" },
        { id: "My-Requests", label: "My Requests", icon: "📑", badge: "3 Active", perm: "view_my_requests" }
    ],

    driver: [
        { id: "Dashboard", label: "Dashboard", icon: "🏠", badge: "Cockpit", perm: "view_driver_dashboard" },
        { id: "Road-Map", label: "Road Map", icon: "🗺️", badge: "NE GIS", perm: "view_road_map" },
        { id: "My-Route", label: "My Route", icon: "🧭", badge: "NH-6", badgeClass: "badge-green", perm: "view_my_route" },
        { id: "Road-Alerts", label: "Road Alerts", icon: "🚨", badge: "Urgent", badgeClass: "badge-danger", perm: "view_road_alerts" },
        { id: "Weather", label: "Weather", icon: "🌧️", badge: "Rain", perm: "view_weather" },
        { id: "Risk-Intelligence", label: "Risk Intelligence", icon: "⚠️", badge: "Hill Pass", perm: "view_risk_intelligence" },
        { id: "Transport-Requests", label: "Transport Requests", icon: "📦", badge: "Assign", perm: "view_transport_requests" },
        { id: "My-Truck", label: "My Truck", icon: "🚛", badge: "VX-104", perm: "view_my_truck" },
        { id: "Nearby-Drivers", label: "Nearby Drivers", icon: "📡", badge: "Radar", perm: "view_nearby_drivers" },
        { id: "Area-Field-Officer", label: "Area Field Officer", icon: "👮", badge: "Contact", perm: "contact_field_officer" },
        { id: "Report-Issue", label: "Report Issue", icon: "⚠️", badge: "+ Photo", badgeClass: "badge-amber", perm: "report_road_issue" }
    ]
};

// Dynamically Render the Role-Specific Sidebar Navigation
function renderRoleSidebar(roleKey) {
    const navMenu = document.querySelector(".nav-menu");
    if (!navMenu) return;

    const items = ROLE_SIDEBAR_MENUS[roleKey] || ROLE_SIDEBAR_MENUS.admin;

    navMenu.innerHTML = items.map((item, idx) => `
        <button type="button" class="menu-item ${idx === 0 ? 'active' : ''}" onclick="switchTab('${item.id}')" id="nav-${item.id}">
            <div class="menu-item-left">
                <span class="menu-icon">${item.icon}</span>
                <span>${item.label}</span>
            </div>
            ${item.badge ? `<span class="menu-badge ${item.badgeClass || ''}">${item.badge}</span>` : ''}
        </button>
    `).join("");
}

// Seamless In-Page Navigation with Role Authorization Guard
function switchTab(sectionId, event) {
    if (event && event.preventDefault) {
        event.preventDefault();
    }

    closeSidebar();

    const user = getActiveUser();
    const roleKey = user ? user.role : "admin";
    const allowedItems = ROLE_SIDEBAR_MENUS[roleKey] || ROLE_SIDEBAR_MENUS.admin;

    // Security check: ensure target tab is permitted for the current role
    const isAllowed = allowedItems.some(item => item.id.toLowerCase() === sectionId.toLowerCase());
    if (!isAllowed && sectionId !== "Dashboard") {
        console.warn(`[SECURITY 403] Role '${roleKey}' attempted unauthorized tab access: ${sectionId}`);
        if (typeof showToast === 'function') {
            showToast(`Access Denied: Section '${sectionId}' is not accessible for ${ROLE_PROFILES[roleKey]?.label || roleKey}.`);
        }
        sectionId = "Dashboard";
    }

    // Hide all section panels
    document.querySelectorAll(".section-panel").forEach(sec => sec.classList.remove("active"));
    document.querySelectorAll(".menu-item").forEach(item => item.classList.remove("active"));

    // If Live-Map or Road-Map is clicked, show Dashboard where the interactive Leaflet map lives
    const isMapTab = (sectionId === "Live-Map" || sectionId === "Road-Map");
    const activeSectionId = isMapTab ? "Dashboard" : sectionId;

    // Activate target section (supports both 'Smart-Route' and 'Smart Route')
    const targetSection = document.getElementById(`section-${activeSectionId}`)
        || document.getElementById(`section-${activeSectionId.replace(/-/g, " ")}`)
        || document.getElementById(`section-${activeSectionId.replace(/ /g, "-")}`)
        || document.getElementById("section-Dashboard");
    if (targetSection) {
        targetSection.classList.add("active");
    }

    // Highlight target nav item
    const targetNav = document.getElementById(`nav-${sectionId}`);
    if (targetNav) {
        targetNav.classList.add("active");
    }

    // Update Topbar Breadcrumbs
    const bcCurrent = document.getElementById("breadcrumb-current");
    if (bcCurrent) {
        bcCurrent.textContent = sectionId.replace(/-/g, " ");
    }

    // Update URL Hash
    const slug = sectionId.toLowerCase();
    try {
        history.replaceState(null, null, `#${slug}`);
    } catch (e) {
        window.location.hash = slug;
    }

    // Smooth scroll to top or scroll to map if map tab
    if (isMapTab) {
        setTimeout(() => {
            const mapBox = document.querySelector(".map-box");
            if (mapBox) {
                mapBox.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }, 100);
    } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Trigger role-specific tab refreshes
    handleTabSpecificActivation(sectionId);

    // Invalidate Leaflet Map Size if entering Map or Dashboard
    if (["Dashboard", "Live-Map", "Road-Map", "My-Route"].includes(sectionId)) {
        setTimeout(() => {
            if (typeof map !== 'undefined' && map && typeof map.invalidateSize === 'function') {
                map.invalidateSize();
            }
        }, 150);
    }
}

// Triggers module-specific rendering when tabs are opened
function handleTabSpecificActivation(tabId) {
    switch (tabId) {
        case "Verification-Center":
            if (typeof renderVerificationQueue === 'function') renderVerificationQueue();
            break;
        case "User-Management":
            if (typeof renderUserManagementTable === 'function') renderUserManagementTable();
            break;
        case "Audit-Logs":
            if (typeof renderAuditLogsTable === 'function') renderAuditLogsTable();
            break;
        case "Transport-Requests":
        case "My-Requests":
            if (typeof renderTransportRequestsList === 'function') renderTransportRequestsList();
            break;
        case "Shipments":
            if (typeof renderShipmentsTable === 'function') renderShipmentsTable();
            break;
        case "Drivers":
            if (typeof renderDriversRoster === 'function') renderDriversRoster();
            break;
        case "Trucks":
        case "My-Truck":
            if (typeof renderTrucksFleet === 'function') renderTrucksFleet();
            break;
        case "Route-Planning":
            if (typeof renderRoutePlanningTradeoffs === 'function') renderRoutePlanningTradeoffs();
            break;
        case "Field-Officers":
            if (typeof renderFieldOfficersRoster === 'function') renderFieldOfficersRoster();
            break;
        case "Nearby-Drivers":
            if (typeof renderNearbyDriversList === 'function') renderNearbyDriversList();
            break;
        case "Area-Field-Officer":
            if (typeof renderAreaFieldOfficerCard === 'function') renderAreaFieldOfficerCard();
            break;
        case "Report-Issue":
            if (typeof renderReportIssueForm === 'function') renderReportIssueForm();
            break;
        case "My-Route":
            if (typeof renderMyRouteView === 'function') renderMyRouteView();
            break;
        case "Area-Intelligence":
            if (typeof renderAreaIntelligenceView === 'function') renderAreaIntelligenceView();
            break;
    }
}

// Synchronize Tab from URL Hash on initial load / back button
function syncTabFromHash() {
    const hash = (window.location.hash || "").replace("#", "").toLowerCase();
    if (!hash) return;

    const user = getActiveUser();
    const roleKey = user ? user.role : "admin";
    const allowed = ROLE_SIDEBAR_MENUS[roleKey] || ROLE_SIDEBAR_MENUS.admin;

    const match = allowed.find(item => item.id.toLowerCase() === hash || item.id.toLowerCase().replace(/-/g, "") === hash.replace(/-/g, ""));
    if (match) {
        switchTab(match.id);
    } else {
        switchTab("Dashboard");
    }
}
