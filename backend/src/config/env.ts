// Reads and checks the environment variables once. A missing or weak value stops
// the server at start-up with a clear message (A02, A04).
import "dotenv/config";
import { z } from "zod";

const boolean = z.enum(["true", "false"]).transform((v) => v === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is not set"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters (5.8.5.4)"),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  SCHEDULER_ENABLED: boolean.default(true),
  /** API-A8: daily opening hours for the occupancy rate. Default 12 (08:00-20:00) until H08 is answered. */
  REPORT_OPENING_HOURS_PER_DAY: z.coerce.number().positive().max(24).default(12),
  /** Number of proxies in front of the server (Render: 1), so rate limits see the client IP. */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration (see backend/.env.example):\n${problems}`);
  }
  cached = parsed.data;
  return cached;
}
