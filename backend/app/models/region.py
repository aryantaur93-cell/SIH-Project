"""
NEXTRA - Region Model
Northeast state geographic sector and risk intelligence hub.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, func
from sqlalchemy.orm import relationship
from app.database.database import Base


class Region(Base):
    __tablename__ = "regions"

    id = Column(Integer, primary_key=True, index=True)
    state = Column(String(50), nullable=False, unique=True, index=True)
    district = Column(String(100), nullable=True)
    name = Column(String(100), nullable=False)
    center_lat = Column(Float, nullable=False)
    center_lng = Column(Float, nullable=False)
    zoom_level = Column(Float, default=8.0)
    risk_level = Column(String(20), default="LOW")  # LOW, MODERATE, HIGH, CRITICAL
    accessibility_status = Column(String(30), default="OPEN")  # OPEN, PARTIALLY_AFFECTED, BLOCKED, CLOSED
    accessibility_score = Column(Integer, default=75)
    road_status = Column(String(200), nullable=True)
    description = Column(String(500), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    field_officers = relationship("FieldOfficerProfile", back_populates="region")
    field_reports = relationship("FieldReport", back_populates="region")
    alerts = relationship("Alert", back_populates="region")
    weather = relationship("WeatherData", back_populates="region")
    risks = relationship("RiskEvent", back_populates="region")
