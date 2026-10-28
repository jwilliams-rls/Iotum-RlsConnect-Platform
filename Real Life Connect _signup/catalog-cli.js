// Local operator command only; no public catalog-write endpoint.
const fs = require('node:fs');
const { openStore } = require('./db');
const { readCatalog, saveCatalog } = require('./catalog');
process.umask(0o077);
let store;
try {
  const [action, filename] = process.argv.slice(2);
  if (!['export', 'import'].includes(action) || !filename) throw new Error('Usage: npm run catalog -- export|import /private/path/catalog.json');
  store = openStore();
  if (action === 'export') {
    fs.writeFileSync(filename, JSON.stringify(readCatalog(store.db), null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log('Catalog exported. Edit catalog values, keeping revision unchanged.');
  } else {
    if (fs.statSync(filename).size > 262144) throw new Error('Catalog file is too large.');
    const revision = saveCatalog(store.db, JSON.parse(fs.readFileSync(filename, 'utf8')));
    console.log(`Catalog saved as revision ${revision}. Refresh the website to load it.`);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { store?.close(); }
