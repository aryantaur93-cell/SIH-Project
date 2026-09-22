"""
NEXTRA - Field Report Model
Ground incident and hazard reports submitted by Field Officers and Drivers.
"""
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.database import Base


class FieldReport(Base):
    __tablename__ = "field_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_code = Column(String(30), unique=True, nullable=False, index=True)
    client_report_id = Column(String(100), unique=True, nullable=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    region_id = Column(Integer, ForeignKey("regions.id"), nullable=True)
    reporter_name = Column(String(100), nullable=True)
    reporter_role = Column(String(20), nullable=True)
    incident_type = Column(String(50), nullable=False)  # LANDSLIDE, FLOOD, ROAD_BLOCKAGE, etc.
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    state = Column(String(50), nullable=False)
    district = Column(String(100), nullable=True)
    location_name = Column(String(200), nullable=True)
    image_path = Column(String(500), nullable=True)
    severity = Column(String(20), default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(20), default="PENDING")  # PENDING, VERIFIED, REJECTED, RESOLVED
    ai_analysis_json = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    reporter = relationship("User", back_populates="field_reports")
    region = relationship("Region", back_populates="field_reports")
    verification = relationship("Verification", back_populates="report", uselist=False)
