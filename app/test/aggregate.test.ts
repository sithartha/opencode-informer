import test from "node:test"
import assert from "node:assert/strict"
import { aggregate } from "../src/aggregate"
import { applyEvent, emptyState, stateFromSnapshot, type Session } from "../src/events"

function session(id: string, phase: Session["phase"]): Session {
  return { id, agent: "opencode", cwd: "/tmp", phase, currentTool: null, lastActivity: "", updatedAt: 0 }
}

test("aggregate breaks down mixed phases", () => {
  const state = stateFromSnapshot({
    activeSessionCount: 4,
    sessions: [
      session("a", "running"),
      session("b", "running"),
      session("c", "waiting-permission"),
      session("d", "waiting-answer"),
    ],
    pending: [
      { requestID: "r1", sessionID: "c", kind: "permission", title: "Allow" },
      { requestID: "r2", sessionID: "d", kind: "question", title: "Which?" },
    ],
  })
  assert.deepEqual(aggregate(state), { total: 4, running: 2, waitingApproval: 1, waitingAnswer: 1, stopped: 0 })
})

test("a waiting phase with no pending request counts as working", () => {
  // Reproduces a stale bridge phase: the answer is gone, so nothing is pending.
  const state = stateFromSnapshot({
    activeSessionCount: 1,
    sessions: [session("a", "waiting-answer")],
  })
  assert.equal(state.sessions.a.phase, "running")
  assert.deepEqual(aggregate(state), { total: 1, running: 1, waitingApproval: 0, waitingAnswer: 0, stopped: 0 })
})

test("resolving a request drops it from the breakdown", () => {
  let state = stateFromSnapshot({
    activeSessionCount: 1,
    sessions: [session("a", "waiting-answer")],
    pending: [{ requestID: "q1", sessionID: "a", kind: "question", title: "Which?" }],
  })
  assert.equal(aggregate(state).waitingAnswer, 1)
  state = applyEvent(state, { type: "actionable.resolved", data: { sessionID: "a", requestID: "q1" } })
  assert.deepEqual(aggregate(state), { total: 1, running: 1, waitingApproval: 0, waitingAnswer: 0, stopped: 0 })
})

test("pending requests without a session still count", () => {
  const state = stateFromSnapshot({
    activeSessionCount: 0,
    sessions: [],
    pending: [{ requestID: "o1", sessionID: "ghost", kind: "question", title: "?" }],
  })
  assert.deepEqual(aggregate(state), { total: 1, running: 0, waitingApproval: 0, waitingAnswer: 1, stopped: 0 })
})

test("aggregate is zero with no active sessions", () => {
  assert.deepEqual(aggregate(emptyState()), { total: 0, running: 0, waitingApproval: 0, waitingAnswer: 0, stopped: 0 })
})

test("aggregate counts completed and ended sessions as stopped", () => {
  const state = stateFromSnapshot({
    activeSessionCount: 0,
    sessions: [session("a", "completed"), session("b", "ended")],
  })
  const agg = aggregate(state)
  assert.equal(agg.total, 0)
  assert.equal(agg.stopped, 2)
})

test("aggregate tracks phase transitions from events", () => {
  let state = emptyState()
  state = applyEvent(state, { type: "session.started", data: { sessionID: "a" } })
  assert.equal(aggregate(state).running, 1)

  state = applyEvent(state, { type: "permission.requested", data: { sessionID: "a", requestID: "r1", title: "Allow" } })
  assert.deepEqual(aggregate(state), { total: 1, running: 0, waitingApproval: 1, waitingAnswer: 0, stopped: 0 })

  state = applyEvent(state, { type: "actionable.resolved", data: { sessionID: "a", requestID: "r1" } })
  assert.deepEqual(aggregate(state), { total: 1, running: 1, waitingApproval: 0, waitingAnswer: 0, stopped: 0 })

  state = applyEvent(state, { type: "turn.completed", data: { sessionID: "a" } })
  assert.deepEqual(aggregate(state), { total: 0, running: 0, waitingApproval: 0, waitingAnswer: 0, stopped: 1 })
})
