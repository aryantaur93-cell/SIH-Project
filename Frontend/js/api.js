/**
 * NEXTRA - Secure API & Persistence Service
 * Implements backend authorization middleware and data mutation guards.
 */

const NextraApi = {
    // Storage keys
    KEYS: {
        USERS: "nextra_db_users",
        VERIFICATIONS: "nextra_db_verifications",
        REQUESTS: "nextra_db_requests",
        SHIPMENTS: "nextra_db_shipments",
        AUDIT: "nextra_db_audit",
        DRIVERS: "nextra_db_drivers",
        TRUCKS: "nextra_db_trucks"
    },

    // Initialize database in LocalStorage with seed data if not present
    initDatabase() {
        if (!localStorage.getItem(this.KEYS.USERS)) {
            localStorage.setItem(this.KEYS.USERS, JSON.stringify(INITIAL_USERS));
        }
        if (!localStorage.getItem(this.KEYS.VERIFICATIONS)) {
            localStorage.setItem(this.KEYS.VERIFICATIONS, JSON.stringify(INITIAL_VERIFICATION_RECORDS));
        }
        if (!localStorage.getItem(this.KEYS.REQUESTS)) {
            localStorage.setItem(this.KEYS.REQUESTS, JSON.stringify(INITIAL_TRANSPORT_REQUESTS));
        }
        if (!localStorage.getItem(this.KEYS.SHIPMENTS)) {
            localStorage.setItem(this.KEYS.SHIPMENTS, JSON.stringify(INITIAL_SHIPMENTS));
        }
        if (!localStorage.getItem(this.KEYS.AUDIT)) {
            localStorage.setItem(this.KEYS.AUDIT, JSON.stringify(INITIAL_AUDIT_LOGS));
        }
        if (!localStorage.getItem(this.KEYS.DRIVERS)) {
            localStorage.setItem(this.KEYS.DRIVERS, JSON.stringify(INITIAL_DRIVERS));
        }
        if (!localStorage.getItem(this.KEYS.TRUCKS)) {
            localStorage.setItem(this.KEYS.TRUCKS, JSON.stringify(INITIAL_TRUCKS));
        }
    },

    // Internal getter with JSON parsing
    _get(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch (e) {
            console.error(`Error reading ${key}`, e);
            return [];
        }
    },

    // Internal setter
    _set(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },

    // Audit Log recorder
    logAudit(action, affectedRecord, oldValue, newValue) {
        const user = getActiveUser();
        const logs = this._get(this.KEYS.AUDIT);
        const newLog = {
            log_id: `AUD-${String(logs.length + 1).padStart(3, '0')}`,
            who: user ? `${user.name} (${ROLE_PROFILES[user.role]?.label || user.role})` : "System Service",
            user_id: user ? user.user_id : "SYS",
            user_role: user ? user.role : "system",
            action: action,
            affected_record: affectedRecord,
            old_value: oldValue,
            new_value: newValue,
            timestamp: new Date().toISOString()
        };
        logs.unshift(newLog);
        this._set(this.KEYS.AUDIT, logs);
        return newLog;
    },

    // ==========================================
    // USER MANAGEMENT API (Admin Only)
    // ==========================================
    getUsers() {
        if (!guardPermission('manage_users', 'access User Management directory')) {
            throw new Error("403 Forbidden: Insufficient permissions to view users directory");
        }
        return this._get(this.KEYS.USERS);
    },

    createUser(userData) {
        if (!guardPermission('manage_users', 'create new platform users')) {
            throw new Error("403 Forbidden: Insufficient permissions to create users");
        }
        const users = this._get(this.KEYS.USERS);
        const newUser = {
            user_id: `USR-${String(users.length + 1).padStart(3, '0')}`,
            name: userData.name.trim(),
            email: userData.email.trim().toLowerCase(),
            role: userData.role,
            assigned_area: userData.assigned_area || "ALL",
            status: "ACTIVE",
            created_at: new Date().toISOString()
        };
        users.push(newUser);
        this._set(this.KEYS.USERS, users);
        this.logAudit("USER_CREATED", `${newUser.user_id} (${newUser.name})`, "NONE", `ROLE: ${newUser.role}`);
        return newUser;
    },

    updateUserStatus(userId, newStatus) {
        if (!guardPermission('manage_users', 'modify user status')) {
            throw new Error("403 Forbidden");
        }
        const users = this._get(this.KEYS.USERS);
        const user = users.find(u => u.user_id === userId);
        if (!user) throw new Error("User not found");
        const oldStatus = user.status;
        user.status = newStatus;
        this._set(this.KEYS.USERS, users);
        this.logAudit("USER_STATUS_CHANGE", `${user.user_id} (${user.name})`, oldStatus, newStatus);
        return user;
    },

    updateUserRole(userId, newRole) {
        if (!guardPermission('manage_users', 'change user role')) {
            throw new Error("403 Forbidden");
        }
        const users = this._get(this.KEYS.USERS);
        const user = users.find(u => u.user_id === userId);
        if (!user) throw new Error("User not found");
        const oldRole = user.role;
        user.role = newRole;
        this._set(this.KEYS.USERS, users);
        this.logAudit("USER_ROLE_CHANGE", `${user.user_id} (${user.name})`, oldRole, newRole);
        return user;
    },

    // ==========================================
    // VERIFICATION CENTER API (Role-Scoped)
    // ==========================================
    getVerificationRecords() {
        const user = getActiveUser();
        const records = this._get(this.KEYS.VERIFICATIONS);
        if (!user) return [];

        if (user.role === 'admin') {
            // Admin sees every uploaded image across all 8 states
            return records;
        } else if (user.role === 'field_officer') {
            // Field Officer sees images relevant to their assigned area (e.g. MEGHALAYA)
            const area = user.assigned_area || "MEGHALAYA";
            return records.filter(r => r.state === area || area === 'ALL');
        } else {
            // Drivers and Logistics only see evidence they submitted
            return records.filter(r => r.user_id === user.user_id || r.uploaded_by.toLowerCase().includes(user.name.toLowerCase()));
        }
    },

    verifyEvidence(recordId, status, remarks) {
        const user = getActiveUser();
        if (!user) throw new Error("Authentication required");

        const records = this._get(this.KEYS.VERIFICATIONS);
        const record = records.find(r => r.id === recordId);
        if (!record) throw new Error("Evidence record not found");

        // Role verification authority check
        if (user.role === 'admin') {
            // Admin can verify any area
        } else if (user.role === 'field_officer') {
            if (record.state !== user.assigned_area && user.assigned_area !== 'ALL') {
                throw new Error("403 Forbidden: Field Officer cannot verify outside assigned jurisdiction");
            }
        } else {
            throw new Error("403 Forbidden: Only Admin or Field Officer can make verification decisions");
        }

        const oldStatus = record.status;
        record.status = status; // VERIFIED or REJECTED
        record.reviewed_by = user.name;
        record.reviewer_role = user.role;
        record.reviewer_remarks = remarks || (status === 'VERIFIED' ? 'Ground truth confirmed' : 'Insufficient evidence');
        record.reviewed_at = new Date().toISOString();

        this._set(this.KEYS.VERIFICATIONS, records);
        this.logAudit("EVIDENCE_REVIEWED", `${record.id} (${record.location})`, oldStatus, `${status} by ${user.name}`);
        return record;
    },

    submitRoadIncident(incidentData) {
        const user = getActiveUser();
        const records = this._get(this.KEYS.VERIFICATIONS);

        // Assistive AI Analysis Simulator
        const eventType = incidentData.report_type || "Road Hazard";
        let aiDetected = "Obstruction / Hazard";
        let confidence = (85 + Math.random() * 12).toFixed(1) + "%";
        let tags = ["Visual Anomaly", "Traffic Impediment"];
        let severity = incidentData.severity || "MEDIUM";

        if (eventType.toLowerCase().includes("landslide")) {
            aiDetected = "Slope Mudflow & Rock Debris";
            tags = ["Boulder Hazard", "Lane Blockage", "Unstable Slope"];
        } else if (eventType.toLowerCase().includes("accident")) {
            aiDetected = "Vehicle Collision / Disabled Carrier";
            tags = ["Traffic Bottleneck", "Tow Service Required"];
        } else if (eventType.toLowerCase().includes("flood") || eventType.toLowerCase().includes("water")) {
            aiDetected = "River Overflow / Submerged Tarmac";
            tags = ["Water Logging", "Low Traction"];
        }

        const newRecord = {
            id: `VER-${String(records.length + 901)}`,
            uploaded_by: user ? user.name : "Field Reporter",
            user_id: user ? user.user_id : "USR-EXT",
            user_role: user ? user.role : "driver",
            location: incidentData.location || "NH-6 Hill Corridor",
            state: incidentData.state || (user?.assigned_area || "MEGHALAYA"),
            area: incidentData.area || "Active Highway Sector",
            timestamp: new Date().toISOString(),
            report_type: eventType,
            description: incidentData.description || "Reported road obstacle.",
            image_url: incidentData.image_url || "assets/evidence_landslide.svg",
            ai_analysis: {
                detected_event: aiDetected,
                confidence: confidence,
                tags: tags,
                hazard_severity: severity,
                recommendation: "Review by regional field officer required before dispatch alert."
            },
            status: "PENDING",
            reviewed_by: null,
            reviewer_role: null,
            reviewer_remarks: "",
            reviewed_at: null
        };

        records.unshift(newRecord);
        this._set(this.KEYS.VERIFICATIONS, records);
        this.logAudit("HAZARD_PHOTO_SUBMITTED", `${newRecord.id} (${newRecord.location})`, "NONE", `PENDING_VERIFICATION (${newRecord.report_type})`);
        return newRecord;
    },

    // ==========================================
    // LOGISTICS & FLEET API
    // ==========================================
    getTransportationRequests() {
        return this._get(this.KEYS.REQUESTS);
    },

    createTransportationRequest(reqData) {
        if (!guardPermission('create_transport_requests', 'submit freight transport request')) {
            throw new Error("403 Forbidden");
        }
        const user = getActiveUser();
        const requests = this._get(this.KEYS.REQUESTS);
        const trucks = this._get(this.KEYS.TRUCKS);
        const drivers = this._get(this.KEYS.DRIVERS);

        // Intelligent Truck & Driver Matching Engine
        const weight = Number(reqData.cargo_weight_kg) || 2000;
        const suitableTruck = trucks.find(t => t.status === "AVAILABLE" && t.capacity_kg >= weight) || trucks[3];
        const suitableDriver = drivers.find(d => d.assigned_truck === suitableTruck.truck_id || d.status === "AVAILABLE") || drivers[2];

        const newReq = {
            request_id: `TR-2026-${String(requests.length + 1).padStart(2, '0')}`,
            pickup_location: reqData.pickup_location,
            destination: reqData.destination,
            cargo_type: reqData.cargo_type,
            cargo_weight_kg: weight,
            required_vehicle: reqData.required_vehicle || "Standard Freight Carrier",
            priority: reqData.priority || "NORMAL",
            required_date: reqData.required_date || "2026-09-30",
            required_time: reqData.required_time || "09:00 AM",
            notes: reqData.notes || "",
            status: "MATCHED",
            created_by: user ? `${user.name} (${user.role})` : "Logistics Officer",
            created_at: new Date().toISOString(),
            matched_truck: suitableTruck.truck_id,
            matched_driver: suitableDriver.name
        };

        requests.unshift(newReq);
        this._set(this.KEYS.REQUESTS, requests);
        this.logAudit("TRANSPORT_REQUEST_CREATED", `${newReq.request_id} (${newReq.pickup_location} → ${newReq.destination})`, "NONE", `MATCHED: ${newReq.matched_truck} / ${newReq.matched_driver}`);
        return newReq;
    },

    getShipments() {
        return this._get(this.KEYS.SHIPMENTS);
    },

    getDrivers() {
        return this._get(this.KEYS.DRIVERS);
    },

    getTrucks() {
        return this._get(this.KEYS.TRUCKS);
    },

    getAuditLogs() {
        if (!guardPermission('view_audit_logs', 'view system audit trail')) {
            throw new Error("403 Forbidden: Insufficient permissions to inspect audit trail");
        }
        return this._get(this.KEYS.AUDIT);
    }
};

// Initialize DB on script load
NextraApi.initDatabase();
