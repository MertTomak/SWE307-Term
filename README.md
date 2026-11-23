# CampusSlot

CampusSlot (Campus Resource Reservation and QR Check-in System) is a web application for reserving classrooms, laboratories and equipment on campus. Users check in by scanning the QR code on the resource door, and unused reservations are released automatically as no-shows.

Course project for SWE307 Software Systems Analysis and Design.

## Folder structure

- `/frontend` - React + Vite + TypeScript web client
- `/backend` - Node.js + Express + TypeScript API (PostgreSQL + Prisma)
- `/docs` - report text (`/docs/report`) and diagrams (`/docs/diagrams`)

## Backend setup

Requirements: Node.js 20.19 or newer, and PostgreSQL 14 or newer (or the local development database described below).

```bash
cd backend
npm install
cp .env.example .env          # then edit DATABASE_URL and JWT_SECRET
npx prisma generate           # generates the Prisma Client
npx prisma migrate deploy     # creates the tables and the R1/R3 database constraints
npm run db:seed               # demo data (see below)
```

Prisma is pinned to 7.10.1. Do not run `npm install prisma` without a version: the npm `latest` tag currently points to a release candidate.

### Database without Docker or a PostgreSQL install

For development only, the backend can run its own PostgreSQL (PGlite, PostgreSQL compiled to WebAssembly):

```bash
npm run db:local              # terminal 1, keep it open (add "-- --memory" for a throw-away database)
```

In `.env` for terminal 2:

```
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable"
DB_POOL_MAX=1
```

Then run `npx prisma migrate deploy` and `npm run db:seed` as above. The live demo uses a real PostgreSQL server.

### Demo data

`npm run db:seed` deletes all rows and inserts:

- 7 users, all with the password from `SEED_PASSWORD` (default `CampusSlot123!`, development only):
  `admin@campusslot.test` (RESOURCE_ADMIN), `staff1@` and `staff2@campusslot.test` (ACADEMIC_STAFF),
  `student1@` to `student4@campusslot.test` (STUDENT)
- 13 resources: 5 ROOM, 4 LAB, 4 EQUIPMENT. Their 6-digit check-in codes are `100001` to `100013` in this order
- Reservations in all 7 statuses. `student3` has 3 NO_SHOW in the last 30 days and an active 7-day penalty (R9)

Reservation times are relative to the moment the seed runs, so the demo data is always current.

### Useful commands

| Command | What it does |
|---|---|
| `npm run typecheck` | TypeScript type check |
| `npm run db:seed` | Reset the demo data |
| `npm run db:reset` | Drop the database, re-apply all migrations and re-seed |
| `npx prisma studio` | Browse the database in the browser |
