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

test("startSession forwards the chosen mode and model", async () => {
  let body: unknown = null
  const fetchImpl = (async (_url: string, init: { body?: string }) => {
    body = JSON.parse(String(init.body))
    return { status: 200, ok: true, json: async () => ({ sessionID: "ses_1" }) }
  }) as unknown as FetchLike
  const ok = await startSession("http://h:1", "t", () => {}, undefined, fetchImpl, {
    agent: "plan",
    model: { providerID: "deepseek", id: "deepseek-flash" },
  })
  assert.equal(ok, true)
  assert.deepEqual(body, { agent: "plan", model: { providerID: "deepseek", id: "deepseek-flash" } })
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
