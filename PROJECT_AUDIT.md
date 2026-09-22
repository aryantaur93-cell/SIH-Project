# NEXTRA Project Audit & Architecture Assessment
**Project**: NEXTRA (NE Region X-Intelligent Transport & Routing Assistant)  
**Team**: VoidX™ | SIH 2026  
**Auditor**: Antigravity AI Engine  
**Date**: September 2026  
**Status**: Comprehensive Baseline Inspection Completed  

---

## 1. Executive Summary

NEXTRA is an intelligent transport, routing, and regional accessibility platform tailored for the 8 North Eastern Region (NER) states of India (Assam, Meghalaya, Arunachal Pradesh, Nagaland, Manipur, Mizoram, Tripura, Sikkim).

The previous developer successfully built out the **entire FastAPI backend, SQLAlchemy database schema, SQLite database with rich Northeast seed data, JWT authentication, and comprehensive API endpoints**. However, the development was interrupted right at the frontend-backend integration phase. Specifically, `js/api.js` was rewritten into an asynchronous HTTP client, but the rest of the frontend (`js/main.js`, `js/dashboard.js`, `js/admin.js`, `js/verification.js`, `js/logistics.js`, `js/driver.js`, `login.html`) was left calling legacy synchronous mock methods (`NextraApi.*`), leading to broken initialization and authentication redirect loops.

**Crucially, all backend code, models, database tables, and seeded records are intact, healthy, and operational.** No code needs to be thrown away; the remaining work consists of connecting the existing frontend modules to the running backend.

---

## 2. Current Architecture

### 2.1 Technology Stack
- **Backend**: FastAPI (Python 3.12+), Uvicorn server, running on `http://localhost:8000`.
- **Database**: SQLite (`backend/nextra.db`), SQLAlchemy 2.0 ORM, Pydantic v2 schemas.
- **Authentication**: JWT (JSON Web Tokens) with HS256 algorithm and bcrypt password hashing.
- **Role Authorization**: Role-based access control (RBAC) enforced via FastAPI dependency injection (`require_role(...)`).
- **File Storage**: Local uploads directory at `backend/uploads` with static mounting at `/uploads`.
- **Frontend Core**: Vanilla HTML5, CSS3 (`style.css`, `css/auth.css`), and modular JavaScript (`js/*.js`).
- **GIS & Mapping**: Leaflet.js with CartoDB Voyager/Dark and OpenStreetMap raster tiles, covering all 8 NER states and arterial highway corridors (NH-27, NH-6, NH-29, NH-10, NH-13).
- **Typography & Theme**: Google Fonts (Plus Jakarta Sans, JetBrains Mono); Dark/Light multi-state command center aesthetic.

### 2.2 System Topology
```
┌────────────────────────────────────────────────────────────────────────┐
│                        NEXTRA Frontend Client                          │
│                                                                        │
│   login.html / signup.html       index.html (Single-Page Command Deck) │
│              │                               │                         │
│              ▼                               ▼                         │
│       js/api.js (HTTP Client) ◄────── js/auth.js (JWT Session)         │
│              │                               │                         │
│              │    js/navigation.js (Role Guard & Dynamic Sidebar)       │
│              │    js/dashboard.js  (Role-Tailored KPI Dashboards)      │
│              │    js/map.js        (Leaflet Real NER GIS Telemetry)    │
│              │    js/verification.js (AI + Human Review Queue)         │
│              │    js/logistics.js  (Fleet Dispatch & Requests)         │
│              │    js/driver.js     (In-Cab Cockpit & Hazard Upload)    │
│              │    js/admin.js      (User & Field Officer Governance)   │
└──────────────┼─────────────────────────────────────────────────────────┘
               │  REST API (JSON & Multipart Form-Data) / JWT Bearer
               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Backend Engine                          │
│                                                                        │
│   app/main.py (Mounts all 12 routers, CORS, Static Files & /uploads)   │
│   ├── /api/auth          ├── /api/users          ├── /api/dashboard    │
│   ├── /api/vehicles      ├── /api/drivers        ├── /api/shipments    │
│   ├── /api/reports       ├── /api/verification   ├── /api/risks        │
│   ├── /api/notifications ├── /api/map/overview   ├── /api/alerts, etc. │
│                                                                        │
│   app/services/                                                        │
│   ├── risk_engine.py        (Weather & incident multi-factor scoring)  │
│   ├── dashboard_service.py  (Aggregated live operational KPIs)         │
│   └── notification_service.py (Targeted role & user push alerts)       │
└──────────────┼─────────────────────────────────────────────────────────┘
               │  SQLAlchemy ORM
               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     SQLite Database (nextra.db)                        │
│                                                                        │
│   • users (12)          • regions (8 states)    • routes (6 corridors) │
│   • drivers (30)        • vehicles (30)         • shipments (10)       │
│   • risk_events (5)     • field_reports (5)     • verifications (4)    │
│   • alerts (5)          • weather_data (8)      • audit_logs (7)       │
│   • notifications (7)                                                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Audit

### 3.1 Backend & Database (✅ Completed)
| Component | Status | Details |
|---|---|---|
| **FastAPI Core (`backend/app/main.py`)** | ✅ Completed | Runs healthy on port 8000; CORS configured; `/uploads` mounted; frontend static assets mounted; Swagger docs active at `/docs`. |
| **SQLAlchemy Engine & Base (`database.py`)** | ✅ Completed | SQLite engine with foreign key support enabled. |
| **Database Schema (`models/*.py`)** | ✅ Completed | All 13 models implemented: `User`, `Region`, `Driver`, `Vehicle`, `Shipment`, `Route`, `RiskEvent`, `FieldReport`, `Verification`, `Notification`, `Alert`, `WeatherData`, `AuditLog`. |
| **Pydantic Schemas (`schemas/schemas.py`)** | ✅ Completed | Complete request and response models with `from_attributes = True`. |
| **Database Seeding (`database/seed.py`)** | ✅ Completed | Seeded and verified: 12 users (Admin, 8 Field Officers for each state, Logistics, Driver), 8 regions, 30 drivers, 30 vehicles with live GPS coords, 10 shipments, 5 risk events, 4 verifications, 5 alerts, 8 weather records, 7 notifications. |
| **Authentication Router (`routers/auth.py`)** | ✅ Completed | `POST /api/auth/login`, `POST /api/auth/signup`, `GET /api/auth/me`. Issues signed JWT tokens. |
| **User & FO Router (`routers/users.py`)** | ✅ Completed | `GET /api/users`, `GET /api/users/field-officers`, `POST /api/users/field-officers` (Admin-only), `PATCH /api/users/{id}`. |
| **Dashboard Router (`routers/dashboard.py`)** | ✅ Completed | `GET /api/dashboard/summary` backed by `dashboard_service.py` calculating dynamic counts from DB. |
| **Vehicles & Drivers Routers** | ✅ Completed | `GET /api/vehicles`, `GET /api/vehicles/{id}`, `PATCH /api/vehicles/{id}/location`, `GET /api/drivers`. |
| **Shipments Router (`routers/shipments.py`)** | ✅ Completed | `GET /api/shipments`, `GET /api/shipments/{id}`, `POST /api/shipments`, `PATCH /api/shipments/{id}/status`. |
| **Field Reports & Uploads (`routers/reports.py`)** | ✅ Completed | `POST /api/reports` with `UploadFile` multipart processing; saves image to disk; generates mock AI analysis; automatically creates `Verification` queue item; dispatches alerts. |
| **Verification Router (`routers/verification.py`)**| ✅ Completed | `GET /api/verification` (area-scoped for FO, global for Admin), `POST /api/verification/{id}/decide` (logs decision, reviewer, and updates report status). |
| **Risk Engine (`services/risk_engine.py`)** | ✅ Completed | Multi-factor risk calculation incorporating weather data, active field reports, and road incidents. |
| **Composite Map Router (`routers/misc.py`)** | ✅ Completed | `GET /api/map/overview` bundles all 30 vehicles, routes, hubs, hazards, and weather. |

---

### 3.2 Frontend Files & UI State (⚡ Partially Completed / Needs Wiring)

| Component | Status | Current State & Gaps |
|---|---|---|
| **API Client (`js/api.js`)** | ⚡ Partial | Contains modern async `NextraAuth`, `NextraDashboard`, `NextraUsers`, `NextraMap`, `NextraVehicles`, `NextraShipments`, `NextraReports`, `NextraVerification`, etc. However, it completely dropped the legacy `NextraApi` object that the rest of the frontend still calls. |
| **Authentication (`js/auth.js`)** | ⚡ Partial | Has `NextraAuth` hooks, `updateUserChrome`, `switchRole` for SIH evaluator demo switching. Needs integration with dashboard startup. |
| **Navigation (`js/navigation.js`)** | ✅ Completed | Role-tailored menus for Admin, Field Officer, Logistics, Driver. **Smart Route successfully removed from sidebar**, with routing kept in Map and Shipments. |
| **GIS Map Engine (`js/map.js`)** | ⚡ Partial | Real Leaflet map with multiple basemaps and Northeast highway corridors works, but `drawLiveFleet()` uses 4 hardcoded vehicles instead of fetching all 30 vehicles from `/api/map/overview`. |
| **Dashboards (`js/dashboard.js`)** | ⚡ Partial | Rich HTML layouts for all 4 roles exist, but currently attempt to read from non-existent `NextraApi.*` methods instead of calling `NextraDashboard.getSummary()`. |
| **Verification Center (`js/verification.js`)** | ⚡ Partial | AI vision preview cards and review UI exist, but read from `NextraApi.getVerificationRecords()` and call `NextraApi.verifyEvidence()` instead of `NextraVerification` API. |
| **Logistics Module (`js/logistics.js`)** | ⚡ Partial | Transport request form, truck/driver matching UI, and shipment tracker exist, but call `NextraApi` mock methods instead of `NextraShipments` API. |
| **Driver Portal (`js/driver.js`)** | ⚡ Partial | Route waypoints, nearby drivers radar, and photo incident reporting UI exist, but submit via `NextraApi.submitRoadIncident()` instead of `NextraReports.submit(formData)`. |
| **Admin Module (`js/admin.js`)** | ⚡ Partial | User management table and audit trail UI exist, but call `NextraApi.getUsers()` and `NextraApi.createUser()` instead of `NextraUsers` API. |
| **Login Page (`login.html`)** | 🔴 Broken | Submits to `data/demo-users.js` and writes `nextra_session` to localStorage without calling `/api/auth/login`. When redirecting to `index.html`, session validation fails and redirects back to `login.html`. |
| **Signup Page (`signup.html`)** | ⚡ Partial | Complete form UI with role selection, but saves locally to localStorage rather than calling `NextraAuth.signup()`. |
| **Password Reset (`forgot-password.html`)** | ⚡ Partial | Step 1 & 2 UI complete, but runs against localStorage mock accounts. |
| **Notifications (`js/notifications.js`)** | ❌ Missing | Backend has complete notifications API, but frontend has no dedicated `notifications.js` module or UI dropdown/drawer to view and clear notifications. |

---

## 4. Key Broken & Blocking Issues

1. **Fatal JavaScript Crash on Application Load**:
   - `js/main.js` line 8 executes `NextraApi.initDatabase()`.
   - `NextraApi` is undefined in `js/api.js`.
   - Result: `Uncaught ReferenceError: NextraApi is not defined` breaks the DOM ready sequence before maps, dashboards, or sessions can initialize.

2. **Login Redirect Loop**:
   - `login.html` authenticates via `validateCredentials()` from `data/demo-users.js` and stores `{ nextra_session: ... }`.
   - `index.html` loads `js/auth.js` which checks `NextraAuth.isAuthenticated()` (`localStorage.getItem("nextra_jwt")`).
   - Because no JWT was saved by `login.html`, `js/auth.js` redirects back to `login.html`, creating an infinite bounce.

3. **Synchronous vs Asynchronous Mismatch**:
   - The UI modules (`js/dashboard.js`, `js/admin.js`, etc.) expect data synchronously (e.g. `const shipments = NextraApi.getShipments()`).
   - The backend client (`js/api.js`) is asynchronous (`async getSummary()`, `async getAll()`).
   - Need either async rendering/state caching or a lightweight local data cache populated from API on initialization.

4. **Hardcoded Fleet vs Backend 30 Vehicles**:
   - Map only shows 4 hardcoded trucks, whereas the backend has 30 realistic vehicles across Assam, Meghalaya, Sikkim, Arunachal, etc.

5. **Field Photo Evidence Disconnect**:
   - Driver photo upload does not post multipart `FormData` to `/api/reports`, so uploaded images do not reach `backend/uploads` or the verification database table.

---

## 5. Verification of Critical Requirements

| Requirement | Current Status | Notes |
|---|---|---|
| **Proper backend** | ✅ Verified | FastAPI 2.0 app running with 12 routers. |
| **Authentication** | ✅ Backend / ⚡ Frontend | JWT backend ready; frontend needs `login.html` & `auth.js` unification. |
| **Backend role authorization** | ✅ Verified | Enforced via `require_role(...)` in FastAPI dependencies. |
| **SQLite database** | ✅ Verified | `backend/nextra.db` populated and verified (13 tables). |
| **FastAPI** | ✅ Verified | Operational on port 8000 with healthcheck responding `status: ok`. |
| **Real interactive NER map** | ⚡ Partial | Leaflet configured with 8-state corridors; needs live 30 vehicles from API. |
| **Many connected drivers/vehicles** | ✅ Database / ⚡ Frontend | 30 drivers and 30 vehicles seeded in DB; needs map hook. |
| **Area-specific data** | ✅ Verified | All 8 NER states represented with custom lat/lng, risks, and weather. |
| **Risk intelligence** | ✅ Backend / ⚡ Frontend | `risk_engine.py` scoring ready; frontend UI needs dynamic hook. |
| **Field reports** | ✅ Backend / ⚡ Frontend | Schema & endpoint ready; driver submit form needs wiring. |
| **Image upload & verification** | ✅ Backend / ⚡ Frontend | Multipart file storage and AI simulation ready; UI forms need wiring. |
| **Notifications** | ✅ Backend / ❌ Frontend | Backend complete; frontend UI panel missing. |
| **Shipments & Logistics** | ✅ Backend / ⚡ Frontend | CRUD & status transitions ready; frontend needs async connection. |
| **Admin can add Field Officers** | ✅ Backend / ⚡ Frontend | `POST /api/users/field-officers` ready; admin modal needs wiring. |
| **Smart Route NOT separate page** | ✅ Verified | Removed from sidebar; route intelligence embedded in map/shipments. |
| **Alternate routing in map/risk** | ✅ Verified | Corridors, road blockages, and bypasses defined in map and database. |

---

## 6. Recommended Continuation Plan (Execution Order)

To bring the project to 100% working demo-ready completion without rewriting working systems, execute in this exact sequence:

1. **Step 1: Unify Authentication & API Bridge (`login.html`, `js/api.js`, `js/session.js`)**
   - Update `login.html` to call `NextraAuth.login(email, password)` via `fetch`, store the JWT token in `localStorage`, and redirect to `index.html`.
   - Update `signup.html` to call `NextraAuth.signup(...)`.
   - Provide a clean, backward-compatible `NextraApi` adapter inside `js/api.js` that bridges existing synchronous callers to cached backend data, OR upgrade callers to async so existing components don't crash.

2. **Step 2: Connect Interactive Live Map to Backend (`js/map.js`)**
   - Fetch `/api/map/overview` on map load.
   - Render all 30 live vehicles across the 8 NER states with dynamic status colors, driver popups, and telemetry markers.
   - Bind live risk zones and weather layers from backend data.

3. **Step 3: Connect Role-Based Dashboards (`js/dashboard.js`)**
   - Fetch live KPI metrics from `/api/dashboard/summary` for Admin, Field Officer, Logistics, and Driver.
   - Ensure the in-dashboard role switcher (`switchRole`) seamlessly pulls each role's data without page reload.

4. **Step 4: Connect Verification & Ground-Truth System (`js/verification.js`, `js/driver.js`)**
   - Wire driver incident report form to submit multipart `FormData` (including photo) to `POST /api/reports`.
   - Connect Verification Center to load from `GET /api/verification` (respecting Field Officer state scoping) and call `POST /api/verification/{id}/decide`.

5. **Step 5: Connect Logistics & Shipments Operations (`js/logistics.js`)**
   - Connect "Create Transportation Request" form to `POST /api/shipments`.
   - Connect live shipment status updates and fleet matching.

6. **Step 6: Connect Admin Governance (`js/admin.js`)**
   - Connect user directory to `GET /api/users` and "Add Field Officer" form to `POST /api/users/field-officers`.
   - Connect audit trail table to `GET /api/audit-logs`.

7. **Step 7: Implement Notifications UI (`js/notifications.js`)**
   - Create notification drawer/dropdown to display unread alerts from `GET /api/notifications`.
   - Provide "Mark All as Read" and live count badge sync.

8. **Step 8: End-to-End Verification & SIH Demo Walkthrough**
   - Verify all 4 roles end-to-end in browser.
   - Confirm all buttons, forms, and maps are connected to real backend data.

---
*Audit completed. Awaiting user review and authorization before proceeding to implementation.*
