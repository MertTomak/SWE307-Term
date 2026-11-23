# Who is waiting for what

One list of open hand-offs between team members, so nobody has to read the commit history to find out what is expected from them.

**How to use it**

- Before you start working, run `git pull` and find your name in the **Owner** column.
- When you need something from someone, add a row in the same commit as your work.
- When you deliver, move your row to **Done** and put the file or commit in **Where**. Do not delete rows.
- Status values: `Open` · `In progress` · `Blocked` (say why in **What**).
- Dates are from the plan in `docs/report/5.5_planning_Mert.md` and the task document. Overdue items are marked ⚠.

Last updated: 24 Nov 2026 (Batuhan).

## Open

| ID | Waiting | Owner | What | Due | Status | Where |
|---|---|---|---|---|---|---|
| H02 | Batuhan | Erol | Add the R3 overlap guard (`EXCLUDE USING gist`, already written on `erol/prisma-schema`) back to `main` as a migration, and map its PostgreSQL error to `409 RULE_R3_OVERLAP`. Decided by Batuhan on 23 Nov: yes, it is needed for NFR-08 (two users booking the same slot at once). The same branch also has your backend README section and the local database script, which are not on `main` either. | 25 Nov | Open | 5.8.4.7 |
| H03 | Batuhan | Erol | Read the API contract and tell Batuhan which endpoints are hard to build by 1 Dec, so the contract can be changed early. | 24 Nov | Open | `docs/report/5.8_api-design_Batuhan.md` |
| H19 | Enes, Batuhan | Erol | Confirm the backend port (the frontend assumes `3000`, see `frontend/.env.example`) and add the server start command to the README. | when the Express server is added | Open | `README.md` |
| H20 | Görkem, Mert | Enes | Build the screens on the frontend skeleton, starting with Log in and Register. Each page file already lists its use case and API calls. The Register page needs the privacy notice and the `privacyNoticeAccepted` checkbox (5.8.5.5), and must not use `dangerouslySetInnerHTML` (5.8.5.2, A05). | 1 Dec (plan L, M, N) | Open | `frontend/src/pages/`, `frontend/README.md` |
| H06 | Mert | Batuhan | 5.7 design patterns (checked against Erol's code). Component and Deployment diagrams (H21) and 5.8.5 security (H25) are done. | 27 Nov | Open | — |
| H26 | Batuhan | Erol | Build the server controls in 5.8.5.2: role and ownership checks, `helmet`, `cors` with `CORS_ORIGIN`, rate limits, door codes from `crypto` (not `Math.random`), logging without passwords, tokens or codes. Contract change: password max 72 bytes in E01 (bcrypt limit). | 1 Dec | Open | 5.8.5.2, 5.8.5.3 |
| H27 | Batuhan | Görkem | Security tests ST-01 to ST-15 for 5.12. Seed the demo database with a secret `SEED_PASSWORD`: the default `CampusSlot123!` in `seed.ts` is public on GitHub. Run `npm audit` before the freeze. | 1 Dec | Open | 5.8.5.6, SEC-O4 |
| H28 | Batuhan | Mert | KVKK Art. 9 (transfer abroad) is not in 5.10.2. Render and Neon may store data outside Turkey. 5.8.5 decides that the pilot and demo use only fictional seed users; please add Art. 9 to 5.10.2 and ask the university about hosting, the privacy notice text and who receives deletion requests. | 27 Nov | Open | 5.8.5.5, SEC-O1 to SEC-O3 |
| H22 | Erol | Batuhan → Erol | Proposed backend folder structure and layer rule (Domain layer without Express or Prisma). Erol: say if you want other names; the 5.7 class diagram must follow the final code. | 25 Nov | Open | 5.8.1 in `docs/report/5.8_architecture-stack_Batuhan.md` |
| H23 | Enes | Enes | Choose the QR scanning library and test it on the team's phones. `html5-qrcode` (suggested in the task document) was last published in April 2023; `@zxing/browser` is a maintained alternative. | 26 Nov | Open | 5.8.2 |
| H24 | Mert, Görkem | Team | Demo hosting: free Render instance kept awake before the demo, or the paid instance (5.11 Scenario B) for the presentation week. The free instance sleeps, and the scheduler sleeps with it. | 1 Dec | Open | 5.7 Deployment, risks |
| H07 | Mert | Batuhan | 5.9 alternatives and weighted decision matrix. | 29 Nov | Open | — |
| H08 | Batuhan, Erol | Zeynep | Daily opening hours of rooms and labs, for the occupancy rate in the usage report (API-A8). Ask in the admin interview. | 25 Nov | Open | 5.8.4.10 |
| H09 | Erol | Zeynep | R9: are the no-shows that already caused a penalty counted again for the next penalty? Is the 30-day window based on the reservation start time (current assumption API-A7)? | 25 Nov | Open | 5.4 F6; 5.8.4.9 |
| H10 | Mert | Zeynep, Erol | Confirm or change the PM defaults D1–D4. The API contract already follows them. | 25 Nov | Open | 5.4.2a |
| H11 | Enes | Arzum | Screen designs and user flow. | 23 Nov | Open | — |
| H12 | Görkem, Mert | Görkem | Use case diagram and the 10 use case descriptions. | 23 Nov | Open | — |
| H13 | Mert | Everyone | Full name, student ID and course section for the 5.13 matrix. | 23 Nov | Open | `docs/report/5.13-5.14_report-text_Mert.md` |
| H14 | Mert | Everyone | Your AI usage row for 5.14 (section, tool, purpose, reviewer). | when your part is done | Open | `docs/report/5.13-5.14_report-text_Mert.md` |

## Done

| ID | Waiting | Owner | What | Done on | Where |
|---|---|---|---|---|---|
| H01 | Erol, Enes | Batuhan | API endpoint table (5.8 API / interface design): 23 endpoints, error format, pagination, JWT, rule order, scheduler jobs. | 23 Nov | `docs/report/5.8_api-design_Batuhan.md` |
| H04 | All | Batuhan | `/frontend` skeleton (React + Vite + TS, typed API client for E01–E23, role guards, 12 placeholder pages), README setup steps and team rules (direct push to `main` allowed, agreed with Mert). | 23 Nov | `frontend/`, `README.md` |
| H05 | All | Batuhan | 5.8.1 overall architecture (layers, folder structure, request flow, diagram) and 5.8.2 technology stack table. PNG rendered on 24 Nov. | 23 Nov | `docs/report/5.8_architecture-stack_Batuhan.md`, `docs/diagrams/5.8_architecture-diagram_Batuhan.png` |
| H21 | Mert | Batuhan | 5.7 Component and Deployment diagrams with text. PNGs rendered on 24 Nov. | 23 Nov | `docs/report/5.7_component-deployment_Batuhan.md`, `docs/diagrams/5.7_*_Batuhan.png` |
| H25 | Mert | Batuhan | 5.8.5 Security and data privacy incl. KVKK: threat list, controls by OWASP Top 10:2025, password and token choices, KVKK duty-to-measure table (with Art. 9), 15 security tests for 5.12. | 24 Nov | `docs/report/5.8.5_security-privacy_Batuhan.md` |
| H15 | Erol, Mert | Batuhan | Scheduler run interval: every 60 seconds. | 23 Nov | 5.4 F6, NFR-14; 5.8.4.9 |
| H16 | Mert | Batuhan | Time zone for NFR-10: `Europe/Istanbul`, stored in UTC. | 23 Nov | 5.4 NFR-10; 5.8.4.1 |
| H17 | Mert | Batuhan | Name, student ID and section in 5.13; AI usage row for 5.8 (API part). | 23 Nov | `docs/report/5.13-5.14_report-text_Mert.md` |
| H18 | Batuhan, Enes | Erol | Prisma schema, initial migration and seed data. | 23 Nov | PR #4 |
