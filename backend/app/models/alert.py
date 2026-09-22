"""
NEXTRA - Alert Model
Regional and corridor broadcast alerts.
"""
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    state = Column(String(50), nullable=True)
    district = Column(String(100), nullable=True)
    region_id = Column(Integer, ForeignKey("regions.id"), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    alert_type = Column(String(50), nullable=True)  # RISK, WEATHER, ROAD, SHIPMENT
    related_risk_id = Column(Integer, ForeignKey("risk_events.id"), nullable=True)
    active = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    region = relationship("Region", back_populates="alerts")
    risk_event = relationship("RiskEvent", back_populates="alerts")
