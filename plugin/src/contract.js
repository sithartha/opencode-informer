import { readFileSync } from "node:fs"

let cached

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
  const apns = {
    keyPath: env.OPEN_ISLAND_APNS_KEY_PATH || "",
    keyId: env.OPEN_ISLAND_APNS_KEY_ID || "",
    teamId: env.OPEN_ISLAND_APNS_TEAM_ID || "",
    topic: env.OPEN_ISLAND_APNS_TOPIC || "ru.opencode.informer",
    production: env.OPEN_ISLAND_APNS_PRODUCTION ? env.OPEN_ISLAND_APNS_PRODUCTION !== "0" : true,
  }
  return { host: contract.bridge.host, port, helperUrl, keepaliveMs, applyTimeoutMs, apns }
}
