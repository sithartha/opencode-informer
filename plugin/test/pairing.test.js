import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { PairingManager } from "../src/pairing.js"

function withStore(run) {
  const directory = mkdtempSync(join(tmpdir(), "open-island-pairing-"))
  try {
    return run(join(directory, "pairing.json"))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

function pair(store, deviceName = "Phone") {
  const pairing = new PairingManager({ storePath: store })
  const approval = pairing.begin(deviceName)
  return pairing.approve(approval.id).token
}

test("the pairing manager exposes a numeric code and validates it", () => {
  const pairing = new PairingManager()
  assert.match(pairing.currentCode(), /^\d{6}$/)
  assert.equal(pairing.validateCode(pairing.currentCode()), true)
  const other = pairing.currentCode() === "000000" ? "999999" : "000000"
  assert.equal(pairing.validateCode(other), false)
  assert.equal(pairing.validateCode(""), false)
})

test("the code is stable while a pairing is pending and rotates once approved", () => {
  const seen = []
  const pairing = new PairingManager({ onApprovalRequested: (approval) => seen.push(approval) })
  const first = pairing.currentCode()
  const approval = pairing.begin("Phone")
  assert.equal(pairing.currentCode(), first)
  assert.equal(seen[0].code, first)
  assert.equal(pairing.validateCode(first), true)

  pairing.approve(approval.id)
  assert.notEqual(pairing.currentCode(), first)
})

test("the code in the approval callback is the current one", () => {
  const seen = []
  const pairing = new PairingManager({ onApprovalRequested: (approval) => seen.push(approval) })
  pairing.begin("Phone")
  assert.match(seen[0].code, /^\d{6}$/)
})

test("a paired token survives a bridge restart", () => {
  withStore((store) => {
    const token = pair(store)
    const restarted = new PairingManager({ storePath: store })
    assert.equal(restarted.validate(token), true)
  })
})

test("a revoked token stays revoked after a restart", () => {
  withStore((store) => {
    const token = pair(store)
    const pairing = new PairingManager({ storePath: store })
    pairing.revoke(token)
    const restarted = new PairingManager({ storePath: store })
    assert.equal(restarted.validate(token), false)
  })
})

test("a corrupt token store starts empty instead of failing", () => {
  withStore((store) => {
    writeFileSync(store, "not json")
    const pairing = new PairingManager({ storePath: store })
    assert.equal(pairing.validate("anything"), false)
    const token = pair(store)
    assert.equal(new PairingManager({ storePath: store }).validate(token), true)
  })
})

test("the token store is owner-only", { skip: process.platform === "win32" }, () => {
  withStore((store) => {
    pair(store)
    assert.equal(statSync(store).mode & 0o777, 0o600)
  })
})

test("without a store path tokens stay in memory", () => {
  const pairing = new PairingManager()
  const approval = pairing.begin("Phone")
  const token = pairing.approve(approval.id).token
  assert.equal(new PairingManager().validate(token), false)
})
