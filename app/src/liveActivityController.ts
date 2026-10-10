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
 * How long to wait after ending an activity before starting its replacement. The
 * native end is asynchronous, so starting too soon leaves two cards on the Lock
 * Screen; a short settle interval lets the old one disappear first.
 */
const END_SETTLE_MS = 1500

/**
 * Drives the Live Activity lifecycle from the aggregate: starts when the app is up,
 * updates as it changes, and ends when the user disables it or the connection has
 * been down for a long time. Keeps the last state so a stale flag, a disconnect, or
 * a theme change can re-render without new data. It holds at most one activity at a
 * time: a replacement waits for the previous native end to settle, and starts are
 * held until a one-time leftover cleanup (`deferUntil`) resolves.
 */
export class LiveActivityController {
  private id: string | null = null
  private enabled = true
  private stale = false
  private disconnected = false
  private theme: Theme | null = null
  private last: AppState | null = null
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null
  private settleTimer: ReturnType<typeof setTimeout> | null = null
  private ending = false
  private pending = false
  private gate: Promise<unknown> | null = null

  constructor(private readonly api: ActivityApi) {}

  /**
   * Hold starts until a one-time cleanup (ending a leftover activity from a
   * previous run) resolves, so the first start cannot race the leftover.
   */
  deferUntil(cleanup: Promise<unknown>): void {
    this.gate = cleanup
    void cleanup.then(() => {
      this.gate = null
      if (this.last) {
        this.pending = false
        this.render(this.last)
      }
    })
  }

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
   * fixed when it starts, so it is ended and replaced; the start waits for the end
   * to settle (see `stop`) so both cards do not linger.
   */
  refreshTheme(): void {
    if (!this.last) return
    const state = this.last
    this.stop()
    this.render(state)
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

  private clearSettle(): void {
    if (this.settleTimer) {
      clearTimeout(this.settleTimer)
      this.settleTimer = null
    }
    this.ending = false
  }

  private beginSettle(): void {
    this.ending = true
    const timer = setTimeout(() => {
      this.settleTimer = null
      this.ending = false
      if (this.pending && this.last) {
        this.pending = false
        this.render(this.last)
      }
    }, END_SETTLE_MS)
    ;(timer as unknown as { unref?: () => void })?.unref?.()
    this.settleTimer = timer
  }

  update(state: AppState): void {
    this.last = state
    this.render(state)
  }

  stop(): void {
    this.clearDisconnectTimeout()
    this.clearSettle()
    if (!this.id) return
    try {
      this.api.stopActivity(this.id, activityState(EMPTY_AGGREGATE, this.theme))
    } catch {
      // best-effort
    }
    this.id = null
    this.beginSettle()
  }

  private render(state: AppState): void {
    if (!this.enabled) return
    // Don't start while the previous activity is still ending or a leftover is
    // being cleared; remember that a render is owed and run it once free.
    if (this.ending || this.gate) {
      this.pending = true
      return
    }

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
