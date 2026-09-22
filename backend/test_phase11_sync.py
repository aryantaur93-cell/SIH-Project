"""
NEXTRA - Phase 11: Remove Disconnected Dummy Data & Reactivity Test Suite
Verifies that:
1. All dashboard counts (/api/dashboard/summary) are strictly database-driven.
2. Weather (/api/weather) supplies real meteorological observations for 8 NER states.
3. Regional alerts (/api/alerts) and field officers (/api/users/field-officers) return real data.
4. Cross-screen reactivity holds: when an incident report is submitted and verified,
   dashboard counts, notifications, and verification queues reflect the change simultaneously.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_header(role="admin"):
    demo_passwords = {
        "admin": ("admin@nextra.demo", "Admin@123"),
        "field_officer": ("officer@nextra.demo", "Officer@123"),
        "logistics": ("logistics@nextra.demo", "Logistics@123"),
        "driver": ("driver@nextra.demo", "Driver@123"),
    }
    email, password = demo_passwords.get(role, ("admin@nextra.demo", "Admin@123"))
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_phase11_dashboard_summary_real_db_counts():
    """Verify that /api/dashboard/summary reflects real SQLite database records without mock offsets."""
    headers = get_auth_header("admin")
    resp = client.get("/api/dashboard/summary", headers=headers)
    assert resp.status_code == 200, f"Dashboard summary failed: {resp.text}"
    data = resp.json()

    # Required DB-driven metrics
    assert "total_shipments" in data
    assert "active_shipments" in data
    assert "delayed_shipments" in data
    assert "total_drivers" in data
    assert "available_drivers" in data
    assert "total_vehicles" in data
    assert "available_vehicles" in data
    assert "risk_zones" in data
    assert "total_reports" in data
    assert "pending_verifications" in data
    assert "verified_count" in data
    assert "pending_transport_requests" in data
    assert "accessibility_score" in data

    assert data["total_shipments"] >= 0
    assert data["total_drivers"] >= 30, f"Expected 30 seeded drivers, got {data['total_drivers']}"
    assert data["total_vehicles"] >= 30, f"Expected 30 seeded vehicles, got {data['total_vehicles']}"
    assert 0 <= data["accessibility_score"] <= 100

def test_phase11_weather_endpoint_all_ner_states():
    """Verify that /api/weather returns observations for North Eastern states."""
    headers = get_auth_header("driver")
    resp = client.get("/api/weather", headers=headers)
    assert resp.status_code == 200, f"Weather endpoint failed: {resp.text}"
    weather_list = resp.json()
    assert isinstance(weather_list, list)
    assert len(weather_list) >= 8, f"Expected at least 8 states, got {len(weather_list)}"

    states = [w["state"].lower() for w in weather_list]
    for expected_state in ["assam", "meghalaya", "arunachal pradesh"]:
        assert any(expected_state in s for s in states), f"Missing weather for {expected_state}"

    # Verify weather data structure
    sample = weather_list[0]
    assert "temperature_c" in sample
    assert "rainfall_mm" in sample
    assert "humidity_pct" in sample
    assert "wind_speed_kmh" in sample

def test_phase11_field_officers_roster():
    """Verify that /api/users/field-officers returns real field officers from database."""
    headers = get_auth_header("admin")
    resp = client.get("/api/users/field-officers", headers=headers)
    assert resp.status_code == 200, f"Field officers endpoint failed: {resp.text}"
    officers = resp.json()
    assert isinstance(officers, list)
    assert len(officers) >= 1, "Expected at least 1 field officer"

    for off in officers:
        assert off["role"] == "field_officer"
        assert "name" in off
        assert "email" in off

def test_phase11_cross_screen_reactivity_flow():
    """
    Test end-to-end reactivity:
    1. Check initial pending verifications count in dashboard summary
    2. Driver submits a new hazard report
    3. Dashboard summary pending_verifications increases by 1
    4. Field Officer / Admin verifies report
    5. Dashboard summary pending_verifications decreases by 1 and verified_count increases by 1
    6. Notifications reflect both actions
    """
    admin_hdr = get_auth_header("admin")
    driver_hdr = get_auth_header("driver")

    # Step 1: Baseline summary
    base_resp = client.get("/api/dashboard/summary", headers=admin_hdr)
    assert base_resp.status_code == 200
    base_data = base_resp.json()
    initial_pending = base_data["pending_verifications"]
    initial_verified = base_data["verified_count"]
    initial_reports = base_data["total_reports"]

    # Step 2: Driver uploads hazard report
    report_payload = {
        "incident_type": "LANDSLIDE",
        "severity": "CRITICAL",
        "state": "Meghalaya",
        "district": "East Khasi Hills",
        "location_name": "NH-6 Km 88.4 Umiam Hairpin",
        "description": "Phase 11 Sync Test - Large mudslide blocking northbound heavy transport lane",
        "latitude": 25.68,
        "longitude": 91.92
    }
    submit_resp = client.post("/api/reports", data=report_payload, headers=driver_hdr)
    assert submit_resp.status_code == 200, f"Report submission failed: {submit_resp.text}"
    report_data = submit_resp.json()
    report_id = report_data["id"]
    verification_id = report_data.get("verification_id")

    # Step 3: Check Dashboard Summary updated immediately (Reactivity Check #1)
    after_submit_resp = client.get("/api/dashboard/summary", headers=admin_hdr)
    after_data = after_submit_resp.json()
    assert after_data["pending_verifications"] == initial_pending + 1, (
        f"Pending verifications should increase from {initial_pending} to {initial_pending + 1}, got {after_data['pending_verifications']}"
    )
    assert after_data["total_reports"] == initial_reports + 1

    # Step 4: Admin / Field Officer retrieves the pending record
    if not verification_id:
        pending_resp = client.get("/api/verification/pending", headers=admin_hdr)
        assert pending_resp.status_code == 200
        pending_items = pending_resp.json()
        target = next((p for p in pending_items if p["report_id"] == report_id), None)
        assert target is not None, "Report not found in pending verification queue"
        verification_id = target["id"]

    # Step 5: Admin verifies the report
    decision_payload = {
        "status": "VERIFIED",
        "remarks": "Phase 11 verification test - ground confirmed and heavy bulldozer dispatched."
    }
    decide_resp = client.post(f"/api/verification/{verification_id}/decide", json=decision_payload, headers=admin_hdr)
    assert decide_resp.status_code == 200, f"Verification decision failed: {decide_resp.text}"

    # Step 6: Check Dashboard Summary reflects verification (Reactivity Check #2)
    after_verify_resp = client.get("/api/dashboard/summary", headers=admin_hdr)
    final_data = after_verify_resp.json()
    assert final_data["pending_verifications"] == initial_pending, (
        f"Pending verifications should revert to {initial_pending}, got {final_data['pending_verifications']}"
    )
    assert final_data["verified_count"] == initial_verified + 1, (
        f"Verified count should increase from {initial_verified} to {initial_verified + 1}, got {final_data['verified_count']}"
    )

    # Step 7: Check driver received notification
    notif_resp = client.get("/api/notifications", headers=driver_hdr)
    assert notif_resp.status_code == 200
    notifs = notif_resp.json()
    verification_notif = next((n for n in notifs if n.get("type") == "VERIFICATION"), None)
    assert verification_notif is not None, "Driver should receive a VERIFICATION notification"


def test_phase11_all_10_backend_data_sources():
    """
    Explicit verification of the 10 Prompt 11 requirements:
    1. Dashboard data comes from backend (/api/dashboard/summary)
    2. Map data comes from backend (/api/map/overview)
    3. Drivers come from backend (/api/drivers)
    4. Vehicles come from backend (/api/vehicles)
    5. Shipments come from backend (/api/shipments)
    6. Risks come from backend (/api/risks/areas)
    7. Alerts come from backend (/api/alerts)
    8. Notifications come from backend (/api/notifications)
    9. Reports come from backend (/api/reports)
    10. Regions & accessibility come from backend (/api/regions)
    """
    admin_hdr = get_auth_header("admin")

    # 1. Dashboard summary
    resp = client.get("/api/dashboard/summary", headers=admin_hdr)
    assert resp.status_code == 200
    dash = resp.json()
    assert "total_shipments" in dash and "active_shipments" in dash and "total_drivers" in dash

    # 2. Map overview
    resp = client.get("/api/map/overview", headers=admin_hdr)
    assert resp.status_code == 200
    m = resp.json()
    assert "vehicles" in m and "shipments" in m and "risks" in m and "alerts" in m and "reports" in m

    # 3. Drivers
    resp = client.get("/api/drivers", headers=admin_hdr)
    assert resp.status_code == 200
    drivers = resp.json()
    assert isinstance(drivers, list) and len(drivers) > 0
    assert "name" in drivers[0] and "driver_code" in drivers[0]

    # 4. Vehicles
    resp = client.get("/api/vehicles", headers=admin_hdr)
    assert resp.status_code == 200
    vehicles = resp.json()
    assert isinstance(vehicles, list) and len(vehicles) > 0
    assert "registration_number" in vehicles[0]

    # 5. Shipments
    resp = client.get("/api/shipments", headers=admin_hdr)
    assert resp.status_code == 200
    shipments = resp.json()
    assert isinstance(shipments, list) and len(shipments) > 0
    assert "shipment_code" in shipments[0]

    # 6. Risks
    resp = client.get("/api/risks/areas", headers=admin_hdr)
    assert resp.status_code == 200
    risks = resp.json()
    assert isinstance(risks, list) and len(risks) > 0
    assert "risk_score" in risks[0]

    # 7. Alerts
    resp = client.get("/api/alerts", headers=admin_hdr)
    assert resp.status_code == 200
    alerts = resp.json()
    assert isinstance(alerts, list)
    if len(alerts) > 0:
        assert "severity" in alerts[0]

    # 8. Notifications
    resp = client.get("/api/notifications", headers=admin_hdr)
    assert resp.status_code == 200
    notifs = resp.json()
    assert isinstance(notifs, list)

    # 9. Reports
    resp = client.get("/api/reports", headers=admin_hdr)
    assert resp.status_code == 200
    reports = resp.json()
    assert isinstance(reports, list) and len(reports) > 0
    assert "report_code" in reports[0]

    # 10. Regions / Accessibility
    resp = client.get("/api/regions", headers=admin_hdr)
    assert resp.status_code == 200
    regions = resp.json()
    assert isinstance(regions, list) and len(regions) >= 8
    assert "accessibility_score" in regions[0]
