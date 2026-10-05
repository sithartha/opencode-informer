// OpenCode plugin entry for the mobile bridge.
//
// The heavy lifting lives in src/bridge.js so the model, HTTP/SSE server, and
// resolution logic stay unit-testable without an OpenCode context.
import { appendFileSync } from "node:fs"

// Bump this when the entry changes so a content-hash cache re-imports the
// module graph (imported src files may otherwise be served from cache).
const ENTRY_VERSION = "2026-10-06.6"
try {
  appendFileSync("/tmp/open-island-mobile-debug.log", `[${new Date().toISOString()}] entry loaded v${ENTRY_VERSION}\n`)
} catch {
  /* ignore */
}

import { setup } from "./src/bridge.js"

export default {
  id: "open-island-mobile",
  setup,
}
