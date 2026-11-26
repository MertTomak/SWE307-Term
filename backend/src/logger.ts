// Minimal structured logger (one JSON line per event, read by Render's log view).
// Never log passwords, tokens, door codes or request bodies (5.8.5.2 A09).
type Level = "info" | "warn" | "error";

function write(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  if (process.env.NODE_ENV === "test" && level !== "error") return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, fields?: Record<string, unknown>) => write("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => write("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => write("error", event, fields),
  /** Security events (A09): failed logins, 403, 429, failed check-ins, admin decisions. */
  security: (event: string, fields?: Record<string, unknown>) => write("warn", `security.${event}`, fields),
};
