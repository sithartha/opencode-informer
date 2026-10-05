import test from "node:test"
import assert from "node:assert/strict"
import { reconnectWithToken } from "../src/reconnect"
import { memoryTokenStore } from "../src/tokenStore"

const snapshot = { activeSessionCount: 0, sessions: [] }

test("reconnect succeeds with a valid stored token", async () => {
  const store = memoryTokenStore("good")
  const result = await reconnectWithToken("http://h:1", store, async () => snapshot)
  assert.equal(result.token, "good")
  assert.deepEqual(result.snapshot, snapshot)
})

test("no stored token means pairing is required", async () => {
  const store = memoryTokenStore(null)
  const result = await reconnectWithToken("http://h:1", store, async () => snapshot)
  assert.deepEqual(result, { token: null, snapshot: null })
})

test("a 401 clears the token so the app re-pairs", async () => {
  const store = memoryTokenStore("revoked")
  const result = await reconnectWithToken("http://h:1", store, async () => {
    throw new Error("unauthorized")
  })
  assert.deepEqual(result, { token: null, snapshot: null })
  assert.equal(await store.get(), null)
})

test("a transient error is surfaced, not swallowed", async () => {
  const store = memoryTokenStore("good")
  await assert.rejects(
    () =>
      reconnectWithToken("http://h:1", store, async () => {
        throw new Error("state 500")
      }),
    /state 500/,
  )
  assert.equal(await store.get(), "good")
})
