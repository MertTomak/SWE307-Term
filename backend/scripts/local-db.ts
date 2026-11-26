// Development-only PostgreSQL without Docker or a local install.
// Starts PGlite (PostgreSQL 17 compiled to WebAssembly, with btree_gist) behind the
// PostgreSQL wire protocol, so Prisma, the API and the tests connect to it like a
// normal server. Production, CI and the live demo use a real PostgreSQL server.
//
//   npm run db:local                                   data kept in backend/.pglite
//   npm run db:local -- --memory                       throw-away database
//   npm run db:local -- --memory --database campusslot_test --port 5434
//                                                       throw-away test database (npm test)
//
// PGlite runs every connection on one PostgreSQL session, so set DB_POOL_MAX=1
// in the app that connects to it.
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const memory = process.argv.includes("--memory");
const database = arg("--database") ?? "postgres";
const port = Number(arg("--port") ?? process.env.LOCAL_DB_PORT ?? 5433);

// A named database must be created first, so PGlite always gets a data directory;
// for --memory it is a temporary one that is deleted on exit.
const dataDir = memory ? mkdtempSync(join(tmpdir(), "campusslot-pglite-")) : "./.pglite";

if (database !== "postgres") {
  const isNew = memory || !existsSync(join(dataDir, "PG_VERSION"));
  const admin = await PGlite.create({ dataDir });
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
  if (exists.rows.length === 0) await admin.exec(`CREATE DATABASE "${database.replace(/"/g, "")}"`);
  await admin.close();
  if (isNew) console.log(`Created database ${database}`);
}

const db = await PGlite.create({ dataDir, database, extensions: { btree_gist } });
// Accept many clients (each test file opens its own pool); queries are queued on the one session.
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 100 });
await server.start();
console.log(`Local PGlite PostgreSQL on 127.0.0.1:${port}, database "${database}" (${memory ? "in-memory" : dataDir})`);
console.log(`DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:${port}/${database}?sslmode=disable"`);

const shutdown = async () => {
  await server.stop();
  await db.close();
  if (memory) rmSync(dataDir, { recursive: true, force: true });
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
