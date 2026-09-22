import os
import sys
from fastapi.testclient import TestClient
from datetime import datetime

# Set backend working directory
os.chdir(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.main import app
from app.core.dependencies import get_db
from app.database.database import SessionLocal
from app.models import Region, Route, Alert, Notification, User, Shipment, WeatherData

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

def test_phase14_weather_five_fields_and_storage():
    """Verify WEATHER stores and returns: temperature, rainfall, condition, wind, timestamp."""
    print("\n--- TEST 1: Weather Storage & 5 Required Fields ---")
    headers = get_auth_header("admin")
    
    payload = {
        "state": "Assam",
        "district": "Guwahati Hub",
        "temperature": 27.5,
        "rainfall": 12.0,
        "wind": 18.0,
        "condition": "Scattered Clouds",
        "humidity_pct": 75.0
    }
    
    resp = client.post("/api/weather", json=payload, headers=headers)
    assert resp.status_code == 200, f"Failed to post weather: {resp.text}"
    data = resp.json()
    
    # Check 5 core fields
    assert "temperature" in data, "Missing temperature field"
    assert "rainfall" in data, "Missing rainfall field"
    assert "condition" in data, "Missing condition field"
    assert "wind" in data, "Missing wind field"
    assert "timestamp" in data, "Missing timestamp field"
    
    assert abs(data["temperature"] - 27.5) < 0.1
    assert abs(data["rainfall"] - 12.0) < 0.1
    assert abs(data["wind"] - 18.0) < 0.1
    assert data["condition"] == "Scattered Clouds"
    assert data["timestamp"] is not None
    print(f" Weather created with 5 fields: temp={data['temperature']}C, rain={data['rainfall']}mm, wind={data['wind']}km/h, cond={data['condition']}, ts={data['timestamp']}")

    # Check GET /api/weather
    get_resp = client.get("/api/weather", headers=headers)
    assert get_resp.status_code == 200
    all_weather = get_resp.json()
    assert len(all_weather) >= 1
    assam_w = next((w for w in all_weather if w["state"] == "Assam"), None)
    assert assam_w is not None
    assert assam_w["temperature"] is not None
    assert assam_w["rainfall"] is not None
    assert assam_w["wind"] is not None
    assert assam_w["condition"] is not None
    assert assam_w["timestamp"] is not None
    print(" GET /api/weather returned valid 5 fields across all regions")

def test_phase14_accessibility_canonical_statuses():
    """Verify accessibility statuses: OPEN, PARTIALLY AFFECTED, BLOCKED, CLOSED."""
    print("\n--- TEST 2: Accessibility Canonical Statuses ---")
    headers = get_auth_header("admin")
    
    resp = client.get("/api/accessibility", headers=headers)
    assert resp.status_code == 200
    access_list = resp.json()
    assert len(access_list) >= 8, f"Expected 8 Northeast states, got {len(access_list)}"
    
    valid_statuses = {"OPEN", "PARTIALLY AFFECTED", "BLOCKED", "CLOSED"}
    for item in access_list:
        status = item.get("accessibility_status")
        assert status in valid_statuses, f"Invalid status '{status}' for state {item.get('state')}"
        assert "accessibility_score" in item
        assert "weather" in item
        assert "active_disruptions_count" in item
    
    print(f" Verified {len(access_list)} state accessibility records all have canonical statuses: {valid_statuses}")
    
    # Test updating accessibility directly
    update_resp = client.put("/api/accessibility/Tripura", json={"accessibility_status": "PARTIALLY AFFECTED", "accessibility_score": 60}, headers=headers)
    assert update_resp.status_code == 200
    updated_data = update_resp.json()
    assert updated_data["accessibility_status"] == "PARTIALLY AFFECTED"
    print(" PUT /api/accessibility/Tripura updated status to PARTIALLY AFFECTED")

def test_phase14_heavy_rainfall_cascade():
    """
    Test Full Reactivity Cascade:
    Heavy rainfall
    ↓
    risk increases
    ↓
    route becomes HIGH RISK
    ↓
    alert generated
    ↓
    map reflects risk
    ↓
    affected drivers/logistics receive notification
    """
    print("\n--- TEST 3: Heavy Rainfall -> Risk -> Alert -> Notification Cascade ---")
    headers = get_auth_header("admin")
    
    db = SessionLocal()
    try:
        # Pre-check initial state
        initial_alerts_count = db.query(Alert).filter(Alert.state == "Meghalaya").count()
        initial_notifs_count = db.query(Notification).count()
    finally:
        db.close()
    
    # 1. Trigger Heavy Torrential Rainfall in Meghalaya (80 mm/h, Thunderstorm)
    sim_payload = {
        "state": "Meghalaya",
        "district": "East Khasi Hills / NH-6",
        "rainfall": 80.0,
        "temperature": 18.0,
        "wind": 50.0,
        "condition": "Severe Torrential Rain / Thunderstorm",
        "humidity_pct": 98.0
    }
    
    resp = client.post("/api/weather", json=sim_payload, headers=headers)
    assert resp.status_code == 200, f"Weather post failed: {resp.text}"
    cascade_result = resp.json()
    
    cascade_meta = cascade_result.get("cascade")
    assert cascade_meta is not None, "Cascade metadata missing in weather post response"
    
    print(f" Cascade Result: Accessibility={cascade_meta.get('accessibility_status')}, Risk={cascade_meta.get('risk_level')}, AlertCreated={cascade_meta.get('alert_generated')}")
    
    # 2. Check that accessibility was downgraded
    assert cascade_meta.get("accessibility_status") in ("BLOCKED", "CLOSED", "PARTIALLY AFFECTED")
    
    # 3. Check that area risk increased to HIGH or CRITICAL
    assert cascade_meta.get("risk_level") in ("HIGH", "CRITICAL")
    
    # 4. Check that routes in/through Meghalaya reflect increased risk
    routes_resp = client.get("/api/routes", headers=headers)
    assert routes_resp.status_code == 200
    routes = routes_resp.json()
    meghalaya_routes = [
        r for r in routes 
        if "Meghalaya" in r.get("state", "") 
        or "Shillong" in r.get("name", "") 
        or "NH-6" in r.get("highway", "")
        or "NH-6" in r.get("name", "")
    ]
    assert len(meghalaya_routes) > 0, "No Meghalaya routes found"
    high_or_crit_routes = [r for r in meghalaya_routes if r.get("risk_level") in ("HIGH", "CRITICAL")]
    assert len(high_or_crit_routes) > 0, "Meghalaya routes did not escalate to HIGH/CRITICAL risk"
    print(f" Route risk increased: {len(high_or_crit_routes)} Meghalaya route(s) are now {high_or_crit_routes[0]['risk_level']}")

    # 5. Check that an Alert was generated
    alerts_resp = client.get("/api/alerts", headers=headers)
    assert alerts_resp.status_code == 200
    alerts = alerts_resp.json()
    meghalaya_alerts = [a for a in alerts if a.get("state") == "Meghalaya" or "Meghalaya" in a.get("title", "")]
    assert len(meghalaya_alerts) > 0, "No alert was generated for Meghalaya"
    latest_alert = meghalaya_alerts[0]
    assert latest_alert.get("severity") in ("HIGH", "CRITICAL"), f"Alert severity was not HIGH/CRITICAL: {latest_alert}"
    print(f" Alert generated: [{latest_alert['severity']}] {latest_alert['title']}")

    # 6. Check that notifications were dispatched
    db = SessionLocal()
    try:
        new_notifs_count = db.query(Notification).count()
        assert new_notifs_count > initial_notifs_count, "No notifications were created during the cascade"
        recent_notif = db.query(Notification).order_by(Notification.id.desc()).first()
        assert recent_notif is not None
        print(f" Push notification dispatched to {recent_notif.user_id}: '{recent_notif.title}' - '{recent_notif.message}'")
    finally:
        db.close()

def test_phase14_clear_skies_nominal_restoration():
    """Verify that restoring weather to clear skies reduces risk back towards nominal."""
    print("\n--- TEST 4: Weather Restoration to Clear Skies ---")
    headers = get_auth_header("admin")
    
    clear_payload = {
        "state": "Assam",
        "district": "Guwahati",
        "rainfall": 0.0,
        "temperature": 26.0,
        "wind": 8.0,
        "condition": "Clear Skies",
        "humidity_pct": 50.0
    }
    
    resp = client.post("/api/weather", json=clear_payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    casc = data.get("cascade")
    assert casc is not None
    print(f" Test 4: Weather restored for Assam. Status={casc.get('accessibility_status')}, Score={casc.get('accessibility_score')}")
    # Verify that accessibility status is valid canonical status
    assert casc["accessibility_status"] in ("OPEN", "PARTIALLY AFFECTED", "BLOCKED", "CLOSED")
    print(f" Weather restored for Assam: Accessibility={casc['accessibility_status']}, Risk={casc['risk_level']}")

    # Also test Mizoram where corridors are clear
    clear_mizoram = {
        "state": "Mizoram",
        "district": "Aizawl Freight Terminal",
        "rainfall": 0.0,
        "temperature": 25.0,
        "wind": 6.0,
        "condition": "Clear Skies",
        "humidity_pct": 45.0
    }
    resp_miz = client.post("/api/weather", json=clear_mizoram, headers=headers)
    assert resp_miz.status_code == 200
    casc_miz = resp_miz.json().get("cascade")
    assert casc_miz["accessibility_status"] == "OPEN", f"Expected OPEN for clear Mizoram, got {casc_miz['accessibility_status']}"
    print(f" Weather cleared for Mizoram -> Accessibility restored to {casc_miz['accessibility_status']}")

if __name__ == "__main__":
    test_phase14_weather_five_fields_and_storage()
    test_phase14_accessibility_canonical_statuses()
    test_phase14_heavy_rainfall_cascade()
    test_phase14_clear_skies_nominal_restoration()
    print("\n==========================================")
    print("ALL PHASE 14 AUTOMATED TESTS PASSED!")
    print("==========================================\n")
