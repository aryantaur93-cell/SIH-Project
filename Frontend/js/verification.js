/**
 * NEXTRA - Image & Photo Verification System with Assistive AI Analysis
 * Role-scoped verification queue, human-in-the-loop review, and ground truth validation.
 */

function renderVerificationQueue() {
    const container = document.getElementById("verification-queue-container");
    if (!container) return;

    const user = getActiveUser();
    if (!user) return;

    const records = NextraApi.getVerificationRecords();
    const canReview = (user.role === 'admin' || user.role === 'field_officer');

    if (records.length === 0) {
        container.innerHTML = `
            <div class="empty-state-card">
                <span style="font-size: 36px;">🛡️</span>
                <h3>No Evidence Awaiting Verification</h3>
                <p>All road and incident submissions for your jurisdiction have been processed.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="verification-cards-list">
            ${records.map(rec => `
                <div class="verification-card ${rec.status.toLowerCase()}">
                    <div class="ver-img-col">
                        <img src="${rec.image_url}" alt="${rec.report_type}" class="ver-thumb" onclick="openImageModal('${rec.image_url}', '${rec.report_type}')">
                        <div class="ver-img-stamp">
                            <span>📷 ${rec.report_type}</span>
                            <small>${rec.state}</small>
                        </div>
                    </div>

                    <div class="ver-body-col">
                        <div class="ver-header">
                            <div>
                                <h3 class="ver-title">${rec.report_type}</h3>
                                <div class="ver-meta">
                                    <span>📍 ${rec.location} (${rec.state})</span>
                                    <span>•</span>
                                    <span>Uploaded by <strong>${rec.uploaded_by}</strong> (${rec.user_role.toUpperCase()})</span>
                                    <span>•</span>
                                    <span>${new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} IST</span>
                                </div>
                            </div>
                            <span class="status-badge ${rec.status === 'VERIFIED' ? 'status-green' : rec.status === 'REJECTED' ? 'status-red' : 'status-amber'}">
                                ${rec.status === 'VERIFIED' ? '✓ VERIFIED' : rec.status === 'REJECTED' ? '✕ REJECTED' : '⏳ PENDING REVIEW'}
                            </span>
                        </div>

                        <p class="ver-desc">${rec.description}</p>

                        <!-- ASSISTIVE AI IMAGE ANALYSIS BOX -->
                        <div class="ver-ai-box">
                            <div class="ai-box-header">
                                <span class="ai-pill">🤖 Assistive AI Vision</span>
                                <strong class="ai-event">${rec.ai_analysis.detected_event}</strong>
                                <span class="ai-confidence">${rec.ai_analysis.confidence} Confidence</span>
                            </div>
                            <div class="ai-tags">
                                ${rec.ai_analysis.tags.map(t => `<span class="ai-tag">🏷️ ${t}</span>`).join('')}
                                <span class="ai-tag tag-severity">Severity: ${rec.ai_analysis.hazard_severity}</span>
                            </div>
                            <p class="ai-rec"><strong>Recommendation:</strong> ${rec.ai_analysis.recommendation}</p>
                        </div>

                        <!-- HUMAN REVIEW RECORD OR REVIEW FORM -->
                        ${rec.status === 'PENDING' && canReview ? `
                            <div class="ver-review-actions">
                                <textarea id="remarks-${rec.id}" class="form-input review-textarea" placeholder="Add official inspection remarks (e.g., 'Ground verified with BRO team at Sonapur')..."></textarea>
                                <div class="review-btn-row">
                                    <button type="button" class="btn-verify" onclick="submitEvidenceDecision('${rec.id}', 'VERIFIED')">
                                        ✓ Verify &amp; Confirm Ground Truth
                                    </button>
                                    <button type="button" class="btn-reject" onclick="submitEvidenceDecision('${rec.id}', 'REJECTED')">
                                        ✕ Reject Submission
                                    </button>
                                </div>
                            </div>
                        ` : rec.status !== 'PENDING' ? `
                            <div class="ver-reviewed-info">
                                <strong>Decision Logged:</strong> ${rec.status} by <em>${rec.reviewed_by}</em> (${rec.reviewer_role?.toUpperCase()}) on ${new Date(rec.reviewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} IST
                                <div class="reviewer-remarks">“${rec.reviewer_remarks}”</div>
                            </div>
                        ` : `
                            <div class="ver-reviewed-info">
                                <small style="color: var(--text-muted);">Awaiting human review by ${rec.state} Field Officer or Administrator.</small>
                            </div>
                        `}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Submits Human Reviewer Decision
function submitEvidenceDecision(recordId, decision) {
    const textarea = document.getElementById(`remarks-${recordId}`);
    const remarks = textarea ? textarea.value.trim() : "";

    try {
        const record = NextraApi.verifyEvidence(recordId, decision, remarks);
        if (typeof showToast === 'function') {
            showToast(`Evidence ${recordId} marked as ${decision}. Audit trail recorded.`);
        }
        renderVerificationQueue();

        // If verified, update map notification
        if (decision === 'VERIFIED' && typeof showToast === 'function') {
            showToast(`Regional GIS updated: ${record.report_type} at ${record.location} confirmed.`);
        }
    } catch (err) {
        alert(err.message);
    }
}

// Lightbox preview for evidence images
function openImageModal(imgUrl, caption) {
    const modal = document.getElementById("modal-image-preview");
    const modalImg = document.getElementById("modal-preview-img");
    const modalCaption = document.getElementById("modal-preview-caption");

    if (modal && modalImg) {
        modalImg.src = imgUrl;
        if (modalCaption) modalCaption.textContent = caption;
        modal.classList.add("active");
    }
}
