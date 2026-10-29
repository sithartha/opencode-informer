import test from "node:test"
import assert from "node:assert/strict"
import { buildBridge } from "../src/bridge.js"

test("hydrates sessions that existed before the plugin loaded", async () => {
  const bridge = buildBridge({
    config: { port: 0, keepaliveMs: 0, pairingStorePath: null },
    listSessions: async () => [
      { id: "ses_1", title: "One", agent: "build", location: { directory: "/a" }, time: { updated: Date.now(), idle: undefined } },
      { id: "ses_2", title: "Two", location: { directory: "/b" }, time: { updated: Date.now(), idle: Date.now() } },
    ],
  })

  const count = await bridge.hydrate()
  assert.equal(count, 2)

  const sessions = bridge.model.snapshot().sessions
  assert.equal(sessions.length, 2)
  const byId = Object.fromEntries(sessions.map((session) => [session.id, session]))
  assert.equal(byId.ses_1.phase, "running")
  assert.equal(byId.ses_1.cwd, "/a")
  assert.equal(byId.ses_1.title, "One")
  assert.equal(byId.ses_1.agent, "build")
  assert.equal(byId.ses_2.phase, "completed")
  assert.equal(byId.ses_2.cwd, "/b")
})

test("a missing session list leaves the bridge empty and does not fail", async () => {
  const bridge = buildBridge({
    config: { port: 0, keepaliveMs: 0, pairingStorePath: null },
    listSessions: async () => [],
  })
  assert.equal(await bridge.hydrate(), 0)
  assert.equal(bridge.model.snapshot().sessions.length, 0)
})
