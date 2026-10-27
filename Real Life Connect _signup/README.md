# Real Life Connect signup backend

Development-only signup persistence. Stripe payment, Iotum provisioning, login sessions, email verification and room reservations are not implemented yet. A saved signup remains `pending_payment`, not an active subscription.

## Run in Codespaces

Use Node.js 22.16 or later (Node 24 recommended). This uses Node's built-in SQLite module and may display an ExperimentalWarning on supported Node releases; no separate SQLite service is needed.

```bash
node --version
npm ci
npm start
```

The backend listens on 127.0.0.1:4001. Run Vite in the sibling frontend folder and use its existing /api proxy. Do not publicly forward port 4001.

## Storage

The default database is `var/real-life-connect.sqlite` relative to this backend folder, independently of the shell's current directory. It persists across server and Codespace restarts, but deleting the Codespace deletes its local data. Production must use durable local storage. Do not put this file in a public web directory, Git, or a multi-server shared filesystem.

Optionally set `SQLITE_PATH` in the server environment to an absolute private file path. The application creates organizations and users on first start, with a versioned schema, foreign keys, unique case-insensitive email addresses, and atomic signup transactions. Passwords use salted scrypt hashes; raw passwords are never stored or returned. Existing in-memory prototype signups cannot be migrated because they were never saved.

Only development signup exists: there is no unauthenticated endpoint to browse user records, password hashes, or database files. Use fictional data. Production hardening (authentication, verification, abuse protection, audit trail and deployment configuration) is still required.

## Back up and restore

```bash
npm run backup
```

This creates a consistent SQLite snapshot under `backups/`, even while the application is running. No automatic schedule or off-host copy is configured yet. Backups contain sensitive account data; protect them and copy them to private durable storage before deleting a Codespace.

To restore: stop the backend, preserve the current database and any `-wal`/`-shm` companions together in a separate location, then copy the chosen snapshot to the configured SQLite path (with no old companions at that path). Restrict permissions and restart. Never copy just a live main database file as a substitute for the backup command.

## Verify

```bash
npm test
```

Tests use temporary databases and check restart persistence, password hashing, case-insensitive duplicate handling, atomic rollback and request validation. No Stripe or Iotum calls are made.

Subscriptions, package selections, room assignments, calendar conflict checks and meeting notifications will be added in later schema migrations.
