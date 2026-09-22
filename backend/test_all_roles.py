import urllib.request
import json

roles = [
    ("admin@nextra.demo", "Admin@123", "admin"),
    ("officer@nextra.demo", "Officer@123", "field_officer"),
    ("logistics@nextra.demo", "Logistics@123", "logistics"),
    ("driver@nextra.demo", "Driver@123", "driver")
]

for email, password, expected_role in roles:
    login_req = urllib.request.Request(
        "http://127.0.0.1:8000/api/auth/login",
        data=json.dumps({"email": email, "password": password}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    res = json.loads(urllib.request.urlopen(login_req).read().decode("utf-8"))
    token = res.get("access_token")
    user = res.get("user")
    role = user["role"]
    assert role == expected_role, f"Role mismatch for {email}: expected {expected_role}, got {role}"

    me_req = urllib.request.Request("http://127.0.0.1:8000/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    me_res = json.loads(urllib.request.urlopen(me_req).read().decode("utf-8"))
    assert me_res["email"] == email

    map_req = urllib.request.Request("http://127.0.0.1:8000/api/map/overview", headers={"Authorization": f"Bearer {token}"})
    map_res = json.loads(urllib.request.urlopen(map_req).read().decode("utf-8"))
    v_len = len(map_res["vehicles"])
    s_len = len(map_res["shipments"])
    r_len = len(map_res["regions"])
    print(f"PASS: {expected_role:14} authenticated ({email}). Map entities: {v_len} vehicles, {s_len} shipments, {r_len} regions.")

print("\nALL 4 ROLES AUTHENTICATED AND AUTHORIZED SUCCESSFULLY!")
