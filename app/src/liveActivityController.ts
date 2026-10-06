import type { LiveActivityConfig, LiveActivityState } from "expo-live-activity"
import { aggregate } from "./aggregate"
import type { AppState } from "./events"
import { LIVE_ACTIVITY_CONFIG, activityState } from "./liveActivityState"

export interface ActivityApi {
  startActivity(state: LiveActivityState, config?: LiveActivityConfig): string | undefined
  updateActivity(id: string, state: LiveActivityState): void
  stopActivity(id: string, state: LiveActivityState): void
}

const EMPTY_AGGREGATE = { total: 0, running: 0, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }

/**
 * Drives the Live Activity lifecycle from the aggregate: starts when sessions
 * appear, updates as they change, ends when none remain. Keeps the last state so
 * a stale flag or an enable/disable toggle can re-render without new data.
 */
export class LiveActivityController {
  private id: string | null = null
  private enabled = true
  private stale = false
  private disconnected = false
  private last: AppState | null = null

  constructor(private readonly api: ActivityApi) {}

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      this.stop()
    } else if (this.last) {
      this.render(this.last)
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  setStale(stale: boolean): void {
    if (this.stale === stale) return
    this.stale = stale
    if (this.last) this.render(this.last)
  }

  setDisconnected(disconnected: boolean): void {
    if (this.disconnected === disconnected) return
    this.disconnected = disconnected
    if (this.last) this.render(this.last)
  }

  update(state: AppState): void {
    this.last = state
    this.render(state)
  }

  stop(): void {
    if (!this.id) return
    try {
      this.api.stopActivity(this.id, activityState(EMPTY_AGGREGATE))
    } catch {
      // best-effort
    }
    this.id = null
  }

  private render(state: AppState): void {
    if (!this.enabled) return

    const agg = aggregate(state)
    // Keep a running activity around to show "No connection"; otherwise end it.
    if (agg.total === 0 && !(this.disconnected && this.id)) {
      this.stop()
      return
    }

    const content = activityState(agg, this.stale, this.disconnected)
    if (!this.id) {
      const id = this.api.startActivity(content, LIVE_ACTIVITY_CONFIG)
      if (id) this.id = id
      return
    }
    try {
      this.api.updateActivity(this.id, content)
    } catch {
      // best-effort
    }
  }
}
