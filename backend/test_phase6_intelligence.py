"""
NEXTRA Phase 6 Verification Test Suite
Tests Driver, Vehicle, and Area Intelligence endpoints and multi-parameter filters.
"""
import urllib.request
import urllib.parse
import json
import sys

BASE_URL = "http://127.0.0.1:8000"
TOKEN = None

def login(email="admin@nextra.demo", password="Admin@123"):
    global TOKEN
    url = f"{BASE_URL}/api/auth/login"
    payload = json.dumps({"email": email, "password": password}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
        TOKEN = data["access_token"]
        return TOKEN

def get(endpoint):
    url = f"{BASE_URL}{endpoint}"
    headers = {"User-Agent": "TestClient"}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as res:
        assert res.status == 200, f"Failed GET {endpoint}: {res.status}"
        return json.loads(res.read().decode())

def run_tests():
    print("=== NEXTRA PHASE 6 INTELLIGENCE TESTS ===")
    token = login()
    assert token, "Login failed to return access token"
    print("[AUTH] Successfully authenticated as Admin.")
    
    # 1. Test Vehicles List & Count
    vehicles = get("/api/vehicles")
    print(f"[TEST 1] GET /api/vehicles: {len(vehicles)} vehicles returned")
    assert 20 <= len(vehicles) <= 35, f"Expected 20-30 vehicles, got {len(vehicles)}"
    
    sample_v = vehicles[0]
    required_v_keys = ["id", "vehicle_id", "registration", "vehicle_type", "capacity_kg", "status"]
    for k in required_v_keys:
        assert k in sample_v, f"Missing key '{k}' in vehicle"
    assert sample_v["status"] in ["ACTIVE", "IDLE", "DELAYED", "OFFLINE", "MAINTENANCE"]
    print("  -> Vehicle schema verified:", sample_v["registration"], sample_v["status"])

    # 2. Test Vehicle Filtering
    v_meghalaya = get("/api/vehicles?state=Meghalaya")
    print(f"[TEST 2] GET /api/vehicles?state=Meghalaya: {len(v_meghalaya)} vehicles found")
    assert len(v_meghalaya) > 0, "Expected at least 1 vehicle in Meghalaya"
    for v in v_meghalaya:
        loc_state = (v.get("current_location") or {}).get("state") or v.get("state")
        assert loc_state == "Meghalaya", f"Expected Meghalaya, got {loc_state}"

    v_active = get("/api/vehicles?status=ACTIVE")
    print(f"[TEST 3] GET /api/vehicles?status=ACTIVE: {len(v_active)} active vehicles found")
    assert len(v_active) > 0
    for v in v_active:
        assert v["status"] == "ACTIVE"

    # 3. Test Specific Vehicle Details by Registration & ID
    v_dossier = get("/api/vehicles/VX-104")
    print(f"[TEST 4] GET /api/vehicles/VX-104: {v_dossier['registration']}")
    assert v_dossier["driver"] is not None, "Expected driver linked to VX-104"
    print("  -> Linked Driver:", v_dossier["driver"]["name"])

    # 4. Test Drivers List & Count
    drivers = get("/api/drivers")
    print(f"[TEST 5] GET /api/drivers: {len(drivers)} drivers returned")
    assert 20 <= len(drivers) <= 35, f"Expected 20-30 drivers, got {len(drivers)}"
    
    sample_d = drivers[0]
    required_d_keys = ["id", "driver_id", "name", "phone", "status", "assigned_area"]
    for k in required_d_keys:
        assert k in sample_d, f"Missing key '{k}' in driver"
    assert sample_d["status"] in ["ACTIVE", "IDLE", "DELAYED", "OFFLINE", "MAINTENANCE"]
    print("  -> Driver schema verified:", sample_d["name"], sample_d["status"], sample_d["assigned_area"])

    # 5. Test Driver Filtering
    d_assam = get("/api/drivers?state=Assam")
    print(f"[TEST 6] GET /api/drivers?state=Assam: {len(d_assam)} drivers found in Assam")
    assert len(d_assam) > 0
    for d in d_assam:
        assert "Assam" in d.get("assigned_area", "") or (d.get("current_location") or {}).get("state") == "Assam"

    # 6. Test Specific Driver Details by Code
    d_profile = get("/api/drivers/DRV-001")
    print(f"[TEST 7] GET /api/drivers/DRV-001: {d_profile['name']}")
    assert "vehicle" in d_profile
    if d_profile["vehicle"]:
        print("  -> Linked Vehicle:", d_profile["vehicle"]["registration"])

    # 7. Test Area Intelligence (All 11 Points)
    area_states = ["Meghalaya", "Assam", "Arunachal Pradesh", "Nagaland", "Manipur", "Mizoram", "Tripura", "Sikkim"]
    for st in area_states:
        encoded_st = urllib.parse.quote(st)
        intel = get(f"/api/regions/{encoded_st}/intelligence")
        print(f"[TEST 8] GET /api/regions/{st}/intelligence: Accessibility score = {intel['accessibility']['score']}")
        
        # Verify all 11 required points
        assert "active_drivers" in intel, "Missing 1: active_drivers"
        assert "active_vehicles" in intel, "Missing 2: active_vehicles"
        assert "shipments" in intel, "Missing 3: shipments"
        assert "delays" in intel, "Missing 4: delays"
        assert "risks" in intel, "Missing 5: risks"
        assert "field_reports" in intel, "Missing 6: field_reports"
        assert "alerts" in intel, "Missing 7: alerts"
        assert "weather" in intel, "Missing 8: weather"
        assert "accessibility" in intel, "Missing 9: accessibility"
        assert "open_routes" in intel, "Missing 10: open_routes"
        assert "blocked_routes" in intel, "Missing 11: blocked_routes"

    print("\n[PASS] ALL 11 AREA INTELLIGENCE METRICS VERIFIED FOR ALL 8 STATES!")
    print("[PASS] DRIVER & VEHICLE ENDPOINTS AND FILTERS FULLY VALIDATED!")

if __name__ == "__main__":
    run_tests()
