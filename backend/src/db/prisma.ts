// Single PrismaClient for the whole process (Singleton, 5.7 P5).
// Prisma ORM 7 talks to PostgreSQL through a driver adapter (node-postgres).
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy backend/.env.example to backend/.env.");
}

// Optional pool size. Only needed for the local PGlite database (DB_POOL_MAX=1).
const max = process.env.DB_POOL_MAX ? Number(process.env.DB_POOL_MAX) : undefined;

export const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, ...(max ? { max } : {}) }) });

/** The Prisma client or an open transaction; repositories accept both. */
export type Db = Prisma.TransactionClient;
