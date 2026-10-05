import test from "node:test"
import assert from "node:assert/strict"
import { loadContract, validateContract } from "../../contract/validate.mjs"

// The app consumes the same fixtures as the plugin. This is the shared-shape check
// that the app's types must agree with; it runs without any app dependencies.

test("app consumes the shared contract fixtures", () => {
  const contract = loadContract()
  assert.deepEqual(validateContract(contract), [])
})

test("the app knows every actionable event it must handle", () => {
  const contract = loadContract()
  const actionable = ["permission.requested", "question.asked", "turn.completed", "actionable.resolved"]
  for (const ev of actionable) {
    assert.ok(contract.streamEvents.includes(ev), `app must handle "${ev}"`)
  }
})

test("resolution and doorbell shapes are present for the app", () => {
  const contract = loadContract()
  assert.ok(contract.fixtures["resolution.request"])
  assert.ok(contract.fixtures["doorbell.permission"])
  assert.equal(contract.phases.length, 5)
})
