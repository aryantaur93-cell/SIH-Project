/**
 * NEXTRA - Authentication & Session Management (Dashboard)
 * Now uses JWT tokens via the FastAPI backend.
 *
 * Responsibilities:
 *   - Validate session on dashboard load → redirect to login.html if no JWT
 *   - Update the topbar user chip with logged-in user info
 *   - Handle logout → clear token → redirect to login.html
 *   - Handle the in-dashboard role switcher (SIH evaluator feature)
 *   - Restore saved session if the user refreshes the page
 */

// ── In-memory reference to the active user ─────────────────
let currentUser = null;

// ── Read the active user from stored JWT session ───────────
function getActiveUser() {
    if (currentUser) return currentUser;
    const stored = getStoredUser();
    if (stored) {
        currentUser = stored;
        return currentUser;
    }
    return null;
}

// ── Write / clear the active user ──────────────────────────
function setActiveUser(user) {
    currentUser = user;
    if (user) {
        setStoredUser(user);
    } else {
        clearToken();
    }
}

// ── Session guard — called on DOMContentLoaded in main.js ──
function requireDashboardSession() {
    if (!NextraAuth.isAuthenticated()) {
        window.location.href = "login.html";
        return false;
    }
    return true;
}

// ── Restore session after page refresh ─────────────────────
async function restoreSavedSession() {
    if (!NextraAuth.isAuthenticated()) {
        window.location.href = "login.html";
        return false;
    }

    // Verify token is still valid
    try {
        const user = await NextraAuth.getMe();
        currentUser = user;

        // Hide the old inline login overlay if it exists
        const loginScreen = document.getElementById("login-screen");
        if (loginScreen) loginScreen.classList.add("hidden");

        // Re-render dashboard for the stored role
        updateUserChrome(user);
        renderRoleSidebar(user.role);
        renderRoleDashboard(user.role);
        return true;
    } catch (err) {
        console.error("[NEXTRA Auth] Session validation failed:", err);
        clearToken();
        window.location.href = "login.html";
        return false;
    }
}

// ── Update Topbar / User Badge ──────────────────────────────
function updateUserChrome(user) {
    const profile = ROLE_PROFILES[user.role] || ROLE_PROFILES.admin;

    const userName    = document.getElementById("user-name");
    const userRole    = document.getElementById("user-role-label");
    const userAvatar  = document.getElementById("user-avatar");
    const greeting    = document.getElementById("workspace-greeting");
    const greetSub    = document.getElementById("workspace-subtext");

    if (userName)   userName.textContent   = user.name;
    if (userRole)   userRole.textContent   = formatRoleArea(user);
    if (userAvatar) userAvatar.textContent = getInitials(user.name);
    if (greeting)   greeting.textContent   = `Welcome, ${user.name} 👋`;
    if (greetSub)   greetSub.textContent   = `Active Sector: ${user.assigned_state || profile.areaName || 'All NE'}`;

    renderRoleConsole(user);

    // Load notification count
    loadNotificationCount();
}

function getInitials(name) {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name[0].toUpperCase();
}

function formatRoleArea(user) {
    const profile = ROLE_PROFILES[user.role];
    const roleLabel = profile ? profile.label : user.role;
    const area = user.assigned_state || "";
    return area && area !== "ALL" ? `${roleLabel} · ${area}` : roleLabel;
}

// ── Sign Out ────────────────────────────────────────────────
function logout() {
    setActiveUser(null);
    currentUser = null;
    NextraAuth.logout();
}

// ── In-Dashboard Role Switcher (SIH evaluator feature) ─────
// Logs in as a different demo user to show different perspectives.
async function switchRole(roleKey) {
    const demoAccounts = {
        admin: { email: "admin@nextra.demo", password: "Admin@123" },
        field_officer: { email: "officer@nextra.demo", password: "Officer@123" },
        logistics: { email: "logistics@nextra.demo", password: "Logistics@123" },
        driver: { email: "driver@nextra.demo", password: "Driver@123" },
    };

    const creds = demoAccounts[roleKey];
    if (!creds) return;

    try {
        const data = await NextraAuth.login(creds.email, creds.password);
        currentUser = data.user;

        updateUserChrome(data.user);
        renderRoleSidebar(data.user.role);
        renderRoleDashboard(data.user.role);
        switchTab("Dashboard");

        if (typeof showToast === "function") {
            showToast(`Switched to: ${ROLE_PROFILES[roleKey]?.label || roleKey}`);
        }

        setTimeout(() => {
            if (typeof map !== "undefined" && map && typeof map.invalidateSize === "function") {
                map.invalidateSize();
            }
        }, 200);
    } catch (err) {
        console.error("[NEXTRA] Role switch failed:", err);
        if (typeof showToast === "function") {
            showToast(`Role switch failed: ${err.message}`);
        }
    }
}

// ── Role Console Banner ─────────────────────────────────────
function renderRoleConsole(user) {
    const profile   = ROLE_PROFILES[user.role] || ROLE_PROFILES.admin;
    const consoleEl = document.getElementById("role-console");
    if (!consoleEl) return;

    let quickPills = "";
    if (user.role === "admin") {
        quickPills = `
            <button type="button" class="role-action" onclick="switchTab('User-Management')">👥 User Directory</button>
            <button type="button" class="role-action" onclick="switchTab('Verification-Center')">🔍 Verification Queue</button>
            <button type="button" class="role-action" onclick="switchTab('Audit-Logs')">📜 Audit Trail</button>
        `;
    } else if (user.role === "field_officer") {
        quickPills = `
            <button type="button" class="role-action" onclick="switchTab('Verification-Center')">🔍 Verify Area Evidence</button>
            <button type="button" class="role-action" onclick="switchTab('Field-Reports')">📋 Create Ground Report</button>
            <button type="button" class="role-action" onclick="switchTab('Area-Intelligence')">🗺️ Area Intelligence</button>
        `;
    } else if (user.role === "logistics") {
        quickPills = `
            <button type="button" class="role-action" onclick="switchTab('Transport-Requests')">📦 Create Transport Request</button>
            <button type="button" class="role-action" onclick="switchTab('Shipments')">🚚 Track Shipments</button>
            <button type="button" class="role-action" onclick="switchTab('Logistics')">🗺️ Fleet Overview</button>
        `;
    } else if (user.role === "driver") {
        quickPills = `
            <button type="button" class="role-action" onclick="switchTab('Report-Issue')">⚠️ Report Road Hazard</button>
            <button type="button" class="role-action" onclick="switchTab('Nearby-Drivers')">📡 Nearby Drivers</button>
            <button type="button" class="role-action" onclick="switchTab('My-Route')">🧭 Turn-by-Turn Route</button>
        `;
    }

    consoleEl.innerHTML = `
        <div class="role-console-copy">
            <span class="eyebrow">${profile.label} Workspace · ${user.assigned_state || profile.areaName || 'All NE'}</span>
            <h3>${profile.title || 'Welcome to NEXTRA'}</h3>
            <p>${profile.description || 'NE Region Intelligent Transport & Routing Assistant'}</p>
        </div>
        <div class="role-console-actions">
            ${quickPills}
        </div>
    `;
}

// ── Notification Count & Alerts Counters ────────────────────
async function loadNotificationCount() {
    try {
        if (typeof NextraNotifications !== "undefined" && typeof NextraNotifications.getUnreadCount === "function") {
            const data = await NextraNotifications.getUnreadCount();
            const count = data.unread_count || 0;
            const pill = document.getElementById("notification-unread-count");
            const headerUnread = document.getElementById("notif-header-unread");
            if (pill) {
                pill.textContent = count;
                if (count > 0) pill.classList.add("pulse");
                else pill.classList.remove("pulse");
            }
            if (headerUnread) headerUnread.textContent = `${count} unread`;
        }
        if (typeof loadActiveAlertsCount === "function") {
            loadActiveAlertsCount();
        }
    } catch (err) {
        console.warn("[NEXTRA] Could not load notifications:", err);
    }
}

// ── Legacy: handleLogin kept for inline form ────────────────
async function handleLogin(event) {
    if (event && event.preventDefault) event.preventDefault();

    const emailInput = document.getElementById("login-email");
    const passInput  = document.getElementById("login-password");
    const errorEl    = document.getElementById("login-error");
    const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
    const password = passInput ? passInput.value : "";

    try {
        const data = await NextraAuth.login(email, password);
        currentUser = data.user;

        const loginScreen = document.getElementById("login-screen");
        if (loginScreen) loginScreen.classList.add("hidden");

        updateUserChrome(data.user);
        renderRoleSidebar(data.user.role);
        renderRoleDashboard(data.user.role);
        switchTab("Dashboard");

        loadNotificationCount();
        if (typeof loadActiveAlertsCount === "function") {
            loadActiveAlertsCount();
        }

        if (typeof showToast === "function") {
            showToast(`Authenticated: ${data.user.name} (${data.user.role})`);
        }
    } catch (err) {
        if (errorEl) errorEl.textContent = err.message || "Login failed.";
    }
}
