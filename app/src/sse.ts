import EventSource from "react-native-sse"
import { CONTRACT } from "./contract"
import type { ActivityEvent } from "./events"

type Listener = (event: ActivityEvent) => void

/** Wraps react-native-sse and decodes the bridge's typed stream events. */
export class BridgeStream {
  private source: EventSource | null = null

  constructor(
    private base: string,
    private token: string,
    private onEvent: Listener,
    private onError: () => void,
  ) {}

  start(): void {
    this.stop()
    const source = new EventSource(`${this.base}${CONTRACT.endpoints.events}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    }) as unknown as EventSource

    for (const type of CONTRACT.streamEvents) {
      // react-native-sse routes named events; parse the payload we send.
      ;(source as unknown as { addEventListener: (t: string, cb: (e: { data?: string }) => void) => void }).addEventListener(
        type,
        (event: { data?: string }) => {
          if (!event.data) return
          try {
            this.onEvent({ type, data: JSON.parse(event.data) })
          } catch {
            // ignore malformed frames
          }
        },
      )
    }

    ;(source as unknown as { addEventListener: (t: string, cb: () => void) => void }).addEventListener("error", () => {
      this.onError()
    })

    this.source = source
  }

  stop(): void {
    this.source?.close()
    this.source = null
  }
}
