"""
NEXTRA - Route Model
Arterial highways, mountain corridors, and trade links across Northeast India.
"""
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.database import Base


class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    origin = Column(String(200), nullable=False)
    destination = Column(String(200), nullable=False)
    waypoints_json = Column(Text, nullable=True)  # JSON array of [lat, lng] points
    distance_km = Column(Float, nullable=True)
    estimated_hours = Column(Float, nullable=True)
    highway = Column(String(50), nullable=True)  # e.g., NH-6, NH-27, NH-29
    status = Column(String(20), default="OPEN")  # OPEN, CAUTION, BLOCKED, CLOSED
    risk_level = Column(String(20), default="LOW")
    risk_event_id = Column(Integer, ForeignKey("risk_events.id"), nullable=True)
    alternate_route_id = Column(Integer, nullable=True)
    alternate_route_name = Column(String(200), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    shipments = relationship("Shipment", back_populates="assigned_route")
    risk_event = relationship("RiskEvent", back_populates="routes")
