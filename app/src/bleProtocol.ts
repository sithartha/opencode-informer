export interface Rendezvous {
  host: string
  port: number
}

/** Parse the helper's rendezvous characteristic value: "host:port". */
export function parseRendezvous(value?: string | null): Rendezvous | null {
  if (!value) return null
  const match = value.trim().match(/^([^:]+):(\d{1,5})$/)
  if (!match) return null
  const port = Number(match[2])
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return null
  return { host: match[1], port }
}

/** Parse a doorbell JSON payload (already base64-decoded). */
export function parseDoorbell(json: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(json)
    return value && typeof value === "object" ? (value as Record<string, unknown>) : null
  } catch {
    return null
  }
}
