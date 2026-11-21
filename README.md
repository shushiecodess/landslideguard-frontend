# LandslideGuard AI Frontend

The Next.js dashboard, Leaflet risk map, AI Insights, and phone Voice Alerts run on this service.

Use Node.js 24. Run `npm ci` and `npm run dev` to open the frontend at `http://127.0.0.1:3000`. Start the backend separately on port 8000. Run `npm test` for the frontend tests.

The frontend serves the four recorded alert files and forwards `/api/*` requests to the backend. Set `API_BACKEND_URL` to the API origin at build time. See [Deploy on Render](RENDER.md).
