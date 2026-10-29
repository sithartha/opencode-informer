import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { AppState as RNAppState, Vibration } from "react-native"
import NetInfo from "@react-native-community/netinfo"
import Constants from "expo-constants"
import * as Notifications from "expo-notifications"
import { applyEvent, emptyState, parseOptions, stateFromSnapshot, type ActivityEvent, type AppState, type PendingRequest } from "./events"
import { connectionReducer, initialConnection } from "./connection"
import { beginPairing, baseUrl, fetchState, pollPairing, postAnswers, postPrompt, postResolution, type AnswerMap, type ModelRef, type SessionOptions } from "./bridgeClient"
import * as sessionActions from "./sessionActions"
import { BleClient } from "./bleClient"
import type { Rendezvous } from "./bleProtocol"
import { networkIdentity, shouldRediscover, type NetworkIdentity } from "./networkChange"
import { findBridge, ipv4Candidates } from "./lanScan"
import { candidateFailure, friendlyConnectError, networkChangeAction, recordReconnectFailure } from "./rediscover"
import { BridgeStream } from "./sse"
import {
  getLastHost,
  getLastPort,
  getLiveActivityEnabled,
  getTheme,
  readSecure,
  secureTokenStore,
  setLastHost,
  setLastPort,
  setLiveActivityEnabled,
  setMacName,
  setTheme as persistTheme,
  writeSecure,
} from "./secureTokenStore"
import { DEFAULT_OPTION, DEFAULT_SKIN, defaultOptionFor, type SkinId, type ThemeOption } from "./theme"
import { reconnectWithToken } from "./reconnect"
import { actionToResolution, isAttentionEvent, notificationFor, notificationForDoorbell } from "./notifications"
import { configureNotifications, dismissNotification, presentNotification, registerQuestionCategory } from "./pushNotifications"
import { manualBase } from "./manualConnect"
import { liveActivity, endStaleLiveActivity } from "./liveActivity"
import { isStale } from "./staleness"
import { DIAGNOSTIC_KEY } from "./tokenStore"
import { createDiagnostics, describeDiagnostic, runGuarded } from "./diagnostics"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const PAIR_POLL_INTERVAL_MS = 2000
const PAIR_POLL_ATTEMPTS = 60
// iOS reports several network updates while Wi-Fi settles; wait before acting.
const NETWORK_CHANGE_DEBOUNCE_MS = 1500
const PROBE_TIMEOUT_MS = 5000

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
  const deviceName = Constants.deviceName || "iPhone"
  const [skin, setSkinState] = useState<SkinId>(DEFAULT_SKIN)
  const [themeOption, setThemeOptionState] = useState<ThemeOption>(DEFAULT_OPTION)
  const [pairingCodeRequest, setPairingCodeRequest] = useState<string | null>(null)
  const [pairingCodeError, setPairingCodeError] = useState<string | null>(null)
  const [diagnostic, setDiagnostic] = useState<string | null>(null)
  const [manuallyDisconnected, setManuallyDisconnected] = useState(false)
  const diagnosticsRef = useRef(
    createDiagnostics({
      get: () => readSecure(DIAGNOSTIC_KEY),
      set: (value) => writeSecure(DIAGNOSTIC_KEY, value),
    }),
  )

  // Run a background task, recording any failure instead of letting it escape.
  const guard = useCallback(
    (work: () => Promise<unknown>) =>
      runGuarded(work, (error) => {
        void diagnosticsRef.current.error(error, false)
      }),
    [],
  )

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
  const reconciledRef = useRef(false)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelayRef = useRef(2000)
  const disconnectedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchAndStreamRef = useRef<((base: string, token: string) => Promise<void>) | null>(null)
  const scheduleReconnectRef = useRef<() => void>(() => {})
  const rediscoverRef = useRef<() => Promise<boolean>>(async () => false)
  const rediscoveringRef = useRef(false)
  const pairingRequiredRef = useRef(false)
  const connectRequestedRef = useRef(false)
  const autoAttemptsRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const networkRef = useRef<NetworkIdentity | null>(null)
  const lanScanRef = useRef(false)
  const reconnectFailuresRef = useRef(0)
  const discoveryGenerationRef = useRef(0)
  // Latest connection facts for the long-lived network listener.
  const statusRef = useRef(connection.status)
  const pairedRef = useRef(paired)
  const manuallyDisconnectedRef = useRef(manuallyDisconnected)
  statusRef.current = connection.status
  pairedRef.current = paired
  manuallyDisconnectedRef.current = manuallyDisconnected

  // Single-flight, throttled snapshot sync so reconnects and repeated doorbells
  // cannot hammer the Mac with requests.
  const syncState = useCallback(async (force = false): Promise<Awaited<ReturnType<typeof fetchState>> | null> => {
    const base = baseRef.current
    const token = tokenRef.current
    if (!base || !token) return null
    const now = Date.now()
    if (fetchBusyRef.current) return null
    if (!force && now - lastFetchMsRef.current < 400) return null
    fetchBusyRef.current = true
    lastFetchMsRef.current = now
    try {
      const snapshot = await fetchState(base, token)
      setAppState((prev) => ({ ...stateFromSnapshot(snapshot), recent: prev.recent }))
      // A successful sync means we are in fact connected: reconcile the UI so a
      // missed reconnect transition cannot leave the unpaired block or an old error.
      setPaired(true)
      dispatch({ type: "connected" })
      pairingRequiredRef.current = false
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

  const handleEvent = useCallback((event: ActivityEvent) => {
    devLog("event", event.type)
    lastRefreshRef.current = Date.now()
    // Receiving streamed events means the bridge is reachable; reconcile once so a
    // missed reconnect transition cannot leave the unpaired block or an old error.
    if (!reconciledRef.current) {
      reconciledRef.current = true
      setPaired(true)
      dispatch({ type: "connected" })
    }
    // Buzz when something needs the user while the app is in the foreground.
    if (isAttentionEvent(event.type) && RNAppState.currentState === "active") {
      Vibration.vibrate(200)
    }
    setAppState((prev) => applyEvent(prev, event))

    if (event.type === "actionable.resolved") {
      const requestID = String((event.data as { requestID?: string }).requestID ?? "")
      if (requestID) {
        notifiedRef.current.delete(requestID)
        void guard(() => dismissNotification(requestID))
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
      const options = parseOptions((event.data as { options?: unknown }).options).map((option) => option.label)
      void guard(() => registerQuestionCategory(plan.requestID!, options).then(() => presentNotification(plan)))
    } else {
      void guard(() => presentNotification(plan))
    }
  }, [guard])

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
      if (plan) void guard(() => presentNotification(plan))
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
      const options = (request.options ?? []).map((option) => option.label)
      void guard(() =>
        registerQuestionCategory(request.requestID, options).then(() =>
          presentNotification({
            category: "QUESTION",
            title: request.title,
            body: options.join(" / "),
            actions: options.map((option) => ({ identifier: `OPTION:${option}`, title: option })),
            requestID: request.requestID,
          }),
        ),
      )
    } else {
      void guard(() =>
        presentNotification({
          category: "PERMISSION_REQUEST",
          title: "OpenCode needs approval",
          body: `${request.title}${request.summary ? `: ${request.summary}` : ""}`,
          actions: [
            { identifier: "ALLOW", title: "Allow" },
            { identifier: "DENY", title: "Deny" },
          ],
          requestID: request.requestID,
        }),
      )
    }
  }, [guard, syncState])

  // Remember where the last bridge was so the next launch can skip discovery.
  const rememberAddress = useCallback(async (base: string) => {
    const match = base.match(/^https?:\/\/([^:/]+):(\d+)$/)
    if (!match) return
    await setLastHost(match[1])
    await setLastPort(Number(match[2]))
  }, [])

  const fetchAndStream = useCallback(
    async (base: string, token: string) => {
      tokenRef.current = token
      baseRef.current = base
      const snapshot = await fetchState(base, token)
      devLog("state", snapshot.activeSessionCount, "active")
      setAppState(stateFromSnapshot(snapshot))
      setPaired(true)
      await rememberAddress(base)
      lastRefreshRef.current = Date.now()
      liveActivity.setStale(false)
      liveActivity.setDisconnected(false)
      if (disconnectedTimerRef.current) {
        clearTimeout(disconnectedTimerRef.current)
        disconnectedTimerRef.current = null
      }
      reconnectDelayRef.current = 2000
      reconnectFailuresRef.current = 0
      autoAttemptsRef.current = 0
      pairingRequiredRef.current = false
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
      const host = base.match(/^https?:\/\/([^:/]+)/)?.[1]
      dispatch({ type: "connected", ...(host ? { macName: host } : {}) })
    },
    [handleEvent, rememberAddress],
  )
  fetchAndStreamRef.current = fetchAndStream

  // Reopen the stream (and resync) with backoff after a drop, so cards and the
  // Live Activity recover on their own once the Mac is reachable again. After a few
  // failures the address itself is probably stale (the computer changed networks), so
  // re-read it over Bluetooth before trying again.
  scheduleReconnectRef.current = () => {
    if (pairingRequiredRef.current) return
    if (reconnectTimerRef.current) return
    reconnectTimerRef.current = setTimeout(async () => {
      reconnectTimerRef.current = null
      const base = baseRef.current
      const token = tokenRef.current
      if (!base || !token) return
      try {
        await fetchAndStreamRef.current?.(base, token)
      } catch {
        const failure = recordReconnectFailure(reconnectFailuresRef.current)
        reconnectFailuresRef.current = failure.failures
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 30000)
        if (failure.rediscover) {
          const recovered = await rediscoverRef.current()
          if (recovered) return
        }
        scheduleReconnectRef.current()
      }
    }, reconnectDelayRef.current)
  }

  // Reuse a stored token, or pair over HTTP with the computer-shown code. Shared by
  // BLE discovery, the remembered address, and manual connect. Supplying a code
  // skips token reuse so the user can replace a token the computer no longer takes.
  const establish = useCallback(
    async (base: string, code?: string): Promise<"connected" | "needs-code" | "revoked"> => {
      devLog("establish", base)
      await configureNotifications()
      devLog("notifications configured")

      if (!code) {
        const reused = await reconnectWithToken(base, secureTokenStore)
        // A 401 is not proof the pairing is gone: the remembered address may now
        // belong to another computer. Keep the token and let the caller check the
        // address the helper points at.
        if (reused.revoked) return "revoked"
        if (reused.token) {
          devLog("reconnected", base)
          await fetchAndStream(base, reused.token)
          await rememberAddress(base)
          setPaired(true)
          return "connected"
        }
        // A new pairing needs the code shown on the computer.
        return "needs-code"
      }

      const first = await beginPairing(base, deviceName, code)
      if (first.status === "invalid-code") throw new Error("invalid pairing code")
      if (first.status === "locked-out") throw new Error("too many attempts")
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
      await rememberAddress(base)
      devLog("paired", base)
      setPaired(true)
      await fetchAndStream(base, token)
      return "connected"
    },
    [fetchAndStream, rememberAddress],
  )

  // The computer the helper points at rejected our token. Keep the stored pairing
  // intact, stop the automatic reconnect loop, and offer a code so the user decides
  // whether to pair again; a new code replaces the old token.
  const requirePairing = useCallback((base: string) => {
    pairingRequiredRef.current = true
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    streamRef.current?.stop()
    streamRef.current = null
    // Stop the watchdog and syncs from retrying the rejected token; the token stays
    // in SecureStore until the user pairs or disconnects.
    baseRef.current = null
    tokenRef.current = null
    setPaired(false)
    liveActivity.setDisconnected(true)
    dispatch({ type: "failed", message: "Pairing required" })
    setPairingCodeRequest(base)
  }, [])

  // Find the bridge by probing the phone's own /24 with the stored token. This is the
  // fallback when Bluetooth cannot connect (for example a stale system bond) or when
  // both machines moved networks. It never accepts a bridge that rejects the token.
  const findBridgeOnLan = useCallback(async (): Promise<{ base: string; authorized: boolean } | null> => {
    if (lanScanRef.current) return null
    const network = networkRef.current
    const token = tokenRef.current ?? (await secureTokenStore.get())
    if (!network?.ipAddress || !token) return null
    const hosts = ipv4Candidates(network.ipAddress, network.subnet)
    if (hosts.length === 0) return null
    lanScanRef.current = true
    try {
      const base = await findBridge(hosts, token)
      devLog("lan scan", hosts.length, base)
      return base
    } catch {
      return null
    } finally {
      lanScanRef.current = false
    }
  }, [])

  // Re-read the computer's address over Bluetooth and move the connection there. Used
  // when the phone's network changes and when reconnecting to the remembered address
  // keeps failing. The stored token is reused; a newly discovered address is probed
  // before the app commits to it, so a second computer in range cannot unpair the phone.
  const rediscoverAddress = useCallback(async (): Promise<boolean> => {
    if (pairingRequiredRef.current) return false
    if (rediscoveringRef.current) return false
    if (manuallyDisconnectedRef.current) return false
    const token = tokenRef.current
    if (!token) return false
    const generation = discoveryGenerationRef.current
    rediscoveringRef.current = true
    try {
      const ble = bleRef.current ?? new BleClient()
      bleRef.current = ble
      ble.onDoorbell = (payload) => void handleDoorbell(payload)
      const rendezvous = await ble.refreshRendezvous()
      if (generation !== discoveryGenerationRef.current) return false
      const candidate = baseUrl(rendezvous.host, rendezvous.port)
      if (candidate !== baseRef.current) {
        try {
          await fetchState(candidate, token, fetch, PROBE_TIMEOUT_MS)
        } catch (error) {
          const outcome = candidateFailure(error)
          devLog("rediscover candidate rejected", outcome, candidate)
          if (outcome === "keep-token") {
            requirePairing(candidate)
          } else {
            void diagnosticsRef.current.error(error, false)
          }
          return false
        }
        if (generation !== discoveryGenerationRef.current) return false
        await rememberAddress(candidate)
      }
      await fetchAndStream(candidate, token)
      devLog("rediscovered", candidate)
      return true
    } catch (error) {
      const message = (error as Error).message
      devLog("rediscover failed", message)
      const lan = await findBridgeOnLan()
      if (lan) {
        if (!lan.authorized) {
          requirePairing(lan.base)
          return false
        }
        try {
          await fetchAndStream(lan.base, token)
          devLog("rediscovered on lan", lan.base)
          return true
        } catch {
          // fall through to the error handling below
        }
      }
      if (message === "unauthorized") {
        const base = baseRef.current
        if (base) requirePairing(base)
      } else {
        void diagnosticsRef.current.error(error, false)
      }
      return false
    } finally {
      rediscoveringRef.current = false
    }
  }, [fetchAndStream, findBridgeOnLan, handleDoorbell, rememberAddress, requirePairing])
  rediscoverRef.current = rediscoverAddress

  // `userInitiated` skips the remembered address and scans Bluetooth immediately, so
  // the "Find nearby computer" action does what it says instead of waiting out a dead
  // IP. A tap during an automatic attempt cancels its scan and queues a fresh one.
  const connect = useCallback(async (userInitiated = false): Promise<boolean> => {
    if (connectingRef.current) {
      if (userInitiated) {
        connectRequestedRef.current = true
        autoAttemptsRef.current = 0
        bleRef.current?.abort()
      }
      return false
    }
    setManuallyDisconnected(false)
    pairingRequiredRef.current = false
    if (userInitiated) autoAttemptsRef.current = 0
    connectingRef.current = true
    let connected = false
    try {
      dispatch({ type: "discover" })
      if (!userInitiated) {
        // Prefer the last bridge we reached, so a reconnect does not need Bluetooth.
        const lastHost = await getLastHost()
        const lastPort = await getLastPort()
        if (lastHost && lastPort) {
          const remembered = baseUrl(lastHost, lastPort)
          try {
            dispatch({ type: "pairingStarted", macName: lastHost })
            const result = await establish(remembered)
            if (result === "connected") {
              connected = true
              return true
            }
            if (result === "needs-code") {
              setPairingCodeRequest(remembered)
              return false
            }
            // "revoked": the remembered address may belong to another computer now.
            // Fall through to Bluetooth discovery before asking to pair again.
          } catch {
            // fall through to Bluetooth discovery
          }
        }
      }
      const storedToken = tokenRef.current ?? (await secureTokenStore.get())
      if (userInitiated && storedToken) {
        const lan = await findBridgeOnLan()
        if (lan) {
          if (!lan.authorized) {
            requirePairing(lan.base)
            return false
          }
          try {
            dispatch({ type: "pairingStarted" })
            await fetchAndStream(lan.base, storedToken)
            connected = true
            return true
          } catch {
            // fall through to Bluetooth
          }
        }
      }
      const ble = bleRef.current ?? new BleClient()
      bleRef.current = ble
      ble.onDoorbell = (payload) => void handleDoorbell(payload)
      // Re-read the address over the Bluetooth link that may still be open (both
      // devices moved networks together); only scan if that link cannot answer.
      let rendezvous: Rendezvous
      try {
        rendezvous = await ble.refreshRendezvous()
      } catch (bleError) {
        const lan = await findBridgeOnLan()
        const token = tokenRef.current ?? (await secureTokenStore.get())
        if (lan) {
          if (!lan.authorized) {
            requirePairing(lan.base)
            return false
          }
          if (token) {
            try {
              dispatch({ type: "pairingStarted" })
              await fetchAndStream(lan.base, token)
              connected = true
              return true
            } catch {
              // fall through to the Bluetooth error
            }
          }
        }
        throw bleError
      }
      const base = baseUrl(rendezvous.host, rendezvous.port)
      dispatch({ type: "pairingStarted", macName: rendezvous.host })
      const result = await establish(base)
      if (result === "needs-code") {
        setPairingCodeRequest(base)
        return false
      }
      if (result === "revoked") {
        requirePairing(base)
        return false
      }
      connected = true
      return true
    } catch (error) {
      const message = (error as Error).message
      const aborted = message === "ble scan cancelled" || message === "ble connect cancelled" || connectRequestedRef.current
      if (!aborted) {
        void diagnosticsRef.current.error(error, false)
        dispatch({ type: "failed", message: friendlyConnectError(message) })
        // One automatic second search after a transient Bluetooth failure, so the
        // app does not wait for the user to tap again.
        const retryable = !/permission|bluetooth is off|unsupported|pairing required/i.test(message)
        if (!userInitiated && retryable && autoAttemptsRef.current < 1) {
          autoAttemptsRef.current += 1
          if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
          retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null
            if (!manuallyDisconnectedRef.current) void connect()
          }, 2000)
        }
      }
      return false
    } finally {
      connectingRef.current = false
      if (!connected && connectRequestedRef.current) {
        connectRequestedRef.current = false
        void connect(true)
      }
    }
  }, [establish, fetchAndStream, findBridgeOnLan, handleDoorbell, requirePairing])

  const connectManual = useCallback(
    async (hostPort: string) => {
      devLog("connectManual", hostPort)
      setManuallyDisconnected(false)
      pairingRequiredRef.current = false
      const base = manualBase(hostPort)
      if (!base) {
        dispatch({ type: "failed", message: "Enter a valid address and port" })
        return
      }
      try {
        dispatch({ type: "pairingStarted", macName: hostPort })
        const result = await establish(base)
        if (result === "needs-code") setPairingCodeRequest(base)
        else if (result === "revoked") requirePairing(base)
      } catch (error) {
        devLog("connectManual failed", (error as Error).message)
        dispatch({ type: "failed", message: (error as Error).message })
      }
    },
    [establish, requirePairing],
  )

  // Try the last bridge this phone reached before falling back to discovery.
  const connectRemembered = useCallback(async (): Promise<boolean> => {
    const host = await getLastHost()
    const port = await getLastPort()
    if (!host || !port) return false
    const base = baseUrl(host, port)
    try {
      dispatch({ type: "pairingStarted", macName: host })
      const result = await establish(base)
      if (result === "needs-code") {
        setPairingCodeRequest(base)
        return false
      }
      // A rejection here is not acted on: connect() will check the address the
      // helper points at before asking the user to pair again.
      return result === "connected"
    } catch {
      return false
    }
  }, [establish])

  // A network change can move the computer to a new address. Probe the current one
  // first (no needless Bluetooth work) and re-read the address over BLE only when it
  // stopped answering or the app is already recovering.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let previous: NetworkIdentity | null = null

    const applyChange = async (): Promise<void> => {
      if (pairingRequiredRef.current) return
      const action = networkChangeAction({
        paired: pairedRef.current,
        manuallyDisconnected: manuallyDisconnectedRef.current,
        status: statusRef.current,
      })
      if (action === "ignore") return
      if (action === "rediscover") {
        await rediscoverAddress()
        return
      }
      const base = baseRef.current
      const token = tokenRef.current
      if (!base || !token) return
      try {
        await fetchState(base, token, fetch, PROBE_TIMEOUT_MS)
      } catch {
        dispatch({ type: "disconnected" })
        await rediscoverAddress()
      }
    }

    void NetInfo.fetch().then((state) => {
      const identity = networkIdentity(state)
      if (identity) networkRef.current = identity
    })

    const unsubscribe = NetInfo.addEventListener((state) => {
      const next = networkIdentity(state)
      if (!next) return
      networkRef.current = next
      const changed = shouldRediscover(previous, next)
      previous = next
      if (!changed) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void applyChange()
      }, NETWORK_CHANGE_DEBOUNCE_MS)
    })

    return () => {
      if (timer) clearTimeout(timer)
      unsubscribe()
    }
  }, [rediscoverAddress])

  const submitPairingCode = useCallback(
    async (code: string) => {
      const base = pairingCodeRequest
      if (!base) return
      const trimmed = code.trim()
      if (!trimmed) return
      try {
        setPairingCodeError(null)
        await establish(base, trimmed)
        setPairingCodeRequest(null)
      } catch (error) {
        const message = (error as Error).message
        setPairingCodeError(
          message === "invalid pairing code"
            ? "Incorrect code. Check the code shown on your Mac and try again."
            : message === "too many attempts"
              ? "Too many attempts. Wait a few minutes and try again."
              : message,
        )
      }
    },
    [establish, pairingCodeRequest],
  )

  const cancelPairingCode = useCallback(() => {
    setPairingCodeRequest(null)
    setPairingCodeError(null)
  }, [])

  // Drop the connection to the Mac and stay disconnected until the user reconnects.
  const disconnect = useCallback(async () => {
    streamRef.current?.stop()
    streamRef.current = null
    discoveryGenerationRef.current += 1
    reconnectFailuresRef.current = 0
    autoAttemptsRef.current = 0
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    pairingRequiredRef.current = false
    setPairingCodeRequest(null)
    setPairingCodeError(null)
    void bleRef.current?.disconnect()
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (disconnectedTimerRef.current) {
      clearTimeout(disconnectedTimerRef.current)
      disconnectedTimerRef.current = null
    }
    // Clear the endpoint too, otherwise the watchdog keeps resyncing from the old
    // bridge and the app looks connected while it is actually unpaired.
    baseRef.current = null
    tokenRef.current = null
    lastRefreshRef.current = 0
    fetchBusyRef.current = false
    reconciledRef.current = false
    setPaired(false)
    setManuallyDisconnected(true)
    setAppState(emptyState())
    dispatch({ type: "reset" })
  }, [])

  const setSkin = useCallback(async (next: SkinId) => {
    const option = defaultOptionFor(next)
    setSkinState(next)
    setThemeOptionState(option)
    await persistTheme(next, option)
  }, [])

  /** Select a theme together with its variant and persist the pair in one write. */
  const setSkinAndOption = useCallback(async (next: SkinId, option: ThemeOption) => {
    setSkinState(next)
    setThemeOptionState(option)
    await persistTheme(next, option)
  }, [])

  const setThemeOption = useCallback(
    async (option: ThemeOption) => {
      setThemeOptionState(option)
      await persistTheme(skin, option)
    },
    [skin],
  )

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

  const startSession = useCallback(async (title?: string, selection?: { agent?: string; model?: ModelRef }) => {
    const base = baseRef.current
    const token = tokenRef.current
    if (!base || !token) return false
    try {
      return await sessionActions.startSession(base, token, syncState, title, undefined, selection)
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

  const resolve = useCallback(async (requestID: string, action: string, answers?: AnswerMap) => {
    const base = baseRef.current
    const token = tokenRef.current
    if (!base || !token) return false
    if (resolvingRef.current.has(requestID)) return false
    resolvingRef.current.add(requestID)
    try {
      const ok = answers ? await postAnswers(base, token, requestID, answers) : await postResolution(base, token, requestID, action)
      devLog("resolution", requestID, answers ? "answers" : action, ok)
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

  // Clear a Live Activity left over from a previous run before the first update can
  // start a new one, so the Lock Screen never shows two cards.
  useEffect(() => {
    liveActivity.deferUntil(endStaleLiveActivity())
  }, [])

  useEffect(() => {
    liveActivity.update(appState)
    pendingRef.current = appState.pending
  }, [appState])

  // Diagnostics: load the last breadcrumb, flag a run that ended in the
  // background, and keep recording lifecycle, connection, and errors.
  useEffect(() => {
    void (async () => {
      await diagnosticsRef.current.load()
      await diagnosticsRef.current.coldStart(Date.now())
      setDiagnostic(describeDiagnostic(diagnosticsRef.current.snapshot()))
    })()
  }, [])

  useEffect(() => {
    const errorUtils = (globalThis as {
      ErrorUtils?: {
        getGlobalHandler?: () => (error: unknown, fatal?: boolean) => void
        setGlobalHandler: (handler: (error: unknown, fatal?: boolean) => void) => void
      }
    }).ErrorUtils
    if (!errorUtils || typeof errorUtils.setGlobalHandler !== "function") return
    const previous = errorUtils.getGlobalHandler?.()
    errorUtils.setGlobalHandler((error, fatal) => {
      // Persist the breadcrumb; keep the app alive for a fatal error so the write
      // completes and the user gets a diagnostic instead of a silent abort.
      void diagnosticsRef.current.error(error, Boolean(fatal))
      if (!fatal && typeof previous === "function") previous(error, fatal)
    })
    return () => {
      if (typeof previous === "function") errorUtils.setGlobalHandler(previous)
    }
  }, [])

  useEffect(() => {
    const subscription = RNAppState.addEventListener("change", (state) => {
      void diagnosticsRef.current.transition(state)
      if (state === "active") void diagnosticsRef.current.foreground(Date.now())
      else if (state === "background") void diagnosticsRef.current.background(Date.now())
    })
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    void diagnosticsRef.current.connection(connection.status)
  }, [connection.status])

  // Watchdog: an SSE socket can stay half-open when the Mac sleeps, so probe the
  // bridge on a timer; if it stops answering, show "No connection" and reconnect.
  useEffect(() => {
    const timer = setInterval(async () => {
      if (!baseRef.current || !tokenRef.current) return
      if (Date.now() - lastRefreshRef.current < 15000) return
      const snapshot = await syncState(true)
      if (!snapshot) {
        liveActivity.setDisconnected(true)
        scheduleReconnectRef.current()
      }
    }, 10000)
    return () => clearInterval(timer)
  }, [syncState])

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
      if (manuallyDisconnected) return
      if (paired) {
        // Coming back to the app: resync so pending cards are current.
        void refresh()
        return
      }
      const now = Date.now()
      if (now - lastActiveConnectAt.current < 10000) return
      lastActiveConnectAt.current = now
      void (async () => {
        if (await connectRemembered()) return
        void connect()
      })()
    })
    return () => subscription.remove()
  }, [connect, connectRemembered, manuallyDisconnected, paired, refresh])

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
      // Prefer the remembered bridge, then retry BLE discovery a few times (the
      // first attempt can race the helper's advertising).
      void (async () => {
        if (await connectRemembered()) return
        // One automatic attempt; a user tap can take over at any time, and a failed
        // scan must not keep the connect action locked for minutes.
        if (!pairingRequiredRef.current) void connect()
      })()
    }

    void getLiveActivityEnabled().then((enabled) => {
      setLiveActivityEnabledState(enabled)
      liveActivity.setEnabled(enabled)
    })

    void getTheme().then(({ skin: loadedSkin, option }) => {
      setSkinState(loadedSkin)
      setThemeOptionState(option)
    })

    return () => {
      subscription.remove()
      streamRef.current?.stop()
      void bleRef.current?.disconnect()
    }
  }, [connect, connectManual, connectRemembered, resolve, refresh])

  return { appState, connection, paired, connect, connectManual, disconnect, resolve, sendPrompt, startSession, stopSession, closeSession, switchSession, loadOptions, liveActivityEnabled, setLiveActivityOn, deviceName, skin, themeOption, setSkin, setSkinAndOption, setThemeOption, pairingCodeRequest, pairingCodeError, submitPairingCode, cancelPairingCode, diagnostic }
}
