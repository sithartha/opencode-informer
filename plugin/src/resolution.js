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

export class ResolutionCoordinator {
  constructor({ model, applyPermission, applyQuestion, onResolved, applyTimeoutMs = 10000 }) {
    this.model = model
    this.applyPermission = applyPermission
    this.applyQuestion = applyQuestion
    this.onResolved = onResolved
    this.applyTimeoutMs = applyTimeoutMs
  }

  async resolve(requestID, action) {
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
        await withTimeout(this.applyPermission({ sessionID: pending.sessionID, requestID, decision }), this.applyTimeoutMs)
      } else {
        const text = String(action == null ? "" : action)
        if (!text) return { applied: false, reason: "invalid_action" }
        await withTimeout(
          this.applyQuestion({ sessionID: pending.sessionID, requestID, text, fields: pending.fields }),
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
