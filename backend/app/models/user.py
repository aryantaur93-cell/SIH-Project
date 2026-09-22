"""
NEXTRA - User Model
Core authentication and user identity model.
"""
from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from app.database.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # admin, field_officer, logistics, driver
    phone = Column(String(20), nullable=True)
    assigned_state = Column(String(50), nullable=True, default="ALL")
    assigned_district = Column(String(100), nullable=True, default="ALL")
    officer_id = Column(String(30), nullable=True)  # For field officers legacy badge
    status = Column(String(20), nullable=False, default="ACTIVE")
    is_demo = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    driver_profile = relationship("Driver", back_populates="user", uselist=False)
    field_officer_profile = relationship("FieldOfficerProfile", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    field_reports = relationship("FieldReport", back_populates="reporter")
    audit_logs = relationship("AuditLog", back_populates="user")
    verifications_reviewed = relationship("Verification", back_populates="reviewer")
