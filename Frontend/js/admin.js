/**
 * NEXTRA - Administrative Governance & Security Modules
 * User Management CRUD, Role Assignment, and System Audit Trail.
 */

// Render User Management Directory
function renderUserManagementTable() {
    const container = document.getElementById("user-management-container");
    if (!container) return;

    if (!guardPermission('manage_users', 'view User Directory')) {
        container.innerHTML = `
            <div class="empty-state-card">
                <span style="font-size: 36px;">🔒</span>
                <h3>403 Forbidden: Access Denied</h3>
                <p>Only Central Command Administrators have authority to inspect or modify user credentials and role assignments.</p>
            </div>
        `;
        return;
    }

    const users = NextraApi.getUsers();

    container.innerHTML = `
        <div class="data-table-container">
            <div class="table-header-bar">
                <div>
                    <span class="eyebrow dark-eyebrow">Enterprise Identity &amp; Access Management</span>
                    <h2>NEXTRA User Management Directory</h2>
                    <p style="font-size: 12.5px; color: var(--text-muted);">Manage platform roles, grant regional permissions, deactivate accounts, and reset access.</p>
                </div>
                <button type="button" class="btn-primary-large" onclick="openCreateUserModal()" style="padding: 8px 14px; font-size: 12px;">
                    + Create New User
                </button>
            </div>

            <table class="custom-table">
                <thead>
                    <tr>
                        <th>User ID</th>
                        <th>Name &amp; Designation</th>
                        <th>Official Email</th>
                        <th>Platform Role</th>
                        <th>Assigned Jurisdiction</th>
                        <th>Status</th>
                        <th>Governance Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => `
                        <tr>
                            <td><strong class="mono">${u.user_id}</strong></td>
                            <td><strong>${u.name}</strong></td>
                            <td><span class="mono" style="font-size: 12px;">${u.email}</span></td>
                            <td>
                                <select class="form-select role-table-select" onchange="handleUserRoleChange('${u.user_id}', this.value)" style="padding: 4px 8px; font-size: 11.5px; width: auto;">
                                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>👑 Admin</option>
                                    <option value="field_officer" ${u.role === 'field_officer' ? 'selected' : ''}>🔍 Field Officer</option>
                                    <option value="logistics" ${u.role === 'logistics' ? 'selected' : ''}>📦 Logistics</option>
                                    <option value="driver" ${u.role === 'driver' ? 'selected' : ''}>🚚 Driver</option>
                                </select>
                            </td>
                            <td>
                                <span class="status-badge ${u.assigned_area === 'ALL' ? 'status-green' : 'status-amber'}">${u.assigned_area}</span>
                            </td>
                            <td>
                                <span class="status-badge ${u.status === 'ACTIVE' ? 'status-green' : 'status-red'}">${u.status}</span>
                            </td>
                            <td>
                                <div style="display: flex; gap: 6px;">
                                    <button type="button" class="action-btn-sm" onclick="toggleUserStatus('${u.user_id}', '${u.status}')">
                                        ${u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button type="button" class="action-btn-sm" onclick="resetUserAccess('${u.user_id}', '${u.name}')">
                                        Reset Access
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// User Status Toggle (Active / Disabled)
function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
        NextraApi.updateUserStatus(userId, newStatus);
        renderUserManagementTable();
        if (typeof showToast === 'function') {
            showToast(`User ${userId} status updated to: ${newStatus}`);
        }
    } catch (e) {
        alert(e.message);
    }
}

// User Role Change Handler
function handleUserRoleChange(userId, newRole) {
    try {
        NextraApi.updateUserRole(userId, newRole);
        renderUserManagementTable();
        if (typeof showToast === 'function') {
            showToast(`User ${userId} role updated to: ${newRole.toUpperCase()}`);
        }
    } catch (e) {
        alert(e.message);
    }
}

// User Access Key Reset
function resetUserAccess(userId, name) {
    NextraApi.logAudit("PASSWORD_RESET", `${userId} (${name})`, "ACTIVE", "TEMPORARY_KEY_ISSUED");
    if (typeof showToast === 'function') {
        showToast(`Temporary access key dispatched to ${name}'s official inbox.`);
    }
}

// Create User Modal
function openCreateUserModal() {
    const modal = document.getElementById("modal-create-user");
    if (modal) modal.classList.add("active");
}

function handleCreateUserSubmit(e) {
    e.preventDefault();
    const data = {
        name: document.getElementById("new-user-name").value,
        email: document.getElementById("new-user-email").value,
        role: document.getElementById("new-user-role").value,
        assigned_area: document.getElementById("new-user-area").value
    };

    try {
        const user = NextraApi.createUser(data);
        if (typeof closeModals === 'function') closeModals();
        renderUserManagementTable();
        if (typeof showToast === 'function') {
            showToast(`User account created: ${user.name} (${user.user_id})`);
        }
    } catch (err) {
        alert(err.message);
    }
}

// Render Security Audit Logs Table
function renderAuditLogsTable() {
    const container = document.getElementById("audit-logs-container");
    if (!container) return;

    if (!guardPermission('view_audit_logs', 'view Security Audit Logs')) {
        container.innerHTML = `
            <div class="empty-state-card">
                <span style="font-size: 36px;">🔒</span>
                <h3>403 Forbidden: Access Denied</h3>
                <p>Audit logging contains sensitive provenance records restricted to Central Command Administrators.</p>
            </div>
        `;
        return;
    }

    const logs = NextraApi.getAuditLogs();

    container.innerHTML = `
        <div class="data-table-container">
            <div class="table-header-bar">
                <div>
                    <span class="eyebrow dark-eyebrow">Immutable Governance Ledger</span>
                    <h2>NEXTRA Operations Audit Trail</h2>
                    <p style="font-size: 12.5px; color: var(--text-muted);">Cryptographically timestamped ledger of administrative decisions, role adjustments, and ground truth verifications.</p>
                </div>
                <span class="status-badge status-green">${logs.length} Logged Events</span>
            </div>

            <table class="custom-table">
                <thead>
                    <tr>
                        <th>Log ID</th>
                        <th>Timestamp (IST)</th>
                        <th>Originator / Role</th>
                        <th>Event Action</th>
                        <th>Affected Record</th>
                        <th>Previous State</th>
                        <th>New State</th>
                    </tr>
                </thead>
                <tbody>
                    ${logs.map(l => `
                        <tr>
                            <td><strong class="mono">${l.log_id}</strong></td>
                            <td><span class="mono" style="font-size: 11.5px;">${new Date(l.timestamp).toLocaleString()}</span></td>
                            <td><strong>${l.who}</strong><br><small class="mono">ID: ${l.user_id}</small></td>
                            <td><span class="status-badge status-blue">${l.action}</span></td>
                            <td><strong>${l.affected_record}</strong></td>
                            <td><code style="font-size: 11px; background: rgba(0,0,0,0.04); padding: 2px 4px; border-radius: 4px;">${l.old_value}</code></td>
                            <td><code style="font-size: 11px; color: var(--primary); font-weight: 700; background: rgba(5,150,105,0.08); padding: 2px 4px; border-radius: 4px;">${l.new_value}</code></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Render Field Officers Roster (Admin View of all 8 state officers)
function renderFieldOfficersRoster() {
    const container = document.getElementById("field-officers-roster-container");
    if (!container) return;

    if (!guardPermission('view_field_officers', 'view Field Officers Registry')) {
        container.innerHTML = `
            <div class="empty-state-card">
                <span style="font-size: 36px;">🔒</span>
                <h3>403 Forbidden: Access Denied</h3>
                <p>Access restricted to Central Command Administrators.</p>
            </div>
        `;
        return;
    }

    const officers = [
        { id: "FO-MEG-01", name: "Arjun Sharma", state: "Meghalaya", sector: "NH-6 Sonapur / Khasi Hills", phone: "+91 94361-28901", radio: "Ch. 4 (148.25 MHz)", status: "ON_PATROL", reports: 14, verifications: 9 },
        { id: "FO-ASM-02", name: "Diganta Barman", state: "Assam", sector: "NH-27 Kamrup & Brahmaputra", phone: "+91 94350-51201", radio: "Ch. 2 (142.10 MHz)", status: "ACTIVE_DUTY", reports: 22, verifications: 18 },
        { id: "FO-ARU-03", name: "Tenzing Norbu", state: "Arunachal", sector: "Tawang / Sela Pass Frontier", phone: "+91 94360-88124", radio: "Ch. 7 (154.60 MHz)", status: "ON_PATROL", reports: 8, verifications: 6 },
        { id: "FO-NAG-04", name: "Kevingulie Angami", state: "Nagaland", sector: "NH-29 Kohima-Dimapur Pass", phone: "+91 94360-19283", radio: "Ch. 3 (144.30 MHz)", status: "ACTIVE_DUTY", reports: 11, verifications: 8 },
        { id: "FO-MAN-05", name: "Sanatomba Singh", state: "Manipur", sector: "Imphal-Jiribam Lifeline", phone: "+91 98620-41092", radio: "Ch. 5 (149.80 MHz)", status: "ACTIVE_DUTY", reports: 9, verifications: 7 },
        { id: "FO-MIZ-06", name: "Lalhmingliana Sailo", state: "Mizoram", sector: "Aizawl Mountain Route", phone: "+91 94361-55829", radio: "Ch. 6 (151.20 MHz)", status: "STANDBY", reports: 5, verifications: 4 },
        { id: "FO-TRP-07", name: "Subrata Debnath", state: "Tripura", sector: "Agartala Multi-Modal Route", phone: "+91 94361-77210", radio: "Ch. 1 (140.00 MHz)", status: "ACTIVE_DUTY", reports: 13, verifications: 11 },
        { id: "FO-SIK-08", name: "Tashi Wangchuk", state: "Sikkim", sector: "NH-10 Teesta Valley Pass", phone: "+91 94340-33918", radio: "Ch. 8 (156.40 MHz)", status: "ON_PATROL", reports: 17, verifications: 15 }
    ];

    container.innerHTML = `
        <div class="data-table-container">
            <div class="table-header-bar">
                <div>
                    <span class="eyebrow dark-eyebrow">Ground Truth Command</span>
                    <h2>👮 North Eastern Field Officers &amp; BRO Taskforce Roster</h2>
                    <p style="font-size: 12.5px; color: var(--text-muted);">8-State operational deployment, tactical radio frequencies, and ground truth verification volume.</p>
                </div>
                <span class="status-badge status-green">8 State Sectors Synchronized</span>
            </div>

            <table class="custom-table">
                <thead>
                    <tr>
                        <th>Officer ID</th>
                        <th>Name &amp; Designation</th>
                        <th>Assigned State</th>
                        <th>Active Sector</th>
                        <th>Mobile Contact</th>
                        <th>Radio Channel</th>
                        <th>Duty Status</th>
                        <th>Verified Incidents</th>
                    </tr>
                </thead>
                <tbody>
                    ${officers.map(o => `
                        <tr>
                            <td><strong class="mono">${o.id}</strong></td>
                            <td><strong>${o.name}</strong><br><small>Disaster Inspection Officer</small></td>
                            <td><span class="status-badge ${o.state === 'Meghalaya' ? 'status-amber' : 'status-green'}">${o.state}</span></td>
                            <td>${o.sector}</td>
                            <td><span class="mono">${o.phone}</span></td>
                            <td><span class="mono" style="font-size: 11px;">${o.radio}</span></td>
                            <td><span class="status-badge ${o.status === 'ON_PATROL' ? 'status-green' : o.status === 'ACTIVE_DUTY' ? 'status-blue' : 'status-amber'}">${o.status}</span></td>
                            <td><strong style="color: var(--primary);">${o.verifications}</strong> / ${o.reports} total</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

