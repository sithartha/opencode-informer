import { baseUrl } from "./bridgeClient"
import { parseRendezvous } from "./bleProtocol"

/** Turn a user-entered "host:port" into a bridge base URL, or null if invalid. */
export function manualBase(value: string): string | null {
  const parsed = parseRendezvous(value)
  return parsed ? baseUrl(parsed.host, parsed.port) : null
}

/** Join separate address and port fields into "host:port", or null if invalid. */
export function joinHostPort(address: string, port: string): string | null {
  const host = address.trim()
  const portValue = port.trim()
  if (!host || !portValue) return null
  const value = `${host}:${portValue}`
  return parseRendezvous(value) ? value : null
}
