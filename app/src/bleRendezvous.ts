import { RENDEZVOUS_UUID, SERVICE_UUID } from "./contract"
import { parseRendezvous, type Rendezvous } from "./bleProtocol"

/** The slice of a connected BLE device needed to re-read the rendezvous. */
export interface RendezvousReader {
  readCharacteristicForService(serviceUUID: string, characteristicUUID: string): Promise<{ value: string | null }>
}

export function decodeBase64(value: string): string {
  const globalAtob = (globalThis as { atob?: (input: string) => string }).atob
  if (typeof globalAtob === "function") return globalAtob(value)
  // Fallback: interpret as UTF-8 bytes when atob is unavailable.
  return value
}

/**
 * Re-read the rendezvous over an existing link. Returns null when the link cannot
 * answer in time or the value is not a usable `host:port`, which means the caller
 * should reconnect and scan instead.
 */
export async function readRendezvousFromLink(reader: RendezvousReader, timeoutMs = 6000): Promise<Rendezvous | null> {
  let timer: ReturnType<typeof setTimeout> | null = null
  try {
    const characteristic = await Promise.race([
      reader.readCharacteristicForService(SERVICE_UUID, RENDEZVOUS_UUID),
      new Promise<null>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("ble timeout")), timeoutMs)
      }),
    ])
    if (!characteristic?.value) return null
    return parseRendezvous(decodeBase64(characteristic.value))
  } catch {
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export interface AdvertisementLike {
  serviceUUIDs?: string[] | null
  localName?: string | null
  name?: string | null
}

export const HELPER_LOCAL_NAME = "OpenCodeInformer"

/**
 * Decide whether a scanned peripheral is really the helper. Some iOS versions hand
 * unrelated peripherals to the scan listener despite the service filter (AirPods,
 * watches), so check the advertised service or local name before connecting.
 */
export function helperIdentity(device: AdvertisementLike): "service" | "name" | null {
  const service = SERVICE_UUID.toLowerCase()
  const services = (device.serviceUUIDs ?? []).map((uuid) => uuid.toLowerCase())
  if (services.includes(service)) return "service"
  const names = [device.localName, device.name].map((value) => (value ?? "").trim().toLowerCase())
  if (names.includes(HELPER_LOCAL_NAME.toLowerCase())) return "name"
  return null
}

export function hasHelperIdentity(device: AdvertisementLike): boolean {
  return helperIdentity(device) !== null
}

export function isHelperAdvertisement(device: AdvertisementLike): boolean {
  return hasHelperIdentity(device)
}
