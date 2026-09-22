"""
NEXTRA - Reports Router
Field report submission with file upload, AI analysis placeholder.
"""
import os
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user
from app.core.config import settings
from app.models.field_report import FieldReport
from app.models.verification import Verification
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.schemas import FieldReportOut
from app.services.notification_service import notify_admins, notify_area_officers
from app.services.risk_engine import calculate_area_risk
from typing import List, Optional

router = APIRouter(prefix="/api/reports", tags=["Field Reports"])


def report_to_out(r: FieldReport) -> FieldReportOut:
    out = FieldReportOut.model_validate(r)
    # Build image URL
    if r.image_path:
        if r.image_path.startswith("http") or r.image_path.startswith("assets/"):
            out.image_url = r.image_path
        else:
            out.image_url = f"/uploads/{os.path.basename(r.image_path)}"
    # Parse AI analysis JSON
    if r.ai_analysis_json:
        try:
            out.ai_analysis = json.loads(r.ai_analysis_json)
        except (json.JSONDecodeError, TypeError):
            out.ai_analysis = None
    return out


@router.get("", response_model=List[FieldReportOut])
def get_reports(
    state: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get field reports, optionally filtered. Field officers see only their area."""
    query = db.query(FieldReport)
    if current_user.role == "field_officer" and current_user.assigned_state and current_user.assigned_state != "ALL":
        query = query.filter(FieldReport.state.ilike(current_user.assigned_state.strip()))
    if state:
        query = query.filter(FieldReport.state == state)
    if status:
        query = query.filter(FieldReport.status == status)
    reports = query.order_by(FieldReport.id.desc()).all()
    return [report_to_out(r) for r in reports]


@router.post("", response_model=FieldReportOut)
async def create_report(
    incident_type: str = Form(...),
    description: str = Form(""),
    state: str = Form(...),
    district: str = Form(""),
    location_name: str = Form(""),
    severity: str = Form("MEDIUM"),
    latitude: float = Form(0.0),
    longitude: float = Form(0.0),
    client_report_id: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a new field report with optional image upload and client deduplication."""
    # Deduplication check for offline sync replay
    if client_report_id and client_report_id.strip():
        clean_cid = client_report_id.strip()
        existing = db.query(FieldReport).filter(FieldReport.client_report_id == clean_cid).first()
        if existing:
            return report_to_out(existing)

    # Generate report code
    count = db.query(FieldReport).count()
    report_code = f"RPT-{count + 1:03d}"

    # Handle file upload
    image_path = None
    if image and image.filename:
        ext = os.path.splitext(image.filename)[1] or ".jpg"
        filename = f"{report_code}_{uuid.uuid4().hex[:8]}{ext}"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        with open(filepath, "wb") as f:
            content = await image.read()
            f.write(content)
        image_path = filepath

    # Simulate AI analysis
    ai_analysis = {
        "detected_event": f"{incident_type.replace('_', ' ').title()} Detected",
        "confidence": f"{85 + (hash(report_code) % 15):.1f}%",
        "tags": [incident_type.replace("_", " ").title(), severity, state],
        "hazard_severity": severity,
        "recommendation": f"Review and verify {incident_type.lower()} report at {location_name or state}"
    }

    # Link region and default coordinates if missing
    from app.services.risk_engine import STATE_CENTROIDS
    from app.models.region import Region

    region = db.query(Region).filter(Region.state.ilike(state.strip())).first()
    region_id = region.id if region else None

    final_lat = latitude if latitude and latitude != 0.0 else None
    final_lng = longitude if longitude and longitude != 0.0 else None

    if (final_lat is None or final_lng is None) and state in STATE_CENTROIDS:
        final_lat = STATE_CENTROIDS[state]["lat"]
        final_lng = STATE_CENTROIDS[state]["lng"]

    report = FieldReport(
        report_code=report_code,
        client_report_id=client_report_id.strip() if client_report_id else None,
        reporter_id=current_user.id,
        region_id=region_id,
        reporter_name=current_user.name,
        reporter_role=current_user.role,
        incident_type=incident_type.strip(),
        description=description.strip(),
        latitude=final_lat,
        longitude=final_lng,
        state=state.strip(),
        district=district.strip() if district else "",
        location_name=location_name.strip() if location_name else (f"{state.strip()} Highway Sector"),
        image_path=image_path,
        severity=severity.upper().strip(),
        status="PENDING",
        ai_analysis_json=json.dumps(ai_analysis)
    )
    db.add(report)
    db.flush()

    # Create verification record
    verification = Verification(
        report_id=report.id,
        status="PENDING",
        ai_analysis_json=json.dumps(ai_analysis)
    )
    db.add(verification)

    # Canonical incident type normalization
    raw_type = incident_type.strip().upper().replace(" ", "_")
    canonical_type = "OTHER"
    for k in ["LANDSLIDE", "FLOOD", "ROAD_BLOCKAGE", "ROAD_DAMAGE", "BRIDGE_DAMAGE", "ACCIDENT", "HEAVY_TRAFFIC", "UNSAFE_ROAD", "WEATHER", "OTHER"]:
        if k in raw_type or raw_type in k:
            canonical_type = k
            break
    if raw_type in ["LANDSLIDE", "FLOOD", "ROAD_BLOCKAGE", "ROAD_DAMAGE", "BRIDGE_DAMAGE", "ACCIDENT", "HEAVY_TRAFFIC", "UNSAFE_ROAD", "WEATHER", "OTHER"]:
        canonical_type = raw_type

    # Notifications
    notify_admins(db, f"New {canonical_type} Report: {report_code}",
                  f"{current_user.name} ({current_user.role.replace('_', ' ').title()}) reported {canonical_type} at {location_name or state}. Severity: {severity}.",
                  "REPORT", "report", report.id)

    notify_area_officers(db, state, f"New Incident Report in {state}: {report_code}",
                         f"{canonical_type} reported at {location_name or state}. Field verification required.",
                         "REPORT", "report", report.id)


    # Audit log
    db.add(AuditLog(
        user_id=current_user.id, user_name=current_user.name, user_role=current_user.role,
        action="REPORT_SUBMITTED", affected_record=f"{report_code} ({incident_type})",
        new_value=f"PENDING - {severity}"
    ))

    # Update area accessibility when disruption report is submitted
    from app.services.risk_engine import update_area_accessibility
    update_area_accessibility(db, state)

    db.commit()
    db.refresh(report)
    return report_to_out(report)
