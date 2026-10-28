const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, rmSync, statSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { scryptSync } = require("node:crypto");
const { once } = require("node:events");
const { openStore } = require("../db");
const { hashPassword } = require("../passwords");
const { createApp } = require("../server");
const sample = { orgName: "Test Organization", adminName: "Test Admin", adminEmail: "admin@example.com", password: "Development-only-123!" };

function temporaryStore(t) {
  const directory = mkdtempSync(path.join(tmpdir(), "rlc-signup-"));
  const filename = path.join(directory, "accounts.sqlite");
  const store = openStore(filename);
  t.after(() => { try { store.close(); } catch {} rmSync(directory, { recursive: true, force: true }); });
  return store;
}

test("signup survives reopening the database; password is salted and verifiable", async t => {
  const store = temporaryStore(t);
  const hash = await hashPassword(sample.password);
  store.createSignup({ ...sample, passwordHash: hash });
  assert.notEqual(hash, sample.password);
  assert.notEqual(hash, await hashPassword(sample.password));
  const [algorithm, n, r, p, salt, key] = hash.split("$");
  assert.equal(algorithm, "scrypt");
  assert.equal(scryptSync(sample.password, salt, 64, { N: +n, r: +r, p: +p, maxmem: 128 * 1024 * 1024 }).toString("hex"), key);
  assert.equal(statSync(store.filename).mode & 0o777, 0o600);
  store.close();
  const reopened = openStore(store.filename);
  try {
    const row = reopened.db.prepare("SELECT * FROM users").get();
    assert.equal(row.email, sample.adminEmail);
    assert.equal(row.password_hash, hash);
    assert.equal(row.status, "pending_payment");
    assert.equal(reopened.db.prepare("SELECT name FROM organizations").get().name, sample.orgName);
    assert.equal(reopened.db.prepare("PRAGMA user_version").get().user_version, 3);
  } finally { reopened.close(); }
});

test("case-insensitive duplicates and insertion failures do not leave orphan organizations", t => {
  const store = temporaryStore(t);
  store.createSignup({ ...sample, passwordHash: "test-hash" });
  assert.throws(() => store.createSignup({ ...sample, adminEmail: "ADMIN@EXAMPLE.COM", passwordHash: "other-hash" }), error => error.status === 409);
  assert.throws(() => store.createSignup({ ...sample, adminEmail: "second@example.com", passwordHash: null }));
  assert.equal(store.db.prepare("SELECT COUNT(*) AS n FROM organizations").get().n, 1);
  assert.equal(store.db.prepare("SELECT COUNT(*) AS n FROM users").get().n, 1);
});

test("HTTP signup persists only valid requests and safely rejects simultaneous duplicate submissions", async t => {
  const store = temporaryStore(t);
  const server = createApp(store).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = "http://127.0.0.1:" + server.address().port + "/api/signup";
  const send = body => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  for (const bad of [{ ...sample, password: "short" }, { ...sample, adminEmail: "invalid" }, { ...sample, orgName: {} }, []]) {
    assert.equal((await send(bad)).status, 400);
  }
  const results = await Promise.all([send(sample), send({ ...sample, adminEmail: "ADMIN@example.com" })]);
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
  for (const response of results) {
    const text = await response.text();
    assert.ok(!text.includes(sample.password));
    assert.ok(!text.includes("scrypt$"));
  }
  assert.equal(store.db.prepare("SELECT COUNT(*) AS n FROM users").get().n, 1);
  assert.equal(store.db.prepare("SELECT COUNT(*) AS n FROM organizations").get().n, 1);
  const malformed = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(malformed.status, 400);
  const oversized = await send({ ...sample, orgName: "x".repeat(20000) });
  assert.equal(oversized.status, 413);
});

