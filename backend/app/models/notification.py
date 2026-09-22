"""
NEXTRA - Notification Model
User-targeted notifications and operational alerts.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=True)
    type = Column(String(30), default="SYSTEM")  # REPORT, VERIFICATION, RISK, ALERT, SHIPMENT, ROUTE, SYSTEM
    related_entity_type = Column(String(30), nullable=True)  # report, shipment, vehicle, risk, etc.
    related_entity_id = Column(Integer, nullable=True)
    is_read = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="notifications")

    @property
    def related_entity(self):
        return self.related_entity_type

    @related_entity.setter
    def related_entity(self, val):
        self.related_entity_type = val

