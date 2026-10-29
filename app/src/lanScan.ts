import { CONTRACT } from "./contract"

/** Parse a dotted IPv4 address into a 32-bit integer, or null when invalid. */
export function ipv4ToInt(value: string): number | null {
  const parts = value.trim().split(".")
  if (parts.length !== 4) return null
  let result = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const octet = Number(part)
    if (octet < 0 || octet > 255) return null
    result = (result << 8) | octet
  }
  return result >>> 0
}

export function intToIpv4(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join(".")
}

/**
 * Host addresses to probe on the phone's own subnet. A mask wider than /24 is
 * narrowed to the /24 around `ip`, so a /16 network does not turn into 65k requests.
 * The phone's own address and network/broadcast addresses are excluded.
 */
export function ipv4Candidates(ip: string, subnet: string | null, limit = 254): string[] {
  const address = ipv4ToInt(ip)
  if (address === null) return []
  const mask = ipv4ToInt(subnet ?? "255.255.255.0") ?? 0xffffff00
  // Narrow to /24 when the network is larger; keep a narrower mask as is.
  const effectiveMask = ((mask & 0xffffff00) >>> 0) === 0xffffff00 ? mask : 0xffffff00
  // Bitwise operators return signed 32-bit values; coerce back to unsigned.
  const network = (address & effectiveMask) >>> 0
  const broadcast = (network | (~effectiveMask >>> 0)) >>> 0
  const candidates: string[] = []
  for (let value = network + 1; value < broadcast && candidates.length < limit; value++) {
    if (value === address) continue
    candidates.push(intToIpv4(value))
  }
  return candidates
}

export type FetchLike = typeof fetch

export interface BridgeCandidate {
  base: string
  /** True when the bridge accepted the stored token. */
  authorized: boolean
}

/**
 * Probe the given hosts for a bridge. A host that answers `/state` with 200 is the
 * paired computer; a host that answers 401 is a bridge that does not accept the
 * stored token, which the caller may offer as a pairing target. Timeouts and other
 * responses are skipped.
 */
export async function findBridge(
  hosts: string[],
  token: string,
  fetchImpl: FetchLike = fetch,
  options: { port?: number; timeoutMs?: number; concurrency?: number } = {},
): Promise<BridgeCandidate | null> {
  const port = options.port ?? CONTRACT.bridge.defaultPort
  const timeoutMs = options.timeoutMs ?? 800
  const concurrency = Math.max(1, options.concurrency ?? 32)

  let next = 0
  let found: BridgeCandidate | null = null
  let unauthorized: string | null = null

  const probe = async (host: string): Promise<void> => {
    if (found) return
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null
    try {
      const response = await fetchImpl(`http://${host}:${port}${CONTRACT.endpoints.state}`, {
        headers: { Authorization: `Bearer ${token}` },
        ...(controller ? { signal: controller.signal } : {}),
      })
      if (response.status === 200 && !found) found = { base: `http://${host}:${port}`, authorized: true }
      else if (response.status === 401 && !unauthorized) unauthorized = `http://${host}:${port}`
    } catch {
      // Unreachable, timed out, or not a bridge.
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  const worker = async (): Promise<void> => {
    while (!found) {
      const index = next++
      if (index >= hosts.length) return
      await probe(hosts[index])
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, hosts.length) }, () => worker()))
  return found ?? (unauthorized ? { base: unauthorized, authorized: false } : null)
}
