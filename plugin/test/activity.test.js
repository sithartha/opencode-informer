import test from "node:test"
import assert from "node:assert/strict"
import { ActivityModel } from "../src/activity.js"
import { loadContract } from "../src/contract.js"

function apply(model, events) {
  const out = []
  for (const event of events) out.push(...model.apply(event))
  return out
}

function created(sessionID, extra = {}) {
  return { type: "session.created", data: { sessionID, ...extra }, location: { directory: "/tmp/project" } }
}

test("session start puts a session in the running phase", () => {
  const model = new ActivityModel()
  const events = apply(model, [created("ses_1")])
  assert.deepEqual(events, [{ type: "session.started", data: { sessionID: "ses_1", agent: "opencode", cwd: "/tmp/project" } }])
  const snapshot = model.snapshot()
  assert.equal(snapshot.activeSessionCount, 1)
  assert.equal(snapshot.sessions[0].phase, "running")
})

test("tool calls set and clear the current tool and emit stream events", () => {
  const model = new ActivityModel()
  apply(model, [created("ses_1")])
  const started = model.apply({ type: "session.tool.called", data: { sessionID: "ses_1", id: "t1", name: "Bash", input: { command: "npm test" } } })
  assert.equal(started[0].type, "tool.started")
  assert.equal(started[0].data.tool, "Bash")
  assert.equal(model.snapshot().sessions[0].currentTool, "Bash")

  const ended = model.apply({ type: "session.tool.success", data: { sessionID: "ses_1", id: "t1" } })
  assert.equal(ended[0].type, "tool.ended")
  assert.equal(model.snapshot().sessions[0].currentTool, null)
})

test("permission transitions to waiting-permission and back", () => {
  const model = new ActivityModel()
  apply(model, [created("ses_1")])
  const asked = model.apply({
    type: "permission.asked",
    data: { sessionID: "ses_1", id: "req_1", action: "bash", resources: ["rm -rf build/"] },
  })
  assert.equal(asked[0].type, "permission.requested")
  assert.equal(asked[0].data.requestID, "req_1")
  assert.equal(model.snapshot().sessions[0].phase, "waiting-permission")
  assert.equal(model.activeSessionCount(), 1)

  const replied = model.apply({ type: "permission.replied", data: { sessionID: "ses_1", id: "req_1" } })
  assert.equal(replied[0].type, "actionable.resolved")
  assert.equal(model.snapshot().sessions[0].phase, "running")
  assert.equal(model.isResolved("req_1"), true)
})

test("question transitions to waiting-answer and exposes the options", () => {
  const model = new ActivityModel()
  apply(model, [created("ses_1")])
  const asked = model.apply({
    type: "form.created",
    data: { sessionID: "ses_1", form: { id: "req_2", sessionID: "ses_1", title: "Which database?", fields: [{ key: "db", options: [{ label: "PostgreSQL" }, { label: "SQLite" }] }] } },
  })
  assert.equal(asked[0].type, "question.asked")
  assert.deepEqual(asked[0].data.options, ["PostgreSQL", "SQLite"])
  assert.equal(model.snapshot().sessions[0].phase, "waiting-answer")

  const replied = model.apply({ type: "form.replied", data: { sessionID: "ses_1", form: { id: "req_2" } } })
  assert.equal(replied[0].type, "actionable.resolved")
  assert.equal(model.snapshot().sessions[0].phase, "running")
})

test("turn completion and session end move the session out of the active count", () => {
  const model = new ActivityModel()
  apply(model, [created("ses_1")])
  const done = model.apply({ type: "session.execution.succeeded", data: { sessionID: "ses_1" }, location: { directory: "/tmp/project" } })
  assert.equal(done[0].type, "turn.completed")
  assert.equal(model.snapshot().sessions[0].phase, "completed")
  assert.equal(model.activeSessionCount(), 0)

  const ended = model.apply({ type: "session.deleted", data: { sessionID: "ses_1" } })
  assert.equal(ended[0].type, "session.ended")
  assert.equal(model.snapshot().sessions.length, 0)
})

test("child sessions fold into their root and never count separately", () => {
  const model = new ActivityModel()
  apply(model, [created("ses_root")])
  apply(model, [created("ses_child", { parentID: "ses_root" })])
  assert.equal(model.snapshot().activeSessionCount, 1)
  assert.equal(model.snapshot().sessions.length, 1)

  const childTool = model.apply({ type: "session.tool.called", data: { sessionID: "ses_child", id: "t1", name: "Read" } })
  assert.equal(childTool[0].data.sessionID, "ses_root")

  const ended = model.apply({ type: "session.deleted", data: { sessionID: "ses_child" } })
  assert.equal(ended.length, 0)
  assert.equal(model.snapshot().sessions.length, 1)
})

test("empty snapshot reports zero active sessions", () => {
  const model = new ActivityModel()
  assert.deepEqual(model.snapshot(), { activeSessionCount: 0, sessions: [], pending: [] })
})

test("snapshot includes pending permissions and questions", () => {
  const model = new ActivityModel()
  apply(model, [created("ses_1"), created("ses_2")])
  model.apply({ type: "permission.asked", data: { sessionID: "ses_1", id: "req_1", action: "bash", resources: ["rm -rf build/"] } })
  model.apply({
    type: "form.created",
    data: { sessionID: "ses_2", form: { id: "req_2", sessionID: "ses_2", title: "Which db?", fields: [{ key: "db", options: [{ label: "Postgres" }] }] } },
  })

  const snapshot = model.snapshot()
  assert.equal(snapshot.pending.length, 2)
  const permission = snapshot.pending.find((p) => p.requestID === "req_1")
  assert.equal(permission.kind, "permission")
  assert.equal(permission.sessionID, "ses_1")
  assert.ok(permission.title)
  const question = snapshot.pending.find((p) => p.requestID === "req_2")
  assert.deepEqual(question.options, ["Postgres"])
})

test("a new request supersedes a session's previous pending", () => {
  const model = new ActivityModel()
  apply(model, [created("ses_1")])
  model.apply({ type: "permission.asked", data: { sessionID: "ses_1", id: "req_1", action: "bash", resources: ["ls"] } })
  const events = model.apply({ type: "permission.asked", data: { sessionID: "ses_1", id: "req_2", action: "bash", resources: ["pwd"] } })

  const pending = model.snapshot().pending
  assert.equal(pending.length, 1)
  assert.equal(pending[0].requestID, "req_2")
  // The superseded request is reported resolved so clients clear it.
  assert.ok(events.some((e) => e.type === "actionable.resolved" && e.data.requestID === "req_1"))
})

test("subagent and shell counts are tracked per session", () => {
  const model = new ActivityModel()
  apply(model, [created("ses_1")])

  // Two child sessions fold into the root.
  apply(model, [created("ses_child1", { parentID: "ses_1" }), created("ses_child2", { parentID: "ses_1" })])
  let session = model.snapshot().sessions[0]
  assert.equal(session.subagents, 2)

  model.apply({ type: "session.deleted", data: { sessionID: "ses_child1" } })
  session = model.snapshot().sessions[0]
  assert.equal(session.subagents, 1)

  // Shells count active tool executions.
  model.apply({ type: "session.tool.called", data: { sessionID: "ses_1", id: "t1", name: "Bash" } })
  model.apply({ type: "session.tool.called", data: { sessionID: "ses_1", id: "t2", name: "Bash" } })
  assert.equal(model.snapshot().sessions[0].shells, 2)

  model.apply({ type: "session.tool.success", data: { sessionID: "ses_1", id: "t1" } })
  assert.equal(model.snapshot().sessions[0].shells, 1)
})

test("resolved requests leave the snapshot pending list", () => {
  const model = new ActivityModel()
  apply(model, [created("ses_1")])
  model.apply({ type: "permission.asked", data: { sessionID: "ses_1", id: "req_1", action: "bash", resources: ["ls"] } })
  model.apply({ type: "permission.replied", data: { sessionID: "ses_1", id: "req_1" } })
  assert.deepEqual(model.snapshot().pending, [])
})

test("session text emits a session.activity event", () => {
  const model = new ActivityModel()
  apply(model, [created("ses_1")])
  const events = model.apply({ type: "session.text.ended", data: { sessionID: "ses_1", text: "Running the tests" } })
  assert.equal(events[0].type, "session.activity")
  assert.equal(events[0].data.text, "Running the tests")
  assert.equal(model.snapshot().sessions[0].lastActivity, "Running the tests")
})

test("failed and interrupted turns do not emit a completion", () => {
  const failed = new ActivityModel()
  apply(failed, [created("ses_1")])
  assert.equal(failed.apply({ type: "session.execution.failed", data: { sessionID: "ses_1" } }).length, 0)
  assert.equal(failed.snapshot().sessions[0].phase, "completed")

  const interrupted = new ActivityModel()
  apply(interrupted, [created("ses_2")])
  assert.equal(interrupted.apply({ type: "session.execution.interrupted", data: { sessionID: "ses_2" } }).length, 0)
})

test("emitted stream events match the contract fixtures' required fields", () => {
  const contract = loadContract()
  const model = new ActivityModel()
  const emitted = apply(model, [
    created("ses_1"),
    { type: "session.inbox.enqueued", data: { sessionID: "ses_1", item: { type: "user", payload: { text: "hi" } } } },
    { type: "session.tool.called", data: { sessionID: "ses_1", id: "t1", name: "Bash", input: "npm test" } },
    { type: "session.tool.success", data: { sessionID: "ses_1", id: "t1" } },
    { type: "permission.asked", data: { sessionID: "ses_1", id: "req_1", action: "bash", resources: ["rm -rf build/"] } },
    { type: "permission.replied", data: { sessionID: "ses_1", id: "req_1" } },
    { type: "form.created", data: { sessionID: "ses_1", form: { id: "req_2", title: "Q?", fields: [{ key: "a", options: [{ label: "A" }] }] } } },
    { type: "form.replied", data: { sessionID: "ses_1", form: { id: "req_2" } } },
    { type: "session.execution.succeeded", data: { sessionID: "ses_1" } },
    { type: "session.deleted", data: { sessionID: "ses_1" } },
  ])

  for (const event of emitted) {
    const schema = contract.schemas[event.type]
    assert.ok(schema, `no contract schema for emitted event "${event.type}"`)
    for (const key of schema.required) {
      assert.ok(key in event.data, `"${event.type}" missing required field "${key}"`)
    }
  }
  assert.ok(emitted.some((e) => e.type === "prompt.submitted"))
  assert.ok(emitted.some((e) => e.type === "turn.completed"))
})

test("a session that predates the plugin is adopted on its first event", () => {
  const model = new ActivityModel()
  const out = apply(model, [{ type: "session.tool.called", data: { sessionID: "ses_old", id: "t1", name: "Bash", input: "ls" } }])
  const sessions = model.snapshot().sessions
  assert.equal(sessions.length, 1)
  assert.equal(sessions[0].phase, "running")
  assert.equal(out[0].type, "tool.started")
})

test("session.idle completes the turn", () => {
  const model = new ActivityModel()
  apply(model, [created("ses_1")])
  const out = apply(model, [{ type: "session.idle", data: { sessionID: "ses_1" } }])
  assert.ok(out.some((e) => e.type === "turn.completed"))
  assert.equal(model.snapshot().sessions[0].phase, "completed")
})

test("session.status idle completes the turn", () => {
  const model = new ActivityModel()
  apply(model, [created("ses_1")])
  const out = apply(model, [{ type: "session.status", data: { sessionID: "ses_1", status: { type: "idle" } } }])
  assert.ok(out.some((e) => e.type === "turn.completed"))
})

test("idle does not close a session that is waiting for an answer", () => {
  const model = new ActivityModel()
  apply(model, [
    created("ses_1"),
    { type: "form.created", data: { sessionID: "ses_1", form: { id: "f1", sessionID: "ses_1", title: "Q", fields: [] } } },
  ])
  const out = apply(model, [{ type: "session.idle", data: { sessionID: "ses_1" } }])
  assert.equal(out.length, 0)
  assert.equal(model.snapshot().sessions[0].phase, "waiting-answer")
})

test("form.created prefers the field title over the generic form title", () => {
  const model = new ActivityModel()
  const out = apply(model, [
    created("ses_1"),
    {
      type: "form.created",
      data: {
        sessionID: "ses_1",
        form: {
          id: "f1",
          sessionID: "ses_1",
          title: "Questions",
          fields: [
            {
              key: "q0",
              title: "Real question",
              description: "More detail",
              type: "string",
              options: [{ value: "A", label: "A" }],
            },
          ],
        },
      },
    },
  ])
  const asked = out.find((e) => e.type === "question.asked")
  assert.equal(asked.data.title, "Real question")
  assert.deepEqual(asked.data.options, ["A"])
})

test("form.created flags a custom field as free-form", () => {
  const model = new ActivityModel()
  const out = apply(model, [
    created("ses_1"),
    {
      type: "form.created",
      data: {
        sessionID: "ses_1",
        form: {
          id: "f1",
          sessionID: "ses_1",
          title: "Q",
          fields: [{ key: "q0", title: "Custom", type: "string", custom: true, options: [] }],
        },
      },
    },
  ])
  const asked = out.find((e) => e.type === "question.asked")
  assert.equal(asked.data.allowFreeform, true)
  assert.deepEqual(asked.data.options, [])
})

test("session.step.started records the agent and model", () => {
  const model = new ActivityModel()
  const out = apply(model, [
    created("ses_1"),
    {
      type: "session.step.started",
      data: { sessionID: "ses_1", agent: "build", model: { providerID: "deepseek", id: "deepseek-flash", variant: "default" } },
    },
  ])
  const updated = out.find((e) => e.type === "session.updated")
  assert.deepEqual(updated.data, { sessionID: "ses_1", agent: "build", model: "deepseek/deepseek-flash" })
  const snap = model.snapshot().sessions[0]
  assert.equal(snap.agent, "build")
  assert.equal(snap.model, "deepseek/deepseek-flash")
})

test("switching agent and model emits session.updated with the new values", () => {
  const model = new ActivityModel()
  apply(model, [
    created("ses_1"),
    { type: "session.step.started", data: { sessionID: "ses_1", agent: "build", model: { providerID: "deepseek", id: "deepseek-flash" } } },
    { type: "session.step.started", data: { sessionID: "ses_1", agent: "plan", model: { providerID: "anthropic", id: "claude", variant: "high" } } },
  ])
  const snap = model.snapshot().sessions[0]
  assert.equal(snap.agent, "plan")
  assert.equal(snap.model, "anthropic/claude#high")
})

test("session.deleted removes the session from the snapshot", () => {
  const model = new ActivityModel()
  apply(model, [created("ses_1")])
  apply(model, [{ type: "session.deleted", data: { sessionID: "ses_1" } }])
  assert.equal(model.snapshot().sessions.length, 0)
  assert.equal(model.activeSessionCount(), 0)
})

test("session.title sets the title and emits session.updated", () => {
  const model = new ActivityModel()
  apply(model, [created("ses_1")])
  const out = apply(model, [{ type: "session.title", data: { sessionID: "ses_1", title: "Add a health endpoint" } }])
  assert.deepEqual(out, [{ type: "session.updated", data: { sessionID: "ses_1", title: "Add a health endpoint" } }])
  assert.equal(model.snapshot().sessions[0].title, "Add a health endpoint")
})

test("session.idle.silent marks the session completed without a completion event", () => {
  const model = new ActivityModel()
  apply(model, [created("ses_1")])
  const out = apply(model, [{ type: "session.idle.silent", data: { sessionID: "ses_1" } }])
  assert.deepEqual(out, [{ type: "session.updated", data: { sessionID: "ses_1", phase: "completed" } }])
  assert.equal(model.snapshot().sessions[0].phase, "completed")
})

test("session.meta applies an agent/model switch immediately", () => {
  const model = new ActivityModel()
  apply(model, [created("ses_1")])
  const out = apply(model, [{ type: "session.meta", data: { sessionID: "ses_1", agent: "plan", model: { providerID: "deepseek", id: "deepseek-flash" } } }])
  assert.deepEqual(out, [{ type: "session.updated", data: { sessionID: "ses_1", agent: "plan", model: "deepseek/deepseek-flash" } }])
  const snap = model.snapshot().sessions[0]
  assert.equal(snap.agent, "plan")
  assert.equal(snap.model, "deepseek/deepseek-flash")
})
