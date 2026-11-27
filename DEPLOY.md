# Deploying the CampusSlot demo

Owner: Batuhan (System Architect). Setup: 5.11 Scenario A, drawn in the 5.7 deployment diagram. Decision: H24 (free instances).

```
Browser ──HTTPS──> Vercel (frontend/dist)
   └─────HTTPS──> Render web service (backend, Express API + System Scheduler) ──TLS──> Neon (PostgreSQL)
```

Do the steps in this order. Every secret goes only into the provider dashboards or a private message, **never into the repository**.

## 0. What you need

- Accounts on Neon, Render and Vercel (log in with GitHub).
- Node.js 22 or newer and this repository on your computer (`backend/node_modules` installed with `npm ci`).
- Two secrets, created once on your computer:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(9).toString('base64url'))"  # SEED_PASSWORD for the demo users
```

Keep `SEED_PASSWORD` for the team's private chat: the presenters need it to log in. Do **not** use the default `CampusSlot123!`, which is public on GitHub (H27).

## 1. Database: Neon

1. New project, name `campusslot`. Region: the one closest to Istanbul that is offered (Frankfurt, if it is in the list). PostgreSQL 16 or newer.
2. Copy the connection string of the **direct** connection (the host name without `-pooler`). It ends with `?sslmode=require`. This is `DATABASE_URL`.
3. Only fictional seed users go into this database (SEC-A3, 5.10.2: no real personal data abroad).

## 2. Tables and demo data (from your computer, once)

In PowerShell, in `backend/`. The variables set here win over `backend/.env`, because `dotenv` does not overwrite variables that already exist.

```powershell
$env:DATABASE_URL = "<Neon connection string>"
$env:SEED_PASSWORD = "<secret seed password>"
npm run prisma:deploy     # creates the tables and the R3 overlap constraint
npm run db:seed           # demo users, 13 resources, reservations in all 7 statuses (deletes existing rows)
Remove-Item Env:DATABASE_URL, Env:SEED_PASSWORD   # back to your local database
```

Run `db:seed` again only when you want to reset the demo data, for example on the morning of the presentation.

## 3. Backend: Render web service

New → Web Service → choose the repository `MertTomak/SWE307-Term`. If Render does not list it (the repository belongs to Mert), choose **Public Git Repository** and paste `https://github.com/MertTomak/SWE307-Term`; then a new push is deployed with **Manual Deploy → Deploy latest commit** instead of automatically.

| Setting | Value |
|---|---|
| Name | `campusslot-api` (becomes `https://campusslot-api.onrender.com`; Render adds a suffix if the name is taken) |
| Region | Frankfurt, if offered (same region as the database) |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm ci --include=dev && npx prisma generate && npx prisma migrate deploy` |
| Start Command | `npm start` |
| Instance type | Free |
| Health Check Path | `/api/v1/health` |

Environment variables:

| Key | Value | Why |
|---|---|---|
| `NODE_VERSION` | `22` | Prisma 7.10.1 needs Node.js 22 (H37) |
| `NODE_ENV` | `production` | |
| `DATABASE_URL` | Neon connection string | |
| `JWT_SECRET` | the 64 hex characters from step 0 | signs the login tokens (5.8.4.2) |
| `CORS_ORIGIN` | for now `http://localhost:5173`; set to the Vercel URL in step 5 | only our frontend may call the API |
| `TRUST_PROXY` | `1` | Render runs one proxy in front; without it the rate limits see one address for everybody (H49) |
| `SCHEDULER_ENABLED` | `true` | J1–J4 every 60 seconds |
| `REPORT_OPENING_HOURS_PER_DAY` | `12` | API-A8 |

Do not set `PORT`: Render sets it and the API reads it. `--include=dev` is needed because the start command uses `tsx`, which is a development dependency.

Check: `https://<your-render-name>.onrender.com/api/v1/health` answers `{"status":"ok", ...}`.

## 4. Frontend: Vercel

Add New → Project → import `MertTomak/SWE307-Term`.

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Environment variable `VITE_API_URL` | `https://<your-render-name>.onrender.com/api/v1` |
| Environment variable `VITE_USE_MOCKS` | `false` |

`frontend/vercel.json` sends every path to `index.html`, so reloading a page such as `/my-reservations` does not give a 404.

If Vercel cannot import the repository, deploy from your computer instead: in `frontend/` run `npx vercel`, answer the questions with the values above, add the two variables with `npx vercel env add`, then `npx vercel --prod`.

## 5. Connect the two

On Render, set `CORS_ORIGIN` to the Vercel production URL exactly, for example `https://campusslot.vercel.app` (with `https://`, without a slash at the end), and save; Render redeploys.

## 6. Smoke test (5 minutes)

1. Open the Vercel URL on a phone. Log in as `student1@campusslot.test` with the secret seed password.
2. Reload the page: you stay logged in, no 404.
3. Check in with a door code of a room that has a reservation starting in the next 10 minutes (door codes are in the admin view, `100001`–`100013` after the seed).
4. Log in as `admin@campusslot.test`: admin pages open, campus pages do not.
5. Open `/api/v1/health` on the Render URL.

## 7. Demo day (H24)

1. Open the app 10 minutes before the presentation; the first start after sleeping takes about one minute.
2. While waiting, reload the app or open `/api/v1/health` at least every 10 minutes.
3. Keep the backup ready: the app running locally (`README.md`) and a recorded video (Görkem).

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Browser console: "blocked by CORS policy" | `CORS_ORIGIN` on Render is not exactly the Vercel URL |
| 404 after reloading a page on Vercel | Root Directory is not `frontend`, so `vercel.json` was not used |
| Render log: `tsx: not found` | Build Command without `--include=dev` |
| Render log: `JWT_SECRET must be at least 32 characters` | `JWT_SECRET` missing or too short |
| Render log: cannot reach the database | `DATABASE_URL` is the `-pooler` host or misses `sslmode=require` |
| Everybody gets `429 RATE_LIMITED` at once | `TRUST_PROXY` is not `1` |
| First request takes about a minute | The free instance was asleep (expected, 5.7 Deployment) |
