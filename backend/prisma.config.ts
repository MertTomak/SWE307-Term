// Prisma ORM 7 configuration for the CampusSlot backend.
// Prisma 7 no longer reads the connection URL from schema.prisma and no longer
// loads .env automatically, so both are handled here.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
