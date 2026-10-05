import { randomUUID, randomBytes } from "node:crypto"

const MAX_APPROVALS = 1000

// Pairing is out-of-band: the client asks to pair, the Mac user approves in the
// helper, and only then does the bridge issue a bearer token. Tokens are
// independent of Open Island's own pairing token.
export class PairingManager {
  constructor({ onApprovalRequested } = {}) {
    this.approvals = new Map()
    this.tokens = new Map()
    this.onApprovalRequested = onApprovalRequested
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
        this.onApprovalRequested({ ...approval })
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
