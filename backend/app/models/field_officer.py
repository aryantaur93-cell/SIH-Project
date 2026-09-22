"""
NEXTRA - Field Officer Profile Model
Dedicated profile model linked to User (1:1) and Region (N:1).
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.database import Base


class FieldOfficerProfile(Base):
    __tablename__ = "field_officer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    officer_badge = Column(String(50), unique=True, nullable=False, index=True)
    assigned_state = Column(String(50), nullable=False)
    assigned_district = Column(String(100), nullable=True, default="ALL")
    region_id = Column(Integer, ForeignKey("regions.id"), nullable=True)
    station_name = Column(String(150), nullable=True)
    rank = Column(String(50), default="Sector Ground Inspector")
    contact_number = Column(String(20), nullable=True)
    active_reports_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="field_officer_profile")
    region = relationship("Region", back_populates="field_officers")
