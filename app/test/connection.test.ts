import test from "node:test"
import assert from "node:assert/strict"
import { connectionReducer, initialConnection } from "../src/connection"

test("connection transitions from discovering to connected", () => {
  let state = connectionReducer(initialConnection, { type: "discover" })
  assert.equal(state.status, "discovering")
  state = connectionReducer(state, { type: "pairingStarted", macName: "Mac" })
  assert.equal(state.status, "connecting")
  state = connectionReducer(state, { type: "connected", macName: "Mac" })
  assert.equal(state.status, "connected")
  assert.equal(state.macName, "Mac")
})

test("a known Mac recovers after a disconnect, an unknown one does not", () => {
  const withMac = connectionReducer({ status: "connected", macName: "Mac" }, { type: "disconnected" })
  assert.equal(withMac.status, "recovering")

  const withoutMac = connectionReducer({ status: "connected" }, { type: "disconnected" })
  assert.equal(withoutMac.status, "disconnected")
})

test("failures surface an error and reset clears state", () => {
  const failed = connectionReducer({ status: "discovering" }, { type: "failed", message: "no Mac" })
  assert.equal(failed.status, "disconnected")
  assert.equal(failed.error, "no Mac")

  const reset = connectionReducer({ status: "connected", macName: "Mac" }, { type: "reset" })
  assert.equal(reset.status, "disconnected")
  assert.equal(reset.macName, undefined)
})
