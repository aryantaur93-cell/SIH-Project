"""
NEXTRA - Notification Service
Creates targeted notifications for users by role, area, or specific user.
Strictly routes notifications without notifying unrelated users.
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.notification import Notification
from app.models.user import User
from app.models.driver import Driver
from app.models.vehicle import Vehicle
from app.models.shipment import Shipment


def notify_user(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notif_type: str = "SYSTEM",
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None
) -> Notification:
    """Send a notification to a specific user."""
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notif_type.upper(),
        related_entity_type=entity_type,
        related_entity_id=entity_id
    )
    db.add(notif)
    return notif


def notify_role(
    db: Session,
    role: str,
    title: str,
    message: str,
    notif_type: str = "SYSTEM",
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None
) -> List[Notification]:
    """Send a notification to all active users with a specific role."""
    users = db.query(User).filter(User.role == role, User.status == "ACTIVE").all()
    notifications = []
    for user in users:
        notif = Notification(
            user_id=user.id,
            title=title,
            message=message,
            type=notif_type.upper(),
            related_entity_type=entity_type,
            related_entity_id=entity_id
        )
        db.add(notif)
        notifications.append(notif)
    return notifications


def notify_admins(
    db: Session,
    title: str,
    message: str,
    notif_type: str = "SYSTEM",
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None
) -> List[Notification]:
    """Send notification to all admin users."""
    return notify_role(db, "admin", title, message, notif_type, entity_type, entity_id)


def notify_area_officers(
    db: Session,
    state: str,
    title: str,
    message: str,
    notif_type: str = "REPORT",
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None
) -> List[Notification]:
    """Send notification to all field officers assigned to a specific state (case-insensitive) or ALL."""
    clean_state = (state or "").strip().lower()
    officers = db.query(User).filter(
        User.role == "field_officer",
        User.status == "ACTIVE"
    ).all()

    notifications = []
    for officer in officers:
        assigned = (officer.assigned_state or "").strip().lower()
        if assigned == "all" or assigned == clean_state or (clean_state and clean_state in assigned):
            notif = Notification(
                user_id=officer.id,
                title=title,
                message=message,
                type=notif_type.upper(),
                related_entity_type=entity_type,
                related_entity_id=entity_id
            )
            db.add(notif)
            notifications.append(notif)
    return notifications


def notify_shipment_delay(
    db: Session,
    shipment_id: int,
    eta_text: Optional[str] = None,
    reason: Optional[str] = None
) -> List[Notification]:
    """
    Notify relevant parties when a shipment is delayed:
    - Logistics team notified
    - Driver assigned to the shipment notified
    - Unrelated drivers and other roles are NOT notified.
    """
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        return []

    notifications = []
    eta_info = f" New ETA: {eta_text}." if eta_text else ""
    reason_info = f" Cause: {reason}." if reason else ""

    # 1. Notify Logistics team
    logistics_users = db.query(User).filter(User.role == "logistics", User.status == "ACTIVE").all()
    for log_user in logistics_users:
        notif = Notification(
            user_id=log_user.id,
            title=f"Shipment Delay: {shipment.shipment_code}",
            message=f"Consignment {shipment.shipment_code} ({shipment.cargo_type}) on corridor '{shipment.corridor or 'NER'}' is DELAYED.{eta_info}{reason_info}",
            type="SHIPMENT",
            related_entity_type="shipment",
            related_entity_id=shipment.id
        )
        db.add(notif)
        notifications.append(notif)

    # 2. Notify assigned Driver specifically
    if shipment.driver_id:
        driver = db.query(Driver).filter(Driver.id == shipment.driver_id).first()
        if driver and driver.user_id:
            notif = Notification(
                user_id=driver.user_id,
                title=f"Consignment Schedule Alert: {shipment.shipment_code}",
                message=f"Your assigned shipment {shipment.shipment_code} has been marked DELAYED.{eta_info} Contact dispatch desk if assistance is needed.",
                type="SHIPMENT",
                related_entity_type="shipment",
                related_entity_id=shipment.id
            )
            db.add(notif)
            notifications.append(notif)

    return notifications


def notify_critical_risk(
    db: Session,
    state: str,
    location: str,
    risk_title: str,
    description: str,
    risk_id: Optional[int] = None
) -> List[Notification]:
    """
    Notify users of a critical risk event:
    - Admin notified
    - Relevant Field Officers in that state notified
    - Relevant Logistics coordinators notified
    - Affected Drivers in that state notified
    - Unrelated users in other states are strictly NOT notified.
    """
    clean_state = (state or "").strip().lower()
    notifications = []
    notified_user_ids = set()

    # 1. Notify Admin (global oversight)
    admins = db.query(User).filter(User.role == "admin", User.status == "ACTIVE").all()
    for admin in admins:
        notified_user_ids.add(admin.id)
        notifications.append(Notification(
            user_id=admin.id,
            title=f"CRITICAL RISK: {risk_title} ({state})",
            message=f"Severe threat detected at {location}, {state}: {description}. Regional protocols activated.",
            type="RISK",
            related_entity_type="risk",
            related_entity_id=risk_id
        ))

    # 2. Notify relevant Field Officers (assigned to state or ALL)
    fos = db.query(User).filter(User.role == "field_officer", User.status == "ACTIVE").all()
    for fo in fos:
        fo_state = (fo.assigned_state or "").strip().lower()
        if (fo_state == "all" or fo_state == clean_state or (clean_state and clean_state in fo_state)) and fo.id not in notified_user_ids:
            notified_user_ids.add(fo.id)
            notifications.append(Notification(
                user_id=fo.id,
                title=f"URGENT SECTOR RISK: {risk_title}",
                message=f"Critical hazard in your sector ({location}, {state}): {description}. Ground response required.",
                type="RISK",
                related_entity_type="risk",
                related_entity_id=risk_id
            ))

    # 3. Notify relevant Logistics (coordinating this corridor or ALL)
    logistics = db.query(User).filter(User.role == "logistics", User.status == "ACTIVE").all()
    for log_user in logistics:
        log_state = (log_user.assigned_state or "").strip().lower()
        if (log_state == "all" or log_state == clean_state or (clean_state and clean_state in log_state)) and log_user.id not in notified_user_ids:
            notified_user_ids.add(log_user.id)
            notifications.append(Notification(
                user_id=log_user.id,
                title=f"HAZARD DISPATCH ADVISORY: {state}",
                message=f"Critical risk at {location} ({risk_title}): Reroute shipments avoiding this corridor immediately.",
                type="RISK",
                related_entity_type="risk",
                related_entity_id=risk_id
            ))

    # 4. Notify affected Drivers (assigned to state or whose vehicle is currently in state)
    drivers = db.query(Driver).all()
    for d in drivers:
        if not d.user_id or d.user_id in notified_user_ids:
            continue
        d_state = (d.assigned_state or "").strip().lower()
        is_affected = (d_state == clean_state or (clean_state and clean_state in d_state))

        # Also check current vehicle state if driver assigned to vehicle
        if not is_affected:
            veh = db.query(Vehicle).filter(Vehicle.driver_id == d.id).first()
            if veh and veh.state and veh.state.strip().lower() == clean_state:
                is_affected = True

        # Also check if driver has active shipment traversing the affected state
        if not is_affected:
            active_shp = db.query(Shipment).filter(
                Shipment.driver_id == d.id,
                Shipment.status.in_(["ASSIGNED", "IN_TRANSIT", "DELAYED", "AT_RISK"])
            ).first()
            if active_shp:
                if (clean_state in (active_shp.pickup_location or "").lower() or
                    clean_state in (active_shp.destination or "").lower() or
                    clean_state in (active_shp.corridor or "").lower()):
                    is_affected = True

        if is_affected:
            notified_user_ids.add(d.user_id)
            notifications.append(Notification(
                user_id=d.user_id,
                title=f"🚨 CAB SAFETY ALERT: {risk_title}",
                message=f"DANGER on highway near {location} ({state}): {description}. Exercise extreme caution or stop at nearest staging hub.",
                type="RISK",
                related_entity_type="risk",
                related_entity_id=risk_id
            ))

    for n in notifications:
        db.add(n)

    return notifications
