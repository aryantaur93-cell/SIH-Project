"""
NEXTRA - Shipments Router
Full CRUD with lifecycle status management, driver assignment tracking, and notification triggers.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user, require_role
from app.models.shipment import Shipment
from app.models.driver import Driver
from app.models.vehicle import Vehicle
from app.models.route import Route
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.schemas import ShipmentOut, ShipmentCreateRequest, ShipmentStatusUpdate
from app.services.notification_service import notify_user, notify_role, notify_shipment_delay
from typing import List, Optional


router = APIRouter(prefix="/api/shipments", tags=["Shipments"])


def shipment_to_out(s: Shipment, db: Session) -> ShipmentOut:
    out = ShipmentOut.model_validate(s)
    out.origin = s.pickup_location
    out.cargo = s.cargo_type
    out.weight = s.weight_kg
    out.risk = s.risk_level
    out.current_location = s.corridor or f"{s.pickup_location} → {s.destination}"

    if s.driver_id:
        driver = db.query(Driver).filter(Driver.id == s.driver_id).first()
        if driver:
            out.driver_name = driver.name
            out.driver_phone = driver.phone
    if s.vehicle_id:
        vehicle = db.query(Vehicle).filter(Vehicle.id == s.vehicle_id).first()
        if vehicle:
            out.vehicle_registration = vehicle.registration_number
            out.vehicle_type = vehicle.vehicle_type
            out.plate_number = vehicle.plate_number
            out.speed_kmh = vehicle.speed_kmh
            out.temperature_celsius = vehicle.temperature_celsius
            out.fuel_level = vehicle.fuel_level
            if vehicle.latitude and vehicle.longitude:
                out.current_lat = vehicle.latitude
                out.current_lng = vehicle.longitude
    if s.route_id:
        rt = db.query(Route).filter(Route.id == s.route_id).first()
        if rt:
            out.route_name = rt.name
            out.distance_km = rt.distance_km
    return out


@router.get("", response_model=List[ShipmentOut])
def get_shipments(
    status: Optional[str] = None,
    driver_id: Optional[int] = None,
    vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all shipments, optionally filtered by status, driver, or vehicle."""
    query = db.query(Shipment)
    if status and status.upper() != "ALL":
        stat_norm = status.upper().replace(" ", "_")
        query = query.filter((Shipment.status == status.upper()) | (Shipment.status == stat_norm))
    if driver_id:
        query = query.filter(Shipment.driver_id == driver_id)
    if vehicle_id:
        query = query.filter(Shipment.vehicle_id == vehicle_id)

    shipments = query.order_by(Shipment.id.desc()).all()
    return [shipment_to_out(s, db) for s in shipments]


@router.get("/my-assignment", response_model=Optional[ShipmentOut])
def get_my_assigned_shipment(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get active shipment assigned to the currently logged in driver."""
    # Find Driver record matching user
    driver = db.query(Driver).filter(Driver.user_id == current_user.id).first()
    if not driver:
        # Match by email or name if user_id was not explicitly mapped
        driver = db.query(Driver).filter(Driver.name.ilike(f"%{current_user.name}%")).first()
    if not driver and current_user.role == "driver":
        driver = db.query(Driver).first()

    if not driver:
        return None

    # Find active assignment
    active_statuses = ["ASSIGNED", "IN_TRANSIT", "IN TRANSIT", "DELAYED", "AT_RISK", "REQUESTED", "PLANNED"]
    shipment = db.query(Shipment).filter(
        Shipment.driver_id == driver.id,
        Shipment.status.in_(active_statuses)
    ).order_by(Shipment.id.desc()).first()

    if not shipment:
        # Fallback to any latest shipment for the driver
        shipment = db.query(Shipment).filter(Shipment.driver_id == driver.id).order_by(Shipment.id.desc()).first()

    if not shipment:
        return None

    return shipment_to_out(shipment, db)


@router.get("/{shipment_id}", response_model=ShipmentOut)
def get_shipment(shipment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Shipment not found.")
    return shipment_to_out(s, db)


@router.post("", response_model=ShipmentOut)
def create_shipment(
    request: ShipmentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "logistics")),
):
    """Create a new shipment connecting driver, vehicle, route, origin, destination."""
    count = db.query(Shipment).count()
    code = f"SHP-{count + 1:03d}"

    origin = request.origin or request.pickup_location or "Guwahati Central Hub"
    initial_status = "ASSIGNED" if (request.driver_id or request.vehicle_id) else "REQUESTED"

    shipment = Shipment(
        shipment_code=code,
        cargo_type=request.cargo_type,
        weight_kg=request.weight_kg,
        priority=request.priority,
        pickup_location=origin,
        destination=request.destination,
        driver_id=request.driver_id,
        vehicle_id=request.vehicle_id,
        route_id=request.route_id,
        corridor=request.corridor or f"{origin} → {request.destination}",
        eta=request.eta or "On Schedule",
        status=initial_status,
        created_by=current_user.id,
    )
    db.add(shipment)
    db.flush()

    # Update driver & vehicle statuses to ACTIVE
    driver_obj = None
    if request.driver_id:
        driver_obj = db.query(Driver).filter(Driver.id == request.driver_id).first()
        if driver_obj:
            driver_obj.status = "ACTIVE"
    if request.vehicle_id:
        veh_obj = db.query(Vehicle).filter(Vehicle.id == request.vehicle_id).first()
        if veh_obj:
            veh_obj.status = "ACTIVE"
            if request.driver_id:
                veh_obj.driver_id = request.driver_id

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        user_name=current_user.name,
        user_role=current_user.role,
        action="SHIPMENT_CREATED",
        affected_record=code,
        new_value=f"{request.cargo_type} ({request.weight_kg}kg) | Driver: {driver_obj.name if driver_obj else 'None'}"
    ))

    # Notify Logistics team
    notify_role(
        db,
        "logistics",
        f"Consignment Created: {code}",
        f"{request.cargo_type} ({request.weight_kg} kg) from {origin} to {request.destination}.",
        "SHIPMENT",
        "shipment",
        shipment.id
    )

    # Notify assigned driver
    if driver_obj and driver_obj.user_id:
        notify_user(
            db,
            driver_obj.user_id,
            f"New Consignment Assigned: {code}",
            f"You have been assigned to transport {request.cargo_type} from {origin} to {request.destination}. ETA: {shipment.eta}.",
            "SHIPMENT",
            "shipment",
            shipment.id
        )

    db.commit()
    db.refresh(shipment)
    return shipment_to_out(shipment, db)


@router.patch("/{shipment_id}/status", response_model=ShipmentOut)
def update_shipment_status(
    shipment_id: int,
    update: ShipmentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update shipment status and risk level with automated multi-user notifications."""
    s = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Shipment not found.")

    old_status = s.status
    new_status = update.status.upper()
    s.status = new_status

    if update.eta:
        s.eta = update.eta
    if update.risk_level:
        s.risk_level = update.risk_level.upper()
    if update.risk_reason:
        s.risk_reason = update.risk_reason

    # Synchronize vehicle & driver status
    vehicle = db.query(Vehicle).filter(Vehicle.id == s.vehicle_id).first() if s.vehicle_id else None
    driver = db.query(Driver).filter(Driver.id == s.driver_id).first() if s.driver_id else None

    if new_status in ["COMPLETED", "DELIVERED"]:
        if vehicle:
            vehicle.status = "IDLE"
        if driver:
            driver.status = "AVAILABLE"
        # Notify logistics and driver
        notify_role(
            db,
            "logistics",
            f"Consignment Completed: {s.shipment_code}",
            f"{s.cargo_type} successfully delivered to {s.destination}.",
            "SHIPMENT",
            "shipment",
            s.id
        )
        if driver and driver.user_id:
            notify_user(
                db,
                driver.user_id,
                f"Delivery Confirmed: {s.shipment_code}",
                f"Consignment delivery at {s.destination} confirmed. Standby for next dispatch.",
                "SHIPMENT",
                "shipment",
                s.id
            )
    elif new_status == "DELAYED":
        if vehicle:
            vehicle.status = "DELAYED"
        notify_shipment_delay(db, s.id, s.eta, s.risk_reason)
    elif new_status in ["IN_TRANSIT", "IN TRANSIT"]:
        if vehicle:
            vehicle.status = "ACTIVE"
        if driver:
            driver.status = "ACTIVE"
        if driver and driver.user_id and old_status != new_status:
            notify_user(
                db,
                driver.user_id,
                f"Consignment In Transit: {s.shipment_code}",
                f"You are now in transit towards {s.destination}.",
                "SHIPMENT",
                "shipment",
                s.id
            )
    elif new_status == "CANCELLED":
        if vehicle:
            vehicle.status = "IDLE"
        if driver:
            driver.status = "AVAILABLE"

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        user_name=current_user.name,
        user_role=current_user.role,
        action="SHIPMENT_STATUS_CHANGED",
        affected_record=s.shipment_code,
        old_value=old_status,
        new_value=new_status,
    ))

    db.commit()
    db.refresh(s)
    return shipment_to_out(s, db)
