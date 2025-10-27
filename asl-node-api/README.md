# ASL Node API

Node + Express backend for the Sign Language platform, providing:

- JWT auth (signup, login, current user)
- User management (admin-only)
- Prediction logs with filters and pagination
- Dashboard stats summary
- Optional prediction forwarding to an external predictor service

By default, this server does not run ML inference itself. Instead, set `PREDICTOR_URL` to point to a predictor microservice. You can reuse the existing Python Flask predictor by running it on a different port (e.g., 5001) and pointing this server to it.

## Quick start (Windows PowerShell)

```powershell
cd .\asl-node-api

# Copy env
Copy-Item .env.example .env

# Edit .env as needed
# - PORT=5000 (Node API)
# - JWT_SECRET=change-me
# - PREDICTOR_URL=http://localhost:5001 (if using the Python predictor)
# - DATABASE_FILE=./data/asl.db

# Install deps
npm install

# Start server
npm start
```

Server runs at http://localhost:5000 by default.

If you want end-to-end predictions right away, run the Python predictor on another port (e.g., 5001) and set `PREDICTOR_URL` accordingly. The Node API will forward `/api/predict`, `/api/predict-batch`, and `/api/labels` to the predictor and log results.

## API overview

Auth
- POST `/api/auth/signup` { email, password }
- POST `/api/auth/login` { email, password }
- GET `/api/auth/me` (Bearer token)

Users (admin)
- GET `/api/users`
- PATCH `/api/users/:id` { active?, blocked?, role? }

Predictions
- POST `/api/predict` { image: base64 } — forwards to predictor, logs result
- POST `/api/predict-batch` { images: string[] } — forwards to predictor, logs results
- GET `/api/labels` — forwards to predictor

Logs and Stats
- GET `/api/predictions` — filters: start, end, user_id (admin), email (admin), label, min_confidence, max_confidence, success, page, page_size
- GET `/api/stats/summary` (admin)

## Frontend integration

Set your frontend `VITE_API_URL` to this Node server (e.g., `http://localhost:5000`). The existing `src/lib/aslApi.ts` contract matches these endpoints.

## Notes

- The first signed-up user becomes `admin`.
- Timestamps are stored in ISO-8601 strings.
- Database file is created automatically (SQLite + WAL enabled).
