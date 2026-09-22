"""
NEXTRA - Auth Router
Login, signup, and session management with JWT.
"""
import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user
from app.core.security import verify_password, hash_password, create_access_token
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.schemas import (
    LoginRequest, SignupRequest, TokenResponse, UserOut,
    ForgotPasswordVerifyRequest, ForgotPasswordVerifyResponse,
    ForgotPasswordResetRequest, ForgotPasswordResetResponse
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Contact administrator.",
        )

    token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})

    # Audit log
    db.add(AuditLog(
        user_id=user.id, user_name=user.name, user_role=user.role,
        action="USER_LOGIN", affected_record=user.email
    ))
    db.commit()

    return TokenResponse(
        access_token=token,
        user=UserOut.model_validate(user)
    )


@router.post("/signup", response_model=TokenResponse)
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """Register a new user account (Driver or Logistics only)."""
    # Enforce role restrictions on public registration
    normalized_role = (request.role or "driver").lower().strip().replace(" ", "_").replace("-", "_")
    if normalized_role in ["admin", "administrator", "field_officer", "fieldofficer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public registration for Administrator and Field Officer roles is restricted. Field Officers must be created by an Administrator.",
        )
    if normalized_role not in ["driver", "logistics"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Public registration only supports 'driver' or 'logistics'.",
        )
    requested_role = normalized_role

    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        name=request.name,
        email=request.email,
        hashed_password=hash_password(request.password),
        role=requested_role,
        phone=request.phone,
        assigned_state=request.assigned_state or "ALL",
        assigned_district=request.assigned_district or "ALL",
        status="ACTIVE"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})

    # Audit log
    db.add(AuditLog(
        user_id=user.id, user_name=user.name, user_role=user.role,
        action="USER_SIGNUP", affected_record=user.email, new_value="ACTIVE"
    ))
    db.commit()

    return TokenResponse(
        access_token=token,
        user=UserOut.model_validate(user)
    )


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return UserOut.model_validate(current_user)


@router.post("/forgot-password/verify", response_model=ForgotPasswordVerifyResponse)
def verify_forgot_password_email(request: ForgotPasswordVerifyRequest, db: Session = Depends(get_db)):
    """Verify if an email exists for password reset in SIH prototype."""
    email_clean = (request.email or "").strip().lower()
    if not email_clean or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email_clean):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid email address.",
        )

    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        return ForgotPasswordVerifyResponse(
            status="error",
            exists=False,
            message="No NEXTRA account found with that email address. Please check your email or sign up."
        )

    return ForgotPasswordVerifyResponse(
        status="ok",
        exists=True,
        name=user.name,
        email=user.email,
        message="Account verified. You may now reset your password."
    )


@router.post("/forgot-password/reset", response_model=ForgotPasswordResetResponse)
def reset_password(request: ForgotPasswordResetRequest, db: Session = Depends(get_db)):
    """Safely reset password in database with bcrypt hashing."""
    email_clean = (request.email or "").strip().lower()
    if not email_clean or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email_clean):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid email address.",
        )

    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No NEXTRA account found with that email address.",
        )

    pw = request.new_password or ""
    if len(pw) < 8 or not re.search(r"[A-Z]", pw) or not re.search(r"[a-z]", pw) or not re.search(r"[0-9]", pw):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long and contain uppercase, lowercase, and a number.",
        )

    # Securely hash password before storing in database
    user.hashed_password = hash_password(pw)
    db.add(AuditLog(
        user_id=user.id, user_name=user.name, user_role=user.role,
        action="PASSWORD_RESET", affected_record=user.email
    ))
    db.commit()

    return ForgotPasswordResetResponse(
        status="ok",
        message="Password updated successfully. You can now sign in with your new password."
    )
