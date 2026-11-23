// Single PrismaClient for the whole process.
// Prisma ORM 7 talks to PostgreSQL through a driver adapter (node-postgres).
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export function createPrismaClient(connectionString = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy backend/.env.example to backend/.env.");
  }
  const max = Number(process.env.DB_POOL_MAX ?? 10);
  const adapter = new PrismaPg({ connectionString, max });
  return new PrismaClient({ adapter });
}

export const prisma = createPrismaClient();
