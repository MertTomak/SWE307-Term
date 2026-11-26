-- R3 / NFR-08: two blocking reservations on the same resource may never overlap.
-- Hand-written: Prisma schema syntax cannot express an exclusion constraint.
-- Decided by the System Architect on 23 Nov 2026 (5.8.4.7, hand-off H02).
--
-- The service layer checks R3 first (OverlapRule) and gives the user a clear error.
-- This constraint stops the rare case in which two parallel requests both pass that
-- check before either has inserted. The API maps the violation (SQLSTATE 23P01)
-- to 409 RULE_R3_OVERLAP.
--
-- Half-open range '[)': 10:00-11:00 and 11:00-12:00 do not overlap.
-- PENDING_APPROVAL blocks the slot (D2); CANCELLED, REJECTED, NO_SHOW and
-- COMPLETED do not.

-- Needed for "resourceId" WITH = inside a GiST exclusion constraint.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_r3_no_overlap_excl"
  EXCLUDE USING gist (
    "resourceId" WITH =,
    tstzrange("startTime", "endTime", '[)') WITH &&
  )
  WHERE ("status" IN ('PENDING_APPROVAL', 'CONFIRMED', 'CHECKED_IN'));
