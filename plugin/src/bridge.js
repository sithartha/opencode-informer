import { ActivityModel } from "./activity.js"
import { PairingManager } from "./pairing.js"
import { ResolutionCoordinator } from "./resolution.js"
import { createBridgeServer } from "./server.js"
import { createDoorbell } from "./doorbell.js"
import { configFromEnv } from "./contract.js"
import { buildFormAnswer, replyToForm, replyToPermission } from "./serviceReply.js"
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
  })

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
  // local service HTTP API; resolve the chosen label to the option value.
  return async ({ sessionID, requestID, text, fields }) => {
    const field = Array.isArray(fields) ? fields[0] : undefined
    const key = field && field.key ? field.key : "q0"
    // The service expects a Form.Answer: an object keyed by field key.
    const answer = { [key]: buildFormAnswer(field, text) }
    dbg("applyQuestion", { sessionID, requestID, text, answer })
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
  const bridge = buildBridge({ ...options, applyPermission, applyQuestion, applyPrompt })
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
  void (async () => {
    try {
      for await (const event of ctx.event.subscribe({ signal: abort.signal })) {
        try {
          bridge.handleEvent(event)
        } catch (err) {
          debug(`event handling failed: ${err && err.message}`)
        }
      }
    } catch (err) {
      if (!abort.signal.aborted) debug(`event loop error: ${err && err.message}`)
    }
  })()

  bridge.stop = async () => {
    abort.abort()
    await bridge.server.stop()
    delete globalThis[STARTED_KEY]
  }

  const address = bridge.server.address()
  debug(`bridge listening on ${bridge.config.host}:${address && address.port}`)
  return bridge
}
