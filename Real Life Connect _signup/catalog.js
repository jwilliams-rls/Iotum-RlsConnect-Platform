const ids = ['basic', 'plus', 'pro'];
function validateCatalog(c) {
  const fail = () => { throw new Error('Invalid catalog. Check prices, plan IDs, features, quantities and usage rates.'); };
  const integer = (v, min = 0, max = 1000000000) => Number.isSafeInteger(v) && v >= min && v <= max;
  const text = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 200;
  const optionalPrice = v => v === null || integer(v);
  if (!c || c.currency !== 'USD' || !integer(c.organizationUserSupplierCents) || !integer(c.organizationUserCents) || !integer(c.usersPerSharedRoom, 1, 1000) || c.webinarDays !== 7) fail();
  if (!Array.isArray(c.plans) || c.plans.length !== 3 || c.plans.some((p, i) => !p || p.id !== ids[i] || !text(p.name) || !text(p.code) || !integer(p.priceCents) || !integer(p.supplierMonthlyCents) || !integer(p.participants, 1))) fail();
  if (!Array.isArray(c.features) || !c.features.length || c.features.length > 200 || c.features.some(row => !Array.isArray(row) || row.length !== 4 || !text(row[0]) || row.slice(1).some(v => !(v === null || typeof v === 'boolean' || text(v) || integer(v))))) fail();
  if (new Set(c.features.map(row => row[0])).size !== c.features.length) fail();
  const participants = c.features.find(row => row[0] === 'Meeting participants');
  if (!participants || c.plans.some((p, i) => participants[i + 1] !== p.participants)) fail();
  if (!Array.isArray(c.webinars) || c.webinars.length !== 4 || c.webinars.some((p, i) => !p || p.participants !== [500, 1000, 3000, 5000][i] || p.id !== `webinar_${p.participants}` || !optionalPrice(p.priceCents) || !integer(p.supplierMonthlyCents))) fail();
  if (!Array.isArray(c.usageRates) || c.usageRates.length > 100 || c.usageRates.some(r => !r || !text(r.id) || !text(r.unit) || !integer(r.supplierMicroUsd) || !optionalPrice(r.priceMicroUsd))) fail();
  if (new Set(c.usageRates.map(r => r.id)).size !== c.usageRates.length || typeof c.supplierNotes !== 'string' || c.supplierNotes.length > 5000) fail();
}
function readCatalog(db) {
  const row = db.prepare('SELECT * FROM catalog_versions ORDER BY revision DESC LIMIT 1').get();
  return { revision: row.revision, updatedAt: row.updated_at, catalog: JSON.parse(row.document) };
}
function saveCatalog(db, envelope) {
  if (!envelope || !Number.isSafeInteger(envelope.revision)) throw new Error('A catalog revision is required. Export the catalog first.');
  validateCatalog(envelope.catalog);
  db.exec('BEGIN IMMEDIATE');
  try {
    if (readCatalog(db).revision !== envelope.revision) throw new Error('Catalog changed since export. Export it again before editing.');
    const revision = envelope.revision + 1;
    db.prepare('INSERT INTO catalog_versions VALUES (?, ?, ?)').run(revision, JSON.stringify(envelope.catalog), new Date().toISOString());
    db.exec('COMMIT');
    return revision;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
function publicCatalog(db) {
  const { revision, catalog: c } = readCatalog(db);
  // Explicit allowlist: wholesale costs and supplier notes never enter this response.
  return { revision, currency: c.currency, organizationUserCents: c.organizationUserCents, usersPerSharedRoom: c.usersPerSharedRoom,
    plans: c.plans.map(p => ({ id: p.id, name: p.name, code: p.code, price: p.priceCents / 100, participants: p.participants })), features: c.features };
}
module.exports = { validateCatalog, readCatalog, saveCatalog, publicCatalog };
