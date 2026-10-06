import test from "node:test"
import assert from "node:assert/strict"
import { superviseEventStream } from "../src/eventStream.js"

test("resubscribes when the stream ends and backs off", async () => {
  const ac = new AbortController()
  let calls = 0
  const delays = []

  await superviseEventStream({
    subscribe: async function* () {
      calls += 1
      // ends immediately without yielding anything -> backoff should grow
    },
    onEvent: () => {},
    signal: ac.signal,
    delay: async (ms) => {
      delays.push(ms)
      if (calls >= 3) ac.abort()
    },
    log: () => {},
  })

  assert.equal(calls, 3)
  assert.deepEqual(delays, [1000, 2000, 4000])
})

test("resubscribes after a stream error and logs it", async () => {
  const ac = new AbortController()
  let calls = 0
  const logs = []

  await superviseEventStream({
    subscribe: () => {
      calls += 1
      throw new Error("boom")
    },
    onEvent: () => {},
    signal: ac.signal,
    delay: async () => {
      if (calls >= 2) ac.abort()
    },
    log: (message) => logs.push(message),
  })

  assert.equal(calls, 2)
  assert.equal(logs.filter((line) => line.includes("boom")).length, 2)
})

test("calls onReconnect before each resubscribe (not the first)", async () => {
  const ac = new AbortController()
  const attempts = []
  let calls = 0

  await superviseEventStream({
    subscribe: async function* () {
      calls += 1
      yield { n: calls }
    },
    onEvent: (event) => {
      if (event.n >= 2) ac.abort()
    },
    signal: ac.signal,
    delay: async () => {},
    onReconnect: (attempt) => attempts.push(attempt),
  })

  assert.deepEqual(attempts, [2])
})

test("stops immediately when the signal is already aborted", async () => {
  const ac = new AbortController()
  ac.abort()
  let calls = 0

  await superviseEventStream({
    subscribe: async function* () {
      calls += 1
      yield { n: 1 }
    },
    onEvent: () => {},
    signal: ac.signal,
    delay: async () => {},
  })

  assert.equal(calls, 0)
})

test("keeps handling events from a live stream", async () => {
  const ac = new AbortController()
  const seen = []

  await superviseEventStream({
    subscribe: async function* () {
      yield { n: 1 }
      yield { n: 2 }
      yield { n: 3 }
      ac.abort()
    },
    onEvent: (event) => seen.push(event.n),
    signal: ac.signal,
    delay: async () => {},
  })

  assert.deepEqual(seen, [1, 2, 3])
})
