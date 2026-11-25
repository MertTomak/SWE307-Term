# Backend tests

Automated tests for 5.12 Implementation and Testing. Each test name starts with
its test case ID from the test plan (`docs/report/5.12_test-plan_Gorkem.md`),
so the output shows which TC, DT rule or ST passed.

Owner: Görkem (QA/Test Engineer). Stack: Vitest + Supertest.

## Run

```bash
cd backend
npm install
npx prisma generate
npm test            # skips what does not exist yet
npm run test:full   # strict: nothing may be skipped
```

The API, scheduler and database tests need a **separate test database**. Put it
in `backend/.env` (see `.env.example`):

```
DATABASE_URL_TEST="postgresql://USER:PASSWORD@localhost:5432/campusslot_test?schema=public"
```

- Every test deletes all rows in it, so the tests refuse to start when
  - the database name does not contain `test`, or
  - it is the same database (host, port, name) as `DATABASE_URL`, or
  - the live connection reaches a database whose name does not contain `test`.
- The migrations are applied to it automatically at the start of the run.
- Node.js 20.19 or newer, as for the rest of the backend (Vitest 4.1 supports it).

### Two ways to run

| Command | When | Missing test database or backend code |
|---|---|---|
| `npm test` | While the backend is being built, on every push (CI). | The tests that need it are **skipped**; the run passes. The first test prints what was missing. |
| `npm run test:full` | The real test run for the report (1–3 Dec) and CI after the code freeze. | The run **fails**. Use this result in 5.12, so that "passed" never means "skipped". |

GitHub Actions (`.github/workflows/backend-tests.yml`) runs the same command
with PostgreSQL 16 on every pull request that touches `backend/`.

## What the backend must provide (hand-off H33)

The tests were written from the API contract (5.8.4) before the backend code.
A suite is skipped while the file it needs does not exist, and runs as soon as
the file is added:

| File | Must export | Used by |
|---|---|---|
| `src/app.ts` | the Express app as `app` or `default`, or a `createApp()` function. It must not call `listen()` on import. | All API tests |
| `src/jobs/index.ts` | `runSchedulerOnce(now?: Date): Promise<void>`: one scheduler run with the jobs in the order J3, J1, J2, J4 (5.8.4.9). | `scheduler.test.ts` |

**Time.** The tests set the clock with Vitest fake timers (only `Date` is
faked). Business rules R6–R9, the token lifetime and the scheduler must
therefore read the time from JavaScript (`new Date()`, `Date.now()`) or from a
`now` parameter, **not** from the database (`now()`, `CURRENT_TIMESTAMP` in SQL).
Otherwise the boundary tests (exactly 10 and 15 minutes, 3 hours, 30 days)
cannot work.

**Rate limits.** The limiter state must live in the app instance (memory), so
each test file starts with fresh limits.

## Files

| File | Covers |
|---|---|
| `auth.test.ts` | UC-01: TC-01 (API part), TC-02, TC-03, TC-04, TC-06, TC-07, TC-09; ST-01, ST-02, ST-03, ST-06, ST-07, ST-09, ST-10 |
| `resources.test.ts` | UC-02: TC-11, TC-13; ST-05, ST-11 |
| `reservations.test.ts` | UC-03, DT-1: DT1-1 to DT1-6, TC-14/TC-15 (API part), TC-16 to TC-23 |
| `cancel-and-ownership.test.ts` | UC-04: TC-25, TC-26, TC-30; ST-04 |
| `check-in.test.ts` | UC-05, DT2-1 to DT2-3: TC-33, TC-34; ST-08 |
| `scheduler.test.ts` | UC-09, DT2-4 to DT2-7: TC-35 to TC-40 |
| `admin.test.ts` | UC-06, UC-07: TC-41 (API part), TC-42, TC-43, TC-44 |
| `database-constraints.test.ts` | NFR-09 unique constraints (FR-03, FR-31, FR-36); runs without the backend code |
| `helpers/` | App loader, test clock, database factories, HTTP helpers |

## Known dependency on other hand-offs

- TC-21 (two parallel bookings, NFR-08) passes only after the R3 exclusion
  constraint is on `main` (H02).
