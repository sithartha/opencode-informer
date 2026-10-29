import { BleManager, State, type Characteristic, type Device } from "react-native-ble-plx"
import { DOORBELL_UUID, RENDEZVOUS_UUID, SERVICE_UUID } from "./contract"
import { parseDoorbell, parseRendezvous, type Rendezvous } from "./bleProtocol"
import { decodeBase64, hasHelperIdentity, helperIdentity, readRendezvousFromLink } from "./bleRendezvous"

/** A user-facing reason Bluetooth cannot be used right now. */
export function bluetoothUnavailableMessage(state: State): string {
  switch (state) {
    case State.Unauthorized:
      return "Bluetooth permission is off. Allow Bluetooth for this app in Settings."
    case State.PoweredOff:
      return "Bluetooth is off. Turn it on to find your computer."
    case State.Unsupported:
      return "This device does not support Bluetooth LE."
    case State.Resetting:
      return "Bluetooth is resetting. Try again in a moment."
    default:
      return "Bluetooth is unavailable. Try again in a moment."
  }
}

/** Reject a native BLE call that never answers, so the UI cannot hang forever. */
function withTimeout<T>(work: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    work.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

const CONNECT_TIMEOUT_MS = 7000
const DISCOVER_TIMEOUT_MS = 5000
const READ_TIMEOUT_MS = 4000

/**
 * BLE central: discovers the computer's helper, reads the bridge rendezvous address,
 * and subscribes to doorbell notifications. The doorbell is a wake signal; details
 * are fetched over the LAN HTTP API.
 */
export class BleClient {
  private manager: BleManager
  private device: Device | null = null
  private pendingDevice: Device | null = null
  private scanCancel: (() => void) | null = null

  constructor(manager: BleManager = new BleManager()) {
    this.manager = manager
  }

  /** Called for each doorbell; consumers typically just refetch state. */
  onDoorbell: ((payload: Record<string, unknown> | null) => void) | null = null

  async findAndConnect(timeoutMs = 8000): Promise<{ device: Device; rendezvous: Rendezvous }> {
    const state = await this.manager.state()
    if (state !== State.PoweredOn) throw new Error(bluetoothUnavailableMessage(state))

    const failed = new Set<string>()
    let lastError: unknown = null
    // A connection can fail transiently (a stale link, a busy peripheral). Give it
    // one more scan before surfacing the error, skipping the device that just failed.
    for (let attempt = 0; attempt < 2; attempt++) {
      const device = await this.scanForService(timeoutMs, failed)
      try {
        this.pendingDevice = device
        const connected = await withTimeout(device.connect(), CONNECT_TIMEOUT_MS, "ble connect timeout")
        this.pendingDevice = null
        this.device = connected
        await withTimeout(connected.discoverAllServicesAndCharacteristics(), DISCOVER_TIMEOUT_MS, "ble discover timeout")
        const services = await connected.services()
        const hasOurService = services.some((service) => service.uuid.toLowerCase() === SERVICE_UUID.toLowerCase())
        if (process.env.EXPO_PUBLIC_BLE_DEBUG) {
          console.warn("[ble-ok]", device.id, "svc=" + services.length, "our=" + String(hasOurService))
        }
        if (!hasOurService) throw new Error("helper service missing")

        const rendezvousChar = await withTimeout(
          connected.readCharacteristicForService(SERVICE_UUID, RENDEZVOUS_UUID),
          READ_TIMEOUT_MS,
          "ble read timeout",
        )
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
      } catch (error) {
        if (process.env.EXPO_PUBLIC_BLE_DEBUG) {
          const detail = error as { errorCode?: number; reason?: string | null; iosDescription?: string | null }
          console.warn("[ble-err]", String(detail.errorCode ?? "-"), String(detail.reason ?? "-"), String(detail.iosDescription ?? "-"))
        }
        lastError = error
        failed.add(device.id)
        this.pendingDevice = null
        void device.cancelConnection().catch(() => undefined)
        this.device = null
        if (attempt === 1) break
      }
    }
    throw lastError instanceof Error ? lastError : new Error("ble connect failed")
  }

  /**
   * Learn where the bridge lives now. Re-reads the rendezvous over the existing
   * Bluetooth link when possible, so a network change costs one characteristic read
   * instead of a fresh scan; otherwise reconnects and scans.
   */
  async refreshRendezvous(timeoutMs = 4000): Promise<Rendezvous> {
    const device = this.device
    if (device) {
      const rendezvous = await readRendezvousFromLink(device, timeoutMs)
      if (rendezvous) return rendezvous
      await this.disconnect()
    }
    const { rendezvous } = await this.findAndConnect()
    return rendezvous
  }

  /** Stop a scan in progress; the pending `findAndConnect` rejects promptly. */
  cancelScan(): void {
    this.scanCancel?.()
  }

  /** Abandon the current search entirely, including a connection attempt in flight. */
  abort(): void {
    this.scanCancel?.()
    const pending = this.pendingDevice
    const connected = this.device
    this.pendingDevice = null
    this.device = null
    if (pending) void pending.cancelConnection().catch(() => undefined)
    if (connected && connected !== pending) void connected.cancelConnection().catch(() => undefined)
  }

  private scanForService(timeoutMs: number, exclude: Set<string> = new Set()): Promise<Device> {
    return new Promise((resolve, reject) => {
      let settled = false
      const finish = (fn: () => void) => {
        if (settled) return
        settled = true
        this.scanCancel = null
        this.manager.stopDeviceScan()
        fn()
      }
      this.scanCancel = () => finish(() => reject(new Error("ble scan cancelled")))
      const timer = setTimeout(() => finish(() => reject(new Error("ble scan timeout"))), timeoutMs)

      // Scan unfiltered and require a positive identity: the native service filter
      // can miss the helper when the advertisement packet is packed tightly, but
      // accepting unknown peripherals makes the app connect to AirPods and watches.
      this.manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          clearTimeout(timer)
          finish(() => reject(error))
          return
        }
        if (!device) return
        if (exclude.has(device.id)) return
        const match = helperIdentity(device)
        if (match && process.env.EXPO_PUBLIC_BLE_DEBUG) console.warn("[ble-match]", device.id, match)
        if (!match) return
        clearTimeout(timer)
        finish(() => resolve(device))
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
