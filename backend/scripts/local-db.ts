// Development-only PostgreSQL without Docker or a local install.
// Starts PGlite (PostgreSQL compiled to WebAssembly, with btree_gist) behind the
// PostgreSQL wire protocol so Prisma and the API can connect to it like a normal server.
//
//   npm run db:local                -> data kept in backend/.pglite
//   npm run db:local -- --memory    -> throw-away in-memory database
//
// Then in another terminal use:
//   DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable"
//   DB_POOL_MAX=1      (PGlite serves one connection at a time)
//
// Production and the live demo use a real PostgreSQL server.
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const memory = process.argv.includes("--memory");
const port = Number(process.env.LOCAL_DB_PORT ?? 5433);

const db = await PGlite.create({
  ...(memory ? {} : { dataDir: "./.pglite" }),
  extensions: { btree_gist },
});
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1" });
await server.start();
console.log(`Local PGlite PostgreSQL listening on 127.0.0.1:${port} (${memory ? "in-memory" : "./.pglite"})`);

const shutdown = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
