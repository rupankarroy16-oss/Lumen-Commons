import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, '..', 'lumen-commons.compact'), 'utf8');

const requirements = [
  ['private resident witness', /witness\s+localResidentCredential/],
  ['private admin witness', /witness\s+localAdminSecret/],
  ['response circuit', /export\s+circuit\s+submitResponse/],
  ['admin circuit', /export\s+circuit\s+closeCampaign/],
  ['nullifier set', /ledger\s+usedNullifiers:\s*Set/],
  ['replay guard', /!usedNullifiers\.member/],
  ['nullifier disclosure', /disclose\(nullifier\)/],
  ['local admin commitment derivation', /pure\s+circuit\s+deriveAdminCommitment/],
  ['public aggregate', /ledger\s+responseCount:\s*Counter/],
  ['deliberate disclosure', /disclose\(category\)/],
  ['local credential access', /localResidentCredential\(\)/],
];

const failures = requirements.filter(([, pattern]) => !pattern.test(source));
if (failures.length) {
  console.error(`Compact privacy validation failed: ${failures.map(([name]) => name).join(', ')}`);
  process.exit(1);
}

const forbidden = [
  /ledger\s+(age|district|holderSecret|privateNote)\b/i,
  /disclose\(credential\.(age|district|holderSecret)\)/,
];
if (forbidden.some((pattern) => pattern.test(source))) {
  console.error('Compact privacy validation found a forbidden private ledger field or disclosure.');
  process.exit(1);
}

console.log(`Compact privacy boundary validated (${requirements.length} invariants).`);
