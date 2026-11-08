import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSON_SCHEMA_TARGETS, renderJsonSchemaFile } from '../src/json-schemas';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'schemas');
mkdirSync(outDir, { recursive: true });
for (const target of JSON_SCHEMA_TARGETS) {
  writeFileSync(join(outDir, target.file), renderJsonSchemaFile(target), 'utf8');
  console.log(`wrote schemas/${target.file}`);
}
