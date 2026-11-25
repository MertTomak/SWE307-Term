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
cp .env.example .env          # then edit DATABASE_URL
npm run prisma:generate       # generates the Prisma Client
npm run prisma:deploy         # creates the tables
npm run db:seed               # demo data
```

The API server (Express) is not in the repository yet. Its start command and port are added here by the Backend Developer.

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
