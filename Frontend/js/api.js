/**
 * NEXTRA - Backend API Client
 * All data flows through this module. No more localStorage.
 * Every call goes to the FastAPI backend at API_BASE.
 */

// Dynamic API Base: relative path if loaded from FastAPI port 8000, otherwise target port 8000 on current host
const API_BASE = (() => {
    if (typeof window === "undefined") return "http://127.0.0.1:8000";
    if (window.location.port === "8000") return "";
    const host = window.location.hostname || "127.0.0.1";
    return `http://${host}:8000`;
})();

// ── Token Management ──────────────────────────────────────
function getToken() {
    return localStorage.getItem("nextra_jwt");
}

function setToken(token) {
    localStorage.setItem("nextra_jwt", token);
}

function clearToken() {
    localStorage.removeItem("nextra_jwt");
    localStorage.removeItem("nextra_user");
    localStorage.removeItem("nextra_session");
    localStorage.removeItem("nextra_active_user");
    localStorage.removeItem("nextraRole");
}

function getStoredUser() {
    try {
        const s = localStorage.getItem("nextra_user");
        return s ? JSON.parse(s) : null;
    } catch { return null; }
}

function setStoredUser(user) {
    localStorage.setItem("nextra_user", JSON.stringify(user));
}

// ── HTTP Helpers ──────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = options.headers || {};
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    if (res.status === 401 && !endpoint.startsWith("/api/auth/")) {
        clearToken();
        if (typeof window !== "undefined" && !window.location.pathname.endsWith("login.html") && !window.location.pathname.endsWith("signup.html") && !window.location.pathname.endsWith("forgot-password.html")) {
            window.location.href = "login.html";
        }
        throw new Error("Session expired");
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `API Error ${res.status}`);
    }
    return res.json();
}

async function apiGet(endpoint) {
    return apiFetch(endpoint);
}

async function apiPost(endpoint, body) {
    return apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
    });
}

async function apiPatch(endpoint, body) {
    return apiFetch(endpoint, {
        method: "PATCH",
        body: JSON.stringify(body),
    });
}

async function apiPostForm(endpoint, formData) {
    const token = getToken();
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers,
        body: formData,
    });
    if (res.status === 401 && !endpoint.startsWith("/api/auth/")) {
        clearToken();
        if (typeof window !== "undefined" && !window.location.pathname.endsWith("login.html") && !window.location.pathname.endsWith("signup.html") && !window.location.pathname.endsWith("forgot-password.html")) {
            window.location.href = "login.html";
        }
        throw new Error("Session expired");
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `API Error ${res.status}`);
    }
    return res.json();
}

// ── Auth API ──────────────────────────────────────────────
const NextraAuth = {
    async login(email, password) {
        const data = await apiPost("/api/auth/login", { email, password });
        setToken(data.access_token);
        setStoredUser(data.user);
        return data;
    },

    async signup(nameOrPayload, email, password, role, extra = {}) {
        let payload = {};
        if (typeof nameOrPayload === "object" && nameOrPayload !== null) {
            payload = nameOrPayload;
        } else {
            payload = { name: nameOrPayload, email, password, role, ...extra };
        }
        const data = await apiPost("/api/auth/signup", payload);
        if (extra.autoLogin !== false && payload.autoLogin !== false) {
            setToken(data.access_token);
            setStoredUser(data.user);
        }
        return data;
    },

    async checkResetEmail(email) {
        return apiPost("/api/auth/forgot-password/verify", { email });
    },

    async resetPassword(email, new_password) {
        return apiPost("/api/auth/forgot-password/reset", { email, new_password });
    },

    async getMe() {
        const user = await apiGet("/api/auth/me");
        setStoredUser(user);
        return user;
    },

    logout() {
        clearToken();
        window.location.href = "login.html";
    },

    isAuthenticated() {
        return !!getToken();
    }
};

// ── Dashboard API ─────────────────────────────────────────
const NextraDashboard = {
    async getSummary() {
        return apiGet("/api/dashboard/summary");
    }
};

// ── Users API ─────────────────────────────────────────────
const NextraUsers = {
    async getAll() {
        return apiGet("/api/users");
    },
    async getFieldOfficers() {
        return apiGet("/api/users/field-officers");
    },
    async createFieldOfficer(data) {
        return apiPost("/api/users/field-officers", data);
    },
    async updateUser(userId, data) {
        return apiPatch(`/api/users/${userId}`, data);
    }
};

// ── Map API ───────────────────────────────────────────────
const NextraMap = {
    async getOverview() {
        return apiGet("/api/map/overview");
    }
};

// ── Vehicles API ──────────────────────────────────────────
const NextraVehicles = {
    async getAll(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return apiGet(`/api/vehicles${qs ? '?' + qs : ''}`);
    },
    async get(id) {
        return apiGet(`/api/vehicles/${id}`);
    },
    async updateLocation(id, data) {
        return apiPatch(`/api/vehicles/${id}/location`, data);
    }
};

// ── Drivers API ───────────────────────────────────────────
const NextraDrivers = {
    async getAll(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return apiGet(`/api/drivers${qs ? '?' + qs : ''}`);
    },
    async get(id) {
        return apiGet(`/api/drivers/${id}`);
    }
};

// ── Shipments API ─────────────────────────────────────────
const NextraShipments = {
    async getAll(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return apiGet(`/api/shipments${qs ? '?' + qs : ''}`);
    },
    async get(id) {
        return apiGet(`/api/shipments/${id}`);
    },
    async getMyAssignment() {
        return apiGet("/api/shipments/my-assignment");
    },
    async create(data) {
        return apiPost("/api/shipments", data);
    },
    async updateStatus(id, data) {
        return apiPatch(`/api/shipments/${id}/status`, data);
    }
};

// ── Transportation Requests API ───────────────────────────
const NextraTransportRequests = {
    async getAll(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return apiGet(`/api/transport-requests${qs ? '?' + qs : ''}`);
    },
    async get(id) {
        return apiGet(`/api/transport-requests/${id}`);
    },
    async create(data) {
        return apiPost("/api/transport-requests", data);
    },
    async updateStatus(id, data) {
        return apiPatch(`/api/transport-requests/${id}/status`, data);
    },
    async match(id) {
        return apiPost(`/api/transport-requests/${id}/match`, {});
    }
};

// ── Reports API ───────────────────────────────────────────
const NextraReports = {
    async getAll(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return apiGet(`/api/reports${qs ? '?' + qs : ''}`);
    },
    async submit(formData) {
        return apiPostForm("/api/reports", formData);
    }
};

// ── Verification API ──────────────────────────────────────
const NextraVerification = {
    async getAll(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return apiGet(`/api/verification${qs ? '?' + qs : ''}`);
    },
    async getPending() {
        return apiGet("/api/verification?status=PENDING");
    },
    async decide(verificationId, status, remarks) {
        return apiPost(`/api/verification/${verificationId}/decide`, { status, remarks });
    }
};

// ── Risks API ─────────────────────────────────────────────
const NextraRisks = {
    async getAll(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return apiGet(`/api/risks${qs ? '?' + qs : ''}`);
    },
    async getAreas(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return apiGet(`/api/risks/areas${qs ? '?' + qs : ''}`);
    },
    async getAreaRisk(identifier) {
        return apiGet(`/api/risks/areas/${encodeURIComponent(identifier)}`);
    },
    async getRoutes() {
        return apiGet("/api/risks/routes");
    },
    async getRouteRisk(routeId) {
        return apiGet(`/api/risks/routes/${routeId}`);
    },
    async recalculate() {
        return apiPost("/api/risks/recalculate", {});
    }
};

// ── Notifications API ─────────────────────────────────────
const NextraNotifications = {
    async getAll(unreadOnly = false) {
        return apiGet(`/api/notifications${unreadOnly ? '?unread_only=true' : ''}`);
    },
    async getUnreadCount() {
        return apiGet("/api/notifications/count");
    },
    async markRead(id) {
        return apiPatch(`/api/notifications/${id}/read`, {});
    },
    async markAllRead() {
        return apiPost("/api/notifications/read-all", {});
    }
};

// ── Alerts API ────────────────────────────────────────────
const NextraAlerts = {
    async getAll() {
        return apiGet("/api/alerts");
    }
};

// ── Weather API ───────────────────────────────────────────
const NextraWeather = {
    async getAll(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return apiGet(`/api/weather${qs ? '?' + qs : ''}`);
    },
    async update(weatherData) {
        return apiPost("/api/weather", weatherData);
    },
    async updateForState(state, weatherData) {
        return apiPut(`/api/weather/${encodeURIComponent(state)}`, weatherData);
    }
};

// ── Accessibility API ─────────────────────────────────────
const NextraAccessibility = {
    async getAll(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return apiGet(`/api/accessibility${qs ? '?' + qs : ''}`);
    },
    async getByState(state) {
        return apiGet(`/api/accessibility/${encodeURIComponent(state)}`);
    },
    async update(state, data) {
        return apiPut(`/api/accessibility/${encodeURIComponent(state)}`, data);
    }
};

// ── Routes API ────────────────────────────────────────────
const NextraRoutes = {
    async getAll() {
        return apiGet("/api/routes");
    },
    async get(id) {
        return apiGet(`/api/routes/${id}`);
    }
};

// ── Regions API ───────────────────────────────────────────
const NextraRegions = {
    async getAll() {
        return apiGet("/api/regions");
    },
    async getIntelligence(identifier) {
        return apiGet(`/api/regions/${encodeURIComponent(identifier)}/intelligence`);
    }
};

// ── Audit Logs API ────────────────────────────────────────
const NextraAuditLogs = {
    async getAll() {
        return apiGet("/api/audit-logs");
    }
};

// ── NextraApi Compatibility Adapter ───────────────────────
// Synchronizes with backend database while providing synchronous fallback data for callers
const NextraApi = {
    KEYS: {
        USERS: "nextra_users",
        TRUCKS: "nextra_trucks",
        DRIVERS: "nextra_drivers",
        SHIPMENTS: "nextra_shipments",
        REQUESTS: "nextra_requests",
        VERIFICATIONS: "nextra_verifications",
        AUDIT_LOGS: "nextra_audit_logs",
    },
    initDatabase() {
        if (!localStorage.getItem(this.KEYS.USERS) && typeof INITIAL_USERS !== "undefined") {
            localStorage.setItem(this.KEYS.USERS, JSON.stringify(INITIAL_USERS));
        }
        if (!localStorage.getItem(this.KEYS.TRUCKS) && typeof INITIAL_TRUCKS !== "undefined") {
            localStorage.setItem(this.KEYS.TRUCKS, JSON.stringify(INITIAL_TRUCKS));
        }
        if (!localStorage.getItem(this.KEYS.DRIVERS) && typeof INITIAL_DRIVERS !== "undefined") {
            localStorage.setItem(this.KEYS.DRIVERS, JSON.stringify(INITIAL_DRIVERS));
        }
        if (!localStorage.getItem(this.KEYS.SHIPMENTS) && typeof INITIAL_SHIPMENTS !== "undefined") {
            localStorage.setItem(this.KEYS.SHIPMENTS, JSON.stringify(INITIAL_SHIPMENTS));
        }
        if (!localStorage.getItem(this.KEYS.VERIFICATIONS) && typeof INITIAL_VERIFICATIONS !== "undefined") {
            localStorage.setItem(this.KEYS.VERIFICATIONS, JSON.stringify(INITIAL_VERIFICATIONS));
        }
        if (!localStorage.getItem(this.KEYS.REQUESTS) && typeof INITIAL_REQUESTS !== "undefined") {
            localStorage.setItem(this.KEYS.REQUESTS, JSON.stringify(INITIAL_REQUESTS));
        }
        if (!localStorage.getItem(this.KEYS.AUDIT_LOGS)) {
            localStorage.setItem(this.KEYS.AUDIT_LOGS, JSON.stringify([]));
        }
        // Asynchronously synchronize from live FastAPI backend
        this.syncFromBackend();
    },
    async syncFromBackend() {
        try {
            const syncResults = await Promise.allSettled([
                NextraDrivers.getAll(),
                NextraVehicles.getAll(),
                NextraShipments.getAll()
            ]);
            const [drivers, vehicles, shipments] = syncResults;
            if (drivers.status === "fulfilled" && Array.isArray(drivers.value) && drivers.value.length > 0) {
                const mappedDrivers = drivers.value.map(d => ({
                    id: d.driver_id || `DRV-${d.id}`,
                    name: d.name,
                    phone: d.phone,
                    license: d.license_number,
                    assigned_truck: d.assigned_vehicle_reg || (d.vehicle ? d.vehicle.registration : "Unassigned"),
                    current_location: d.assigned_area || (d.current_location ? `${d.current_location.district}, ${d.current_location.state}` : "NER Corridor"),
                    experience_years: d.experience_years || 5,
                    rating: d.rating || 4.8,
                    safety_score: `${Math.round((d.safety_score || 0.95) * 100)}%`,
                    status: d.status,
                    raw: d
                }));
                this._set(this.KEYS.DRIVERS, mappedDrivers);
            }
            if (vehicles.status === "fulfilled" && Array.isArray(vehicles.value) && vehicles.value.length > 0) {
                const mappedTrucks = vehicles.value.map(v => ({
                    truck_id: v.vehicle_id || `TRK-${v.id}`,
                    plate_number: v.registration,
                    vehicle_type: v.vehicle_type,
                    capacity_kg: v.capacity_kg,
                    current_location: v.current_location ? `${v.current_location.district || ''}, ${v.current_location.state || ''}` : (v.state || "NER Hub"),
                    driver_name: v.driver ? v.driver.name : (v.driver_name || "Unassigned"),
                    current_assignment: v.current_shipment ? `Shipment #${v.current_shipment.shipment_code}` : "Available for dispatch",
                    temp_celsius: v.temp_celsius ? `${v.temp_celsius}°C` : "Ambient (21°C)",
                    status: v.status,
                    raw: v
                }));
                this._set(this.KEYS.TRUCKS, mappedTrucks);
            }
            if (shipments.status === "fulfilled" && Array.isArray(shipments.value) && shipments.value.length > 0) {
                this._set(this.KEYS.SHIPMENTS, shipments.value);
            }
        } catch (err) {
            console.warn("[NextraApi] syncFromBackend error:", err);
        }
    },
    _get(key) {
        try {
            const val = localStorage.getItem(key);
            return val ? JSON.parse(val) : [];
        } catch { return []; }
    },
    _set(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch (e) { console.warn(e); }
    },
    getUsers() { return this._get(this.KEYS.USERS); },
    getTrucks() { return this._get(this.KEYS.TRUCKS); },
    getDrivers() { return this._get(this.KEYS.DRIVERS); },
    getShipments() { return this._get(this.KEYS.SHIPMENTS); },
    getTransportationRequests() { return this._get(this.KEYS.REQUESTS); },
    getVerificationRecords() { return this._get(this.KEYS.VERIFICATIONS); },
    getAuditLogs() { return this._get(this.KEYS.AUDIT_LOGS); },
    updateUserStatus(userId, status) {
        const users = this.getUsers();
        const u = users.find(x => x.user_id === userId);
        if (u) { u.status = status; this._set(this.KEYS.USERS, users); }
    },
    updateUserRole(userId, role) {
        const users = this.getUsers();
        const u = users.find(x => x.user_id === userId);
        if (u) { u.role = role; this._set(this.KEYS.USERS, users); }
    },
    logAudit(action, affected, oldVal, newVal) {
        const logs = this.getAuditLogs();
        logs.unshift({
            action, affected_record: affected, old_value: oldVal, new_value: newVal,
            timestamp: new Date().toISOString()
        });
        this._set(this.KEYS.AUDIT_LOGS, logs.slice(0, 100));
    },
    createUser(data) {
        const users = this.getUsers();
        const newUser = {
            user_id: `USR-${Date.now().toString().slice(-4)}`,
            ...data,
            status: "ACTIVE",
            created_at: new Date().toISOString()
        };
        users.push(newUser);
        this._set(this.KEYS.USERS, users);
        return newUser;
    },
    verifyEvidence(recordId, decision, remarks) {
        const recs = this.getVerificationRecords();
        const r = recs.find(x => x.id === recordId);
        if (r) {
            r.status = decision;
            r.reviewer_remarks = remarks;
            r.reviewed_at = new Date().toISOString();
            this._set(this.KEYS.VERIFICATIONS, recs);
        }
        return r;
    },
    createTransportationRequest(data) {
        const reqs = this.getTransportationRequests();
        const newReq = { id: `REQ-${Date.now().toString().slice(-4)}`, ...data, status: "MATCHED" };
        reqs.unshift(newReq);
        this._set(this.KEYS.REQUESTS, reqs);
        return newReq;
    },
    submitRoadIncident(data) {
        const recs = this.getVerificationRecords();
        const newRec = {
            id: `VR-${Date.now().toString().slice(-4)}`,
            ...data,
            status: "PENDING",
            timestamp: new Date().toISOString(),
            ai_analysis: {
                detected_event: data.report_type || "Road Obstruction",
                confidence: "91.4%",
                tags: [data.severity || "MEDIUM", data.state || "NER"],
                hazard_severity: data.severity || "MEDIUM",
                recommendation: "Review by regional field team"
            }
        };
        recs.unshift(newRec);
        this._set(this.KEYS.VERIFICATIONS, recs);
        return newRec;
    }
};
