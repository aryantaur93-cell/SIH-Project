"""
NEXTRA - Verification Model
Human-in-the-loop ground truth verification queue.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.database import Base


class Verification(Base):
    __tablename__ = "verifications"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("field_reports.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewer_name = Column(String(100), nullable=True)
    reviewer_role = Column(String(20), nullable=True)
    status = Column(String(20), default="PENDING")  # PENDING, VERIFIED, REJECTED
    remarks = Column(Text, nullable=True)
    ai_analysis_json = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    reviewed_at = Column(DateTime, nullable=True)

    # Relationships
    report = relationship("FieldReport", back_populates="verification")
    reviewer = relationship("User", back_populates="verifications_reviewed")
