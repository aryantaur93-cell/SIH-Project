"""
NEXTRA - Risks Router
Risk intelligence queries, area risk breakdown, route risk evaluation, and recalculation trigger.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user, require_role
from app.models.risk import RiskEvent
from app.models.route import Route
from app.models.user import User
from app.schemas.schemas import RiskOut, AreaRiskOut, RouteRiskOut
from app.services.risk_engine import (
    calculate_area_risk,
    calculate_route_risk,
    get_all_area_risks,
    recalculate_all_risks,
    NER_STATES,
)
from typing import List, Optional

router = APIRouter(prefix="/api/risks", tags=["Risk Intelligence"])


@router.get("", response_model=List[RiskOut])
def get_risks(
    state: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all risk events, optionally filtered by state."""
    query = db.query(RiskEvent)
    if active_only:
        query = query.filter(RiskEvent.active == 1)
    if state:
        query = query.filter(RiskEvent.state == state)
    risks = query.order_by(RiskEvent.risk_score.desc()).all()
    return [RiskOut.model_validate(r) for r in risks]


@router.get("/areas", response_model=List[AreaRiskOut])
def get_area_risks(
    state: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get live calculated risk for all 8 Northeast states or a specific state."""
    if state:
        return [calculate_area_risk(db, state)]
    return get_all_area_risks(db)


@router.get("/areas/{state_or_district}", response_model=AreaRiskOut)
def get_single_area_risk(
    state_or_district: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get live calculated risk for a specific state or district."""
    for s in NER_STATES:
        if s.lower() == state_or_district.lower():
            return calculate_area_risk(db, s)
    return calculate_area_risk(db, "Meghalaya", district=state_or_district)


@router.get("/routes", response_model=List[RouteRiskOut])
def get_all_route_risks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get live calculated risk scores for all arterial highways."""
    routes = db.query(Route).all()
    return [calculate_route_risk(db, r.id) for r in routes]


@router.get("/routes/{route_id}", response_model=RouteRiskOut)
def get_single_route_risk(
    route_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get live calculated risk for a specific route."""
    return calculate_route_risk(db, route_id)


@router.post("/recalculate")
def recalculate_risks(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Recalculate risk scores for all regions (Admin only)."""
    results = recalculate_all_risks(db)
    return {"message": "Risk recalculation complete", "results": results}

