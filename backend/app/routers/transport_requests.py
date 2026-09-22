"""
NEXTRA - Transportation Requests Router
Full lifecycle management for freight requests: REQUESTED -> MATCHING -> ASSIGNED -> IN TRANSIT -> COMPLETED.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user, require_role
from app.models.transport_request import TransportationRequest
from app.models.driver import Driver
from app.models.vehicle import Vehicle
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.schemas import (
    TransportRequestCreateRequest,
    TransportRequestUpdateRequest,
    TransportRequestOut,
)
from app.services.notification_service import notify_role, notify_user
from typing import List, Optional


router = APIRouter(prefix="/api/transport-requests", tags=["Transportation Requests"])


def request_to_out(tr: TransportationRequest, db: Session) -> TransportRequestOut:
    out = TransportRequestOut.model_validate(tr)
    out.pickup = tr.pickup_location
    out.weight = tr.weight_kg
    out.capacity = tr.capacity_kg
    if tr.matched_truck_id:
        v = db.query(Vehicle).filter(Vehicle.id == tr.matched_truck_id).first()
        if v:
            out.matched_vehicle_registration = v.registration_number
    if tr.matched_driver_id:
        d = db.query(Driver).filter(Driver.id == tr.matched_driver_id).first()
        if d:
            out.matched_driver_name = d.name
    return out



@router.get("", response_model=List[TransportRequestOut])
def get_transport_requests(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all transportation requests, optionally filtered by status."""
    query = db.query(TransportationRequest)
    if status and status.upper() != "ALL":
        query = query.filter(TransportationRequest.status == status.upper())
    requests = query.order_by(TransportationRequest.id.desc()).all()
    return [request_to_out(r, db) for r in requests]


@router.get("/{request_id}", response_model=TransportRequestOut)
def get_transport_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a single transportation request by ID."""
    tr = db.query(TransportationRequest).filter(TransportationRequest.id == request_id).first()
    if not tr:
        raise HTTPException(status_code=404, detail="Transportation request not found.")
    return request_to_out(tr, db)


@router.post("", response_model=TransportRequestOut)
def create_transport_request(
    payload: TransportRequestCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "logistics")),
):
    """Create a new transportation request in REQUESTED status."""
    count = db.query(TransportationRequest).count()
    code = f"TR-{count + 1:03d}"

    tr = TransportationRequest(
        request_code=code,
        pickup_location=payload.pickup_location,
        destination=payload.destination,
        cargo_type=payload.cargo_type,
        weight_kg=payload.weight_kg,
        vehicle_type=payload.vehicle_type,
        capacity_kg=payload.capacity_kg,
        priority=payload.priority,
        required_date=payload.required_date,
        required_time=payload.required_time,
        notes=payload.notes,
        status="REQUESTED",
        created_by=current_user.id,
    )
    db.add(tr)
    db.flush()

    # Log audit event
    db.add(AuditLog(
        user_id=current_user.id,
        user_name=current_user.name,
        user_role=current_user.role,
        action="TRANSPORT_REQUEST_CREATED",
        affected_record=code,
        new_value=f"{payload.cargo_type} ({payload.weight_kg}kg) to {payload.destination}",
    ))

    # Notify Logistics team and Admins
    notify_role(
        db,
        "logistics",
        f"New Transportation Request {code}",
        f"{payload.cargo_type} ({payload.weight_kg} kg) from {payload.pickup_location} to {payload.destination}.",
        "SHIPMENT",
        "transport_request",
        tr.id,
    )

    db.commit()
    db.refresh(tr)
    return request_to_out(tr, db)


@router.patch("/{request_id}/status", response_model=TransportRequestOut)
def update_transport_request_status(
    request_id: int,
    payload: TransportRequestUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update status and assignment details of a transportation request."""
    tr = db.query(TransportationRequest).filter(TransportationRequest.id == request_id).first()
    if not tr:
        raise HTTPException(status_code=404, detail="Transportation request not found.")

    old_status = tr.status
    if payload.status:
        tr.status = payload.status.upper()
    if payload.matched_truck_id is not None:
        tr.matched_truck_id = payload.matched_truck_id
    if payload.matched_driver_id is not None:
        tr.matched_driver_id = payload.matched_driver_id
    if payload.notes is not None:
        tr.notes = payload.notes

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        user_name=current_user.name,
        user_role=current_user.role,
        action="TRANSPORT_REQUEST_STATUS_CHANGED",
        affected_record=tr.request_code,
        old_value=old_status,
        new_value=tr.status,
    ))

    db.commit()
    db.refresh(tr)
    return request_to_out(tr, db)


@router.post("/{request_id}/match", response_model=TransportRequestOut)
def auto_match_transport_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "logistics")),
):
    """Auto-match an available vehicle and certified driver for this request."""
    tr = db.query(TransportationRequest).filter(TransportationRequest.id == request_id).first()
    if not tr:
        raise HTTPException(status_code=404, detail="Transportation request not found.")

    # Find available vehicle that can carry the weight
    v_query = db.query(Vehicle).filter(Vehicle.capacity_kg >= tr.weight_kg)
    # Prefer IDLE, then ACTIVE
    vehicle = v_query.filter(Vehicle.status == "IDLE").first()
    if not vehicle:
        vehicle = v_query.filter(Vehicle.status == "ACTIVE").first()
    if not vehicle:
        vehicle = db.query(Vehicle).first()

    # Find driver paired with vehicle or available driver
    driver = None
    if vehicle and vehicle.driver_id:
        driver = db.query(Driver).filter(Driver.id == vehicle.driver_id).first()
    if not driver:
        driver = db.query(Driver).filter(Driver.status.in_(["ACTIVE", "AVAILABLE"])).first()
    if not driver:
        driver = db.query(Driver).first()

    if vehicle:
        tr.matched_truck_id = vehicle.id
    if driver:
        tr.matched_driver_id = driver.id

    tr.status = "ASSIGNED"

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        user_name=current_user.name,
        user_role=current_user.role,
        action="TRANSPORT_REQUEST_MATCHED",
        affected_record=tr.request_code,
        new_value=f"Vehicle {vehicle.registration_number if vehicle else 'N/A'}, Driver {driver.name if driver else 'N/A'}",
    ))

    # Notify driver if linked to user
    if driver and driver.user_id:
        notify_user(
            db,
            driver.user_id,
            f"Assignment Match: {tr.request_code}",
            f"You have been matched for freight {tr.cargo_type} ({tr.weight_kg} kg) from {tr.pickup_location} to {tr.destination}.",
            "SHIPMENT",
            "transport_request",
            tr.id,
        )

    db.commit()
    db.refresh(tr)
    return request_to_out(tr, db)
