# CampusSlot

CampusSlot (Campus Resource Reservation and QR Check-in System) is a web application for reserving classrooms, laboratories and equipment on campus. Users check in by scanning the QR code on the resource door, and unused reservations are released automatically as no-shows.

Course project for SWE307 Software Systems Analysis and Design.

## Folder structure

- `/frontend` - React + Vite + TypeScript web client
- `/backend` - Node.js + Express + TypeScript API (PostgreSQL + Prisma)
- `/docs` - report text (`/docs/report`) and diagrams (`/docs/diagrams`)
- `HANDOFFS.md` - who is waiting for what from whom

The API contract between frontend and backend is `docs/report/5.8_api-design_Batuhan.md`.

## Requirements

- Node.js 22 or newer (`node --version`). The backend needs it: Prisma 7.10.1 pulls in a package that declares Node.js >= 22 (H37). The frontend alone also runs on 20.19.
- PostgreSQL 14 or newer for the backend

## Frontend

```bash
cd frontend
npm install
cp .env.example .env.local    # Windows PowerShell: Copy-Item .env.example .env.local
npm run dev                   # http://localhost:5173
```

`VITE_API_URL` in `.env.local` is the API base URL including `/api/v1` (default `http://localhost:3000/api/v1`).

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type check and production build into `dist/` |
| `npm run lint` | Lint with oxlint |
| `npm run preview` | Serve the production build locally |

## Backend

```bash
cd backend
npm install
cp .env.example .env          # then set DATABASE_URL and JWT_SECRET
npm run prisma:generate       # generates the Prisma Client
npm run prisma:deploy         # creates the tables and the R3 overlap constraint
npm run db:seed               # demo data (see below)
npm run dev                   # API on http://localhost:3000/api/v1 with auto-reload
```

`npm start` runs the API without auto-reload (hosting). The port is `PORT` in `.env`, default `3000`, which is what the frontend expects. `GET /api/v1/health` answers `{ "status": "ok" }`. The System Scheduler (no-shows, penalties, completion, reminders) runs inside the API process every 60 seconds; `SCHEDULER_ENABLED=false` turns it off.

**Without Docker or a PostgreSQL install** (development only): `npm run db:local` starts a PostgreSQL (PGlite, compiled to WebAssembly) on port 5433 and prints the `DATABASE_URL` to use. Keep it running in a second terminal and set `DB_POOL_MAX=1` in `.env`. CI, the demo and production use a real PostgreSQL server.

**Demo accounts** (`npm run db:seed`): `admin@campusslot.test` (Resource Admin), `staff1@` and `staff2@campusslot.test` (Academic Staff), `student1@` to `student4@campusslot.test` (Student). All use the password in `SEED_PASSWORD` (default `CampusSlot123!`; the demo database must be seeded with a secret one). The names are fictional. 13 resources (5 rooms, 4 labs, 4 pieces of equipment) with door codes `100001` to `100013`, and reservations in all 7 statuses. The seed deletes all existing rows first.

**Tests**: `npm test` (details and the test database in `backend/tests/README.md`). For a local test database: `npm run db:local -- --memory --database campusslot_test --port 5434`, then `DATABASE_URL_TEST="postgresql://postgres:postgres@127.0.0.1:5434/campusslot_test?sslmode=disable"` and `DB_POOL_MAX=1`.

| Command | What it does |
|---|---|
| `npm run dev` / `npm start` | Start the API (with / without auto-reload) |
| `npm test` / `npm run test:full` | Run the backend tests (skip missing parts / strict) |
| `npm run typecheck` | TypeScript type check |
| `npm run db:seed` | Reset the demo data |
| `npm run db:reset` | Drop the database, re-apply all migrations and re-seed |
| `npm run db:local` | Local PostgreSQL without Docker (development only) |
| `npx prisma studio` | Browse the database in the browser |

## How we work

1. **Pushing directly to `main` is allowed** (team decision, 23 Nov 2026). Always run `git pull --ff-only` before you push, so you do not overwrite someone else's work.
2. Use a branch and a pull request when you want a review before your work reaches `main`. Branch name: `<your-name>/<topic>`, for example `enes/login-page`, `erol/reservation-api`.
3. Commit messages start with a type: `feat:` (new feature), `fix:` (bug fix), `docs:` (report or README), `test:`, `refactor:`.
4. Who reviews what:
   - API contract, folder structure, architecture → Batuhan
   - backend code and database → Erol
   - frontend code → Enes
   - tests → Görkem
   - report sections → the section owner and Mert
5. If your work needs something from someone else, add a row to `HANDOFFS.md` in the same commit. When you deliver, mark your row `Done`.
7. Never commit `.env` or `.env.local` files (they hold passwords and secrets). Only `.env.example` is committed.
8. Code freeze: 1 December 2026. After that, only fixes for bugs that Görkem reports.
