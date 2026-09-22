# NEXTRA™ — NE Region X-Intelligent Transport & Routing Assistant
**Team VoidX™ · Smart India Hackathon (SIH 2026)**  
*Connecting the Northeast. Intelligently.*

---

## 1. Overview

NEXTRA is an AI-powered logistics, routing, risk intelligence, and regional accessibility platform designed specifically for the 8 North Eastern states of India:
- **Assam**
- **Meghalaya**
- **Arunachal Pradesh**
- **Nagaland**
- **Manipur**
- **Mizoram**
- **Tripura**
- **Sikkim**

The system bridges central governance, ground intelligence from Field Officers, logistics fleet coordination, and commercial vehicle operators navigating complex mountain corridors (e.g., NH-27, NH-6, NH-29, NH-10, NH-13).

---

## 2. Full-Stack Architecture & Directory Structure

```
NEXTRA/
├── frontend/
│   ├── index.html              # Main single-page command deck
│   ├── login.html              # Standalone authentication gateway
│   ├── signup.html             # User registration with role selection
│   ├── forgot-password.html    # Password reset workflow
│   ├── pages/                  # Role-specific dedicated views
│   │   ├── admin/
│   │   ├── field-officer/
│   │   ├── logistics/
│   │   └── driver/
│   ├── components/             # Reusable UI component modules
│   ├── css/                    # Stylesheets (auth.css, etc.)
│   ├── js/                     # Modular frontend engines (auth, map, dashboard, etc.)
│   ├── assets/                 # SVGs, emblems, route icons
│   └── data/                   # Client seed configurations
│
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI entrypoint, CORS & static file mounts
│   │   ├── core/               # App configuration, security (JWT, bcrypt), dependencies
│   │   ├── database/           # SQLite connection & database seed script
│   │   ├── models/             # 13 SQLAlchemy models (users, shipments, risks, etc.)
│   │   ├── schemas/            # Pydantic validation models
│   │   ├── routers/            # 12 REST API routers
│   │   └── services/           # Risk calculation, notifications, and dashboard KPIs
│   ├── nextra.db               # SQLite database
│   ├── uploads/                # Field report photo evidence storage
│   ├── requirements.txt        # Backend Python dependencies
│   └── .env.example            # Environment variables template
│
├── PROJECT_AUDIT.md            # Comprehensive project state audit
├── README.md                   # Platform documentation
└── .gitignore                  # Git exclusions
```

---

## 3. Four Core Operational Roles

1. **Central Command Administrator (`admin`)**
   - Regional multi-modal surveillance across all 8 states.
   - User identity & role management, including creating and assigning Field Officers.
   - System-wide audit logs and verification oversight.

2. **Field Officer (`field_officer`)**
   - State/jurisdiction-scoped monitoring (e.g., Assam, Meghalaya).
   - Review and verify ground-truth photo evidence of landslides, road blockages, and hazards.
   - Coordinate local clearance and publish verified road status updates.

3. **Freight Operations Coordinator (`logistics`)**
   - Freight request management, consignment dispatch, and cargo tracking.
   - Truck-to-driver matchmaking based on vehicle type and hill-driving certifications.
   - Multi-modal route tradeoff comparisons.

4. **Commercial Fleet Operator (`driver`)**
   - In-cab mountain navigation and turn-by-turn waypoint tracking.
   - Proximity radar for nearby drivers on mountain corridors.
   - One-tap incident & road hazard reporting with photo uploads.

---

## 4. Setup & Running Locally

### Prerequisites
- Python 3.10+
- Modern Web Browser (Chrome, Edge, Firefox)

### Step 1: Backend Setup & Server Start
```bash
# Navigate to backend directory
cd backend

# Install dependencies
python -m pip install -r requirements.txt

# (Optional) Seed SQLite database if not already present
python -m app.database.seed

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```

### Step 2: Accessing the Application
- **Frontend Dashboard**: Open `http://localhost:8000` or `http://localhost:8000/login.html`
- **Interactive API Documentation (Swagger)**: `http://localhost:8000/docs`
- **Alternative ReDoc**: `http://localhost:8000/redoc`
- **Health Check**: `http://localhost:8000/api/health`

---

## 5. Demo Credentials

| Role | Email | Password | Assigned Area |
|---|---|---|---|
| **Admin** | `admin@nextra.demo` | `Admin@123` | ALL (Entire NER) |
| **Field Officer** | `officer@nextra.demo` | `Officer@123` | Assam (Kamrup) |
| **Logistics** | `logistics@nextra.demo` | `Logistics@123` | ALL (Fleet Desk) |
| **Driver** | `driver@nextra.demo` | `Driver@123` | Assam (VX-104) |

---
*Developed by Team VoidX for Smart India Hackathon (SIH 2026).*
