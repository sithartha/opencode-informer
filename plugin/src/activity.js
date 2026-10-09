// Activity model: turns the OpenCode V2 event stream into session state and
// outgoing bridge stream events. Pure of I/O so it stays unit-testable.

const ACTIVE_PHASES = new Set(["running", "waiting-permission", "waiting-answer"])
const MAX_RESOLVED = 5000
// Cap the activity text carried in snapshots/notifications while a question keeps
// appending, so a long back-and-forth cannot grow unbounded.
const MAX_ACTIVITY = 4000

function appendActivity(existing, next) {
  if (!existing) return next
  const combined = `${existing}\n\n${next}`
  return combined.length > MAX_ACTIVITY ? combined.slice(combined.length - MAX_ACTIVITY) : combined
}

function ev(type, data) {
  return { type, data }
}

function clip(value, max = 200) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "")
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function permissionSummary(payload) {
  const resources = Array.isArray(payload.resources) ? payload.resources : []
  if (resources.length > 0) return clip(resources.join(", "))
  if (payload.message) return clip(payload.message)
  return clip(payload.metadata || {})
}

/** Normalize an OpenCode model ref to "provider/id" (with "#variant" when not default). */
function normalizeModel(model) {
  if (!model || typeof model !== "object") return ""
  const provider = model.providerID || model.provider || ""
  const id = model.id || model.modelID || ""
  const base = provider && id ? `${provider}/${id}` : id || provider || ""
  if (!base) return ""
  return model.variant && model.variant !== "default" ? `${base}#${model.variant}` : base
}

function fieldOptions(field) {
  const options = []
  for (const option of Array.isArray(field && field.options) ? field.options : []) {
    if (option == null) continue
    // OpenCode options are `{ label, value }` objects, but tolerate plain strings.
    const raw = typeof option === "object" ? option : { label: option }
    const label = raw.label != null ? String(raw.label) : raw.value != null ? String(raw.value) : ""
    if (!label || options.some((existing) => existing.label === label)) continue
    const entry = { label }
    if (raw.value != null) entry.value = String(raw.value)
    if (raw.description != null) entry.description = String(raw.description)
    options.push(entry)
  }
  return options
}

// One question per form field, each with its own prompt, options and free-form flag.
// A field without a key gets a stable index-based key so answers still map back.
function questionList(form) {
  const fields = Array.isArray(form && form.fields) ? form.fields : []
  return fields.map((field, index) => {
    const options = fieldOptions(field)
    const title = (field && (field.title || field.description)) || (field && field.key) || `Question ${index + 1}`
    const summary = field && field.description && field.description !== title ? field.description : undefined
    return {
      key: (field && field.key) || `q${index}`,
      title,
      summary,
      options,
      allowFreeform: Boolean(field && field.custom) || options.length === 0,
    }
  })
}

// Open Island keeps one pending interaction per session; supersede any previous one
// so a session never shows two stacked requests. Returns the superseded request ids.
function supersedeSessionPending(pending, sessionID) {
  const removed = []
  for (const [key, value] of pending) {
    if (value.sessionID === sessionID) {
      pending.delete(key)
      removed.push(key)
    }
  }
  return removed
}

export class ActivityModel {
  constructor() {
    this.sessions = new Map() // root sessionID -> session
    this.parents = new Map() // child sessionID -> parent sessionID
    this.pending = new Map() // requestID -> { sessionID, kind, fields }
    this.resolved = new Map() // requestID -> timestamp
    this.toolNames = new Map() // tool call id -> name
  }

  rootSession(id) {
    let current = id
    const seen = new Set()
    while (current && this.parents.has(current) && !seen.has(current)) {
      seen.add(current)
      current = this.parents.get(current)
    }
    return current
  }

  isChild(id) {
    return this.parents.has(id)
  }

  get(id) {
    return this.sessions.get(this.rootSession(id))
  }

  /** True while the session has an unanswered question form. */
  questionPending(sessionID) {
    for (const pending of this.pending.values()) {
      if (pending.sessionID === sessionID && pending.kind === "question") return true
    }
    return false
  }

  /**
   * Return the session, creating a minimal record if we have not seen its
   * session.created (e.g. it started before the plugin loaded). Keeps the
   * dashboard showing live sessions instead of only newly created ones.
   */
  ensureSession(id) {
    if (!id || this.parents.has(id)) return this.sessions.get(id) || null
    let session = this.sessions.get(id)
    if (!session) {
      session = {
        id,
        title: "",
        agent: "opencode",
        model: "",
        cwd: "",
        phase: "running",
        currentTool: null,
        lastActivity: "",
        subagents: 0,
        shells: 0,
        updatedAt: Date.now(),
      }
      this.sessions.set(id, session)
    }
    return session
  }

  activeSessionCount() {
    let count = 0
    for (const session of this.sessions.values()) if (ACTIVE_PHASES.has(session.phase)) count += 1
    return count
  }

  snapshot() {
    return {
      activeSessionCount: this.activeSessionCount(),
      sessions: [...this.sessions.values()].map((session) => ({ ...session })),
      pending: [...this.pending.entries()].map(([requestID, pending]) => ({
        requestID,
        sessionID: pending.sessionID,
        kind: pending.kind,
        title: pending.title || (pending.kind === "permission" ? "Permission" : "Question"),
        summary: pending.summary,
        options: pending.options,
        allowFreeform: Boolean(pending.allowFreeform),
        questions: pending.questions,
      })),
    }
  }

  pendingRequest(requestID) {
    return this.pending.get(requestID)
  }

  isResolved(requestID) {
    return Boolean(requestID) && this.resolved.has(requestID)
  }

  markResolved(requestID) {
    if (!requestID) return
    const pending = this.pending.get(requestID)
    this.pending.delete(requestID)
    // Resolving a request always returns the session to running, whatever the
    // source (phone, TUI, or a restored snapshot), so counts stay correct.
    if (pending) {
      const session = this.sessions.get(pending.sessionID)
      if (session && (session.phase === "waiting-permission" || session.phase === "waiting-answer")) {
        session.phase = "running"
        session.updatedAt = Date.now()
      }
    }
    this.resolved.set(requestID, Date.now())
    if (this.resolved.size > MAX_RESOLVED) {
      const first = this.resolved.keys().next().value
      if (first) this.resolved.delete(first)
    }
  }

  /** Apply one OpenCode event; returns the outgoing bridge stream events. */
  apply(event) {
    const type = event && event.type
    const payload = (event && event.data) || {}
    const cwd = event && event.location && event.location.directory
    const out = []

    // Adopt a working directory reported by the event envelope so sessions we
    // only learn about lazily (e.g. after a restart) still show their directory.
    if (cwd && payload.sessionID && type !== "session.created" && type !== "session.deleted" && !this.isChild(payload.sessionID)) {
      const root = this.rootSession(payload.sessionID)
      const session = this.ensureSession(root)
      if (session && session.cwd !== cwd) {
        session.cwd = cwd
        session.updatedAt = Date.now()
        out.push(ev("session.updated", { sessionID: root, cwd }))
      }
    }

    switch (type) {
      case "session.created": {
        if (payload.parentID) {
          this.parents.set(payload.sessionID, payload.parentID)
          const root = this.rootSession(payload.parentID)
          // If a row was created for this child before we learned its parent
          // (lazy adoption), drop it so it folds into the parent.
          if (this.sessions.delete(payload.sessionID)) {
            out.push(ev("session.ended", { sessionID: payload.sessionID }))
          }
          const parentSession = this.sessions.get(root)
          if (parentSession) {
            parentSession.subagents = (parentSession.subagents || 0) + 1
            parentSession.updatedAt = Date.now()
          }
          return out
        }
        const dir = (payload.location && payload.location.directory) || cwd || ""
        this.sessions.set(payload.sessionID, {
          id: payload.sessionID,
          title: "",
          agent: "opencode",
          model: "",
          cwd: dir,
          phase: "running",
          currentTool: null,
          lastActivity: "Session started",
          subagents: 0,
          shells: 0,
          updatedAt: Date.now(),
        })
        out.push(ev("session.started", { sessionID: payload.sessionID, agent: "opencode", cwd: dir }))
        return out
      }

      case "session.deleted": {
        const child = this.isChild(payload.sessionID)
        const rootBefore = this.rootSession(payload.sessionID)
        this.parents.delete(payload.sessionID)
        if (child) {
          const parent = this.sessions.get(rootBefore)
          if (parent) {
            parent.subagents = Math.max(0, (parent.subagents || 0) - 1)
            parent.updatedAt = Date.now()
          }
          return out
        }
        this.sessions.delete(payload.sessionID)
        out.push(ev("session.ended", { sessionID: payload.sessionID }))
        return out
      }

      // The session's title (name), resolved from OpenCode out of band.
      case "session.title": {
        if (this.isChild(payload.sessionID)) return out
        const session = this.ensureSession(payload.sessionID)
        const title = payload.title != null ? String(payload.title) : ""
        if (session && title && title !== session.title) {
          session.title = title
          session.updatedAt = Date.now()
          out.push(ev("session.updated", { sessionID: session.id, title }))
        }
        return out
      }

      // Optimistically apply an agent/model switch so clients reflect it at once
      // (OpenCode only reports it on the next step event).
      case "session.meta": {
        if (this.isChild(payload.sessionID)) return out
        const session = this.ensureSession(payload.sessionID)
        if (session) {
          let changed = false
          if (payload.agent && payload.agent !== session.agent) {
            session.agent = String(payload.agent)
            changed = true
          }
          const model = normalizeModel(payload.model)
          if (model && model !== session.model) {
            session.model = model
            changed = true
          }
          if (changed) {
            session.updatedAt = Date.now()
            out.push(ev("session.updated", { sessionID: session.id, agent: session.agent, model: session.model }))
          }
        }
        return out
      }

      // Carries the active agent (mode) and model for the session's current step.
      case "session.step.started": {        if (this.isChild(payload.sessionID)) return out
        const session = this.ensureSession(payload.sessionID)
        if (session) {
          let changed = false
          if (session.phase !== "running") {
            session.phase = "running"
            changed = true
          }
          const agent = payload.agent ? String(payload.agent) : ""
          if (agent && agent !== session.agent) {
            session.agent = agent
            changed = true
          }
          const model = normalizeModel(payload.model)
          if (model && model !== session.model) {
            session.model = model
            changed = true
          }
          if (changed) {
            session.updatedAt = Date.now()
            out.push(ev("session.updated", { sessionID: session.id, agent: session.agent, model: session.model }))
          }
        }
        return out
      }

      case "session.inbox.enqueued": {
        if (this.isChild(payload.sessionID)) return out
        if (payload.item && payload.item.type === "user") {
          const text = (payload.item.payload && payload.item.payload.text) || ""
          const session = this.ensureSession(payload.sessionID)
          if (session) {
            session.phase = "running"
            session.currentTool = null
            if (text) session.lastActivity = text
            session.updatedAt = Date.now()
          }
          out.push(ev("prompt.submitted", { sessionID: payload.sessionID, text }))
        }
        return out
      }

      // Force an idle phase without emitting a completion (used right after we
      // create an empty session, which OpenCode reports as created but idle).
      case "session.idle.silent": {
        const session = this.ensureSession(payload.sessionID)
        if (session) {
          session.phase = "completed"
          session.currentTool = null
          session.updatedAt = Date.now()
          out.push(ev("session.updated", { sessionID: session.id, phase: "completed" }))
        }
        return out
      }

      case "session.execution.started": {
        if (this.isChild(payload.sessionID)) return out
        const session = this.ensureSession(payload.sessionID)
        if (session) {
          session.phase = "running"
          session.updatedAt = Date.now()
        }
        return out
      }

      // A session that goes idle has finished its turn. Some V2 builds emit
      // session.idle, others only session.status with an idle status.
      case "session.idle":
      case "session.status": {
        if (type === "session.status" && !(payload.status && payload.status.type === "idle")) return out
        if (this.isChild(payload.sessionID)) return out
        const session = this.ensureSession(payload.sessionID)
        if (session && session.phase !== "waiting-permission" && session.phase !== "waiting-answer") {
          session.phase = "completed"
          session.currentTool = null
          session.updatedAt = Date.now()
          out.push(ev("turn.completed", { sessionID: payload.sessionID, summary: session.lastActivity || "" }))
        }
        return out
      }

      case "session.execution.succeeded": {
        if (this.isChild(payload.sessionID)) return out
        const session = this.get(payload.sessionID)
        if (session) {
          session.phase = "completed"
          session.currentTool = null
          session.updatedAt = Date.now()
        }
        // Only a successful turn end is a "task complete" worth notifying.
        out.push(ev("turn.completed", { sessionID: payload.sessionID, summary: (session && session.lastActivity) || "" }))
        return out
      }

      case "session.execution.failed":
      case "session.execution.interrupted": {
        // Failures and user interrupts are not completions; update state without a completion push.
        if (this.isChild(payload.sessionID)) return out
        const session = this.get(payload.sessionID)
        if (session) {
          session.phase = "completed"
          session.currentTool = null
          session.updatedAt = Date.now()
        }
        return out
      }

      case "session.text.ended": {
        const root = this.rootSession(payload.sessionID)
        const session = this.ensureSession(root)
        if (session && payload.text) {
          const text = String(payload.text)
          // While a question is unanswered, keep the text the user is reading:
          // append the new text instead of replacing it.
          session.lastActivity = this.questionPending(root) ? appendActivity(session.lastActivity, text) : text
          session.updatedAt = Date.now()
          out.push(ev("session.activity", { sessionID: root, text: session.lastActivity }))
        }
        return out
      }

      case "session.cost": {
        if (this.isChild(payload.sessionID)) return out
        const session = this.ensureSession(this.rootSession(payload.sessionID))
        const cost = Number(payload.cost)
        if (session && Number.isFinite(cost) && session.cost !== cost) {
          session.cost = cost
          session.updatedAt = Date.now()
          out.push(ev("session.cost", { sessionID: session.id, cost }))
        }
        return out
      }

      case "session.tool.input.started": {
        if (payload.id) this.toolNames.set(payload.id, payload.name || "")
        return out
      }

      case "session.tool.called": {
        const root = this.rootSession(payload.sessionID)
        const name = payload.name || this.toolNames.get(payload.id) || ""
        const session = this.ensureSession(root)
        if (session) {
          session.currentTool = name
          session.lastActivity = name
          session.phase = "running"
          session.shells = (session.shells || 0) + 1
          session.updatedAt = Date.now()
        }
        out.push(ev("tool.started", { sessionID: root, tool: name, input: clip(payload.input) }))
        return out
      }

      case "session.tool.success":
      case "session.tool.failed": {
        const root = this.rootSession(payload.sessionID)
        const session = this.ensureSession(root)
        const name = this.toolNames.get(payload.id) || (session && session.currentTool) || ""
        this.toolNames.delete(payload.id)
        if (session) {
          session.currentTool = null
          session.shells = Math.max(0, (session.shells || 0) - 1)
          session.updatedAt = Date.now()
        }
        out.push(ev("tool.ended", { sessionID: root, tool: name }))
        return out
      }

      case "permission.asked": {
        const root = this.rootSession(payload.sessionID)
        const session = this.ensureSession(root)
        const requestID = payload.id
        const title = `Allow ${payload.action || "action"}`
        const summary = permissionSummary(payload)
        if (requestID) {
          const removed = supersedeSessionPending(this.pending, root)
          for (const oldID of removed) out.push(ev("actionable.resolved", { sessionID: root, requestID: oldID }))
          this.pending.set(requestID, { sessionID: root, kind: "permission", title, summary })
        }
        if (session) {
          session.phase = "waiting-permission"
          session.lastActivity = payload.action ? `Permission: ${payload.action}` : session.lastActivity
          session.updatedAt = Date.now()
        }
        out.push(
          ev("permission.requested", {
            sessionID: root,
            requestID,
            title,
            summary,
            agent: (session && session.agent) || "opencode",
            workingDirectory: session ? session.cwd : undefined,
          }),
        )
        return out
      }

      case "permission.replied": {
        const requestID = payload.id || payload.requestID
        const root = this.rootSession(payload.sessionID)
        this.markResolved(requestID)
        const session = this.sessions.get(root)
        if (session && session.phase === "waiting-permission") {
          session.phase = "running"
          session.updatedAt = Date.now()
        }
        if (requestID) out.push(ev("actionable.resolved", { sessionID: root, requestID }))
        return out
      }

      case "form.created": {
        const form = payload.form || {}
        const root = this.rootSession(form.sessionID || payload.sessionID)
        const session = this.ensureSession(root)
        const requestID = form.id
        const questions = questionList(form)
        const first = questions[0]
        // OpenCode puts the real question on the field; form.title is generic
        // (e.g. "Questions"), so prefer the first field's title/description.
        const title = (first && first.title) || form.title || "Question"
        const options = first ? first.options : []
        const allowFreeform = first ? first.allowFreeform : true
        const summary = first && first.summary
        if (requestID) {
          const removed = supersedeSessionPending(this.pending, root)
          for (const oldID of removed) out.push(ev("actionable.resolved", { sessionID: root, requestID: oldID }))
          this.pending.set(requestID, {
            sessionID: root,
            kind: "question",
            title,
            summary,
            options,
            allowFreeform,
            fields: form.fields,
            questions,
          })
        }
        if (session) {
          session.phase = "waiting-answer"
          // Do not overwrite the activity text the user may be reading; the
          // question is shown separately and the pre-question text is preserved.
          session.updatedAt = Date.now()
        }
        out.push(ev("question.asked", { sessionID: root, requestID, title, summary, options, allowFreeform, questions }))
        return out
      }

      case "form.replied":
      case "form.cancelled": {
        const requestID = payload.id || (payload.form && payload.form.id)
        const root = this.rootSession(payload.sessionID)
        this.markResolved(requestID)
        const session = this.sessions.get(root)
        if (session && session.phase === "waiting-answer") {
          session.phase = "running"
          session.updatedAt = Date.now()
        }
        if (requestID) out.push(ev("actionable.resolved", { sessionID: root, requestID }))
        return out
      }

      default:
        return out
    }
  }
}
