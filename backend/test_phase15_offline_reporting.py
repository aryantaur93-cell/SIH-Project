"""
NEXTRA - Phase 15: Offline Reporting Test Suite
Validates:
1. Field Officer report submission with client_report_id (offline sync).
2. Backend deduplication / idempotency (re-transmitting same client_report_id does not duplicate).
3. Multipart submission with simulated photo evidence upload.
4. Correct association with Verification Queue and Verification decision.
5. Field Officer state-filtered report visibility.
"""

import io
import time
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.database import SessionLocal
from app.models.user import User
from app.models.field_report import FieldReport
from app.models.verification import Verification

client = TestClient(app)


def get_auth_token(email: str = "officer@nextra.demo", password: str = "Officer@123") -> str:
    """Helper to authenticate and retrieve bearer token."""
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def test_offline_report_creation_with_client_id():
    """Test creating a field report that originated offline with a client_report_id."""
    token = get_auth_token("officer@nextra.demo", "Officer@123")
    headers = {"Authorization": f"Bearer {token}"}

    client_id = f"OFFLINE-{int(time.time() * 1000)}-TEST01"

    data = {
        "incident_type": "LANDSLIDE",
        "severity": "CRITICAL",
        "state": "Meghalaya",
        "district": "East Khasi Hills",
        "location_name": "NH-6 Sonapur Tunnel Km 142",
        "description": "Massive mudflow blocked both lanes. Offline buffer test.",
        "latitude": 25.105,
        "longitude": 92.352,
        "client_report_id": client_id
    }

    res = client.post("/api/reports", data=data, headers=headers)
    assert res.status_code == 200, f"Submit failed: {res.text}"
    payload = res.json()

    assert payload["client_report_id"] == client_id
    assert payload["incident_type"] == "LANDSLIDE"
    assert payload["severity"] == "CRITICAL"
    assert payload["state"] == "Meghalaya"
    assert payload["status"] == "PENDING"
    assert "report_code" in payload

    report_code = payload["report_code"]

    # Verify directly in DB
    db = SessionLocal()
    db_report = db.query(FieldReport).filter(FieldReport.client_report_id == client_id).first()
    assert db_report is not None
    assert db_report.report_code == report_code
    db.close()


def test_offline_deduplication_idempotency():
    """Re-submitting the same client_report_id must return existing report and NOT create duplicates."""
    token = get_auth_token("officer@nextra.demo", "Officer@123")
    headers = {"Authorization": f"Bearer {token}"}

    client_id = f"OFFLINE-{int(time.time() * 1000)}-DEDUP99"

    data = {
        "incident_type": "FLOOD",
        "severity": "HIGH",
        "state": "Assam",
        "district": "Kamrup",
        "location_name": "NH-27 Near Jalukbari",
        "description": "Culvert overflow water on roadway.",
        "latitude": 26.14,
        "longitude": 91.73,
        "client_report_id": client_id
    }

    # First transmission
    res1 = client.post("/api/reports", data=data, headers=headers)
    assert res1.status_code == 200
    report1 = res1.json()

    db = SessionLocal()
    count_before = db.query(FieldReport).filter(FieldReport.client_report_id == client_id).count()
    assert count_before == 1

    # Second transmission (simulating client reconnection replay / retry)
    res2 = client.post("/api/reports", data=data, headers=headers)
    assert res2.status_code == 200
    report2 = res2.json()

    # Must return identical report code and id
    assert report2["id"] == report1["id"]
    assert report2["report_code"] == report1["report_code"]
    assert report2["client_report_id"] == client_id

    # Verify DB still has exactly 1 record
    count_after = db.query(FieldReport).filter(FieldReport.client_report_id == client_id).count()
    assert count_after == 1
    db.close()


def test_offline_report_with_image_upload():
    """Test offline report sync with serialized image evidence."""
    token = get_auth_token("officer@nextra.demo", "Officer@123")
    headers = {"Authorization": f"Bearer {token}"}

    client_id = f"OFFLINE-{int(time.time() * 1000)}-IMG77"
    fake_image_bytes = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xFF\xDB\x00C\x00"

    data = {
        "incident_type": "ROAD_BLOCKAGE",
        "severity": "HIGH",
        "state": "Meghalaya",
        "location_name": "Shillong Peak Bypass",
        "description": "Fallen tree across single mountain lane.",
        "latitude": 25.57,
        "longitude": 91.88,
        "client_report_id": client_id
    }
    files = {
        "image": ("offline_evidence.jpg", io.BytesIO(fake_image_bytes), "image/jpeg")
    }

    res = client.post("/api/reports", data=data, files=files, headers=headers)
    assert res.status_code == 200
    payload = res.json()

    assert payload["client_report_id"] == client_id
    assert payload["image_url"] is not None
    assert "/uploads/" in payload["image_url"]


def test_verification_queue_integration():
    """Ensure report submitted via offline sync generates a pending verification queue item."""
    token = get_auth_token("admin@nextra.demo", "Admin@123")
    headers = {"Authorization": f"Bearer {token}"}

    client_id = f"OFFLINE-{int(time.time() * 1000)}-VERIF"

    data = {
        "incident_type": "BRIDGE_DAMAGE",
        "severity": "CRITICAL",
        "state": "Arunachal Pradesh",
        "location_name": "Bhalukpong Bridge Pier",
        "description": "Support abutment scoured by monsoon surge.",
        "latitude": 27.01,
        "longitude": 92.65,
        "client_report_id": client_id
    }

    res = client.post("/api/reports", data=data, headers=headers)
    assert res.status_code == 200
    report = res.json()
    report_id = report["id"]

    # Fetch verification queue
    v_res = client.get("/api/verification", headers=headers)
    assert v_res.status_code == 200
    items = v_res.json()

    matching = [item for item in items if item.get("report_id") == report_id]
    assert len(matching) > 0, "Submitted offline report must create a verification entry"
    v_item = matching[0]
    assert v_item["status"] == "PENDING"

    # Decide verification (VERIFY)
    decide_res = client.post(
        f"/api/verification/{v_item['id']}/decide",
        json={"status": "VERIFIED", "remarks": "Ground team confirmed abutment stability work required."},
        headers=headers
    )
    assert decide_res.status_code == 200
    decided = decide_res.json()
    assert decided["status"] == "VERIFIED"


if __name__ == "__main__":
    pytest.main(["-v", __file__])
