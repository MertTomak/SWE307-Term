# CampusSlot frontend

React + Vite + TypeScript web client. Setup and run steps are in the [root README](../README.md#frontend).

## Folder structure

| Path | What is in it |
|---|---|
| `src/api/types.ts` | Types of every request and response (DTOs in 5.8.4.5 of `docs/report/5.8_api-design_Batuhan.md`). |
| `src/api/client.ts` | `apiRequest`: adds the JWT, turns every error into an `ApiError` with `code`, `message`, `rule`, `details`. |
| `src/api/endpoints.ts` | One typed function per endpoint, numbered E01–E23 like the endpoint table. Screens call only these. |
| `src/auth/` | `AuthProvider` (login, register, logout, reload with `/auth/me`), `useAuth()` hook, `RequireRole` route guard, role lists. |
| `src/components/Layout.tsx` | Header and navigation; the links depend on the role. |
| `src/pages/auth/` | Log in, Register (public). |
| `src/pages/shared/` | Pages for every logged-in user: resource search, resource detail, notifications. |
| `src/pages/campus/` | `STUDENT` and `ACADEMIC_STAFF` only: new reservation, my reservations, check-in. |
| `src/pages/admin/` | `RESOURCE_ADMIN` only: resources, approvals, reports, penalties. |
| `src/lib/time.ts` | Shows times in Europe/Istanbul, whatever the device's time zone is. |
| `src/App.tsx` | Route map: which page is at which URL and which roles may open it. |

## Rules for building a screen

1. Every page is now a `PagePlaceholder` that lists its use case and API calls. Replace it with the real screen; keep the file name.
2. Call the API only through `api.…` in `src/api/endpoints.ts`. Do not call `fetch` in a page.
3. On error, decide by `error.code` (catalogue in 5.8.4.3) and show `error.message` to the user. Business-rule errors also have `error.rule` (`R1` … `R9`).
4. Show times with `formatDateTime` / `formatTime`. Send times to the API as ISO 8601 with an offset.
5. Lists: show loading, empty and error states (task document, Enes item 3).
6. Mobile first: check-in is used on a phone at the door.
7. One branch and one pull request per screen, for example `enes/my-reservations`.

## Mock API (until the backend is ready)

The backend server is not built yet, so the screens can run against a fake API in the browser ([MSW](https://mswjs.io/), Mock Service Worker).

- Switch: `VITE_USE_MOCKS=true` in `.env.local` (copied from `.env.example`). Works only in `npm run dev`; the production build never contains the mocks.
- Fake answers: `src/mocks/handlers.ts`. They follow the API contract (paths, status codes, error codes, bodies), so a page does not change when the mocks are switched off. Endpoints without a handler go to the real API at `VITE_API_URL`.
- Fake users: `src/mocks/db.ts` (one student, one academic staff, one admin; the test password is `MOCK_PASSWORD` in that file). Users registered in the app are kept in `sessionStorage` until the tab is closed.
- Covered so far: E01 register, E02 log in (with the 5-failure rate limit), E03 current user.
- When the backend runs: set `VITE_USE_MOCKS=false`.

## Testing the QR check-in on a phone

A phone's browser gives the camera only to a secure page (HTTPS). `npm run dev` is plain HTTP, so use:

```bash
npm run dev:phone
```

1. The computer and the phone must be on the same Wi-Fi. Vite prints a `Network:` address, for example `https://192.168.1.20:5173/`.
2. On the computer, open `https://localhost:5173/dev/qr-test`. It shows a test QR code and its 6-digit code (development only).
3. On the phone, open the `Network:` address. The certificate is self-made, so the browser warns once: choose "Advanced" → "Proceed" (Chrome) or "Show Details" → "visit this website" (Safari).
4. Log in as `student@campusslot.test` (mock password in `src/mocks/db.ts`), open **Check in**, allow the camera and point it at the QR code on the computer screen.
5. Expected: "You are checked in · Study Room A-101". Also try the 6-digit code, and "Don't allow" for the camera (the page must offer the code field).

In this mode the API address is relative (`/api/v1`) and the mock API is always on (see `vite.config.ts`). If Windows asks whether Node.js may use the network, allow it for private networks.
