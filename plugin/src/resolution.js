// Applies a phone resolution to a pending permission or question, with
// first-answer-wins bookkeeping. The bridge subscribes to OpenCode's
// permission.replied / form.replied events, so a resolution made on the Mac
// (TUI or Open Island) also marks the request resolved and clears it for the
// phone. No shared Promise.race is needed: whichever side resolves first
// produces the resolved event that suppresses the other.

const PERMISSION_ACTIONS = new Set(["allow", "deny"])

function withTimeout(promise, ms) {
  if (!ms || ms <= 0) return promise
  return Promise.race([
    promise,
    new Promise((_resolve, reject) => setTimeout(() => reject(new Error("resolution apply timed out")), ms)),
  ])
}

function questionKey(question, index) {
  return (question && question.key) || `q${index}`
}

/**
 * The session a reply must be applied to: the session that raised the request.
 * A subagent's request is presented under its parent, but OpenCode only accepts
 * the reply in the raising session.
 */
function replySessionID(pending) {
  return (pending && pending.replySessionID) || (pending && pending.sessionID)
}

/**
 * Coerce one provided answer into the shape its question expects: a list for a
 * question that allows several answers, a single string otherwise. Returns null
 * when the answer is empty, so an incomplete form is never applied.
 */
function coerceAnswer(question, value) {
  const allowsMultiple = Boolean(question && question.multiple)
  if (Array.isArray(value)) {
    const items = value.map((entry) => String(entry).trim()).filter(Boolean)
    if (items.length === 0) return null
    return allowsMultiple ? items : items[0]
  }
  const text = value == null ? "" : String(value).trim()
  if (text === "") return null
  if (allowsMultiple) return text.split(/\s*,\s*/).map((entry) => entry.trim()).filter(Boolean)
  return text
}

function answerText(value) {
  return Array.isArray(value) ? value.join(", ") : value
}

/**
 * Normalize a question resolution into `{ answers: { <key>: <text|list> }, text }`.
 * Every question of a multi-question form must be answered; returns null when the
 * resolution is incomplete so the bridge never applies a partial form reply.
 */
function questionAnswers(pending, action, answers) {
  const questions = Array.isArray(pending.questions) ? pending.questions : []
  const provided = answers && typeof answers === "object" ? answers : {}
  const out = {}

  if (questions.length > 1) {
    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index]
      const key = questionKey(question, index)
      const value = coerceAnswer(question, provided[key])
      if (value == null) return null
      out[key] = value
    }
    return { answers: out, text: answerText(out[questionKey(questions[0], 0)]) }
  }

  // Single question: accept a legacy `action` string or a keyed answer.
  const question = questions[0]
  const key = questionKey(question, 0)
  const raw = provided[key] != null ? provided[key] : action
  const value = coerceAnswer(question, raw)
  if (value == null) return null
  out[key] = value
  return { answers: out, text: answerText(value) }
}

export class ResolutionCoordinator {
  constructor({ model, applyPermission, applyQuestion, onResolved, applyTimeoutMs = 10000 }) {
    this.model = model
    this.applyPermission = applyPermission
    this.applyQuestion = applyQuestion
    this.onResolved = onResolved
    this.applyTimeoutMs = applyTimeoutMs
  }

  async resolve(requestID, action, answers) {
    if (!requestID || typeof requestID !== "string") {
      return { applied: false, reason: "invalid_request" }
    }
    if (this.model.isResolved(requestID)) {
      return { applied: false, reason: "already_resolved" }
    }
    const pending = this.model.pendingRequest(requestID)
    if (!pending) {
      return { applied: false, reason: "unknown" }
    }

    try {
      if (pending.kind === "permission") {
        const decision = String(action || "").toLowerCase()
        if (!PERMISSION_ACTIONS.has(decision)) {
          return { applied: false, reason: "invalid_action" }
        }
        await withTimeout(this.applyPermission({ sessionID: replySessionID(pending), requestID, decision }), this.applyTimeoutMs)
      } else {
        const resolved = questionAnswers(pending, action, answers)
        if (!resolved) return { applied: false, reason: "invalid_action" }
        await withTimeout(
          this.applyQuestion({
            sessionID: replySessionID(pending),
            requestID,
            text: resolved.text,
            fields: pending.fields,
            answers: resolved.answers,
          }),
          this.applyTimeoutMs,
        )
      }
    } catch {
      // Fail-open: an apply failure must not surface as a hang or an agent error.
      return { applied: false, reason: "apply_failed" }
    }

    this.model.markResolved(requestID)
    if (typeof this.onResolved === "function") this.onResolved(pending.sessionID, requestID)
    return { applied: true }
  }
}
