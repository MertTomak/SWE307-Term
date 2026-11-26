// UC-01 Register and Log In (E01-E03), JWT handling (5.8.4.2), passwords (5.8.5.3).
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../config/env.js";
import { isUniqueViolation } from "../db/errors.js";
import { DomainError } from "../domain/errors.js";
import { ACTIVE_RESERVATION_LIMITS } from "../domain/rules/index.js";
import type { CampusUserRole } from "../domain/types.js";
import { repos as defaultRepos, type Repositories } from "../repositories/index.js";

/** NFR-02: token lifetime 1 hour, no refresh token (API-A1). */
export const TOKEN_LIFETIME_SECONDS = 3600;
/** 5.8.5.3: bcrypt cost factor 10 (same as the seed). */
const BCRYPT_COST = 10;

export interface TokenClaims {
  sub: string;
  role: Role;
}

const invalidCredentials = () =>
  // Same answer for an unknown e-mail and a wrong password (FR-04, ST-09).
  new DomainError("INVALID_CREDENTIALS", "The e-mail or password is incorrect.");

/** Normalised e-mail: trimmed and lower case, so "Ali@X.edu" and "ali@x.edu" are one account. */
export const normaliseEmail = (email: string) => email.trim().toLowerCase();

let dummyHash: string | undefined;
/** Compared when the e-mail is unknown, so both failure cases take about the same time. */
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync("campusslot-timing-equaliser", BCRYPT_COST));

export function issueToken(user: { id: string; role: Role }): string {
  // `iat` and `exp` come from Date.now(), the server clock (NFR-10).
  return jwt.sign({ role: user.role }, env().JWT_SECRET, {
    algorithm: "HS256",
    subject: user.id,
    expiresIn: TOKEN_LIFETIME_SECONDS,
  });
}

/** Verifies signature and expiry. Fails closed: any problem is a 401 (A10). */
export function verifyToken(token: string): TokenClaims {
  try {
    const payload = jwt.verify(token, env().JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof payload !== "object" || typeof payload.sub !== "string" || typeof payload.role !== "string") {
      throw new Error("Token without sub or role");
    }
    return { sub: payload.sub, role: payload.role as Role };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new DomainError("TOKEN_EXPIRED", "Your session has expired. Please log in again.");
    }
    throw new DomainError("UNAUTHENTICATED", "Please log in to continue.");
  }
}

export class AuthService {
  constructor(private readonly r: Repositories = defaultRepos) {}

  /** E01. Only STUDENT and ACADEMIC_STAFF can register (ST-06); the schema already checked the input. */
  async register(input: { fullName: string; email: string; password: string; role: CampusUserRole }) {
    const email = normaliseEmail(input.email);
    if (await this.r.users.findByEmail(email)) throw emailTaken();
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    try {
      const user = await this.r.users.create({ email, fullName: input.fullName.trim(), role: input.role, passwordHash });
      return { token: issueToken(user), expiresIn: TOKEN_LIFETIME_SECONDS, user };
    } catch (error) {
      if (isUniqueViolation(error, "email")) throw emailTaken(); // two parallel registrations
      throw error;
    }
  }

  /** E02. */
  async login(emailInput: string, password: string) {
    const user = await this.r.users.findByEmail(normaliseEmail(emailInput));
    const ok = await bcrypt.compare(password, user?.passwordHash ?? getDummyHash());
    if (!user || !ok) throw invalidCredentials();
    return { token: issueToken(user), expiresIn: TOKEN_LIFETIME_SECONDS, user };
  }

  /** E03: current user, running penalty and the R2 counter (limit null for admins). */
  async me(userId: string, now: Date) {
    const user = await this.r.users.findById(userId);
    if (!user) throw new DomainError("UNAUTHENTICATED", "Please log in to continue.");
    const isCampusUser = user.role !== "RESOURCE_ADMIN";
    const [penalty, activeReservationCount] = await Promise.all([
      this.r.penalties.findRunning(user.id, now),
      isCampusUser ? this.r.reservations.countActiveByUser(user.id, now) : Promise.resolve(0),
    ]);
    return {
      user,
      activePenalty: penalty ? { reason: penalty.reason, endsAt: penalty.endsAt } : null,
      activeReservationCount,
      activeReservationLimit: isCampusUser ? ACTIVE_RESERVATION_LIMITS[user.role as CampusUserRole] : null,
    };
  }
}

const emailTaken = () => new DomainError("EMAIL_TAKEN", "An account with this e-mail already exists.");
