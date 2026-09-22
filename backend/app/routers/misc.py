"""
NEXTRA - Alerts, Map, Weather, Routes, Audit Logs & Area Intelligence Routers
"""
import json
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.dependencies import get_db, get_current_user, require_role
from app.models.alert import Alert
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.risk import RiskEvent
from app.models.field_report import FieldReport
from app.models.route import Route
from app.models.weather import WeatherData
from app.models.region import Region
from app.models.shipment import Shipment
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.schemas import (
    AlertOut, AlertCreateRequest, VehicleOut, RiskOut, FieldReportOut, RouteOut,
    WeatherOut, WeatherUpdateRequest, RegionOut, ShipmentOut, AuditLogOut, AreaIntelligenceOut, DriverOut,
    AffectedRoadOut, AccessibilityOut, AccessibilityUpdateRequest
)
from app.services.notification_service import notify_critical_risk
from app.services.risk_engine import (
    calculate_route_risk, process_weather_cascade, update_area_accessibility,
    get_affected_routes_for_state, calculate_area_risk
)
from typing import List, Optional, Dict, Any

# ── ALERTS ──────────────────────────────────────────────────
alerts_router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@alerts_router.get("", response_model=List[AlertOut])
def get_alerts(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Alert)
    if active_only:
        query = query.filter(Alert.active == 1)
    alerts = query.order_by(Alert.id.desc()).all()
    return [AlertOut.model_validate(a) for a in alerts]


@alerts_router.post("", response_model=AlertOut)
def create_alert(
    request: AlertCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "field_officer")),
):
    """Create a new broadcast alert and optionally notify relevant users."""
    alert = Alert(
        title=request.title.strip(),
        description=request.description.strip() if request.description else "",
        severity=request.severity.upper().strip(),
        state=request.state.strip() if request.state else "Northeast Region",
        district=request.district.strip() if request.district else "",
        latitude=request.latitude,
        longitude=request.longitude,
        alert_type=request.alert_type.upper().strip(),
        active=1
    )
    db.add(alert)
    db.flush()

    # If CRITICAL or HIGH, trigger targeted notifications
    if alert.severity in ["CRITICAL", "HIGH"] and alert.state:
        notify_critical_risk(
            db,
            state=alert.state,
            location=alert.district or alert.state,
            risk_title=alert.title,
            description=alert.description or "Urgent regional corridor advisory"
        )

    db.add(AuditLog(
        user_id=current_user.id,
        user_name=current_user.name,
        user_role=current_user.role,
        action="ALERT_BROADCAST",
        affected_record=f"ALT-{alert.id} ({alert.title})",
        new_value=f"{alert.severity} - {alert.state}"
    ))

    db.commit()
    db.refresh(alert)
    return AlertOut.model_validate(alert)



# ── WEATHER ─────────────────────────────────────────────────
weather_router = APIRouter(prefix="/api/weather", tags=["Weather"])


@weather_router.get("", response_model=List[WeatherOut])
def get_weather(
    state: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve weather telemetry by area with temperature, rainfall, condition, wind, and timestamp."""
    query = db.query(WeatherData)
    if state and state.upper() != "ALL":
        query = query.filter(WeatherData.state.ilike(f"%{state}%"))
    records = query.all()
    return [WeatherOut.model_validate(w) for w in records]


@weather_router.post("")
def update_weather(
    payload: WeatherUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Store weather data by area and execute the real-time cascade:
    Heavy rainfall -> Risk increases -> Route becomes HIGH RISK -> Alert generated -> Map reflects risk -> Drivers/Logistics notified.
    """
    rain = payload.rainfall if payload.rainfall is not None else (payload.rainfall_mm or 0.0)
    cond = payload.condition or "Clear"
    temp = payload.temperature if payload.temperature is not None else payload.temperature_c
    wind = payload.wind if payload.wind is not None else payload.wind_speed_kmh

    result = process_weather_cascade(
        db=db,
        state=payload.state,
        rainfall=rain,
        condition=cond,
        temperature=temp,
        wind=wind,
        district=payload.district
    )
    w_dict = result.get("weather", {})
    return {
        "state": result["state"],
        "temperature": w_dict.get("temperature"),
        "rainfall": w_dict.get("rainfall"),
        "condition": w_dict.get("condition"),
        "wind": w_dict.get("wind"),
        "timestamp": w_dict.get("timestamp"),
        "temperature_c": w_dict.get("temperature"),
        "rainfall_mm": w_dict.get("rainfall"),
        "wind_speed_kmh": w_dict.get("wind"),
        "cascade": {
            "accessibility_status": result["accessibility"]["status"],
            "accessibility_score": result["accessibility"]["score"],
            "risk_level": result["risk"]["risk_level"],
            "risk_score": result["risk"]["risk_score"],
            "alert_generated": result["alert"] is not None,
            "alert": result["alert"],
            "notifications_count": result["notifications_count"],
            "affected_routes": result["affected_routes"]
        },
        **result
    }


@weather_router.put("/{state}")
def update_weather_for_state(
    state: str,
    payload: WeatherUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update weather data for a specific state and execute the inter-system cascade."""
    target_state = state or payload.state
    rain = payload.rainfall if payload.rainfall is not None else (payload.rainfall_mm or 0.0)
    cond = payload.condition or "Clear"
    temp = payload.temperature if payload.temperature is not None else payload.temperature_c
    wind = payload.wind if payload.wind is not None else payload.wind_speed_kmh

    result = process_weather_cascade(
        db=db,
        state=target_state,
        rainfall=rain,
        condition=cond,
        temperature=temp,
        wind=wind,
        district=payload.district
    )
    w_dict = result.get("weather", {})
    return {
        "state": result["state"],
        "temperature": w_dict.get("temperature"),
        "rainfall": w_dict.get("rainfall"),
        "condition": w_dict.get("condition"),
        "wind": w_dict.get("wind"),
        "timestamp": w_dict.get("timestamp"),
        "temperature_c": w_dict.get("temperature"),
        "rainfall_mm": w_dict.get("rainfall"),
        "wind_speed_kmh": w_dict.get("wind"),
        "cascade": {
            "accessibility_status": result["accessibility"]["status"],
            "accessibility_score": result["accessibility"]["score"],
            "risk_level": result["risk"]["risk_level"],
            "risk_score": result["risk"]["risk_score"],
            "alert_generated": result["alert"] is not None,
            "alert": result["alert"],
            "notifications_count": result["notifications_count"],
            "affected_routes": result["affected_routes"]
        },
        **result
    }


# ── ACCESSIBILITY ───────────────────────────────────────────
accessibility_router = APIRouter(prefix="/api/accessibility", tags=["Accessibility"])


@accessibility_router.get("", response_model=List[AccessibilityOut])
def get_accessibility(
    state: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve regional accessibility statuses:
    OPEN, PARTIALLY AFFECTED, BLOCKED, CLOSED
    with all-weather score, active disruptions, weather summary, and corridor intelligence.
    """
    query = db.query(Region)
    if state and state.upper() != "ALL":
        query = query.filter(Region.state.ilike(f"%{state}%"))
    regions = query.all()
    results = []

    for reg in regions:
        # Check active disruptions
        reports = db.query(FieldReport).filter(
            FieldReport.state.ilike(f"%{reg.state}%"),
            FieldReport.status.in_(["PENDING", "VERIFIED"])
        ).all()
        disruptions = [f"{r.incident_type} at {r.location_name or r.district or reg.state}" for r in reports]

        # Check weather summary
        w = db.query(WeatherData).filter(WeatherData.state.ilike(f"%{reg.state}%")).first()
        w_summary = f"{w.condition} · {w.temperature_c}°C · {w.rainfall_mm} mm/h rain" if w else "Nominal Weather"
        w_out = WeatherOut.model_validate(w) if w else None

        routes = get_affected_routes_for_state(db, reg.state)

        # Canonical status validation
        canonical_status = (reg.accessibility_status or "OPEN").upper()
        if canonical_status not in ["OPEN", "PARTIALLY AFFECTED", "BLOCKED", "CLOSED"]:
            if canonical_status == "PARTIALLY_AFFECTED":
                canonical_status = "PARTIALLY AFFECTED"
            elif reg.accessibility_score and reg.accessibility_score < 40:
                canonical_status = "BLOCKED"
            elif reg.accessibility_score and reg.accessibility_score < 68:
                canonical_status = "PARTIALLY AFFECTED"
            else:
                canonical_status = "OPEN"

        results.append(AccessibilityOut(
            id=reg.id,
            state=reg.state,
            name=reg.name,
            accessibility_status=canonical_status,
            accessibility_score=reg.accessibility_score or 75,
            road_status=reg.road_status or f"Corridors {canonical_status}",
            description=reg.description or f"{reg.state} multi-modal freight passage",
            active_disruptions=disruptions,
            active_disruptions_count=len(disruptions),
            weather_summary=w_summary,
            weather=w_out,
            risk_level=reg.risk_level or "LOW",
            affected_routes=routes,
            center_lat=reg.center_lat,
            center_lng=reg.center_lng
        ))

    return results


@accessibility_router.get("/{state}", response_model=AccessibilityOut)
def get_accessibility_by_state(
    state: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve accessibility for a single state."""
    clean_state = state.strip()
    reg = db.query(Region).filter(Region.state.ilike(f"%{clean_state}%")).first()
    if not reg:
        raise HTTPException(status_code=404, detail=f"State '{state}' not found.")

    reports = db.query(FieldReport).filter(
        FieldReport.state.ilike(f"%{reg.state}%"),
        FieldReport.status.in_(["PENDING", "VERIFIED"])
    ).all()
    disruptions = [f"{r.incident_type} at {r.location_name or r.district or reg.state}" for r in reports]

    w = db.query(WeatherData).filter(WeatherData.state.ilike(f"%{reg.state}%")).first()
    w_summary = f"{w.condition} · {w.temperature_c}°C · {w.rainfall_mm} mm/h rain" if w else "Nominal Weather"
    w_out = WeatherOut.model_validate(w) if w else None
    routes = get_affected_routes_for_state(db, reg.state)

    canonical_status = (reg.accessibility_status or "OPEN").upper()
    if canonical_status == "PARTIALLY_AFFECTED":
        canonical_status = "PARTIALLY AFFECTED"
    elif canonical_status not in ["OPEN", "PARTIALLY AFFECTED", "BLOCKED", "CLOSED"]:
        canonical_status = "OPEN"

    return AccessibilityOut(
        id=reg.id,
        state=reg.state,
        name=reg.name,
        accessibility_status=canonical_status,
        accessibility_score=reg.accessibility_score or 75,
        road_status=reg.road_status or f"Corridors {canonical_status}",
        description=reg.description or f"{reg.state} multi-modal freight passage",
        active_disruptions=disruptions,
        active_disruptions_count=len(disruptions),
        weather_summary=w_summary,
        weather=w_out,
        risk_level=reg.risk_level or "LOW",
        affected_routes=routes,
        center_lat=reg.center_lat,
        center_lng=reg.center_lng
    )


@accessibility_router.put("/{state}", response_model=AccessibilityOut)
def update_accessibility(
    state: str,
    payload: AccessibilityUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update accessibility status for a state and synchronize risk engine."""
    clean_state = state.strip()
    reg = db.query(Region).filter(Region.state.ilike(f"%{clean_state}%")).first()
    if not reg:
        raise HTTPException(status_code=404, detail=f"State '{state}' not found.")

    if payload.accessibility_status:
        st = payload.accessibility_status.strip().upper()
        if st in ["OPEN", "PARTIALLY AFFECTED", "BLOCKED", "CLOSED"]:
            reg.accessibility_status = st
        elif st == "PARTIALLY_AFFECTED":
            reg.accessibility_status = "PARTIALLY AFFECTED"

    if payload.accessibility_score is not None:
        reg.accessibility_score = payload.accessibility_score
    if payload.road_status:
        reg.road_status = payload.road_status
    if payload.description:
        reg.description = payload.description

    db.commit()
    db.refresh(reg)

    # Re-evaluate area risk with new accessibility
    area_risk = calculate_area_risk(db, reg.state)
    reg.risk_level = area_risk["risk_level"]
    db.commit()

    return get_accessibility_by_state(reg.state, db, current_user)


# ── ROUTES ──────────────────────────────────────────────────
routes_router = APIRouter(prefix="/api/routes", tags=["Routes"])


@routes_router.get("", response_model=List[RouteOut])
def get_routes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    routes = db.query(Route).order_by(Route.id).all()
    return [RouteOut.model_validate(r) for r in routes]


@routes_router.get("/{route_id}", response_model=RouteOut)
def get_route(route_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(Route).filter(Route.id == route_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Route not found.")
    return RouteOut.model_validate(r)


# ── REGIONS & AREA INTELLIGENCE ─────────────────────────────
regions_router = APIRouter(prefix="/api/regions", tags=["Regions"])


@regions_router.get("", response_model=List[RegionOut])
def get_regions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    regions = db.query(Region).order_by(Region.id).all()
    return [RegionOut.model_validate(r) for r in regions]


@regions_router.get("/{identifier}/intelligence", response_model=AreaIntelligenceOut)
def get_area_intelligence(
    identifier: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve comprehensive area intelligence for an area/region (all 11 data points)."""
    clean_id = identifier.strip()
    if clean_id.isdigit():
        region = db.query(Region).filter(Region.id == int(clean_id)).first()
    else:
        region = db.query(Region).filter(Region.state.ilike(clean_id)).first()

    if not region:
        region = db.query(Region).filter(Region.state.ilike(f"%{clean_id}%")).first()

    if not region:
        raise HTTPException(status_code=404, detail=f"Region '{identifier}' not found.")

    state = region.state

    # 1. Active Drivers
    drivers = db.query(Driver).filter(
        Driver.assigned_state.ilike(f"%{state}%"),
        Driver.status.in_(["ACTIVE", "IDLE", "DELAYED"])
    ).all()
    active_drivers_list = []
    for d in drivers:
        v = db.query(Vehicle).filter(Vehicle.driver_id == d.id).first()
        active_drivers_list.append({
            "id": d.id,
            "driver_id": d.driver_code,
            "name": d.name,
            "phone": d.phone,
            "assigned_area": f"{d.assigned_state} - {d.assigned_district or ''}".strip(" -"),
            "status": d.status,
            "rating": d.rating,
            "safety_score": d.safety_score,
            "vehicle_registration": v.registration_number if v else None
        })

    # 2. Active Vehicles
    vehicles = db.query(Vehicle).filter(
        Vehicle.state.ilike(f"%{state}%"),
        Vehicle.status.in_(["ACTIVE", "IDLE", "DELAYED"])
    ).all()
    active_vehicles_list = []
    for v in vehicles:
        d = db.query(Driver).filter(Driver.id == v.driver_id).first() if v.driver_id else None
        active_vehicles_list.append({
            "id": v.id,
            "registration": v.registration_number,
            "vehicle_type": v.vehicle_type,
            "capacity": f"{v.capacity_kg} kg",
            "status": v.status,
            "speed_kmh": v.speed_kmh,
            "driver_name": d.name if d else "Unassigned",
            "current_location": v.current_location_name or f"{state} Corridor"
        })

    # 3. Shipments
    shipments = db.query(Shipment).filter(
        or_(
            Shipment.pickup_location.ilike(f"%{state}%"),
            Shipment.destination.ilike(f"%{state}%"),
            Shipment.corridor.ilike(f"%{state}%")
        ),
        Shipment.status.in_(["PLANNED", "ASSIGNED", "IN_TRANSIT", "DELAYED", "AT_RISK"])
    ).all()
    shipment_list = []
    for s in shipments:
        shipment_list.append({
            "id": s.id,
            "code": s.shipment_code,
            "cargo": s.cargo_type,
            "weight_kg": s.weight_kg,
            "priority": s.priority,
            "pickup": s.pickup_location,
            "destination": s.destination,
            "status": s.status,
            "eta": s.eta,
            "risk_level": s.risk_level
        })

    # 4. Delays
    delayed_vehicles = db.query(Vehicle).filter(
        Vehicle.state.ilike(f"%{state}%"),
        Vehicle.status == "DELAYED"
    ).all()
    delayed_shipments = db.query(Shipment).filter(
        or_(
            Shipment.pickup_location.ilike(f"%{state}%"),
            Shipment.destination.ilike(f"%{state}%"),
            Shipment.corridor.ilike(f"%{state}%")
        ),
        Shipment.status.in_(["DELAYED", "AT_RISK"])
    ).all()
    delays_list = []
    for dv in delayed_vehicles:
        delays_list.append({
            "type": "VEHICLE_DELAY",
            "identifier": dv.registration_number,
            "location": dv.current_location_name or state,
            "reason": f"Vehicle stalled / traffic bottleneck in {state}"
        })
    for ds in delayed_shipments:
        delays_list.append({
            "type": "SHIPMENT_DELAY",
            "identifier": ds.shipment_code,
            "location": f"{ds.pickup_location} -> {ds.destination}",
            "reason": ds.risk_reason or "Corridor weather/blockage delay"
        })

    # 5. Risks
    risks = db.query(RiskEvent).filter(
        RiskEvent.state.ilike(f"%{state}%"),
        RiskEvent.active == 1
    ).all()
    risk_list = []
    for r in risks:
        factors = []
        if r.contributing_factors:
            try:
                factors = json.loads(r.contributing_factors)
            except Exception:
                pass
        risk_list.append({
            "id": r.id,
            "event_type": r.event_type,
            "risk_level": r.risk_level,
            "risk_score": r.risk_score,
            "description": r.description,
            "district": r.district,
            "factors": factors
        })

    # 6. Field Reports
    reports = db.query(FieldReport).filter(
        FieldReport.state.ilike(f"%{state}%")
    ).order_by(FieldReport.id.desc()).limit(10).all()
    report_list = []
    for rep in reports:
        report_list.append({
            "id": rep.id,
            "code": rep.report_code,
            "incident_type": rep.incident_type,
            "severity": rep.severity,
            "status": rep.status,
            "description": rep.description,
            "reporter_name": rep.reporter_name,
            "created_at": rep.created_at.isoformat() if rep.created_at else None
        })

    # 7. Alerts
    alerts = db.query(Alert).filter(
        or_(
            Alert.state.ilike(f"%{state}%"),
            Alert.region_id == region.id
        ),
        Alert.active == 1
    ).all()
    alert_list = []
    for a in alerts:
        alert_list.append({
            "id": a.id,
            "title": a.title,
            "severity": a.severity,
            "description": a.description,
            "alert_type": a.alert_type or "ROAD_ALERT",
            "district": a.district,
            "created_at": a.created_at.isoformat() if a.created_at else None
        })

    # 8. Weather
    w = db.query(WeatherData).filter(WeatherData.state.ilike(f"%{state}%")).first()
    weather_dict = None
    if w:
        weather_dict = {
            "condition": w.condition,
            "temperature": w.temperature_c,
            "rainfall": w.rainfall_mm,
            "wind_speed": w.wind_speed_kmh,
            "humidity": w.humidity_pct,
            "recorded_at": w.updated_at.isoformat() if w.updated_at else None
        }

    # 9. Accessibility
    accessibility_dict = {
        "status": region.accessibility_status or "OPEN",
        "score": region.accessibility_score,
        "road_status": region.road_status or "Passable",
        "description": region.description or f"{state} corridor grid"
    }

    # 10 & 11. Open Routes and Blocked Routes
    routes = db.query(Route).all()
    open_routes = []
    blocked_routes = []
    for rt in routes:
        passes_through = (
            state.lower() in rt.origin.lower() or
            state.lower() in rt.destination.lower() or
            (rt.highway and state.lower() in rt.highway.lower()) or
            (rt.name and state.lower() in rt.name.lower())
        )
        if passes_through:
            rt_data = {
                "id": rt.id,
                "name": rt.name,
                "origin": rt.origin,
                "destination": rt.destination,
                "corridor": rt.highway or "Arterial Corridor",
                "distance_km": rt.distance_km,
                "estimated_time_hours": rt.estimated_hours,
                "status": rt.status,
                "risk_level": rt.risk_level
            }
            if rt.status in ["OPEN", "PASSABLE"]:
                open_routes.append(rt_data)
            else:
                blocked_routes.append(rt_data)

    return {
        "state": region.state,
        "name": region.name,
        "center_lat": region.center_lat,
        "center_lng": region.center_lng,
        "zoom_level": region.zoom_level,
        "active_drivers_count": len(active_drivers_list),
        "active_drivers": active_drivers_list,
        "active_vehicles_count": len(active_vehicles_list),
        "active_vehicles": active_vehicles_list,
        "shipments_count": len(shipment_list),
        "shipments": shipment_list,
        "delays_count": len(delays_list),
        "delays": delays_list,
        "risks_count": len(risk_list),
        "risks": risk_list,
        "field_reports_count": len(report_list),
        "field_reports": report_list,
        "alerts_count": len(alert_list),
        "alerts": alert_list,
        "weather": weather_dict,
        "accessibility": accessibility_dict,
        "open_routes_count": len(open_routes),
        "open_routes": open_routes,
        "blocked_routes_count": len(blocked_routes),
        "blocked_routes": blocked_routes
    }


# ── AUDIT LOGS ──────────────────────────────────────────────
audit_router = APIRouter(prefix="/api/audit-logs", tags=["Audit Logs"])


@audit_router.get("", response_model=List[AuditLogOut])
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(100).all()
    return [AuditLogOut.model_validate(l) for l in logs]


# ── MAP OVERVIEW ────────────────────────────────────────────
map_router = APIRouter(prefix="/api/map", tags=["Map"])

STATE_CITIES = {
    "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur", "Bongaigaon", "Kamrup"],
    "Meghalaya": ["Shillong", "Jowai", "Tura", "Nongpoh", "Cherrapunji", "Sonapur", "East Khasi", "West Khasi", "Jaintia", "Garo"],
    "Arunachal Pradesh": ["Itanagar", "Tawang", "Pasighat", "Ziro", "Naharlagun", "Bomdila"],
    "Nagaland": ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha"],
    "Manipur": ["Imphal", "Churachandpur", "Thoubal", "Bishnupur"],
    "Mizoram": ["Aizawl", "Lunglei", "Champhai", "Kolasib", "Vairengte", "Serchhip"],
    "Tripura": ["Agartala", "Udaipur", "Dharmanagar", "Kailashahar"],
    "Sikkim": ["Gangtok", "Namchi", "Gyalshing", "Mangan", "Teesta", "Siliguri"]
}

ROUTE_STATES = {
    1: ["Assam", "West Bengal", "Sikkim"],
    2: ["Assam", "Meghalaya", "Tripura"],
    3: ["Assam", "Nagaland", "Manipur"],
    4: ["Sikkim", "West Bengal"],
    5: ["Assam", "Tripura", "Mizoram"],
    6: ["Assam", "Mizoram"]
}

def text_matches_state(text: Optional[str], state_name: Optional[str]) -> bool:
    if not text or not state_name or state_name.upper() == "ALL":
        return True
    t_lower = text.lower()
    s_lower = state_name.lower()
    if s_lower in t_lower:
        return True
    cities = STATE_CITIES.get(state_name, [])
    return any(c.lower() in t_lower for c in cities)


@map_router.get("/overview")
def get_map_overview(
    state: Optional[str] = None,
    district: Optional[str] = None,
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all map data in a single call: drivers, vehicles, shipments, reports, risks, alerts, routes, affected roads, weather, regions."""
    # 1. Shipments
    shipments_query = db.query(Shipment).order_by(Shipment.id.desc())
    if status and status.upper() != "ALL":
        shipments_query = shipments_query.filter(Shipment.status == status.upper())
    if risk_level and risk_level.upper() != "ALL":
        shipments_query = shipments_query.filter(Shipment.risk_level == risk_level.upper())

    raw_shipments = shipments_query.all()
    shipment_list = []
    vehicle_shipment_map = {}
    for s in raw_shipments:
        if state and state.upper() != "ALL":
            matches = (
                text_matches_state(s.pickup_location, state) or
                text_matches_state(s.destination, state) or
                text_matches_state(s.corridor, state)
            )
            if not matches:
                continue
        so = ShipmentOut.model_validate(s)
        if s.driver_id:
            d = db.query(Driver).filter(Driver.id == s.driver_id).first()
            if d:
                so.driver_name = d.name
        if s.vehicle_id:
            veh = db.query(Vehicle).filter(Vehicle.id == s.vehicle_id).first()
            if veh:
                so.vehicle_registration = veh.registration_number
                if not so.current_lat or not so.current_lng:
                    so.current_lat = veh.latitude
                    so.current_lng = veh.longitude

            if s.status in ["PLANNED", "ASSIGNED", "IN_TRANSIT", "AT_RISK", "DELAYED"]:
                vehicle_shipment_map[s.vehicle_id] = {
                    "id": s.id,
                    "code": s.shipment_code,
                    "cargo": s.cargo_type,
                    "weight_kg": s.weight_kg,
                    "priority": s.priority,
                    "pickup": s.pickup_location,
                    "destination": s.destination,
                    "corridor": s.corridor,
                    "eta": s.eta,
                    "status": s.status,
                    "risk_level": s.risk_level,
                    "risk_reason": s.risk_reason
                }

        s_dict = so.model_dump()
        if search:
            s_term = search.lower().strip()
            if (s_term not in s.shipment_code.lower() and
                s_term not in s.cargo_type.lower() and
                s_term not in (so.driver_name or "").lower() and
                s_term not in (so.vehicle_registration or "").lower()):
                continue
        shipment_list.append(s_dict)

    # 2. Vehicles
    vehicles_query = db.query(Vehicle)
    if state and state.upper() != "ALL":
        vehicles_query = vehicles_query.filter(Vehicle.state.ilike(f"%{state}%"))
    if status and status.upper() != "ALL":
        vehicles_query = vehicles_query.filter(Vehicle.status == status.upper())

    vehicles = vehicles_query.all()
    vehicle_list = []
    for v in vehicles:
        if district and district.upper() != "ALL":
            v_loc = (v.current_location_name or "").lower()
            if district.lower() not in v_loc:
                continue

        vo = VehicleOut.model_validate(v)
        vo.vehicle_id = str(v.id)
        vo.registration = v.registration_number
        vo.capacity = f"{v.capacity_kg} kg"

        driver_info = None
        if v.driver_id:
            d = db.query(Driver).filter(Driver.id == v.driver_id).first()
            if d:
                vo.driver_name = d.name
                driver_info = {
                    "id": d.id,
                    "driver_id": d.driver_code,
                    "name": d.name,
                    "phone": d.phone,
                    "assigned_area": f"{d.assigned_state or ''} - {d.assigned_district or ''}".strip(" -"),
                    "status": d.status,
                    "rating": d.rating,
                    "safety_score": d.safety_score
                }
        vo.driver = driver_info
        vo.current_location = {
            "name": v.current_location_name or f"{v.state} Corridor",
            "state": v.state,
            "district": driver_info["assigned_area"].split(" - ")[-1] if driver_info and " - " in driver_info["assigned_area"] else None,
            "latitude": v.latitude,
            "longitude": v.longitude
        }
        vo.current_shipment = vehicle_shipment_map.get(v.id)

        v_dict = vo.model_dump()
        v_dict["active_shipment"] = vehicle_shipment_map.get(v.id)

        if search:
            s_term = search.lower().strip()
            if (s_term not in (v.registration_number or "").lower() and
                s_term not in (vo.driver_name or "").lower() and
                s_term not in str(v.id)):
                continue
        vehicle_list.append(v_dict)

    # 3. Drivers (Live Roster with GPS Telemetry)
    drivers_query = db.query(Driver)
    if state and state.upper() != "ALL":
        drivers_query = drivers_query.filter(Driver.assigned_state.ilike(f"%{state}%"))
    if district and district.upper() != "ALL":
        drivers_query = drivers_query.filter(Driver.assigned_district.ilike(f"%{district}%"))
    if status and status.upper() != "ALL":
        drivers_query = drivers_query.filter(Driver.status == status.upper())

    drivers = drivers_query.all()
    driver_list = []
    for d in drivers:
        from app.routers.drivers import driver_to_out
        dout = driver_to_out(d, db).model_dump()
        if search:
            s_term = search.lower().strip()
            if (s_term not in dout["name"].lower() and
                s_term not in dout["driver_code"].lower() and
                s_term not in (dout.get("vehicle_registration") or "").lower() and
                s_term not in (dout.get("phone") or "").lower()):
                continue
        driver_list.append(dout)

    # 4. Field Reports
    reports_query = db.query(FieldReport).filter(FieldReport.status.in_(["PENDING", "VERIFIED"]))
    if state and state.upper() != "ALL":
        reports_query = reports_query.filter(FieldReport.state.ilike(f"%{state}%"))
    if district and district.upper() != "ALL":
        reports_query = reports_query.filter(
            or_(
                FieldReport.district.ilike(f"%{district}%"),
                FieldReport.location_name.ilike(f"%{district}%")
            )
        )
    reports = reports_query.order_by(FieldReport.id.desc()).all()
    report_list = []
    for r in reports:
        ro = FieldReportOut.model_validate(r)
        if r.image_path:
            if r.image_path.startswith("http") or r.image_path.startswith("assets/"):
                ro.image_url = r.image_path
            else:
                ro.image_url = f"/uploads/{os.path.basename(r.image_path)}"
        if r.ai_analysis_json:
            try:
                ro.ai_analysis = json.loads(r.ai_analysis_json)
            except (json.JSONDecodeError, TypeError):
                pass
        report_list.append(ro.model_dump())

    # 5. Risks
    risks_query = db.query(RiskEvent).filter(RiskEvent.active == 1)
    if state and state.upper() != "ALL":
        risks_query = risks_query.filter(RiskEvent.state.ilike(f"%{state}%"))
    if district and district.upper() != "ALL":
        risks_query = risks_query.filter(RiskEvent.district.ilike(f"%{district}%"))
    if risk_level and risk_level.upper() != "ALL":
        risks_query = risks_query.filter(RiskEvent.risk_level == risk_level.upper())
    risks = risks_query.all()
    risk_list = []
    for r in risks:
        ro = RiskOut.model_validate(r)
        ro.risk_type = r.event_type or "GEOLOGICAL_RISK"
        ro.radius_km = round(r.radius_meters / 1000.0, 1) if r.radius_meters else 10.0
        risk_list.append(ro.model_dump())

    # 6. Alerts
    alerts_query = db.query(Alert).filter(Alert.active == 1)
    if state and state.upper() != "ALL":
        alerts_query = alerts_query.filter(Alert.state.ilike(f"%{state}%"))
    if district and district.upper() != "ALL":
        alerts_query = alerts_query.filter(Alert.district.ilike(f"%{district}%"))
    alerts = alerts_query.order_by(Alert.id.desc()).all()
    alert_list = [AlertOut.model_validate(a).model_dump() for a in alerts]

    # 7. Routes & 8. Affected Roads
    all_routes = db.query(Route).all()
    route_list = []
    affected_roads_list = []

    for r in all_routes:
        passes_through = True
        if state and state.upper() != "ALL":
            route_corridor_states = ROUTE_STATES.get(r.id, [])
            passes_through = (
                any(s.lower() == state.lower() for s in route_corridor_states) or
                text_matches_state(r.origin, state) or
                text_matches_state(r.destination, state) or
                (r.highway and state.lower() in r.highway.lower()) or
                (r.name and state.lower() in r.name.lower())
            )

        # Calculate live corridor risk telemetry
        risk_eval = calculate_route_risk(db, r.id)
        is_affected = (r.status in ["CAUTION", "BLOCKED", "RESTRICTED"]) or (risk_eval["risk_level"] in ["HIGH", "CRITICAL"])

        # Add to general routes list if matches state filter
        if passes_through:
            ro = RouteOut.model_validate(r)
            ro.corridor_code = r.highway or f"NH-{r.id}"
            ro.route_name = r.name
            ro.origin_hub = r.origin
            ro.destination_hub = r.destination
            ro.is_affected = is_affected
            ro.hazard_description = "; ".join(risk_eval["contributing_factors"][:2]) if risk_eval["contributing_factors"] else None
            route_list.append(ro.model_dump())

        # If affected, calculate bottleneck GPS location and detour
        if is_affected and passes_through:
            bottleneck_lat = None
            bottleneck_lng = None
            bottleneck_loc = f"{r.name} Pass"

            # Check matching field report along corridor
            rpt = db.query(FieldReport).filter(
                or_(
                    FieldReport.location_name.ilike(f"%{r.highway or r.name}%"),
                    FieldReport.description.ilike(f"%{r.highway or r.name}%")
                ),
                FieldReport.status.in_(["PENDING", "VERIFIED"])
            ).first()

            if rpt and rpt.latitude and rpt.longitude:
                bottleneck_lat = rpt.latitude
                bottleneck_lng = rpt.longitude
                bottleneck_loc = rpt.location_name or f"{rpt.district}, {rpt.state}"
            else:
                try:
                    wps = json.loads(r.waypoints_json) if r.waypoints_json else []
                    if wps and len(wps) >= 2:
                        mid = wps[len(wps) // 2]
                        bottleneck_lat = mid[0]
                        bottleneck_lng = mid[1]
                except Exception:
                    pass

            affected_roads_list.append({
                "id": r.id,
                "name": r.name,
                "highway": r.highway or f"NH-{r.id}",
                "corridor_code": r.highway or f"NH-{r.id}",
                "status": r.status,
                "risk_level": risk_eval["risk_level"],
                "risk_score": risk_eval["risk_score"],
                "origin": r.origin,
                "destination": r.destination,
                "distance_km": r.distance_km,
                "estimated_hours": r.estimated_hours,
                "primary_hazard": risk_eval["primary_hazard"],
                "hazard_description": "; ".join(risk_eval["contributing_factors"][:2]) if risk_eval["contributing_factors"] else f"Corridor under {r.status} restrictions",
                "bottleneck_latitude": bottleneck_lat,
                "bottleneck_longitude": bottleneck_lng,
                "bottleneck_location": bottleneck_loc,
                "alternate_route_name": r.alternate_route_name or "Regional Bypass via NH-27 Corridor",
                "recommended_action": risk_eval["recommended_action"],
                "waypoints_json": r.waypoints_json
            })

    # 9. Weather
    weather_query = db.query(WeatherData)
    if state and state.upper() != "ALL":
        weather_query = weather_query.filter(WeatherData.state.ilike(f"%{state}%"))
    weather = weather_query.all()
    weather_list = [WeatherOut.model_validate(w) for w in weather]

    # 10. Regions with enriched area context
    regions = db.query(Region).all()
    enriched_regions = []
    for reg in regions:
        reg_out = RegionOut.model_validate(reg).model_dump()
        reg_out["active_risks_count"] = db.query(RiskEvent).filter(RiskEvent.state == reg.state, RiskEvent.active == 1).count()
        reg_out["active_reports_count"] = db.query(FieldReport).filter(FieldReport.state == reg.state).count()
        reg_out["vehicles_count"] = db.query(Vehicle).filter(Vehicle.state == reg.state).count()
        fo = db.query(User).filter(User.role == "field_officer", User.assigned_state == reg.state).first()
        if fo:
            reg_out["field_officer"] = {
                "name": fo.name,
                "phone": fo.phone,
                "officer_id": fo.officer_id or f"FO-{fo.id:03d}"
            }
        w = db.query(WeatherData).filter(WeatherData.state == reg.state).first()
        if w:
            reg_out["weather"] = {
                "condition": w.condition,
                "temperature": w.temperature_c,
                "rainfall": w.rainfall_mm,
                "wind_speed": w.wind_speed_kmh
            }
        enriched_regions.append(reg_out)

    return {
        "drivers": driver_list,
        "vehicles": vehicle_list,
        "shipments": shipment_list,
        "reports": report_list,
        "risks": risk_list,
        "alerts": alert_list,
        "routes": route_list,
        "affected_roads": affected_roads_list,
        "weather": [w.model_dump() for w in weather_list],
        "regions": enriched_regions,
    }
