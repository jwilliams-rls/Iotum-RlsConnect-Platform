const { DatabaseSync, backup } = require("node:sqlite");
const { mkdirSync, existsSync, chmodSync } = require("node:fs");
const path = require("node:path");
(async () => {
  process.umask(0o077);
  const source = path.resolve(process.env.SQLITE_PATH || path.join(__dirname, "var", "real-life-connect.sqlite"));
  if (!existsSync(source)) throw new Error("No database exists yet. Start the server and submit a test signup first.");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destination = path.join(__dirname, "backups", `real-life-connect-${stamp}.sqlite`);
  mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(source, { readOnly: true });
  try { await backup(db, destination); chmodSync(destination, 0o600); }
  finally { db.close(); }
  console.log("Database backup created:", destination);
})().catch(() => { console.error("Backup failed. Check the database path and directory permissions."); process.exitCode = 1; });
