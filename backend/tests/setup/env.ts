// Runs in every test file before the application code is imported.
// The application must never see the developer's real DATABASE_URL from .env.
import { NO_TEST_DB_URL, testDatabaseUrl } from "./test-db-url.js";

process.env.DATABASE_URL = testDatabaseUrl() ?? NO_TEST_DB_URL;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET ??= "test-only-jwt-secret-0123456789abcdef0123456789abcdef";
process.env.CORS_ORIGIN ??= "http://localhost:5173";
