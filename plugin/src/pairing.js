import { randomUUID, randomBytes, randomInt } from "node:crypto"

const MAX_APPROVALS = 1000
const CODE_LENGTH = 6

function makeCode() {
  const max = 10 ** CODE_LENGTH
  return String(randomInt(0, max)).padStart(CODE_LENGTH, "0")
}

// Pairing is out-of-band: the client asks to pair, the Mac user approves in the
// helper, and only then does the bridge issue a bearer token. Tokens are
// independent of Open Island's own pairing token.
export class PairingManager {
  constructor({ onApprovalRequested } = {}) {
    this.approvals = new Map()
    this.tokens = new Map()
    this.onApprovalRequested = onApprovalRequested
    this.code = makeCode()
  }

  /** The current pairing code, shown on the Mac by the helper. */
  currentCode() {
    return this.code
  }

  /** Compare in constant time so a wrong code cannot be timed. */
  validateCode(candidate) {
    const value = String(candidate == null ? "" : candidate)
    if (value.length !== this.code.length) return false
    let diff = 0
    for (let i = 0; i < value.length; i++) diff |= value.charCodeAt(i) ^ this.code.charCodeAt(i)
    return diff === 0
  }

  /** Rotate the code once no pairing is pending, so an old code ages out. */
  rotateCodeIfIdle() {
    const pending = [...this.approvals.values()].some((approval) => approval.status === "pending")
    if (!pending) this.code = makeCode()
  }

  begin(deviceName) {
    const name = deviceName || "Unknown device"
    const now = Date.now()
    // Reuse a recent pending approval for the same device so repeated pairing
    // attempts do not ring the helper (and pop alerts) more than once.
    for (const existing of this.approvals.values()) {
      if (existing.status === "pending" && existing.deviceName === name && now - existing.createdAt < 120000) {
        return existing
      }
    }

    const approval = {
      id: randomUUID(),
      deviceName: name,
      status: "pending",
      createdAt: now,
      token: null,
    }
    this.approvals.set(approval.id, approval)
    this.pruneApprovals()
    if (typeof this.onApprovalRequested === "function") {
      try {
        // The code goes only to the local helper (never to a mobile client), so the
        // Mac user can read it to the pairing phone.
        this.onApprovalRequested({ ...approval, code: this.code })
      } catch {
        // helper notification is best-effort
      }
    }
    return approval
  }

  approve(approvalID) {
    const approval = this.approvals.get(approvalID)
    if (!approval || approval.status !== "pending") return null
    approval.status = "approved"
    approval.token = this.issueToken(approval.deviceName)
    // A successful pairing consumes the code; a fresh one is used next time.
    this.rotateCodeIfIdle()
    return approval
  }

  deny(approvalID) {
    const approval = this.approvals.get(approvalID)
    if (!approval || approval.status !== "pending") return null
    approval.status = "denied"
    return approval
  }

  status(approvalID) {
    const approval = this.approvals.get(approvalID)
    if (!approval) return null
    return {
      status: approval.status,
      token: approval.status === "approved" ? approval.token : undefined,
      deviceName: approval.deviceName,
    }
  }

  issueToken(deviceName) {
    const token = randomBytes(24).toString("base64url")
    this.tokens.set(token, { deviceName: deviceName || "unknown", createdAt: Date.now() })
    return token
  }

  validate(token) {
    return Boolean(token) && this.tokens.has(token)
  }

  revoke(token) {
    this.tokens.delete(token)
  }

  pruneApprovals() {
    if (this.approvals.size <= MAX_APPROVALS) return
    const overflow = this.approvals.size - MAX_APPROVALS
    let removed = 0
    for (const key of this.approvals.keys()) {
      this.approvals.delete(key)
      if (++removed >= overflow) break
    }
  }
}
