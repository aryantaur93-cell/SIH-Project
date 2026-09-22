"""
NEXTRA - Dashboard Router
Provides role-aware dashboard summary from live database.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.schemas import DashboardSummary
from app.services.dashboard_service import get_dashboard_summary

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get role-specific dashboard KPIs computed from live database."""
    return get_dashboard_summary(db, user_id=current_user.id, role=current_user.role)
