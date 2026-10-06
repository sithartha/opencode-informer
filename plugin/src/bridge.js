import { ActivityModel } from "./activity.js"
import { PairingManager } from "./pairing.js"
import { ResolutionCoordinator } from "./resolution.js"
import { createBridgeServer } from "./server.js"
import { createDoorbell } from "./doorbell.js"
import { configFromEnv } from "./contract.js"
import { buildFormAnswer, replyToForm, replyToPermission } from "./serviceReply.js"
import { superviseEventStream } from "./eventStream.js"
import { appendFileSync } from "node:fs"

// Diagnostics for the real-OpenCode integration; append-only and best-effort.
const DEBUG_FILE = "/tmp/open-island-mobile-debug.log"
function dbg(message, extra) {
  try {
    const line = `[${new Date().toISOString()}] ${message}${extra === undefined ? "" : " " + JSON.stringify(extra)}`
    appendFileSync(DEBUG_FILE, `${line.slice(0, 2000)}\n`)
  } catch {
    /* ignore */
  }
}

const STARTED_KEY = "__openIslandMobileBridgeStarted"
const DOORBELL_KIND = {
  "permission.requested": "permission",
  "question.asked": "question",
  "turn.completed": "completion",
}

function debug(message) {
  if (!process.env.OPEN_ISLAND_MOBILE_DEBUG) return
  try {
    process.stderr.write(`[open-island-mobile] ${message}\n`)
  } catch {
    /* ignore */
  }
}

/** Build the bridge without an OpenCode context. Used by tests and by setup(). */
export function buildBridge(options = {}) {
  const config = { ...configFromEnv(options.env || process.env), ...(options.config || {}) }
  const model = new ActivityModel()
  const doorbell = options.doorbell || createDoorbell(config.helperUrl)
  const pairing = new PairingManager({
    onApprovalRequested: (approval) => {
      void doorbell({ kind: "pairing", approvalID: approval.id, deviceName: approval.deviceName })
    },
  })
  const applyPermission = options.applyPermission || (async () => {})
  const applyQuestion = options.applyQuestion || (async () => {})
  const applyPrompt = options.applyPrompt || (async () => {})
  const startSessionRaw = options.startSession || (async () => ({}))
  const stopSessionRaw = options.stopSession || (async () => {})
  const closeSession = options.closeSession || (async () => {})
  const optionsProvider = options.optionsProvider || (async () => ({ agents: [], models: [] }))
  const switchSessionRaw = options.switchSession || (async () => {})
  // Apply the switch, then reflect it immediately (OpenCode reports the new
  // agent/model only on the next step event).
  const switchSession = async (args) => {
    await switchSessionRaw(args)
    const data = { sessionID: args.sessionID }
    if (args.agent) data.agent = args.agent
    if (args.model) data.model = args.model
    handleEvent({ type: "session.meta", data })
  }

  // A session we create is empty and idle; OpenCode reports it as created, so
  // force it idle without a completion notification (so the card shows a prompt).
  const pendingIdle = new Map()
  const markIdle = (sessionID) => handleEvent({ type: "session.idle.silent", data: { sessionID } })
  const startSession = async (args) => {
    const session = await startSessionRaw(args)
    const id = session && (session.id || session.sessionID)
    if (id) {
      const timer = setTimeout(() => {
        pendingIdle.delete(id)
        markIdle(id)
      }, 900)
      pendingIdle.set(id, timer)
    }
    return session
  }
  // A successful stop leaves the session idle; reflect it at once (OpenCode does
  // not always emit an idle event on interrupt).
  const stopSession = async (args) => {
    await stopSessionRaw(args)
    handleEvent({ type: "session.idle.silent", data: { sessionID: args.sessionID } })
  }

  let server
  const resolution = new ResolutionCoordinator({
    model,
    applyPermission,
    applyQuestion,
    applyTimeoutMs: config.applyTimeoutMs,
    onResolved: (sessionID, requestID) => {
      if (server) server.broadcast("actionable.resolved", { sessionID, requestID })
    },
  })
  server = createBridgeServer({
    port: config.port,
    host: config.host,
    pairing,
    model,
    resolution,
    keepaliveMs: config.keepaliveMs,
    sendPrompt: applyPrompt,
    startSession,
    stopSession,
    closeSession,
    optionsProvider,
    switchSession,
  })

  const getSessionTitle = options.getSessionTitle
  const TITLE_TRIGGERS = new Set(["session.created", "session.inbox.enqueued", "session.execution.started"])
  const titleTimers = new Map()
  // OpenCode does not put the session title in the event stream, so resolve it
  // out of band (debounced) and feed it back through the model as session.title.
  function refreshTitle(sessionID) {
    if (!getSessionTitle || !sessionID) return
    const existing = titleTimers.get(sessionID)
    if (existing) clearTimeout(existing)
    titleTimers.set(
      sessionID,
      setTimeout(() => {
        titleTimers.delete(sessionID)
        Promise.resolve(getSessionTitle({ sessionID }))
          .then((title) => {
            if (title) handleEvent({ type: "session.title", data: { sessionID, title } })
          })
          .catch(() => {})
      }, 1200),
    )
  }

  function handleEvent(event) {
    dbg("event", { type: event && event.type, data: event && event.data })
    const events = model.apply(event)
    const lifecycle = /session\.(created|deleted|idle|status|execution)/.test(String(event && event.type))
    if (events.length > 0 || lifecycle) {
      dbg("emitted", {
        events: events.map((emitted) => emitted.type),
        phases: [...model.sessions.values()].map((session) => `${session.id}:${session.phase}`),
      })
    }
    for (const emitted of events) {
      server.broadcast(emitted.type, emitted.data)
      const kind = DOORBELL_KIND[emitted.type]
      if (kind) {
        void doorbell({
          kind,
          requestID: emitted.data.requestID,
          sessionID: emitted.data.sessionID,
          title: emitted.data.title || emitted.data.summary || "",
        })
      }
    }
    const type = event && event.type
    const sessionID = event && event.data && event.data.sessionID
    if (TITLE_TRIGGERS.has(type)) refreshTitle(sessionID)
    if (type === "session.created" && sessionID && pendingIdle.has(sessionID)) {
      clearTimeout(pendingIdle.get(sessionID))
      pendingIdle.delete(sessionID)
      markIdle(sessionID)
    }
    return events
  }

  return { config, model, pairing, resolution, server, doorbell, handleEvent }
}

function makePermissionApplier(ctx) {
  return async ({ sessionID, requestID, decision }) => {
    const mapped = decision === "allow" ? "once" : "reject"
    dbg("applyPermission", { sessionID, requestID, mapped })
    try {
      await ctx.permission.reply({ sessionID, requestID, decision: mapped })
      dbg("applyPermission ok", { requestID })
    } catch (err) {
      // ctx.permission.reply intermittently reports the request as not found;
      // the local service HTTP endpoint is the reliable path (as Open Island does).
      dbg("applyPermission ctx failed, HTTP fallback", { requestID, error: String(err && err.message) })
      await replyToPermission(sessionID, requestID, mapped)
      dbg("applyPermission http ok", { requestID })
    }
  }
}

function makeQuestionApplier() {
  // V2 exposes no ctx.session.form.reply, so questions are answered over the
  // local service HTTP API; build a Form.Answer for every field of the form.
  return async ({ sessionID, requestID, text, fields, answers }) => {
    const list = Array.isArray(fields) ? fields : []
    const provided = answers && typeof answers === "object" ? answers : {}
    const answer = {}
    list.forEach((field, index) => {
      const key = (field && field.key) || `q${index}`
      const value = provided[key] != null ? provided[key] : index === 0 ? text : ""
      answer[key] = buildFormAnswer(field, value == null ? "" : value)
    })
    dbg("applyQuestion", { sessionID, requestID, answer })
    try {
      await replyToForm(sessionID, requestID, answer)
      dbg("applyQuestion ok", { requestID })
    } catch (err) {
      dbg("applyQuestion failed", { requestID, error: String(err && err.message) })
      throw err
    }
  }
}

function makePromptApplier(ctx) {
  return async ({ sessionID, text }) => {
    dbg("applyPrompt", { sessionID, text: String(text).slice(0, 80) })
    await ctx.session.prompt({ sessionID, text })
    dbg("applyPrompt ok", { sessionID })
  }
}

function makeStartApplier(ctx) {
  return async ({ title } = {}) => {
    dbg("applyStart", { title })
    const session = await ctx.session.create(title ? { title } : {})
    dbg("applyStart ok", { id: session && (session.id || session.sessionID) })
    return session
  }
}

function makeStopApplier(ctx) {
  return async ({ sessionID }) => {
    dbg("applyStop", { sessionID })
    await ctx.session.interrupt({ sessionID, continue: false })
    dbg("applyStop ok", { sessionID })
  }
}

function makeCloseApplier(ctx) {
  return async ({ sessionID }) => {
    dbg("applyClose", { sessionID })
    await ctx.session.remove({ sessionID })
    dbg("applyClose ok", { sessionID })
  }
}

function asArray(value, keys) {
  if (Array.isArray(value)) return value
  if (value && typeof value === "object") {
    for (const key of keys) if (Array.isArray(value[key])) return value[key]
  }
  return []
}

function makeOptionsApplier(ctx) {
  return async () => {
    const result = { agents: [], models: [] }
    try {
      const raw = typeof ctx.agent?.list === "function" ? await ctx.agent.list() : null
      const agents = asArray(raw, ["agents", "items", "data"])
      // Only user-selectable modes: primary agents (build/plan), not subagents.
      const primary = agents.filter((a) => a.mode === "primary" || a.mode === "all")
      const chosen = primary.length > 0 ? primary : agents.filter((a) => a.mode !== "subagent" && !a.hidden)
      result.agents = chosen.map((a) => a.id || a.agentID || a.name).filter(Boolean)
      dbg("options.agents", {
        kind: Array.isArray(raw) ? "array" : typeof raw,
        keys: raw && typeof raw === "object" ? Object.keys(raw).slice(0, 8) : [],
        total: agents.length,
        count: result.agents.length,
        sample: agents.slice(0, 3).map((a) => ({ id: a.id || a.name, mode: a.mode, hidden: a.hidden })),
      })
    } catch (err) {
      dbg("options.agents error", String(err && err.message))
    }
    try {
      const raw = typeof ctx.model?.list === "function" ? await ctx.model.list() : null
      const models = asArray(raw, ["models", "items", "data"])
      result.models = models
        .map((m) => ({
          providerID: m.providerID || m.provider || "",
          id: m.id || m.modelID || m.modelId || "",
          name: m.name,
          variant: m.variant,
        }))
        .filter((m) => m.id)
      dbg("options.models", {
        kind: Array.isArray(raw) ? "array" : typeof raw,
        keys: raw && typeof raw === "object" ? Object.keys(raw).slice(0, 8) : [],
        count: result.models.length,
      })
    } catch (err) {
      dbg("options.models error", String(err && err.message))
    }
    return result
  }
}

function makeSwitchApplier(ctx) {
  return async ({ sessionID, agent, model }) => {
    dbg("applySwitch", { sessionID, agent, model })
    if (agent) await ctx.session.switchAgent({ sessionID, agent })
    if (model) await ctx.session.switchModel({ sessionID, model })
    dbg("applySwitch ok", { sessionID })
  }
}

/**
 * OpenCode plugin entry. Starts the bridge once per process, subscribes to the
 * event stream, and returns a teardown. Fail-open: any startup failure leaves
 * OpenCode unchanged.
 */
export async function setup(ctx, options = {}) {
  if (globalThis[STARTED_KEY]) return globalThis[STARTED_KEY]

  const applyPermission = options.applyPermission || makePermissionApplier(ctx)
  const applyQuestion = options.applyQuestion || makeQuestionApplier()
  const applyPrompt = options.applyPrompt || makePromptApplier(ctx)
  const startSession = options.startSession || makeStartApplier(ctx)
  const stopSession = options.stopSession || makeStopApplier(ctx)
  const closeSession = options.closeSession || makeCloseApplier(ctx)
  const optionsProvider = options.optionsProvider || makeOptionsApplier(ctx)
  const switchSession = options.switchSession || makeSwitchApplier(ctx)
  const getSessionTitle =
    options.getSessionTitle ||
    (async ({ sessionID }) => {
      const info = await ctx.session.get({ sessionID })
      return info && (info.title || info.name)
    })
  const bridge = buildBridge({ ...options, applyPermission, applyQuestion, applyPrompt, startSession, stopSession, closeSession, optionsProvider, switchSession, getSessionTitle })
  dbg("setup", { port: bridge.config.port, host: bridge.config.host })

  try {
    await bridge.server.start()
  } catch (err) {
    debug(`bridge server failed to start: ${err && err.message}`)
    globalThis[STARTED_KEY] = bridge
    return bridge
  }
  globalThis[STARTED_KEY] = bridge

  const abort = new AbortController()
  void superviseEventStream({
    subscribe: (opts) => ctx.event.subscribe(opts),
    onEvent: (event) => bridge.handleEvent(event),
    signal: abort.signal,
    log: (message) => dbg("eventStream", { message }),
    onReconnect: (attempt) => {
      // Events during the gap were missed: ask the phone to resync from the
      // current snapshot and record the recovery for diagnostics.
      dbg("eventStream reconnect", { attempt })
      void bridge.doorbell({ kind: "refresh" })
    },
  }).catch((err) => debug(`event stream supervisor failed: ${err && err.message}`))

  bridge.stop = async () => {
    abort.abort()
    await bridge.server.stop()
    delete globalThis[STARTED_KEY]
  }

  const address = bridge.server.address()
  debug(`bridge listening on ${bridge.config.host}:${address && address.port}`)
  return bridge
}
