"""
NEXTRA - Verification Router
Verification queue, review decisions, area-scoped access.
"""
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user, require_role
from app.models.verification import Verification
from app.models.field_report import FieldReport
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.schemas import VerificationOut, VerificationDecision, FieldReportOut
from app.services.notification_service import notify_user
from typing import List, Optional
import os

router = APIRouter(prefix="/api/verification", tags=["Verification"])


def verification_to_out(v: Verification, db: Session) -> VerificationOut:
    out = VerificationOut.model_validate(v)
    # Attach report details
    report = db.query(FieldReport).filter(FieldReport.id == v.report_id).first()
    if report:
        rout = FieldReportOut.model_validate(report)
        if report.image_path:
            if report.image_path.startswith("http") or report.image_path.startswith("assets/"):
                rout.image_url = report.image_path
            else:
                rout.image_url = f"/uploads/{os.path.basename(report.image_path)}"
        if report.ai_analysis_json:
            try:
                rout.ai_analysis = json.loads(report.ai_analysis_json)
            except (json.JSONDecodeError, TypeError):
                pass
        out.report = rout
    # Parse AI analysis
    if v.ai_analysis_json:
        try:
            out.ai_analysis = json.loads(v.ai_analysis_json)
        except (json.JSONDecodeError, TypeError):
            pass
    return out


@router.get("", response_model=List[VerificationOut])
def get_verifications(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "field_officer")),
):
    """Get verification records. Admin sees all; FO sees their area."""
    query = db.query(Verification)
    if status:
        query = query.filter(Verification.status == status)

    verifications = query.order_by(Verification.id.desc()).all()

    # Area-scope for field officers
    results = []
    for v in verifications:
        report = db.query(FieldReport).filter(FieldReport.id == v.report_id).first()
        if current_user.role == "field_officer" and current_user.assigned_state != "ALL":
            if report and report.state != current_user.assigned_state:
                continue
        results.append(verification_to_out(v, db))

    return results


@router.get("/pending", response_model=List[VerificationOut])
def get_pending_verifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "field_officer")),
):
    """Get all pending verification records."""
    return get_verifications(status="PENDING", db=db, current_user=current_user)


@router.post("/{verification_id}/decide", response_model=VerificationOut)
def decide_verification(
    verification_id: int,
    decision: VerificationDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "field_officer")),
):
    """Submit a verification decision (VERIFIED or REJECTED)."""
    if decision.status not in ["VERIFIED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Decision status must be 'VERIFIED' or 'REJECTED'.")

    if decision.status == "REJECTED" and not (decision.remarks and decision.remarks.strip()):
        raise HTTPException(status_code=400, detail="Rejection reason/remarks are strictly required when rejecting evidence.")

    v = db.query(Verification).filter(Verification.id == verification_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Verification record not found.")
    if v.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Already reviewed: {v.status}")

    report = db.query(FieldReport).filter(FieldReport.id == v.report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Associated field report not found.")

    # Strict Area-Scope enforcement for Field Officers
    if current_user.role == "field_officer" and current_user.assigned_state and current_user.assigned_state != "ALL":
        if report.state.strip().lower() != current_user.assigned_state.strip().lower():
            raise HTTPException(
                status_code=403,
                detail=f"Field Officers can only verify reports within their assigned state ({current_user.assigned_state}). Report is located in {report.state}."
            )

    v.status = decision.status
    v.remarks = decision.remarks.strip() if decision.remarks else None
    v.reviewer_id = current_user.id
    v.reviewer_name = current_user.name
    v.reviewer_role = current_user.role
    v.reviewed_at = datetime.now(timezone.utc)

    # Update the linked field report status
    report.status = decision.status

    # Notify the reporter
    status_label = "verified" if decision.status == "VERIFIED" else "rejected"
    remarks_suffix = f" Remarks: '{v.remarks}'." if v.remarks else ""
    notify_user(
        db,
        report.reporter_id,
        f"Report {report.report_code} {status_label}",
        f"Your report '{report.incident_type}' at {report.location_name or report.state} has been {status_label} by {current_user.name} ({current_user.role.replace('_', ' ').title()}).{remarks_suffix}",
        "VERIFICATION",
        "report",
        report.id
    )

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        user_name=current_user.name,
        user_role=current_user.role,
        action=f"EVIDENCE_{decision.status}",
        affected_record=f"VER-{verification_id} (Report: {report.report_code})",
        old_value="PENDING",
        new_value=f"{decision.status}: {v.remarks or 'Confirmed'}"
    ))

    # Update area accessibility and trigger risk engine recalculation so ground truth updates maps & corridors
    try:
        from app.services.risk_engine import update_area_accessibility, recalculate_all_risks
        update_area_accessibility(db, report.state)
        if decision.status == "VERIFIED":
            recalculate_all_risks(db)
    except Exception as e:
        print(f"[Verification] Accessibility/Risk update note: {e}")

    db.commit()
    db.refresh(v)
    return verification_to_out(v, db)
