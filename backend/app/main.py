"""
NEXTRA - FastAPI Application
Main entry point. Mounts all routers, CORS, static files, and frontend serving.
"""
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.database.database import create_tables
from app.core.config import settings

# Import routers
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.dashboard import router as dashboard_router
from app.routers.vehicles import router as vehicles_router
from app.routers.drivers import router as drivers_router
from app.routers.shipments import router as shipments_router
from app.routers.transport_requests import router as transport_requests_router
from app.routers.reports import router as reports_router
from app.routers.verification import router as verification_router
from app.routers.risks import router as risks_router
from app.routers.notifications import router as notifications_router
from app.routers.misc import (
    alerts_router, weather_router, routes_router,
    regions_router, audit_router, map_router, accessibility_router
)

app = FastAPI(
    title="NEXTRA API",
    description="NE Region X-Intelligent Transport & Routing Assistant — Backend API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow frontend to connect (support localhost, 127.0.0.1, Live Server, and all ports)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables on startup
@app.on_event("startup")
def on_startup():
    create_tables()

# Ensure upload directory exists and mount it
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# Mount all API routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(dashboard_router)
app.include_router(vehicles_router)
app.include_router(drivers_router)
app.include_router(shipments_router)
app.include_router(transport_requests_router)
app.include_router(reports_router)
app.include_router(verification_router)
app.include_router(risks_router)
app.include_router(notifications_router)
app.include_router(alerts_router)
app.include_router(weather_router)
app.include_router(accessibility_router)
app.include_router(routes_router)
app.include_router(regions_router)
app.include_router(audit_router)
app.include_router(map_router)

# Serve frontend static files
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "frontend")
FRONTEND_ASSETS = os.path.join(FRONTEND_DIR, "assets")
FRONTEND_CSS = os.path.join(FRONTEND_DIR, "css")
FRONTEND_JS = os.path.join(FRONTEND_DIR, "js")
FRONTEND_DATA = os.path.join(FRONTEND_DIR, "data")
FRONTEND_PAGES = os.path.join(FRONTEND_DIR, "pages")
FRONTEND_COMPONENTS = os.path.join(FRONTEND_DIR, "components")

# Mount frontend static directories if they exist
for mount_path, directory in [
    ("/assets", FRONTEND_ASSETS),
    ("/css", FRONTEND_CSS),
    ("/js", FRONTEND_JS),
    ("/data", FRONTEND_DATA),
    ("/pages", FRONTEND_PAGES),
    ("/components", FRONTEND_COMPONENTS),
]:
    if os.path.isdir(directory):
        app.mount(mount_path, StaticFiles(directory=directory), name=mount_path.strip("/"))


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "project": "NEXTRA",
        "full_name": "NE Region X-Intelligent Transport & Routing Assistant",
        "team": "VoidX",
        "version": "2.0.0"
    }


# Serve frontend HTML files
@app.get("/")
@app.get("/index.html")
async def serve_index():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path, media_type="text/html")
    return {"error": "Frontend not found. Place index.html in frontend directory."}


@app.get("/login.html")
async def serve_login():
    path = os.path.join(FRONTEND_DIR, "login.html")
    if os.path.exists(path):
        return FileResponse(path, media_type="text/html")
    return {"error": "login.html not found"}


@app.get("/signup.html")
async def serve_signup():
    path = os.path.join(FRONTEND_DIR, "signup.html")
    if os.path.exists(path):
        return FileResponse(path, media_type="text/html")
    return {"error": "signup.html not found"}


@app.get("/forgot-password.html")
async def serve_forgot_password():
    path = os.path.join(FRONTEND_DIR, "forgot-password.html")
    if os.path.exists(path):
        return FileResponse(path, media_type="text/html")
    return {"error": "forgot-password.html not found"}


@app.get("/style.css")
async def serve_style():
    path = os.path.join(FRONTEND_DIR, "style.css")
    if os.path.exists(path):
        return FileResponse(path, media_type="text/css")
    return {"error": "style.css not found"}

