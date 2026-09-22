/**
 * NEXTRA - Phase 15: Simple Offline Incident Reporting Engine
 * 
 * Provides local storage persistence (IndexedDB + localStorage fallback),
 * offline detection, evidence photo buffering, automatic synchronization upon
 * reconnection, status lifecycle (SYNC PENDING -> SYNCED), and duplicate prevention.
 */

const NextraOffline = {
    dbName: "NextraOfflineDB",
    dbVersion: 1,
    storeName: "offline_reports",
    simulatedOffline: false,
    simulateSyncFailure: false, // Testing helper for Test E
    isSyncingAll: false,
    lastSyncAttempt: localStorage.getItem("nextra_last_sync_time") || null,
    lastSyncError: null,
    db: null,

    // Initialize Database & Event Listeners
    async init() {
        this.lastSyncAttempt = localStorage.getItem("nextra_last_sync_time") || null;
        try {
            await this.openDB();
        } catch (err) {
            console.warn("[NextraOffline] IndexedDB not available, using localStorage fallback:", err);
        }

        // Native browser online/offline events
        window.addEventListener("online", () => {
            console.log("[NextraOffline] Browser went online");
            this.handleConnectivityChange();
        });

        window.addEventListener("offline", () => {
            console.log("[NextraOffline] Browser went offline");
            this.handleConnectivityChange();
        });

        // Initial UI render
        this.renderBanner();
        this.renderQueue();

        // Check if there are pending reports and we are online
        if (this.isOnline()) {
            setTimeout(() => this.syncPendingReports(), 1500);
        }
    },

    // Check if network is available (respects simulated offline toggle)
    isOnline() {
        return navigator.onLine && !this.simulatedOffline;
    },

    // Toggle Simulated Offline mode for testing without disconnecting Wi-Fi
    toggleSimulatedOffline() {
        this.simulatedOffline = !this.simulatedOffline;
        const stateStr = this.simulatedOffline ? "OFFLINE (Simulated)" : "ONLINE (Restored)";
        console.log(`[NextraOffline] Connection state toggled to: ${stateStr}`);
        
        if (typeof showToast === "function") {
            if (this.simulatedOffline) {
                showToast("🔴 Simulated Offline Mode Activated: Reports will save locally as SYNC PENDING.");
            } else {
                showToast("🟢 Simulated Connection Restored: Auto-synchronizing pending offline reports...");
            }
        }

        this.handleConnectivityChange();
    },

    // Toggle simulated sync failure for TEST E
    toggleSimulateSyncFailure() {
        this.simulateSyncFailure = !this.simulateSyncFailure;
        if (typeof showToast === "function") {
            if (this.simulateSyncFailure) {
                showToast("⚠️ Forced Sync Failure enabled (Test E): Next sync will fail and preserve SYNC PENDING state.");
            } else {
                showToast("✅ Forced Sync Failure disabled: Normal sync restored.");
            }
        }
        this.renderBanner();
        this.renderQueue();
    },

    handleConnectivityChange() {
        this.renderBanner();
        if (this.isOnline()) {
            this.syncPendingReports();
        }
    },

    // Open or create IndexedDB
    openDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                return reject(new Error("IndexedDB not supported"));
            }

            const req = indexedDB.open(this.dbName, this.dbVersion);

            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: "client_report_id" });
                    store.createIndex("sync_status", "sync_status", { unique: false });
                    store.createIndex("created_at", "created_at", { unique: false });
                }
            };

            req.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };

            req.onerror = (e) => reject(e.target.error);
        });
    },

    // Convert File to base64 Data URL for persistent offline storage
    fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            if (!file) return resolve(null);
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    },

    // Convert Data URL back to Blob for multipart upload
    dataURLtoBlob(dataUrl) {
        if (!dataUrl || !dataUrl.includes(",")) return null;
        try {
            const arr = dataUrl.split(",");
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new Blob([u8arr], { type: mime });
        } catch (e) {
            console.warn("[NextraOffline] Error converting DataURL to Blob:", e);
            return null;
        }
    },

    // Save report locally with SYNC PENDING status
    async saveOfflineReport(reportData, photoFile = null) {
        let imageDataUrl = null;
        let imageFilename = null;

        if (photoFile) {
            try {
                imageDataUrl = await this.fileToDataURL(photoFile);
                imageFilename = photoFile.name || "offline_evidence.jpg";
            } catch (e) {
                console.warn("[NextraOffline] Could not serialize photo file:", e);
            }
        }

        const clientReportId = "OFFLINE-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8).toUpperCase();

        const record = {
            client_report_id: clientReportId,
            incident_type: reportData.incident_type || "OTHER",
            severity: reportData.severity || "MEDIUM",
            state: reportData.state || "Assam",
            district: reportData.district || "",
            location_name: reportData.location_name || "",
            description: reportData.description || "",
            latitude: reportData.latitude || null,
            longitude: reportData.longitude || null,
            image_data: imageDataUrl,
            image_filename: imageFilename,
            created_at: new Date().toISOString(),
            sync_status: "SYNC PENDING", // Canonical status required by Phase 15
            server_report_code: null,
            is_syncing: false,
            error: null
        };

        // Try IndexedDB first
        if (this.db) {
            await new Promise((resolve, reject) => {
                const tx = this.db.transaction([this.storeName], "readwrite");
                const store = tx.objectStore(this.storeName);
                const req = store.put(record);
                req.onsuccess = () => resolve(req.result);
                req.onerror = (e) => reject(e.target.error);
            });
        } else {
            // LocalStorage fallback
            const existing = this.getLocalStorageReports();
            existing.unshift(record);
            localStorage.setItem("nextra_offline_reports", JSON.stringify(existing));
        }

        console.log(`[NextraOffline] Report ${clientReportId} saved locally with status: SYNC PENDING`);
        this.renderBanner();
        this.renderQueue();

        return record;
    },

    // Get all records from storage
    async getAllReports() {
        if (this.db) {
            return new Promise((resolve) => {
                const tx = this.db.transaction([this.storeName], "readonly");
                const store = tx.objectStore(this.storeName);
                const req = store.getAll();
                req.onsuccess = () => {
                    const list = req.result || [];
                    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    resolve(list);
                };
                req.onerror = () => resolve(this.getLocalStorageReports());
            });
        }
        return this.getLocalStorageReports();
    },

    getLocalStorageReports() {
        try {
            const raw = localStorage.getItem("nextra_offline_reports");
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    },

    // Update single record in storage
    async updateReportRecord(record) {
        if (this.db) {
            return new Promise((resolve) => {
                const tx = this.db.transaction([this.storeName], "readwrite");
                const store = tx.objectStore(this.storeName);
                store.put(record);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } else {
            const list = this.getLocalStorageReports();
            const idx = list.findIndex(r => r.client_report_id === record.client_report_id);
            if (idx >= 0) list[idx] = record;
            else list.unshift(record);
            localStorage.setItem("nextra_offline_reports", JSON.stringify(list));
        }
    },

    // Delete synced item or clear item
    async deleteReport(clientReportId) {
        if (this.db) {
            return new Promise((resolve) => {
                const tx = this.db.transaction([this.storeName], "readwrite");
                const store = tx.objectStore(this.storeName);
                store.delete(clientReportId);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } else {
            const list = this.getLocalStorageReports().filter(r => r.client_report_id !== clientReportId);
            localStorage.setItem("nextra_offline_reports", JSON.stringify(list));
        }
    },

    // Synchronize all SYNC PENDING reports to the Central Backend
    async syncPendingReports() {
        if (!this.isOnline()) {
            console.log("[NextraOffline] Cannot sync: Network is currently offline.");
            return;
        }

        if (this.isSyncingAll) {
            console.log("[NextraOffline] Sync already in progress.");
            return;
        }

        this.isSyncingAll = true;
        const attemptTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + " · " + new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
        this.lastSyncAttempt = attemptTimeStr;
        localStorage.setItem("nextra_last_sync_time", this.lastSyncAttempt);
        this.renderBanner();

        try {
            const reports = await this.getAllReports();
            const pendingList = reports.filter(r => r.sync_status === "SYNC PENDING");

            if (pendingList.length === 0) {
                console.log("[NextraOffline] Zero pending offline reports to sync.");
                this.lastSyncError = null;
                return;
            }

            console.log(`[NextraOffline] Starting automatic sync for ${pendingList.length} report(s)...`);

            for (const item of pendingList) {
                // Avoid duplicate submissions
                if (item.is_syncing) continue;
                item.is_syncing = true;
                item.sync_status = "SYNCING";
                await this.updateReportRecord(item);
                this.renderBanner();
                this.renderQueue();

                try {
                    // Test E simulation hook
                    if (this.simulateSyncFailure) {
                        throw new Error("Simulated Connection/Server Error (Test E)");
                    }

                    const formData = new FormData();
                    formData.append("incident_type", item.incident_type);
                    formData.append("severity", item.severity);
                    formData.append("state", item.state);
                    formData.append("location_name", item.location_name || "");
                    formData.append("description", item.description || "");
                    formData.append("client_report_id", item.client_report_id); // Backend deduplication

                    if (item.latitude) formData.append("latitude", item.latitude);
                    if (item.longitude) formData.append("longitude", item.longitude);
                    if (item.district) formData.append("district", item.district);

                    // Reconstitute photo Blob if present
                    if (item.image_data) {
                        const blob = this.dataURLtoBlob(item.image_data);
                        if (blob) {
                            formData.append("image", blob, item.image_filename || "offline_evidence.jpg");
                        }
                    }

                    // Submit to backend
                    const res = await NextraReports.submit(formData);

                    // Mark as SYNCED
                    item.sync_status = "SYNCED";
                    item.server_report_code = res.report_code || "RPT-OK";
                    item.is_syncing = false;
                    item.error = null;
                    await this.updateReportRecord(item);
                    this.lastSyncError = null;

                    if (typeof showToast === "function") {
                        showToast(`✅ Synced: Offline report uploaded as ${item.server_report_code}!`);
                    }
                } catch (err) {
                    console.error(`[NextraOffline] Failed to sync ${item.client_report_id}:`, err);
                    item.is_syncing = false;
                    item.sync_status = "SYNC PENDING"; // Revert to pending for retry; do NOT delete failed reports
                    item.error = err.message || "Network transmission error";
                    this.lastSyncError = item.error;
                    await this.updateReportRecord(item);

                    if (typeof showToast === "function") {
                        showToast(`⚠️ Sync failed for ${item.client_report_id}: ${err.message}. Retained as SYNC PENDING.`);
                    }
                }
            }

            // Refresh recent reports table and dashboard if online
            if (typeof loadRecentFieldReports === "function") {
                await loadRecentFieldReports();
            }
            if (typeof window.refreshNextraLiveData === "function") {
                await window.refreshNextraLiveData();
            }

        } catch (err) {
            console.error("[NextraOffline] Sync loop error:", err);
            this.lastSyncError = err.message || "Sync error";
        } finally {
            this.isSyncingAll = false;
            this.renderBanner();
            this.renderQueue();
        }
    },

    // Render the top offline status banner (Prompt 15 Requirement 7)
    async renderBanner() {
        const banner = document.getElementById("fo-offline-status-banner");
        if (!banner) return;

        const online = this.isOnline();
        const reports = await this.getAllReports();
        const pendingCount = reports.filter(r => r.sync_status === "SYNC PENDING").length;
        const syncedCount = reports.filter(r => r.sync_status === "SYNCED").length;

        // Current sync status label
        let syncStatusText = "IDLE / UP TO DATE";
        let syncStatusColor = "#059669";
        if (!online) {
            syncStatusText = "PAUSED (OFFLINE BUFFER)";
            syncStatusColor = "#dc2626";
        } else if (this.isSyncingAll) {
            syncStatusText = "SYNCHRONIZING...";
            syncStatusColor = "#0284c7";
        } else if (this.lastSyncError) {
            syncStatusText = "FAILED (RETRY PENDING)";
            syncStatusColor = "#ea580c";
        } else if (pendingCount > 0) {
            syncStatusText = "SYNC PENDING (QUEUED)";
            syncStatusColor = "#d97706";
        }

        const lastSyncDisplay = this.lastSyncAttempt ? this.lastSyncAttempt : "Never";

        const statusDot = online
            ? `<span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:#10b981; margin-right:6px; box-shadow:0 0 6px #10b981;"></span>`
            : `<span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:#ef4444; margin-right:6px; box-shadow:0 0 6px #ef4444; animation: pulse 1.5s infinite;"></span>`;

        const statusText = online
            ? `<strong style="color: #059669;">GRID ONLINE</strong> <span style="color:#64748b; font-size:12px;">· Instant Central Transmission Active</span>`
            : `<strong style="color: #dc2626;">OFFLINE BUFFER ENGAGED</strong> <span style="color:#64748b; font-size:12px;">· Storing locally with status SYNC PENDING</span>`;

        banner.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                <!-- Row 1: Connection Indicator & Interactive Controls -->
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; font-size: 13px;">
                        ${statusDot}
                        <span>${statusText}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <button type="button" class="action-btn-sm" onclick="NextraOffline.toggleSimulatedOffline()" style="font-size: 11px; padding: 4px 9px; background: ${this.simulatedOffline ? '#fee2e2' : '#f8fafc'}; color: ${this.simulatedOffline ? '#dc2626' : '#334155'}; border: 1px solid ${this.simulatedOffline ? '#fca5a5' : '#cbd5e1'}; border-radius: 4px; cursor: pointer;">
                            ${this.simulatedOffline ? '🌐 Restore Online' : '⚡ Simulate Offline'}
                        </button>
                        <button type="button" class="action-btn-sm" onclick="NextraOffline.toggleSimulateSyncFailure()" style="font-size: 11px; padding: 4px 9px; background: ${this.simulateSyncFailure ? '#fef3c7' : '#f8fafc'}; color: ${this.simulateSyncFailure ? '#b45309' : '#64748b'}; border: 1px solid ${this.simulateSyncFailure ? '#fde68a' : '#cbd5e1'}; border-radius: 4px; cursor: pointer;" title="Force sync failure for Test E verification">
                            ${this.simulateSyncFailure ? '⚠️ Fail Sync: ON' : '⚠️ Test Fail Sync'}
                        </button>
                        ${online && pendingCount > 0 ? `
                            <button type="button" class="action-btn-sm" onclick="NextraOffline.syncPendingReports()" style="font-size: 11px; padding: 4px 10px; background: #0284c7; color: #ffffff; border: 1px solid #0284c7; border-radius: 4px; cursor: pointer;" ${this.isSyncingAll ? 'disabled' : ''}>
                                ${this.isSyncingAll ? '⏳ Syncing...' : '🔄 Sync Now'}
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Row 2: Prompt 15 Req 7 Status Metrics Strip -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; padding-top: 8px; border-top: 1px solid #f1f5f9; font-size: 11.5px; background: #f8fafc; padding: 8px 12px; border-radius: 6px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="color: #64748b;">Pending Reports:</span>
                        <span id="fo-offline-pending-badge" style="font-weight: 700; color: ${pendingCount > 0 ? '#b45309' : '#047857'}; background: ${pendingCount > 0 ? '#fef3c7' : '#ecfdf5'}; padding: 1px 7px; border-radius: 10px; border: 1px solid ${pendingCount > 0 ? '#fde68a' : '#a7f3d0'};">
                            ⚡ ${pendingCount}
                        </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="color: #64748b;">Synced Reports:</span>
                        <span id="fo-offline-synced-badge" style="font-weight: 700; color: #047857; background: #ecfdf5; padding: 1px 7px; border-radius: 10px; border: 1px solid #a7f3d0;">
                            ✓ ${syncedCount}
                        </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="color: #64748b;">Sync Status:</span>
                        <span id="fo-offline-sync-status" style="font-weight: 700; color: ${syncStatusColor};">
                            ${syncStatusText}
                        </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="color: #64748b;">Last Sync Attempt:</span>
                        <span id="fo-offline-last-sync" style="font-weight: 600; color: #334155;">
                            🕒 ${lastSyncDisplay}
                        </span>
                    </div>
                </div>
            </div>
        `;
    },

    // Render the offline reports queue section
    async renderQueue() {
        const container = document.getElementById("fo-offline-queue-container");
        if (!container) return;

        const reports = await this.getAllReports();

        if (!reports || reports.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 18px; font-size: 12px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px;">
                    <span>💾</span> No locally buffered offline reports. Submissions made while disconnected will queue here as <strong>SYNC PENDING</strong>.
                </div>
            `;
            return;
        }

        container.innerHTML = reports.map(r => {
            const isPending = (r.sync_status === "SYNC PENDING");
            const isSyncing = (r.sync_status === "SYNCING");
            const isSynced = (r.sync_status === "SYNCED");

            const statusBadge = isPending
                ? `<span style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">🟡 SYNC PENDING</span>`
                : (isSyncing
                    ? `<span style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">⏳ SYNCING...</span>`
                    : `<span style="background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">🟢 SYNCED (${r.server_report_code || 'Recorded'})</span>`);

            const thumb = r.image_data
                ? `<img src="${r.image_data}" alt="Thumb" style="width: 44px; height: 44px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1;">`
                : `<span style="display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; background: #f1f5f9; border-radius: 4px; font-size: 20px;">📷</span>`;

            const dateStr = new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " · " + new Date(r.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });

            const errorNote = r.error ? `<div style="color: #dc2626; font-size: 11px; margin-top: 4px;">⚠️ Sync note: ${r.error} (preserved locally as SYNC PENDING)</div>` : '';

            return `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; background: ${isPending ? '#fffbeb' : '#ffffff'}; border: 1px solid ${isPending ? '#fde68a' : '#e2e8f0'}; border-radius: 6px; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${thumb}
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <strong style="font-size: 13px; color: #0f172a;">${(r.incident_type || 'Incident').replace(/_/g, ' ')}</strong>
                                <span style="font-size: 10.5px; color: #64748b;">${r.client_report_id}</span>
                            </div>
                            <small style="display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                                ${r.location_name || r.state} (${r.state}) · ${dateStr}
                            </small>
                            ${r.description ? `<p style="font-size: 11px; color: #475569; margin: 4px 0 0 0; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.description}</p>` : ''}
                            ${errorNote}
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                        ${statusBadge}
                        <div style="display: flex; gap: 6px;">
                            ${isPending && this.isOnline() ? `
                                <button type="button" class="action-btn-sm" style="font-size: 10.5px; padding: 2px 8px; background: #0284c7; color: #fff;" onclick="NextraOffline.syncPendingReports()">
                                    Upload Now ↑
                                </button>
                            ` : ''}
                            ${isSynced ? `
                                <button type="button" class="action-btn-sm" style="font-size: 10.5px; padding: 2px 6px;" onclick="NextraOffline.deleteReport('${r.client_report_id}').then(() => { NextraOffline.renderBanner(); NextraOffline.renderQueue(); })" title="Remove from local buffer">
                                    Dismiss ✕
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }
};

// Initialize NextraOffline when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => NextraOffline.init());
} else {
    NextraOffline.init();
}

window.NextraOffline = NextraOffline;
