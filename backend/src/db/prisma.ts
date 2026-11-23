// Single PrismaClient for the whole process.
// Prisma ORM 7 talks to PostgreSQL through a driver adapter (node-postgres).
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy backend/.env.example to backend/.env.");
}

export const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
