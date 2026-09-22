/**
 * NEXTRA - Simple Session Manager
 * SIH Prototype — VoidX Team
 *
 * Provides lightweight helpers used by:
 *   - login.html    : redirect away if already logged in
 *   - signup.html   : same
 *   - forgot-password.html : same
 *   - index.html    : redirect to login if no session found
 *
 * Session is stored in localStorage under key: nextra_session
 *
 * Structure → Later replace with real JWT from FastAPI backend.
 */

const SESSION_KEY = "nextra_session";

// ============================================================
// Core Session Helpers
// ============================================================

/**
 * Save a user object as the active session.
 * @param {Object} user
 */
function createSession(user) {
    try {
        const sessionData = {
            user_id:       user.user_id,
            name:          user.name,
            email:         user.email,
            role:          user.role,
            assigned_area: user.assigned_area || "ALL",
            area_name:     user.area_name || "",
            initials:      user.initials || getInitials(user.name),
            status:        user.status || "ACTIVE",
            logged_in_at:  new Date().toISOString()
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        // Also write legacy key so existing dashboard code continues to work
        localStorage.setItem("nextra_active_user", JSON.stringify(sessionData));
        localStorage.setItem("nextraRole", sessionData.role);
    } catch (e) {
        console.error("[NEXTRA Session] Failed to create session:", e);
    }
}

/**
 * Read the current session. Returns null if no session exists.
 * @returns {Object|null}
 */
function getSession() {
    try {
        const stored = localStorage.getItem(SESSION_KEY);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch (e) {
        console.error("[NEXTRA Session] Failed to read session:", e);
        return null;
    }
}

/**
 * Clear the session and all related keys.
 */
function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("nextra_active_user");
    localStorage.removeItem("nextraRole");
    localStorage.removeItem("nextra_jwt");
    localStorage.removeItem("nextra_user");
}

// ============================================================
// Navigation Guards
// ============================================================

/**
 * Call this on PROTECTED pages (e.g. index.html).
 * If no session exists, redirect to login.html.
 */
function requireLogin() {
    if (typeof NextraAuth !== "undefined" && typeof NextraAuth.isAuthenticated === "function") {
        if (!NextraAuth.isAuthenticated()) {
            window.location.href = "login.html";
            return false;
        }
        return true;
    }
    const token = localStorage.getItem("nextra_jwt");
    if (!token) {
        window.location.href = "login.html";
        return false;
    }
    return true;
}

/**
 * Call this on AUTH pages (login.html, signup.html, forgot-password.html).
 * If a verified session already exists, redirect to the dashboard.
 */
function redirectIfLoggedIn() {
    if (typeof NextraAuth !== "undefined" && typeof NextraAuth.isAuthenticated === "function") {
        if (NextraAuth.isAuthenticated()) {
            window.location.href = "index.html";
        }
        return;
    }
    const token = localStorage.getItem("nextra_jwt");
    if (token) {
        window.location.href = "index.html";
    }
}

// ============================================================
// Utility
// ============================================================

/**
 * Derive initials from a full name.
 * "Arjun Mehta" → "AM"
 */
function getInitials(name) {
    if (!name) return "?";
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 3);
}

/**
 * Format role for display.
 */
function formatRole(roleKey) {
    const labels = {
        admin:        "Admin",
        field_officer:"Field Officer",
        logistics:    "Logistics",
        driver:       "Driver"
    };
    return labels[roleKey] || roleKey;
}
