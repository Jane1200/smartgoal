# Deploy Backend to Vercel

## 1. Deploy from the `server` folder

- In Vercel: **New Project** → import your repo.
- Set **Root Directory** to `server` (so `api/` and `package.json` are at the project root).
- Vercel will detect the serverless app and use `api/index.js` for all requests.

## 2. Environment variables

In the Vercel project **Settings → Environment Variables**, add at least:

| Variable        | Description |
|----------------|-------------|
| `MONGO_URI`    | MongoDB connection string (e.g. Atlas URI). |
| `JWT_SECRET`   | Secret for signing JWTs. |
| `CORS_ORIGIN`  | Comma-separated frontend URLs (e.g. `https://your-app.vercel.app`). |
| `CRON_SECRET`  | Optional; secret for the monthly-report cron (Vercel Cron sends it in `Authorization: Bearer <CRON_SECRET>`). |

Add any others you use locally (e.g. `CLIENT_URL`, email, Firebase, Razorpay) for production.

## 3. After deploy

- API base URL: `https://<your-project>.vercel.app`
- Health: `GET https://<your-project>.vercel.app/api/health`
- Point your frontend `VITE_API_URL` (or equivalent) to this URL.

## 4. Cron (monthly report)

The monthly report job runs via Vercel Cron at **09:00 on the 1st of each month** (see `vercel.json` → `crons`).  
Set `CRON_SECRET` in Vercel so the `/api/cron/monthly-report` endpoint only accepts Vercel’s cron requests.

## 5. File uploads

Vercel serverless has no persistent filesystem. Routes that write to `uploads/` (avatars, statements, marketplace images, etc.) will not persist across invocations. For production, use a storage service (e.g. Vercel Blob, S3) and update the relevant routes to upload there and serve via URLs.
