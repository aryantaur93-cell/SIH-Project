"""
NEXTRA - Drivers Router
Driver roster management, profile details, and multi-parameter filtering.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user
from app.models.driver import Driver
from app.models.vehicle import Vehicle
from app.models.user import User
from app.schemas.schemas import DriverOut
from typing import List, Optional

router = APIRouter(prefix="/api/drivers", tags=["Drivers"])


def driver_to_out(d: Driver, db: Session) -> DriverOut:
    """Convert Driver model to comprehensive DriverOut response with vehicle and location."""
    out = DriverOut.model_validate(d)
    out.driver_id = d.driver_code
    out.assigned_area = f"{d.assigned_state or ''} - {d.assigned_district or ''}".strip(" -")

    vehicle = db.query(Vehicle).filter(Vehicle.driver_id == d.id).first()
    lat = d.latitude if d.latitude is not None else (vehicle.latitude if vehicle else None)
    lng = d.longitude if d.longitude is not None else (vehicle.longitude if vehicle else None)
    out.latitude = lat
    out.longitude = lng

    if vehicle:
        out.vehicle_registration = vehicle.registration_number
        out.vehicle = {
            "id": vehicle.id,
            "registration": vehicle.registration_number,
            "plate_number": vehicle.plate_number,
            "vehicle_type": vehicle.vehicle_type,
            "capacity": f"{vehicle.capacity_kg} kg",
            "status": vehicle.status,
            "speed_kmh": vehicle.speed_kmh,
            "fuel_level": vehicle.fuel_level,
            "temperature_celsius": vehicle.temperature_celsius,
        }
        out.current_location = {
            "name": vehicle.current_location_name or f"{d.assigned_district or d.assigned_state or 'Northeast'} Sector",
            "state": vehicle.state or d.assigned_state,
            "latitude": lat,
            "longitude": lng,
        }
    else:
        out.current_location = {
            "name": f"{d.assigned_district or d.assigned_state or 'Central'} Staging Base",
            "state": d.assigned_state,
            "latitude": lat,
            "longitude": lng,
        }

    return out


@router.get("", response_model=List[DriverOut])
def get_drivers(
    state: Optional[str] = None,
    district: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all drivers, optionally filtered by state, district, status, or search query."""
    query = db.query(Driver)

    if state and state.upper() != "ALL":
        query = query.filter(Driver.assigned_state.ilike(f"%{state}%"))
    if district and district.upper() != "ALL":
        query = query.filter(Driver.assigned_district.ilike(f"%{district}%"))
    if status and status.upper() != "ALL":
        query = query.filter(Driver.status == status.upper())

    drivers = query.order_by(Driver.id).all()
    results = [driver_to_out(d, db) for d in drivers]

    if search:
        s = search.lower().strip()
        results = [
            d for d in results
            if s in d.name.lower()
            or s in d.driver_code.lower()
            or (d.phone and s in d.phone.lower())
            or (d.assigned_state and s in d.assigned_state.lower())
            or (d.assigned_district and s in d.assigned_district.lower())
            or (d.vehicle_registration and s in d.vehicle_registration.lower())
        ]

    return results


@router.get("/{driver_id}", response_model=DriverOut)
def get_driver(
    driver_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a single driver by numeric ID or driver_code string (e.g. DRV-001)."""
    if driver_id.isdigit():
        d = db.query(Driver).filter(Driver.id == int(driver_id)).first()
    else:
        d = db.query(Driver).filter(Driver.driver_code.ilike(driver_id)).first()

    if not d:
        raise HTTPException(status_code=404, detail="Driver not found.")
    return driver_to_out(d, db)
