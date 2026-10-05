import test from "node:test"
import assert from "node:assert/strict"
import { loadContract, validateContract } from "./validate.mjs"

test("every fixture satisfies its declared schema", () => {
  const contract = loadContract()
  const errors = validateContract(contract)
  assert.deepEqual(errors, [], errors.join("\n"))
})

test("every stream event has at least one fixture", () => {
  const contract = loadContract()
  const covered = new Set(Object.values(contract.fixtures).map((f) => f.schema))
  for (const ev of contract.streamEvents) {
    assert.ok(covered.has(ev), `no fixture covers stream event "${ev}"`)
  }
})

test("contract declares the BLE identifiers and phases", () => {
  const contract = loadContract()
  for (const key of ["serviceUUID", "doorbellUUID", "rendezvousUUID", "pairingUUID"]) {
    assert.match(contract.ble[key], /^[0-9a-f-]{36}$/i, `ble.${key} is not a UUID`)
  }
  assert.ok(contract.phases.includes("waiting-permission"))
  assert.ok(contract.phases.includes("waiting-answer"))
})
