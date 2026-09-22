"""
NEXTRA - Pydantic Schemas
Request/Response models for all API endpoints.
"""
from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional, List, Any, Dict
from datetime import datetime


# ── AUTH ──────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "driver"
    phone: Optional[str] = None
    assigned_state: Optional[str] = "ALL"
    assigned_district: Optional[str] = "ALL"

class ForgotPasswordVerifyRequest(BaseModel):
    email: str

class ForgotPasswordVerifyResponse(BaseModel):
    status: str
    exists: bool
    name: Optional[str] = None
    email: Optional[str] = None
    message: str

class ForgotPasswordResetRequest(BaseModel):
    email: str
    new_password: str

class ForgotPasswordResetResponse(BaseModel):
    status: str
    message: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    assigned_state: Optional[str] = None
    assigned_district: Optional[str] = None
    officer_id: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    assigned_state: Optional[str] = None
    assigned_district: Optional[str] = None
    status: Optional[str] = None

class CreateFieldOfficerRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    assigned_state: str
    assigned_district: Optional[str] = "ALL"
    officer_id: Optional[str] = None
    status: Optional[str] = "ACTIVE"


# ── WEATHER ──────────────────────────────────────────────────────
class WeatherOut(BaseModel):
    id: int
    state: str
    district: Optional[str] = None
    temperature_c: Optional[float] = None
    rainfall_mm: float
    humidity_pct: float
    wind_speed_kmh: float
    condition: Optional[str] = None
    temperature: Optional[float] = None
    rainfall: Optional[float] = None
    wind: Optional[float] = None
    timestamp: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @model_validator(mode="before")
    @classmethod
    def populate_weather_aliases(cls, data):
        temp = getattr(data, "temperature_c", None) if not isinstance(data, dict) else data.get("temperature_c")
        if temp is None:
            temp = getattr(data, "temperature", None) if not isinstance(data, dict) else data.get("temperature")

        rain = getattr(data, "rainfall_mm", None) if not isinstance(data, dict) else data.get("rainfall_mm")
        if rain is None:
            rain = getattr(data, "rainfall", None) if not isinstance(data, dict) else data.get("rainfall")

        w_speed = getattr(data, "wind_speed_kmh", None) if not isinstance(data, dict) else data.get("wind_speed_kmh")
        if w_speed is None:
            w_speed = getattr(data, "wind", None) if not isinstance(data, dict) else data.get("wind")

        upd = getattr(data, "updated_at", None) if not isinstance(data, dict) else data.get("updated_at")
        if upd is None:
            upd = getattr(data, "timestamp", None) if not isinstance(data, dict) else data.get("timestamp")

        if isinstance(data, dict):
            data["temperature_c"] = temp if temp is not None else 24.0
            data["temperature"] = temp if temp is not None else 24.0
            data["rainfall_mm"] = rain if rain is not None else 0.0
            data["rainfall"] = rain if rain is not None else 0.0
            data["wind_speed_kmh"] = w_speed if w_speed is not None else 10.0
            data["wind"] = w_speed if w_speed is not None else 10.0
            data["updated_at"] = upd
            data["timestamp"] = upd
            return data

        return data

    class Config:
        from_attributes = True


class WeatherUpdateRequest(BaseModel):
    state: str
    district: Optional[str] = None
    temperature: Optional[float] = None
    temperature_c: Optional[float] = None
    rainfall: Optional[float] = None
    rainfall_mm: Optional[float] = None
    condition: Optional[str] = None
    wind: Optional[float] = None
    wind_speed_kmh: Optional[float] = None
    humidity_pct: Optional[float] = 65.0


# ── REGIONS ──────────────────────────────────────────────────────
class RegionOut(BaseModel):
    id: int
    state: str
    name: str
    center_lat: float
    center_lng: float
    zoom_level: float
    risk_level: str
    accessibility_status: str = "OPEN"
    accessibility_score: int
    road_status: Optional[str] = None
    description: Optional[str] = None
    weather: List[WeatherOut] = []
    accessibility: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


# ── VEHICLES ─────────────────────────────────────────────────────
class VehicleOut(BaseModel):
    id: int
    vehicle_id: Optional[str] = None
    registration_number: str
    registration: Optional[str] = None
    plate_number: Optional[str] = None
    vehicle_type: str
    capacity_kg: int
    capacity: Optional[str] = None
    driver_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    current_location_name: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    speed_kmh: float = 0.0
    fuel_level: float = 80.0
    temperature_celsius: Optional[str] = None
    status: str = "ACTIVE"  # ACTIVE, IDLE, DELAYED, OFFLINE, MAINTENANCE
    driver_name: Optional[str] = None
    driver: Optional[Dict[str, Any]] = None
    current_location: Optional[Dict[str, Any]] = None
    current_shipment: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class VehicleLocationUpdate(BaseModel):
    latitude: float
    longitude: float
    speed_kmh: Optional[float] = None
    current_location_name: Optional[str] = None


# ── DRIVERS ──────────────────────────────────────────────────────
class DriverOut(BaseModel):
    id: int
    driver_id: Optional[str] = None
    driver_code: str
    name: str
    phone: Optional[str] = None
    assigned_state: Optional[str] = None
    assigned_district: Optional[str] = None
    assigned_area: Optional[str] = None
    experience_years: int = 0
    rating: float = 4.5
    safety_score: float = 95.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str = "ACTIVE"  # ACTIVE, IDLE, DELAYED, OFFLINE, MAINTENANCE
    vehicle_registration: Optional[str] = None
    vehicle: Optional[Dict[str, Any]] = None
    current_location: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


# ── AREA INTELLIGENCE ────────────────────────────────────────────
class AreaIntelligenceOut(BaseModel):
    state: str
    name: str
    center_lat: float
    center_lng: float
    zoom_level: float
    active_drivers_count: int
    active_drivers: List[Dict[str, Any]]
    active_vehicles_count: int
    active_vehicles: List[Dict[str, Any]]
    shipments_count: int
    shipments: List[Dict[str, Any]]
    delays_count: int
    delays: List[Dict[str, Any]]
    risks_count: int
    risks: List[Dict[str, Any]]
    field_reports_count: int
    field_reports: List[Dict[str, Any]]
    alerts_count: int
    alerts: List[Dict[str, Any]]
    weather: Optional[Dict[str, Any]] = None
    accessibility: Dict[str, Any]
    open_routes_count: int
    open_routes: List[Dict[str, Any]]
    blocked_routes_count: int
    blocked_routes: List[Dict[str, Any]]


# ── SHIPMENTS ────────────────────────────────────────────────────
class ShipmentOut(BaseModel):
    id: int
    shipment_code: str
    cargo_type: str
    cargo: Optional[str] = None
    weight_kg: float
    weight: Optional[float] = None
    priority: str
    pickup_location: str
    origin: Optional[str] = None
    destination: str
    driver_id: Optional[int] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    vehicle_id: Optional[int] = None
    vehicle_registration: Optional[str] = None
    vehicle_type: Optional[str] = None
    plate_number: Optional[str] = None
    route_id: Optional[int] = None
    route_name: Optional[str] = None
    distance_km: Optional[float] = None
    status: str
    eta: Optional[str] = None
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    current_location: Optional[str] = None
    corridor: Optional[str] = None
    risk_level: str = "LOW"
    risk: Optional[str] = None
    risk_reason: Optional[str] = None
    speed_kmh: Optional[float] = None
    temperature_celsius: Optional[str] = None
    fuel_level: Optional[float] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ShipmentCreateRequest(BaseModel):
    cargo_type: Optional[str] = None
    cargo: Optional[str] = None
    weight_kg: Optional[float] = None
    weight: Optional[float] = None
    priority: str = "NORMAL"
    pickup_location: Optional[str] = None
    origin: Optional[str] = None
    destination: str
    driver_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    route_id: Optional[int] = None
    corridor: Optional[str] = None
    eta: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def populate_shipment_aliases(cls, values):
        if isinstance(values, dict):
            # cargo <-> cargo_type
            if "cargo" in values and ("cargo_type" not in values or not values["cargo_type"]):
                values["cargo_type"] = values["cargo"]
            elif "cargo_type" in values and ("cargo" not in values or not values["cargo"]):
                values["cargo"] = values["cargo_type"]

            # weight <-> weight_kg
            if "weight" in values and ("weight_kg" not in values or values["weight_kg"] is None):
                values["weight_kg"] = values["weight"]
            elif "weight_kg" in values and ("weight" not in values or values["weight"] is None):
                values["weight"] = values["weight_kg"]

            # origin <-> pickup_location
            if "origin" in values and ("pickup_location" not in values or not values["pickup_location"]):
                values["pickup_location"] = values["origin"]
            elif "pickup_location" in values and ("origin" not in values or not values["origin"]):
                values["origin"] = values["pickup_location"]
        return values


class ShipmentStatusUpdate(BaseModel):
    status: str
    eta: Optional[str] = None
    risk_level: Optional[str] = None
    risk_reason: Optional[str] = None


# ── TRANSPORTATION REQUESTS ──────────────────────────────────────
class TransportRequestCreateRequest(BaseModel):
    pickup_location: Optional[str] = None
    pickup: Optional[str] = None
    destination: str
    cargo_type: str
    weight_kg: Optional[float] = None
    weight: Optional[float] = None
    vehicle_type: Optional[str] = None
    capacity_kg: Optional[float] = None
    capacity: Optional[float] = None
    priority: str = "NORMAL"
    required_date: Optional[str] = None
    required_time: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def populate_field_aliases(cls, values):
        if isinstance(values, dict):
            # Map pickup <-> pickup_location
            if "pickup" in values and ("pickup_location" not in values or not values["pickup_location"]):
                values["pickup_location"] = values["pickup"]
            elif "pickup_location" in values and ("pickup" not in values or not values["pickup"]):
                values["pickup"] = values["pickup_location"]

            # Map weight <-> weight_kg
            if "weight" in values and ("weight_kg" not in values or values["weight_kg"] is None):
                values["weight_kg"] = values["weight"]
            elif "weight_kg" in values and ("weight" not in values or values["weight"] is None):
                values["weight"] = values["weight_kg"]

            # Map capacity <-> capacity_kg
            if "capacity" in values and ("capacity_kg" not in values or values["capacity_kg"] is None):
                values["capacity_kg"] = values["capacity"]
            elif "capacity_kg" in values and ("capacity" not in values or values["capacity"] is None):
                values["capacity"] = values["capacity_kg"]
        return values

class TransportRequestUpdateRequest(BaseModel):
    status: Optional[str] = None
    matched_truck_id: Optional[int] = None
    matched_driver_id: Optional[int] = None
    notes: Optional[str] = None

class TransportRequestOut(BaseModel):
    id: int
    request_code: str
    pickup_location: str
    pickup: Optional[str] = None
    destination: str
    cargo_type: str
    weight_kg: float
    weight: Optional[float] = None
    vehicle_type: Optional[str] = None
    capacity_kg: Optional[float] = None
    capacity: Optional[float] = None
    priority: str = "NORMAL"
    required_date: Optional[str] = None
    required_time: Optional[str] = None
    notes: Optional[str] = None
    status: str = "REQUESTED"
    matched_truck_id: Optional[int] = None
    matched_vehicle_registration: Optional[str] = None
    matched_driver_id: Optional[int] = None
    matched_driver_name: Optional[str] = None
    shipment_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── ROUTES ───────────────────────────────────────────────────────
class RouteOut(BaseModel):
    id: int
    name: str
    origin: str
    destination: str
    waypoints_json: Optional[str] = None
    distance_km: Optional[float] = None
    estimated_hours: Optional[float] = None
    highway: Optional[str] = None
    status: str
    risk_level: str
    alternate_route_name: Optional[str] = None
    corridor_code: Optional[str] = None
    route_name: Optional[str] = None
    origin_hub: Optional[str] = None
    destination_hub: Optional[str] = None
    is_affected: Optional[bool] = False
    hazard_description: Optional[str] = None

    class Config:
        from_attributes = True


class AffectedRoadOut(BaseModel):
    id: int
    name: str
    highway: str
    corridor_code: str
    status: str
    risk_level: str
    risk_score: int = 75
    origin: str
    destination: str
    distance_km: Optional[float] = None
    estimated_hours: Optional[float] = None
    primary_hazard: str = "Active Hazard"
    hazard_description: Optional[str] = None
    bottleneck_latitude: Optional[float] = None
    bottleneck_longitude: Optional[float] = None
    bottleneck_location: Optional[str] = None
    alternate_route_name: Optional[str] = None
    recommended_action: Optional[str] = None
    waypoints_json: Optional[str] = None

    class Config:
        from_attributes = True


# ── RISKS ────────────────────────────────────────────────────────
class RiskOut(BaseModel):
    id: int
    state: str
    district: Optional[str] = None
    risk_score: int
    risk_level: str
    contributing_factors: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_meters: int
    radius_km: Optional[float] = None
    event_type: Optional[str] = None
    risk_type: Optional[str] = None
    active: int
    source: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AreaRiskOut(BaseModel):
    state: str
    district: Optional[str] = None
    location_name: str
    risk_score: int
    risk_level: str
    reason: str
    primary_reason: Optional[str] = None
    contributing_factors: List[str]
    affected_routes: List[str]
    recommended_action: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    weather_summary: Optional[str] = None


class RouteRiskOut(BaseModel):
    route_id: int
    route_name: str
    corridor_code: str
    status: str
    risk_score: int
    risk_level: str
    primary_hazard: str
    contributing_factors: List[str]
    recommended_action: str
    distance_km: Optional[float] = None
    estimated_hours: Optional[float] = None
    origin_hub: Optional[str] = None
    destination_hub: Optional[str] = None


# ── FIELD REPORTS ────────────────────────────────────────────────
class FieldReportOut(BaseModel):
    id: int
    report_code: str
    client_report_id: Optional[str] = None
    reporter_name: Optional[str] = None
    reporter_role: Optional[str] = None
    incident_type: str
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    state: str
    district: Optional[str] = None
    location_name: Optional[str] = None
    image_url: Optional[str] = None  # Computed from image_path
    severity: str
    status: str
    ai_analysis: Optional[Any] = None  # Parsed JSON
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── VERIFICATION ─────────────────────────────────────────────────
class VerificationOut(BaseModel):
    id: int
    report_id: int
    report: Optional[FieldReportOut] = None  # Joined
    reviewer_name: Optional[str] = None
    reviewer_role: Optional[str] = None
    status: str
    remarks: Optional[str] = None
    ai_analysis: Optional[Any] = None
    created_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class VerificationDecision(BaseModel):
    status: str  # VERIFIED or REJECTED
    remarks: Optional[str] = None


# ── NOTIFICATIONS ────────────────────────────────────────────────
class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: Optional[str] = None
    type: str
    related_entity: Optional[str] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None
    is_read: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── ALERTS ───────────────────────────────────────────────────────
class AlertOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    severity: str
    state: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    alert_type: Optional[str] = None
    active: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AlertCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    severity: str = "MEDIUM"
    state: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    alert_type: str = "ROAD"



# ── ACCESSIBILITY ────────────────────────────────────────────────
class AccessibilityOut(BaseModel):
    id: int
    state: str
    name: str
    accessibility_status: str  # OPEN, PARTIALLY AFFECTED, BLOCKED, CLOSED
    accessibility_score: int   # 0 to 100
    road_status: Optional[str] = None
    description: Optional[str] = None
    active_disruptions: List[str] = []
    active_disruptions_count: int = 0
    weather_summary: Optional[str] = None
    weather: Optional[WeatherOut] = None
    risk_level: str = "LOW"
    affected_routes: List[str] = []
    center_lat: float
    center_lng: float

    class Config:
        from_attributes = True


class AccessibilityUpdateRequest(BaseModel):
    accessibility_status: Optional[str] = None  # OPEN, PARTIALLY AFFECTED, BLOCKED, CLOSED
    accessibility_score: Optional[int] = None
    road_status: Optional[str] = None
    description: Optional[str] = None


# ── AUDIT LOGS ───────────────────────────────────────────────────
class AuditLogOut(BaseModel):
    id: int
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    affected_record: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── DASHBOARD ────────────────────────────────────────────────────
class DashboardSummary(BaseModel):
    total_shipments: int = 0
    active_shipments: int = 0
    delayed_shipments: int = 0
    total_drivers: int = 0
    active_drivers: int = 0
    available_drivers: int = 0
    total_vehicles: int = 0
    available_vehicles: int = 0
    active_vehicles: int = 0
    risk_zones: int = 0
    critical_risks: int = 0
    pending_verifications: int = 0
    verified_count: int = 0
    total_reports: int = 0
    total_field_officers: int = 0
    active_alerts: int = 0
    unread_notifications: int = 0
    accessibility_avg: float = 0.0
    accessibility_score: float = 0.0
    states_count: int = 8
    pending_transport_requests: int = 0
    assigned_area: Optional[str] = None
    area_risks: int = 0
    area_pending_verifications: int = 0
    area_reports: int = 0
    area_vehicles: int = 0
    area_shipments: int = 0
    area_alerts: int = 0
    area_accessibility: float = 0.0
    area_road_status: Optional[str] = None
    total_routes: int = 0
    active_routes: int = 0



# ── MAP ──────────────────────────────────────────────────────────
class MapOverview(BaseModel):
    vehicles: List[VehicleOut] = []
    risks: List[RiskOut] = []
    alerts: List[AlertOut] = []
    reports: List[FieldReportOut] = []
    routes: List[RouteOut] = []
    weather: List[WeatherOut] = []
    regions: List[RegionOut] = []
