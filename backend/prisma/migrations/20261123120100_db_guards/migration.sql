-- CampusSlot: DB-level guards that Prisma schema syntax cannot express.
-- Hand-written migration. Keep it in sync with the note at the bottom of schema.prisma.
-- The service layer still checks R1 and R3 first and returns a friendly error;
-- these constraints are the last line of defence against concurrent requests.

-- Needed for "resourceId" WITH = inside a GiST exclusion constraint.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- R1: a reservation must end after it starts and last at most 3 hours.
-- Violation -> SQLSTATE 23514 (check_violation).
ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_r1_max_3h_check"
  CHECK ("endTime" > "startTime" AND "endTime" - "startTime" <= interval '3 hours');

-- R3: no two time-blocking reservations may overlap on the same resource.
-- Half-open range '[)': 10:00-11:00 and 11:00-12:00 do NOT overlap.
-- PENDING_APPROVAL also blocks the slot (assumption, see report).
-- NO_SHOW, CANCELLED, REJECTED, COMPLETED release the slot (R8).
-- Violation -> SQLSTATE 23P01 (exclusion_violation).
ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_r3_no_overlap_excl"
  EXCLUDE USING gist (
    "resourceId" WITH =,
    tstzrange("startTime", "endTime", '[)') WITH &&
  )
  WHERE ("status" IN ('PENDING_APPROVAL', 'CONFIRMED', 'CHECKED_IN'));

-- Door fallback code: exactly 6 digits.
-- Violation -> SQLSTATE 23514 (check_violation).
ALTER TABLE "Resource"
  ADD CONSTRAINT "Resource_checkInCode_digits_check"
  CHECK ("checkInCode" ~ '^[0-9]{6}$');
