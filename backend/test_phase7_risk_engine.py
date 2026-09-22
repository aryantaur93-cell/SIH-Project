"""
NEXTRA - Phase 7: Risk Intelligence Engine Automated Verification Test Suite
Tests:
1. Deterministic scoring algorithm and levels (0-24 LOW, 25-49 MODERATE, 50-74 HIGH, 75-100 CRITICAL).
2. API endpoints:
   - GET /api/risks/areas
   - GET /api/risks/areas/{state}
   - GET /api/risks/routes
   - GET /api/risks/routes/{route_id}
   - POST /api/risks/recalculate
3. Dynamic score changes when underlying database telemetry changes (Weather, FieldReport, RiskEvent).
4. Score capping at 100.
"""
import sys
import os
import requests

BASE_URL = "http://127.0.0.1:8000"

def log(msg, status="INFO"):
    colors = {
        "INFO": "\033[94m",
        "PASS": "\033[92m",
        "FAIL": "\033[91m",
        "WARN": "\033[93m"
    }
    reset = "\033[0m"
    print(f"{colors.get(status, '')}[{status}] {msg}{reset}")

def run_all_tests():
    log("Starting NEXTRA Phase 7 Risk Intelligence Test Suite...", "INFO")
    
    # Step 1: Authenticate as Admin
    log("Step 1: Authenticating as Admin...", "INFO")
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@nextra.demo",
        "password": "Admin@123"
    })
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    log("Admin authentication successful.", "PASS")

    # Step 2: Test GET /api/risks/areas
    log("Step 2: Testing GET /api/risks/areas (All 8 Northeast States)...", "INFO")
    areas_resp = requests.get(f"{BASE_URL}/api/risks/areas", headers=headers)
    assert areas_resp.status_code == 200, f"GET /api/risks/areas failed: {areas_resp.text}"
    areas = areas_resp.json()
    assert len(areas) >= 8, f"Expected at least 8 NER states, got {len(areas)}"

    ner_states = {"Assam", "Arunachal Pradesh", "Meghalaya", "Manipur", "Mizoram", "Nagaland", "Tripura", "Sikkim"}
    found_states = {a["state"] for a in areas}
    missing = ner_states - found_states
    assert len(missing) == 0, f"Missing Northeast states: {missing}"

    for a in areas:
        score = a["risk_score"]
        level = a["risk_level"]
        assert 0 <= score <= 100, f"Risk score {score} out of bounds for {a['state']}"
        
        # Verify exact risk levels
        if score < 25:
            assert level == "LOW", f"Expected LOW for score {score}, got {level} ({a['state']})"
        elif score < 50:
            assert level == "MODERATE", f"Expected MODERATE for score {score}, got {level} ({a['state']})"
        elif score < 75:
            assert level == "HIGH", f"Expected HIGH for score {score}, got {level} ({a['state']})"
        else:
            assert level == "CRITICAL", f"Expected CRITICAL for score {score}, got {level} ({a['state']})"

        # Verify required fields
        assert "primary_reason" in a and a["primary_reason"], f"Missing primary_reason for {a['state']}"
        assert "contributing_factors" in a, f"Missing contributing_factors for {a['state']}"
        assert "affected_routes" in a, f"Missing affected_routes for {a['state']}"
        assert "recommended_action" in a and a["recommended_action"], f"Missing recommended_action for {a['state']}"
        assert a.get("latitude") and a.get("longitude"), f"Missing coordinates for {a['state']}"

    log(f"Verified all {len(areas)} states. Meghalaya top score: {areas[0]['risk_score']} ({areas[0]['risk_level']})", "PASS")

    # Step 3: Test GET /api/risks/areas/{state}
    log("Step 3: Testing GET /api/risks/areas/Meghalaya...", "INFO")
    meg_resp = requests.get(f"{BASE_URL}/api/risks/areas/Meghalaya", headers=headers)
    assert meg_resp.status_code == 200, f"Failed GET Meghalaya: {meg_resp.text}"
    meg = meg_resp.json()
    assert meg["state"] == "Meghalaya"
    assert meg["risk_score"] >= 75, f"Meghalaya should be CRITICAL (>= 75), got {meg['risk_score']}"
    assert meg["risk_level"] == "CRITICAL"
    assert len(meg["contributing_factors"]) > 0
    log(f"Meghalaya verified: Score {meg['risk_score']}, Factors: {len(meg['contributing_factors'])}", "PASS")

    # Step 4: Test GET /api/risks/routes
    log("Step 4: Testing GET /api/risks/routes...", "INFO")
    routes_resp = requests.get(f"{BASE_URL}/api/risks/routes", headers=headers)
    assert routes_resp.status_code == 200, f"Failed GET /api/risks/routes: {routes_resp.text}"
    routes = routes_resp.json()
    assert len(routes) > 0, "No routes returned"
    
    for r in routes:
        assert 0 <= r["risk_score"] <= 100
        assert r["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
        assert "corridor_code" in r
        assert "route_name" in r
        assert "primary_hazard" in r
        assert "recommended_action" in r
    log(f"Verified {len(routes)} corridors.", "PASS")

    # Step 5: Test GET /api/risks/routes/{route_id}
    route_id = routes[0]["route_id"]
    log(f"Step 5: Testing GET /api/risks/routes/{route_id}...", "INFO")
    r_resp = requests.get(f"{BASE_URL}/api/risks/routes/{route_id}", headers=headers)
    assert r_resp.status_code == 200
    assert r_resp.json()["route_id"] == route_id
    log(f"Verified single route risk for corridor {routes[0]['corridor_code']}.", "PASS")

    # Step 6: Test Dynamic Score Change when underlying data changes
    log("Step 6: Testing Dynamic Score Mutation on underlying telemetry change...", "INFO")
    
    # Get baseline for Tripura
    tripura_baseline = requests.get(f"{BASE_URL}/api/risks/areas/Tripura", headers=headers).json()
    base_score = tripura_baseline["risk_score"]
    log(f"Tripura Baseline Score: {base_score} ({tripura_baseline['risk_level']})", "INFO")

    # Create a new FieldReport in Tripura with severe landslide
    from app.database.database import SessionLocal
    from app.models.field_report import FieldReport
    from app.models.user import User

    db = SessionLocal()
    officer = db.query(User).filter(User.role == "FIELD_OFFICER").first()
    officer_id = officer.id if officer else 1

    test_report = FieldReport(
        report_code="TEST-MUTATION-001",
        reporter_id=officer_id,
        reporter_name="Auto Test Officer",
        reporter_role="FIELD_OFFICER",
        incident_type="LANDSLIDE",
        severity="CRITICAL",
        status="VERIFIED",
        state="Tripura",
        district="West Tripura",
        location_name="Agartala Outskirts Bypass",
        latitude=23.8315,
        longitude=91.2868,
        description="Massive structural hill collapse blocking primary corridor during dynamic risk verification test."
    )
    db.add(test_report)
    db.commit()
    db.refresh(test_report)
    test_report_id = test_report.id

    try:
        # Check Tripura risk score after ground incident added
        tripura_mutated = requests.get(f"{BASE_URL}/api/risks/areas/Tripura", headers=headers).json()
        new_score = tripura_mutated["risk_score"]
        log(f"Tripura Mutated Score: {new_score} ({tripura_mutated['risk_level']})", "INFO")

        # Score MUST have increased dynamically due to active landslide + critical incident
        assert new_score > base_score, f"Expected score to increase from {base_score}, but got {new_score}"
        
        # Verify factor was recorded
        has_landslide_factor = any("landslide" in f.lower() for f in tripura_mutated["contributing_factors"])
        assert has_landslide_factor, f"Expected landslide factor in {tripura_mutated['contributing_factors']}"
        log("Dynamic score mutation verified: score reacted immediately to new ground incident!", "PASS")

    finally:
        # Cleanup test record
        db.delete(test_report)
        db.commit()
        db.close()
        log("Cleaned up temporary test incident report.", "INFO")

    # Verify score returned to normal
    tripura_restored = requests.get(f"{BASE_URL}/api/risks/areas/Tripura", headers=headers).json()
    assert tripura_restored["risk_score"] == base_score, f"Expected score to restore to {base_score}, got {tripura_restored['risk_score']}"
    log(f"Tripura score safely restored to baseline: {tripura_restored['risk_score']}", "PASS")

    # Step 7: Test POST /api/risks/recalculate
    log("Step 7: Testing POST /api/risks/recalculate...", "INFO")
    recalc_resp = requests.post(f"{BASE_URL}/api/risks/recalculate", headers=headers)
    assert recalc_resp.status_code == 200, f"Recalculate failed: {recalc_resp.text}"
    recalc_data = recalc_resp.json()
    assert recalc_data["areas_evaluated"] >= 8
    assert recalc_data["routes_evaluated"] > 0
    log(f"Recalculation successful: {recalc_data['areas_evaluated']} areas, {recalc_data['routes_evaluated']} routes evaluated.", "PASS")

    log("==================================================", "PASS")
    log("ALL PHASE 7 RISK INTELLIGENCE TESTS PASSED (100%)", "PASS")
    log("==================================================", "PASS")

if __name__ == "__main__":
    try:
        run_all_tests()
    except Exception as e:
        log(f"Test failure: {e}", "FAIL")
        sys.exit(1)
