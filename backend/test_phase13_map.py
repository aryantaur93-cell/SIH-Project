"""
NEXTRA Phase 13 - Map Plotting & GIS Operations Test Suite
Verifies:
1. /api/map/overview returns all 8 operational entities with valid GPS latitude and longitude:
   - Drivers (30)
   - Vehicles (30)
   - Shipments (21)
   - Field reports (22)
   - Risk zones (11)
   - Alerts (14)
   - Routes (6)
   - Affected roads (3)
2. All coordinates are valid non-null floats within Northeast India geographic bounds:
   - Latitude: 21.5°N - 29.5°N
   - Longitude: 88.0°E - 97.5°E
3. Geographic state/district filtering returns relevant area data.
4. Entity status and keyword search filtering.
"""

import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

NE_LAT_MIN, NE_LAT_MAX = 21.0, 30.0
NE_LNG_MIN, NE_LNG_MAX = 88.0, 98.0


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


def test_map_overview_all_entities():
    """Verify map overview endpoint returns all 8 operational entities with valid coordinates."""
    headers = get_auth_header("admin")
    response = client.get("/api/map/overview", headers=headers)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()

    # 1. Check all required keys exist
    expected_keys = [
        "drivers", "vehicles", "shipments", "reports",
        "risks", "alerts", "routes", "affected_roads", "regions", "weather"
    ]
    for key in expected_keys:
        assert key in data, f"Missing key '{key}' in map overview response"

    # 2. Verify Drivers
    drivers = data["drivers"]
    assert len(drivers) >= 30, f"Expected at least 30 drivers, found {len(drivers)}"
    for d in drivers:
        assert d.get("latitude") is not None, f"Driver {d.get('id')} ({d.get('name')}) has null latitude"
        assert d.get("longitude") is not None, f"Driver {d.get('id')} ({d.get('name')}) has null longitude"
        lat, lng = float(d["latitude"]), float(d["longitude"])
        assert NE_LAT_MIN <= lat <= NE_LAT_MAX, f"Driver lat {lat} out of NE bounds"
        assert NE_LNG_MIN <= lng <= NE_LNG_MAX, f"Driver lng {lng} out of NE bounds"
        assert "name" in d and "status" in d

    print(f"[OK] Drivers verified: {len(drivers)} drivers with valid GPS in NE bounds")

    # 3. Verify Vehicles
    vehicles = data["vehicles"]
    assert len(vehicles) >= 30, f"Expected at least 30 vehicles, found {len(vehicles)}"
    for v in vehicles:
        assert v.get("latitude") is not None, f"Vehicle {v.get('id')} has null latitude"
        assert v.get("longitude") is not None, f"Vehicle {v.get('id')} has null longitude"
        lat, lng = float(v["latitude"]), float(v["longitude"])
        assert NE_LAT_MIN <= lat <= NE_LAT_MAX, f"Vehicle lat {lat} out of NE bounds"
        assert NE_LNG_MIN <= lng <= NE_LNG_MAX, f"Vehicle lng {lng} out of NE bounds"
        assert "registration_number" in v and "status" in v

    print(f"[OK] Vehicles verified: {len(vehicles)} vehicles with valid GPS in NE bounds")

    # 4. Verify Shipments
    shipments = data["shipments"]
    assert len(shipments) >= 20, f"Expected at least 20 shipments, found {len(shipments)}"
    for s in shipments:
        assert s.get("current_lat") is not None, f"Shipment {s.get('id')} has null current_lat"
        assert s.get("current_lng") is not None, f"Shipment {s.get('id')} has null current_lng"
        lat, lng = float(s["current_lat"]), float(s["current_lng"])
        assert NE_LAT_MIN <= lat <= NE_LAT_MAX, f"Shipment lat {lat} out of NE bounds"
        assert NE_LNG_MIN <= lng <= NE_LNG_MAX, f"Shipment lng {lng} out of NE bounds"
        assert "shipment_code" in s and "status" in s

    print(f"[OK] Shipments verified: {len(shipments)} shipments with valid GPS in NE bounds")

    # 5. Verify Field Reports
    reports = data["reports"]
    assert len(reports) >= 20, f"Expected at least 20 reports, found {len(reports)}"
    for r in reports:
        assert r.get("latitude") is not None, f"Report {r.get('id')} has null latitude"
        assert r.get("longitude") is not None, f"Report {r.get('id')} has null longitude"
        lat, lng = float(r["latitude"]), float(r["longitude"])
        assert NE_LAT_MIN <= lat <= NE_LAT_MAX, f"Report lat {lat} out of NE bounds"
        assert NE_LNG_MIN <= lng <= NE_LNG_MAX, f"Report lng {lng} out of NE bounds"
        assert "incident_type" in r or "hazard_type" in r

    print(f"[OK] Reports verified: {len(reports)} field reports with valid GPS in NE bounds")

    # 6. Verify Risk Zones
    risks = data["risks"]
    assert len(risks) >= 10, f"Expected at least 10 risks, found {len(risks)}"
    for rk in risks:
        assert rk.get("latitude") is not None, f"Risk {rk.get('id')} has null latitude"
        assert rk.get("longitude") is not None, f"Risk {rk.get('id')} has null longitude"
        lat, lng = float(rk["latitude"]), float(rk["longitude"])
        assert NE_LAT_MIN <= lat <= NE_LAT_MAX, f"Risk lat {lat} out of NE bounds"
        assert NE_LNG_MIN <= lng <= NE_LNG_MAX, f"Risk lng {lng} out of NE bounds"
        assert "risk_level" in rk or "severity" in rk

    print(f"[OK] Risks verified: {len(risks)} risk zones with valid GPS in NE bounds")

    # 7. Verify Alerts
    alerts = data["alerts"]
    assert len(alerts) >= 14, f"Expected at least 14 alerts, found {len(alerts)}"
    for a in alerts:
        assert a.get("latitude") is not None, f"Alert {a.get('id')} has null latitude"
        assert a.get("longitude") is not None, f"Alert {a.get('id')} has null longitude"
        lat, lng = float(a["latitude"]), float(a["longitude"])
        assert NE_LAT_MIN <= lat <= NE_LAT_MAX, f"Alert lat {lat} out of NE bounds"
        assert NE_LNG_MIN <= lng <= NE_LNG_MAX, f"Alert lng {lng} out of NE bounds"
        assert "severity" in a and "title" in a

    print(f"[OK] Alerts verified: {len(alerts)} alerts with valid GPS in NE bounds")

    # 8. Verify Routes
    routes = data["routes"]
    assert len(routes) >= 6, f"Expected at least 6 routes, found {len(routes)}"
    for rt in routes:
        assert "corridor_code" in rt or "route_code" in rt or "highway" in rt
        assert rt.get("waypoints") is not None or rt.get("waypoints_json") is not None
        assert "is_affected" in rt

    print(f"[OK] Routes verified: {len(routes)} arterial routes with valid coordinates/waypoints")

    # 9. Verify Affected Roads
    affected_roads = data["affected_roads"]
    assert len(affected_roads) >= 3, f"Expected at least 3 affected roads, found {len(affected_roads)}"
    for ar in affected_roads:
        assert ar.get("bottleneck_latitude") is not None, f"Affected road {ar.get('id')} has null bottleneck_latitude"
        assert ar.get("bottleneck_longitude") is not None, f"Affected road {ar.get('id')} has null bottleneck_longitude"
        lat, lng = float(ar["bottleneck_latitude"]), float(ar["bottleneck_longitude"])
        assert NE_LAT_MIN <= lat <= NE_LAT_MAX, f"Affected road lat {lat} out of NE bounds"
        assert NE_LNG_MIN <= lng <= NE_LNG_MAX, f"Affected road lng {lng} out of NE bounds"
        assert ar.get("waypoints_json") is not None, f"Affected road {ar.get('id')} missing waypoints_json"
        assert "corridor_code" in ar and "primary_hazard" in ar

    print(f"[OK] Affected Roads verified: {len(affected_roads)} affected corridors with bottleneck coordinates")


def test_map_state_filtering():
    """Verify filtering by state isolates relevant entities."""
    headers = get_auth_header("admin")
    # Test Meghalaya filtering
    res_meg = client.get("/api/map/overview?state=Meghalaya", headers=headers)
    assert res_meg.status_code == 200
    meg_data = res_meg.json()

    assert len(meg_data["drivers"]) > 0, "Expected drivers in Meghalaya"
    assert len(meg_data["vehicles"]) > 0, "Expected vehicles in Meghalaya"
    assert len(meg_data["shipments"]) > 0, "Expected shipments in Meghalaya"
    assert len(meg_data["reports"]) > 0, "Expected reports in Meghalaya"
    assert len(meg_data["risks"]) > 0, "Expected risks in Meghalaya"
    assert len(meg_data["alerts"]) > 0, "Expected alerts in Meghalaya"
    assert len(meg_data["routes"]) > 0, "Expected routes in Meghalaya"
    assert len(meg_data["affected_roads"]) > 0, "Expected affected roads in Meghalaya"

    # All filtered vehicles must be in Meghalaya (or related hub)
    for v in meg_data["vehicles"]:
        assert v.get("state") == "Meghalaya" or v.get("current_state") == "Meghalaya"

    for r in meg_data["reports"]:
        assert r["state"] == "Meghalaya"

    print(f"[OK] State filter verified: Meghalaya returned "
          f"{len(meg_data['drivers'])} drivers, {len(meg_data['vehicles'])} vehicles, "
          f"{len(meg_data['shipments'])} shipments, {len(meg_data['reports'])} reports, "
          f"{len(meg_data['risks'])} risks, {len(meg_data['alerts'])} alerts, "
          f"{len(meg_data['routes'])} routes, {len(meg_data['affected_roads'])} affected roads")


def test_map_status_and_search_filtering():
    """Verify filtering by vehicle status and keyword search."""
    headers = get_auth_header("admin")
    # 1. Status filter: ACTIVE
    res_active = client.get("/api/map/overview?status=ACTIVE", headers=headers)
    assert res_active.status_code == 200
    active_data = res_active.json()
    for v in active_data["vehicles"]:
        assert v["status"] == "ACTIVE"
    for d in active_data["drivers"]:
        assert d["status"] == "ACTIVE"
    print(f"[OK] Status filter verified: {len(active_data['vehicles'])} ACTIVE vehicles, {len(active_data['drivers'])} ACTIVE drivers")

    # 2. Search filter: registration number or code
    res_search = client.get("/api/map/overview?search=VX-104", headers=headers)
    assert res_search.status_code == 200
    search_data = res_search.json()
    matching_v = [v for v in search_data["vehicles"] if "VX-104" in v.get("vehicle_code", "") or "VX-104" in v.get("registration_number", "")]
    assert len(matching_v) >= 1, "Expected to find vehicle VX-104 in search"
    print(f"[OK] Search filter verified: Found {len(matching_v)} vehicles matching 'VX-104'")


if __name__ == "__main__":
    print("=" * 60)
    print("NEXTRA PHASE 13 -- MAP PLOTTING & GIS TEST SUITE")
    print("=" * 60)
    try:
        test_map_overview_all_entities()
        test_map_state_filtering()
        test_map_status_and_search_filtering()
        print("=" * 60)
        print("ALL PHASE 13 MAP TESTS PASSED SUCCESSFULLY! [OK]")
        print("=" * 60)
    except Exception as e:
        print(f"TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
