import test from "node:test"
import assert from "node:assert/strict"
import { applyEvent, emptyState, parseSSE, stateFromSnapshot } from "../src/events"

test("parseSSE reassembles frames split across chunks", () => {
  const first = parseSSE("", "event: session.started\ndata: {\"sessionID\":\"a\"}\n\nevent: tool.st")
  assert.equal(first.events.length, 1)
  assert.equal(first.events[0].type, "session.started")

  const second = parseSSE(first.rest, "arted\ndata: {\"sessionID\":\"a\",\"tool\":\"Bash\"}\n\n")
  assert.equal(second.events.length, 1)
  assert.equal(second.events[0].data.tool, "Bash")
})

test("parseSSE ignores comments and malformed frames", () => {
  const result = parseSSE("", ": keepalive\n\nevent: session.started\ndata: not-json\n\n")
  assert.equal(result.events.length, 0)
})

test("applyEvent tracks sessions, pending requests, and the active count", () => {
  let state = emptyState()
  state = applyEvent(state, { type: "session.started", data: { sessionID: "s1", agent: "opencode", cwd: "/tmp" } })
  assert.equal(state.activeCount, 1)
  assert.equal(state.sessions.s1.phase, "running")

  state = applyEvent(state, { type: "permission.requested", data: { sessionID: "s1", requestID: "r1", title: "Allow Bash", summary: "rm -rf" } })
  assert.equal(state.sessions.s1.phase, "waiting-permission")
  assert.equal(state.pending.r1.kind, "permission")

  state = applyEvent(state, { type: "actionable.resolved", data: { sessionID: "s1", requestID: "r1" } })
  assert.equal(state.pending.r1, undefined)
  assert.equal(state.sessions.s1.phase, "running")

  state = applyEvent(state, { type: "turn.completed", data: { sessionID: "s1", summary: "done" } })
  assert.equal(state.sessions.s1.phase, "completed")
  assert.equal(state.activeCount, 0)

  state = applyEvent(state, { type: "session.ended", data: { sessionID: "s1" } })
  assert.equal(Object.keys(state.sessions).length, 0)
})

test("question events expose options", () => {
  let state = emptyState()
  state = applyEvent(state, { type: "session.started", data: { sessionID: "s1" } })
  state = applyEvent(state, { type: "question.asked", data: { sessionID: "s1", requestID: "q1", title: "Which db?", options: ["Postgres", "SQLite"] } })
  assert.equal(state.sessions.s1.phase, "waiting-answer")
  assert.deepEqual(state.pending.q1.options, ["Postgres", "SQLite"])
})

test("stateFromSnapshot seeds sessions and the count", () => {
  const state = stateFromSnapshot({
    activeSessionCount: 1,
    sessions: [{ id: "s1", agent: "opencode", cwd: "/tmp", phase: "running", currentTool: null, lastActivity: "x", updatedAt: 1 }],
  })
  assert.equal(state.activeCount, 1)
  assert.equal(state.sessions.s1.id, "s1")
})

test("stateFromSnapshot reconstructs pending requests", () => {
  const state = stateFromSnapshot({
    activeSessionCount: 1,
    sessions: [{ id: "s1", agent: "opencode", cwd: "/tmp", phase: "waiting-permission", currentTool: null, lastActivity: "", updatedAt: 0 }],
    pending: [{ requestID: "r1", sessionID: "s1", kind: "permission", title: "Allow Bash", summary: "rm -rf" }],
  })
  assert.equal(state.pending.r1.title, "Allow Bash")
  assert.equal(state.pending.r1.sessionID, "s1")
})

test("session.activity updates the session's last activity", () => {
  let state = emptyState()
  state = applyEvent(state, { type: "session.started", data: { sessionID: "s1" } })
  state = applyEvent(state, { type: "session.activity", data: { sessionID: "s1", text: "Running the tests" } })
  assert.equal(state.sessions.s1.lastActivity, "Running the tests")
})
