// One error format for every endpoint (5.8.4.3). Unexpected errors answer
// 500 INTERNAL_ERROR only; the stack trace goes to the server log (A02, A10).
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { DomainError, type ErrorCode } from "../../domain/errors.js";
import { logger } from "../../logger.js";

/** HTTP status of every code in the catalogue. */
export const HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  INVALID_CREDENTIALS: 401,
  UNAUTHENTICATED: 401,
  TOKEN_EXPIRED: 401,
  FORBIDDEN: 403,
  EMAIL_TAKEN: 409,
  RESOURCE_NOT_FOUND: 404,
  RESERVATION_NOT_FOUND: 404,
  NOTIFICATION_NOT_FOUND: 404,
  RESOURCE_INACTIVE: 422,
  START_IN_PAST: 422,
  INVALID_TIME_RANGE: 422,
  RULE_R1_MAX_DURATION: 422,
  RULE_R2_ACTIVE_LIMIT: 422,
  RULE_R3_OVERLAP: 409,
  RULE_R4_ACTIVE_PENALTY: 422,
  RULE_R6_CANCEL_AFTER_START: 422,
  INVALID_STATE_TRANSITION: 409,
  CHECKIN_CODE_INVALID: 404,
  NO_RESERVATION_HERE: 404,
  RULE_R7_TOO_EARLY: 422,
  RULE_R7_TOO_LATE: 422,
  RESERVATION_NOT_CONFIRMED: 422,
  ALREADY_CHECKED_IN: 409,
  RESERVATION_ALREADY_STARTED: 422,
  RATE_LIMITED: 429,
  ROUTE_NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
};

interface ErrorBody {
  error: { code: ErrorCode; message: string; rule?: string; details?: Record<string, unknown> };
}

const body = (code: ErrorCode, message: string, rule?: string, details?: Record<string, unknown>): ErrorBody => ({
  error: { code, message, ...(rule ? { rule } : {}), ...(details ? { details } : {}) },
});

export function notFoundHandler(req: Request): never {
  throw new DomainError("ROUTE_NOT_FOUND", `No endpoint ${req.method} ${req.path}.`);
}

// Express recognises an error handler by its four parameters.
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof DomainError) {
    const status = HTTP_STATUS[error.code];
    if (status === 401 && error.code !== "INVALID_CREDENTIALS") {
      logger.security("unauthenticated", { code: error.code, method: req.method, path: req.path });
    }
    res.status(status).json(body(error.code, error.message, error.rule, error.details));
    return;
  }
  if (error instanceof ZodError) {
    const fields = error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
    res.status(400).json(body("VALIDATION_ERROR", "The request is not valid.", undefined, { fields }));
    return;
  }
  // Body parser errors: malformed JSON, body too large.
  const type = (error as { type?: string } | null)?.type;
  if (type === "entity.parse.failed" || type === "entity.too.large") {
    res.status(400).json(body("VALIDATION_ERROR", "The request body is not valid JSON or is too large."));
    return;
  }
  logger.error("http.unexpected_error", {
    method: req.method,
    path: req.path,
    error: error instanceof Error ? error.stack : String(error),
  });
  res.status(500).json(body("INTERNAL_ERROR", "Something went wrong on the server. Please try again."));
}
