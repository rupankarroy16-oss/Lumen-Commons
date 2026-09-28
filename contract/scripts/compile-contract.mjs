import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'lumen-commons.compact');
const output = resolve(root, 'managed', 'lumen-commons');
mkdirSync(resolve(root, 'managed'), { recursive: true });

const version = spawnSync('compact', ['--version'], { shell: true, encoding: 'utf8' });
if (version.status !== 0) {
  console.error('Compact compiler not found. Install the official compiler, then rerun npm run contract:compile.');
  process.exit(1);
}

console.log(version.stdout.trim());
const compiled = spawnSync('compact', ['compile', source, output], {
  shell: true,
  encoding: 'utf8',
  stdio: 'inherit',
});
process.exit(compiled.status ?? 1);

