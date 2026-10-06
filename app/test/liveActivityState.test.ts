import test from "node:test"
import assert from "node:assert/strict"
import { activityState, activityTitle } from "../src/liveActivityState"

test("counts read as plain lines (the widget draws the dots)", () => {
  const state = activityState({ total: 3, running: 2, waitingApproval: 1, waitingAnswer: 0, stopped: 0 })
  assert.equal(state.title, "3 agents")
  assert.equal(state.subtitle, "1 permission\n2 working")
  assert.doesNotMatch(state.subtitle ?? "", /!/)
})

test("each state is on its own line", () => {
  const state = activityState({ total: 4, running: 2, waitingApproval: 1, waitingAnswer: 1, stopped: 1 })
  assert.equal(state.subtitle, "1 permission\n1 question\n2 working\n1 inactive")
})

test("question and permission both appear", () => {
  const state = activityState({ total: 2, running: 0, waitingApproval: 1, waitingAnswer: 1, stopped: 0 })
  assert.equal(state.subtitle, "1 permission\n1 question")
})

test("working line", () => {
  const state = activityState({ total: 1, running: 1, waitingApproval: 0, waitingAnswer: 0, stopped: 0 })
  assert.equal(state.subtitle, "1 working")
})

test("idle state when nothing is active", () => {
  const state = activityState({ total: 0, running: 0, waitingApproval: 0, waitingAnswer: 0, stopped: 0 })
  assert.equal(state.title, "0 agents")
  assert.equal(state.subtitle, "idle")
})

test("stale is appended", () => {
  const state = activityState({ total: 1, running: 1, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }, true)
  assert.match(state.subtitle ?? "", /stale/)
})

test("singular agent", () => {
  assert.equal(activityTitle({ total: 1, running: 1, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }), "1 agent")
})

test("uses the OI mark", () => {
  const state = activityState({ total: 1, running: 1, waitingApproval: 0, waitingAnswer: 0, stopped: 0 })
  assert.equal(state.imageName, "oi")
})

test("disconnected state says there is no connection", () => {
  const state = activityState({ total: 2, running: 2, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }, false, true)
  assert.equal(state.title, "No connection")
  assert.match(state.subtitle ?? "", /Can't reach OpenCode/)
})
