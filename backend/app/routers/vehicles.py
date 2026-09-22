"""
NEXTRA - Vehicles Router
Fleet management, GPS location updates, and vehicle queries with full driver and shipment dossier.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.dependencies import get_db, get_current_user
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.shipment import Shipment
from app.models.user import User
from app.schemas.schemas import VehicleOut, VehicleLocationUpdate
from typing import List, Optional

router = APIRouter(prefix="/api/vehicles", tags=["Vehicles"])


def vehicle_to_out(v: Vehicle, db: Session) -> VehicleOut:
    """Convert Vehicle model to comprehensive response with driver and active shipment."""
    out = VehicleOut.model_validate(v)
    out.vehicle_id = str(v.id)
    out.registration = v.registration_number
    out.capacity = f"{v.capacity_kg} kg"

    location_data = {
        "name": v.current_location_name or "Northeast Corridor",
        "state": v.state,
        "district": None,
        "latitude": v.latitude,
        "longitude": v.longitude,
    }

    if v.driver_id:
        driver = db.query(Driver).filter(Driver.id == v.driver_id).first()
        if driver:
            out.driver_name = driver.name
            area_str = f"{driver.assigned_state or ''} - {driver.assigned_district or ''}".strip(" -")
            out.driver = {
                "id": driver.id,
                "driver_id": driver.driver_code,
                "name": driver.name,
                "phone": driver.phone,
                "assigned_area": area_str,
                "assigned_state": driver.assigned_state,
                "assigned_district": driver.assigned_district,
                "status": driver.status,
                "rating": driver.rating,
                "safety_score": driver.safety_score,
            }
            location_data["district"] = driver.assigned_district
            out.district = driver.assigned_district

    out.current_location = location_data

    # Link active shipment if present
    shipment = db.query(Shipment).filter(
        Shipment.vehicle_id == v.id,
        Shipment.status.in_(["ASSIGNED", "IN_TRANSIT", "DELAYED", "AT_RISK", "PLANNED"])
    ).first()
    if shipment:
        out.current_shipment = {
            "id": shipment.id,
            "code": shipment.shipment_code,
            "cargo": shipment.cargo_type,
            "weight_kg": shipment.weight_kg,
            "priority": shipment.priority,
            "pickup": shipment.pickup_location,
            "destination": shipment.destination,
            "corridor": shipment.corridor,
            "eta": shipment.eta,
            "status": shipment.status,
            "risk_level": shipment.risk_level,
            "risk_reason": shipment.risk_reason,
        }

    return out


@router.get("", response_model=List[VehicleOut])
def get_vehicles(
    state: Optional[str] = None,
    district: Optional[str] = None,
    status: Optional[str] = None,
    driver_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all vehicles with optional multi-parameter filtering."""
    query = db.query(Vehicle)

    if state and state.upper() != "ALL":
        query = query.filter(Vehicle.state.ilike(f"%{state}%"))
    if status and status.upper() != "ALL":
        query = query.filter(Vehicle.status == status.upper())
    if driver_id:
        query = query.filter(Vehicle.driver_id == driver_id)

    vehicles = query.order_by(Vehicle.id).all()
    results = [vehicle_to_out(v, db) for v in vehicles]

    # Additional in-memory filtering for district & search across joined fields
    if district and district.upper() != "ALL":
        results = [
            v for v in results
            if v.district and district.lower() in v.district.lower()
        ]
    if search:
        s = search.lower().strip()
        results = [
            v for v in results
            if s in v.registration_number.lower()
            or (v.plate_number and s in v.plate_number.lower())
            or (v.driver_name and s in v.driver_name.lower())
            or (v.current_location_name and s in v.current_location_name.lower())
            or (v.state and s in v.state.lower())
        ]

    return results


@router.get("/{vehicle_id}", response_model=VehicleOut)
def get_vehicle(
    vehicle_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a single vehicle by numeric ID or registration number string."""
    if vehicle_id.isdigit():
        v = db.query(Vehicle).filter(Vehicle.id == int(vehicle_id)).first()
    else:
        v = db.query(Vehicle).filter(Vehicle.registration_number.ilike(vehicle_id)).first()

    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
    return vehicle_to_out(v, db)


@router.patch("/{vehicle_id}/location", response_model=VehicleOut)
def update_vehicle_location(
    vehicle_id: int,
    update: VehicleLocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a vehicle's GPS location (used by driver devices)."""
    v = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
    v.latitude = update.latitude
    v.longitude = update.longitude
    if update.speed_kmh is not None:
        v.speed_kmh = update.speed_kmh
    if update.current_location_name:
        v.current_location_name = update.current_location_name
    db.commit()
    db.refresh(v)
    return vehicle_to_out(v, db)
