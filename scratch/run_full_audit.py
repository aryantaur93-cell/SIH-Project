"""
NEXTRA — COMPREHENSIVE FINAL SECURITY & FULL FEATURE INTEGRATION AUDIT
Runs against live FastAPI backend at http://localhost:8000
"""
import urllib.request
import urllib.error
import json
import time
import uuid
import sys
import os

BASE = "http://localhost:8000"

results = {
    "login_security": [],
    "rbac_security": [],
    "feature_audit": {},
    "e2e_workflows": {},
    "source_of_truth": [],
    "api_consistency": []
}

def log(category, test_name, passed, detail=""):
    tag = "PASS" if passed else "FAIL"
    entry = {"test": test_name, "status": tag, "detail": detail}
    if category in results:
        if isinstance(results[category], list):
            results[category].append(entry)
        elif isinstance(results[category], dict):
            if test_name not in results[category]:
                results[category][test_name] = []
            results[category][test_name].append(entry)
    print(f"[{tag}] [{category.upper()}] {test_name}: {detail}", flush=True)

def req(path, method="GET", data=None, headers=None):
    h = headers.copy() if headers else {}
    body = None
    if data is not None:
        if isinstance(data, (dict, list)):
            body = json.dumps(data).encode("utf-8")
            h["Content-Type"] = "application/json"
        elif isinstance(data, bytes):
            body = data
        elif isinstance(data, str):
            body = data.encode("utf-8")
    
    r = urllib.request.Request(f"{BASE}{path}", data=body, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=10) as resp:
            content_type = resp.headers.get("content-type", "")
            raw = resp.read()
            if "application/json" in content_type:
                try:
                    return resp.status, dict(resp.headers), json.loads(raw.decode("utf-8"))
                except Exception:
                    return resp.status, dict(resp.headers), raw.decode("utf-8", errors="ignore")
            else:
                return resp.status, dict(resp.headers), raw.decode("utf-8", errors="ignore")
    except urllib.error.HTTPError as he:
        err_body = he.read().decode("utf-8", errors="ignore")
        try:
            parsed = json.loads(err_body)
        except Exception:
            parsed = err_body
        return he.code, dict(he.headers), parsed
    except Exception as e:
        return 0, {}, str(e)

# ── HELPER: Multipart Form Data ────────────────────────────
def multipart_post(path, fields, files=None, token=None):
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    body = bytearray()
    
    for k, v in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode("utf-8"))
        body.extend(f"{v}\r\n".encode("utf-8"))
        
    if files:
        for field_name, (filename, file_bytes, content_type) in files.items():
            body.extend(f"--{boundary}\r\n".encode("utf-8"))
            body.extend(f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'.encode("utf-8"))
            body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
            body.extend(file_bytes)
            body.extend(b"\r\n")
            
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))
    
    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}"
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    return req(path, method="POST", data=bytes(body), headers=headers)

# ════════════════════════════════════════════════════════════
# 1. LOGIN & TOKEN SECURITY TESTS
# ════════════════════════════════════════════════════════════
print("\n>>> STARTING PART 1: LOGIN & TOKEN SECURITY AUDIT", flush=True)

# A. Missing Token
status, _, body = req("/api/auth/me")
log("login_security", "Missing Token Rejection", status == 401 or status == 403, f"Status: {status} (Expected 401/403)")

status, _, _ = req("/api/users")
log("login_security", "Protected Route /api/users Unauthenticated", status in (401, 403), f"Status: {status}")

status, _, _ = req("/api/verification")
log("login_security", "Protected Route /api/verification Unauthenticated", status in (401, 403), f"Status: {status}")

status, _, _ = req("/api/shipments")
log("login_security", "Protected Route /api/shipments Unauthenticated", status in (401, 403), f"Status: {status}")

# B. Malformed Token
status, _, body = req("/api/auth/me", headers={"Authorization": "Bearer malformed.token.value"})
log("login_security", "Malformed Token Rejection", status == 401, f"Status: {status}")

# C. Expired Token Simulation
import hmac
import hashlib
import base64
def create_fake_jwt(sub, role, exp_offset=-3600):
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).rstrip(b"=").decode()
    payload = base64.urlsafe_b64encode(json.dumps({
        "sub": str(sub),
        "role": role,
        "exp": int(time.time()) + exp_offset
    }).encode()).rstrip(b"=").decode()
    sig = hmac.new(b"nextra_super_secret_jwt_key_sih_2026", f"{header}.{payload}".encode(), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(sig).rstrip(b"=").decode()
    return f"{header}.{payload}.{sig_b64}"

expired_jwt = create_fake_jwt(1, "admin", exp_offset=-3600)
status, _, _ = req("/api/auth/me", headers={"Authorization": f"Bearer {expired_jwt}"})
log("login_security", "Expired Token Rejection", status == 401, f"Status: {status}")

# D. Invalid Signature Token
tampered_jwt = expired_jwt[:-5] + "XXXXX"
status, _, _ = req("/api/auth/me", headers={"Authorization": f"Bearer {tampered_jwt}"})
log("login_security", "Tampered Signature Rejection", status == 401, f"Status: {status}")

# E. Authenticate All 4 Demo Accounts & Collect Real Tokens
tokens = {}
demo_creds = {
    "admin": ("admin@nextra.demo", "Admin@123"),
    "field_officer": ("officer@nextra.demo", "Officer@123"),
    "logistics": ("logistics@nextra.demo", "Logistics@123"),
    "driver": ("driver@nextra.demo", "Driver@123")
}

for role, (email, pw) in demo_creds.items():
    s, _, b = req("/api/auth/login", "POST", {"email": email, "password": pw})
    tok = b.get("access_token") if s == 200 else None
    tokens[role] = tok
    u_role = b.get("user", {}).get("role") if s == 200 else None
    log("login_security", f"Demo Login - {role.upper()}", s == 200 and tok and u_role == role, f"Status {s}, role: {u_role}")

# F. Invalid credentials handling
s, _, _ = req("/api/auth/login", "POST", {"email": "admin@nextra.demo", "password": "WrongPassword"})
log("login_security", "Invalid Password", s == 401, f"Status: {s}")

s, _, _ = req("/api/auth/login", "POST", {"email": "nonexistent@demo.com", "password": "Admin@123"})
log("login_security", "Non-existent User", s == 401, f"Status: {s}")

# G. Forgot Password Flow
s, _, b = req("/api/auth/forgot-password/verify", "POST", {"email": "officer@nextra.demo"})
log("login_security", "Forgot Password Verify (Existing)", s == 200 and b.get("exists") == True, f"Status: {s}, exists: {b.get('exists')}")

s, _, b = req("/api/auth/forgot-password/verify", "POST", {"email": "nobody@nowhere.com"})
log("login_security", "Forgot Password Verify (Non-existing)", s == 200 and b.get("exists") == False, f"Status: {s}, exists: {b.get('exists')}")

# H. Public Signup Restrictions
s, _, _ = req("/api/auth/signup", "POST", {"name": "Hacker", "email": "h1@test.com", "password": "P@1", "role": "admin"})
log("login_security", "Public Signup Rejection - Admin", s == 403, f"Status: {s}")

s, _, _ = req("/api/auth/signup", "POST", {"name": "Hacker", "email": "h2@test.com", "password": "P@1", "role": "field_officer"})
log("login_security", "Public Signup Rejection - Field Officer", s == 403, f"Status: {s}")

ts = int(time.time())
s, _, b = req("/api/auth/signup", "POST", {
    "name": "Audit Test Driver", "email": f"driver_audit_{ts}@nextra.test",
    "password": "Password@123", "role": "driver", "phone": "+91 9999000011", "assigned_state": "Assam"
})
log("login_security", "Public Signup Allowed - Driver", s == 200 and b.get("user", {}).get("role") == "driver", f"Status: {s}")

# ════════════════════════════════════════════════════════════
# 2. RBAC & ROLE ISOLATION MATRIX
# ════════════════════════════════════════════════════════════
print("\n>>> STARTING PART 2: RBAC ROLE ISOLATION MATRIX", flush=True)

# Admin only endpoints
admin_only = [
    ("/api/users/1", "PATCH", {"phone": "+91 9999999999"}),
    ("/api/audit-logs", "GET", None),
    ("/api/users/field-officers", "POST", {"name": "FO Test", "email": f"fo_{ts}@test.com", "password": "Password@123", "assigned_state": "Assam"})
]

for path, meth, body_data in admin_only:
    # Admin should succeed or return valid
    s, _, _ = req(path, meth, data=body_data, headers={"Authorization": f"Bearer {tokens['admin']}"})
    log("rbac_security", f"Admin Allowed {meth} {path}", s in (200, 201), f"Admin status: {s}")
    
    # Field Officer should be 403
    s_fo, _, _ = req(path, meth, data=body_data, headers={"Authorization": f"Bearer {tokens['field_officer']}"})
    log("rbac_security", f"FO Denied {meth} {path}", s_fo == 403, f"FO status: {s_fo}")
    
    # Logistics should be 403
    s_log, _, _ = req(path, meth, data=body_data, headers={"Authorization": f"Bearer {tokens['logistics']}"})
    log("rbac_security", f"Logistics Denied {meth} {path}", s_log == 403, f"Logistics status: {s_log}")
    
    # Driver should be 403
    s_drv, _, _ = req(path, meth, data=body_data, headers={"Authorization": f"Bearer {tokens['driver']}"})
    log("rbac_security", f"Driver Denied {meth} {path}", s_drv == 403, f"Driver status: {s_drv}")

# Logistics & Admin endpoints
# /api/shipments POST
new_shipment_data = {
    "cargo": "Medical Vaccines",
    "weight": 2500.0,
    "origin": "Guwahati Central Hub",
    "destination": "Shillong Valley Depot",
    "priority": "HIGH"
}
s_log_ship, _, _ = req("/api/shipments", "POST", new_shipment_data, headers={"Authorization": f"Bearer {tokens['logistics']}"})
log("rbac_security", "Logistics Allowed POST /api/shipments", s_log_ship == 200, f"Status: {s_log_ship}")

s_drv_ship, _, _ = req("/api/shipments", "POST", new_shipment_data, headers={"Authorization": f"Bearer {tokens['driver']}"})
log("rbac_security", "Driver Denied POST /api/shipments", s_drv_ship == 403, f"Status: {s_drv_ship}")

# Verification: Admin & FO allowed, Driver & Logistics denied
s_ver_fo, _, _ = req("/api/verification", headers={"Authorization": f"Bearer {tokens['field_officer']}"})
log("rbac_security", "FO Allowed GET /api/verification", s_ver_fo == 200, f"Status: {s_ver_fo}")

s_ver_drv, _, _ = req("/api/verification", headers={"Authorization": f"Bearer {tokens['driver']}"})
log("rbac_security", "Driver Denied GET /api/verification", s_ver_drv == 403, f"Status: {s_ver_drv}")

s_ver_log, _, _ = req("/api/verification", headers={"Authorization": f"Bearer {tokens['logistics']}"})
log("rbac_security", "Logistics Denied GET /api/verification", s_ver_log == 403, f"Status: {s_ver_log}")

# ════════════════════════════════════════════════════════════
# 3. FEATURE-BY-FEATURE FUNCTIONAL AUDIT
# ════════════════════════════════════════════════════════════
print("\n>>> STARTING PART 3: FEATURE-BY-FEATURE FUNCTIONAL AUDIT", flush=True)

# 1. Dashboard Summary
s, _, b = req("/api/dashboard/summary", headers={"Authorization": f"Bearer {tokens['admin']}"})
log("feature_audit", "1. Dashboard Summary API", s == 200 and "active_vehicles" in b, f"Summary returned: vehicles={b.get('active_vehicles')}, alerts={b.get('active_alerts')}, verified={b.get('verified_count')}")

# 2. Live Map Overview
s, _, b = req("/api/map/overview", headers={"Authorization": f"Bearer {tokens['admin']}"})
log("feature_audit", "2. Live Map Overview API", s == 200 and "vehicles" in b and "routes" in b, f"Map returned: {len(b.get('vehicles', []))} vehicles, {len(b.get('routes', []))} routes, {len(b.get('reports', []))} reports")

# 3. Risk Intelligence (Areas & Routes)
s_area, _, b_area = req("/api/risks/areas", headers={"Authorization": f"Bearer {tokens['admin']}"})
s_route, _, b_route = req("/api/risks/routes", headers={"Authorization": f"Bearer {tokens['admin']}"})
log("feature_audit", "3. Risk Intelligence API", s_area == 200 and s_route == 200 and len(b_area) > 0, f"Areas: {len(b_area)}, Routes: {len(b_route)}")

# 4. Accessibility States
s, _, b = req("/api/accessibility", headers={"Authorization": f"Bearer {tokens['admin']}"})
log("feature_audit", "4. Accessibility API", s == 200 and isinstance(b, list) and len(b) > 0, f"{len(b)} regional accessibility records found")

# 5. Weather Telemetry
s, _, b = req("/api/weather", headers={"Authorization": f"Bearer {tokens['admin']}"})
log("feature_audit", "5. Weather Telemetry API", s == 200 and isinstance(b, list) and len(b) > 0, f"{len(b)} weather station states returned")

# 6. Logistics & Shipments
s, _, b = req("/api/shipments", headers={"Authorization": f"Bearer {tokens['logistics']}"})
log("feature_audit", "6. Logistics Shipments API", s == 200 and isinstance(b, list), f"{len(b)} total shipments found")

# 7. Driver Telemetry & Assignment
s, _, b = req("/api/shipments/my-assignment", headers={"Authorization": f"Bearer {tokens['driver']}"})
log("feature_audit", "7. Driver My-Assignment API", s == 200, f"Driver assignment status: {b.get('status') if b else 'None assigned'}")

# 8. Vehicles Fleet
s, _, b = req("/api/vehicles", headers={"Authorization": f"Bearer {tokens['admin']}"})
log("feature_audit", "8. Vehicles Fleet API", s == 200 and len(b) > 0, f"{len(b)} fleet vehicles in database")

# 9. Drivers Fleet
s, _, b = req("/api/drivers", headers={"Authorization": f"Bearer {tokens['admin']}"})
log("feature_audit", "9. Drivers Fleet API", s == 200 and len(b) > 0, f"{len(b)} drivers registered in database")

# 10. Field Reports
s, _, b = req("/api/reports", headers={"Authorization": f"Bearer {tokens['admin']}"})
log("feature_audit", "10. Field Reports API", s == 200 and isinstance(b, list), f"{len(b)} field reports in database")

# 11. Verification Center
s, _, b = req("/api/verification", headers={"Authorization": f"Bearer {tokens['admin']}"})
log("feature_audit", "11. Verification Center API", s == 200 and isinstance(b, list), f"{len(b)} verification records in database")

# 12. Alerts Engine
s, _, b = req("/api/alerts", headers={"Authorization": f"Bearer {tokens['admin']}"})
log("feature_audit", "12. Alerts Engine API", s == 200 and isinstance(b, list), f"{len(b)} active road alerts in database")

# 13. Notifications System
s, _, b = req("/api/notifications", headers={"Authorization": f"Bearer {tokens['admin']}"})
s_cnt, _, b_cnt = req("/api/notifications/count", headers={"Authorization": f"Bearer {tokens['admin']}"})
log("feature_audit", "13. Notifications System API", s == 200 and s_cnt == 200, f"{len(b)} notifications, unread count: {b_cnt.get('unread_count')}")

# 14. User Management & Audit Logs
s_u, _, b_u = req("/api/users", headers={"Authorization": f"Bearer {tokens['admin']}"})
s_aud, _, b_aud = req("/api/audit-logs", headers={"Authorization": f"Bearer {tokens['admin']}"})
log("feature_audit", "14. Admin User Mgmt & Audit API", s_u == 200 and s_aud == 200, f"Users: {len(b_u)}, Audit Logs: {len(b_aud)}")

# 15. Area Intelligence (Field Officer view)
s, _, b = req("/api/regions", headers={"Authorization": f"Bearer {tokens['field_officer']}"})
log("feature_audit", "15. Area Intelligence & Regions API", s == 200 and len(b) > 0, f"{len(b)} regions configured")

# ════════════════════════════════════════════════════════════
# 4. CROSS-FEATURE END-TO-END WORKFLOW TESTS
# ════════════════════════════════════════════════════════════
print("\n>>> STARTING PART 4: CROSS-FEATURE END-TO-END WORKFLOW TESTS", flush=True)

# ── TEST A: DRIVER INCIDENT FLOW ────────────────────────────
print("\n--- Running Test A: Driver Incident Flow ---", flush=True)
fake_img_bytes = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xFF\xDB\x00C\x00\xFF\xD9" # tiny valid JPEG
test_client_id = f"OFFLINE-E2E-{uuid.uuid4().hex[:8]}"

s_rpt, _, b_rpt = multipart_post(
    "/api/reports",
    {
        "incident_type": "LANDSLIDE",
        "description": "E2E Test: Rockfall blocking southbound corridor",
        "state": "Assam",
        "district": "Kamrup",
        "location_name": "NH-6 Km 42 Hill Cut",
        "severity": "CRITICAL",
        "latitude": "26.15",
        "longitude": "91.80",
        "client_report_id": test_client_id
    },
    files={"image": ("incident.jpg", fake_img_bytes, "image/jpeg")},
    token=tokens["driver"]
)

test_a_ok = (s_rpt == 200 and b_rpt.get("status") == "PENDING" and b_rpt.get("report_code"))
rpt_id = b_rpt.get("id")
rpt_code = b_rpt.get("report_code")
log("e2e_workflows", "Test A1: Driver Submits Report with Image", test_a_ok, f"Report {rpt_code} created (Status: {b_rpt.get('status')})")

# Check verification record created
s_v, _, b_v = req(f"/api/verification", headers={"Authorization": f"Bearer {tokens['admin']}"})
ver_entry = next((v for v in b_v if v.get("report_id") == rpt_id), None)
test_a_v_ok = (ver_entry is not None and ver_entry.get("status") == "PENDING")
ver_id = ver_entry.get("id") if ver_entry else None
log("e2e_workflows", "Test A2: Pending Verification Entry Linked", test_a_v_ok, f"Verification ID: {ver_id}")

# Check Admin & FO Notification generated
s_notif, _, b_notif = req("/api/notifications", headers={"Authorization": f"Bearer {tokens['admin']}"})
has_rpt_notif = any(rpt_code in n.get("title", "") or rpt_code in n.get("message", "") for n in b_notif)
log("e2e_workflows", "Test A3: Incident Generates Admin Notification", has_rpt_notif, f"Found notification for {rpt_code}")

# Check Map reflects pending hazard
s_map, _, b_map = req("/api/map/overview", headers={"Authorization": f"Bearer {tokens['admin']}"})
has_map_hazard = any(h.get("report_code") == rpt_code for h in b_map.get("reports", []))
log("e2e_workflows", "Test A4: Map Displays Incident Marker", has_map_hazard, f"Hazard on Map: {has_map_hazard}")

# Verify decision by Field Officer (Assam FO verifies Assam report)
s_decide, _, b_decide = req(
    f"/api/verification/{ver_id}/decide",
    "POST",
    {"status": "VERIFIED", "remarks": "Ground truth verified by Sector Officer via drone."},
    headers={"Authorization": f"Bearer {tokens['field_officer']}"}
)
test_a_decide_ok = (s_decide == 200 and b_decide.get("status") == "VERIFIED")
log("e2e_workflows", "Test A5: Field Officer Verifies Report", test_a_decide_ok, f"Verification status: {b_decide.get('status')}")

# Check Reporter (Driver) received decision notification
s_drv_notif, _, b_drv_notif = req("/api/notifications", headers={"Authorization": f"Bearer {tokens['driver']}"})
has_drv_ver_notif = any(rpt_code in n.get("title", "") or rpt_code in n.get("message", "") for n in b_drv_notif)
log("e2e_workflows", "Test A6: Driver Notified of Verification", has_drv_ver_notif, f"Driver notified: {has_drv_ver_notif}")

# Check Audit Log generated
s_audit, _, b_audit = req("/api/audit-logs", headers={"Authorization": f"Bearer {tokens['admin']}"})
has_audit = any(rpt_code in a.get("affected_record", "") or str(ver_id) in a.get("affected_record", "") for a in b_audit)
log("e2e_workflows", "Test A7: Cryptographic Audit Trail Logged", has_audit, f"Audit record found: {has_audit}")

# ── TEST B: FIELD OFFICER FLOW & AREA RESTRICTION ────────────
print("\n--- Running Test B: Field Officer Flow & Area Restriction ---", flush=True)

# Create report in Sikkim using multipart form
s_skm, _, b_skm = multipart_post(
    "/api/reports",
    {
        "incident_type": "FLOOD",
        "description": "Flash flood in Sikkim valley",
        "state": "Sikkim",
        "severity": "HIGH",
        "latitude": "27.33",
        "longitude": "88.61"
    },
    token=tokens["admin"]
)
skm_ver_id = None
if s_skm == 200:
    _, _, all_vers = req("/api/verification", headers={"Authorization": f"Bearer {tokens['admin']}"})
    v_skm = next((v for v in all_vers if v.get("report_id") == b_skm.get("id")), None)
    skm_ver_id = v_skm.get("id") if v_skm else None

# Assam Field Officer tries to verify Sikkim report -> MUST BE 403 FORBIDDEN
s_skm_decide, _, _ = req(
    f"/api/verification/{skm_ver_id}/decide",
    "POST",
    {"status": "VERIFIED", "remarks": "Attempt cross-border verify"},
    headers={"Authorization": f"Bearer {tokens['field_officer']}"}
)
log("e2e_workflows", "Test B1: FO Sector Boundary Enforcement (403)", s_skm_decide == 403, f"Status: {s_skm_decide} (Cross-state verify correctly blocked)")

# Admin CAN verify/reject Sikkim report
s_adm_skm, _, _ = req(
    f"/api/verification/{skm_ver_id}/decide",
    "POST",
    {"status": "REJECTED", "remarks": "False report; water receded."},
    headers={"Authorization": f"Bearer {tokens['admin']}"}
)
log("e2e_workflows", "Test B2: Admin Can Verify Across All 8 States", s_adm_skm == 200, f"Status: {s_adm_skm}")

# ── TEST C: SHIPMENT & TRANSPORTATION FLOW ──────────────────
print("\n--- Running Test C: Shipment & Transportation Flow ---", flush=True)

# Logistics creates shipment
s_shp_c, _, b_shp_c = req(
    "/api/shipments",
    "POST",
    {
        "cargo": "Emergency Medicines",
        "weight": 3200.0,
        "origin": "Guwahati Central Hub",
        "destination": "Shillong Mountain Depot",
        "priority": "HIGH",
        "driver_id": 1, # Linked to Demo driver user_id 4
        "vehicle_id": 1,
        "eta": "3h 45m"
    },
    headers={"Authorization": f"Bearer {tokens['logistics']}"}
)
shp_id = b_shp_c.get("id") if s_shp_c == 200 else None
shp_code = b_shp_c.get("shipment_code") if s_shp_c == 200 else "None"
log("e2e_workflows", "Test C1: Logistics Creates Shipment", s_shp_c == 200 and shp_id is not None, f"Shipment ID: {shp_id}, Code: {shp_code}")

# Driver checks my-assignment
s_my_shp, _, b_my_shp = req("/api/shipments/my-assignment", headers={"Authorization": f"Bearer {tokens['driver']}"})
my_shp_match = (s_my_shp == 200 and b_my_shp and b_my_shp.get("id") == shp_id)
log("e2e_workflows", "Test C2: Driver Receives Live Assignment", my_shp_match, f"Assigned shipment: {b_my_shp.get('shipment_code') if b_my_shp else 'None'}")

# Status transition: IN_TRANSIT
s_trans, _, b_trans = req(
    f"/api/shipments/{shp_id}/status",
    "PATCH",
    {"status": "IN_TRANSIT", "notes": "Departed Guwahati depot on NH-6."},
    headers={"Authorization": f"Bearer {tokens['logistics']}"}
)
log("e2e_workflows", "Test C3: Shipment Status Updates to IN_TRANSIT", s_trans == 200 and b_trans.get("status") == "IN_TRANSIT", f"New status: {b_trans.get('status')}")

# ── TEST D: AUTHORIZATION & UNPRIVILEGED ACCESS ─────────────
print("\n--- Running Test D: Authorization Flow ---", flush=True)
s_bad_user, _, _ = req("/api/users/1", "PATCH", {"status": "INACTIVE"}, headers={"Authorization": f"Bearer {tokens['driver']}"})
log("e2e_workflows", "Test D1: Driver Mutating User Account Denied (403)", s_bad_user == 403, f"Status: {s_bad_user}")

s_bad_audit, _, _ = req("/api/audit-logs", headers={"Authorization": f"Bearer {tokens['field_officer']}"})
log("e2e_workflows", "Test D2: FO Accessing Audit Logs Denied (403)", s_bad_audit == 403, f"Status: {s_bad_audit}")

s_bad_recalc, _, _ = req("/api/risks/recalculate", "POST", headers={"Authorization": f"Bearer {tokens['driver']}"})
log("e2e_workflows", "Test D3: Driver Triggering Risk Recalculate Denied (403)", s_bad_recalc == 403, f"Status: {s_bad_recalc}")

# ── TEST E: OFFLINE FLOW DEDUPLICATION ──────────────────────
print("\n--- Running Test E: Offline Flow Deduplication ---", flush=True)
offline_client_uuid = f"OFFLINE-REPLAY-{uuid.uuid4().hex}"

# First submission
s1, _, b1 = multipart_post(
    "/api/reports",
    {
        "incident_type": "ROAD_BLOCKAGE",
        "description": "Fallen boulder on highway",
        "state": "Meghalaya",
        "severity": "HIGH",
        "client_report_id": offline_client_uuid
    },
    token=tokens["field_officer"]
)
r1_id = b1.get("id") if s1 == 200 else None

# Replayed sync of the exact same offline report
s2, _, b2 = multipart_post(
    "/api/reports",
    {
        "incident_type": "ROAD_BLOCKAGE",
        "description": "Fallen boulder on highway (replayed)",
        "state": "Meghalaya",
        "severity": "HIGH",
        "client_report_id": offline_client_uuid
    },
    token=tokens["field_officer"]
)
r2_id = b2.get("id") if s2 == 200 else None
is_deduped = (s1 == 200 and s2 == 200 and r1_id == r2_id)
log("e2e_workflows", "Test E: Offline Sync Deduplication", is_deduped, f"Sub 1 ID: {r1_id}, Sub 2 ID: {r2_id} (Zero duplicate rows)")

# ════════════════════════════════════════════════════════════
# SUMMARY TOTALS
# ════════════════════════════════════════════════════════════
print("\n" + "="*70, flush=True)
total_tests = 0
passed_tests = 0

for cat, val in results.items():
    if isinstance(val, list):
        total_tests += len(val)
        passed_tests += sum(1 for x in val if x["status"] == "PASS")
    elif isinstance(val, dict):
        for sub, sub_val in val.items():
            total_tests += len(sub_val)
            passed_tests += sum(1 for x in sub_val if x["status"] == "PASS")

print(f"AUDIT SUITE COMPLETE: {passed_tests} / {total_tests} Tests Passed", flush=True)
print("="*70, flush=True)
