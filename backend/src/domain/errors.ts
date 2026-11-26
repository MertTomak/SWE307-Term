// DomainError: a refused request with a stable code from the error catalogue
// (5.8.4.3). The HTTP layer maps the code to the status code and the error body.

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "UNAUTHENTICATED"
  | "TOKEN_EXPIRED"
  | "FORBIDDEN"
  | "EMAIL_TAKEN"
  | "RESOURCE_NOT_FOUND"
  | "RESERVATION_NOT_FOUND"
  | "NOTIFICATION_NOT_FOUND"
  | "RESOURCE_INACTIVE"
  | "START_IN_PAST"
  | "INVALID_TIME_RANGE"
  | "RULE_R1_MAX_DURATION"
  | "RULE_R2_ACTIVE_LIMIT"
  | "RULE_R3_OVERLAP"
  | "RULE_R4_ACTIVE_PENALTY"
  | "RULE_R6_CANCEL_AFTER_START"
  | "INVALID_STATE_TRANSITION"
  | "CHECKIN_CODE_INVALID"
  | "NO_RESERVATION_HERE"
  | "RULE_R7_TOO_EARLY"
  | "RULE_R7_TOO_LATE"
  | "RESERVATION_NOT_CONFIRMED"
  | "ALREADY_CHECKED_IN"
  | "RESERVATION_ALREADY_STARTED"
  | "RATE_LIMITED"
  | "ROUTE_NOT_FOUND"
  | "INTERNAL_ERROR";

export type RuleId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7" | "R8" | "R9";

export class DomainError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly rule?: RuleId,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
