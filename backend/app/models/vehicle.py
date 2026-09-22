"""
NEXTRA - Vehicle Model
Commercial fleet vehicle linked to Driver and Shipments.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.database import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    registration_number = Column(String(30), unique=True, nullable=False, index=True)
    plate_number = Column(String(30), nullable=True)
    vehicle_type = Column(String(100), nullable=False)
    capacity_kg = Column(Integer, default=5000)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    current_location_name = Column(String(200), nullable=True)
    state = Column(String(50), nullable=True)
    speed_kmh = Column(Float, default=0.0)
    fuel_level = Column(Float, default=80.0)
    temperature_celsius = Column(String(20), nullable=True)
    status = Column(String(20), default="ACTIVE")  # ACTIVE, IDLE, DELAYED, OFFLINE, MAINTENANCE
    last_service_date = Column(String(20), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    assigned_driver = relationship("Driver", back_populates="vehicles")
    shipments = relationship("Shipment", back_populates="assigned_vehicle")
