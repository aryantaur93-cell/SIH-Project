"""
NEXTRA - Dashboard Service
Real-time KPI calculation from the database (no hardcoded values).
"""
from sqlalchemy.orm import Session
from app.models.shipment import Shipment
from app.models.driver import Driver
from app.models.vehicle import Vehicle
from app.models.risk import RiskEvent
from app.models.verification import Verification
from app.models.field_report import FieldReport
from app.models.user import User
from app.models.alert import Alert
from app.models.notification import Notification
from app.models.region import Region
from app.models.route import Route
from app.models.transport_request import TransportationRequest
from app.schemas.schemas import DashboardSummary


def get_dashboard_summary(db: Session, user_id: int = None, role: str = None) -> DashboardSummary:
    """Calculate all dashboard KPIs from live database data."""
    summary = DashboardSummary()

    # Shipments
    summary.total_shipments = db.query(Shipment).count()
    summary.active_shipments = db.query(Shipment).filter(
        Shipment.status.in_(["IN_TRANSIT", "IN TRANSIT", "ASSIGNED", "AT_RISK", "REQUESTED", "DISPATCHED"])
    ).count()
    summary.delayed_shipments = db.query(Shipment).filter(Shipment.status == "DELAYED").count()

    # Drivers
    summary.total_drivers = db.query(Driver).count()
    summary.active_drivers = db.query(Driver).filter(
        Driver.status.in_(["ACTIVE", "DRIVING", "ON_DUTY", "ON DUTY"])
    ).count()
    summary.available_drivers = db.query(Driver).filter(
        Driver.status.in_(["AVAILABLE", "IDLE", "STANDBY"])
    ).count()

    # Vehicles
    summary.total_vehicles = db.query(Vehicle).count()
    summary.available_vehicles = db.query(Vehicle).filter(
        Vehicle.status.in_(["IDLE", "AVAILABLE"])
    ).count()
    summary.active_vehicles = db.query(Vehicle).filter(
        Vehicle.status.in_(["ACTIVE", "MOVING", "IN_TRANSIT", "IN TRANSIT"])
    ).count()

    # Risks
    summary.risk_zones = db.query(RiskEvent).filter(RiskEvent.active == 1).count()
    summary.critical_risks = db.query(RiskEvent).filter(
        RiskEvent.active == 1, RiskEvent.risk_level == "CRITICAL"
    ).count()

    # Verifications & Reports
    summary.pending_verifications = db.query(Verification).filter(Verification.status == "PENDING").count()
    summary.verified_count = db.query(Verification).filter(Verification.status == "VERIFIED").count()
    summary.total_reports = db.query(FieldReport).count()

    # Field Officers
    summary.total_field_officers = db.query(User).filter(
        User.role == "field_officer", User.status == "ACTIVE"
    ).count()

    # Alerts
    summary.active_alerts = db.query(Alert).filter(Alert.active == 1).count()

    # Transportation Requests
    summary.pending_transport_requests = db.query(TransportationRequest).filter(
        TransportationRequest.status.in_(["REQUESTED", "MATCHING", "PENDING"])
    ).count()

    # Routes & Corridors
    summary.total_routes = db.query(Route).count()
    summary.active_routes = db.query(Route).filter(Route.status == "OPEN").count()

    # Notifications (for current user)
    if user_id:
        summary.unread_notifications = db.query(Notification).filter(
            Notification.user_id == user_id, Notification.is_read == 0
        ).count()

    # Accessibility average
    regions = db.query(Region).all()
    if regions:
        summary.accessibility_avg = round(sum(r.accessibility_score for r in regions) / len(regions), 1)
        summary.accessibility_score = summary.accessibility_avg
    summary.states_count = len(regions)

    # Area-scoped calculations (especially for Field Officers)
    user = db.query(User).filter(User.id == user_id).first() if user_id else None
    assigned_state = None
    if user and user.assigned_state and user.assigned_state != "ALL":
        assigned_state = user.assigned_state.strip()
    elif role == "field_officer":
        assigned_state = "Assam"

    STATE_KEYWORDS = {
        "Assam": ["Assam", "Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Tezpur", "Dispur"],
        "Meghalaya": ["Meghalaya", "Shillong", "Tura", "Cherrapunji", "Jowai", "Sonapur"],
        "Arunachal Pradesh": ["Arunachal", "Itanagar", "Tawang", "Pasighat", "Ziro"],
        "Nagaland": ["Nagaland", "Kohima", "Dimapur", "Mokokchung"],
        "Manipur": ["Manipur", "Imphal", "Churachandpur"],
        "Mizoram": ["Mizoram", "Aizawl", "Lunglei"],
        "Tripura": ["Tripura", "Agartala", "Udaipur"],
        "Sikkim": ["Sikkim", "Gangtok", "Namchi", "Siliguri"]
    }

    if assigned_state:
        from sqlalchemy import or_
        summary.assigned_area = assigned_state
        summary.area_risks = db.query(RiskEvent).filter(
            RiskEvent.active == 1,
            RiskEvent.state.ilike(f"%{assigned_state}%")
        ).count()
        summary.area_pending_verifications = db.query(Verification).join(FieldReport).filter(
            Verification.status == "PENDING",
            FieldReport.state.ilike(f"%{assigned_state}%")
        ).count()
        summary.area_reports = db.query(FieldReport).filter(
            FieldReport.state.ilike(f"%{assigned_state}%")
        ).count()
        summary.area_vehicles = db.query(Vehicle).filter(
            Vehicle.state.ilike(f"%{assigned_state}%")
        ).count()

        kws = STATE_KEYWORDS.get(assigned_state, [assigned_state])
        shipment_clauses = []
        for kw in kws:
            shipment_clauses.append(Shipment.pickup_location.ilike(f"%{kw}%"))
            shipment_clauses.append(Shipment.destination.ilike(f"%{kw}%"))
            shipment_clauses.append(Shipment.corridor.ilike(f"%{kw}%"))

        summary.area_shipments = db.query(Shipment).filter(
            Shipment.status.in_(["IN_TRANSIT", "IN TRANSIT", "ASSIGNED", "AT_RISK", "REQUESTED", "DISPATCHED", "DELAYED", "PLANNED"]),
            or_(*shipment_clauses)
        ).count()
        summary.area_alerts = db.query(Alert).filter(
            Alert.active == 1,
            Alert.state.ilike(f"%{assigned_state}%")
        ).count()
        reg = db.query(Region).filter(Region.state.ilike(f"%{assigned_state}%")).first()
        if reg:
            summary.area_accessibility = float(reg.accessibility_score or 70.0)
            summary.area_road_status = reg.road_status
    else:
        summary.assigned_area = "All 8 States"
        summary.area_risks = summary.risk_zones
        summary.area_pending_verifications = summary.pending_verifications
        summary.area_reports = summary.total_reports
        summary.area_vehicles = summary.total_vehicles
        summary.area_shipments = summary.active_shipments
        summary.area_alerts = summary.active_alerts
        summary.area_accessibility = summary.accessibility_score
        summary.area_road_status = "All Primary Corridors Monitored"

    return summary

