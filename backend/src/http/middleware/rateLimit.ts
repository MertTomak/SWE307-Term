// Failure-based rate limits (5.8.4.6, API-A6):
//   POST /auth/login : 5 failed attempts per e-mail and IP in 15 minutes
//   POST /check-ins  : 10 failed attempts per user in 5 minutes
// Only failed attempts count. The state lives in memory in the app instance
// (one limiter per createApp() call), and the clock is Date.now() (H33).
import type { NextFunction, Request, Response } from "express";
import { DomainError } from "../../domain/errors.js";
import { logger } from "../../logger.js";

export interface FailureLimiterOptions {
  name: string;
  maxFailures: number;
  windowMs: number;
  /** Key of one counter, for example "e-mail|IP". */
  key: (req: Request, res: Response) => string;
  /** Which answers count as a failed attempt. */
  isFailure: (status: number) => boolean;
}

export class FailureLimiter {
  private readonly failures = new Map<string, number[]>();

  constructor(private readonly options: FailureLimiterOptions) {}

  private recent(key: string, now: number): number[] {
    const list = (this.failures.get(key) ?? []).filter((t) => now - t < this.options.windowMs);
    if (list.length > 0) this.failures.set(key, list);
    else this.failures.delete(key);
    return list;
  }

  /** Express middleware: answers 429 when the key has reached the limit, records failures after the answer. */
  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const key = this.options.key(req, res);
      const now = Date.now();
      if (this.recent(key, now).length >= this.options.maxFailures) {
        logger.security("rate_limited", { limiter: this.options.name, userId: res.locals.user?.id });
        throw new DomainError("RATE_LIMITED", "Too many failed attempts. Please wait a few minutes and try again.");
      }
      res.on("finish", () => {
        if (this.options.isFailure(res.statusCode)) {
          const list = this.recent(key, Date.now());
          list.push(Date.now());
          this.failures.set(key, list);
        }
      });
      next();
    };
  }
}

const MINUTE = 60_000;

export function loginLimiter(): FailureLimiter {
  return new FailureLimiter({
    name: "login",
    maxFailures: 5,
    windowMs: 15 * MINUTE,
    key: (req) => {
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      return `${email}|${req.ip}`;
    },
    isFailure: (status) => status === 401,
  });
}

export function checkInLimiter(): FailureLimiter {
  return new FailureLimiter({
    name: "check-in",
    maxFailures: 10,
    windowMs: 5 * MINUTE,
    key: (_req, res) => String(res.locals.user?.id),
    isFailure: (status) => status === 404 || status === 409 || status === 422,
  });
}
