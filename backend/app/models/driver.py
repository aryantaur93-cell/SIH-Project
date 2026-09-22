"""
NEXTRA - Driver Model
Driver profile linked to User, Vehicles, and Shipments.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.database import Base


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    driver_code = Column(String(30), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    license_number = Column(String(50), nullable=True)
    assigned_state = Column(String(50), nullable=True)
    assigned_district = Column(String(100), nullable=True)
    experience_years = Column(Integer, default=0)
    rating = Column(Float, default=4.5)
    safety_score = Column(Float, default=95.0)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    status = Column(String(20), default="ACTIVE")  # ACTIVE, IDLE, DELAYED, OFFLINE, MAINTENANCE
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="driver_profile")
    vehicles = relationship("Vehicle", back_populates="assigned_driver")
    shipments = relationship("Shipment", back_populates="assigned_driver")
