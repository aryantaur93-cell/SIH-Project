"""
NEXTRA - Transportation Request Model
Freight dispatch booking, parameters, and fleet matching workflow.
"""
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.database import Base


class TransportationRequest(Base):
    __tablename__ = "transport_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_code = Column(String(30), unique=True, nullable=False, index=True)
    pickup_location = Column(String(200), nullable=False)
    destination = Column(String(200), nullable=False)
    cargo_type = Column(String(200), nullable=False)
    weight_kg = Column(Float, nullable=False)
    vehicle_type = Column(String(100), nullable=True)
    capacity_kg = Column(Float, nullable=True)
    priority = Column(String(20), default="NORMAL")  # LOW, NORMAL, HIGH, URGENT
    required_date = Column(String(30), nullable=True)
    required_time = Column(String(30), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(30), default="REQUESTED")  # REQUESTED, MATCHING, ASSIGNED, IN TRANSIT, DELAYED, COMPLETED, CANCELLED

    # Matched Fleet References
    matched_truck_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    matched_driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    matched_vehicle = relationship("Vehicle", foreign_keys=[matched_truck_id])
    matched_driver = relationship("Driver", foreign_keys=[matched_driver_id])
    linked_shipment = relationship("Shipment", foreign_keys=[shipment_id])
    creator = relationship("User", foreign_keys=[created_by])
