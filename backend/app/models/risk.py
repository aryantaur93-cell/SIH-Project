"""
NEXTRA - Risk Event Model
Geohazards, mudslides, flood warnings, and road risk events.
"""
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.database import Base


class RiskEvent(Base):
    __tablename__ = "risk_events"

    id = Column(Integer, primary_key=True, index=True)
    state = Column(String(50), nullable=False, index=True)
    district = Column(String(100), nullable=True)
    region_id = Column(Integer, ForeignKey("regions.id"), nullable=True)
    risk_score = Column(Integer, default=0)  # 0-100
    risk_level = Column(String(20), default="LOW")  # LOW, MODERATE, HIGH, CRITICAL
    contributing_factors = Column(Text, nullable=True)  # JSON array
    description = Column(String(500), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    radius_meters = Column(Integer, default=10000)
    event_type = Column(String(50), nullable=True)  # LANDSLIDE, FLOOD, WEATHER, etc.
    active = Column(Integer, default=1)
    source = Column(String(50), default="SYSTEM")  # SYSTEM, FIELD_REPORT, WEATHER
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    region = relationship("Region", back_populates="risks")
    routes = relationship("Route", back_populates="risk_event")
    alerts = relationship("Alert", back_populates="risk_event")
