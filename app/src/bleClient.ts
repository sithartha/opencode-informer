import { BleManager, type Characteristic, type Device } from "react-native-ble-plx"
import { DOORBELL_UUID, RENDEZVOUS_UUID, SERVICE_UUID } from "./contract"
import { parseDoorbell, parseRendezvous, type Rendezvous } from "./bleProtocol"

function decodeBase64(value: string): string {
  const globalAtob = (globalThis as { atob?: (input: string) => string }).atob
  if (typeof globalAtob === "function") return globalAtob(value)
  // Fallback: interpret as UTF-8 bytes when atob is unavailable.
  return value
}

/**
 * BLE central: discovers the Mac helper, reads the bridge rendezvous address, and
 * subscribes to doorbell notifications. The doorbell is a wake signal; details are
 * fetched over the LAN HTTP API.
 */
export class BleClient {
  private manager = new BleManager()
  private device: Device | null = null

  /** Called for each doorbell; consumers typically just refetch state. */
  onDoorbell: ((payload: Record<string, unknown> | null) => void) | null = null

  async findAndConnect(timeoutMs = 15000): Promise<{ device: Device; rendezvous: Rendezvous }> {
    const device = await this.scanForService(timeoutMs)
    const connected = await device.connect()
    this.device = connected
    await connected.discoverAllServicesAndCharacteristics()

    const rendezvousChar = await connected.readCharacteristicForService(SERVICE_UUID, RENDEZVOUS_UUID)
    const rendezvous = parseRendezvous(rendezvousChar.value ? decodeBase64(rendezvousChar.value) : null)
    if (!rendezvous) throw new Error("rendezvous unavailable")

    connected.monitorCharacteristicForService(SERVICE_UUID, DOORBELL_UUID, (error, characteristic) => {
      if (error || !characteristic?.value) {
        this.onDoorbell?.(null)
        return
      }
      this.onDoorbell?.(parseDoorbell(decodeBase64(characteristic.value)))
    })

    return { device: connected, rendezvous }
  }

  private scanForService(timeoutMs: number): Promise<Device> {
    return new Promise((resolve, reject) => {
      let settled = false
      const finish = (fn: () => void) => {
        if (settled) return
        settled = true
        this.manager.stopDeviceScan()
        fn()
      }
      const timer = setTimeout(() => finish(() => reject(new Error("ble scan timeout"))), timeoutMs)

      this.manager.startDeviceScan([SERVICE_UUID], null, (error, device) => {
        if (error) {
          clearTimeout(timer)
          finish(() => reject(error))
          return
        }
        if (device) {
          clearTimeout(timer)
          finish(() => resolve(device))
        }
      })
    })
  }

  async disconnect(): Promise<void> {
    try {
      await this.device?.cancelConnection()
    } finally {
      this.device = null
    }
  }

  destroy(): void {
    this.manager.destroy()
  }
}

// Referenced for typing only; keeps the import meaningful for consumers.
export type { Characteristic }
