"""
NEXTRA - Full Risk Engine Service
Deterministic, rule-based risk intelligence engine for Northeast India logistics corridors.
Calculates area risk, route risk, and incident risk using live database telemetry:
- Weather & Rainfall (WeatherData)
- Accessibility & Terrain (Region)
- Ground Truth Reports & Incident Severity (FieldReport)
- Corridor Passability & Road Blockages (Route)
- Active Risk Events (RiskEvent)
"""
import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.risk import RiskEvent
from app.models.field_report import FieldReport
from app.models.weather import WeatherData
from app.models.alert import Alert
from app.models.region import Region
from app.models.route import Route
from app.services.notification_service import notify_admins, notify_critical_risk

# Northeast States
NER_STATES = [
    "Assam", "Arunachal Pradesh", "Meghalaya", "Manipur",
    "Mizoram", "Nagaland", "Tripura", "Sikkim"
]

# State Capital / Major Logistics Centroids
STATE_CENTROIDS = {
    "Assam": {"lat": 26.2006, "lng": 92.9376, "hub": "Guwahati"},
    "Meghalaya": {"lat": 25.5788, "lng": 91.8933, "hub": "Shillong"},
    "Arunachal Pradesh": {"lat": 27.0844, "lng": 93.6053, "hub": "Itanagar"},
    "Nagaland": {"lat": 25.6751, "lng": 94.1086, "hub": "Kohima"},
    "Manipur": {"lat": 24.8170, "lng": 93.9368, "hub": "Imphal"},
    "Mizoram": {"lat": 23.7271, "lng": 92.7176, "hub": "Aizawl"},
    "Tripura": {"lat": 23.8315, "lng": 91.2868, "hub": "Agartala"},
    "Sikkim": {"lat": 27.3389, "lng": 88.6065, "hub": "Gangtok"}
}


def score_to_level(score: int) -> str:
    """Map numeric score (0-100) to exact risk level."""
    if score >= 75:
        return "CRITICAL"
    elif score >= 50:
        return "HIGH"
    elif score >= 25:
        return "MODERATE"
    else:
        return "LOW"


def get_recommended_action(level: str, contributors: List[str]) -> str:
    """Generate deterministic operational recommendations based on risk level and factors."""
    has_landslide = any("landslide" in c.lower() or "mudslide" in c.lower() for c in contributors)
    has_flood = any("flood" in c.lower() or "waterlog" in c.lower() for c in contributors)
    has_blocked = any("blocked" in c.lower() for c in contributors)
    has_rain = any("rain" in c.lower() for c in contributors)

    if level == "CRITICAL":
        if has_blocked or has_landslide:
            return "Halt freight dispatch on arterial corridor. Stage vehicles at nearest depot, divert via verified bypass, and await BRO clearance."
        elif has_flood:
            return "Critical waterlogging detected. Suspend transit through low-lying valley sections until road safety clearance."
        else:
            return "Severe multi-hazard alert. Restrict commercial movement and initiate emergency diversion protocol."
    elif level == "HIGH":
        if has_landslide or has_rain:
            return "Proceed with caution. Fit hill-traction equipment, limit convoy speed to 30 km/h, and maintain continuous BRO radio telemetry."
        else:
            return "High risk sector. Avoid overnight transit, dispatch pilot reconnaissance vehicles, and monitor checkpoints."
    elif level == "MODERATE":
        return "Standard mountain vigilance advised. Keep headlights on, verify tire pressure for wet tarmac, and observe road passability."
    else:
        return "Corridor fully passible. Normal commercial dispatch approved under standard hill-driving guidelines."


def get_affected_routes_for_state(db: Session, state: str) -> List[str]:
    """Find all arterial corridors connected to or passing through a given state."""
    state_hubs = {
        "Assam": ["Guwahati", "Silchar", "Jorhat", "Dibrugarh", "Nagaon", "Dispur"],
        "Meghalaya": ["Shillong", "Cherrapunji", "Jowai", "Tura", "Umiam", "Sonapur"],
        "Arunachal Pradesh": ["Itanagar", "Tawang", "Pasighat", "Bomdila", "Ziro"],
        "Nagaland": ["Kohima", "Dimapur", "Mokokchung"],
        "Manipur": ["Imphal", "Churachandpur", "Senapati"],
        "Mizoram": ["Aizawl", "Lunglei", "Champhai"],
        "Tripura": ["Agartala", "Udaipur", "Dharmanagar"],
        "Sikkim": ["Gangtok", "Siliguri", "Namchi", "Mangan"]
    }
    hubs = state_hubs.get(state, [state])

    # Match routes where origin, destination, or highway matches
    filters = [Route.name.ilike(f"%{state}%")]
    for hub in hubs:
        filters.append(Route.origin.ilike(f"%{hub}%"))
        filters.append(Route.destination.ilike(f"%{hub}%"))
        filters.append(Route.name.ilike(f"%{hub}%"))

    routes = db.query(Route).filter(or_(*filters)).all()
    route_names = [f"{r.highway or 'Route'}: {r.name}" for r in routes]
    if not route_names:
        # Fallback default regional corridor
        route_names = [f"NH-{state[:2].upper()} Inter-State Lifeway"]
    return list(set(route_names))


def calculate_area_risk(db: Session, state: str, district: Optional[str] = None) -> Dict[str, Any]:
    """
    Transparent rule-based risk score calculation for a geographic area.
    Score: 0 to 100
    Contributors:
      Heavy rainfall (>50 mm/h): +20
      Moderate rainfall (20-50 mm/h): +10
      Severe meteorological condition: +15
      Flood / Waterlogging: +25
      Landslide / Mudslide: +30
      Road damage / Bridge disruption: +20
      Blocked route (corridor closed): +30
      Restricted / Caution route: +15
      Critical ground incident: +15
      Recent incident (<24h): +10
      Low accessibility terrain (<50 score): +20
      Moderate accessibility terrain (50-65 score): +10
    """
    score = 0
    contributors = []
    reasons = []

    # 1. Weather Telemetry
    weather = db.query(WeatherData).filter(WeatherData.state == state).first()
    weather_summary = "Clear conditions"
    if weather:
        weather_summary = f"{weather.condition} · {weather.temperature_c}°C · Rain: {weather.rainfall_mm}mm/h"
        if weather.rainfall_mm >= 70:
            score += 35
            contributors.append(f"Torrential heavy rainfall ({weather.rainfall_mm} mm/h) +35")
            reasons.append("Torrential rainfall")
        elif weather.rainfall_mm >= 45:
            score += 25
            contributors.append(f"Heavy rainfall ({weather.rainfall_mm} mm/h) +25")
            reasons.append("Heavy rainfall")
        elif weather.rainfall_mm >= 20:
            score += 15
            contributors.append(f"Moderate rainfall ({weather.rainfall_mm} mm/h) +15")
            reasons.append("Moderate rainfall")

        cond = (weather.condition or "").lower()
        if any(w in cond for w in ["torrential", "storm", "blizzard", "cyclone", "severe", "downpour", "cloudburst"]):
            score += 20
            contributors.append(f"Severe storm condition ({weather.condition}) +20")
            reasons.append("Adverse storm")

        if weather.wind_speed_kmh and weather.wind_speed_kmh > 45:
            score += 10
            contributors.append(f"Gale wind gusts ({weather.wind_speed_kmh} km/h) +10")
        elif weather.wind_speed_kmh and weather.wind_speed_kmh > 30:
            score += 5
            contributors.append(f"High hill wind gusts ({weather.wind_speed_kmh} km/h) +5")

    # 2. Road Passability & Corridors
    state_routes = db.query(Route).filter(
        or_(Route.origin.ilike(f"%{state}%"), Route.destination.ilike(f"%{state}%"), Route.name.ilike(f"%{state}%"))
    ).all()
    has_blocked = any(r.status == "BLOCKED" for r in state_routes)
    has_caution = any(r.status in ["CAUTION", "RESTRICTED"] for r in state_routes)

    if has_blocked:
        score += 30
        contributors.append("Blocked arterial route (corridor closed) +30")
        reasons.append("Blocked route")
    elif has_caution:
        score += 15
        contributors.append("Restricted/caution corridor condition +15")
        reasons.append("Route caution")

    # 3. Field Reports (Ground Truth Hazards)
    rpt_query = db.query(FieldReport).filter(
        FieldReport.state == state,
        FieldReport.status.in_(["PENDING", "VERIFIED"])
    )
    if district:
        rpt_query = rpt_query.filter(FieldReport.district.ilike(f"%{district}%"))
    reports = rpt_query.all()

    saw_landslide = False
    saw_flood = False
    saw_damage = False
    saw_critical_rpt = False

    for rpt in reports:
        itype = (rpt.incident_type or "").upper()
        if ("LANDSLIDE" in itype or "MUDSLIDE" in itype) and not saw_landslide:
            score += 30
            contributors.append(f"Active landslide hazard ({rpt.incident_type}) +30")
            reasons.append("Landslide")
            saw_landslide = True
        elif ("FLOOD" in itype or "WATERLOG" in itype) and not saw_flood:
            score += 25
            contributors.append(f"Flash flood / waterlogging hazard +25")
            reasons.append("Flooding")
            saw_flood = True
        elif ("DAMAGE" in itype or "ROCKFALL" in itype or "BRIDGE" in itype) and not saw_damage:
            score += 20
            contributors.append(f"Structural road/bridge damage ({rpt.incident_type}) +20")
            reasons.append("Road disruption")
            saw_damage = True

        if rpt.severity == "CRITICAL" and not saw_critical_rpt:
            score += 15
            contributors.append("Critical ground truth severity +15")
            saw_critical_rpt = True

    if len(reports) > 0:
        score += 10
        contributors.append(f"Recent incident reports ({len(reports)} active) +10")

    # 4. Regional Accessibility Status
    region = db.query(Region).filter(Region.state == state).first()
    if region:
        acc_status = (region.accessibility_status or "OPEN").upper()
        acc_score = region.accessibility_score or 70
        if acc_status == "CLOSED":
            score += 30
            contributors.append(f"Corridor Accessibility CLOSED ({acc_score}/100) +30")
            reasons.append("Corridor Closure")
        elif acc_status == "BLOCKED":
            score += 25
            contributors.append(f"Corridor Accessibility BLOCKED ({acc_score}/100) +25")
            reasons.append("Corridor Blocked")
        elif acc_status in ["PARTIALLY AFFECTED", "PARTIALLY_AFFECTED"]:
            score += 15
            contributors.append(f"Corridor PARTIALLY AFFECTED ({acc_score}/100) +15")
            reasons.append("Partial Corridor Restriction")
        elif acc_score < 50:
            score += 20
            contributors.append(f"Severe hill terrain gradient (Accessibility {acc_score}/100) +20")
            reasons.append("Severe terrain passability")
        elif acc_score < 65:
            score += 10
            contributors.append(f"Challenging mountain passability (Accessibility {acc_score}/100) +10")

    # 5. Cap score between 0 and 100
    final_score = min(max(score, 0), 100)
    final_level = score_to_level(final_score)

    # Human-readable Primary Reason
    if not reasons:
        primary_reason = "Normal weather with clear corridor passability"
    else:
        # Join unique reasons
        unique_reasons = []
        for r in reasons:
            if r not in unique_reasons:
                unique_reasons.append(r)
        primary_reason = " + ".join(unique_reasons)

    # Affected Routes
    affected_routes = get_affected_routes_for_state(db, state)

    # Recommended Action
    rec_action = get_recommended_action(final_level, contributors)

    # Coordinates
    centroid = STATE_CENTROIDS.get(state, {"lat": 26.20, "lng": 92.93, "hub": state})
    lat = region.center_lat if (region and region.center_lat) else centroid["lat"]
    lng = region.center_lng if (region and region.center_lng) else centroid["lng"]
    location_name = f"{centroid['hub']}, {state}" if not district else f"{district}, {state}"

    return {
        "state": state,
        "district": district,
        "location_name": location_name,
        "risk_score": final_score,
        "risk_level": final_level,
        "reason": primary_reason,
        "primary_reason": primary_reason,
        "contributing_factors": contributors,
        "affected_routes": affected_routes,
        "recommended_action": rec_action,
        "latitude": lat,
        "longitude": lng,
        "weather_summary": weather_summary
    }


def calculate_route_risk(db: Session, route_id: int) -> Dict[str, Any]:
    """Calculate risk score for a specific arterial route corridor."""
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        return {
            "route_id": route_id,
            "route_name": "Unknown Route",
            "corridor_code": "UNKNOWN",
            "status": "UNKNOWN",
            "risk_score": 0,
            "risk_level": "LOW",
            "primary_hazard": "None",
            "contributing_factors": [],
            "recommended_action": "Route details unavailable."
        }

    score = 0
    factors = []
    primary_hazard = "Clear Passage"

    if route.status == "BLOCKED":
        score += 30
        factors.append("Route is BLOCKED to heavy commercial traffic +30")
        primary_hazard = "Corridor Blockage"
    elif route.status in ["CAUTION", "RESTRICTED"]:
        score += 15
        factors.append(f"Route under {route.status} restrictions +15")
        primary_hazard = "Operational Caution"

    # Match reports along the corridor
    matching_reports = db.query(FieldReport).filter(
        or_(
            FieldReport.location_name.ilike(f"%{route.highway or route.name}%"),
            FieldReport.description.ilike(f"%{route.highway or route.name}%"),
            FieldReport.state.ilike(f"%{route.origin}%"),
            FieldReport.state.ilike(f"%{route.destination}%")
        ),
        FieldReport.status.in_(["PENDING", "VERIFIED"])
    ).all()

    for rpt in matching_reports[:3]:
        itype = (rpt.incident_type or "").upper()
        if "LANDSLIDE" in itype:
            score += 25
            factors.append(f"Reported Landslide on corridor ({rpt.report_code}) +25")
            primary_hazard = "Active Landslide"
        elif "FLOOD" in itype:
            score += 20
            factors.append(f"Waterlogging reported ({rpt.report_code}) +20")
            primary_hazard = "Road Waterlogging"
        else:
            score += 10
            factors.append(f"Ground hazard: {rpt.incident_type} +10")

    # Match weather along the corridor
    for st in NER_STATES:
        if (st.lower() in route.origin.lower() or
            st.lower() in route.destination.lower() or
            (route.highway and st.lower() in route.highway.lower()) or
            (route.name and st.lower() in route.name.lower())):
            w = db.query(WeatherData).filter(WeatherData.state.ilike(f"%{st}%")).first()
            if w:
                if w.rainfall_mm >= 70:
                    score += 35
                    factors.append(f"Torrential rainfall ({w.rainfall_mm} mm/h in {st}) +35")
                    if primary_hazard == "Clear Passage":
                        primary_hazard = f"Torrential Rain ({st})"
                elif w.rainfall_mm >= 45:
                    score += 25
                    factors.append(f"Heavy precipitation ({w.rainfall_mm} mm/h in {st}) +25")
                    if primary_hazard == "Clear Passage":
                        primary_hazard = f"Heavy Rain ({st})"
                elif w.rainfall_mm >= 20:
                    score += 15
                    factors.append(f"Moderate rainfall ({w.rainfall_mm} mm/h in {st}) +15")
                    if primary_hazard == "Clear Passage":
                        primary_hazard = f"Monsoon Rain ({st})"

                cond = (w.condition or "").lower()
                if any(kw in cond for kw in ["storm", "cyclone", "downpour", "torrential", "cloudburst"]):
                    score += 15
                    factors.append(f"Severe storm activity in {st} ({w.condition}) +15")
                    if primary_hazard == "Clear Passage":
                        primary_hazard = f"Severe Storm ({st})"

    final_score = min(max(score, 0), 100)
    final_level = score_to_level(final_score)
    rec_action = get_recommended_action(final_level, factors)

    return {
        "route_id": route.id,
        "route_name": route.name,
        "corridor_code": route.highway or f"NH-{route.id}",
        "status": route.status,
        "risk_score": final_score,
        "risk_level": final_level,
        "primary_hazard": primary_hazard,
        "contributing_factors": factors,
        "recommended_action": rec_action,
        "distance_km": route.distance_km,
        "estimated_hours": route.estimated_hours,
        "origin_hub": route.origin,
        "destination_hub": route.destination
    }


def calculate_incident_risk(db: Session, report_id: int) -> Dict[str, Any]:
    """Calculate risk score for a specific field incident report."""
    report = db.query(FieldReport).filter(FieldReport.id == report_id).first()
    if not report:
        return {"report_id": report_id, "risk_score": 0, "risk_level": "LOW"}

    score = 0
    itype = (report.incident_type or "").upper()
    if "LANDSLIDE" in itype or "MUDSLIDE" in itype:
        score += 35
    elif "FLOOD" in itype or "WATERLOG" in itype:
        score += 30
    elif "DAMAGE" in itype or "BRIDGE" in itype:
        score += 25
    elif "WEATHER" in itype or "SNOW" in itype:
        score += 20
    else:
        score += 15

    sev = (report.severity or "").upper()
    if sev == "CRITICAL":
        score += 30
    elif sev == "HIGH":
        score += 20
    elif sev == "MEDIUM":
        score += 10
    else:
        score += 5

    if report.status == "VERIFIED":
        score += 15

    final_score = min(max(score, 0), 100)
    final_level = score_to_level(final_score)

    return {
        "report_id": report.id,
        "report_code": report.report_code,
        "incident_type": report.incident_type,
        "severity": report.severity,
        "status": report.status,
        "risk_score": final_score,
        "risk_level": final_level,
        "location": f"{report.district or ''}, {report.state}",
        "description": report.description
    }


def get_all_area_risks(db: Session) -> List[Dict[str, Any]]:
    """Compute and return live area risk for all 8 Northeast states."""
    results = []
    for state in NER_STATES:
        risk_data = calculate_area_risk(db, state)
        results.append(risk_data)
    
    # Sort with highest risk first
    results.sort(key=lambda x: x["risk_score"], reverse=True)
    return results


def recalculate_all_risks(db: Session) -> List[Dict[str, Any]]:
    """
    Recalculate risk for all regions and synchronize with database models:
    - Updates Region.risk_level
    - Upserts active RiskEvent records
    - Emits Alert records for any CRITICAL areas
    """
    regions = db.query(Region).all()
    results = []

    for region in regions:
        risk_data = calculate_area_risk(db, region.state)

        # Update region risk level
        region.risk_level = risk_data["risk_level"]

        # Upsert risk event
        existing = db.query(RiskEvent).filter(
            RiskEvent.state == region.state,
            RiskEvent.source == "SYSTEM",
            RiskEvent.active == 1
        ).first()

        factors_json = json.dumps(risk_data["contributing_factors"])

        if existing:
            existing.risk_score = risk_data["risk_score"]
            existing.risk_level = risk_data["risk_level"]
            existing.contributing_factors = factors_json
            existing.description = f"{risk_data['reason']} — {risk_data['recommended_action']}"
        else:
            new_risk = RiskEvent(
                state=region.state,
                risk_score=risk_data["risk_score"],
                risk_level=risk_data["risk_level"],
                contributing_factors=factors_json,
                description=f"{risk_data['reason']} — {risk_data['recommended_action']}",
                latitude=risk_data["latitude"],
                longitude=risk_data["longitude"],
                radius_meters=15000 if risk_data["risk_level"] in ["HIGH", "CRITICAL"] else 8000,
                event_type="COMPOSITE_RISK",
                source="SYSTEM",
                active=1
            )
            db.add(new_risk)

        # Generate critical alert if CRITICAL
        if risk_data["risk_level"] == "CRITICAL":
            existing_alert = db.query(Alert).filter(
                Alert.state == region.state,
                Alert.active == 1,
                Alert.alert_type == "RISK"
            ).first()
            if not existing_alert:
                alert = Alert(
                    title=f"CRITICAL HAZARD: {region.state} Sector",
                    description=f"Risk Score {risk_data['risk_score']}/100: {risk_data['reason']}. {risk_data['recommended_action']}",
                    severity="CRITICAL",
                    state=region.state,
                    district=risk_data["district"] or "Corridor Pass",
                    latitude=risk_data["latitude"],
                    longitude=risk_data["longitude"],
                    alert_type="RISK",
                    active=1
                )
                db.add(alert)
                notify_admins(db, f"CRITICAL RISK: {region.state}",
                              f"Risk score reached {risk_data['risk_score']}/100 ({risk_data['reason']}).",
                              "RISK")

        results.append(risk_data)

    db.commit()
    results.sort(key=lambda x: x["risk_score"], reverse=True)
    return results


def update_area_accessibility(db: Session, state: str) -> Dict[str, Any]:
    """
    Calculates and updates canonical accessibility status for an area:
    Statuses: OPEN, PARTIALLY AFFECTED, BLOCKED, CLOSED.
    Triggered when:
    - Road disruption occurs (field reports submitted/verified)
    - Route status changes
    - Severe weather occurs
    """
    clean_state = state.strip()
    region = db.query(Region).filter(Region.state.ilike(f"%{clean_state}%")).first()
    if not region:
        return {"status": "OPEN", "score": 80, "disruptions": []}

    # 1. Check routes connected to state
    state_routes = db.query(Route).filter(
        or_(
            Route.origin.ilike(f"%{clean_state}%"),
            Route.destination.ilike(f"%{clean_state}%"),
            Route.name.ilike(f"%{clean_state}%"),
            Route.highway.ilike(f"%{clean_state}%")
        )
    ).all()

    has_closed_route = any(r.status == "CLOSED" for r in state_routes)
    has_blocked_route = any(r.status == "BLOCKED" for r in state_routes)
    has_caution_route = any(r.status in ["CAUTION", "RESTRICTED"] for r in state_routes)

    # 2. Check active reports in state
    active_reports = db.query(FieldReport).filter(
        FieldReport.state.ilike(f"%{clean_state}%"),
        FieldReport.status.in_(["PENDING", "VERIFIED"])
    ).all()

    disruptions = []
    has_critical_report = False
    has_severe_blockage = False

    for rpt in active_reports:
        itype = (rpt.incident_type or "").upper()
        sev = (rpt.severity or "").upper()
        if any(h in itype for h in ["LANDSLIDE", "FLOOD", "ROAD_BLOCKAGE", "BRIDGE_DAMAGE"]):
            disruptions.append(f"{rpt.incident_type} ({rpt.location_name or rpt.district or clean_state})")
            if sev == "CRITICAL":
                has_critical_report = True
            has_severe_blockage = True
        elif any(h in itype for h in ["ROAD_DAMAGE", "ROCKFALL", "UNSAFE_ROAD", "WEATHER"]):
            disruptions.append(f"{rpt.incident_type} ({rpt.location_name or rpt.district or clean_state})")

    # 3. Check weather
    weather = db.query(WeatherData).filter(WeatherData.state.ilike(f"%{clean_state}%")).first()
    heavy_rain = weather and (weather.rainfall_mm >= 50.0 or any(c in (weather.condition or "").lower() for c in ["torrential", "storm", "flood", "cloudburst"]))
    moderate_rain = weather and (weather.rainfall_mm >= 25.0)

    # Determine canonical status & score
    if has_closed_route or (has_critical_report and has_blocked_route):
        status = "CLOSED"
        score = 20
        road_status = f"Corridors CLOSED due to severe disruptions: {', '.join(disruptions[:2]) if disruptions else 'Critical Barrier'}"
    elif has_blocked_route or has_severe_blockage or heavy_rain:
        status = "BLOCKED"
        score = 40
        road_status = f"Corridors BLOCKED: {', '.join(disruptions[:2]) if disruptions else 'Heavy Weather Hazard'}"
    elif has_caution_route or len(disruptions) > 0 or moderate_rain:
        status = "PARTIALLY AFFECTED"
        score = 65
        road_status = f"Partially affected with caution: {', '.join(disruptions[:2]) if disruptions else 'Weather Precaution'}"
    else:
        status = "OPEN"
        score = 88
        road_status = "All primary arterial corridors clear and passable"

    region.accessibility_status = status
    region.accessibility_score = score
    region.road_status = road_status
    db.commit()

    return {
        "state": region.state,
        "status": status,
        "score": score,
        "road_status": road_status,
        "disruptions": disruptions
    }


def process_weather_cascade(
    db: Session,
    state: str,
    rainfall: float,
    condition: str,
    temperature: Optional[float] = None,
    wind: Optional[float] = None,
    district: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes the full inter-system cascade:
    1. Stores/updates weather data by area (temperature, rainfall, condition, wind, timestamp).
    2. Updates accessibility based on road disruptions & weather.
    3. Re-evaluates risk in the risk engine (area & routes).
    4. If risk becomes HIGH/CRITICAL:
       - Generates/updates active Alert.
       - Dispatches targeted notifications to affected drivers on active shipments and logistics.
    """
    clean_state = state.strip()

    # 1. Update WeatherData
    weather = db.query(WeatherData).filter(WeatherData.state.ilike(f"%{clean_state}%")).first()
    if not weather:
        weather = WeatherData(
            state=clean_state,
            district=district,
            temperature_c=temperature if temperature is not None else 24.0,
            rainfall_mm=rainfall,
            humidity_pct=85.0 if rainfall > 20 else 60.0,
            wind_speed_kmh=wind if wind is not None else 15.0,
            condition=condition
        )
        db.add(weather)
    else:
        weather.rainfall_mm = rainfall
        weather.condition = condition
        if temperature is not None:
            weather.temperature_c = temperature
        if wind is not None:
            weather.wind_speed_kmh = wind
        if district:
            weather.district = district
    db.commit()
    db.refresh(weather)

    # 2. Update Accessibility Status
    acc_result = update_area_accessibility(db, clean_state)

    # 3. Recalculate Area Risk & Route Risks
    area_risk = calculate_area_risk(db, clean_state)

    # Update Region risk_level
    region = db.query(Region).filter(Region.state.ilike(f"%{clean_state}%")).first()
    if region:
        region.risk_level = area_risk["risk_level"]
        db.commit()

    # Recalculate affected routes
    state_routes = db.query(Route).filter(
        or_(
            Route.origin.ilike(f"%{clean_state}%"),
            Route.destination.ilike(f"%{clean_state}%"),
            Route.name.ilike(f"%{clean_state}%"),
            Route.highway.ilike(f"%{clean_state}%")
        )
    ).all()

    updated_routes = []
    has_high_risk_route = False

    for r in state_routes:
        if rainfall >= 60.0 or any(kw in condition.lower() for kw in ["torrential", "storm", "cyclone", "cloudburst"]):
            if r.status == "OPEN":
                r.status = "CAUTION"
        elif rainfall < 10.0 and r.status == "CAUTION" and not acc_result["disruptions"]:
            r.status = "OPEN"

        r_risk = calculate_route_risk(db, r.id)
        r.risk_level = r_risk["risk_level"]
        if r.risk_level in ["HIGH", "CRITICAL"]:
            has_high_risk_route = True
        updated_routes.append({
            "id": r.id,
            "name": r.name,
            "highway": r.highway,
            "status": r.status,
            "risk_level": r.risk_level,
            "risk_score": r_risk["risk_score"],
            "primary_hazard": r_risk["primary_hazard"]
        })
    db.commit()

    # 4. Generate/Update Alert if Risk becomes HIGH or CRITICAL
    alert_obj = None
    notifs = []
    is_important_risk = (area_risk["risk_level"] in ["HIGH", "CRITICAL"]) or has_high_risk_route or (rainfall >= 45.0)

    if is_important_risk:
        sev = "CRITICAL" if (area_risk["risk_score"] >= 75 or rainfall >= 70.0) else "HIGH"
        centroid = STATE_CENTROIDS.get(clean_state, {"lat": 25.57, "lng": 91.89, "hub": clean_state})
        lat = region.center_lat if region else centroid["lat"]
        lng = region.center_lng if region else centroid["lng"]

        # Check existing active weather alert
        existing_alert = db.query(Alert).filter(
            Alert.state.ilike(f"%{clean_state}%"),
            Alert.alert_type == "WEATHER",
            Alert.active == 1
        ).first()

        alert_title = f"WEATHER HAZARD: {condition.upper()} in {clean_state}"
        alert_desc = (
            f"Precipitation: {rainfall} mm/h · Condition: {condition}. "
            f"Accessibility Status: {acc_result['status']} ({acc_result['score']}/100). "
            f"Risk Level: {area_risk['risk_level']}. {area_risk['recommended_action']}"
        )

        if existing_alert:
            existing_alert.title = alert_title
            existing_alert.description = alert_desc
            existing_alert.severity = sev
            existing_alert.latitude = lat
            existing_alert.longitude = lng
            alert_obj = existing_alert
        else:
            new_alert = Alert(
                title=alert_title,
                description=alert_desc,
                severity=sev,
                state=clean_state,
                district=district or centroid["hub"],
                latitude=lat,
                longitude=lng,
                alert_type="WEATHER",
                active=1
            )
            db.add(new_alert)
            db.commit()
            db.refresh(new_alert)
            alert_obj = new_alert

        # 5. Dispatch targeted notifications to affected drivers and logistics
        notifs = notify_critical_risk(
            db=db,
            state=clean_state,
            location=district or centroid["hub"],
            risk_title=f"{condition} ({rainfall} mm/h)",
            description=f"Accessibility {acc_result['status']} on corridors in {clean_state}. Exercise extreme caution or seek safe haven.",
            risk_id=alert_obj.id
        )

    db.commit()

    return {
        "state": clean_state,
        "weather": {
            "temperature": weather.temperature_c,
            "rainfall": weather.rainfall_mm,
            "condition": weather.condition,
            "wind": weather.wind_speed_kmh,
            "timestamp": weather.updated_at.isoformat() if weather.updated_at else None
        },
        "accessibility": {
            "status": acc_result["status"],
            "score": acc_result["score"],
            "road_status": acc_result["road_status"],
            "disruptions": acc_result["disruptions"]
        },
        "risk": {
            "risk_score": area_risk["risk_score"],
            "risk_level": area_risk["risk_level"],
            "primary_reason": area_risk["primary_reason"],
            "recommended_action": area_risk["recommended_action"]
        },
        "affected_routes": updated_routes,
        "alert": {
            "id": alert_obj.id,
            "title": alert_obj.title,
            "severity": alert_obj.severity,
            "active": alert_obj.active
        } if alert_obj else None,
        "notifications_count": len(notifs)
    }

