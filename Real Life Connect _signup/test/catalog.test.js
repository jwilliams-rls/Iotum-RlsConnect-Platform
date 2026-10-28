const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { openStore } = require('../db');
const { readCatalog, saveCatalog, publicCatalog } = require('../catalog');
const { createApp } = require('../server');

test('catalog edits survive reopening without reseeding or losing signups', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'rlc-catalog-'));
  const filename = path.join(dir, 'db.sqlite');
  let store;
  try {
    store = openStore(filename);
    store.createSignup({ orgName: 'Example', adminName: 'Admin', adminEmail: 'catalog@example.test', passwordHash: 'fixture' });
    const envelope = readCatalog(store.db);
    assert.equal(envelope.catalog.plans[0].supplierMonthlyCents, 299);
    assert.equal(envelope.catalog.webinars[0].priceCents, null);
    envelope.catalog.plans[0].priceCents = 899;
    envelope.catalog.plans[0].supplierMonthlyCents = 349;
    envelope.catalog.features[1][1] = false;
    saveCatalog(store.db, envelope);
    assert.throws(() => saveCatalog(store.db, envelope), /changed since export/);
    store.close(); store = openStore(filename);
    assert.equal(readCatalog(store.db).catalog.plans[0].supplierMonthlyCents, 349);
    assert.equal(publicCatalog(store.db).plans[0].price, 8.99);
    assert.equal(publicCatalog(store.db).features[1][1], false);
    assert.equal(store.db.prepare('SELECT count(*) n FROM users').get().n, 1);
    assert.equal(store.db.prepare('SELECT count(*) n FROM catalog_versions').get().n, 2);
  } finally { store?.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('version-one databases migrate without changing existing users', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'rlc-migration-'));
  const filename = path.join(dir, 'db.sqlite');
  const db = new DatabaseSync(filename);
  db.exec("CREATE TABLE organizations(id TEXT PRIMARY KEY, name TEXT, created_at TEXT); CREATE TABLE users(id TEXT PRIMARY KEY, email TEXT); INSERT INTO users VALUES ('existing', 'existing@example.test'); PRAGMA user_version = 1;");
  db.close();
  const store = openStore(filename);
  try {
    assert.equal(store.db.prepare('PRAGMA user_version').get().user_version, 2);
    assert.equal(store.db.prepare('SELECT email FROM users').get().email, 'existing@example.test');
    assert.equal(readCatalog(store.db).revision, 1);
    for (const mutate of [c => c.plans[0].priceCents = -1, c => c.usageRates[0].priceMicroUsd = 0.5, c => c.features[0][1] = 999]) {
      const envelope = readCatalog(store.db); mutate(envelope.catalog);
      assert.throws(() => saveCatalog(store.db, envelope), /Invalid catalog/);
      assert.equal(readCatalog(store.db).revision, 1);
    }
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('public catalog exposes retail data without supplier costs or edit access', async () => {
  const store = openStore(':memory:');
  const server = createApp(store).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(base + '/api/catalog');
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.organizationUserCents, 599);
    assert.equal(body.plans[0].price, 7.99);
    assert.doesNotMatch(JSON.stringify(body), /supplier|MicroUsd|webinars/i);
    assert.equal((await fetch(base + '/api/catalog', { method: 'POST' })).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); store.close(); }
});
