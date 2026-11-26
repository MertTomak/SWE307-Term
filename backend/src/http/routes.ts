// All routes of the API contract (5.8.4.6). Each line shows the whole chain
// (Chain of Responsibility, 5.7 P4):
//   requireAuth (401) -> requireRole (403) -> rate limit (429) -> validate (400) -> controller
import { Router } from "express";
import * as c from "./controllers/index.js";
import { requireAuth, requireRole } from "./middleware/auth.js";
import { checkInLimiter, loginLimiter } from "./middleware/rateLimit.js";
import { validate } from "./middleware/validate.js";
import * as s from "./schemas/index.js";

const ADMIN = "RESOURCE_ADMIN" as const;
const CAMPUS_USER = ["STUDENT", "ACADEMIC_STAFF"] as const;
const ALL = ["STUDENT", "ACADEMIC_STAFF", ADMIN] as const;

/** A new router with fresh rate-limit counters (one per app instance). */
export function apiRouter(): Router {
  const r = Router();
  const login = loginLimiter().middleware();
  const checkIn = checkInLimiter().middleware();

  // Auth
  r.post("/auth/register", validate({ body: s.registerBody }), c.register); // E01
  r.post("/auth/login", login, validate({ body: s.loginBody }), c.login); // E02
  r.get("/auth/me", requireAuth, requireRole(...ALL), c.me); // E03

  // Resources
  r.get("/resources", requireAuth, requireRole(...ALL), validate({ query: s.resourceSearchQuery }), c.searchResources); // E04
  r.get("/resources/:id", requireAuth, requireRole(...ALL), validate({ params: s.idParams }), c.getResource); // E05
  r.get("/resources/:id/availability", requireAuth, requireRole(...ALL), validate({ params: s.idParams, query: s.availabilityQuery }), c.getAvailability); // E06

  // Reservations (/reservations/me before /reservations/:id)
  r.post("/reservations", requireAuth, requireRole(...CAMPUS_USER), validate({ body: s.createReservationBody }), c.createReservation); // E07
  r.get("/reservations/me", requireAuth, requireRole(...CAMPUS_USER), validate({ query: s.myReservationsQuery }), c.myReservations); // E08
  r.get("/reservations/:id", requireAuth, requireRole(...ALL), validate({ params: s.idParams }), c.getReservation); // E09
  r.post("/reservations/:id/cancel", requireAuth, requireRole(...CAMPUS_USER), validate({ params: s.idParams }), c.cancelReservation); // E10

  // Check-in
  r.post("/check-ins", requireAuth, requireRole(...CAMPUS_USER), checkIn, validate({ body: s.checkInBody }), c.checkIn); // E11

  // Notifications
  r.get("/notifications", requireAuth, requireRole(...ALL), validate({ query: s.notificationsQuery }), c.listNotifications); // E12
  r.patch("/notifications/:id/read", requireAuth, requireRole(...ALL), validate({ params: s.idParams }), c.markNotificationRead); // E13

  // Admin: approvals
  r.get("/admin/reservations/pending", requireAuth, requireRole(ADMIN), validate({ query: s.pageQuery }), c.pendingReservations); // E14
  r.post("/admin/reservations/:id/approve", requireAuth, requireRole(ADMIN), validate({ params: s.idParams }), c.approveReservation); // E15
  r.post("/admin/reservations/:id/reject", requireAuth, requireRole(ADMIN), validate({ params: s.idParams, body: s.rejectBody }), c.rejectReservation); // E16

  // Admin: resources
  r.get("/admin/resources", requireAuth, requireRole(ADMIN), validate({ query: s.adminResourceSearchQuery }), c.adminSearchResources); // E17
  r.post("/admin/resources", requireAuth, requireRole(ADMIN), validate({ body: s.createResourceBody }), c.createResource); // E18
  r.patch("/admin/resources/:id", requireAuth, requireRole(ADMIN), validate({ params: s.idParams, body: s.updateResourceBody }), c.updateResource); // E19

  // Admin: reports
  r.get("/admin/reports/usage", requireAuth, requireRole(ADMIN), validate({ query: s.usageReportQuery }), c.usageReport); // E20
  r.get("/admin/reports/no-shows", requireAuth, requireRole(ADMIN), validate({ query: s.noShowReportQuery }), c.noShowReport); // E21
  r.get("/admin/penalties", requireAuth, requireRole(ADMIN), validate({ query: s.penaltiesQuery }), c.penalties); // E22

  // Health
  r.get("/health", c.health); // E23

  return r;
}
