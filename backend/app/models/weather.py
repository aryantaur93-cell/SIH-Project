"""
NEXTRA - Weather Data Model
Regional weather and meteorological risk tracking across NER.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.database import Base


class WeatherData(Base):
    __tablename__ = "weather_data"

    id = Column(Integer, primary_key=True, index=True)
    state = Column(String(50), nullable=False, index=True)
    district = Column(String(100), nullable=True)
    region_id = Column(Integer, ForeignKey("regions.id"), nullable=True)
    temperature_c = Column(Float, nullable=True)
    rainfall_mm = Column(Float, default=0.0)
    humidity_pct = Column(Float, default=60.0)
    wind_speed_kmh = Column(Float, default=10.0)
    condition = Column(String(100), nullable=True)  # Sunny, Rainy, Foggy, Snow, Thunderstorm
    is_demo = Column(Integer, default=1)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    region = relationship("Region", back_populates="weather")

    @property
    def temperature(self) -> float:
        return self.temperature_c if self.temperature_c is not None else 24.0

    @property
    def rainfall(self) -> float:
        return self.rainfall_mm if self.rainfall_mm is not None else 0.0

    @property
    def wind(self) -> float:
        return self.wind_speed_kmh if self.wind_speed_kmh is not None else 10.0

    @property
    def timestamp(self):
        return self.updated_at
