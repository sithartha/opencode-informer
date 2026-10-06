import test from "node:test"
import assert from "node:assert/strict"
import { ActivityModel } from "../src/activity.js"
import { ResolutionCoordinator } from "../src/resolution.js"

function setup() {
  const model = new ActivityModel()
  model.apply({ type: "session.created", data: { sessionID: "ses_1" }, location: { directory: "/tmp" } })
  const calls = { permission: [], question: [], resolved: [] }
  const coordinator = new ResolutionCoordinator({
    model,
    applyPermission: async (args) => calls.permission.push(args),
    applyQuestion: async (args) => calls.question.push(args),
    onResolved: (sessionID, requestID) => calls.resolved.push({ sessionID, requestID }),
  })
  return { model, coordinator, calls }
}

function askPermission(model) {
  model.apply({ type: "permission.asked", data: { sessionID: "ses_1", id: "req_1", action: "bash", resources: ["rm -rf build/"] } })
}

function askQuestion(model) {
  model.apply({
    type: "form.created",
    data: { sessionID: "ses_1", form: { id: "req_2", sessionID: "ses_1", title: "Which db?", fields: [{ key: "db", options: [{ label: "PostgreSQL" }] }] } },
  })
}

function askMultiQuestion(model) {
  model.apply({
    type: "form.created",
    data: {
      sessionID: "ses_1",
      form: {
        id: "req_3",
        sessionID: "ses_1",
        title: "Questions",
        fields: [
          { key: "q0", title: "Deploy target?", options: [{ label: "Staging" }, { label: "Production" }] },
          { key: "q1", title: "Run migrations?", options: [{ label: "Yes" }, { label: "No" }] },
        ],
      },
    },
  })
}

test("allow applies the permission and marks it resolved", async () => {
  const { model, coordinator, calls } = setup()
  askPermission(model)
  const result = await coordinator.resolve("req_1", "allow")
  assert.equal(result.applied, true)
  assert.deepEqual(calls.permission[0], { sessionID: "ses_1", requestID: "req_1", decision: "allow" })
  assert.equal(model.isResolved("req_1"), true)
  assert.equal(calls.resolved.length, 1)
})

test("deny applies the permission", async () => {
  const { model, coordinator, calls } = setup()
  askPermission(model)
  const result = await coordinator.resolve("req_1", "deny")
  assert.equal(result.applied, true)
  assert.equal(calls.permission[0].decision, "deny")
})

test("a question answer carries the text and the fields", async () => {
  const { model, coordinator, calls } = setup()
  askQuestion(model)
  const result = await coordinator.resolve("req_2", "PostgreSQL")
  assert.equal(result.applied, true)
  assert.equal(calls.question[0].text, "PostgreSQL")
  assert.ok(Array.isArray(calls.question[0].fields))
})

test("a multi-question form requires an answer for every question", async () => {
  const { model, coordinator, calls } = setup()
  askMultiQuestion(model)

  const incomplete = await coordinator.resolve("req_3", undefined, { q0: "Staging" })
  assert.equal(incomplete.applied, false)
  assert.equal(incomplete.reason, "invalid_action")
  assert.equal(model.isResolved("req_3"), false)
  assert.equal(calls.question.length, 0)

  const complete = await coordinator.resolve("req_3", undefined, { q0: "Staging", q1: "Yes" })
  assert.equal(complete.applied, true)
  assert.deepEqual(calls.question[0].answers, { q0: "Staging", q1: "Yes" })
  assert.equal(calls.question[0].text, "Staging")
  assert.equal(model.isResolved("req_3"), true)
})

test("unknown and already-resolved requests are not applicable", async () => {
  const { model, coordinator, calls } = setup()
  askPermission(model)
  assert.equal((await coordinator.resolve("nope", "allow")).reason, "unknown")
  await coordinator.resolve("req_1", "allow")
  assert.equal((await coordinator.resolve("req_1", "allow")).reason, "already_resolved")
  assert.equal(calls.permission.length, 1)
})

test("an invalid permission action is rejected without applying", async () => {
  const { model, coordinator, calls } = setup()
  askPermission(model)
  const result = await coordinator.resolve("req_1", "maybe")
  assert.equal(result.applied, false)
  assert.equal(result.reason, "invalid_action")
  assert.equal(calls.permission.length, 0)
  assert.equal(model.isResolved("req_1"), false)
})

test("an apply failure is fail-open and does not mark the request resolved", async () => {
  const model = new ActivityModel()
  model.apply({ type: "session.created", data: { sessionID: "ses_1" } })
  askPermission(model)
  const coordinator = new ResolutionCoordinator({
    model,
    applyPermission: async () => {
      throw new Error("permission reply not found")
    },
    applyQuestion: async () => {},
  })
  const result = await coordinator.resolve("req_1", "allow")
  assert.equal(result.applied, false)
  assert.equal(result.reason, "apply_failed")
  assert.equal(model.isResolved("req_1"), false)
})
