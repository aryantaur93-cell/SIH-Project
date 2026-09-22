"""
NEXTRA — Phase 3: Comprehensive Authentication & RBAC Verification Test Suite
Tests:
1. Login for all four demo accounts (Admin, Field Officer, Logistics, Driver)
2. Profile retrieval (/api/auth/me) with returned JWT for all 4 roles
3. Public registration role restrictions (Admin/Field Officer forbidden with 403)
4. Successful public registration (Driver / Logistics)
5. Admin ability to create new Field Officers (with linked profile)
6. New Field Officer login verification
7. Unauthorized and role-guarded endpoint enforcement:
   - Unauthenticated access to protected routes
   - Driver attempting admin-only routes (FO creation, audit logs, risk recalculate)
   - Driver attempting verification routes (admin/FO only)
   - Driver attempting shipment creation (admin/logistics only)
   - Field Officer attempting admin-only routes (FO creation, audit logs)
   - Logistics attempting verification routes (admin/FO only)
8. Invalid credential handling (wrong password, non-existent user)
"""
import sys
import os
import time

# Set UTF-8 encoding for Windows console
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database.database import SessionLocal
from app.models.user import User
from app.models.field_officer import FieldOfficerProfile

client = TestClient(app)

PASSED = 0
FAILED = 0


def assert_test(condition, name, details=""):
    global PASSED, FAILED
    if condition:
        print(f"  [PASS] {name}")
        PASSED += 1
    else:
        print(f"  [FAIL] {name} - {details}")
        FAILED += 1


def run_all_tests():
    print("=" * 65)
    print("  NEXTRA PHASE 3: AUTHENTICATION & RBAC TEST SUITE")
    print("=" * 65)

    # ─────────────────────────────────────────────────────────────
    # TEST 1: All 4 Demo Accounts Login & GET /api/auth/me
    # ─────────────────────────────────────────────────────────────
    print("\n--- 1. Testing Demo Accounts Authentication ---")
    demo_accounts = [
        ("admin@nextra.demo", "Admin@123", "admin", "Admin"),
        ("officer@nextra.demo", "Officer@123", "field_officer", "Field Officer"),
        ("logistics@nextra.demo", "Logistics@123", "logistics", "Logistics"),
        ("driver@nextra.demo", "Driver@123", "driver", "Driver"),
    ]

    tokens = {}

    for email, password, expected_role, label in demo_accounts:
        # POST /api/auth/login
        res = client.post("/api/auth/login", json={"email": email, "password": password})
        assert_test(res.status_code == 200, f"{label} login status code == 200", f"Got {res.status_code}: {res.text}")

        if res.status_code == 200:
            data = res.json()
            assert_test("access_token" in data, f"{label} received JWT access token")
            assert_test(data["user"]["role"] == expected_role, f"{label} user role == '{expected_role}' in response")
            token = data["access_token"]
            tokens[expected_role] = token

            # GET /api/auth/me with token
            headers = {"Authorization": f"Bearer {token}"}
            me_res = client.get("/api/auth/me", headers=headers)
            assert_test(me_res.status_code == 200, f"{label} GET /api/auth/me status == 200")
            if me_res.status_code == 200:
                me_data = me_res.json()
                assert_test(me_data["email"] == email, f"{label} profile email matches '{email}'")
                assert_test(me_data["role"] == expected_role, f"{label} profile role matches '{expected_role}'")

    # ─────────────────────────────────────────────────────────────
    # TEST 2: Invalid Credential Handling
    # ─────────────────────────────────────────────────────────────
    print("\n--- 2. Testing Invalid Credentials ---")
    # Wrong password
    bad_pw = client.post("/api/auth/login", json={"email": "admin@nextra.demo", "password": "WrongPassword!999"})
    assert_test(bad_pw.status_code == 401, "Wrong password returns 401 Unauthorized", f"Got {bad_pw.status_code}")

    # Non-existent user
    no_user = client.post("/api/auth/login", json={"email": "ghost@nextra.demo", "password": "GhostPassword@123"})
    assert_test(no_user.status_code == 401, "Non-existent user returns 401 Unauthorized", f"Got {no_user.status_code}")

    # ─────────────────────────────────────────────────────────────
    # TEST 3: Public Signup Restrictions (Admin/FO forbidden)
    # ─────────────────────────────────────────────────────────────
    print("\n--- 3. Testing Public Signup Restrictions ---")
    # Attempting to register as 'admin'
    admin_signup = client.post("/api/auth/signup", json={
        "name": "Hacker Admin",
        "email": "hacker_admin@fake.com",
        "password": "Password@123",
        "role": "admin"
    })
    assert_test(admin_signup.status_code == 403, "Public signup with role 'admin' returns 403 Forbidden", f"Got {admin_signup.status_code}: {admin_signup.text}")

    # Attempting to register as 'Admin' (case-insensitive check)
    admin_cap_signup = client.post("/api/auth/signup", json={
        "name": "Hacker Admin 2",
        "email": "hacker_admin2@fake.com",
        "password": "Password@123",
        "role": "Admin"
    })
    assert_test(admin_cap_signup.status_code == 403, "Public signup with role 'Admin' returns 403 Forbidden", f"Got {admin_cap_signup.status_code}")

    # Attempting to register as 'field_officer'
    fo_signup = client.post("/api/auth/signup", json={
        "name": "Self Appointed FO",
        "email": "self_fo@fake.com",
        "password": "Password@123",
        "role": "field_officer"
    })
    assert_test(fo_signup.status_code == 403, "Public signup with role 'field_officer' returns 403 Forbidden", f"Got {fo_signup.status_code}: {fo_signup.text}")

    # Attempting to register as 'Field Officer' (with spaces)
    fo_space_signup = client.post("/api/auth/signup", json={
        "name": "Self Appointed FO 2",
        "email": "self_fo2@fake.com",
        "password": "Password@123",
        "role": "Field Officer"
    })
    assert_test(fo_space_signup.status_code == 403, "Public signup with role 'Field Officer' returns 403 Forbidden", f"Got {fo_space_signup.status_code}")

    # Successful public signup as 'driver'
    ts = int(time.time())
    driver_test_email = f"new_driver_{ts}@nextra.test"
    driver_signup = client.post("/api/auth/signup", json={
        "name": "Phase 3 New Driver",
        "email": driver_test_email,
        "password": "NewDriver@123",
        "role": "driver",
        "phone": "+91 9876543210",
        "assigned_state": "Assam"
    })
    assert_test(driver_signup.status_code == 200, "Public signup with role 'driver' returns 200 OK", f"Got {driver_signup.status_code}: {driver_signup.text}")
    if driver_signup.status_code == 200:
        new_d_data = driver_signup.json()
        assert_test("access_token" in new_d_data, "New driver received JWT token")
        assert_test(new_d_data["user"]["role"] == "driver", "New user role is 'driver'")

    # Duplicate email check
    dup_signup = client.post("/api/auth/signup", json={
        "name": "Duplicate Driver",
        "email": driver_test_email,
        "password": "NewDriver@123",
        "role": "driver"
    })
    assert_test(dup_signup.status_code == 409, "Duplicate email returns 409 Conflict", f"Got {dup_signup.status_code}")

    # ─────────────────────────────────────────────────────────────
    # TEST 4: Admin Ability to Create Field Officers
    # ─────────────────────────────────────────────────────────────
    print("\n--- 4. Testing Admin Provisioning of Field Officers ---")
    admin_hdr = {"Authorization": f"Bearer {tokens['admin']}"}
    new_fo_email = f"new_fo_{ts}@nextra.test"
    create_fo_res = client.post("/api/users/field-officers", headers=admin_hdr, json={
        "name": "Rupen Bora",
        "email": new_fo_email,
        "password": "NewOfficer@123",
        "phone": "+91 9800000099",
        "assigned_state": "Assam",
        "assigned_district": "Dibrugarh",
        "officer_id": f"FO-ASM-{ts % 10000:04d}"
    })
    assert_test(create_fo_res.status_code == 200, "Admin can create Field Officer (200 OK)", f"Got {create_fo_res.status_code}: {create_fo_res.text}")

    if create_fo_res.status_code == 200:
        fo_created = create_fo_res.json()
        assert_test(fo_created["role"] == "field_officer", "Created user role is 'field_officer'")
        assert_test(fo_created["assigned_state"] == "Assam", "Assigned state is 'Assam'")

        # Verify linked FieldOfficerProfile was created in DB
        db = SessionLocal()
        db_fo = db.query(User).filter(User.email == new_fo_email).first()
        assert_test(db_fo is not None and db_fo.field_officer_profile is not None, "FieldOfficerProfile relationship successfully linked in DB")
        db.close()

        # Test login with newly created Field Officer credentials
        new_fo_login = client.post("/api/auth/login", json={"email": new_fo_email, "password": "NewOfficer@123"})
        assert_test(new_fo_login.status_code == 200, "Newly created Field Officer can log in successfully", f"Got {new_fo_login.status_code}")
        if new_fo_login.status_code == 200:
            assert_test(new_fo_login.json()["user"]["role"] == "field_officer", "New Field Officer logged in with role 'field_officer'")

    # ─────────────────────────────────────────────────────────────
    # TEST 5: Backend Role-Based Access Control (RBAC) Enforcement
    # ─────────────────────────────────────────────────────────────
    print("\n--- 5. Testing Role-Based Access Control Enforcement ---")
    driver_hdr = {"Authorization": f"Bearer {tokens['driver']}"}
    fo_hdr = {"Authorization": f"Bearer {tokens['field_officer']}"}
    logistics_hdr = {"Authorization": f"Bearer {tokens['logistics']}"}

    # 5.1 Unauthenticated requests to protected endpoints
    unauth_me = client.get("/api/auth/me")
    assert_test(unauth_me.status_code in [401, 403], "Unauthenticated GET /api/auth/me denied (401/403)", f"Got {unauth_me.status_code}")

    unauth_users = client.get("/api/users")
    assert_test(unauth_users.status_code in [401, 403], "Unauthenticated GET /api/users denied (401/403)", f"Got {unauth_users.status_code}")

    unauth_audit = client.get("/api/audit-logs")
    assert_test(unauth_audit.status_code in [401, 403], "Unauthenticated GET /api/audit-logs denied (401/403)", f"Got {unauth_audit.status_code}")

    # 5.2 Driver attempting Admin-only actions
    drv_create_fo = client.post("/api/users/field-officers", headers=driver_hdr, json={
        "name": "Unauthorized FO",
        "email": "unauth_fo@fake.com",
        "password": "Password@123",
        "assigned_state": "Assam"
    })
    assert_test(drv_create_fo.status_code == 403, "Driver attempting POST /api/users/field-officers returns 403 Forbidden", f"Got {drv_create_fo.status_code}")

    drv_audit = client.get("/api/audit-logs", headers=driver_hdr)
    assert_test(drv_audit.status_code == 403, "Driver attempting GET /api/audit-logs returns 403 Forbidden", f"Got {drv_audit.status_code}")

    drv_recalc = client.post("/api/risks/recalculate", headers=driver_hdr)
    assert_test(drv_recalc.status_code == 403, "Driver attempting POST /api/risks/recalculate returns 403 Forbidden", f"Got {drv_recalc.status_code}")

    # 5.3 Driver attempting Verification actions (Admin/Field Officer only)
    drv_verif = client.get("/api/verification", headers=driver_hdr)
    assert_test(drv_verif.status_code == 403, "Driver attempting GET /api/verification returns 403 Forbidden", f"Got {drv_verif.status_code}")

    drv_decide = client.post("/api/verification/1/decide", headers=driver_hdr, json={"status": "VERIFIED", "remarks": "Driver hack"})
    assert_test(drv_decide.status_code == 403, "Driver attempting POST /api/verification/1/decide returns 403 Forbidden", f"Got {drv_decide.status_code}")

    # 5.4 Driver attempting Shipment creation (Admin/Logistics only)
    drv_shipment = client.post("/api/shipments", headers=driver_hdr, json={
        "cargo_type": "Illegal Cargo",
        "weight_kg": 500.0,
        "pickup_location": "Guwahati",
        "destination": "Shillong"
    })
    assert_test(drv_shipment.status_code == 403, "Driver attempting POST /api/shipments returns 403 Forbidden", f"Got {drv_shipment.status_code}")

    # 5.5 Field Officer attempting Admin-only actions
    fo_create_fo = client.post("/api/users/field-officers", headers=fo_hdr, json={
        "name": "Another FO",
        "email": "another_fo@fake.com",
        "password": "Password@123",
        "assigned_state": "Assam"
    })
    assert_test(fo_create_fo.status_code == 403, "Field Officer attempting POST /api/users/field-officers returns 403 Forbidden", f"Got {fo_create_fo.status_code}")

    fo_audit = client.get("/api/audit-logs", headers=fo_hdr)
    assert_test(fo_audit.status_code == 403, "Field Officer attempting GET /api/audit-logs returns 403 Forbidden", f"Got {fo_audit.status_code}")

    # 5.6 Field Officer accessing Verification (Permitted for Field Officer)
    fo_verif = client.get("/api/verification", headers=fo_hdr)
    assert_test(fo_verif.status_code == 200, "Field Officer permitted GET /api/verification (200 OK)", f"Got {fo_verif.status_code}")

    # 5.7 Logistics attempting Verification actions (Forbidden)
    log_verif = client.get("/api/verification", headers=logistics_hdr)
    assert_test(log_verif.status_code == 403, "Logistics attempting GET /api/verification returns 403 Forbidden", f"Got {log_verif.status_code}")

    # 5.8 Logistics creating Shipment (Permitted for Logistics)
    log_shipment = client.post("/api/shipments", headers=logistics_hdr, json={
        "cargo_type": "Pharmaceuticals",
        "weight_kg": 750.0,
        "priority": "HIGH",
        "pickup_location": "Guwahati Hub",
        "destination": "Shillong Medical Store",
        "corridor": "NH-6",
        "eta": "4 hrs"
    })
    assert_test(log_shipment.status_code == 200, "Logistics permitted POST /api/shipments (200 OK)", f"Got {log_shipment.status_code}: {log_shipment.text}")

    # 5.9 Admin accessing Audit Logs (Permitted for Admin)
    admin_audit = client.get("/api/audit-logs", headers=admin_hdr)
    assert_test(admin_audit.status_code == 200, "Admin permitted GET /api/audit-logs (200 OK)", f"Got {admin_audit.status_code}")

    # ─────────────────────────────────────────────────────────────
    # SUMMARY
    # ─────────────────────────────────────────────────────────────
    print("\n" + "=" * 65)
    print(f"  TEST SUMMARY: {PASSED} Passed, {FAILED} Failed (Total: {PASSED + FAILED})")
    print("=" * 65)

    if FAILED > 0:
        sys.exit(1)


if __name__ == "__main__":
    run_all_tests()
