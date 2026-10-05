import test from "node:test"
import assert from "node:assert/strict"
import { LiveActivityController } from "../src/liveActivityController"
import { emptyState, stateFromSnapshot, type Session } from "../src/events"

function fakeApi() {
  const calls = { start: 0, update: 0, stop: 0, lastSubtitle: "" }
  const api = {
    startActivity: () => {
      calls.start += 1
      return "act-1"
    },
    updateActivity: (_id: string, state: { subtitle?: string }) => {
      calls.update += 1
      calls.lastSubtitle = state.subtitle ?? ""
    },
    stopActivity: () => {
      calls.stop += 1
    },
  }
  return { api, calls }
}

function twoRunning() {
  const sessions: Session[] = [
    { id: "a", agent: "opencode", cwd: "/tmp", phase: "running", currentTool: null, lastActivity: "", updatedAt: 0 },
    { id: "b", agent: "opencode", cwd: "/tmp", phase: "running", currentTool: null, lastActivity: "", updatedAt: 0 },
  ]
  return stateFromSnapshot({ activeSessionCount: 2, sessions })
}

test("starts on first active state and updates afterwards", () => {
  const { api, calls } = fakeApi()
  const controller = new LiveActivityController(api)

  controller.update(twoRunning())
  assert.equal(calls.start, 1)
  assert.equal(calls.update, 0)

  controller.update(twoRunning())
  assert.equal(calls.start, 1)
  assert.equal(calls.update, 1)
})

test("ends when the aggregate returns to zero", () => {
  const { api, calls } = fakeApi()
  const controller = new LiveActivityController(api)

  controller.update(twoRunning())
  controller.update(emptyState())
  assert.equal(calls.stop, 1)
})

test("a stale flag re-renders with the stale marker", () => {
  const { api, calls } = fakeApi()
  const controller = new LiveActivityController(api)

  controller.update(twoRunning())
  controller.setStale(true)
  assert.match(calls.lastSubtitle, /stale/)
})

test("disabled does not start and enabling renders", () => {
  const { api, calls } = fakeApi()
  const controller = new LiveActivityController(api)

  controller.setEnabled(false)
  controller.update(twoRunning())
  assert.equal(calls.start, 0)

  controller.setEnabled(true)
  assert.equal(calls.start, 1)
})
