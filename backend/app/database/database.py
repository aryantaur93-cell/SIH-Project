"""
NEXTRA - Database Connection
SQLAlchemy engine, session factory, and declarative base.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# SQLite requires check_same_thread=False for FastAPI's async usage
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def create_tables():
    """Create all database tables from SQLAlchemy models."""
    # Import all models so they register with Base.metadata
    import app.models.user  # noqa: F401
    import app.models.field_officer  # noqa: F401
    import app.models.region  # noqa: F401
    import app.models.driver  # noqa: F401
    import app.models.vehicle  # noqa: F401
    import app.models.shipment  # noqa: F401
    import app.models.route  # noqa: F401
    import app.models.risk  # noqa: F401
    import app.models.field_report  # noqa: F401
    import app.models.verification  # noqa: F401
    import app.models.notification  # noqa: F401
    import app.models.alert  # noqa: F401
    import app.models.weather  # noqa: F401
    import app.models.audit_log  # noqa: F401
    import app.models.transport_request  # noqa: F401

    Base.metadata.create_all(bind=engine)
