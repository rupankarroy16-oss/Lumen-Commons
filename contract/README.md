# Lumen Commons Compact contract

The contract targets Compact language `0.23` and Midnight.js `4.1.x` on Preview
and Preprod. Run `npm run contract:validate` for the fast privacy-boundary check.
Run `npm run contract:compile` with the official `compact` binary installed to
regenerate ZK artifacts under `contract/managed/lumen-commons`.

Generated prover/verifier keys and ZKIR are intentionally ignored because they
are large and compiler-specific. The browser-safe contract module and artifact
manifest must be committed after compilation; CI checks their source hash.

