"""
NEXTRA - Core Configuration
Loads environment variables and provides application settings.
"""
import os
from dotenv import load_dotenv

load_dotenv()


BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def _resolve_db_url():
    raw = os.getenv("DATABASE_URL", "sqlite:///./nextra.db")
    if raw.startswith("sqlite:///./") or raw == "sqlite:///nextra.db":
        rel = raw.replace("sqlite:///./", "").replace("sqlite:///", "")
        return f"sqlite:///{os.path.join(BASE_DIR, rel)}"
    return raw

class Settings:
    DATABASE_URL: str = _resolve_db_url()
    JWT_SECRET: str = os.getenv("JWT_SECRET", "nextra-sih-2026-voidx-secret")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRY_MINUTES: int = int(os.getenv("JWT_EXPIRY_MINUTES", "1440"))
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", os.path.join(BASE_DIR, "uploads"))
    API_BASE_URL: str = os.getenv("API_BASE_URL", "http://localhost:8000")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5500")



settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

