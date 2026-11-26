// UC-08 View Usage Reports (E20, E21) and the penalty list (E22).
import type { ResourceType } from "@prisma/client";
import { env } from "../config/env.js";
import { REPORTED_STATUSES, usageFigures } from "../domain/reports.js";
import { campusDay, daysInPeriod } from "../domain/time.js";
import { repos as defaultRepos, type Repositories } from "../repositories/index.js";

export class ReportService {
  constructor(private readonly r: Repositories = defaultRepos) {}

  /** E20: occupancy and no-show rate per resource for [from 00:00, to 24:00] in Europe/Istanbul (5.8.4.10). */
  async usage(from: string, to: string, type?: ResourceType) {
    const start = campusDay(from).start;
    const end = campusDay(to).end;
    const [resources, reservations] = await Promise.all([
      this.r.resources.findAll(type),
      this.r.reservations.findStartingBetween(start, end, REPORTED_STATUSES, type),
    ]);
    const days = daysInPeriod(from, to);
    const openingHours = env().REPORT_OPENING_HOURS_PER_DAY; // API-A8
    const rows = resources.map((resource) => ({
      resource: { id: resource.id, name: resource.name, type: resource.type },
      ...usageFigures(
        reservations.filter((r) => r.resourceId === resource.id),
        days,
        openingHours,
      ),
    }));
    return { from, to, rows };
  }

  /** E21: users with no-shows in the period, most no-shows first. */
  async noShows(from: string, to: string, page: number, pageSize: number) {
    const groups = await this.r.reservations.noShowsByUser(campusDay(from).start, campusDay(to).end);
    const sorted = groups
      .map((g) => ({ userId: g.userId, noShowCount: g._count._all, lastNoShowAt: g._max.startTime! }))
      .sort(
        (a, b) =>
          b.noShowCount - a.noShowCount ||
          b.lastNoShowAt.getTime() - a.lastNoShowAt.getTime() ||
          a.userId.localeCompare(b.userId),
      );
    const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);
    const users = new Map((await this.r.users.findManyByIds(pageRows.map((row) => row.userId))).map((u) => [u.id, u]));
    return {
      total: sorted.length,
      items: pageRows.map((row) => ({ user: users.get(row.userId)!, noShowCount: row.noShowCount, lastNoShowAt: row.lastNoShowAt })),
    };
  }

  /** E22: running penalties (default) or all penalties, latest end first. */
  penalties(activeOnly: boolean, now: Date, page: number, pageSize: number) {
    return this.r.penalties.list(activeOnly, now, (page - 1) * pageSize, pageSize);
  }
}
