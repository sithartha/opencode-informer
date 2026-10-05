import test from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import { buildBridge } from "../src/bridge.js"
import { createDoorbell } from "../src/doorbell.js"

test("the doorbell reports failure when no helper is listening", async () => {
  const ring = createDoorbell("http://127.0.0.1:1/ring")
  assert.equal(await ring({ kind: "permission" }), false)
})

test("the doorbell tolerates an absent or invalid helper URL", async () => {
  assert.equal(await createDoorbell(null)({ kind: "permission" }), false)
  assert.equal(await createDoorbell("not a url")({ kind: "permission" }), false)
})

test("events are handled and broadcast with no client connected", async (t) => {
  const bridge = buildBridge({ config: { port: 0, keepaliveMs: 0 } })
  await bridge.server.start()
  t.after(() => bridge.server.stop())

  const emitted = bridge.handleEvent({
    type: "permission.asked",
    data: { sessionID: "ses_1", id: "req_1", action: "bash", resources: ["ls"] },
  })
  assert.equal(emitted[0].type, "permission.requested")
  assert.equal(bridge.server.clientCount(), 0, "broadcasting to nobody is fine")
})

test("a hanging apply times out instead of blocking", async (t) => {
  const bridge = buildBridge({
    config: { port: 0, keepaliveMs: 0 },
    applyTimeoutMs: 30,
    applyPermission: () => new Promise(() => {}),
  })
  await bridge.server.start()
  t.after(() => bridge.server.stop())

  bridge.handleEvent({ type: "permission.asked", data: { sessionID: "ses_1", id: "req_1", action: "bash", resources: ["ls"] } })
  const result = await bridge.resolution.resolve("req_1", "allow")
  assert.equal(result.applied, false)
  assert.equal(result.reason, "apply_failed")
})

test("a stream client disconnecting leaves the server healthy", async (t) => {
  const bridge = buildBridge({ config: { port: 0, keepaliveMs: 0 } })
  await bridge.server.start()
  t.after(() => bridge.server.stop())
  const port = bridge.server.address().port

  const token = bridge.pairing.issueToken("Test")
  const res = await new Promise((resolve, reject) => {
    const req = http.get(
      { host: "127.0.0.1", port, path: "/events", headers: { authorization: `Bearer ${token}` } },
      (response) => resolve(response),
    )
    req.on("error", reject)
  })
  assert.equal(bridge.server.clientCount(), 1)
  res.destroy()
  await new Promise((resolve) => setTimeout(resolve, 30))
  assert.equal(bridge.server.clientCount(), 0)

  bridge.handleEvent({ type: "session.created", data: { sessionID: "ses_1" } })
  assert.equal(bridge.model.snapshot().activeSessionCount, 1)
})
