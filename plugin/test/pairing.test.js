import test from "node:test"
import assert from "node:assert/strict"
import { PairingManager } from "../src/pairing.js"

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
