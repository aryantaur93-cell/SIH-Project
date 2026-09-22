import urllib.request
import json

login_req = urllib.request.Request(
    'http://127.0.0.1:8000/api/auth/login',
    data=json.dumps({'email': 'admin@nextra.demo', 'password': 'Admin@123'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
token = json.loads(urllib.request.urlopen(login_req).read().decode())['access_token']

# Areas
areas_req = urllib.request.Request(
    'http://127.0.0.1:8000/api/risks/areas',
    headers={'Authorization': f'Bearer {token}'}
)
areas = json.loads(urllib.request.urlopen(areas_req).read().decode())
print(f'AREAS RETURNED: {len(areas)}')
for a in areas:
    print(f"  [{a['state']}] Score: {a['risk_score']} ({a['risk_level']}) | Reason: {a['reason']}")
    print(f"    Factors: {a['contributing_factors']}")
    print(f"    Action: {a['recommended_action'][:60]}...")

# Routes
routes_req = urllib.request.Request(
    'http://127.0.0.1:8000/api/risks/routes',
    headers={'Authorization': f'Bearer {token}'}
)
routes = json.loads(urllib.request.urlopen(routes_req).read().decode())
print(f'\nROUTES RETURNED: {len(routes)}')
for r in routes:
    print(f"  [{r['corridor_code']}] {r['route_name']} -> Score: {r['risk_score']} ({r['risk_level']})")
