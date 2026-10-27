const { DatabaseSync } = require("node:sqlite");
const { mkdirSync, chmodSync } = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

function openStore(filename = process.env.SQLITE_PATH || path.join(__dirname, "var", "real-life-connect.sqlite")) {
  if (filename !== ":memory:") mkdirSync(path.dirname(path.resolve(filename)), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  if (filename !== ":memory:") chmodSync(filename, 0o600);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;");
  const version = db.prepare("PRAGMA user_version").get().user_version;
  if (version > 1) { db.close(); throw new Error("Database schema is newer than this application."); }
  if (version === 0) {
    db.exec(`
      BEGIN IMMEDIATE;
      CREATE TABLE organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      ) STRICT;
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        name TEXT NOT NULL,
        email TEXT NOT NULL COLLATE NOCASE UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
        status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'active', 'suspended')),
        created_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX users_organization ON users(organization_id);
      PRAGMA user_version = 1;
      COMMIT;
    `);
  }
  function createSignup({ orgName, adminName, adminEmail, passwordHash }) {
    db.exec("BEGIN IMMEDIATE");
    try {
      if (db.prepare("SELECT id FROM users WHERE email = ?").get(adminEmail)) {
        const error = new Error("This email already has a signup. Use another email for testing.");
        error.status = 409;
        throw error;
      }
      const orgId = randomUUID(), userId = randomUUID(), now = new Date().toISOString();
      db.prepare("INSERT INTO organizations (id, name, created_at) VALUES (?, ?, ?)").run(orgId, orgName, now);
      db.prepare(`INSERT INTO users
        (id, organization_id, name, email, password_hash, role, created_at)
        VALUES (?, ?, ?, ?, ?, 'admin', ?)`).run(userId, orgId, adminName, adminEmail, passwordHash, now);
      db.exec("COMMIT");
      return { orgId, userId };
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  return { db, filename, createSignup, close: () => db.close() };
}
module.exports = { openStore };
