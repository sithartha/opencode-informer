import { baseUrl } from "./bridgeClient"
import { parseRendezvous } from "./bleProtocol"

/** Turn a user-entered "host:port" into a bridge base URL, or null if invalid. */
export function manualBase(value: string): string | null {
  const parsed = parseRendezvous(value)
  return parsed ? baseUrl(parsed.host, parsed.port) : null
}
