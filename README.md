# NEXTRA SIH Project

The original frontend is a static prototype with LocalStorage seed data, simulated GPS jitter, hard-coded weather observations, and illustrative polylines. A real backend is now included in `Backend/`.

## Run the full project

1. Start the API:
   ```bash
   cd Backend
   cp .env.example .env
   npm install
   npm run dev
   ```
2. Serve `Frontend/` from a local web server (do not open `index.html` with `file://`):
   ```bash
   cd Frontend
   npx serve . -l 5500
   ```
3. Open `http://localhost:5500`.

The backend provides persistent SQLite records, JWT login, role authorization, field incident submission, fleet and shipment endpoints, current/forecast weather from Open-Meteo, and road routes from OSRM/OpenStreetMap. The frontend retains its existing demo fallback when the API is unavailable; `Frontend/js/live-data.js` replaces the weather overlay with live regional observations when the API is running.

## Important frontend note

The existing UI contains two legacy client-side controllers (`script.js` and `js/*`) and LocalStorage APIs. For production authentication and mutations, call the REST endpoints from a server-aware client using the JWT returned by `POST /api/auth/login`; do not ship the demo credentials or use LocalStorage as an authority.
