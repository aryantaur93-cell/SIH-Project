/**
 * NEXTRA - Demo User Credentials & Registered User Store
 * SIH Prototype — VoidX Team
 *
 * This file contains:
 *   1. NEXTRA_DEMO_USERS  — preloaded demo accounts for demonstration
 *   2. Helper functions   — get/save registered users in localStorage
 *
 * NOTE: This is a FRONTEND PROTOTYPE. Passwords are stored in plain text
 * intentionally for demo purposes. In production, replace with:
 *   Frontend → FastAPI backend → Database (with bcrypt hashing + JWT)
 */

// ============================================================
// DEMO ACCOUNTS (used for SIH demonstration)
// ============================================================
const NEXTRA_DEMO_USERS = [
    {
        user_id: "DEMO-001",
        name: "NEXTRA Administrator",
        email: "admin@nextra.demo",
        password: "Admin@123",
        role: "admin",
        assigned_area: "ALL",
        area_name: "Entire Northeast Region",
        phone: "+91 9800000001",
        initials: "ADM",
        status: "ACTIVE",
        created_at: "2026-01-01T00:00:00Z",
        is_demo: true
    },
    {
        user_id: "DEMO-002",
        name: "Arjun Mehta",
        email: "officer@nextra.demo",
        password: "Officer@123",
        role: "field_officer",
        assigned_area: "ASSAM",
        area_name: "Assam Sector",
        phone: "+91 9800000002",
        initials: "AM",
        officer_id: "FO-ASSAM-001",
        assigned_region: "Assam",
        status: "ACTIVE",
        created_at: "2026-01-01T00:00:00Z",
        is_demo: true
    },
    {
        user_id: "DEMO-003",
        name: "Rahul Verma",
        email: "logistics@nextra.demo",
        password: "Logistics@123",
        role: "logistics",
        assigned_area: "ALL",
        area_name: "Assam & Meghalaya",
        phone: "+91 9800000003",
        initials: "RV",
        company_name: "NE FreightCo Pvt Ltd",
        operating_region: "Assam & Meghalaya",
        status: "ACTIVE",
        created_at: "2026-01-01T00:00:00Z",
        is_demo: true
    },
    {
        user_id: "DEMO-004",
        name: "Aman Kumar",
        email: "driver@nextra.demo",
        password: "Driver@123",
        role: "driver",
        assigned_area: "ASSAM",
        area_name: "Assam",
        phone: "+91 9800000004",
        initials: "AK",
        driver_id: "DRV-ASSAM-001",
        license_number: "AS01-2024-0012345",
        assigned_truck: "NEXTRA-TRUCK-01",
        status: "ACTIVE",
        created_at: "2026-01-01T00:00:00Z",
        is_demo: true
    }
];

// ============================================================
// LEGACY DEMO ACCOUNTS (backward compatibility with existing
// role-switcher inside the dashboard — do not remove)
// ============================================================
const NEXTRA_LEGACY_USERS = [
    {
        user_id: "USR-001",
        name: "Vikram Sengupta",
        email: "admin@ner.gov.in",
        password: "admin",
        role: "admin",
        assigned_area: "ALL",
        area_name: "Entire North East Region (All 8 States)",
        initials: "ADM",
        status: "ACTIVE",
        is_demo: true
    },
    {
        user_id: "USR-002",
        name: "Arjun Sharma",
        email: "field@ner.gov.in",
        password: "field",
        role: "field_officer",
        assigned_area: "MEGHALAYA",
        area_name: "Meghalaya Sector (NH-6 Hill Corridor)",
        initials: "FO",
        status: "ACTIVE",
        is_demo: true
    },
    {
        user_id: "USR-003",
        name: "Meera Hazarika",
        email: "logistics@ner.gov.in",
        password: "logistics",
        role: "logistics",
        assigned_area: "ALL",
        area_name: "Regional Freight Grid (Multi-State Corridors)",
        initials: "LOG",
        status: "ACTIVE",
        is_demo: true
    },
    {
        user_id: "USR-004",
        name: "Rahul Borah",
        email: "driver@ner.gov.in",
        password: "driver",
        role: "driver",
        assigned_area: "MEGHALAYA",
        area_name: "NH-6 Guwahati → Shillong Transit Corridor",
        initials: "DRV",
        assigned_truck: "VX-104",
        status: "ACTIVE",
        is_demo: true
    }
];

// ============================================================
// REGISTERED USERS (stored in localStorage from sign-up)
// ============================================================

const REGISTERED_USERS_KEY = "nextra_registered_users";

/**
 * Get all users registered via the sign-up page.
 * @returns {Array}
 */
function getRegisteredUsers() {
    try {
        const stored = localStorage.getItem(REGISTERED_USERS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("[NEXTRA] Failed to read registered users:", e);
        return [];
    }
}

/**
 * Save a newly registered user to localStorage.
 * @param {Object} user
 */
function saveRegisteredUser(user) {
    const users = getRegisteredUsers();
    users.push(user);
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
}

/**
 * Update an existing user's password (for the demo reset flow).
 * @param {string} email
 * @param {string} newPassword
 * @returns {boolean}
 */
function updateUserPassword(email, newPassword) {
    // Check registered users
    const registered = getRegisteredUsers();
    const idx = registered.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (idx !== -1) {
        registered[idx].password = newPassword;
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registered));
        return true;
    }
    // Demo users: passwords are hardcoded, but for prototype we can store overrides
    const overrides = getDemoPasswordOverrides();
    overrides[email.toLowerCase()] = newPassword;
    localStorage.setItem("nextra_demo_pw_overrides", JSON.stringify(overrides));
    return true;
}

function getDemoPasswordOverrides() {
    try {
        const stored = localStorage.getItem("nextra_demo_pw_overrides");
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        return {};
    }
}

/**
 * Find a user by email across all user sources.
 * Returns the user object or null.
 * @param {string} email
 * @returns {Object|null}
 */
function findUserByEmail(email) {
    const normalised = email.toLowerCase().trim();

    // 1. Check registered users
    const registered = getRegisteredUsers();
    const regUser = registered.find(u => u.email.toLowerCase() === normalised);
    if (regUser) return regUser;

    // 2. Check new demo users
    const demoUser = NEXTRA_DEMO_USERS.find(u => u.email.toLowerCase() === normalised);
    if (demoUser) return demoUser;

    // 3. Check legacy demo users
    const legacyUser = NEXTRA_LEGACY_USERS.find(u => u.email.toLowerCase() === normalised);
    if (legacyUser) return legacyUser;

    return null;
}

/**
 * Validate credentials: email + password.
 * Returns {success: boolean, user: Object|null, error: string}
 */
function validateCredentials(email, password) {
    const user = findUserByEmail(email);

    if (!user) {
        return { success: false, user: null, error: "Invalid email or password." };
    }

    // Check demo password overrides first
    const overrides = getDemoPasswordOverrides();
    const effectivePassword = overrides[email.toLowerCase()] || user.password;

    if (effectivePassword !== password) {
        return { success: false, user: null, error: "Invalid email or password." };
    }

    if (user.status && user.status !== "ACTIVE") {
        return { success: false, user: null, error: "This account is currently inactive. Please contact admin." };
    }

    return { success: true, user, error: "" };
}
