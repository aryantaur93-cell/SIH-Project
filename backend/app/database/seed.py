"""
NEXTRA - Database Seed Script
Creates tables and populates realistic, relationally connected demo data.
Supports idempotent execution and --reset flag.
Run: python -m app.database.seed [--reset] (from backend/ directory)
"""
import json
import sys
import os
from datetime import datetime

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database.database import engine, SessionLocal, Base, create_tables
from app.core.security import hash_password
from app.models.user import User
from app.models.field_officer import FieldOfficerProfile
from app.models.region import Region
from app.models.driver import Driver
from app.models.vehicle import Vehicle
from app.models.shipment import Shipment
from app.models.route import Route
from app.models.risk import RiskEvent
from app.models.field_report import FieldReport
from app.models.verification import Verification
from app.models.notification import Notification
from app.models.alert import Alert
from app.models.weather import WeatherData
from app.models.audit_log import AuditLog


def seed_database(reset: bool = False):
    """Main seed function - fully idempotent."""
    print("[NEXTRA] Database Seed Script")
    print("=" * 55)

    if reset:
        print("[RESET] Dropping existing database tables...")
        Base.metadata.drop_all(bind=engine)

    # Create all tables if they don't exist
    create_tables()
    print("[OK] Tables verified / created")

    db = SessionLocal()

    try:
        # Check if already seeded
        existing_users = db.query(User).count()
        existing_fo_profiles = db.query(FieldOfficerProfile).count()
        if existing_users > 0 and existing_fo_profiles > 0 and not reset:
            print(f"⚠️  Database already populated ({existing_users} users, {existing_fo_profiles} field officer profiles).")
            print("   Idempotent check passed. Database is ready.")
            print_counts(db)
            return

        # If existing users exist but FO profiles are missing, clean up and re-seed
        if existing_users > 0 and existing_fo_profiles == 0 and not reset:
            print("🔄 Migrating existing database to include connected Field Officer profiles...")
            Base.metadata.drop_all(bind=engine)
            create_tables()

        # === 1. USERS ===
        print("\n📋 1. Seeding Users (Admin, 8 Field Officers, Logistics, Driver)...")
        users_data = [
            {"name": "NEXTRA Administrator", "email": "admin@nextra.demo", "password": "Admin@123", "role": "admin", "phone": "+91 9800000001", "assigned_state": "ALL", "assigned_district": "ALL", "is_demo": 1},
            {"name": "Arjun Mehta", "email": "officer@nextra.demo", "password": "Officer@123", "role": "field_officer", "phone": "+91 9800000002", "assigned_state": "Assam", "assigned_district": "Kamrup", "officer_id": "FO-ASM-001", "is_demo": 1},
            {"name": "Rahul Verma", "email": "logistics@nextra.demo", "password": "Logistics@123", "role": "logistics", "phone": "+91 9800000003", "assigned_state": "ALL", "assigned_district": "ALL", "is_demo": 1},
            {"name": "Aman Kumar", "email": "driver@nextra.demo", "password": "Driver@123", "role": "driver", "phone": "+91 9800000004", "assigned_state": "Assam", "assigned_district": "Kamrup", "is_demo": 1},
            # Additional field officers across all 8 NER states
            {"name": "Bhaskar Deka", "email": "bhaskar.fo@nextra.demo", "password": "Officer@123", "role": "field_officer", "phone": "+91 9800000005", "assigned_state": "Assam", "assigned_district": "Nagaon", "officer_id": "FO-ASM-002", "is_demo": 1},
            {"name": "Tashi Wangchuk", "email": "tashi.fo@nextra.demo", "password": "Officer@123", "role": "field_officer", "phone": "+91 9800000006", "assigned_state": "Sikkim", "assigned_district": "East Sikkim", "officer_id": "FO-SKM-001", "is_demo": 1},
            {"name": "Kevi Angami", "email": "kevi.fo@nextra.demo", "password": "Officer@123", "role": "field_officer", "phone": "+91 9800000007", "assigned_state": "Nagaland", "assigned_district": "Kohima", "officer_id": "FO-NGL-001", "is_demo": 1},
            {"name": "Priya Sharma", "email": "priya.fo@nextra.demo", "password": "Officer@123", "role": "field_officer", "phone": "+91 9800000008", "assigned_state": "Meghalaya", "assigned_district": "East Khasi Hills", "officer_id": "FO-MEG-001", "is_demo": 1},
            {"name": "David Lalrinsanga", "email": "david.fo@nextra.demo", "password": "Officer@123", "role": "field_officer", "phone": "+91 9800000009", "assigned_state": "Mizoram", "assigned_district": "Aizawl", "officer_id": "FO-MIZ-001", "is_demo": 1},
            {"name": "Ranjit Debbarma", "email": "ranjit.fo@nextra.demo", "password": "Officer@123", "role": "field_officer", "phone": "+91 9800000010", "assigned_state": "Tripura", "assigned_district": "West Tripura", "officer_id": "FO-TRP-001", "is_demo": 1},
            {"name": "Nabam Taki", "email": "nabam.fo@nextra.demo", "password": "Officer@123", "role": "field_officer", "phone": "+91 9800000011", "assigned_state": "Arunachal Pradesh", "assigned_district": "Papum Pare", "officer_id": "FO-ARP-001", "is_demo": 1},
            {"name": "Tomba Singh", "email": "tomba.fo@nextra.demo", "password": "Officer@123", "role": "field_officer", "phone": "+91 9800000012", "assigned_state": "Manipur", "assigned_district": "Imphal West", "officer_id": "FO-MNP-001", "is_demo": 1},
        ]
        user_objects = []
        for u in users_data:
            user = User(
                name=u["name"], email=u["email"],
                hashed_password=hash_password(u["password"]),
                role=u["role"], phone=u.get("phone"),
                assigned_state=u.get("assigned_state", "ALL"),
                assigned_district=u.get("assigned_district", "ALL"),
                officer_id=u.get("officer_id"),
                is_demo=u.get("is_demo", 0), status="ACTIVE"
            )
            db.add(user)
            user_objects.append(user)
        db.flush()
        print(f"   ✅ {len(user_objects)} users created")

        # === 2. REGIONS (All 8 NER States) ===
        print("📋 2. Seeding Regions (8 Northeast States)...")
        regions_data = [
            {"state": "Assam", "name": "Assam Sector", "center_lat": 26.2006, "center_lng": 92.9376, "zoom_level": 7.5, "risk_level": "LOW", "accessibility_score": 88, "road_status": "All Primary Corridors Open", "description": "Gateway hub to NE; Brahmaputra logistics corridor"},
            {"state": "Meghalaya", "name": "Meghalaya Sector", "center_lat": 25.5788, "center_lng": 91.8933, "zoom_level": 8.5, "risk_level": "HIGH", "accessibility_score": 64, "road_status": "NH-6 Sonapur Tunnel Blocked; Single Lane Reroute Active", "description": "High altitude plateau; NH-6 mountain lifeline"},
            {"state": "Arunachal Pradesh", "name": "Arunachal Pradesh Sector", "center_lat": 27.50, "center_lng": 94.00, "zoom_level": 7.5, "risk_level": "HIGH", "accessibility_score": 48, "road_status": "Sela Pass restricted to 4x4 vehicles with chains", "description": "Himalayan frontier corridor & high passes"},
            {"state": "Nagaland", "name": "Nagaland Sector", "center_lat": 25.80, "center_lng": 94.20, "zoom_level": 8.5, "risk_level": "MODERATE", "accessibility_score": 62, "road_status": "NH-29 Alternating One-Way Traffic", "description": "Mountain supply ridge linking Dimapur & Kohima"},
            {"state": "Manipur", "name": "Manipur Sector", "center_lat": 24.8170, "center_lng": 93.9368, "zoom_level": 8.5, "risk_level": "LOW", "accessibility_score": 69, "road_status": "NH-37 & NH-2 Open", "description": "Imphal valley terminal & southern arterial routes"},
            {"state": "Mizoram", "name": "Mizoram Sector", "center_lat": 23.40, "center_lng": 92.80, "zoom_level": 8.5, "risk_level": "LOW", "accessibility_score": 60, "road_status": "NH-306 Silchar-Aizawl clear", "description": "Southern hill spine & border corridors"},
            {"state": "Tripura", "name": "Tripura Sector", "center_lat": 23.8315, "center_lng": 91.2868, "zoom_level": 8.5, "risk_level": "LOW", "accessibility_score": 78, "road_status": "NH-8 fully open", "description": "Agartala cross-border multi-modal terminal"},
            {"state": "Sikkim", "name": "Sikkim Sector", "center_lat": 27.45, "center_lng": 88.55, "zoom_level": 8.5, "risk_level": "MODERATE", "accessibility_score": 58, "road_status": "NH-10 Open with Rockfall Precautions", "description": "Eastern Himalayan corridor & Teesta river gorge"},
        ]
        region_map = {}
        for r in regions_data:
            reg = Region(**r)
            db.add(reg)
            db.flush()
            region_map[reg.state] = reg
        print(f"   ✅ {len(region_map)} regions created")

        # === 3. FIELD OFFICER PROFILES ===
        print("📋 3. Seeding Field Officer Profiles (Connected User -> FieldOfficerProfile -> Region)...")
        fo_users = [u for u in user_objects if u.role == "field_officer"]
        station_names = {
            "Assam": "Guwahati Central Highway Monitoring Base",
            "Meghalaya": "Shillong Mountain Ridge Command Post",
            "Arunachal Pradesh": "Itanagar Border Roads Desk",
            "Nagaland": "Kohima Mountain Pass Sub-Station",
            "Manipur": "Imphal Highway Command Cell",
            "Mizoram": "Aizawl Southern Ridge Station",
            "Tripura": "Agartala Valley Checkpost",
            "Sikkim": "Gangtok High-Altitude Transit Unit",
        }
        for fo in fo_users:
            reg = region_map.get(fo.assigned_state)
            fo_profile = FieldOfficerProfile(
                user_id=fo.id,
                officer_badge=fo.officer_id or f"FO-{fo.id:03d}",
                assigned_state=fo.assigned_state,
                assigned_district=fo.assigned_district,
                region_id=reg.id if reg else None,
                station_name=station_names.get(fo.assigned_state, f"{fo.assigned_state} Field Desk"),
                contact_number=fo.phone,
                rank="Senior Sector Ground Inspector" if fo.assigned_state == "Assam" else "Regional Field Officer",
                active_reports_count=1 if fo.assigned_state in ["Assam", "Meghalaya", "Sikkim"] else 0,
            )
            db.add(fo_profile)
        db.flush()
        print(f"   ✅ {len(fo_users)} field officer profiles created")

        # === 4. DRIVERS (30 drivers geographically distributed across NER) ===
        print("📋 4. Seeding 30 Drivers (Distributed across 8 NER states)...")
        drivers_data = [
            # Assam (8 drivers)
            {"driver_code": "DRV-001", "name": "Rahul Borah", "phone": "+91 94350-12841", "license_number": "AS01-2018-84192", "assigned_state": "Assam", "assigned_district": "Kamrup", "experience_years": 9, "rating": 4.9, "safety_score": 98, "status": "ACTIVE"},
            {"driver_code": "DRV-002", "name": "Bikramjeet Chutia", "phone": "+91 94350-29314", "license_number": "AS03-2015-11029", "assigned_state": "Assam", "assigned_district": "Nagaon", "experience_years": 12, "rating": 4.8, "safety_score": 96, "status": "ACTIVE"},
            {"driver_code": "DRV-003", "name": "Pranab Kalita", "phone": "+91 98540-88312", "license_number": "AS01-2012-77291", "assigned_state": "Assam", "assigned_district": "Kamrup", "experience_years": 14, "rating": 4.7, "safety_score": 94, "status": "DELAYED"},
            {"driver_code": "DRV-004", "name": "Jitul Bora", "phone": "+91 94350-44123", "license_number": "AS06-2020-33418", "assigned_state": "Assam", "assigned_district": "Dibrugarh", "experience_years": 6, "rating": 4.6, "safety_score": 92, "status": "ACTIVE"},
            {"driver_code": "DRV-005", "name": "Hirak Barua", "phone": "+91 98540-55234", "license_number": "AS04-2019-99201", "assigned_state": "Assam", "assigned_district": "Tinsukia", "experience_years": 8, "rating": 4.5, "safety_score": 93, "status": "IDLE"},
            {"driver_code": "DRV-006", "name": "Manash Das", "phone": "+91 94350-66345", "license_number": "AS02-2017-55102", "assigned_state": "Assam", "assigned_district": "Jorhat", "experience_years": 10, "rating": 4.8, "safety_score": 97, "status": "ACTIVE"},
            {"driver_code": "DRV-007", "name": "Dipankar Saikia", "phone": "+91 98540-77456", "license_number": "AS11-2016-44910", "assigned_state": "Assam", "assigned_district": "Silchar", "experience_years": 7, "rating": 4.4, "safety_score": 91, "status": "OFFLINE"},
            {"driver_code": "DRV-008", "name": "Ratul Hazarika", "phone": "+91 94350-88567", "license_number": "AS19-2021-12093", "assigned_state": "Assam", "assigned_district": "Bongaigaon", "experience_years": 5, "rating": 4.6, "safety_score": 94, "status": "ACTIVE"},
            # Meghalaya (4 drivers)
            {"driver_code": "DRV-009", "name": "Bankitlang Marwein", "phone": "+91 98620-11234", "license_number": "ML05-2016-33921", "assigned_state": "Meghalaya", "assigned_district": "East Khasi Hills", "experience_years": 11, "rating": 4.7, "safety_score": 95, "status": "ACTIVE"},
            {"driver_code": "DRV-010", "name": "Lalthan Sanga", "phone": "+91 98625-10293", "license_number": "ML08-2019-88192", "assigned_state": "Meghalaya", "assigned_district": "West Garo Hills", "experience_years": 8, "rating": 4.8, "safety_score": 97, "status": "IDLE"},
            {"driver_code": "DRV-011", "name": "Donbok Kharlukhi", "phone": "+91 98620-33456", "license_number": "ML11-2014-44102", "assigned_state": "Meghalaya", "assigned_district": "East Jaintia Hills", "experience_years": 13, "rating": 4.9, "safety_score": 98, "status": "ACTIVE"},
            {"driver_code": "DRV-012", "name": "Shemphang Lyngdoh", "phone": "+91 98620-44567", "license_number": "ML10-2020-55192", "assigned_state": "Meghalaya", "assigned_district": "Ri Bhoi", "experience_years": 6, "rating": 4.5, "safety_score": 92, "status": "DELAYED"},
            # Nagaland (3 drivers)
            {"driver_code": "DRV-013", "name": "Meren Ao", "phone": "+91 98630-11234", "license_number": "NL01-2017-12345", "assigned_state": "Nagaland", "assigned_district": "Kohima", "experience_years": 9, "rating": 4.6, "safety_score": 94, "status": "ACTIVE"},
            {"driver_code": "DRV-014", "name": "Atsung Jamir", "phone": "+91 98630-22345", "license_number": "NL07-2019-67890", "assigned_state": "Nagaland", "assigned_district": "Dimapur", "experience_years": 7, "rating": 4.5, "safety_score": 93, "status": "ACTIVE"},
            {"driver_code": "DRV-015", "name": "Thepfulhouvi Solo", "phone": "+91 98630-33456", "license_number": "NL02-2015-11223", "assigned_state": "Nagaland", "assigned_district": "Mokokchung", "experience_years": 10, "rating": 4.7, "safety_score": 96, "status": "IDLE"},
            # Manipur (3 drivers)
            {"driver_code": "DRV-016", "name": "Laishram Thoiba", "phone": "+91 98560-11234", "license_number": "MN01-2018-99881", "assigned_state": "Manipur", "assigned_district": "Imphal West", "experience_years": 8, "rating": 4.6, "safety_score": 94, "status": "ACTIVE"},
            {"driver_code": "DRV-017", "name": "Ningombam Joy", "phone": "+91 98560-22345", "license_number": "MN04-2016-77665", "assigned_state": "Manipur", "assigned_district": "Thoubal", "experience_years": 11, "rating": 4.8, "safety_score": 97, "status": "ACTIVE"},
            {"driver_code": "DRV-018", "name": "Konthoujam Sanjit", "phone": "+91 98560-33456", "license_number": "MN02-2021-33221", "assigned_state": "Manipur", "assigned_district": "Churachandpur", "experience_years": 5, "rating": 4.4, "safety_score": 91, "status": "OFFLINE"},
            # Mizoram (2 drivers)
            {"driver_code": "DRV-019", "name": "Lalremruata Pachuau", "phone": "+91 98640-11234", "license_number": "MZ01-2019-10293", "assigned_state": "Mizoram", "assigned_district": "Aizawl", "experience_years": 7, "rating": 4.5, "safety_score": 93, "status": "ACTIVE"},
            {"driver_code": "DRV-020", "name": "C. Lalthansanga", "phone": "+91 98640-22345", "license_number": "MZ04-2017-88771", "assigned_state": "Mizoram", "assigned_district": "Lunglei", "experience_years": 9, "rating": 4.7, "safety_score": 95, "status": "IDLE"},
            # Tripura (3 drivers)
            {"driver_code": "DRV-021", "name": "Debashis Debbarma", "phone": "+91 94361-55018", "license_number": "TR01-2015-44332", "assigned_state": "Tripura", "assigned_district": "West Tripura", "experience_years": 10, "rating": 4.9, "safety_score": 98, "status": "ACTIVE"},
            {"driver_code": "DRV-022", "name": "Sudhangshu Reang", "phone": "+91 94361-22345", "license_number": "TR03-2020-22110", "assigned_state": "Tripura", "assigned_district": "Dhalai", "experience_years": 6, "rating": 4.4, "safety_score": 90, "status": "ACTIVE"},
            {"driver_code": "DRV-023", "name": "Biplab Sarkar", "phone": "+91 94361-33456", "license_number": "TR02-2018-99001", "assigned_state": "Tripura", "assigned_district": "Unakoti", "experience_years": 8, "rating": 4.6, "safety_score": 94, "status": "MAINTENANCE"},
            # Sikkim (3 drivers)
            {"driver_code": "DRV-024", "name": "Sonam Dorjee", "phone": "+91 98620-41092", "license_number": "SK01-2018-77112", "assigned_state": "Sikkim", "assigned_district": "East Sikkim", "experience_years": 7, "rating": 4.9, "safety_score": 99, "status": "ACTIVE"},
            {"driver_code": "DRV-025", "name": "Tshering Lepcha", "phone": "+91 98620-55234", "license_number": "SK02-2016-66554", "assigned_state": "Sikkim", "assigned_district": "South Sikkim", "experience_years": 9, "rating": 4.7, "safety_score": 96, "status": "ACTIVE"},
            {"driver_code": "DRV-026", "name": "Pema Bhutia", "phone": "+91 98620-66345", "license_number": "SK01-2013-11009", "assigned_state": "Sikkim", "assigned_district": "West Sikkim", "experience_years": 12, "rating": 4.8, "safety_score": 97, "status": "IDLE"},
            # Arunachal Pradesh (4 drivers)
            {"driver_code": "DRV-027", "name": "Taba Haj", "phone": "+91 98510-11234", "license_number": "AR01-2020-55443", "assigned_state": "Arunachal Pradesh", "assigned_district": "Papum Pare", "experience_years": 6, "rating": 4.5, "safety_score": 92, "status": "ACTIVE"},
            {"driver_code": "DRV-028", "name": "Bengia Taku", "phone": "+91 98510-22345", "license_number": "AR02-2016-88776", "assigned_state": "Arunachal Pradesh", "assigned_district": "East Siang", "experience_years": 10, "rating": 4.7, "safety_score": 95, "status": "ACTIVE"},
            {"driver_code": "DRV-029", "name": "Momang Tasing", "phone": "+91 98510-33456", "license_number": "AR06-2018-11229", "assigned_state": "Arunachal Pradesh", "assigned_district": "Tawang", "experience_years": 8, "rating": 4.6, "safety_score": 94, "status": "DELAYED"},
            {"driver_code": "DRV-030", "name": "Kaling Tayeng", "phone": "+91 98510-44567", "license_number": "AR01-2015-33221", "assigned_state": "Arunachal Pradesh", "assigned_district": "West Kameng", "experience_years": 11, "rating": 4.8, "safety_score": 97, "status": "OFFLINE"},
        ]
        driver_objects = []
        for i, d in enumerate(drivers_data):
            drv = Driver(**d)
            if i == 0:
                drv.user_id = user_objects[3].id  # Link Aman Kumar (User) to Driver DRV-001
            db.add(drv)
            driver_objects.append(drv)
        db.flush()
        print(f"   ✅ {len(driver_objects)} drivers created")

        # === 5. VEHICLES (30 vehicles geographically distributed across NER) ===
        print("📋 5. Seeding 30 Vehicles (Connected Driver -> Vehicle)...")
        vehicles_data = [
            # Assam
            {"registration_number": "VX-104", "plate_number": "AS-01-GC-4102", "vehicle_type": "Refrigerated Medium Truck", "capacity_kg": 5000, "latitude": 25.92, "longitude": 91.82, "state": "Assam", "current_location_name": "NH-6 Hill Section", "speed_kmh": 42, "fuel_level": 78, "temperature_celsius": "3.4°C", "status": "ACTIVE"},
            {"registration_number": "NE-7210", "plate_number": "AS-03-EC-7210", "vehicle_type": "Heavy Multi-Axle Carrier", "capacity_kg": 24000, "latitude": 26.05, "longitude": 93.45, "state": "Assam", "current_location_name": "NH-29 Nagaon Foothills", "speed_kmh": 55, "fuel_level": 62, "status": "ACTIVE"},
            {"registration_number": "NE-5532", "plate_number": "ML-05-AB-5532", "vehicle_type": "Heavy Duty Flatbed", "capacity_kg": 28000, "latitude": 25.10, "longitude": 92.35, "state": "Meghalaya", "current_location_name": "Sonapur Staging Depot", "speed_kmh": 0, "fuel_level": 84, "status": "DELAYED"},
            {"registration_number": "NE-9104", "plate_number": "AS-01-DD-9104", "vehicle_type": "All-Terrain 4x4", "capacity_kg": 6500, "latitude": 27.08, "longitude": 88.48, "state": "Sikkim", "current_location_name": "NH-10 Sevoke Section", "speed_kmh": 35, "fuel_level": 95, "status": "ACTIVE"},
            {"registration_number": "NE-3392", "plate_number": "ML-01-CC-3392", "vehicle_type": "Covered Medium Freight", "capacity_kg": 9000, "latitude": 25.55, "longitude": 91.90, "state": "Meghalaya", "current_location_name": "Shillong Mountain Depot", "speed_kmh": 0, "fuel_level": 90, "status": "IDLE"},
            {"registration_number": "NE-4410", "plate_number": "TR-01-FA-4410", "vehicle_type": "Refrigerated Agri-Van", "capacity_kg": 4000, "latitude": 23.83, "longitude": 91.29, "state": "Tripura", "current_location_name": "Agartala Complex", "speed_kmh": 0, "fuel_level": 88, "temperature_celsius": "4.0°C", "status": "IDLE"},
            {"registration_number": "NE-6601", "plate_number": "AS-01-HH-6601", "vehicle_type": "Heavy Tanker", "capacity_kg": 20000, "latitude": 26.18, "longitude": 91.78, "state": "Assam", "current_location_name": "Guwahati Ring Road", "speed_kmh": 48, "fuel_level": 55, "status": "ACTIVE"},
            {"registration_number": "NE-7702", "plate_number": "AS-04-JJ-7702", "vehicle_type": "Container Carrier", "capacity_kg": 15000, "latitude": 26.60, "longitude": 92.80, "state": "Assam", "current_location_name": "NH-27 Tezpur Section", "speed_kmh": 60, "fuel_level": 72, "status": "ACTIVE"},
            {"registration_number": "NE-8803", "plate_number": "AS-06-KK-8803", "vehicle_type": "Flatbed Trailer", "capacity_kg": 25000, "latitude": 27.48, "longitude": 95.02, "state": "Assam", "current_location_name": "Dibrugarh Terminal", "speed_kmh": 0, "fuel_level": 81, "status": "IDLE"},
            {"registration_number": "NE-1104", "plate_number": "AS-01-LL-1104", "vehicle_type": "Mini Refrigerated Van", "capacity_kg": 3000, "latitude": 24.85, "longitude": 92.78, "state": "Assam", "current_location_name": "Silchar Valley", "speed_kmh": 38, "fuel_level": 67, "temperature_celsius": "2.8°C", "status": "ACTIVE"},
            # Meghalaya
            {"registration_number": "NE-2205", "plate_number": "ML-01-MM-2205", "vehicle_type": "Medium Box Truck", "capacity_kg": 8000, "latitude": 25.52, "longitude": 91.88, "state": "Meghalaya", "current_location_name": "Police Bazar, Shillong", "speed_kmh": 25, "fuel_level": 74, "status": "ACTIVE"},
            {"registration_number": "NE-3306", "plate_number": "ML-05-NN-3306", "vehicle_type": "4x4 Mountain Van", "capacity_kg": 3500, "latitude": 25.30, "longitude": 90.65, "state": "Meghalaya", "current_location_name": "Tura Town", "speed_kmh": 30, "fuel_level": 82, "status": "ACTIVE"},
            # Nagaland
            {"registration_number": "NE-4407", "plate_number": "NL-01-PP-4407", "vehicle_type": "Medium Freight Truck", "capacity_kg": 10000, "latitude": 25.67, "longitude": 94.11, "state": "Nagaland", "current_location_name": "Kohima Town", "speed_kmh": 0, "fuel_level": 91, "status": "IDLE"},
            {"registration_number": "NE-5508", "plate_number": "NL-07-QQ-5508", "vehicle_type": "Heavy Carrier", "capacity_kg": 18000, "latitude": 25.91, "longitude": 93.72, "state": "Nagaland", "current_location_name": "Dimapur Rail Yard", "speed_kmh": 45, "fuel_level": 58, "status": "ACTIVE"},
            {"registration_number": "NE-6609", "plate_number": "NL-04-RR-6609", "vehicle_type": "Covered Van", "capacity_kg": 5000, "latitude": 26.32, "longitude": 94.53, "state": "Nagaland", "current_location_name": "Mokokchung Road", "speed_kmh": 35, "fuel_level": 70, "status": "ACTIVE"},
            # Manipur
            {"registration_number": "NE-7710", "plate_number": "MN-01-SS-7710", "vehicle_type": "Medium Truck", "capacity_kg": 7000, "latitude": 24.80, "longitude": 93.94, "state": "Manipur", "current_location_name": "Imphal Market", "speed_kmh": 20, "fuel_level": 85, "status": "ACTIVE"},
            {"registration_number": "NE-8811", "plate_number": "MN-02-TT-8811", "vehicle_type": "Container Truck", "capacity_kg": 12000, "latitude": 24.42, "longitude": 93.98, "state": "Manipur", "current_location_name": "Churachandpur Depot", "speed_kmh": 40, "fuel_level": 63, "status": "ACTIVE"},
            {"registration_number": "NE-9912", "plate_number": "MN-01-UU-9912", "vehicle_type": "4x4 Utility", "capacity_kg": 2500, "latitude": 25.03, "longitude": 94.10, "state": "Manipur", "current_location_name": "NH-37 Kangpokpi", "speed_kmh": 0, "fuel_level": 45, "status": "MAINTENANCE"},
            # Mizoram
            {"registration_number": "NE-1013", "plate_number": "MZ-01-VV-1013", "vehicle_type": "Medium Freight", "capacity_kg": 6000, "latitude": 23.73, "longitude": 92.72, "state": "Mizoram", "current_location_name": "Aizawl Terminal", "speed_kmh": 0, "fuel_level": 92, "status": "IDLE"},
            {"registration_number": "NE-1114", "plate_number": "MZ-04-WW-1114", "vehicle_type": "Hill Cargo Van", "capacity_kg": 4500, "latitude": 22.87, "longitude": 92.73, "state": "Mizoram", "current_location_name": "Lunglei Road", "speed_kmh": 28, "fuel_level": 71, "status": "ACTIVE"},
            # Tripura
            {"registration_number": "NE-1215", "plate_number": "TR-01-XX-1215", "vehicle_type": "Heavy Multi-Axle", "capacity_kg": 22000, "latitude": 23.84, "longitude": 91.30, "state": "Tripura", "current_location_name": "Agartala Highway", "speed_kmh": 50, "fuel_level": 66, "status": "ACTIVE"},
            {"registration_number": "NE-1316", "plate_number": "TR-03-YY-1316", "vehicle_type": "Refrigerated Van", "capacity_kg": 3500, "latitude": 24.37, "longitude": 92.00, "state": "Tripura", "current_location_name": "Dharmanagar", "speed_kmh": 35, "fuel_level": 79, "temperature_celsius": "3.1°C", "status": "ACTIVE"},
            {"registration_number": "NE-1417", "plate_number": "TR-01-ZZ-1417", "vehicle_type": "Covered Truck", "capacity_kg": 7500, "latitude": 23.55, "longitude": 91.35, "state": "Tripura", "current_location_name": "Udaipur Depot", "speed_kmh": 0, "fuel_level": 88, "status": "IDLE"},
            # Sikkim
            {"registration_number": "NE-1518", "plate_number": "SK-01-AA-1518", "vehicle_type": "4x4 Mountain Transport", "capacity_kg": 5000, "latitude": 27.34, "longitude": 88.61, "state": "Sikkim", "current_location_name": "Gangtok Valley", "speed_kmh": 30, "fuel_level": 76, "status": "ACTIVE"},
            {"registration_number": "NE-1619", "plate_number": "SK-02-BB-1619", "vehicle_type": "Medium Box", "capacity_kg": 6000, "latitude": 27.15, "longitude": 88.50, "state": "Sikkim", "current_location_name": "Rangpo Check Post", "speed_kmh": 42, "fuel_level": 69, "status": "ACTIVE"},
            {"registration_number": "NE-1720", "plate_number": "SK-01-CC-1720", "vehicle_type": "Light Commercial", "capacity_kg": 2000, "latitude": 27.13, "longitude": 88.33, "state": "Sikkim", "current_location_name": "Namchi Hub", "speed_kmh": 0, "fuel_level": 55, "status": "OFFLINE"},
            # Arunachal Pradesh
            {"registration_number": "NE-1821", "plate_number": "AR-01-DD-1821", "vehicle_type": "Heavy 4x4 Carrier", "capacity_kg": 8000, "latitude": 27.08, "longitude": 93.61, "state": "Arunachal Pradesh", "current_location_name": "Itanagar Base", "speed_kmh": 25, "fuel_level": 83, "status": "ACTIVE"},
            {"registration_number": "NE-1922", "plate_number": "AR-02-EE-1922", "vehicle_type": "Medium Mountain Truck", "capacity_kg": 6500, "latitude": 28.22, "longitude": 94.73, "state": "Arunachal Pradesh", "current_location_name": "Pasighat Road", "speed_kmh": 38, "fuel_level": 61, "status": "ACTIVE"},
            {"registration_number": "NE-2023", "plate_number": "AR-06-FF-2023", "vehicle_type": "Snow-Chain 4x4", "capacity_kg": 4000, "latitude": 27.59, "longitude": 91.87, "state": "Arunachal Pradesh", "current_location_name": "Tawang Forward", "speed_kmh": 0, "fuel_level": 47, "status": "DELAYED"},
            {"registration_number": "NE-2124", "plate_number": "AR-01-GG-2124", "vehicle_type": "Light Utility Van", "capacity_kg": 2500, "latitude": 27.35, "longitude": 93.85, "state": "Arunachal Pradesh", "current_location_name": "Ziro Valley", "speed_kmh": 0, "fuel_level": 90, "status": "OFFLINE"},
        ]
        vehicle_objects = []
        for i, v in enumerate(vehicles_data):
            veh = Vehicle(**v)
            if i < len(driver_objects):
                veh.driver_id = driver_objects[i].id
            db.add(veh)
            vehicle_objects.append(veh)
        db.flush()
        print(f"   ✅ {len(vehicle_objects)} vehicles created")

        # === 6. RISK EVENTS ===
        print("📋 6. Seeding Risk Events (Connected Region -> Risk Event)...")
        risks_data = [
            {"state": "Meghalaya", "district": "East Jaintia Hills", "risk_score": 85, "risk_level": "CRITICAL",
             "description": "Massive landslide blocking dual lanes at Sonapur Tunnel approach. BRO heavy machinery deployed.",
             "latitude": 25.10, "longitude": 92.35, "radius_meters": 12000, "event_type": "LANDSLIDE", "active": 1, "source": "FIELD_REPORT",
             "contributing_factors": json.dumps(["Slope Instability", "65mm/hr Rain", "Both Lanes Obstructed"])},
            {"state": "Sikkim", "district": "East Sikkim", "risk_score": 68, "risk_level": "HIGH",
             "description": "Teesta Gorge rockfall between Sevoke and Rangpo. Mesh netting partially compromised.",
             "latitude": 27.17, "longitude": 88.52, "radius_meters": 8000, "event_type": "ROCKFALL", "active": 1, "source": "SYSTEM",
             "contributing_factors": json.dumps(["Loose Shale Strata", "Heavy Gorge Fog", "Single Lane Traffic"])},
            {"state": "Arunachal Pradesh", "district": "Tawang", "risk_score": 74, "risk_level": "HIGH",
             "description": "Sub-zero blizzard and black ice on Sela Pass. Chains required for high-altitude freight.",
             "latitude": 27.50, "longitude": 92.10, "radius_meters": 15000, "event_type": "SNOW", "active": 1, "source": "WEATHER",
             "contributing_factors": json.dumps(["Sub-zero Temperature (-3°C)", "Black Ice", "4x4 Requirement"])},
            {"state": "Assam", "district": "Kamrup", "risk_score": 38, "risk_level": "MODERATE",
             "description": "Saraighat Bridge approach bottleneck. 25-minute freight delay during peak hours.",
             "latitude": 26.18, "longitude": 91.75, "radius_meters": 5000, "event_type": "ROAD_BLOCKAGE", "active": 1, "source": "SYSTEM",
             "contributing_factors": json.dumps(["Heavy Freight Inflow", "Lane Merge Narrowing"])},
            {"state": "Nagaland", "district": "Kohima", "risk_score": 42, "risk_level": "MODERATE",
             "description": "NH-29 hill slip near Zubza. Alternating one-way traffic managed by traffic police.",
             "latitude": 25.72, "longitude": 94.05, "radius_meters": 6000, "event_type": "LANDSLIDE", "active": 1, "source": "FIELD_REPORT",
             "contributing_factors": json.dumps(["Rainfall Saturation", "Hill Slip"])},
        ]
        risk_objects = []
        for rk in risks_data:
            reg = region_map.get(rk["state"])
            risk_obj = RiskEvent(
                region_id=reg.id if reg else None,
                **rk
            )
            db.add(risk_obj)
            risk_objects.append(risk_obj)
        db.flush()
        print(f"   ✅ {len(risk_objects)} risk events created")

        # === 7. ROUTES ===
        print("📋 7. Seeding Arterial Routes (Connected Route -> Risk Event)...")
        routes_data = [
            {"name": "NH-27 East-West Expressway", "origin": "Siliguri", "destination": "Nagaon", "highway": "NH-27", "distance_km": 620, "estimated_hours": 14, "status": "OPEN", "risk_level": "LOW",
             "risk_event_id": risk_objects[3].id,
             "waypoints_json": json.dumps([[26.72, 88.42], [26.50, 90.54], [26.14, 91.74], [26.35, 92.68]])},
            {"name": "NH-6 Mountain Lifeline", "origin": "Guwahati", "destination": "Agartala", "highway": "NH-6", "distance_km": 580, "estimated_hours": 16, "status": "CAUTION", "risk_level": "HIGH",
             "risk_event_id": risk_objects[0].id,  # Linked to Sonapur Landslide
             "waypoints_json": json.dumps([[26.14, 91.74], [25.58, 91.89], [25.44, 92.20], [25.10, 92.35], [24.83, 92.78], [24.20, 92.00], [23.83, 91.29]]),
             "alternate_route_name": "NH-27 via Bongaigaon Bypass"},
            {"name": "NH-29 Mountain Freight Corridor", "origin": "Nagaon", "destination": "Imphal", "highway": "NH-29", "distance_km": 485, "estimated_hours": 13, "status": "OPEN", "risk_level": "MODERATE",
             "risk_event_id": risk_objects[4].id,  # Linked to Zubza hill slip
             "waypoints_json": json.dumps([[26.35, 92.68], [25.90, 93.72], [25.68, 94.11], [24.82, 93.94]])},
            {"name": "NH-10 Teesta Gorge Link", "origin": "Siliguri", "destination": "Gangtok", "highway": "NH-10", "distance_km": 114, "estimated_hours": 4, "status": "CAUTION", "risk_level": "HIGH",
             "risk_event_id": risk_objects[1].id,  # Linked to Teesta rockfall
             "waypoints_json": json.dumps([[26.72, 88.42], [26.88, 88.47], [27.17, 88.52], [27.34, 88.61]])},
            {"name": "NH-8 Tripura Trade Arterial", "origin": "Silchar", "destination": "Agartala", "highway": "NH-8", "distance_km": 310, "estimated_hours": 8, "status": "OPEN", "risk_level": "LOW",
             "waypoints_json": json.dumps([[24.83, 92.78], [24.37, 92.00], [23.83, 91.29]])},
            {"name": "NH-306 Mizoram Spine", "origin": "Silchar", "destination": "Aizawl", "highway": "NH-306", "distance_km": 180, "estimated_hours": 6, "status": "OPEN", "risk_level": "LOW",
             "waypoints_json": json.dumps([[24.83, 92.78], [24.10, 92.75], [23.73, 92.72]])},
        ]
        route_objects = []
        for r in routes_data:
            rt = Route(**r)
            db.add(rt)
            route_objects.append(rt)
        db.flush()
        print(f"   ✅ {len(route_objects)} routes created")

        # === 8. SHIPMENTS ===
        print("📋 8. Seeding Shipments (Connected Vehicle -> Shipment -> Route)...")
        shipments_data = [
            {"shipment_code": "SHP-001", "cargo_type": "Essential Medical Vaccines (Cold Chain)", "weight_kg": 2400, "priority": "HIGH", "pickup_location": "Guwahati Central Hub", "destination": "Shillong Civil Hospital", "status": "IN_TRANSIT", "corridor": "NH-6", "eta": "11:42 AM IST", "risk_level": "MEDIUM", "risk_reason": "Heavy rainfall on Shillong ridge"},
            {"shipment_code": "SHP-002", "cargo_type": "Telecom Hardware & FMCG", "weight_kg": 14800, "priority": "NORMAL", "pickup_location": "Guwahati Central Hub", "destination": "Imphal Logistics Center", "status": "IN_TRANSIT", "corridor": "NH-29", "eta": "04:30 PM IST", "risk_level": "LOW"},
            {"shipment_code": "SHP-003", "cargo_type": "Steel & Bridge Beams", "weight_kg": 22500, "priority": "HIGH", "pickup_location": "Shillong Mountain Depot", "destination": "Silchar Valley Hub", "status": "DELAYED", "corridor": "NH-6 Sonapur", "eta": "Halted (4.5h clearance)", "risk_level": "CRITICAL", "risk_reason": "Active mudslide blocking dual lanes"},
            {"shipment_code": "SHP-004", "cargo_type": "Fresh Produce & Perishables", "weight_kg": 6200, "priority": "HIGH", "pickup_location": "Siliguri Terminal", "destination": "Gangtok Valley Depot", "status": "IN_TRANSIT", "corridor": "NH-10", "eta": "01:15 PM IST", "risk_level": "MEDIUM", "risk_reason": "Gorge fog; rockfall netting active"},
            {"shipment_code": "SHP-005", "cargo_type": "Solar Panel Equipment", "weight_kg": 4800, "priority": "NORMAL", "pickup_location": "Guwahati Central Hub", "destination": "Itanagar Northern Base", "status": "PLANNED", "corridor": "NH-15", "eta": "TBD", "risk_level": "LOW"},
            {"shipment_code": "SHP-006", "cargo_type": "Rice & Food Grains", "weight_kg": 18000, "priority": "NORMAL", "pickup_location": "Silchar Valley Hub", "destination": "Aizawl Terminal", "status": "IN_TRANSIT", "corridor": "NH-306", "eta": "06:00 PM IST", "risk_level": "LOW"},
            {"shipment_code": "SHP-007", "cargo_type": "Pharmaceutical Supplies", "weight_kg": 3200, "priority": "URGENT", "pickup_location": "Guwahati Central Hub", "destination": "Agartala Complex", "status": "IN_TRANSIT", "corridor": "NH-6/NH-8", "eta": "Tomorrow 08:00 AM", "risk_level": "MEDIUM"},
            {"shipment_code": "SHP-008", "cargo_type": "Construction Materials", "weight_kg": 20000, "priority": "NORMAL", "pickup_location": "Dimapur Rail Yard", "destination": "Kohima Staging Depot", "status": "ASSIGNED", "corridor": "NH-29", "eta": "02:00 PM IST", "risk_level": "MODERATE"},
            {"shipment_code": "SHP-009", "cargo_type": "Textiles & Handicrafts", "weight_kg": 2800, "priority": "LOW", "pickup_location": "Imphal Market", "destination": "Guwahati Central Hub", "status": "PLANNED", "corridor": "NH-29/NH-27", "eta": "TBD", "risk_level": "LOW"},
            {"shipment_code": "SHP-010", "cargo_type": "Emergency Relief Supplies", "weight_kg": 5500, "priority": "URGENT", "pickup_location": "Guwahati Central Hub", "destination": "Tawang Forward", "status": "AT_RISK", "corridor": "Trans-Arunachal", "eta": "Uncertain - Sela Pass conditions", "risk_level": "HIGH", "risk_reason": "Sub-zero temperatures; snow on Sela Pass"},
        ]
        shipment_objects = []
        for i, s in enumerate(shipments_data):
            shp = Shipment(**s)
            if i < len(driver_objects):
                shp.driver_id = driver_objects[i].id
            if i < len(vehicle_objects):
                shp.vehicle_id = vehicle_objects[i].id
            if i < len(route_objects):
                shp.route_id = route_objects[i % len(route_objects)].id
            shp.created_by = user_objects[2].id  # Rahul Verma (Logistics)
            db.add(shp)
            shipment_objects.append(shp)
        db.flush()
        print(f"   ✅ {len(shipment_objects)} shipments created")

        # === 9. WEATHER DATA ===
        print("📋 9. Seeding Weather Data (Connected Region -> Weather)...")
        weather_data = [
            {"state": "Assam", "district": "Kamrup", "temperature_c": 28.0, "rainfall_mm": 5.0, "humidity_pct": 78.0, "wind_speed_kmh": 8.0, "condition": "Light Overcast"},
            {"state": "Meghalaya", "district": "East Khasi Hills", "temperature_c": 18.0, "rainfall_mm": 65.0, "humidity_pct": 95.0, "wind_speed_kmh": 15.0, "condition": "Heavy Rainfall & Dense Mist"},
            {"state": "Arunachal Pradesh", "district": "Tawang", "temperature_c": -3.0, "rainfall_mm": 0.0, "humidity_pct": 40.0, "wind_speed_kmh": 24.0, "condition": "Mountain Snow & Black Ice"},
            {"state": "Nagaland", "district": "Kohima", "temperature_c": 21.0, "rainfall_mm": 18.0, "humidity_pct": 82.0, "wind_speed_kmh": 10.0, "condition": "Scattered Showers"},
            {"state": "Manipur", "district": "Imphal West", "temperature_c": 22.0, "rainfall_mm": 2.0, "humidity_pct": 70.0, "wind_speed_kmh": 6.0, "condition": "Partly Cloudy"},
            {"state": "Mizoram", "district": "Aizawl", "temperature_c": 24.0, "rainfall_mm": 3.0, "humidity_pct": 65.0, "wind_speed_kmh": 8.0, "condition": "Mild Breeze"},
            {"state": "Tripura", "district": "West Tripura", "temperature_c": 28.0, "rainfall_mm": 0.0, "humidity_pct": 60.0, "wind_speed_kmh": 5.0, "condition": "Sunny & Clear"},
            {"state": "Sikkim", "district": "East Sikkim", "temperature_c": 16.0, "rainfall_mm": 12.0, "humidity_pct": 85.0, "wind_speed_kmh": 12.0, "condition": "Light Rain & Gorge Fog"},
        ]
        for w in weather_data:
            reg = region_map.get(w["state"])
            w_obj = WeatherData(region_id=reg.id if reg else None, **w)
            db.add(w_obj)
        db.flush()
        print(f"   ✅ {len(weather_data)} weather records created")

        # === 10. FIELD REPORTS ===
        print("📋 10. Seeding Field Reports (Connected User -> Field Report -> Region)...")
        reports_data = [
            {"report_code": "RPT-001", "reporter_id": user_objects[3].id, "reporter_name": "Aman Kumar", "reporter_role": "driver", "incident_type": "LANDSLIDE", "description": "Large boulder and mudflow blocking both lanes before tunnel entrance", "latitude": 25.10, "longitude": 92.35, "state": "Meghalaya", "district": "East Jaintia Hills", "location_name": "NH-6 Sonapur Tunnel Approach", "image_path": "assets/evidence_landslide.svg", "severity": "CRITICAL", "status": "PENDING",
             "ai_analysis_json": json.dumps({"detected_event": "High-Volume Slope Failure", "confidence": "94.2%", "tags": ["Boulder Obstruction", "Both Lanes Blocked"], "hazard_severity": "CRITICAL", "recommendation": "Immediate reroute via Umran Bypass"})},
            {"report_code": "RPT-002", "reporter_id": user_objects[3].id, "reporter_name": "Aman Kumar", "reporter_role": "driver", "incident_type": "ROAD_BLOCKAGE", "description": "Loose shale rocks puncturing wire netting on outer curve", "latitude": 27.17, "longitude": 88.52, "state": "Sikkim", "district": "East Sikkim", "location_name": "NH-10 Teesta Gorge (Km 32)", "image_path": "assets/evidence_rockfall.svg", "severity": "HIGH", "status": "PENDING",
             "ai_analysis_json": json.dumps({"detected_event": "Rockfall Debris & Damaged Mesh", "confidence": "88.6%", "tags": ["Rock Debris", "Single Lane Passable"], "hazard_severity": "HIGH", "recommendation": "Deploy BRO spotters; 20 km/h speed limit"})},
            {"report_code": "RPT-003", "reporter_id": user_objects[7].id, "reporter_name": "Priya Sharma", "reporter_role": "field_officer", "incident_type": "BRIDGE_DAMAGE", "description": "Culvert drainage cleared; viaduct supports confirmed for 40T freight", "latitude": 25.59, "longitude": 91.93, "state": "Meghalaya", "district": "East Khasi Hills", "location_name": "Umiam Lake Viaduct (NH-6)", "image_path": "assets/evidence_bridge.svg", "severity": "LOW", "status": "VERIFIED",
             "ai_analysis_json": json.dumps({"detected_event": "Clear Infrastructure / Normal", "confidence": "96.1%", "tags": ["Culvert Clear", "Surface Dry"], "hazard_severity": "LOW", "recommendation": "Maintain green status"})},
            {"report_code": "RPT-004", "reporter_id": user_objects[1].id, "reporter_name": "Arjun Mehta", "reporter_role": "field_officer", "incident_type": "FLOOD", "description": "Low-lying area near NH-27 showing water logging after heavy rain", "latitude": 26.15, "longitude": 91.90, "state": "Assam", "district": "Kamrup", "location_name": "NH-27 Jalukbari Interchange", "severity": "MEDIUM", "status": "VERIFIED",
             "ai_analysis_json": json.dumps({"detected_event": "Water Logging Detected", "confidence": "87.3%", "tags": ["Low Area Flooding", "Traffic Slowdown"], "hazard_severity": "MEDIUM", "recommendation": "Monitor water level; advisory speed 30 km/h"})},
            {"report_code": "RPT-005", "reporter_id": user_objects[3].id, "reporter_name": "Aman Kumar", "reporter_role": "driver", "incident_type": "HEAVY_TRAFFIC", "description": "Heavy freight bottleneck at Saraighat Bridge approaches", "latitude": 26.18, "longitude": 91.75, "state": "Assam", "district": "Kamrup", "location_name": "Saraighat Bridge NH-27", "severity": "LOW", "status": "RESOLVED",
             "ai_analysis_json": json.dumps({"detected_event": "Traffic Congestion", "confidence": "91.0%", "tags": ["Bottleneck", "25min Delay"], "hazard_severity": "LOW", "recommendation": "Use alternate Narengi bypass"})},
        ]
        report_objects = []
        for r in reports_data:
            reg = region_map.get(r["state"])
            rpt = FieldReport(region_id=reg.id if reg else None, **r)
            db.add(rpt)
            report_objects.append(rpt)
        db.flush()
        print(f"   ✅ {len(report_objects)} field reports created")

        # === 11. VERIFICATION RECORDS ===
        print("📋 11. Seeding Verification Records (Connected Field Report -> Verification)...")
        verifications_data = [
            {"report_id": report_objects[0].id, "status": "PENDING", "ai_analysis_json": report_objects[0].ai_analysis_json},
            {"report_id": report_objects[1].id, "status": "PENDING", "ai_analysis_json": report_objects[1].ai_analysis_json},
            {"report_id": report_objects[2].id, "reviewer_id": user_objects[0].id, "reviewer_name": "NEXTRA Administrator", "reviewer_role": "admin", "status": "VERIFIED", "remarks": "Inspection verified with PWD Meghalaya. Green status approved.", "ai_analysis_json": report_objects[2].ai_analysis_json, "reviewed_at": datetime(2026, 9, 21, 17, 10, 0)},
            {"report_id": report_objects[3].id, "reviewer_id": user_objects[1].id, "reviewer_name": "Arjun Mehta", "reviewer_role": "field_officer", "status": "VERIFIED", "remarks": "Water level receding. Advisory maintained.", "ai_analysis_json": report_objects[3].ai_analysis_json, "reviewed_at": datetime(2026, 9, 21, 14, 30, 0)},
        ]
        for v in verifications_data:
            db.add(Verification(**v))
        db.flush()
        print(f"   ✅ {len(verifications_data)} verifications created")

        # === 12. ALERTS ===
        print("📋 12. Seeding Alerts (Connected Region & Risk Event -> Alert)...")
        alerts_data = [
            {"title": "NH-6 Sonapur Landslide", "description": "Mudslide obstructing both lanes. BRO clearing debris. Reroute via Umran active.", "severity": "CRITICAL", "state": "Meghalaya", "district": "East Jaintia Hills", "latitude": 25.10, "longitude": 92.35, "alert_type": "RISK", "related_risk_id": risk_objects[0].id},
            {"title": "Torrential Rainfall Warning", "description": "65mm/hr rain on Shillong ridge. Low visibility and aquaplaning hazard.", "severity": "HIGH", "state": "Meghalaya", "district": "East Khasi Hills", "latitude": 25.58, "longitude": 91.89, "alert_type": "WEATHER"},
            {"title": "Sub-Zero Fog Alert", "description": "Sela Pass route to Tawang. Icy tarmac; snow chains recommended.", "severity": "HIGH", "state": "Arunachal Pradesh", "district": "Tawang", "latitude": 27.50, "longitude": 92.10, "alert_type": "WEATHER", "related_risk_id": risk_objects[2].id},
            {"title": "High Traffic Congestion", "description": "NH-27 Jalukbari interchange, Guwahati. Heavy freight bottleneck; 25m delay.", "severity": "LOW", "state": "Assam", "district": "Kamrup", "latitude": 26.14, "longitude": 91.74, "alert_type": "ROAD", "related_risk_id": risk_objects[3].id},
            {"title": "Rockfall Netting Failure", "description": "NH-10 Teesta Gorge rock debris. Single lane passable with caution.", "severity": "MEDIUM", "state": "Sikkim", "district": "East Sikkim", "latitude": 27.17, "longitude": 88.52, "alert_type": "RISK", "related_risk_id": risk_objects[1].id},
        ]
        for a in alerts_data:
            reg = region_map.get(a["state"])
            db.add(Alert(region_id=reg.id if reg else None, **a))
        db.flush()
        print(f"   ✅ {len(alerts_data)} alerts created")

        # === 13. NOTIFICATIONS ===
        print("📋 13. Seeding Notifications (Connected User -> Notification)...")
        notifications_data = [
            {"user_id": user_objects[0].id, "title": "New field evidence uploaded", "message": "Aman Kumar uploaded landslide evidence at NH-6 Sonapur Tunnel.", "type": "REPORT", "related_entity_type": "report", "related_entity_id": report_objects[0].id},
            {"user_id": user_objects[0].id, "title": "Critical risk detected", "message": "Critical risk zone activated in Meghalaya (East Jaintia Hills). Risk score: 85/100.", "type": "RISK", "related_entity_type": "risk", "related_entity_id": risk_objects[0].id},
            {"user_id": user_objects[1].id, "title": "New report requires verification", "message": "A landslide report at NH-6 Sonapur requires verification in your area.", "type": "VERIFICATION", "related_entity_type": "report", "related_entity_id": report_objects[0].id},
            {"user_id": user_objects[2].id, "title": "Shipment SHP-003 delayed", "message": "Shipment SHP-003 (Steel Beams) halted at Sonapur due to landslide.", "type": "SHIPMENT", "related_entity_type": "shipment", "related_entity_id": shipment_objects[2].id},
            {"user_id": user_objects[3].id, "title": "Road disruption on your route", "message": "Active landslide detected 5.2 km ahead on NH-6 Sonapur. Proceed with caution.", "type": "ALERT"},
            {"user_id": user_objects[0].id, "title": "Shipment SHP-010 at risk", "message": "Emergency relief supplies to Tawang at risk due to Sela Pass conditions.", "type": "SHIPMENT", "related_entity_type": "shipment", "related_entity_id": shipment_objects[9].id},
            {"user_id": user_objects[7].id, "title": "New report in your area", "message": "A landslide report has been filed near Sonapur Tunnel, Meghalaya.", "type": "REPORT", "related_entity_type": "report", "related_entity_id": report_objects[0].id},
        ]
        for n in notifications_data:
            db.add(Notification(**n))
        db.flush()
        print(f"   ✅ {len(notifications_data)} notifications created")

        # === 14. AUDIT LOGS ===
        print("📋 14. Seeding Audit Logs (Connected User -> AuditLog)...")
        audit_data = [
            {"user_id": user_objects[0].id, "user_name": "NEXTRA Administrator", "user_role": "admin", "action": "USER_LOGIN", "affected_record": "admin@nextra.demo"},
            {"user_id": user_objects[0].id, "user_name": "NEXTRA Administrator", "user_role": "admin", "action": "EVIDENCE_VERIFIED", "affected_record": "RPT-003 (Umiam Viaduct)", "old_value": "PENDING", "new_value": "VERIFIED"},
            {"user_id": user_objects[2].id, "user_name": "Rahul Verma", "user_role": "logistics", "action": "SHIPMENT_CREATED", "affected_record": "SHP-001 (Medical Vaccines)", "new_value": "IN_TRANSIT"},
            {"user_id": user_objects[3].id, "user_name": "Aman Kumar", "user_role": "driver", "action": "REPORT_SUBMITTED", "affected_record": "RPT-001 (Sonapur Landslide)", "new_value": "PENDING_VERIFICATION"},
            {"user_id": user_objects[0].id, "user_name": "NEXTRA Administrator", "user_role": "admin", "action": "SYSTEM_SEED", "affected_record": "Database", "new_value": "Relational schema & seed populated"},
        ]
        for a in audit_data:
            db.add(AuditLog(**a))

        db.commit()
        print(f"\n{'='*55}")
        print("🎉 NEXTRA database seeded successfully with real relational connections!")
        print_counts(db)

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error during seeding: {e}")
        raise
    finally:
        db.close()


def print_counts(db):
    """Print count of records across all 14 models."""
    print(f"   • Users:                  {db.query(User).count()}")
    print(f"   • Field Officer Profiles: {db.query(FieldOfficerProfile).count()}")
    print(f"   • Driver Profiles:        {db.query(Driver).count()}")
    print(f"   • Vehicles:               {db.query(Vehicle).count()}")
    print(f"   • Regions (8 States):     {db.query(Region).count()}")
    print(f"   • Routes:                 {db.query(Route).count()}")
    print(f"   • Shipments:              {db.query(Shipment).count()}")
    print(f"   • Risk Events:            {db.query(RiskEvent).count()}")
    print(f"   • Weather Stations:       {db.query(WeatherData).count()}")
    print(f"   • Field Reports:          {db.query(FieldReport).count()}")
    print(f"   • Verification Records:   {db.query(Verification).count()}")
    print(f"   • Broadcast Alerts:       {db.query(Alert).count()}")
    print(f"   • User Notifications:     {db.query(Notification).count()}")
    print(f"   • System Audit Logs:      {db.query(AuditLog).count()}")
    print("=" * 55)


if __name__ == "__main__":
    reset_flag = "--reset" in sys.argv or "--force" in sys.argv
    seed_database(reset=reset_flag)
