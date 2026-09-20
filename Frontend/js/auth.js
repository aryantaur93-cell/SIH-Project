/**
 * NEXTRA - Authentication & Session Management
 * Role-based authentication, credentials validation, and operational profile chrome.
 */

// Active User session storage
let currentUser = null;

function getActiveUser() {
    if (currentUser) return currentUser;
    try {
        const stored = localStorage.getItem("nextra_active_user");
        if (stored) {
            currentUser = JSON.parse(stored);
            return currentUser;
        }
    } catch (e) {
        console.error("Error reading session", e);
    }
    return null;
}

function setActiveUser(user) {
    currentUser = user;
    if (user) {
        localStorage.setItem("nextra_active_user", JSON.stringify(user));
        localStorage.setItem("nextraRole", user.role);
    } else {
        localStorage.removeItem("nextra_active_user");
        localStorage.removeItem("nextraRole");
    }
}

// Credentials Validation & Login Workflow
function handleLogin(event) {
    if (event && event.preventDefault) {
        event.preventDefault();
    }

    const roleSelect = document.getElementById("login-role");
    const roleKey = roleSelect ? roleSelect.value : "admin";
    const profile = ROLE_PROFILES[roleKey] || ROLE_PROFILES.admin;
    const email = document.getElementById("login-email")?.value.trim().toLowerCase();
    const password = document.getElementById("login-password")?.value;
    const errorEl = document.getElementById("login-error");

    // Match credentials against role profiles or user directory
    const users = NextraApi._get(NextraApi.KEYS.USERS);
    const matchedUser = users.find(u => u.email.toLowerCase() === email && u.role === roleKey);

    const isDirectMatch = (email === profile.email.toLowerCase() && password === profile.password);
    const isUserMatch = (matchedUser && password === "demo" || password === profile.password);

    if (!isDirectMatch && !isUserMatch) {
        if (errorEl) {
            errorEl.textContent = `Invalid credentials for ${profile.label}. Try email: "${profile.email}" and password: "${profile.password}" (or use "Fill login details").`;
        }
        return;
    }

    // Build user session object
    const sessionUser = {
        user_id: matchedUser ? matchedUser.user_id : (profile.key === 'admin' ? 'USR-001' : 'USR-002'),
        name: matchedUser ? matchedUser.name : profile.label,
        email: profile.email,
        role: profile.key,
        assigned_area: matchedUser ? matchedUser.assigned_area : profile.assignedArea,
        area_name: profile.areaName,
        initials: profile.initials,
        status: "ACTIVE"
    };

    setActiveUser(sessionUser);

    // Hide login modal
    const loginScreen = document.getElementById("login-screen");
    if (loginScreen) {
        loginScreen.classList.add("hidden");
    }

    // Update UI Chrome & Permissions
    updateUserChrome(sessionUser);
    renderRoleSidebar(sessionUser.role);
    renderRoleDashboard(sessionUser.role);
    switchTab("Dashboard");

    NextraApi.logAudit("USER_LOGIN", `${sessionUser.name} signed in`, "OFFLINE", "ACTIVE_SESSION");

    if (typeof showToast === 'function') {
        showToast(`Authenticated: ${profile.label} (${profile.areaName})`);
    }

    // Invalidate map size so it renders accurately
    setTimeout(() => {
        if (typeof map !== 'undefined' && map && typeof map.invalidateSize === 'function') {
            map.invalidateSize();
        }
    }, 200);
}

// Pre-fill login details for prototype demo convenience
function fillLoginDetails() {
    const roleSelect = document.getElementById("login-role");
    const roleKey = roleSelect ? roleSelect.value : "admin";
    const profile = ROLE_PROFILES[roleKey] || ROLE_PROFILES.admin;
    const emailInput = document.getElementById("login-email");
    const passInput = document.getElementById("login-password");
    const errorEl = document.getElementById("login-error");

    if (emailInput) emailInput.value = profile.email;
    if (passInput) passInput.value = profile.password;
    if (errorEl) errorEl.textContent = "";

    if (typeof showToast === 'function') {
        showToast(`Filled ${profile.label} credentials: ${profile.email}`);
    }
}

// Session Restoration on Page Reload
function restoreSavedSession() {
    const user = getActiveUser();
    const loginScreen = document.getElementById("login-screen");

    if (!user) {
        if (loginScreen) loginScreen.classList.remove("hidden");
        return;
    }

    if (loginScreen) loginScreen.classList.add("hidden");
    updateUserChrome(user);
    renderRoleSidebar(user.role);
    renderRoleDashboard(user.role);
}

// Update Topbar and User Badge
function updateUserChrome(user) {
    const profile = ROLE_PROFILES[user.role] || ROLE_PROFILES.admin;
    const userName = document.getElementById("user-name");
    const userRole = document.getElementById("user-role-label");
    const userAvatar = document.getElementById("user-avatar");
    const greeting = document.getElementById("workspace-greeting");
    const greetingSubtext = document.getElementById("workspace-subtext");
    const topbarSelect = document.getElementById("role-select");

    if (userName) userName.textContent = user.name;
    if (userRole) userRole.textContent = `${profile.label} · ${profile.assignedArea}`;
    if (userAvatar) userAvatar.textContent = profile.initials;
    if (greeting) greeting.textContent = `${profile.title} 👋`;
    if (greetingSubtext) greetingSubtext.textContent = `Active Operational Sector: ${profile.areaName}`;
    if (topbarSelect) topbarSelect.value = user.role;

    // Render Role Console banner
    renderRoleConsole(user);
}

// Dynamic Role Switcher (for SIH Evaluators & Demonstration)
function switchRole(roleKey) {
    const profile = ROLE_PROFILES[roleKey] || ROLE_PROFILES.admin;
    const users = NextraApi._get(NextraApi.KEYS.USERS);
    const matchedUser = users.find(u => u.role === roleKey) || {
        user_id: `USR-${roleKey.toUpperCase()}`,
        name: profile.label,
        assigned_area: profile.assignedArea
    };

    const sessionUser = {
        user_id: matchedUser.user_id,
        name: matchedUser.name,
        email: profile.email,
        role: profile.key,
        assigned_area: matchedUser.assigned_area || profile.assignedArea,
        area_name: profile.areaName,
        initials: profile.initials,
        status: "ACTIVE"
    };

    setActiveUser(sessionUser);
    updateUserChrome(sessionUser);
    renderRoleSidebar(sessionUser.role);
    renderRoleDashboard(sessionUser.role);

    // Switch to Dashboard
    switchTab("Dashboard");

    NextraApi.logAudit("ROLE_SWITCHED", `Switched to perspective: ${profile.label}`, "PREVIOUS_ROLE", profile.label);

    if (typeof showToast === 'function') {
        showToast(`Workspace Switched to: ${profile.label}`);
    }

    setTimeout(() => {
        if (typeof map !== 'undefined' && map && typeof map.invalidateSize === 'function') {
            map.invalidateSize();
        }
    }, 200);
}

// Role Console Banner
function renderRoleConsole(user) {
    const profile = ROLE_PROFILES[user.role] || ROLE_PROFILES.admin;
    const consoleEl = document.getElementById("role-console");
    if (!consoleEl) return;

    let quickPills = '';
    if (user.role === 'admin') {
        quickPills = `
            <button type="button" class="role-action" onclick="switchTab('User-Management')">👥 User Directory</button>
            <button type="button" class="role-action" onclick="switchTab('Verification-Center')">🔍 Verification Queue</button>
            <button type="button" class="role-action" onclick="switchTab('Audit-Logs')">📜 Audit Trail</button>
        `;
    } else if (user.role === 'field_officer') {
        quickPills = `
            <button type="button" class="role-action" onclick="switchTab('Verification-Center')">🔍 Verify Area Evidence</button>
            <button type="button" class="role-action" onclick="switchTab('Field-Reports')">📋 Create Ground Report</button>
            <button type="button" class="role-action" onclick="focusState('MEGHALAYA')">🗺️ Focus Meghalaya Sector</button>
        `;
    } else if (user.role === 'logistics') {
        quickPills = `
            <button type="button" class="role-action" onclick="switchTab('Transport-Requests')">📦 Create Transport Request</button>
            <button type="button" class="role-action" onclick="switchTab('Shipments')">🚚 Track Shipments</button>
            <button type="button" class="role-action" onclick="switchTab('Smart-Route')">🗺️ Route Planner</button>
        `;
    } else if (user.role === 'driver') {
        quickPills = `
            <button type="button" class="role-action" onclick="switchTab('Report-Issue')">⚠️ Report Road Hazard</button>
            <button type="button" class="role-action" onclick="switchTab('Nearby-Drivers')">📡 Nearby Drivers</button>
            <button type="button" class="role-action" onclick="switchTab('My-Route')">🧭 Turn-by-Turn Route</button>
        `;
    }

    consoleEl.innerHTML = `
        <div class="role-console-copy">
            <span class="eyebrow">${profile.label} Workspace · ${profile.areaName}</span>
            <h3>${profile.title}</h3>
            <p>${profile.description}</p>
        </div>
        <div class="role-console-actions">
            ${quickPills}
        </div>
    `;
}

// Sign Out Handler
function logout() {
    const user = getActiveUser();
    if (user) {
        NextraApi.logAudit("USER_LOGOUT", `${user.name} logged out`, "ACTIVE_SESSION", "SIGNED_OUT");
    }
    setActiveUser(null);
    const loginScreen = document.getElementById("login-screen");
    if (loginScreen) {
        loginScreen.classList.remove("hidden");
    }
    const passInput = document.getElementById("login-password");
    if (passInput) passInput.value = "";
    const errText = document.getElementById("login-error");
    if (errText) errText.textContent = "";

    if (typeof showToast === 'function') {
        showToast("Signed out. Returned to NEXTRA security gateway.");
    }
}
