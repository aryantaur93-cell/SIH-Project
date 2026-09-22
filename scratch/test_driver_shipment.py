import urllib.request
import json

BASE = "http://localhost:8000"

def req(path, method="GET", data=None, token=None):
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data else None
    r = urllib.request.Request(f"{BASE}{path}", data=body, headers=h, method=method)
    with urllib.request.urlopen(r) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))

# 1. Login Logistics
_, b_log = req("/api/auth/login", "POST", {"email": "logistics@nextra.demo", "password": "Logistics@123"})
tok_log = b_log["access_token"]

# 2. Login Driver
_, b_drv = req("/api/auth/login", "POST", {"email": "driver@nextra.demo", "password": "Driver@123"})
tok_drv = b_drv["access_token"]

# 3. Create Shipment with driver_id = 1 (Aman Kumar's driver profile)
s, new_shp = req("/api/shipments", "POST", {
    "cargo": "Urgent Medical Vaccines",
    "weight": 1500.0,
    "origin": "Guwahati Central Hub",
    "destination": "Shillong Civil Hospital",
    "priority": "HIGH",
    "driver_id": 1,
    "vehicle_id": 1,
    "eta": "2h 30m"
}, token=tok_log)
print("Created Shipment:", new_shp["id"], new_shp["shipment_code"])

# 4. Check Driver My-Assignment
s, my_shp = req("/api/shipments/my-assignment", token=tok_drv)
print("Driver My Assignment:", my_shp["id"], my_shp["shipment_code"], "MATCH:", my_shp["id"] == new_shp["id"])
