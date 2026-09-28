import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourcePath = resolve(root, 'lumen-commons.compact');
const manifestPath = resolve(root, 'managed', 'artifact-manifest.json');

if (!existsSync(manifestPath)) {
  console.error('Missing contract/managed/artifact-manifest.json. Compile the contract before publishing.');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const hash = createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
if (manifest.sourceSha256 !== hash) {
  console.error('Committed Compact artifact manifest does not match the contract source.');
  process.exit(1);
}

for (const relative of manifest.browserArtifacts ?? []) {
  if (!existsSync(resolve(root, relative))) {
    console.error(`Missing generated browser artifact: ${relative}`);
    process.exit(1);
  }
}
console.log(`Verified ${manifest.browserArtifacts.length} committed browser artifacts.`);

