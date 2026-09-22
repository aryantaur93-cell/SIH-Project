"""
NEXTRA - Shipment Model
Freight consignments and supply chain logistics tracking.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.database import Base


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, index=True)
    shipment_code = Column(String(30), unique=True, nullable=False, index=True)
    cargo_type = Column(String(200), nullable=False)
    weight_kg = Column(Float, nullable=False)
    priority = Column(String(20), default="NORMAL")  # LOW, NORMAL, HIGH, URGENT
    pickup_location = Column(String(200), nullable=False)
    destination = Column(String(200), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=True)
    status = Column(String(20), default="PLANNED")  # PLANNED, ASSIGNED, IN_TRANSIT, DELAYED, AT_RISK, DELIVERED, CANCELLED
    eta = Column(String(100), nullable=True)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    corridor = Column(String(100), nullable=True)
    risk_level = Column(String(20), default="LOW")
    risk_reason = Column(String(300), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    assigned_driver = relationship("Driver", back_populates="shipments")
    assigned_vehicle = relationship("Vehicle", back_populates="shipments")
    assigned_route = relationship("Route", back_populates="shipments")
