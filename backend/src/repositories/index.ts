// Repository pattern (5.7 P3): one repository per table. Only this folder imports
// Prisma. Every repository works on the Prisma client or on an open transaction,
// so one use case can run all its reads and writes in one transaction.
import { prisma, type Db } from "../db/prisma.js";
import { CheckInRepository } from "./CheckInRepository.js";
import { NotificationRepository } from "./NotificationRepository.js";
import { PenaltyRepository } from "./PenaltyRepository.js";
import { ReservationRepository } from "./ReservationRepository.js";
import { ResourceRepository } from "./ResourceRepository.js";
import { UserRepository } from "./UserRepository.js";

export interface Repositories {
  users: UserRepository;
  resources: ResourceRepository;
  reservations: ReservationRepository;
  checkIns: CheckInRepository;
  penalties: PenaltyRepository;
  notifications: NotificationRepository;
}

export function repositoriesFor(db: Db): Repositories {
  return {
    users: new UserRepository(db),
    resources: new ResourceRepository(db),
    reservations: new ReservationRepository(db),
    checkIns: new CheckInRepository(db),
    penalties: new PenaltyRepository(db),
    notifications: new NotificationRepository(db),
  };
}

/** Runs `work` in one database transaction; everything is rolled back on any error (A10). */
export function inTransaction<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
  return prisma.$transaction((tx) => work(repositoriesFor(tx)));
}

/** Repositories outside a transaction, for single reads. */
export const repos = repositoriesFor(prisma);

export { CheckInRepository, NotificationRepository, PenaltyRepository, ReservationRepository, ResourceRepository, UserRepository };
export type { AdminReservationWithRelations, ReservationWithRelations } from "./ReservationRepository.js";
export type { PenaltyWithUser } from "./PenaltyRepository.js";
