// requireAuth (401) and requireRole (403): the first two links of every
// protected route's chain (5.7 P4, 5.8.4.2 item 8). Fail closed (A10).
import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { DomainError } from "../../domain/errors.js";
import { logger } from "../../logger.js";
import { verifyToken } from "../../services/AuthService.js";

export interface AuthUser {
  id: string;
  role: Role;
}

/** The logged-in user, set by requireAuth. */
export function currentUser(res: Response): AuthUser {
  const user = res.locals.user as AuthUser | undefined;
  if (!user) throw new DomainError("UNAUTHENTICATED", "Please log in to continue.");
  return user;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) throw new DomainError("UNAUTHENTICATED", "Please log in to continue.");
  const claims = verifyToken(match[1]!);
  res.locals.user = { id: claims.sub, role: claims.role } satisfies AuthUser;
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = currentUser(res);
    if (!roles.includes(user.role)) {
      logger.security("forbidden", { userId: user.id, role: user.role, method: req.method, path: req.path });
      throw new DomainError("FORBIDDEN", "You are not allowed to do this.");
    }
    next();
  };
}
