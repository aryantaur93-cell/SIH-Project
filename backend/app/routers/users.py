"""
NEXTRA - Users Router
User management, field officer creation, and role assignment.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user, require_role
from app.core.security import hash_password
from app.models.user import User
from app.models.field_officer import FieldOfficerProfile
from app.models.region import Region
from app.models.audit_log import AuditLog
from app.schemas.schemas import UserOut, UserUpdateRequest, CreateFieldOfficerRequest
from typing import List

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("", response_model=List[UserOut])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all users. Admin sees all, others see limited."""
    if current_user.role == "admin":
        users = db.query(User).order_by(User.id).all()
    else:
        users = db.query(User).filter(User.status == "ACTIVE").order_by(User.id).all()
    return [UserOut.model_validate(u) for u in users]


@router.get("/field-officers", response_model=List[UserOut])
def get_field_officers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all field officers."""
    officers = db.query(User).filter(User.role == "field_officer").order_by(User.name).all()
    return [UserOut.model_validate(o) for o in officers]


@router.post("/field-officers", response_model=UserOut)
def create_field_officer(
    request: CreateFieldOfficerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Create a new field officer account (Admin only)."""
    # 1. Validation
    if not request.name or not request.name.strip():
        raise HTTPException(status_code=400, detail="Full name is required.")
    if not request.email or "@" not in request.email:
        raise HTTPException(status_code=400, detail="Valid email address is required.")
    if not request.password or len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    if not request.assigned_state or not request.assigned_state.strip():
        raise HTTPException(status_code=400, detail="Assigned state is required.")

    clean_email = request.email.strip().lower()
    existing = db.query(User).filter(User.email.ilike(clean_email)).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Email '{clean_email}' is already registered.")

    # 2. Officer ID Handling
    officer_id = request.officer_id.strip() if request.officer_id and request.officer_id.strip() else None
    if not officer_id:
        count = db.query(User).filter(User.role == "field_officer").count()
        officer_id = f"FO-{count + 1:03d}"
    else:
        existing_oid = db.query(User).filter(User.officer_id == officer_id).first()
        if existing_oid:
            raise HTTPException(status_code=409, detail=f"Officer ID '{officer_id}' is already assigned.")

    status_val = (request.status or "ACTIVE").upper()
    if status_val not in ["ACTIVE", "INACTIVE", "DISABLED", "STANDBY"]:
        status_val = "ACTIVE"

    # 3. Create User
    user = User(
        name=request.name.strip(),
        email=clean_email,
        hashed_password=hash_password(request.password),
        role="field_officer",
        phone=request.phone.strip() if request.phone else None,
        assigned_state=request.assigned_state.strip(),
        assigned_district=request.assigned_district.strip() if request.assigned_district else "ALL",
        officer_id=officer_id,
        status=status_val
    )
    db.add(user)
    db.flush()

    # 4. Link dedicated FieldOfficerProfile
    reg = db.query(Region).filter(Region.state.ilike(request.assigned_state.strip())).first()
    fo_profile = FieldOfficerProfile(
        user_id=user.id,
        officer_badge=officer_id,
        assigned_state=user.assigned_state,
        assigned_district=user.assigned_district or "ALL",
        region_id=reg.id if reg else None,
        station_name=f"{user.assigned_state} Sector Ground Base",
        contact_number=user.phone,
        rank="Regional Field Officer",
    )
    db.add(fo_profile)

    # 5. Immutable Audit Log
    db.add(AuditLog(
        user_id=current_user.id,
        user_name=current_user.name,
        user_role=current_user.role,
        action="FIELD_OFFICER_CREATED",
        affected_record=f"{user.name} ({user.email})",
        new_value=f"Officer ID: {officer_id}, Sector: {user.assigned_state} ({user.assigned_district}), Status: {status_val}"
    ))

    # 6. Welcome Notification
    from app.services.notification_service import notify_user
    notify_user(
        db,
        user.id,
        "Welcome to Field Officer Command",
        f"Welcome Officer {user.name} ({officer_id}). Your deployment sector is {user.assigned_state} ({user.assigned_district}). Access your ground truth inspection portal anytime.",
        notif_type="SYSTEM"
    )

    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    request: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Update a user's role, status, or area assignment (Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    old_values = []
    if request.name is not None:
        old_values.append(f"name: {user.name}")
        user.name = request.name
    if request.role is not None:
        old_values.append(f"role: {user.role}")
        user.role = request.role
    if request.phone is not None:
        user.phone = request.phone
    if request.assigned_state is not None:
        old_values.append(f"state: {user.assigned_state}")
        user.assigned_state = request.assigned_state
    if request.assigned_district is not None:
        user.assigned_district = request.assigned_district
    if request.status is not None:
        old_values.append(f"status: {user.status}")
        user.status = request.status

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id, user_name=current_user.name, user_role=current_user.role,
        action="USER_UPDATED", affected_record=f"{user.name} (ID: {user.id})",
        old_value=", ".join(old_values) if old_values else None,
        new_value=str(request.model_dump(exclude_none=True))
    ))
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)
