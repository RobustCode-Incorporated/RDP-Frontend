# ROBUST DELIVERY PLATFORM (RDP) - Frontend

This repository contains the web frontend built with React + TypeScript + Vite.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Render deployment alignment with RDP-Backend

This frontend reads API base URL from `VITE_API_BASE_URL` in `src/api/axios.ts`.

Required Render env var:

- `VITE_API_BASE_URL=https://<your-rdp-backend-service>.onrender.com`

Recommended backend CORS value (on RDP-Backend):

- `APP_CORS_ALLOWED_ORIGINS=https://<your-rdp-frontend-service>.onrender.com`

This repository includes `render.yaml` for static-site deployment on Render.
