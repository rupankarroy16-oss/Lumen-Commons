import { Buffer } from 'buffer'

// Midnight's browser-facing dependency graph still contains packages that
// reference Node's Buffer global directly. Install the browser implementation
// before any contract/proving module is loaded.
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer
}
