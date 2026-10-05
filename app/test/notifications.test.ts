import test from "node:test"
import assert from "node:assert/strict"
import { actionToResolution, notificationFor, notificationForDoorbell } from "../src/notifications"

test("permission events map to an actionable notification", () => {
  const plan = notificationFor({ type: "permission.requested", data: { sessionID: "s1", requestID: "r1", title: "Allow Bash", summary: "rm -rf build/", agent: "OpenCode" } })
  assert.equal(plan?.category, "PERMISSION_REQUEST")
  assert.deepEqual(
    plan?.actions.map((a) => a.identifier),
    ["ALLOW", "DENY"],
  )
  assert.equal(plan?.requestID, "r1")
})

test("question events map options to actions", () => {
  const plan = notificationFor({ type: "question.asked", data: { sessionID: "s1", requestID: "q1", title: "Which db?", options: ["Postgres", "SQLite"] } })
  assert.equal(plan?.category, "QUESTION")
  assert.deepEqual(
    plan?.actions.map((a) => a.identifier),
    ["OPTION:Postgres", "OPTION:SQLite"],
  )
})

test("completion events are informational", () => {
  const plan = notificationFor({ type: "turn.completed", data: { sessionID: "s1", summary: "done" } })
  assert.equal(plan?.category, "SESSION_COMPLETED")
  assert.equal(plan?.actions.length, 0)
})

test("non-notifiable events return null", () => {
  assert.equal(notificationFor({ type: "tool.started", data: { sessionID: "s1", tool: "Bash", input: "ls" } }), null)
})

test("doorbell payloads map to notifications for the background wake path", () => {
  const permission = notificationForDoorbell({ kind: "permission", requestID: "r1", title: "Allow Bash" })
  assert.equal(permission?.category, "PERMISSION_REQUEST")
  assert.deepEqual(
    permission?.actions.map((a) => a.identifier),
    ["ALLOW", "DENY"],
  )

  const question = notificationForDoorbell({ kind: "question", requestID: "q1", title: "Which db?" })
  assert.equal(question?.category, "QUESTION")

  const completion = notificationForDoorbell({ kind: "completion", title: "done" })
  assert.equal(completion?.category, "SESSION_COMPLETED")

  assert.equal(notificationForDoorbell({ kind: "pairing" }), null)
  assert.equal(notificationForDoorbell(null), null)
})

test("action identifiers resolve back to bridge actions", () => {
  assert.equal(actionToResolution("ALLOW"), "allow")
  assert.equal(actionToResolution("DENY"), "deny")
  assert.equal(actionToResolution("OPTION:Postgres"), "Postgres")
  assert.equal(actionToResolution("garbage"), null)
})
