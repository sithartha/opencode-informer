import test from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import { buildBridge } from "../src/bridge.js"

function newBridge(overrides = {}) {
  const calls = { permission: [], question: [], prompt: [], start: [], stop: [], close: [], switch: [] }
  const bridge = buildBridge({
    config: { port: 0, keepaliveMs: 30, host: "127.0.0.1" },
    applyPermission: async (args) => calls.permission.push(args),
    applyQuestion: async (args) => calls.question.push(args),
    applyPrompt: async (args) => calls.prompt.push(args),
    startSession: async (args) => {
      calls.start.push(args)
      return { id: "ses_new" }
    },
    stopSession: async (args) => calls.stop.push(args),
    closeSession: async (args) => calls.close.push(args),
    optionsProvider: async () => ({ agents: ["build", "plan"], models: [{ providerID: "deepseek", id: "deepseek-flash" }] }),
    switchSession: async (args) => calls.switch.push(args),
    ...overrides,
  })
  return { bridge, calls }
}

async function startBridge(t, overrides) {
  const { bridge, calls } = newBridge(overrides)
  await bridge.server.start()
  const port = bridge.server.address().port
  t.after(() => bridge.server.stop())
  return { bridge, calls, port }
}

async function pair(port, bridge) {
  const begin = await fetch(`http://127.0.0.1:${port}/pair`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceName: "Test" }),
  })
  assert.equal(begin.status, 202)
  const { approvalID } = await begin.json()
  bridge.pairing.approve(approvalID)
  const done = await fetch(`http://127.0.0.1:${port}/pair?approvalID=${approvalID}`)
  assert.equal(done.status, 200)
  const { token } = await done.json()
  return token
}

function openSSE(port, token) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: "127.0.0.1", port, path: "/events", headers: { authorization: `Bearer ${token}` } },
      (res) => {
        const state = { events: [], buffer: "", res }
        res.setEncoding("utf8")
        res.on("data", (chunk) => {
          state.buffer += chunk
          let index
          while ((index = state.buffer.indexOf("\n\n")) !== -1) {
            const block = state.buffer.slice(0, index)
            state.buffer = state.buffer.slice(index + 2)
            const lines = block.split("\n")
            const typeLine = lines.find((line) => line.startsWith("event: "))
            const dataLine = lines.find((line) => line.startsWith("data: "))
            if (typeLine && dataLine) {
              state.events.push({ type: typeLine.slice(7), data: JSON.parse(dataLine.slice(6)) })
            }
          }
        })
        resolve(state)
      },
    )
  })
}

async function waitFor(predicate, timeoutMs = 1000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  return predicate()
}

test("unauthenticated requests get 401", async (t) => {
  const { port } = await startBridge(t)
  for (const path of ["/state", "/status", "/events"]) {
    const res = await fetch(`http://127.0.0.1:${port}${path}`)
    assert.equal(res.status, 401, `${path} should require auth`)
  }
  const res = await fetch(`http://127.0.0.1:${port}/resolution`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requestID: "x", action: "allow" }),
  })
  assert.equal(res.status, 401)
})

test("pairing issues a token only after approval", async (t) => {
  const { bridge, port } = await startBridge(t)
  const begin = await fetch(`http://127.0.0.1:${port}/pair`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceName: "Test" }),
  })
  const { approvalID } = await begin.json()

  const pending = await fetch(`http://127.0.0.1:${port}/pair?approvalID=${approvalID}`)
  assert.equal((await pending.json()).status, "pending")

  bridge.pairing.approve(approvalID)
  const approved = await fetch(`http://127.0.0.1:${port}/pair?approvalID=${approvalID}`)
  const body = await approved.json()
  assert.equal(body.status, "approved")
  assert.ok(typeof body.token === "string" && body.token.length > 0)
})

test("the helper approves or denies pairing over loopback", async (t) => {
  const { bridge, port } = await startBridge(t)

  const beginApprove = await fetch(`http://127.0.0.1:${port}/pair`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceName: "Approve me" }),
  })
  const approvedID = (await beginApprove.json()).approvalID
  const approve = await fetch(`http://127.0.0.1:${port}/pair/decision`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ approvalID: approvedID, decision: "approve" }),
  })
  assert.equal(approve.status, 200)
  const approved = await fetch(`http://127.0.0.1:${port}/pair?approvalID=${approvedID}`)
  assert.equal((await approved.json()).status, "approved")

  const beginDeny = await fetch(`http://127.0.0.1:${port}/pair`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceName: "Deny me" }),
  })
  const deniedID = (await beginDeny.json()).approvalID
  await fetch(`http://127.0.0.1:${port}/pair/decision`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ approvalID: deniedID, decision: "deny" }),
  })
  const denied = await fetch(`http://127.0.0.1:${port}/pair?approvalID=${deniedID}`)
  assert.equal(denied.status, 403)
})

test("state snapshot is served with a valid token", async (t) => {
  const { bridge, port } = await startBridge(t)
  const token = await pair(port, bridge)
  bridge.handleEvent({ type: "session.created", data: { sessionID: "ses_1" }, location: { directory: "/tmp" } })

  const res = await fetch(`http://127.0.0.1:${port}/state`, { headers: { authorization: `Bearer ${token}` } })
  assert.equal(res.status, 200)
  const snapshot = await res.json()
  assert.equal(snapshot.activeSessionCount, 1)
  assert.equal(snapshot.sessions[0].id, "ses_1")
})

test("SSE delivers events in order across an idle gap", async (t) => {
  const { bridge, port } = await startBridge(t)
  const token = await pair(port, bridge)
  const stream = await openSSE(port, token)

  bridge.handleEvent({ type: "session.created", data: { sessionID: "ses_1" }, location: { directory: "/tmp" } })
  await waitFor(() => stream.events.length === 1)

  // Idle longer than the keepalive interval; the stream must stay usable.
  await new Promise((resolve) => setTimeout(resolve, 90))
  bridge.handleEvent({ type: "session.tool.called", data: { sessionID: "ses_1", id: "t1", name: "Bash", input: "npm test" } })

  assert.ok(await waitFor(() => stream.events.length === 2))
  assert.deepEqual(
    stream.events.map((e) => e.type),
    ["session.started", "tool.started"],
  )
  stream.res.destroy()
})

test("resolution is applied from the stream end to end", async (t) => {
  const { bridge, calls, port } = await startBridge(t)
  const token = await pair(port, bridge)
  bridge.handleEvent({ type: "session.created", data: { sessionID: "ses_1" } })
  bridge.handleEvent({ type: "permission.asked", data: { sessionID: "ses_1", id: "req_1", action: "bash", resources: ["ls"] } })

  const res = await fetch(`http://127.0.0.1:${port}/resolution`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ requestID: "req_1", action: "allow" }),
  })
  assert.equal(res.status, 200)
  assert.equal(calls.permission[0].decision, "allow")

  const unknown = await fetch(`http://127.0.0.1:${port}/resolution`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ requestID: "nope", action: "allow" }),
  })
  assert.equal(unknown.status, 409)
  assert.equal((await unknown.json()).status, "not_applicable")
})

test("a resolution made on the Mac is reflected to stream clients", async (t) => {
  const { bridge, port } = await startBridge(t)
  const token = await pair(port, bridge)
  const stream = await openSSE(port, token)

  bridge.handleEvent({ type: "session.created", data: { sessionID: "ses_1" } })
  bridge.handleEvent({ type: "permission.asked", data: { sessionID: "ses_1", id: "req_1", action: "bash", resources: ["ls"] } })
  await waitFor(() => stream.events.length === 2)

  // Resolved in the OpenCode TUI / Open Island: the bridge must clear it.
  bridge.handleEvent({ type: "permission.replied", data: { sessionID: "ses_1", id: "req_1" } })
  assert.ok(await waitFor(() => stream.events.some((e) => e.type === "actionable.resolved")))
  assert.equal(bridge.model.isResolved("req_1"), true)

  // A late phone resolution is now a no-op.
  const late = await fetch(`http://127.0.0.1:${port}/resolution`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ requestID: "req_1", action: "allow" }),
  })
  assert.equal(late.status, 409)
  stream.res.destroy()
})

test("POST /prompt forwards to the prompt applier", async (t) => {
  const { bridge, calls, port } = await startBridge(t)
  const token = await pair(port, bridge)
  const res = await fetch(`http://127.0.0.1:${port}/prompt`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ sessionID: "ses_1", text: "keep going" }),
  })
  assert.equal(res.status, 200)
  assert.deepEqual(calls.prompt[0], { sessionID: "ses_1", text: "keep going" })
})

test("POST /prompt requires a non-empty text", async (t) => {
  const { bridge, port } = await startBridge(t)
  const token = await pair(port, bridge)
  const res = await fetch(`http://127.0.0.1:${port}/prompt`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ sessionID: "ses_1", text: "   " }),
  })
  assert.equal(res.status, 400)
})

test("POST /sessions starts a session", async (t) => {
  const { bridge, calls, port } = await startBridge(t)
  const token = await pair(port, bridge)
  const res = await fetch(`http://127.0.0.1:${port}/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.status, "accepted")
  assert.equal(body.sessionID, "ses_new")
  assert.equal(calls.start.length, 1)
})

test("POST /sessions forwards the chosen agent and model", async (t) => {
  const { bridge, calls, port } = await startBridge(t)
  const token = await pair(port, bridge)
  const res = await fetch(`http://127.0.0.1:${port}/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ agent: "plan", model: { providerID: "deepseek", id: "deepseek-flash" } }),
  })
  assert.equal(res.status, 200)
  const last = calls.start.at(-1)
  assert.equal(last.agent, "plan")
  assert.deepEqual(last.model, { providerID: "deepseek", id: "deepseek-flash" })
})

test("POST /stop and /close forward the sessionID", async (t) => {
  const { bridge, calls, port } = await startBridge(t)
  const token = await pair(port, bridge)
  const headers = { "content-type": "application/json", authorization: `Bearer ${token}` }
  const stop = await fetch(`http://127.0.0.1:${port}/stop`, { method: "POST", headers, body: JSON.stringify({ sessionID: "ses_1" }) })
  assert.equal(stop.status, 200)
  assert.deepEqual(calls.stop[0], { sessionID: "ses_1" })
  const close = await fetch(`http://127.0.0.1:${port}/close`, { method: "POST", headers, body: JSON.stringify({ sessionID: "ses_1" }) })
  assert.equal(close.status, 200)
  assert.deepEqual(calls.close[0], { sessionID: "ses_1" })
})

test("lifecycle endpoints require a token and a sessionID", async (t) => {
  const { bridge, port } = await startBridge(t)
  const unauth = await fetch(`http://127.0.0.1:${port}/stop`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionID: "ses_1" }),
  })
  assert.equal(unauth.status, 401)

  const token = await pair(port, bridge)
  const missing = await fetch(`http://127.0.0.1:${port}/close`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  })
  assert.equal(missing.status, 400)
})

test("a failing lifecycle applier reports not_applied without throwing", async (t) => {
  const { bridge, port } = await startBridge(t, {
    stopSession: async () => {
      throw new Error("boom")
    },
  })
  const token = await pair(port, bridge)
  const res = await fetch(`http://127.0.0.1:${port}/stop`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ sessionID: "ses_1" }),
  })
  assert.equal(res.status, 409)
  const body = await res.json()
  assert.equal(body.status, "not_applied")
})

test("GET /options returns the discovered agents and models", async (t) => {
  const { bridge, port } = await startBridge(t)
  const token = await pair(port, bridge)
  const res = await fetch(`http://127.0.0.1:${port}/options`, { headers: { authorization: `Bearer ${token}` } })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.deepEqual(body.agents, ["build", "plan"])
  assert.deepEqual(body.models, [{ providerID: "deepseek", id: "deepseek-flash" }])
})

test("GET /options requires a token", async (t) => {
  const { port } = await startBridge(t)
  const res = await fetch(`http://127.0.0.1:${port}/options`)
  assert.equal(res.status, 401)
})

test("POST /switch forwards the agent and model", async (t) => {
  const { bridge, calls, port } = await startBridge(t)
  const token = await pair(port, bridge)
  const model = { providerID: "anthropic", id: "claude", variant: "high" }
  const res = await fetch(`http://127.0.0.1:${port}/switch`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ sessionID: "ses_1", agent: "plan", model }),
  })
  assert.equal(res.status, 200)
  assert.deepEqual(calls.switch[0], { sessionID: "ses_1", agent: "plan", model })
})

test("POST /switch requires a target", async (t) => {
  const { bridge, port } = await startBridge(t)
  const token = await pair(port, bridge)
  const res = await fetch(`http://127.0.0.1:${port}/switch`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ sessionID: "ses_1" }),
  })
  assert.equal(res.status, 400)
})
