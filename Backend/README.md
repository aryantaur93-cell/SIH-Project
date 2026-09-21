# NEXTRA Backend

Production-ready Express API for the NEXTRA Northeast India logistics dashboard.

## Quick start

```bash
cd Backend
cp .env.example .env
npm install
npm run dev
```

The API runs at `http://localhost:4000`. The database is created automatically at `Backend/data/nextra.sqlite` and seeded with the operational records used by the frontend.

## Services

- JWT authentication with bcrypt password hashes and role-based authorization.
- SQLite persistence for users, vehicles, shipments, incidents, alerts, and audit events.
- Live weather and forecast data through Open-Meteo (no API key required).
- Geocoding and road routing through OpenStreetMap Nominatim and OSRM, with safe timeouts and attribution headers.
- CORS, Helmet, rate limiting, validation, structured health checks, and graceful shutdown.

## API

`POST /api/auth/login`, `GET /api/dashboard`, `GET /api/weather?lat=...&lon=...`, `GET /api/weather/region`, `GET /api/map/route?fromLat=...&fromLon=...&toLat=...&toLon=...`, `GET/POST /api/incidents`, `GET/PATCH /api/fleet`, `GET /api/shipments`, `GET /api/health`.

Demo accounts are seeded from `DEMO_PASSWORD` (default: `change-me-demo`):
`admin@ner.gov.in`, `field@ner.gov.in`, `logistics@ner.gov.in`, and `driver@ner.gov.in`.

Do not use the demo password in production. Set a strong `JWT_SECRET`, change `DEMO_PASSWORD`, and configure `CORS_ORIGIN`.
