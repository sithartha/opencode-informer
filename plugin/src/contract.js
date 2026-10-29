import { readFileSync } from "node:fs"
import { homedir } from "node:os"

let cached

/** Where issued pairing tokens live so a paired phone survives a bridge restart. */
export function defaultPairingStorePath() {
  const stateHome = process.env.XDG_STATE_HOME || `${process.env.HOME || homedir()}/.local/state`
  return `${stateHome}/open-island/pairing.json`
}

/** Load the shared wire contract (cached). */
export function loadContract() {
  if (!cached) {
    cached = JSON.parse(readFileSync(new URL("../../contract/contract.json", import.meta.url), "utf8"))
  }
  return cached
}

/** Resolve runtime configuration, allowing environment overrides. */
export function configFromEnv(env = process.env) {
  const contract = loadContract()
  const port = env.OPEN_ISLAND_MOBILE_PORT ? Number(env.OPEN_ISLAND_MOBILE_PORT) : contract.bridge.defaultPort
  const helperUrl =
    env.OPEN_ISLAND_HELPER_URL ||
    `http://${contract.helper.host}:${contract.helper.defaultPort}${contract.helper.ringPath}`
  const keepaliveMs = env.OPEN_ISLAND_MOBILE_KEEPALIVE_MS
    ? Number(env.OPEN_ISLAND_MOBILE_KEEPALIVE_MS)
    : 15000
  const applyTimeoutMs = env.OPEN_ISLAND_MOBILE_APPLY_TIMEOUT_MS
    ? Number(env.OPEN_ISLAND_MOBILE_APPLY_TIMEOUT_MS)
    : 10000
  return { host: contract.bridge.host, port, helperUrl, keepaliveMs, applyTimeoutMs, pairingStorePath: env.OPEN_ISLAND_MOBILE_PAIRING_FILE || defaultPairingStorePath() }
}
