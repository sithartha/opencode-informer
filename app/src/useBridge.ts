import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { AppState as RNAppState } from "react-native"
import Constants from "expo-constants"
import * as Notifications from "expo-notifications"
import { applyEvent, emptyState, stateFromSnapshot, type ActivityEvent, type AppState, type PendingRequest } from "./events"
import { connectionReducer, initialConnection } from "./connection"
import { beginPairing, baseUrl, fetchState, pollPairing, postDevice, postPrompt, postResolution, type ModelRef, type SessionOptions } from "./bridgeClient"
import * as sessionActions from "./sessionActions"
import { BleClient } from "./bleClient"
import { BridgeStream } from "./sse"
import {
  getDeviceName,
  getLiveActivityEnabled,
  getThemeMode,
  secureTokenStore,
  setDeviceName as persistDeviceName,
  setLiveActivityEnabled,
  setMacName,
  setThemeMode as persistThemeMode,
} from "./secureTokenStore"
import type { ThemeMode } from "./theme"
import { reconnectWithToken } from "./reconnect"
import { actionToResolution, notificationFor, notificationForDoorbell } from "./notifications"
import { configureNotifications, dismissNotification, getDeviceToken, presentNotification, registerQuestionCategory } from "./pushNotifications"
import { manualBase } from "./manualConnect"
import { liveActivity } from "./liveActivity"
import { isStale } from "./staleness"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const PAIR_POLL_INTERVAL_MS = 2000
const PAIR_POLL_ATTEMPTS = 60

// Dev-only: when set, skip BLE and connect straight to this host:port over HTTP.
// Useful on the simulator, where BLE is unavailable.
const DEV_HOST = process.env.EXPO_PUBLIC_DEV_HOST

function devLog(...args: unknown[]): void {
  if (process.env.EXPO_PUBLIC_DEBUG_LOG) console.log("[openisland]", ...args)
}

export function useBridge() {
  const [appState, setAppState] = useState<AppState>(emptyState)
  const [connection, dispatch] = useReducer(connectionReducer, initialConnection)
  const [paired, setPaired] = useState(false)
  const [liveActivityEnabled, setLiveActivityEnabledState] = useState(true)
  const [deviceName, setDeviceNameState] = useState(Constants.deviceName || "iPhone")
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system")
  const deviceNameRef = useRef(Constants.deviceName || "iPhone")

  const bleRef = useRef<BleClient | null>(null)
  const streamRef = useRef<BridgeStream | null>(null)
  const baseRef = useRef<string | null>(null)
  const tokenRef = useRef<string | null>(null)
  const startedRef = useRef(false)
  const lastRefreshRef = useRef(0)
  const connectingRef = useRef(false)
  const lastDoorbellSig = useRef("")
  const lastDoorbellAt = useRef(0)
  const lastActiveConnectAt = useRef(0)
  const resolvingRef = useRef<Set<string>>(new Set())
  const notifiedRef = useRef<Set<string>>(new Set())
  const fetchBusyRef = useRef(false)
  const lastFetchMsRef = useRef(0)
  const pendingRef = useRef<Record<string, PendingRequest>>({})
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelayRef = useRef(2000)
  const disconnectedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchAndStreamRef = useRef<((base: string, token: string) => Promise<void>) | null>(null)
  const scheduleReconnectRef = useRef<() => void>(() => {})

  // Single-flight, throttled snapshot sync so reconnects and repeated doorbells
  // cannot hammer the Mac with requests.
  const syncState = useCallback(async (force = false): Promise<Awaited<ReturnType<typeof fetchState>> | null> => {
    const base = baseRef.current
    const token = tokenRef.current
    if (!base || !token) return null
    const now = Date.now()
    if (fetchBusyRef.current) return null
    if (!force && now - lastFetchMsRef.current < 1000) return null
    fetchBusyRef.current = true
    lastFetchMsRef.current = now
    try {
      const snapshot = await fetchState(base, token)
      setAppState((prev) => ({ ...stateFromSnapshot(snapshot), recent: prev.recent }))
      lastRefreshRef.current = Date.now()
      liveActivity.setStale(false)
      liveActivity.setDisconnected(false)
      return snapshot
    } catch {
      liveActivity.setStale(true)
      return null
    } finally {
      fetchBusyRef.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    await syncState()
  }, [syncState])

  // Remote push: report the APNs device token so the Mac can notify us off-LAN.
  const registerDevice = useCallback(async () => {
    const base = baseRef.current
    const token = tokenRef.current
    if (!base || !token) return
    const deviceToken = await getDeviceToken()
    if (!deviceToken) return
    try {
      await postDevice(base, token, deviceToken)
      devLog("device token registered")
    } catch {
      /* ignore */
    }
  }, [])

  const handleEvent = useCallback((event: ActivityEvent) => {
    devLog("event", event.type)
    setAppState((prev) => applyEvent(prev, event))

    if (event.type === "actionable.resolved") {
      const requestID = String((event.data as { requestID?: string }).requestID ?? "")
      if (requestID) {
        notifiedRef.current.delete(requestID)
        void dismissNotification(requestID)
      }
      return
    }

    const plan = notificationFor(event)
    if (!plan) return
    if (plan.requestID) {
      if (notifiedRef.current.has(plan.requestID)) return
      notifiedRef.current.add(plan.requestID)
    }
    if (plan.category === "QUESTION" && plan.requestID) {
      const options = ((event.data as { options?: unknown[] }).options ?? []).map(String)
      void registerQuestionCategory(plan.requestID, options).then(() => presentNotification(plan))
    } else {
      void presentNotification(plan)
    }
  }, [])

  const handleDoorbell = useCallback(async (payload: Record<string, unknown> | null) => {
    // Deduplicate repeated doorbells for the same event within a short window.
    const signature = JSON.stringify(payload)
    const now = Date.now()
    if (signature === lastDoorbellSig.current && now - lastDoorbellAt.current < 3000) return
    lastDoorbellSig.current = signature
    lastDoorbellAt.current = now

    devLog("doorbell", payload)
    const kind = String((payload && payload.kind) || "")

    // A manual "Refresh" from the Mac helper: force a full resync.
    if (kind === "refresh") {
      await syncState(true)
      return
    }

    // Completions are informational and have no request to verify.
    if (kind === "completion") {
      const plan = notificationForDoorbell(payload)
      if (plan) void presentNotification(plan)
      return
    }

    await syncState()
    const requestID = payload && typeof payload.requestID === "string" ? payload.requestID : ""
    const request = requestID ? pendingRef.current[requestID] : undefined
    // Only notify for a request that is still pending — a stale or superseded wake
    // must not produce a push without a card.
    if (!request || notifiedRef.current.has(request.requestID)) return
    notifiedRef.current.add(request.requestID)

    if (request.kind === "question") {
      const options = request.options ?? []
      void registerQuestionCategory(request.requestID, options).then(() =>
        presentNotification({
          category: "QUESTION",
          title: request.title,
          body: options.join(" / "),
          actions: options.map((option) => ({ identifier: `OPTION:${option}`, title: option })),
          requestID: request.requestID,
        }),
      )
    } else {
      void presentNotification({
        category: "PERMISSION_REQUEST",
        title: "OpenCode needs approval",
        body: `${request.title}${request.summary ? `: ${request.summary}` : ""}`,
        actions: [
          { identifier: "ALLOW", title: "Allow" },
          { identifier: "DENY", title: "Deny" },
        ],
        requestID: request.requestID,
      })
    }
  }, [syncState])

  const fetchAndStream = useCallback(
    async (base: string, token: string) => {
      tokenRef.current = token
      baseRef.current = base
      const snapshot = await fetchState(base, token)
      devLog("state", snapshot.activeSessionCount, "active")
      setAppState(stateFromSnapshot(snapshot))
      lastRefreshRef.current = Date.now()
      liveActivity.setStale(false)
      liveActivity.setDisconnected(false)
      if (disconnectedTimerRef.current) {
        clearTimeout(disconnectedTimerRef.current)
        disconnectedTimerRef.current = null
      }
      reconnectDelayRef.current = 2000
      streamRef.current?.stop()
      streamRef.current = new BridgeStream(base, token, handleEvent, () => {
        dispatch({ type: "disconnected" })
        scheduleReconnectRef.current()
        if (!disconnectedTimerRef.current) {
          disconnectedTimerRef.current = setTimeout(() => {
            disconnectedTimerRef.current = null
            liveActivity.setDisconnected(true)
          }, 5000)
        }
      })
      streamRef.current.start()
      dispatch({ type: "connected" })
      void registerDevice()
    },
    [handleEvent, registerDevice],
  )
  fetchAndStreamRef.current = fetchAndStream

  // Reopen the stream (and resync) with backoff after a drop, so cards and the
  // Live Activity recover on their own once the Mac is reachable again.
  scheduleReconnectRef.current = () => {
    if (reconnectTimerRef.current) return
    reconnectTimerRef.current = setTimeout(async () => {
      reconnectTimerRef.current = null
      const base = baseRef.current
      const token = tokenRef.current
      if (!base || !token) return
      try {
        await fetchAndStreamRef.current?.(base, token)
      } catch {
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 30000)
        scheduleReconnectRef.current()
      }
    }, reconnectDelayRef.current)
  }

  // Reuse a stored token or pair over HTTP, then stream. Shared by BLE and manual connect.
  const establish = useCallback(
    async (base: string) => {
      devLog("establish", base)
      await configureNotifications()
      devLog("notifications configured")

      const reused = await reconnectWithToken(base, secureTokenStore)
      if (reused.token) {
        devLog("reconnected", base)
        await fetchAndStream(base, reused.token)
        setPaired(true)
        return
      }

      const first = await beginPairing(base, deviceNameRef.current)
      if (first.status === "denied") throw new Error("pairing denied")
      let token = first.status === "approved" ? first.token : null
      const approvalID = first.status === "pending" ? first.approvalID : null

      for (let attempt = 0; !token && approvalID && attempt < PAIR_POLL_ATTEMPTS; attempt++) {
        await sleep(PAIR_POLL_INTERVAL_MS)
        const next = await pollPairing(base, approvalID)
        if (next.status === "denied") throw new Error("pairing denied")
        if (next.status === "approved") token = next.token
      }
      if (!token) throw new Error("pairing timed out")

      await secureTokenStore.set(token)
      await setMacName(base)
      devLog("paired", base)
      setPaired(true)
      await fetchAndStream(base, token)
    },
    [fetchAndStream],
  )

  const connect = useCallback(async (): Promise<boolean> => {
    if (connectingRef.current) return false
    connectingRef.current = true
    try {
      dispatch({ type: "discover" })
      const ble = bleRef.current ?? new BleClient()
      bleRef.current = ble
      ble.onDoorbell = (payload) => void handleDoorbell(payload)
      const { rendezvous } = await ble.findAndConnect()
      dispatch({ type: "pairingStarted", macName: rendezvous.host })
      await establish(baseUrl(rendezvous.host, rendezvous.port))
      return true
    } catch (error) {
      dispatch({ type: "failed", message: (error as Error).message })
      return false
    } finally {
      connectingRef.current = false
    }
  }, [establish, handleDoorbell])

  const connectManual = useCallback(
    async (hostPort: string) => {
      devLog("connectManual", hostPort)
      const base = manualBase(hostPort)
      if (!base) {
        dispatch({ type: "failed", message: "Enter host:port, for example 127.0.0.1:38963" })
        return
      }
      try {
        dispatch({ type: "pairingStarted", macName: hostPort })
        await establish(base)
      } catch (error) {
        devLog("connectManual failed", (error as Error).message)
        dispatch({ type: "failed", message: (error as Error).message })
      }
    },
    [establish],
  )

  const setDeviceName = useCallback(async (name: string) => {
    deviceNameRef.current = name
    setDeviceNameState(name)
    await persistDeviceName(name)
  }, [])

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode)
    await persistThemeMode(mode)
  }, [])

  const setLiveActivityOn = useCallback(async (enabled: boolean) => {
    setLiveActivityEnabledState(enabled)
    liveActivity.setEnabled(enabled)
    await setLiveActivityEnabled(enabled)
  }, [])

  const sendPrompt = useCallback(async (sessionID: string, text: string) => {
    const base = baseRef.current
    const token = tokenRef.current
    if (!base || !token) return false
    try {
      const ok = await postPrompt(base, token, sessionID, text)
      devLog("prompt", sessionID, ok)
      if (ok) void syncState()
      return ok
    } catch {
      return false
    }
  }, [])

  const startSession = useCallback(async (title?: string) => {
    const base = baseRef.current
    const token = tokenRef.current
    if (!base || !token) return false
    try {
      return await sessionActions.startSession(base, token, syncState, title)
    } catch {
      return false
    }
  }, [])

  const stopSession = useCallback(async (sessionID: string) => {
    const base = baseRef.current
    const token = tokenRef.current
    if (!base || !token) return false
    try {
      return await sessionActions.stopSession(base, token, syncState, sessionID)
    } catch {
      return false
    }
  }, [])

  const closeSession = useCallback(async (sessionID: string) => {
    const base = baseRef.current
    const token = tokenRef.current
    if (!base || !token) return false
    // Remove locally so the card disappears immediately, then reconcile.
    setAppState((prev) => {
      if (!prev.sessions[sessionID]) return prev
      const sessions = { ...prev.sessions }
      delete sessions[sessionID]
      return { ...prev, sessions }
    })
    try {
      return await sessionActions.closeSession(base, token, syncState, sessionID)
    } catch {
      return false
    }
  }, [])

  const switchSession = useCallback(async (sessionID: string, target: { agent?: string; model?: ModelRef }) => {
    const base = baseRef.current
    const token = tokenRef.current
    if (!base || !token) return false
    try {
      return await sessionActions.switchSession(base, token, syncState, sessionID, target)
    } catch {
      return false
    }
  }, [])

  const loadOptions = useCallback(async (): Promise<SessionOptions> => {
    const base = baseRef.current
    const token = tokenRef.current
    if (!base || !token) return { agents: [], models: [] }
    try {
      return await sessionActions.loadOptions(base, token)
    } catch {
      return { agents: [], models: [] }
    }
  }, [])

  const resolve = useCallback(async (requestID: string, action: string) => {    const base = baseRef.current
    const token = tokenRef.current
    if (!base || !token) return false
    if (resolvingRef.current.has(requestID)) return false
    resolvingRef.current.add(requestID)
    try {
      const ok = await postResolution(base, token, requestID, action)
      devLog("resolution", requestID, action, ok)
      if (ok) {
        // Reflect the decision locally so the dashboard and Live Activity update
        // even when the app was woken in the background to handle the action.
        setAppState((prev) => {
          const pending = prev.pending[requestID]
          if (!pending) return prev
          return applyEvent(prev, { type: "actionable.resolved", data: { sessionID: pending.sessionID, requestID } })
        })
        // Then resync so the hero/Live Activity match the bridge's authoritative state.
        void syncState()
      }
      return ok
    } catch {
      return false
    } finally {
      resolvingRef.current.delete(requestID)
    }
  }, [])

  useEffect(() => {
    liveActivity.update(appState)
    pendingRef.current = appState.pending
  }, [appState])

  // Re-report the token if APNs rotates it.
  useEffect(() => {
    const subscription = Notifications.addPushTokenListener(() => {
      void registerDevice()
    })
    return () => subscription.remove()
  }, [registerDevice])

  // Mark the activity stale once the aggregate has gone unrefreshed too long.
  useEffect(() => {
    const timer = setInterval(() => {
      liveActivity.setStale(isStale(lastRefreshRef.current, Date.now()))
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  // Reconnect when the app returns to the foreground if not already paired.
  useEffect(() => {
    const subscription = RNAppState.addEventListener("change", (state) => {
      if (state !== "active") return
      if (paired) {
        // Coming back to the app: resync so pending cards are current.
        void refresh()
        return
      }
      const now = Date.now()
      if (now - lastActiveConnectAt.current < 10000) return
      lastActiveConnectAt.current = now
      void connect()
    })
    return () => subscription.remove()
  }, [connect, paired, refresh])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const requestID = (response.notification.request.content.data as { requestID?: string })?.requestID
      const action = actionToResolution(response.actionIdentifier)
      if (requestID && action) {
        void resolve(String(requestID), action)
        return
      }
      // Tapping the notification (default action) should resync so the card shows.
      if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) void refresh()
    })

    if (DEV_HOST) {
      void connectManual(DEV_HOST)
    } else {
      // The first BLE attempt can race the helper's advertising; retry a few times.
      void (async () => {
        for (let attempt = 0; attempt < 5; attempt++) {
          if (await connect()) return
          await sleep(4000)
        }
      })()
    }

    void getLiveActivityEnabled().then((enabled) => {
      setLiveActivityEnabledState(enabled)
      liveActivity.setEnabled(enabled)
    })

    void getDeviceName().then((name) => {
      // Prefer the real device name; a stored name only fills in when the system
      // name is unavailable (e.g., the entitlement is missing).
      const realName = Constants.deviceName || ""
      const hasRealName = realName.length > 0 && realName !== "iPhone"
      if (name && !hasRealName) {
        deviceNameRef.current = name
        setDeviceNameState(name)
      }
    })

    void getThemeMode().then((mode) => {
      if (mode === "light" || mode === "dark" || mode === "system") setThemeModeState(mode)
    })

    return () => {
      subscription.remove()
      streamRef.current?.stop()
      void bleRef.current?.disconnect()
    }
  }, [connect, connectManual, resolve, refresh])

  return { appState, connection, paired, connect, connectManual, resolve, sendPrompt, startSession, stopSession, closeSession, switchSession, loadOptions, liveActivityEnabled, setLiveActivityOn, deviceName, setDeviceName, themeMode, setThemeMode }
}
