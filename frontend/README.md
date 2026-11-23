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
