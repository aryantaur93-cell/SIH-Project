/**
 * NEXTRA - Role-Based Access Control & Centralized Permission System
 * Defines operational permissions for Admin, Field Officer, Logistics, and Driver.
 *
 * ROLE_PROFILES contains two sets of demo credentials:
 *   Primary   — new demo accounts used by login.html (admin@nextra.demo etc.)
 *   Legacy    — old accounts for the in-dashboard role-switcher (admin@ner.gov.in etc.)
 */

// Role definitions and operational designations
const ROLE_PROFILES = {
    admin: {
        key: "admin",
        label: "Admin",
        title: "Regional Multi-Modal Command Console",
        initials: "ADM",
        // Primary demo email (used by login.html)
        email: "admin@nextra.demo",
        password: "Admin@123",
        // Legacy email kept for in-dashboard role-switcher
        legacyEmail: "admin@ner.gov.in",
        legacyPassword: "admin",
        assignedArea: "ALL",
        areaName: "Entire Northeast Region",
        badgeClass: "badge-admin",
        description: "Full administrative oversight across all 8 North Eastern states, user management, global verification, and multi-modal corridors."
    },
    field_officer: {
        key: "field_officer",
        label: "Field Officer",
        title: "Ground Truth & Infrastructure Clearance Desk",
        initials: "AM",
        // Primary demo email
        email: "officer@nextra.demo",
        password: "Officer@123",
        // Legacy
        legacyEmail: "field@ner.gov.in",
        legacyPassword: "field",
        assignedArea: "ASSAM",
        areaName: "Assam Sector",
        badgeClass: "badge-field",
        description: "Operational field oversight, BRO taskforce coordination, road blockages, and ground truth photo verification for the assigned sector."
    },
    logistics: {
        key: "logistics",
        label: "Logistics",
        title: "Freight Dispatch & Mountain Fleet Logistics",
        initials: "RV",
        // Primary demo email
        email: "logistics@nextra.demo",
        password: "Logistics@123",
        // Legacy
        legacyEmail: "logistics@ner.gov.in",
        legacyPassword: "logistics",
        assignedArea: "ALL",
        areaName: "Assam & Meghalaya",
        badgeClass: "badge-logistics",
        description: "Transportation dispatch, truck/driver matching, freight request fulfillment, consignment tracking, and route tradeoff comparisons."
    },
    driver: {
        key: "driver",
        label: "Driver",
        title: "In-Cab Vehicle Telemetry & Highway Cockpit",
        initials: "AK",
        // Primary demo email
        email: "driver@nextra.demo",
        password: "Driver@123",
        // Legacy
        legacyEmail: "driver@ner.gov.in",
        legacyPassword: "driver",
        assignedArea: "ASSAM",
        areaName: "Assam",
        assignedTruck: "NEXTRA-TRUCK-01",
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
        'view_weather',
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
        'view_weather',
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
        'view_weather',
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
