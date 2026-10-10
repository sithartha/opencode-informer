import type { LiveActivityConfig, LiveActivityState } from "expo-live-activity"
import { aggregate } from "./aggregate"
import type { AppState } from "./events"
import type { Theme } from "./theme"
import { activityConfig, activityState } from "./liveActivityState"

export interface ActivityApi {
  startActivity(state: LiveActivityState, config?: LiveActivityConfig): string | undefined
  updateActivity(id: string, state: LiveActivityState): void
  stopActivity(id: string, state: LiveActivityState): void
}

const EMPTY_AGGREGATE = { total: 0, running: 0, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }

/** How long the connection may stay down before the activity is ended. */
const DISCONNECT_TIMEOUT_MS = 30 * 60 * 1000

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
  private theme: Theme | null = null
  private last: AppState | null = null
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null
  private themeTimer: ReturnType<typeof setTimeout> | null = null
  private restarting = false

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

  /**
   * Store the active theme. Called during render (no side effects). The palette is
   * applied when an activity starts; `refreshTheme` re-themes a running one.
   */
  setTheme(theme: Theme): void {
    this.theme = theme
  }

  /**
   * Re-theme a running activity after the theme changed. The activity's colors are
   * fixed when it starts, so it is ended and replaced. Starting is paused during the
   * restart and delayed so the native end (async) completes first — otherwise both
   * cards linger.
   */
  refreshTheme(): void {
    if (!this.last) return
    if (!this.id) {
      this.render(this.last)
      return
    }
    this.stop()
    this.restarting = true
    const timer = setTimeout(() => {
      this.themeTimer = null
      this.restarting = false
      if (this.last) this.render(this.last)
    }, 1500)
    ;(timer as unknown as { unref?: () => void })?.unref?.()
    this.themeTimer = timer
  }

  setStale(stale: boolean): void {
    if (this.stale === stale) return
    this.stale = stale
    if (this.last) this.render(this.last)
  }

  setDisconnected(disconnected: boolean): void {
    if (this.disconnected === disconnected) return
    this.disconnected = disconnected
    if (disconnected) {
      // Keep the activity for a while after the connection drops; end it only if
      // the connection stays down for the timeout.
      this.armDisconnectTimeout()
    } else {
      this.clearDisconnectTimeout()
    }
    if (this.last) this.render(this.last)
  }

  /** End the activity after a long disconnection (matching the 30-minute window). */
  private armDisconnectTimeout(): void {
    this.clearDisconnectTimeout()
    const timer = setTimeout(() => {
      this.disconnectTimer = null
      this.stop()
    }, DISCONNECT_TIMEOUT_MS)
    // In Node (tests) don't let the timer keep the process alive; React Native
    // timers have no unref and are unaffected.
    ;(timer as unknown as { unref?: () => void })?.unref?.()
    this.disconnectTimer = timer
  }

  private clearDisconnectTimeout(): void {
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer)
      this.disconnectTimer = null
    }
  }

  update(state: AppState): void {
    this.last = state
    this.render(state)
  }

  stop(): void {
    this.clearDisconnectTimeout()
    if (this.themeTimer) {
      clearTimeout(this.themeTimer)
      this.themeTimer = null
    }
    this.restarting = false
    if (!this.id) return
    try {
      this.api.stopActivity(this.id, activityState(EMPTY_AGGREGATE, this.theme))
    } catch {
      // best-effort
    }
    this.id = null
  }

  private render(state: AppState): void {
    if (!this.enabled || this.restarting) return

    const agg = aggregate(state)
    // Stay present even with no active agents; the activity ends only after a long
    // disconnection (see setDisconnected).
    const content = activityState(agg, this.theme, this.stale, this.disconnected)
    if (!this.id) {
      const id = this.api.startActivity(content, activityConfig(this.theme))
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
