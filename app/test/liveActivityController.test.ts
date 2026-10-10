import test from "node:test"
import assert from "node:assert/strict"
import { LiveActivityController } from "../src/liveActivityController"
import { emptyState, stateFromSnapshot, type Session } from "../src/events"
import { resolveTheme } from "../src/theme"

function fakeApi() {
  const calls = { start: 0, update: 0, stop: 0, lastTitle: "", lastSubtitle: "", lastConfig: undefined as unknown }
  const api = {
    startActivity: (_state: unknown, config: unknown) => {
      calls.start += 1
      calls.lastConfig = config
      return "act-1"
    },
    updateActivity: (_id: string, state: { title?: string; subtitle?: string }) => {
      calls.update += 1
      calls.lastTitle = state.title ?? ""
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

test("keeps the activity when the aggregate returns to zero", () => {
  const { api, calls } = fakeApi()
  const controller = new LiveActivityController(api)

  controller.update(twoRunning())
  controller.update(emptyState())
  assert.equal(calls.start, 1)
  assert.equal(calls.stop, 0)
  assert.equal(calls.update, 1)
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

test("a disconnected flag shows no connection while an activity is running", () => {
  const { api, calls } = fakeApi()
  const controller = new LiveActivityController(api)

  controller.update(twoRunning())
  controller.setDisconnected(true)
  assert.equal(calls.lastTitle, "No connection")
  assert.match(calls.lastSubtitle, /OpenCode/)
})

test("a disconnection alone does not end the activity immediately", () => {
  const { api, calls } = fakeApi()
  const controller = new LiveActivityController(api)

  controller.update(twoRunning())
  controller.setDisconnected(true)
  assert.equal(calls.stop, 0)
})

test("ends after a long disconnection", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] })
  const { api, calls } = fakeApi()
  const controller = new LiveActivityController(api)

  controller.update(twoRunning())
  controller.setDisconnected(true)
  assert.equal(calls.stop, 0)

  t.mock.timers.tick(30 * 60 * 1000)
  assert.equal(calls.stop, 1)
})

test("the theme is applied to the started activity", () => {
  const { api, calls } = fakeApi()
  const controller = new LiveActivityController(api)
  const theme = resolveTheme("starwars", "sith")

  controller.setTheme(theme)
  controller.update(twoRunning())
  assert.equal((calls.lastConfig as { backgroundColor?: string }).backgroundColor, theme.surface)
})

test("holds the first start until the leftover cleanup resolves", async () => {
  const { api, calls } = fakeApi()
  const controller = new LiveActivityController(api)

  let release!: () => void
  const cleanup = new Promise<void>((resolve) => {
    release = resolve
  })
  controller.deferUntil(cleanup)
  controller.update(twoRunning())
  assert.equal(calls.start, 0)

  release()
  await cleanup
  await Promise.resolve()
  assert.equal(calls.start, 1)
})

test("re-theming ends the old activity before starting the replacement", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] })
  const { api, calls } = fakeApi()
  const controller = new LiveActivityController(api)

  controller.setTheme(resolveTheme("tunes", "classic"))
  controller.update(twoRunning())
  assert.equal(calls.start, 1)

  controller.refreshTheme()
  assert.equal(calls.stop, 1)
  assert.equal(calls.start, 1) // still settling: no second card yet

  controller.update(twoRunning()) // arrives during the settle
  assert.equal(calls.start, 1)

  t.mock.timers.tick(1500)
  assert.equal(calls.start, 2) // exactly one replacement
})

test("reconnecting after a timeout stop does not double-start", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] })
  const { api, calls } = fakeApi()
  const controller = new LiveActivityController(api)

  controller.update(twoRunning())
  assert.equal(calls.start, 1)

  controller.setDisconnected(true)
  t.mock.timers.tick(30 * 60 * 1000)
  assert.equal(calls.stop, 1)

  // A reconnect inside the settle window is deferred, not started a second time.
  controller.setDisconnected(false)
  controller.update(twoRunning())
  assert.equal(calls.start, 1)

  t.mock.timers.tick(1500)
  assert.equal(calls.start, 2)
})
