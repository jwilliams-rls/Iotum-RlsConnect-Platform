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
  if (version > 14) { db.close(); throw new Error("Database schema is newer than this application."); }
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
  if (version < 2) {
    try {
      db.exec(`BEGIN IMMEDIATE;
        CREATE TABLE catalog_versions (
          revision INTEGER PRIMARY KEY,
          document TEXT NOT NULL CHECK(json_valid(document)),
          updated_at TEXT NOT NULL
        ) STRICT;`);
      db.prepare("INSERT INTO catalog_versions VALUES (1, ?, ?)").run(
        JSON.stringify(require("./catalog-seed.json")), new Date().toISOString());
      db.exec("PRAGMA user_version = 2; COMMIT;");
    } catch (error) { db.exec("ROLLBACK"); db.close(); throw error; }
  }
  if (version < 3) {
    // Correct the original unspecified Basic value without replacing operator edits.
    db.exec("BEGIN IMMEDIATE");
    try {
      const current = db.prepare("SELECT * FROM catalog_versions ORDER BY revision DESC LIMIT 1").get();
      const catalog = JSON.parse(current.document);
      const camera = catalog.features.find(row => row[0] === "Share second camera");
      if (camera && camera[1] === null) {
        camera[1] = false;
        db.prepare("INSERT INTO catalog_versions VALUES (?, ?, ?)").run(
          current.revision + 1, JSON.stringify(catalog), new Date().toISOString());
      }
      db.exec("PRAGMA user_version = 3; COMMIT;");
    } catch (error) { db.exec("ROLLBACK"); db.close(); throw error; }
  }
  if (version < 4) {
    // Apply the owner's Basic boundary; preserve all other catalog fields.
    db.exec("BEGIN IMMEDIATE");
    try {
      const current = db.prepare("SELECT * FROM catalog_versions ORDER BY revision DESC LIMIT 1").get();
      const catalog = JSON.parse(current.document);
      const boundary = catalog.features.findIndex(row => row[0] === "Audio recording");
      if (boundary < 0) throw new Error("Catalog is missing the Audio recording feature.");
      let changed = false;
      for (const row of catalog.features.slice(boundary + 1)) {
        if (row[1] !== false) { row[1] = false; changed = true; }
      }
      if (changed) db.prepare("INSERT INTO catalog_versions VALUES (?, ?, ?)").run(
        current.revision + 1, JSON.stringify(catalog), new Date().toISOString());
      db.exec("PRAGMA user_version = 4; COMMIT;");
    } catch (error) { db.exec("ROLLBACK"); db.close(); throw error; }
  }
  if (version < 5) {
    db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE iotum_provisioning (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
        organization_id TEXT NOT NULL UNIQUE REFERENCES organizations(id),
        state TEXT NOT NULL CHECK(state IN ('prepared','company_creating','company_created','host_creating','review_required','ready_test')),
        draft TEXT NOT NULL CHECK(json_valid(draft)),
        company_id INTEGER UNIQUE,
        host_id INTEGER UNIQUE,
        meeting_url TEXT,
        updated_at TEXT NOT NULL
      ) STRICT;
      PRAGMA user_version = 5;
      COMMIT;`);
  }
  if (version < 6) {
    db.exec(`BEGIN IMMEDIATE;
      ALTER TABLE organizations ADD COLUMN kind TEXT NOT NULL DEFAULT 'organization' CHECK(kind IN ('personal','organization'));
      UPDATE organizations SET kind = 'personal' WHERE name = 'Individual account';
      UPDATE organizations SET
        name = (SELECT json_extract(p.draft, '$.companyName') FROM iotum_provisioning p WHERE p.organization_id = organizations.id AND p.state = 'ready_test'),
        kind = 'organization'
        WHERE kind = 'personal' AND id IN (SELECT organization_id FROM iotum_provisioning WHERE state = 'ready_test' AND json_extract(draft, '$.companyName') != 'Individual account');
      CREATE TABLE memberships (
        user_id TEXT NOT NULL REFERENCES users(id),
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        role TEXT NOT NULL CHECK(role IN ('admin','member')),
        PRIMARY KEY(user_id, organization_id)
      ) STRICT;
      INSERT INTO memberships SELECT id, organization_id, role FROM users;
      CREATE TABLE sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        created_at INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      ) STRICT;
      CREATE TABLE login_attempts (email_hash TEXT NOT NULL, attempted_at INTEGER NOT NULL) STRICT;
      CREATE INDEX login_attempts_email ON login_attempts(email_hash);
      CREATE TABLE rooms (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        name TEXT NOT NULL,
        plan TEXT NOT NULL CHECK(plan IN ('plus','pro')),
        status TEXT NOT NULL CHECK(status IN ('pending','active','suspended'))
      ) STRICT;
      CREATE TABLE room_assignments (
        room_id TEXT NOT NULL REFERENCES rooms(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        PRIMARY KEY(room_id, user_id)
      ) STRICT;
      PRAGMA user_version = 6;
      COMMIT;`);
  }
  if (version < 7) {
    db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE meeting_handoffs (
        ticket_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        session_hash TEXT NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE,
        provisioning_id TEXT NOT NULL REFERENCES iotum_provisioning(id),
        expires_at INTEGER NOT NULL,
        used_at INTEGER
      ) STRICT;
      CREATE INDEX meeting_handoffs_user ON meeting_handoffs(user_id);
      PRAGMA user_version = 7;
      COMMIT;`);
  }
  if (version < 8) {
    db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE room_calendar_settings (
        room_id TEXT PRIMARY KEY REFERENCES rooms(id),
        max_minutes INTEGER NOT NULL DEFAULT 120 CHECK(max_minutes BETWEEN 15 AND 480),
        mode TEXT NOT NULL DEFAULT 'local_test' CHECK(mode = 'local_test')
      ) STRICT;
      CREATE TABLE room_reservations (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL REFERENCES room_calendar_settings(room_id),
        user_id TEXT NOT NULL REFERENCES users(id),
        title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
        starts_at INTEGER NOT NULL,
        ends_at INTEGER NOT NULL CHECK(ends_at > starts_at),
        created_at TEXT NOT NULL,
        cancelled_at TEXT
      ) STRICT;
      CREATE INDEX reservations_room_time ON room_reservations(room_id, starts_at, ends_at);
      CREATE TRIGGER reservation_no_overlap BEFORE INSERT ON room_reservations
      WHEN NEW.cancelled_at IS NULL AND EXISTS (
        SELECT 1 FROM room_reservations WHERE room_id = NEW.room_id AND cancelled_at IS NULL
        AND starts_at < NEW.ends_at AND ends_at > NEW.starts_at)
      BEGIN SELECT RAISE(ABORT, 'Room time is already reserved'); END;
      CREATE TRIGGER room_assignment_rules BEFORE INSERT ON room_assignments
      WHEN (SELECT plan FROM rooms WHERE id = NEW.room_id) != 'pro'
        OR (SELECT count(*) FROM room_assignments WHERE room_id = NEW.room_id) >= 10
        OR NOT EXISTS (SELECT 1 FROM memberships m JOIN rooms r ON r.organization_id = m.organization_id
          WHERE r.id = NEW.room_id AND m.user_id = NEW.user_id)
      BEGIN SELECT RAISE(ABORT, 'Invalid shared Pro room assignment'); END;
      PRAGMA user_version = 8;
      COMMIT;`);
  }
  if (version < 9) {
    // Multiple members may map to the same company. Keep host and user IDs unique.
    // Only short-lived handoff tickets are cleared while rebuilding their parent table.
    db.exec(`BEGIN IMMEDIATE;
      DROP TABLE meeting_handoffs;
      CREATE TABLE iotum_provisioning_next (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        state TEXT NOT NULL CHECK(state IN ('prepared','company_creating','company_created','host_creating','review_required','ready_test')),
        draft TEXT NOT NULL CHECK(json_valid(draft)),
        company_id INTEGER,
        host_id INTEGER UNIQUE,
        meeting_url TEXT,
        updated_at TEXT NOT NULL
      ) STRICT;
      INSERT INTO iotum_provisioning_next SELECT * FROM iotum_provisioning;
      DROP TABLE iotum_provisioning;
      ALTER TABLE iotum_provisioning_next RENAME TO iotum_provisioning;
      CREATE INDEX provisioning_company ON iotum_provisioning(company_id);
      CREATE INDEX provisioning_organization ON iotum_provisioning(organization_id);
      CREATE TABLE meeting_handoffs (
        ticket_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        session_hash TEXT NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE,
        provisioning_id TEXT NOT NULL REFERENCES iotum_provisioning(id),
        expires_at INTEGER NOT NULL,
        used_at INTEGER
      ) STRICT;
      CREATE INDEX meeting_handoffs_user ON meeting_handoffs(user_id);
      CREATE TABLE room_provider_links (
        room_id TEXT PRIMARY KEY REFERENCES room_calendar_settings(room_id),
        company_id INTEGER NOT NULL,
        host_id INTEGER NOT NULL UNIQUE,
        email TEXT NOT NULL,
        subdomain TEXT NOT NULL,
        verified_at TEXT NOT NULL
      ) STRICT;
      PRAGMA user_version = 9;
      COMMIT;`);
  }
  if (version < 10) {
    db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE room_user_permissions (
        room_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        live_streaming INTEGER NOT NULL DEFAULT 0 CHECK(live_streaming IN (0,1)),
        youtube_streaming INTEGER NOT NULL DEFAULT 0 CHECK(youtube_streaming IN (0,1)),
        PRIMARY KEY(room_id, user_id),
        FOREIGN KEY(room_id, user_id) REFERENCES room_assignments(room_id, user_id) ON DELETE CASCADE
      ) STRICT;
      PRAGMA user_version = 10;
      COMMIT;`);
  }
  if (version < 11) {
    db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE room_meeting_options (
        reservation_id TEXT PRIMARY KEY REFERENCES room_reservations(id) ON DELETE CASCADE,
        mute_mode TEXT NOT NULL DEFAULT 'conversation' CHECK(mute_mode IN ('conversation','q&a','presentation')),
        security_pin TEXT CHECK(security_pin IS NULL OR (length(security_pin) BETWEEN 4 AND 12 AND security_pin NOT GLOB '*[^0-9]*')),
        revision INTEGER NOT NULL DEFAULT 1
      ) STRICT;
      PRAGMA user_version = 11;
      COMMIT;`);
  }
  if (version < 12) {
    db.exec(`BEGIN IMMEDIATE;
      ALTER TABLE room_meeting_options ADD COLUMN description TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 2000);
      PRAGMA user_version = 12;
      COMMIT;`);
  }
  if (version < 13) {
    db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE departments (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        name TEXT NOT NULL COLLATE NOCASE CHECK(length(trim(name)) BETWEEN 1 AND 80),
        created_at TEXT NOT NULL,
        UNIQUE(organization_id, name),
        UNIQUE(id, organization_id)
      ) STRICT;
      CREATE INDEX departments_organization ON departments(organization_id);
      ALTER TABLE memberships ADD COLUMN department_id TEXT REFERENCES departments(id);
      PRAGMA user_version = 13;
      COMMIT;`);
  }
  if (version < 14) {
    db.exec(`BEGIN IMMEDIATE;
      ALTER TABLE room_meeting_options ADD COLUMN project_reference TEXT NOT NULL DEFAULT '' CHECK(length(project_reference) <= 160);
      ALTER TABLE room_meeting_options ADD COLUMN customer_reference TEXT NOT NULL DEFAULT '' CHECK(length(customer_reference) <= 160);
      PRAGMA user_version = 14;
      COMMIT;`);
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
      db.prepare("INSERT INTO organizations (id, name, created_at, kind) VALUES (?, ?, ?, ?)").run(orgId, orgName, now, orgName === "Individual account" ? "personal" : "organization");
      db.prepare(`INSERT INTO users
        (id, organization_id, name, email, password_hash, role, created_at)
        VALUES (?, ?, ?, ?, ?, 'admin', ?)`).run(userId, orgId, adminName, adminEmail, passwordHash, now);
      db.prepare("INSERT INTO memberships VALUES (?, ?, 'admin')").run(userId, orgId);
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

