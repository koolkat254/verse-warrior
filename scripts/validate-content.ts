import { readFileSync } from 'node:fs';
import { parseCatalog } from '../src/domain/catalog';
const catalog = parseCatalog(
  JSON.parse(readFileSync(new URL('../src/content/catalog.json', import.meta.url), 'utf8')),
);
console.log(
  `Catalog ${catalog.contentVersion}: ${catalog.collections.length} collections, ${catalog.passages.length} passages. ${catalog.passages.length ? 'Valid.' : 'Empty by design; supply launch content before release.'}`,
);
