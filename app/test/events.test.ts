import test from "node:test"
import assert from "node:assert/strict"
import { applyEvent, emptyState, orderSessions, parseQuestions, parseSSE, stateFromSnapshot, type Session } from "../src/events"

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
  state = applyEvent(state, { type: "question.asked", data: { sessionID: "s1", requestID: "q1", title: "Which db?", options: [{ label: "Postgres", value: "pg", description: "Managed" }, { label: "SQLite" }] } })
  assert.equal(state.sessions.s1.phase, "waiting-answer")
  assert.deepEqual(state.pending.q1.options, [{ label: "Postgres", value: "pg", description: "Managed" }, { label: "SQLite" }])
})

test("session.updated applies the working directory", () => {
  let state = emptyState()
  state = applyEvent(state, { type: "session.started", data: { sessionID: "s1" } })
  state = applyEvent(state, { type: "session.updated", data: { sessionID: "s1", cwd: "/Users/dev/project" } })
  assert.equal(state.sessions.s1.cwd, "/Users/dev/project")
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

test("activity history keeps the last three messages", () => {
  let state = emptyState()
  state = applyEvent(state, { type: "session.started", data: { sessionID: "s1" } })
  for (const text of ["First", "Second", "Third", "Fourth"]) {
    state = applyEvent(state, { type: "session.activity", data: { sessionID: "s1", text } })
  }
  assert.deepEqual(state.sessions.s1.activityHistory, ["Second", "Third", "Fourth"])
  assert.equal(state.sessions.s1.lastActivity, "Fourth")

  // Combined text (bridge append) is split rather than duplicated.
  state = applyEvent(state, { type: "session.activity", data: { sessionID: "s1", text: "Third\n\nFourth" } })
  assert.deepEqual(state.sessions.s1.activityHistory, ["Third", "Fourth"])
})

test("session.cost updates the session's cost", () => {
  let state = emptyState()
  state = applyEvent(state, { type: "session.started", data: { sessionID: "s1" } })
  state = applyEvent(state, { type: "session.cost", data: { sessionID: "s1", cost: 0.25 } })
  assert.equal(state.sessions.s1.cost, 0.25)
})

test("parseQuestions synthesizes one question from the flat fields", () => {
  const questions = parseQuestions({ title: "Which db?", options: ["Postgres", { label: "SQLite", description: "Embedded" }], allowFreeform: true })
  assert.equal(questions.length, 1)
  assert.equal(questions[0].key, "q0")
  assert.equal(questions[0].title, "Which db?")
  assert.deepEqual(questions[0].options, [{ label: "Postgres" }, { label: "SQLite", description: "Embedded" }])
  assert.equal(questions[0].allowFreeform, true)
})

test("a multi-question form exposes every question on the pending request", () => {
  let state = emptyState()
  state = applyEvent(state, { type: "session.started", data: { sessionID: "s1" } })
  state = applyEvent(state, {
    type: "question.asked",
    data: {
      sessionID: "s1",
      requestID: "q2",
      title: "Deploy target?",
      options: [{ label: "Staging", value: "staging" }, { label: "Production", value: "prod" }],
      questions: [
        { key: "q0", title: "Deploy target?", options: [{ label: "Staging", value: "staging" }, { label: "Production", value: "prod" }], allowFreeform: false },
        { key: "q1", title: "Run migrations?", options: [{ label: "Yes" }, { label: "No" }], allowFreeform: false },
      ],
    },
  })
  assert.equal(state.pending.q2.questions?.length, 2)
  assert.equal(state.pending.q2.questions?.[1].title, "Run migrations?")
  // Flat fields mirror the first question for single-question UI paths.
  assert.equal(state.pending.q2.title, "Deploy target?")
  assert.deepEqual(state.pending.q2.options, [{ label: "Staging", value: "staging" }, { label: "Production", value: "prod" }])
})

test("stateFromSnapshot normalizes question options from plain strings", () => {
  const state = stateFromSnapshot({
    activeSessionCount: 1,
    sessions: [{ id: "s1", agent: "opencode", cwd: "/tmp", phase: "waiting-answer", currentTool: null, lastActivity: "", updatedAt: 0 }],
    pending: [
      {
        requestID: "q1",
        sessionID: "s1",
        kind: "question",
        title: "Pick",
        options: ["A", "B"],
        questions: [{ key: "q0", title: "Pick", options: ["A", "B"], allowFreeform: false }],
      },
    ],
  })
  assert.deepEqual(state.pending.q1.options, [{ label: "A" }, { label: "B" }])
  assert.deepEqual(state.pending.q1.questions?.[0].options, [{ label: "A" }, { label: "B" }])
})

test("stateFromSnapshot splits activity into history", () => {
  const state = stateFromSnapshot({
    activeSessionCount: 1,
    sessions: [{ id: "s1", agent: "opencode", cwd: "/tmp", phase: "running", currentTool: null, lastActivity: "One\n\nTwo\n\nThree\n\nFour", updatedAt: 0 }],
  })
  assert.deepEqual(state.sessions.s1.activityHistory, ["Two", "Three", "Four"])
})

test("stateFromSnapshot carries a multi-question form", () => {
  const state = stateFromSnapshot({
    activeSessionCount: 1,
    sessions: [{ id: "s1", agent: "opencode", cwd: "/tmp", phase: "waiting-answer", currentTool: null, lastActivity: "", updatedAt: 0 }],
    pending: [
      {
        requestID: "r2",
        sessionID: "s1",
        kind: "question",
        title: "Deploy target?",
        options: [{ label: "Staging", value: "staging" }],
        questions: [
          { key: "q0", title: "Deploy target?", options: [{ label: "Staging", value: "staging" }], allowFreeform: false },
          { key: "q1", title: "Run migrations?", options: [{ label: "Yes" }, { label: "No" }], allowFreeform: false },
        ],
      },
    ],
  })
  assert.equal(state.pending.r2.questions?.length, 2)
})

function session(id: string, phase: Session["phase"]): Session {
  return { id, agent: "opencode", cwd: "/tmp", phase, currentTool: null, lastActivity: "", updatedAt: 0 }
}

test("orderSessions puts attention first, then working, then inactive", () => {
  const sessions = [session("idle", "completed"), session("work", "running"), session("ask", "waiting-answer")]
  const rank = new Map([["ask", 0]])
  assert.deepEqual(
    orderSessions(sessions, rank).map((s) => s.id),
    ["ask", "work", "idle"],
  )
})

test("orderSessions orders attention sessions by request recency", () => {
  const sessions = [session("older", "waiting-permission"), session("newer", "waiting-permission")]
  const rank = new Map([
    ["older", 0],
    ["newer", 1],
  ])
  assert.deepEqual(
    orderSessions(sessions, rank).map((s) => s.id),
    ["newer", "older"],
  )
})

test("orderSessions keeps the given order within a tier", () => {
  const sessions = [session("a", "running"), session("b", "running"), session("c", "running")]
  assert.deepEqual(
    orderSessions(sessions, new Map()).map((s) => s.id),
    ["a", "b", "c"],
  )
})
