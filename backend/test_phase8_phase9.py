"""
NEXTRA - Phase 8 (Field Report + Verification) and Phase 9 (Notifications + Alerts)
Automated Test Suite using FastAPI TestClient
"""
import os
import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.dependencies import get_db
from app.models.user import User

from app.models.field_report import FieldReport
from app.models.verification import Verification
from app.models.notification import Notification
from app.models.shipment import Shipment
from app.models.driver import Driver

client = TestClient(app)

def login(email, password):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["access_token"]

def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}

def test_phase8_phase9_complete_workflow():
    print("\n========================================================")
    print("STARTING NEXTRA PHASE 8 & 9 AUTOMATED TEST SUITE")
    print("========================================================")

    # 1. Login all test roles
    driver_token = login("driver@nextra.demo", "Driver@123")
    admin_token = login("admin@nextra.demo", "Admin@123")
    assam_fo_token = login("officer@nextra.demo", "Officer@123")       # Assam FO
    meghalaya_fo_token = login("priya.fo@nextra.demo", "Officer@123")  # Meghalaya FO
    logistics_token = login("logistics@nextra.demo", "Logistics@123")

    print("[PASS] Successfully authenticated Driver, Admin, Assam FO, Meghalaya FO, Logistics.")

    # 2. Driver submits a report with a real image file upload
    dummy_image = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00")
    dummy_image.name = "landslide_hazard.jpg"

    form_data = {
        "incident_type": "LANDSLIDE",
        "description": "Large boulders obstructing east lane near Sonapur cliff",
        "state": "Assam",
        "district": "Kamrup",
        "location_name": "NH-27 Km 42 near Sonapur",
        "severity": "CRITICAL",
        "latitude": 26.115,
        "longitude": 91.975
    }

    files = {
        "image": ("landslide_hazard.jpg", dummy_image, "image/jpeg")
    }

    report_resp = client.post(
        "/api/reports",
        data=form_data,
        files=files,
        headers=auth_headers(driver_token)
    )

    assert report_resp.status_code == 200, f"Report creation failed: {report_resp.text}"
    report_data = report_resp.json()
    report_id = report_data["id"]
    report_code = report_data["report_code"]
    image_url = report_data.get("image_url")

    assert report_data["status"] == "PENDING"
    assert report_data["incident_type"] == "LANDSLIDE"
    assert image_url is not None and "/uploads/" in image_url
    print(f"[PASS] Driver submitted report {report_code} (ID: {report_id}) with real image upload: {image_url}")

    # Check file physically saved on disk
    filename = os.path.basename(image_url)
    saved_filepath = os.path.join(settings.UPLOAD_DIR, filename)
    assert os.path.exists(saved_filepath), f"Uploaded file not found on disk at {saved_filepath}"
    print(f"[PASS] Image verified on disk: {saved_filepath} (Size: {os.path.getsize(saved_filepath)} bytes)")

    # 3. Check notifications created: Admin and Assam FO notified, Meghalaya FO NOT notified
    admin_notifs = client.get("/api/notifications", headers=auth_headers(admin_token)).json()
    assert any(n["type"] == "REPORT" and report_code in n["title"] for n in admin_notifs)
    print(f"[PASS] Admin received automatic REPORT notification for {report_code}")

    assam_notifs = client.get("/api/notifications", headers=auth_headers(assam_fo_token)).json()
    assert any(n["type"] == "REPORT" and report_code in n["title"] for n in assam_notifs)
    print(f"[PASS] Assam Field Officer received automatic REPORT notification for {report_code}")

    meghalaya_notifs = client.get("/api/notifications", headers=auth_headers(meghalaya_fo_token)).json()
    assert not any(report_code in n["title"] for n in meghalaya_notifs)
    print(f"[PASS] Meghalaya Field Officer was NOT spammed with Assam incident (unrelated user guard passed).")

    # 4. Check verification record created in PENDING status
    ver_resp = client.get("/api/verification?status=PENDING", headers=auth_headers(admin_token))
    assert ver_resp.status_code == 200
    ver_list = ver_resp.json()
    matching_ver = next((v for v in ver_list if v["report_id"] == report_id), None)
    assert matching_ver is not None, "Verification record not found in queue"
    ver_id = matching_ver["id"]
    print(f"[PASS] Verification record {ver_id} created in PENDING status with AI analysis.")

    # 5. RBAC Checks:
    # A. Driver must NOT be able to verify
    driver_decide = client.post(
        f"/api/verification/{ver_id}/decide",
        json={"status": "VERIFIED", "remarks": "Driver self-approving"},
        headers=auth_headers(driver_token)
    )
    assert driver_decide.status_code == 403, f"Driver should have received 403, got {driver_decide.status_code}"
    print("[PASS] RBAC Enforced: Driver CANNOT verify reports (403 Forbidden).")

    # B. Logistics must NOT be able to verify
    logistics_decide = client.post(
        f"/api/verification/{ver_id}/decide",
        json={"status": "VERIFIED", "remarks": "Logistics approving"},
        headers=auth_headers(logistics_token)
    )
    assert logistics_decide.status_code == 403, f"Logistics should have received 403, got {logistics_decide.status_code}"
    print("[PASS] RBAC Enforced: Logistics CANNOT verify reports (403 Forbidden).")

    # C. Field Officer outside assigned area must NOT be able to verify
    meghalaya_decide = client.post(
        f"/api/verification/{ver_id}/decide",
        json={"status": "VERIFIED", "remarks": "Meghalaya FO approving Assam report"},
        headers=auth_headers(meghalaya_fo_token)
    )
    assert meghalaya_decide.status_code == 403, f"Meghalaya FO should have received 403, got {meghalaya_decide.status_code}"
    print("[PASS] RBAC Enforced: Field Officer outside assigned area CANNOT verify (403 Forbidden).")

    # D. Rejection strictly requires a reason
    reject_empty = client.post(
        f"/api/verification/{ver_id}/decide",
        json={"status": "REJECTED", "remarks": ""},
        headers=auth_headers(assam_fo_token)
    )
    assert reject_empty.status_code == 400, f"Empty rejection reason should fail with 400, got {reject_empty.status_code}"
    print("[PASS] Rejection requires non-empty remarks (400 Bad Request enforced).")

    # E. Assigned Field Officer verifies the report
    verify_resp = client.post(
        f"/api/verification/{ver_id}/decide",
        json={"status": "VERIFIED", "remarks": "Field inspected with Kamrup emergency team. Single lane cleared."},
        headers=auth_headers(assam_fo_token)
    )
    assert verify_resp.status_code == 200, f"Assigned FO verification failed: {verify_resp.text}"
    ver_result = verify_resp.json()
    assert ver_result["status"] == "VERIFIED"
    assert ver_result["reviewer_name"] == "Arjun Mehta"
    print(f"[PASS] Assam Field Officer successfully verified report {report_code}.")

    # 6. Check Driver (uploader) received notification
    driver_notifs = client.get("/api/notifications", headers=auth_headers(driver_token)).json()
    verified_notif = next((n for n in driver_notifs if n["type"] == "VERIFICATION" and report_code in n["title"]), None)
    assert verified_notif is not None, "Driver did not receive VERIFICATION notification"
    print(f"[PASS] Driver received automatic VERIFICATION notification: '{verified_notif['title']}'")

    # 7. Test Notification Read Management APIs
    unread_resp = client.get("/api/notifications/count", headers=auth_headers(driver_token))
    assert unread_resp.status_code == 200
    initial_unread = unread_resp.json()["unread_count"]
    assert initial_unread > 0

    # Mark single notification as read
    mark_single = client.patch(f"/api/notifications/{verified_notif['id']}/read", headers=auth_headers(driver_token))
    assert mark_single.status_code == 200
    print(f"[PASS] Marked notification {verified_notif['id']} as read.")

    # Mark all as read
    mark_all = client.post("/api/notifications/read-all", headers=auth_headers(driver_token))
    assert mark_all.status_code == 200
    unread_after = client.get("/api/notifications/count", headers=auth_headers(driver_token)).json()["unread_count"]
    assert unread_after == 0, f"Expected 0 unread notifications, got {unread_after}"
    print("[PASS] Mark all notifications as read succeeded (unread count = 0).")

    # 8. Test Shipment Delay Notification Trigger
    # Get a shipment and set status to DELAYED
    shipments = client.get("/api/shipments", headers=auth_headers(admin_token)).json()
    assert len(shipments) > 0
    target_shipment = shipments[0]
    shp_id = target_shipment["id"]

    delay_resp = client.patch(
        f"/api/shipments/{shp_id}/status",
        json={"status": "DELAYED", "eta": "18:30 IST", "risk_reason": "Flash flood detour on NH-6"},
        headers=auth_headers(admin_token)
    )
    assert delay_resp.status_code == 200

    # Check Logistics received shipment delay notification
    logistics_notifs = client.get("/api/notifications", headers=auth_headers(logistics_token)).json()
    assert any(n["type"] == "SHIPMENT" and target_shipment["shipment_code"] in n["title"] for n in logistics_notifs)
    print(f"[PASS] Logistics received automatic SHIPMENT delay notification for {target_shipment['shipment_code']}")

    # 9. Test Alerts and Regional Notification Dispatch
    alert_payload = {
        "title": "Severe Hailstorm & Mudslide Warning",
        "description": "NH-6 Jowai bypass blocked by heavy slush. Clearance team dispatched.",
        "severity": "CRITICAL",
        "state": "Meghalaya",
        "district": "East Khasi Hills",
        "latitude": 25.57,
        "longitude": 91.89,
        "alert_type": "RISK"
    }
    create_alert_resp = client.post("/api/alerts", json=alert_payload, headers=auth_headers(admin_token))
    assert create_alert_resp.status_code == 200
    alert_obj = create_alert_resp.json()
    assert alert_obj["severity"] == "CRITICAL"
    print(f"[PASS] Broadcast Alert created: ALT-{alert_obj['id']} '{alert_obj['title']}'")

    # Check Meghalaya FO received RISK notification
    megh_notifs_after = client.get("/api/notifications", headers=auth_headers(meghalaya_fo_token)).json()
    assert any(n["type"] == "RISK" and "Severe Hailstorm" in n["title"] for n in megh_notifs_after)
    print("[PASS] Meghalaya Field Officer received targeted RISK notification for regional critical alert.")

    # 10. Map Overview includes reports and alerts
    map_resp = client.get("/api/map/overview", headers=auth_headers(admin_token))
    assert map_resp.status_code == 200
    map_data = map_resp.json()
    assert any(r["id"] == report_id for r in map_data["reports"]), "Created report missing from map overview"
    assert any(a["id"] == alert_obj["id"] for a in map_data["alerts"]), "Created alert missing from map overview"
    print(f"[PASS] Live Map Overview confirms presence of report {report_code} and alert ALT-{alert_obj['id']}.")

    print("========================================================")
    print("ALL PHASE 8 & 9 BACKEND TESTS COMPLETED AND 100% PASSED!")
    print("========================================================")

if __name__ == "__main__":
    test_phase8_phase9_complete_workflow()
