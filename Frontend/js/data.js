/**
 * NEXTRA - Seed Data Repository & Persistence Layer
 * Simulates enterprise database entities for North Eastern Region Logistics Intelligence.
 */

// Initial User Directory (Admin can edit, create, activate, disable)
const INITIAL_USERS = [
    {
        user_id: "USR-001",
        name: "Vikram Sengupta",
        email: "admin@ner.gov.in",
        role: "admin",
        assigned_area: "ALL",
        status: "ACTIVE",
        created_at: "2026-01-10T08:00:00Z"
    },
    {
        user_id: "USR-002",
        name: "Arjun Sharma",
        email: "field@ner.gov.in",
        role: "field_officer",
        assigned_area: "MEGHALAYA",
        status: "ACTIVE",
        created_at: "2026-01-15T09:30:00Z"
    },
    {
        user_id: "USR-003",
        name: "Meera Hazarika",
        email: "logistics@ner.gov.in",
        role: "logistics",
        assigned_area: "ALL",
        status: "ACTIVE",
        created_at: "2026-02-01T10:15:00Z"
    },
    {
        user_id: "USR-004",
        name: "Rahul Borah",
        email: "driver@ner.gov.in",
        role: "driver",
        assigned_area: "MEGHALAYA",
        assigned_truck: "VX-104",
        status: "ACTIVE",
        created_at: "2026-02-10T11:45:00Z"
    },
    {
        user_id: "USR-005",
        name: "Tashi Wangchuk",
        email: "tashi.field@ner.gov.in",
        role: "field_officer",
        assigned_area: "SIKKIM",
        status: "ACTIVE",
        created_at: "2026-02-18T14:20:00Z"
    },
    {
        user_id: "USR-006",
        name: "Debashis Debbarma",
        email: "debashis.drv@ner.gov.in",
        role: "driver",
        assigned_area: "TRIPURA",
        assigned_truck: "NE-7210",
        status: "ACTIVE",
        created_at: "2026-03-01T08:10:00Z"
    }
];

// 8 North Eastern States Geographic Registry & Regional Intelligence
const NE_STATES_DATA = {
    ALL: {
        name: "Entire North East Region",
        center: [26.15, 92.8],
        zoom: 7,
        desc: "Regional multi-modal logistics grid covering all 8 states",
        risk: "MODERATE",
        roadStatus: "Operational with Monsoon Restraints",
        activeShipments: 24,
        accessibilityScore: 74,
        hubs: ["Guwahati", "Shillong", "Imphal", "Agartala", "Aizawl", "Kohima", "Itanagar", "Gangtok"]
    },
    ASSAM: {
        name: "Assam",
        center: [26.2006, 92.9376],
        zoom: 7.5,
        desc: "Gateway hub to NE; Brahmaputra logistics corridor & NH-27 expressway",
        risk: "LOW",
        weather: "28°C · Light Overcast · Wind 8 km/h",
        roadStatus: "All Primary Corridors Open (Minor delays at Saraighat)",
        activeShipments: 12,
        accessibilityScore: 88,
        hubs: ["Guwahati Central", "Tezpur Depot", "Dibrugarh Terminal", "Silchar Valley Hub"]
    },
    MEGHALAYA: {
        name: "Meghalaya",
        center: [25.5788, 91.8933],
        zoom: 8.5,
        desc: "High altitude plateau; NH-6 lifeline to Barak Valley, Tripura & Mizoram",
        risk: "HIGH",
        weather: "18°C · Heavy Rainfall (65 mm/hr) · Dense Mist",
        roadStatus: "NH-6 Sonapur Tunnel Blocked; Single Lane Reroute Active",
        activeShipments: 6,
        accessibilityScore: 64,
        hubs: ["Shillong Mountain Depot", "Cherrapunji Staging", "Tura Outpost"]
    },
    ARUNACHAL: {
        name: "Arunachal Pradesh",
        center: [27.50, 94.00],
        zoom: 7.5,
        desc: "Himalayan frontier corridor; Trans-Arunachal Highway & Sela Pass",
        risk: "HIGH",
        weather: "-3°C · Mountain Snow & Black Ice · Wind 24 km/h",
        roadStatus: "Sela Pass restricted to 4x4 & snow chain vehicles",
        activeShipments: 3,
        accessibilityScore: 48,
        hubs: ["Itanagar Northern Base", "Tawang Forward Depot", "Pasighat Hub"]
    },
    NAGALAND: {
        name: "Nagaland",
        center: [25.80, 94.20],
        zoom: 8.5,
        desc: "Mountain supply ridge; NH-29 Dimapur-Kohima arterial route",
        risk: "MODERATE",
        weather: "21°C · Scattered Showers (18 mm/hr)",
        roadStatus: "NH-29 Alternating One-Way Traffic at Pakala Pahar",
        activeShipments: 4,
        accessibilityScore: 62,
        hubs: ["Kohima Staging Depot", "Dimapur Rail Freight Terminal"]
    },
    MANIPUR: {
        name: "Manipur",
        center: [24.8170, 93.9368],
        zoom: 8.5,
        desc: "Imphal valley terminal & Asian Highway-1 cross-border link",
        risk: "LOW",
        weather: "22°C · Partly Cloudy",
        roadStatus: "NH-37 & NH-2 Open with Convoy Escort Options",
        activeShipments: 5,
        accessibilityScore: 69,
        hubs: ["Imphal Logistics Center", "Churachandpur Depot"]
    },
    MIZORAM: {
        name: "Mizoram",
        center: [23.40, 92.80],
        zoom: 8.5,
        desc: "Southern hill spine; Kaladan multi-modal transit corridor",
        risk: "LOW",
        weather: "24°C · Mild Breeze",
        roadStatus: "NH-306 Silchar-Aizawl all-weather route clear",
        activeShipments: 2,
        accessibilityScore: 60,
        hubs: ["Aizawl Freight Terminal", "Lunglei Hub"]
    },
    TRIPURA: {
        name: "Tripura",
        center: [23.8315, 91.2868],
        zoom: 8.5,
        desc: "Agartala integrated cross-border freight terminal",
        risk: "LOW",
        weather: "28°C · Sunny & Clear",
        roadStatus: "NH-8 Churaibari-Agartala fully open",
        activeShipments: 4,
        accessibilityScore: 78,
        hubs: ["Agartala Multi-Modal Complex", "Udaipur Depot"]
    },
    SIKKIM: {
        name: "Sikkim",
        center: [27.45, 88.55],
        zoom: 8.5,
        desc: "Eastern Himalayan corridor; NH-10 Teesta river gorge route",
        risk: "MODERATE",
        weather: "16°C · Light Rain & Gorge Fog",
        roadStatus: "NH-10 Sevoke-Rangpo Open with Rockfall Netting Precautions",
        activeShipments: 3,
        accessibilityScore: 58,
        hubs: ["Gangtok Valley Logistics Depot", "Namchi Staging Hub"]
    }
};

// Drivers Roster
const INITIAL_DRIVERS = [
    {
        id: "DRV-101",
        name: "Rahul Borah",
        phone: "+91 94350-12841",
        license: "AS-01-2018-004812",
        assigned_truck: "VX-104",
        current_location: "NH-6 Shillong Hill Section (Km 48)",
        current_route: "Guwahati → Shillong",
        corridor: "NH-6 Meghalaya",
        status: "IN_TRANSIT",
        experience_years: 9,
        rating: 4.9,
        safety_score: "98%"
    },
    {
        id: "DRV-102",
        name: "Bikramjeet Chutia",
        phone: "+91 94350-29314",
        license: "AS-03-2015-092110",
        assigned_truck: "NE-7210",
        current_location: "NH-29 Nagaon Bypass",
        current_route: "Guwahati → Imphal",
        corridor: "NH-29 Assam/Nagaland",
        status: "IN_TRANSIT",
        experience_years: 12,
        rating: 4.8,
        safety_score: "96%"
    },
    {
        id: "DRV-103",
        name: "Sonam Dorjee",
        phone: "+91 98620-41092",
        license: "AR-02-2019-001244",
        assigned_truck: "NE-9104",
        current_location: "Guwahati Freight Yard",
        current_route: "Awaiting Assignment",
        corridor: "Assam Gateway",
        status: "AVAILABLE",
        experience_years: 7,
        rating: 4.9,
        safety_score: "99%"
    },
    {
        id: "DRV-104",
        name: "Pranab Kalita",
        phone: "+91 98540-88312",
        license: "AS-01-2014-073199",
        assigned_truck: "NE-5532",
        current_location: "Sonapur Bypass Rest Stop",
        current_route: "Shillong → Silchar",
        corridor: "NH-6 Meghalaya",
        status: "HALTED",
        experience_years: 14,
        rating: 4.7,
        safety_score: "94%"
    },
    {
        id: "DRV-105",
        name: "Lalthan Sanga",
        phone: "+91 98625-10293",
        license: "MZ-01-2017-003810",
        assigned_truck: "NE-3392",
        current_location: "Shillong Freight Depot",
        current_route: "Available for Dispatch",
        corridor: "Meghalaya South",
        status: "AVAILABLE",
        experience_years: 8,
        rating: 4.8,
        safety_score: "97%"
    },
    {
        id: "DRV-106",
        name: "Debashis Debbarma",
        phone: "+91 94361-55018",
        license: "TR-01-2016-008129",
        assigned_truck: "NE-4410",
        current_location: "Agartala Complex",
        current_route: "Available for Dispatch",
        corridor: "Tripura Core",
        status: "AVAILABLE",
        experience_years: 10,
        rating: 4.9,
        safety_score: "98%"
    }
];

// Commercial Vehicle & Truck Fleet
const INITIAL_TRUCKS = [
    {
        truck_id: "VX-104",
        plate_number: "AS-01-GC-4102",
        vehicle_type: "Refrigerated Medium Truck (Cold Chain)",
        capacity_kg: 5000,
        current_location: "NH-6 Hill Section, Meghalaya",
        driver_id: "DRV-101",
        driver_name: "Rahul Borah",
        current_assignment: "SHP-801 (Emergency Vaccines)",
        status: "IN_TRANSIT",
        fuel_level: "78%",
        temp_celsius: "3.4°C",
        last_service: "2026-01-28"
    },
    {
        truck_id: "NE-7210",
        plate_number: "AS-03-EC-7210",
        vehicle_type: "Heavy Multi-Axle Carrier (14-Wheeler)",
        capacity_kg: 24000,
        current_location: "NH-29 Nagaon Foothills, Assam",
        driver_id: "DRV-102",
        driver_name: "Bikramjeet Chutia",
        current_assignment: "SHP-802 (Telecom Hardware & FMCG)",
        status: "IN_TRANSIT",
        fuel_level: "62%",
        temp_celsius: "Ambient",
        last_service: "2026-02-12"
    },
    {
        truck_id: "NE-5532",
        plate_number: "ML-05-AB-5532",
        vehicle_type: "Heavy Duty Flatbed Container",
        capacity_kg: 28000,
        current_location: "Sonapur Staging Depot, Meghalaya",
        driver_id: "DRV-104",
        driver_name: "Pranab Kalita",
        current_assignment: "SHP-803 (Infrastructure Steel Beams)",
        status: "HALTED",
        fuel_level: "84%",
        temp_celsius: "Ambient",
        last_service: "2026-01-18"
    },
    {
        truck_id: "NE-9104",
        plate_number: "AS-01-DD-9104",
        vehicle_type: "All-Terrain 4x4 Mountain Transport",
        capacity_kg: 6500,
        current_location: "Guwahati Central Freight Hub",
        driver_id: "DRV-103",
        driver_name: "Sonam Dorjee",
        current_assignment: "None (Ready for Dispatch)",
        status: "AVAILABLE",
        fuel_level: "95%",
        temp_celsius: "Ambient",
        last_service: "2026-02-25"
    },
    {
        truck_id: "NE-3392",
        plate_number: "ML-01-CC-3392",
        vehicle_type: "Covered Medium Freight Vehicle",
        capacity_kg: 9000,
        current_location: "Shillong Mountain Depot",
        driver_id: "DRV-105",
        driver_name: "Lalthan Sanga",
        current_assignment: "None (Ready for Dispatch)",
        status: "AVAILABLE",
        fuel_level: "90%",
        temp_celsius: "Ambient",
        last_service: "2026-02-04"
    },
    {
        truck_id: "NE-4410",
        plate_number: "TR-01-FA-4410",
        vehicle_type: "Refrigerated Agri-Van",
        capacity_kg: 4000,
        current_location: "Agartala Multi-Modal Complex",
        driver_id: "DRV-106",
        driver_name: "Debashis Debbarma",
        current_assignment: "None (Ready for Dispatch)",
        status: "AVAILABLE",
        fuel_level: "88%",
        temp_celsius: "4.0°C",
        last_service: "2026-02-15"
    }
];

// Active Shipments Database
const INITIAL_SHIPMENTS = [
    {
        shipment_id: "SHP-801",
        tracking_code: "NEX-SHP-801-MEG",
        origin: "Guwahati Central Hub (Assam)",
        destination: "Shillong Civil Hospital (Meghalaya)",
        cargo: "Essential Medical Vaccines (Cold Chain)",
        weight_kg: 2400,
        truck_id: "VX-104",
        driver_name: "Rahul Borah",
        driver_phone: "+91 94350-12841",
        status: "IN_TRANSIT",
        status_class: "status-green",
        corridor: "NH-6 Hill Corridor",
        eta: "11:42 AM IST (1h 15m remaining)",
        risk_level: "MEDIUM",
        risk_reason: "Heavy rainfall on Shillong ridge; recommended speed 35 km/h",
        created_at: "2026-03-08T06:30:00Z"
    },
    {
        shipment_id: "SHP-802",
        tracking_code: "NEX-SHP-802-MNP",
        origin: "Guwahati Central Hub (Assam)",
        destination: "Imphal Logistics Center (Manipur)",
        cargo: "Telecom Hardware & FMCG Staples",
        weight_kg: 14800,
        truck_id: "NE-7210",
        driver_name: "Bikramjeet Chutia",
        driver_phone: "+91 94350-29314",
        status: "IN_TRANSIT",
        status_class: "status-green",
        corridor: "NH-29 Foothills",
        eta: "04:30 PM IST",
        risk_level: "LOW",
        risk_reason: "Route clear across NH-27/29",
        created_at: "2026-03-08T04:15:00Z"
    },
    {
        shipment_id: "SHP-803",
        tracking_code: "NEX-SHP-803-SIL",
        origin: "Shillong Mountain Depot (Meghalaya)",
        destination: "Silchar Valley Hub (Assam)",
        cargo: "Steel & Bridge Reconstruction Beams",
        weight_kg: 22500,
        truck_id: "NE-5532",
        driver_name: "Pranab Kalita",
        driver_phone: "+91 98540-88312",
        status: "DELAYED",
        status_class: "status-red",
        corridor: "NH-6 Sonapur Tunnel Section",
        eta: "Halted at Sonapur (Clearance estimated 4.5h)",
        risk_level: "CRITICAL",
        risk_reason: "Active mudslide blocking dual lanes at Km 142. BRO clearing debris.",
        created_at: "2026-03-08T05:00:00Z"
    },
    {
        shipment_id: "SHP-804",
        tracking_code: "NEX-SHP-804-SIK",
        origin: "Siliguri Staging Terminal (WB)",
        destination: "Gangtok Valley Logistics Depot (Sikkim)",
        cargo: "Fresh High-Altitude Produce & Perishables",
        weight_kg: 6200,
        truck_id: "NE-9104",
        driver_name: "Sonam Dorjee",
        driver_phone: "+91 98620-41092",
        status: "IN_TRANSIT",
        status_class: "status-green",
        corridor: "NH-10 Teesta Valley",
        eta: "01:15 PM IST",
        risk_level: "MEDIUM",
        risk_reason: "Light gorge fog; rockfall netting active",
        created_at: "2026-03-08T07:10:00Z"
    }
];

// Transportation Requests (Logistics request workflow)
const INITIAL_TRANSPORT_REQUESTS = [
    {
        request_id: "TR-2026-01",
        pickup_location: "Guwahati Central Hub",
        destination: "Shillong Mountain Depot",
        cargo_type: "Organic Agri-Vegetables",
        cargo_weight_kg: 2500,
        required_vehicle: "Refrigerated Van",
        priority: "HIGH",
        required_date: "2026-09-25",
        required_time: "09:00 AM",
        notes: "Temperature controlled; vulnerable to road vibration",
        status: "PENDING",
        created_by: "Meera Hazarika (Logistics)",
        created_at: "2026-03-08T08:20:00Z",
        matched_truck: "NE-4410",
        matched_driver: "Debashis Debbarma"
    },
    {
        request_id: "TR-2026-02",
        pickup_location: "Silchar Valley Hub",
        destination: "Aizawl Freight Terminal",
        cargo_type: "Solar Batteries & Microgrid Inverters",
        cargo_weight_kg: 4800,
        required_vehicle: "All-Terrain 4x4 Mountain Transport",
        priority: "HIGH",
        required_date: "2026-09-26",
        required_time: "11:30 AM",
        notes: "Urgent healthcare clinic electrification project",
        status: "MATCHED",
        created_by: "Meera Hazarika (Logistics)",
        created_at: "2026-03-08T09:00:00Z",
        matched_truck: "NE-9104",
        matched_driver: "Sonam Dorjee"
    },
    {
        request_id: "TR-2026-03",
        pickup_location: "Guwahati Central Hub",
        destination: "Itanagar Northern Base",
        cargo_type: "Pre-fabricated Bridge Cables",
        cargo_weight_kg: 18000,
        required_vehicle: "Heavy Multi-Axle Carrier",
        priority: "NORMAL",
        required_date: "2026-09-28",
        required_time: "07:00 AM",
        notes: "BRO Border highway construction assignment",
        status: "PENDING",
        created_by: "Meera Hazarika (Logistics)",
        created_at: "2026-03-08T09:40:00Z",
        matched_truck: "NE-7210",
        matched_driver: "Bikramjeet Chutia"
    }
];

// Verification Center Evidence Database (Images + AI Analysis + Human Decision)
const INITIAL_VERIFICATION_RECORDS = [
    {
        id: "VER-901",
        uploaded_by: "Rahul Borah",
        user_id: "USR-004",
        user_role: "driver",
        location: "NH-6 Sonapur Tunnel Approach (Km 141.8)",
        state: "MEGHALAYA",
        area: "East Jaintia Hills Sector",
        timestamp: "2026-03-08T07:45:00Z",
        report_type: "Landslide & Road Blockage",
        description: "Large boulder and mudflow slid down slope 200m before tunnel entrance. Both lanes obstructed.",
        image_url: "assets/evidence_landslide.svg",
        ai_analysis: {
            detected_event: "High-Volume Slope Failure / Landslide",
            confidence: "94.2%",
            tags: ["Boulder Obstruction", "Both Lanes Blocked", "Unstable Slope"],
            hazard_severity: "CRITICAL",
            recommendation: "Immediate heavy vehicle reroute via Umran-Bhoirymbong Bypass"
        },
        status: "PENDING",
        reviewed_by: null,
        reviewer_role: null,
        reviewer_remarks: "",
        reviewed_at: null
    },
    {
        id: "VER-902",
        uploaded_by: "Sonam Dorjee",
        user_id: "USR-003",
        user_role: "driver",
        location: "NH-10 Teesta Gorge (Km 32)",
        state: "SIKKIM",
        area: "Sevoke-Rangpo Sector",
        timestamp: "2026-03-08T06:15:00Z",
        report_type: "Rockfall Netting Failure",
        description: "Loose shale rocks puncturing wire netting on outer curve. Single lane passable with caution.",
        image_url: "assets/evidence_rockfall.svg",
        ai_analysis: {
            detected_event: "Rockfall Debris & Damaged Retaining Mesh",
            confidence: "88.6%",
            tags: ["Rock Debris", "Single Lane Passable", "Low Visibility"],
            hazard_severity: "HIGH",
            recommendation: "Deploy BRO spotters; enforce 20 km/h speed ceiling"
        },
        status: "PENDING",
        reviewed_by: null,
        reviewer_role: null,
        reviewer_remarks: "",
        reviewed_at: null
    },
    {
        id: "VER-903",
        uploaded_by: "Arjun Sharma",
        user_id: "USR-002",
        user_role: "field_officer",
        location: "Umiam Lake Viaduct (NH-6)",
        state: "MEGHALAYA",
        area: "Ri Bhoi Sector",
        timestamp: "2026-03-07T16:30:00Z",
        report_type: "Bridge Load & Drainage Inspection",
        description: "Culvert drainage cleared of silt. Viaduct structural supports cleared for 40T freight.",
        image_url: "assets/evidence_bridge.svg",
        ai_analysis: {
            detected_event: "Clear Highway Infrastructure / Normal Flow",
            confidence: "96.1%",
            tags: ["Culvert Clear", "Surface Dry", "Load Rating Confirmed"],
            hazard_severity: "LOW",
            recommendation: "Maintain green status on regional operations map"
        },
        status: "VERIFIED",
        reviewed_by: "Vikram Sengupta",
        reviewer_role: "admin",
        reviewer_remarks: "Inspection verified with PWD Meghalaya civil engineer log. Status green approved.",
        reviewed_at: "2026-03-07T17:10:00Z"
    }
];

// Audit Logs Ledger
const INITIAL_AUDIT_LOGS = [
    {
        log_id: "AUD-001",
        who: "Vikram Sengupta (Admin)",
        user_id: "USR-001",
        user_role: "admin",
        action: "USER_STATUS_CHANGE",
        affected_record: "USR-006 (Debashis Debbarma)",
        old_value: "PENDING_VERIFICATION",
        new_value: "ACTIVE",
        timestamp: "2026-03-07T10:14:22Z"
    },
    {
        log_id: "AUD-002",
        who: "Vikram Sengupta (Admin)",
        user_id: "USR-001",
        user_role: "admin",
        action: "EVIDENCE_VERIFIED",
        affected_record: "VER-903 (Umiam Viaduct)",
        old_value: "PENDING",
        new_value: "VERIFIED",
        timestamp: "2026-03-07T17:10:00Z"
    },
    {
        log_id: "AUD-003",
        who: "Meera Hazarika (Logistics)",
        user_id: "USR-003",
        user_role: "logistics",
        action: "TRANSPORT_REQUEST_CREATED",
        affected_record: "TR-2026-02 (Solar Batteries)",
        old_value: "NONE",
        new_value: "CREATED (Matched: NE-9104)",
        timestamp: "2026-03-08T09:00:00Z"
    },
    {
        log_id: "AUD-004",
        who: "Rahul Borah (Driver)",
        user_id: "USR-004",
        user_role: "driver",
        action: "HAZARD_PHOTO_SUBMITTED",
        affected_record: "VER-901 (Sonapur Landslide)",
        old_value: "NONE",
        new_value: "PENDING_AI_VERIFICATION",
        timestamp: "2026-03-08T07:45:00Z"
    }
];

// Field Officers Registry
const INITIAL_FIELD_OFFICERS = [
    {
        officer_id: "FO-01",
        name: "Arjun Sharma",
        state: "MEGHALAYA",
        sector: "Meghalaya Sector 4 (Khasi & Jaintia Corridor)",
        phone: "+91 94361-28901",
        email: "field@ner.gov.in",
        status: "ON_DUTY_PATROL",
        active_reports: 2,
        assigned_incident: "NH-6 Sonapur Tunnel Mudslide"
    },
    {
        officer_id: "FO-02",
        name: "Bhaskar Deka",
        state: "ASSAM",
        sector: "Lower Assam & Brahmaputra Basin",
        phone: "+91 94350-67120",
        email: "bhaskar.deka@ner.gov.in",
        status: "ON_DUTY",
        active_reports: 1,
        assigned_incident: "Saraighat Bridge Freight Inflow"
    },
    {
        officer_id: "FO-03",
        name: "Tashi Wangchuk",
        state: "SIKKIM",
        sector: "Teesta Gorge & North Sikkim Passes",
        phone: "+91 98620-88129",
        email: "tashi.field@ner.gov.in",
        status: "ON_DUTY",
        active_reports: 1,
        assigned_incident: "NH-10 Rockfall Mesh Netting"
    },
    {
        officer_id: "FO-04",
        name: "Kevi Angami",
        state: "NAGALAND",
        sector: "Kohima-Dimapur Hill Pass",
        phone: "+91 98630-19283",
        email: "kevi.angami@ner.gov.in",
        status: "STANDBY",
        active_reports: 0,
        assigned_incident: "None"
    }
];

// Accessibility Facilities (Hospitals, Relief Centers, Cold-Storage Depots)
const ACCESSIBILITY_FACILITIES = [
    {
        id: "FAC-01",
        name: "NEIGRIHMS Super-Specialty Hospital",
        state: "Meghalaya",
        city: "Shillong",
        type: "Tertiary Emergency Hospital",
        lat: 25.5900,
        lng: 91.9300,
        score: 92,
        features: ["24/7 Trauma Care", "Helipad Access", "Emergency Oxygen Depot", "Heavy Ambulance Dock"],
        road_access: "All-Weather NH-6 Spur",
        status: "FULL_OPERATIONAL"
    },
    {
        id: "FAC-02",
        name: "Guwahati Medical College & Hospital (GMCH)",
        state: "Assam",
        city: "Guwahati",
        type: "Level-1 Trauma Center",
        lat: 26.1550,
        lng: 91.7700,
        score: 96,
        features: ["Multi-Lane Emergency Bay", "Cold-Chain Vaccine Depot", "Central Oxygen Tank", "Direct NH-27 Access"],
        road_access: "Dual-Lane Expressway",
        status: "FULL_OPERATIONAL"
    },
    {
        id: "FAC-03",
        name: "RIMS Regional Institute of Medical Sciences",
        state: "Manipur",
        city: "Imphal",
        type: "Emergency Regional Hospital",
        lat: 24.8150,
        lng: 93.9250,
        score: 84,
        features: ["Emergency Blood Bank", "Ambulance Ramps", "Auxiliary Power"],
        road_access: "AH-1 / NH-2 Corridor",
        status: "FULL_OPERATIONAL"
    },
    {
        id: "FAC-04",
        name: "Tawang District Civil Hospital",
        state: "Arunachal Pradesh",
        city: "Tawang",
        type: "High-Altitude Defense & Civil Clinic",
        lat: 27.5850,
        lng: 91.8650,
        score: 68,
        features: ["High-Altitude Hypothermia Unit", "Snowplow Cleared Approach", "Limited Winter Beds"],
        road_access: "Sela Pass Convoy Route Only",
        status: "RESTRICTED_ACCESS"
    }
];
