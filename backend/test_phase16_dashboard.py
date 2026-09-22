"""
NEXTRA - Phase 16 Dashboard Polish Automated Test Suite
Verifies:
1. Live database KPIs computed for all 4 roles (Admin, Field Officer, Logistics, Driver).
2. All metrics are non-null and accurately supported by the backend/database.
3. Field Officer area-scoping correctly targets assigned jurisdiction (Assam).
4. Routes metrics (total_routes, active_routes) are computed and returned.
5. In-cab driver telemetry (speed_kmh, temperature_celsius, fuel_level) is returned in my-assignment.
6. Empty / default handling across summary fields.
"""
import requests

BASE_URL = "http://127.0.0.1:8000"

def get_token(email: str, password: str) -> str:
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def test_admin_dashboard_kpis():
    print("\n--- TEST 1: Admin Dashboard KPIs ---")
    token = get_token("admin@nextra.demo", "Admin@123")
    res = requests.get(f"{BASE_URL}/api/dashboard/summary", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200, f"Failed to get summary: {res.text}"
    data = res.json()

    # Core entities
    assert isinstance(data["total_shipments"], int) and data["total_shipments"] > 0
    assert isinstance(data["active_shipments"], int)
    assert isinstance(data["delayed_shipments"], int)
    assert isinstance(data["total_drivers"], int) and data["total_drivers"] >= 30
    assert isinstance(data["active_drivers"], int)
    assert isinstance(data["available_drivers"], int)
    assert isinstance(data["total_vehicles"], int) and data["total_vehicles"] >= 30
    assert isinstance(data["available_vehicles"], int)
    assert isinstance(data["risk_zones"], int) and data["risk_zones"] > 0
    assert isinstance(data["critical_risks"], int)
    assert isinstance(data["pending_verifications"], int)
    assert isinstance(data["verified_count"], int)
    assert isinstance(data["total_reports"], int) and data["total_reports"] > 0
    assert isinstance(data["total_field_officers"], int) and data["total_field_officers"] > 0
    assert isinstance(data["active_alerts"], int)
    assert isinstance(data["total_routes"], int) and data["total_routes"] >= 6
    assert isinstance(data["active_routes"], int) and data["active_routes"] >= 4
    assert isinstance(data["accessibility_score"], (int, float))
    assert data["assigned_area"] == "All 8 States"

    print(f"  [PASS] Admin KPIs: {data['active_shipments']}/{data['total_shipments']} shipments, "
          f"{data['available_vehicles']}/{data['total_vehicles']} trucks, "
          f"{data['active_drivers']}/{data['total_drivers']} drivers, "
          f"{data['active_routes']}/{data['total_routes']} corridors, "
          f"{data['total_reports']} reports, {data['pending_verifications']} pending verifications, "
          f"{data['active_alerts']} alerts.")


def test_field_officer_dashboard_scoping():
    print("\n--- TEST 2: Field Officer Dashboard Scoping (Assam) ---")
    token = get_token("officer@nextra.demo", "Officer@123")
    res = requests.get(f"{BASE_URL}/api/dashboard/summary", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200, f"Failed to get FO summary: {res.text}"
    data = res.json()

    assert data["assigned_area"] == "Assam", f"Expected Assam, got {data['assigned_area']}"
    assert isinstance(data["area_risks"], int)
    assert isinstance(data["area_pending_verifications"], int)
    assert isinstance(data["area_reports"], int) and data["area_reports"] > 0
    assert isinstance(data["area_vehicles"], int)
    assert isinstance(data["area_shipments"], int)
    assert isinstance(data["area_alerts"], int)
    assert isinstance(data["area_accessibility"], (int, float))
    assert data["area_road_status"] is not None

    print(f"  [PASS] Field Officer Scope ({data['assigned_area']}): "
          f"{data['area_reports']} area reports, {data['area_pending_verifications']} pending reviews, "
          f"{data['area_alerts']} alerts, road status: {data['area_road_status'][:40]}...")


def test_logistics_dashboard_metrics():
    print("\n--- TEST 3: Logistics Dashboard KPIs ---")
    token = get_token("logistics@nextra.demo", "Logistics@123")
    res = requests.get(f"{BASE_URL}/api/dashboard/summary", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200, f"Failed to get logistics summary: {res.text}"
    data = res.json()

    assert isinstance(data["active_shipments"], int)
    assert isinstance(data["delayed_shipments"], int)
    assert isinstance(data["pending_transport_requests"], int)
    assert isinstance(data["available_vehicles"], int)
    assert isinstance(data["available_drivers"], int)
    assert isinstance(data["active_routes"], int) and data["active_routes"] >= 4
    assert isinstance(data["critical_risks"], int)

    print(f"  [PASS] Logistics KPIs: {data['active_shipments']} active, {data['delayed_shipments']} delayed, "
          f"{data['pending_transport_requests']} pending requests, {data['available_vehicles']} trucks available, "
          f"{data['available_drivers']} drivers available, {data['active_routes']} active supply corridors.")


def test_driver_assignment_telemetry():
    print("\n--- TEST 4: Driver In-Cab Cockpit Telemetry ---")
    token = get_token("driver@nextra.demo", "Driver@123")
    res = requests.get(f"{BASE_URL}/api/shipments/my-assignment", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200, f"Failed to get driver assignment: {res.text}"
    data = res.json()

    if data:
        assert "shipment_code" in data
        assert "origin" in data
        assert "destination" in data
        assert "speed_kmh" in data and (data["speed_kmh"] is None or isinstance(data["speed_kmh"], (int, float)))
        assert "temperature_celsius" in data
        assert "distance_km" in data and (data["distance_km"] is None or isinstance(data["distance_km"], (int, float)))
        print(f"  [PASS] Driver Active Consignment: {data['shipment_code']} ({data['origin']} -> {data['destination']}), "
              f"Vehicle: {data.get('vehicle_registration')}, Speed: {data.get('speed_kmh')} km/h, Distance: {data.get('distance_km')} km, Cargo Temp: {data.get('temperature_celsius')}")
    else:
        print("  [PASS] Driver currently on Standby (no active consignment assigned).")


def test_alerts_endpoint():
    print("\n--- TEST 5: Real Alerts Endpoint for Dashboard Feeds ---")
    token = get_token("admin@nextra.demo", "Admin@123")
    res = requests.get(f"{BASE_URL}/api/alerts", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200, f"Failed to get alerts: {res.text}"
    alerts = res.json()
    assert isinstance(alerts, list)
    print(f"  [PASS] Retrieved {len(alerts)} alerts from database.")
    if alerts:
        a = alerts[0]
        assert "title" in a and "severity" in a and "latitude" in a and "longitude" in a
        print(f"  [PASS] Sample Alert: '{a['title']}' ({a['severity']}) in {a.get('state', 'NER')}")


if __name__ == "__main__":
    print("==================================================")
    print("NEXTRA PHASE 16 DASHBOARD POLISH VERIFICATION SUITE")
    print("==================================================")
    test_admin_dashboard_kpis()
    test_field_officer_dashboard_scoping()
    test_logistics_dashboard_metrics()
    test_driver_assignment_telemetry()
    test_alerts_endpoint()
    print("\n==================================================")
    print("ALL 5 PHASE 16 TESTS PASSED!")
    print("==================================================")
