import test from "node:test"
import assert from "node:assert/strict"
import {
  REDISCOVER_AFTER_FAILURES,
  candidateFailure,
  friendlyConnectError,
  networkChangeAction,
  recordReconnectFailure,
} from "../src/rediscover"

test("re-discovery waits for three consecutive failures", () => {
  let failures = 0
  for (let attempt = 1; attempt < REDISCOVER_AFTER_FAILURES; attempt++) {
    const next = recordReconnectFailure(failures)
    failures = next.failures
    assert.equal(next.rediscover, false)
  }
  const third = recordReconnectFailure(failures)
  assert.equal(third.failures, REDISCOVER_AFTER_FAILURES)
  assert.equal(third.rediscover, true)
})

test("re-discovery keeps running on later failures", () => {
  const fourth = recordReconnectFailure(REDISCOVER_AFTER_FAILURES)
  assert.equal(fourth.rediscover, true)
})

test("a candidate that rejects the token is kept, not unpaired", () => {
  assert.equal(candidateFailure(new Error("unauthorized")), "keep-token")
})

test("a network failure on a candidate is retried", () => {
  assert.equal(candidateFailure(new Error("state 500")), "retry")
  assert.equal(candidateFailure("timeout"), "retry")
})

test("network changes are ignored while unpaired or disconnected by the user", () => {
  assert.equal(networkChangeAction({ paired: false, manuallyDisconnected: false, status: "connected" }), "ignore")
  assert.equal(networkChangeAction({ paired: true, manuallyDisconnected: true, status: "connected" }), "ignore")
})

test("a connected app probes, a recovering app rediscovers", () => {
  assert.equal(networkChangeAction({ paired: true, manuallyDisconnected: false, status: "connected" }), "probe")
  assert.equal(networkChangeAction({ paired: true, manuallyDisconnected: false, status: "recovering" }), "rediscover")
  assert.equal(networkChangeAction({ paired: true, manuallyDisconnected: false, status: "disconnected" }), "rediscover")
})

test("a scan timeout explains what to check", () => {
  assert.match(friendlyConnectError("ble scan timeout"), /helper is running/)
})

test("other connection errors pass through", () => {
  assert.equal(friendlyConnectError("Bluetooth is off. Turn it on to find your computer."), "Bluetooth is off. Turn it on to find your computer.")
})
