/**
 * NEXTRA - Role-Based Access Control & Centralized Permission System
 * Defines operational permissions for Admin, Field Officer, Logistics, and Driver.
 */

// Role definitions and operational designations
const ROLE_PROFILES = {
    admin: {
        key: "admin",
        label: "Central Command Administrator",
        title: "Regional Multi-Modal Command Console",
        initials: "ADM",
        email: "admin@ner.gov.in",
        password: "admin",
        assignedArea: "ALL",
        areaName: "Entire North East Region (All 8 States)",
        badgeClass: "badge-admin",
        description: "Full administrative oversight across all 8 North Eastern states, user management, global verification, and multi-modal corridors."
    },
    field_officer: {
        key: "field_officer",
        label: "Field Officer",
        title: "Ground Truth & Infrastructure Clearance Desk",
        initials: "FO",
        email: "field@ner.gov.in",
        password: "field",
        assignedArea: "MEGHALAYA",
        areaName: "Meghalaya Sector (NH-6 Hill Corridor)",
        badgeClass: "badge-field",
        description: "Operational field oversight for Meghalaya corridor, BRO taskforce coordination, road blockages, and ground truth photo verification."
    },
    logistics: {
        key: "logistics",
        label: "Freight Operations Coordinator",
        title: "Freight Dispatch & Mountain Fleet Logistics",
        initials: "LOG",
        email: "logistics@ner.gov.in",
        password: "logistics",
        assignedArea: "ALL",
        areaName: "Regional Freight Grid (Multi-State Corridors)",
        badgeClass: "badge-logistics",
        description: "Transportation dispatch, truck/driver matching, freight request fulfillment, consignment tracking, and route tradeoff comparisons."
    },
    driver: {
        key: "driver",
        label: "Commercial Fleet Operator",
        title: "In-Cab Vehicle Telemetry & Highway Cockpit",
        initials: "DRV",
        email: "driver@ner.gov.in",
        password: "driver",
        assignedArea: "MEGHALAYA",
        areaName: "NH-6 Guwahati → Shillong Transit Corridor",
        assignedTruck: "VX-104",
        badgeClass: "badge-driver",
        description: "Live cockpit navigation for commercial hill routes, weather alerts, nearby driver communication, and incident reporting with photo evidence."
    }
};

// Centralized Permissions Matrix
const PERMISSIONS = {
    admin: [
        'view_global_dashboard',
        'view_live_map',
        'view_smart_route',
        'view_risk_intelligence',
        'view_accessibility',
        'view_logistics',
        'manage_shipments',
        'manage_drivers',
        'manage_trucks',
        'view_field_officers',
        'view_reports',
        'verify_all_images',
        'manage_users',
        'view_audit_logs',
        'manage_settings'
    ],
    field_officer: [
        'view_area_dashboard',
        'view_live_map',
        'view_smart_route',
        'view_risk_intelligence',
        'view_accessibility',
        'view_logistics',
        'view_drivers',
        'view_trucks',
        'create_field_reports',
        'verify_area_images',
        'view_area_intelligence'
    ],
    logistics: [
        'view_logistics_dashboard',
        'view_live_map',
        'view_smart_route',
        'view_risk_intelligence',
        'view_accessibility',
        'manage_shipments',
        'view_drivers',
        'view_trucks',
        'create_transport_requests',
        'plan_routes',
        'view_my_requests'
    ],
    driver: [
        'view_driver_dashboard',
        'view_road_map',
        'view_my_route',
        'view_road_alerts',
        'view_weather',
        'view_risk_intelligence',
        'view_transport_requests',
        'view_my_truck',
        'view_nearby_drivers',
        'contact_field_officer',
        'report_road_issue'
    ]
};

// Permission checking helper functions
function hasPermission(roleKey, permission) {
    if (!roleKey || !PERMISSIONS[roleKey]) return false;
    return PERMISSIONS[roleKey].includes(permission);
}

function checkCurrentPermission(permission) {
    const user = getActiveUser();
    if (!user) return false;
    return hasPermission(user.role, permission);
}

function guardPermission(permission, actionName = "perform this action") {
    const user = getActiveUser();
    if (!user || !hasPermission(user.role, permission)) {
        const roleLabel = user ? (ROLE_PROFILES[user.role]?.label || user.role) : "Unauthenticated";
        console.warn(`[SECURITY 403] Role '${roleLabel}' attempted unauthorized action: ${permission}`);
        if (typeof showToast === 'function') {
            showToast(`Access Denied: ${roleLabel} lacks permission to ${actionName}`);
        }
        return false;
    }
    return true;
}
