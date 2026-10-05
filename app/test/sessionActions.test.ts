import test from "node:test"
import assert from "node:assert/strict"
import { startSession, stopSession, switchSession } from "../src/sessionActions"
import type { FetchLike } from "../src/bridgeClient"

const fetchStatus = (status: number, body: unknown): FetchLike =>
  (async () => ({ status, ok: status >= 200 && status < 300, json: async () => body })) as unknown as FetchLike

test("startSession syncs after a successful start", async () => {
  let synced = 0
  const ok = await startSession("http://h:1", "t", () => { synced++ }, undefined, fetchStatus(200, { sessionID: "ses_1" }))
  assert.equal(ok, true)
  assert.equal(synced, 1)
})

test("stopSession syncs only when applied", async () => {
  let synced = 0
  assert.equal(await stopSession("http://h:1", "t", () => { synced++ }, "ses_1", fetchStatus(200, {})), true)
  assert.equal(synced, 1)

  let synced2 = 0
  assert.equal(await stopSession("http://h:1", "t", () => { synced2++ }, "ses_1", fetchStatus(409, {})), false)
  assert.equal(synced2, 0)
})

test("switchSession syncs when applied", async () => {
  let synced = 0
  assert.equal(await switchSession("http://h:1", "t", () => { synced++ }, "ses_1", { agent: "plan" }, fetchStatus(200, {})), true)
  assert.equal(synced, 1)
})
