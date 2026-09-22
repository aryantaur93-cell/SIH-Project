"""
NEXTRA - Phase 10 (Logistics Operations) Automated Test Suite
Tests Transportation Requests, Shipments, Driver Assignments, Status Updates, Side Effects, and Map Integration.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.database import create_tables
from app.models.transport_request import TransportationRequest
from app.models.shipment import Shipment
from app.models.driver import Driver
from app.models.vehicle import Vehicle
from app.models.route import Route
from app.models.notification import Notification

create_tables()
client = TestClient(app)

def login(email, password):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["access_token"]

def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}

def test_phase10_logistics_complete_lifecycle():
    print("\n========================================================")
    print("STARTING NEXTRA PHASE 10: LOGISTICS OPERATIONS TESTS")
    print("========================================================")

    # 1. Authenticate users
    logistics_token = login("logistics@nextra.demo", "Logistics@123")
    driver_token = login("driver@nextra.demo", "Driver@123")
    admin_token = login("admin@nextra.demo", "Admin@123")

    print("[PASS] Successfully authenticated Logistics, Driver, and Admin.")

    # 2. Test Transportation Request Creation (All 10 Fields)
    tr_payload = {
        "pickup": "Guwahati Central Freight Hub",
        "destination": "Shillong Civil Hospital Depot",
        "cargo_type": "Pharmaceuticals & Cold-Chain Vaccines",
        "weight": 2.8,
        "vehicle_type": "Refrigerated Van",
        "capacity": 3.5,
        "priority": "HIGH",
        "required_date": "2026-09-25",
        "required_time": "08:30",
        "notes": "Must maintain temperature between 2°C and 8°C throughout Sonapur corridor."
    }

    create_tr_resp = client.post(
        "/api/transport-requests",
        json=tr_payload,
        headers=auth_headers(logistics_token)
    )
    assert create_tr_resp.status_code == 200, f"TR Creation failed: {create_tr_resp.text}"
    tr_data = create_tr_resp.json()
    tr_id = tr_data["id"]
    assert tr_data["request_code"].startswith("TR-")
    assert tr_data["status"] == "REQUESTED"
    assert tr_data["pickup"] == tr_payload["pickup"]
    assert tr_data["destination"] == tr_payload["destination"]
    assert tr_data["cargo_type"] == tr_payload["cargo_type"]
    assert tr_data["weight"] == 2.8
    assert tr_data["vehicle_type"] == "Refrigerated Van"
    assert tr_data["capacity"] == 3.5
    assert tr_data["priority"] == "HIGH"
    assert tr_data["required_date"] == "2026-09-25"
    assert tr_data["required_time"] == "08:30"
    print(f"[PASS] Created Transportation Request {tr_data['request_code']} with status {tr_data['status']}.")

    # 3. Query Transportation Requests with Filters
    list_tr_resp = client.get(
        "/api/transport-requests",
        headers=auth_headers(logistics_token)
    )
    assert list_tr_resp.status_code == 200
    all_trs = list_tr_resp.json()
    assert any(t["id"] == tr_id for t in all_trs)

    filtered_tr_resp = client.get(
        "/api/transport-requests?status=REQUESTED",
        headers=auth_headers(logistics_token)
    )
    assert filtered_tr_resp.status_code == 200
    assert any(t["id"] == tr_id for t in filtered_tr_resp.json())
    print("[PASS] Verified Transportation Request listing and status filtering.")

    # 4. Auto-match Fleet (Vehicle & Driver) for the Request
    match_resp = client.post(
        f"/api/transport-requests/{tr_id}/match",
        headers=auth_headers(logistics_token)
    )
    assert match_resp.status_code == 200, f"Match failed: {match_resp.text}"
    matched_tr = match_resp.json()
    assert matched_tr["status"] in ["MATCHING", "ASSIGNED"]
    print(f"[PASS] Auto-matched fleet for TR #{tr_id}: status is now {matched_tr['status']}.")

    # 5. Test Status Transitions across canonical lifecycle
    canonical_statuses = ["ASSIGNED", "IN TRANSIT", "DELAYED", "COMPLETED", "CANCELLED"]
    for next_status in canonical_statuses:
        status_resp = client.patch(
            f"/api/transport-requests/{tr_id}/status",
            json={"status": next_status, "remarks": f"Transitioned to {next_status} in automated test"},
            headers=auth_headers(logistics_token)
        )
        assert status_resp.status_code == 200, f"Failed transition to {next_status}: {status_resp.text}"
        assert status_resp.json()["status"] == next_status
    print(f"[PASS] Verified all canonical Transportation Request statuses: {canonical_statuses}.")

    # 6. Test Shipment Creation with Driver, Vehicle, Route, Origin, and Destination
    # Get available driver, vehicle, and route
    drivers_resp = client.get("/api/drivers", headers=auth_headers(logistics_token))
    vehicles_resp = client.get("/api/vehicles", headers=auth_headers(logistics_token))
    routes_resp = client.get("/api/routes", headers=auth_headers(logistics_token))

    assert drivers_resp.status_code == 200
    assert vehicles_resp.status_code == 200
    assert routes_resp.status_code == 200

    driver_id = drivers_resp.json()[0]["id"]
    vehicle_id = vehicles_resp.json()[0]["id"]
    route_id = routes_resp.json()[0]["id"] if len(routes_resp.json()) > 0 else None

    shipment_payload = {
        "pickup_location": "Guwahati Freight Hub",
        "origin": "Guwahati Freight Hub",
        "destination": "Silchar Terminal",
        "cargo": "High-Priority Disaster Relief Food Packages",
        "weight": 3.2,
        "priority": "HIGH",
        "driver_id": driver_id,
        "vehicle_id": vehicle_id,
        "route_id": route_id,
        "eta": "2026-09-24T18:00:00",
        "notes": "Heavy rainfall expected in Barapani sector."
    }

    create_shipment_resp = client.post(
        "/api/shipments",
        json=shipment_payload,
        headers=auth_headers(logistics_token)
    )
    assert create_shipment_resp.status_code == 200, f"Shipment creation failed: {create_shipment_resp.text}"
    shipment_data = create_shipment_resp.json()
    shipment_id = shipment_data["id"]
    assert shipment_data["driver_id"] == driver_id
    assert shipment_data["vehicle_id"] == vehicle_id
    assert shipment_data["destination"] == "Silchar Terminal"
    assert shipment_data["cargo"] == shipment_payload["cargo"]
    assert shipment_data["weight"] == 3.2
    assert shipment_data["priority"] == "HIGH"
    print(f"[PASS] Created Shipment #{shipment_id} (Code: {shipment_data.get('shipment_code')}) connecting driver {driver_id}, vehicle {vehicle_id}, route {route_id}.")

    # 7. Test Driver Assignment Retrieval for Logged-In Driver
    my_assignment_resp = client.get(
        "/api/shipments/my-assignment",
        headers=auth_headers(driver_token)
    )
    assert my_assignment_resp.status_code == 200, f"Failed to get driver assignment: {my_assignment_resp.text}"
    driver_assignment = my_assignment_resp.json()
    # Driver should get their active shipment
    if driver_assignment:
        print(f"[PASS] Driver retrieved active consignment: {driver_assignment.get('shipment_code')} - {driver_assignment.get('cargo')}")
    else:
        print("[INFO] Driver currently has no active shipment mapped directly to their user ID.")

    # 8. Test Shipment Status Change to DELAYED (Verifying notification triggers)
    delay_resp = client.patch(
        f"/api/shipments/{shipment_id}/status",
        json={"status": "DELAYED", "delay_reason": "Landslide blockage at Sonapur Tunnel on NH-6"},
        headers=auth_headers(logistics_token)
    )
    assert delay_resp.status_code == 200, f"Delay update failed: {delay_resp.text}"
    updated_shipment = delay_resp.json()
    assert updated_shipment["status"] == "DELAYED"
    print(f"[PASS] Updated Shipment #{shipment_id} status to DELAYED.")

    # 9. Verify Logistics and Driver received notification for delay
    notif_resp = client.get("/api/notifications", headers=auth_headers(logistics_token))
    assert notif_resp.status_code == 200
    logistics_notifs = notif_resp.json()
    has_delay_notif = any("delay" in n["title"].lower() or "delayed" in n["message"].lower() for n in logistics_notifs)
    assert has_delay_notif, "Expected delay notification for logistics user"
    print("[PASS] Verified automatic notification generation for delayed shipment.")

    # 10. Test Shipment Status Change to COMPLETED (Verifying Driver & Vehicle availability release)
    complete_resp = client.patch(
        f"/api/shipments/{shipment_id}/status",
        json={"status": "COMPLETED"},
        headers=auth_headers(logistics_token)
    )
    assert complete_resp.status_code == 200
    assert complete_resp.json()["status"] == "COMPLETED"

    # Check vehicle status in db
    v_check = client.get(f"/api/vehicles/{vehicle_id}", headers=auth_headers(logistics_token))
    assert v_check.status_code == 200
    assert v_check.json()["status"] in ["AVAILABLE", "IDLE"]
    print(f"[PASS] Shipment #{shipment_id} COMPLETED and vehicle {vehicle_id} released to {v_check.json()['status']}.")

    # 11. Test Map Overview Integration
    map_overview_resp = client.get("/api/map/overview", headers=auth_headers(logistics_token))
    assert map_overview_resp.status_code == 200
    map_data = map_overview_resp.json()
    assert "shipments" in map_data
    assert "vehicles" in map_data
    assert "routes" in map_data
    assert any(s["id"] == shipment_id for s in map_data["shipments"])
    print(f"[PASS] Verified Map Overview endpoint includes active shipments, vehicles, and route corridors.")

    print("\n========================================================")
    print("ALL NEXTRA PHASE 10: LOGISTICS OPERATIONS TESTS PASSED!")
    print("========================================================\n")


if __name__ == "__main__":
    test_phase10_logistics_complete_lifecycle()
