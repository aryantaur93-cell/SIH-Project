"""
NEXTRA — Phase 12: Admin Field Officer Management Test Suite

Verifies:
1. Admin creates a Field Officer with:
   - Full Name, Email, Phone, Password, Officer ID, State, District/Area, Status.
2. Backend validates, hashes password, creates User, creates FieldOfficerProfile,
   creates AuditLog, and creates welcome Notification.
3. Newly created Field Officer can log in immediately.
4. Field Officer cannot create another Field Officer (403 Forbidden).
5. Area scoping strictly applies to:
   - Field reports they can view (their assigned state only)
   - Verifications they can review (their assigned state only; 403 on other states)
   - Notifications and area intelligence
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.database import SessionLocal
from app.models.user import User
from app.models.field_officer import FieldOfficerProfile
from app.models.audit_log import AuditLog
from app.models.notification import Notification
from app.models.field_report import FieldReport
from app.models.verification import Verification

client = TestClient(app)

TEST_OFFICER = {
    "name": "Major Vikramjit Hazarika",
    "email": "vikramjit.fo@nextra.demo",
    "phone": "+91 94350-11223",
    "password": "OfficerPass@123",
    "officer_id": "FO-999",
    "assigned_state": "Nagaland",
    "assigned_district": "Kohima Highway Corridor",
    "status": "ACTIVE"
}

def get_admin_token():
    resp = client.post("/api/auth/login", json={"email": "admin@nextra.demo", "password": "Admin@123"})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json()["access_token"]


def test_phase12_admin_creates_field_officer_full_flow():
    """Admin creates Field Officer -> User, Profile, AuditLog, and Notification are created."""
    admin_token = get_admin_token()
    admin_hdr = {"Authorization": f"Bearer {admin_token}"}

    # Clean up test user if previously created
    db = SessionLocal()
    existing = db.query(User).filter(User.email == TEST_OFFICER["email"]).first()
    if existing:
        db.query(FieldOfficerProfile).filter(FieldOfficerProfile.user_id == existing.id).delete()
        db.query(Notification).filter(Notification.user_id == existing.id).delete()
        db.delete(existing)
        db.commit()
    db.close()

    # Step 1: Admin submits Add Field Officer
    create_resp = client.post("/api/users/field-officers", json=TEST_OFFICER, headers=admin_hdr)
    assert create_resp.status_code == 200, f"Create field officer failed: {create_resp.text}"
    officer_data = create_resp.json()

    assert officer_data["name"] == TEST_OFFICER["name"]
    assert officer_data["email"] == TEST_OFFICER["email"].lower()
    assert officer_data["role"] == "field_officer"
    assert officer_data["assigned_state"] == TEST_OFFICER["assigned_state"]
    assert officer_data["assigned_district"] == TEST_OFFICER["assigned_district"]
    assert officer_data["officer_id"] == TEST_OFFICER["officer_id"]
    assert officer_data["status"] == "ACTIVE"

    # Step 2: Verify Database Persistence
    db = SessionLocal()
    user_in_db = db.query(User).filter(User.email == TEST_OFFICER["email"]).first()
    assert user_in_db is not None
    assert user_in_db.role == "field_officer"

    profile_in_db = db.query(FieldOfficerProfile).filter(FieldOfficerProfile.user_id == user_in_db.id).first()
    assert profile_in_db is not None
    assert profile_in_db.assigned_state == TEST_OFFICER["assigned_state"]
    assert profile_in_db.officer_badge == TEST_OFFICER["officer_id"]

    audit_in_db = db.query(AuditLog).filter(
        AuditLog.action == "FIELD_OFFICER_CREATED",
        AuditLog.affected_record.contains(TEST_OFFICER["email"])
    ).first()
    assert audit_in_db is not None

    notif_in_db = db.query(Notification).filter(Notification.user_id == user_in_db.id).first()
    assert notif_in_db is not None
    assert "Welcome" in notif_in_db.title

    db.close()


def test_phase12_field_officer_cannot_create_another_officer():
    """Ensure non-admin (Field Officer) cannot create another Field Officer (403 Forbidden)."""
    # Login as existing or newly created field officer
    login_resp = client.post("/api/auth/login", json={
        "email": TEST_OFFICER["email"],
        "password": TEST_OFFICER["password"]
    })
    assert login_resp.status_code == 200, "New officer should be able to log in immediately"
    fo_token = login_resp.json()["access_token"]
    fo_hdr = {"Authorization": f"Bearer {fo_token}"}

    # Attempt to create another Field Officer
    attempt_resp = client.post("/api/users/field-officers", json={
        "name": "Unauthorized Officer",
        "email": "unauthorized.fo@nextra.demo",
        "password": "Password@123",
        "assigned_state": "Tripura"
    }, headers=fo_hdr)

    assert attempt_resp.status_code == 403, f"Expected 403 Forbidden, got {attempt_resp.status_code}"


def test_phase12_new_officer_immediate_login_and_dashboard_area():
    """Test newly created Field Officer logs in immediately and has correct assigned area."""
    login_resp = client.post("/api/auth/login", json={
        "email": TEST_OFFICER["email"],
        "password": TEST_OFFICER["password"]
    })
    assert login_resp.status_code == 200
    data = login_resp.json()
    assert "access_token" in data
    user = data["user"]
    assert user["role"] == "field_officer"
    assert user["assigned_state"] == "Nagaland"
    assert user["assigned_district"] == "Kohima Highway Corridor"

    # Check /api/auth/me returns the same role and area
    fo_token = data["access_token"]
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {fo_token}"})
    assert me_resp.status_code == 200
    me = me_resp.json()
    assert me["role"] == "field_officer"
    assert me["assigned_state"] == "Nagaland"


def test_phase12_area_scoped_reports_and_verifications():
    """
    Verify area assignment strictly limits:
    1. Reports visible to the Field Officer (only Nagaland)
    2. Verifications queue visible to the Field Officer (only Nagaland)
    3. Verification decisions (cannot verify reports from other states)
    """
    login_resp = client.post("/api/auth/login", json={
        "email": TEST_OFFICER["email"],
        "password": TEST_OFFICER["password"]
    })
    fo_token = login_resp.json()["access_token"]
    fo_hdr = {"Authorization": f"Bearer {fo_token}"}

    admin_token = get_admin_token()
    admin_hdr = {"Authorization": f"Bearer {admin_token}"}

    # Seed one Nagaland report and one Sikkim report via Admin/Driver
    resp_nagaland = client.post("/api/reports", data={
        "incident_type": "ROAD_BLOCKAGE",
        "severity": "HIGH",
        "state": "Nagaland",
        "district": "Kohima",
        "location_name": "NH-29 Zubza Valley",
        "description": "Nagaland sector test blockage"
    }, headers=admin_hdr)
    assert resp_nagaland.status_code == 200
    nagaland_report_id = resp_nagaland.json()["id"]

    resp_sikkim = client.post("/api/reports", data={
        "incident_type": "LANDSLIDE",
        "severity": "CRITICAL",
        "state": "Sikkim",
        "district": "North Sikkim",
        "location_name": "NH-10 Dikchu bypass",
        "description": "Sikkim sector test slide"
    }, headers=admin_hdr)
    assert resp_sikkim.status_code == 200
    sikkim_report_id = resp_sikkim.json()["id"]

    # 1. Field Officer queries /api/reports
    reports_resp = client.get("/api/reports", headers=fo_hdr)
    assert reports_resp.status_code == 200
    fo_reports = reports_resp.json()

    report_ids = [r["id"] for r in fo_reports]
    assert nagaland_report_id in report_ids, "Field Officer must see report in their assigned state (Nagaland)"
    assert sikkim_report_id not in report_ids, "Field Officer must NOT see report outside their assigned state (Sikkim)"

    # 2. Field Officer queries /api/verification/pending
    verif_resp = client.get("/api/verification/pending", headers=fo_hdr)
    assert verif_resp.status_code == 200
    pending_items = verif_resp.json()

    pending_report_ids = [p["report_id"] for p in pending_items]
    assert nagaland_report_id in pending_report_ids, "Field Officer must see pending verification in Nagaland"
    assert sikkim_report_id not in pending_report_ids, "Field Officer must NOT see pending verification in Sikkim"

    # Find the verification records
    db = SessionLocal()
    nagaland_verif = db.query(Verification).filter(Verification.report_id == nagaland_report_id).first()
    sikkim_verif = db.query(Verification).filter(Verification.report_id == sikkim_report_id).first()
    db.close()

    # 3. Field Officer can verify their own state's report
    decide_nagaland = client.post(f"/api/verification/{nagaland_verif.id}/decide", json={
        "status": "VERIFIED",
        "remarks": "Ground inspected and verified by Major Vikramjit Hazarika in Kohima sector."
    }, headers=fo_hdr)
    assert decide_nagaland.status_code == 200, f"Field Officer should be able to verify Nagaland: {decide_nagaland.text}"

    # 4. Field Officer tries to verify another state's report (Sikkim) -> MUST fail with 403 Forbidden
    decide_sikkim = client.post(f"/api/verification/{sikkim_verif.id}/decide", json={
        "status": "VERIFIED",
        "remarks": "Unauthorized cross-border attempt"
    }, headers=fo_hdr)
    assert decide_sikkim.status_code == 403, f"Field Officer must be forbidden from verifying outside their state, got {decide_sikkim.status_code}"
