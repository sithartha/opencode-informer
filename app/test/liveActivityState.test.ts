import test from "node:test"
import assert from "node:assert/strict"
import { activityConfig, activityLabel, activityMark, activityState, activityStatus, activityTitle } from "../src/liveActivityState"
import { resolveTheme } from "../src/theme"

const plain = resolveTheme("default", "light")

test("counts read as plain lines (the widget draws the dots)", () => {
  const state = activityState({ total: 3, running: 2, waitingApproval: 1, waitingAnswer: 0, stopped: 0 }, plain)
  assert.equal(state.title, "3 agents")
  assert.equal(state.subtitle, "# NEEDS YOU\n1 permission\n2 working")
})

test("each state is on its own line", () => {
  const state = activityState({ total: 4, running: 2, waitingApproval: 1, waitingAnswer: 1, stopped: 1 }, plain)
  assert.equal(state.subtitle, "# NEEDS YOU\n1 permission\n1 question\n2 working\n1 inactive")
})

test("working line", () => {
  const state = activityState({ total: 1, running: 1, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }, plain)
  assert.equal(state.subtitle, "# ALL CLEAR\n1 working")
})

test("idle state when nothing is active", () => {
  const state = activityState({ total: 0, running: 0, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }, plain)
  assert.equal(state.title, "0 agents")
  assert.equal(state.subtitle, "# IDLE")
})

test("stale is appended", () => {
  const state = activityState({ total: 1, running: 1, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }, plain, true)
  assert.match(state.subtitle ?? "", /stale/)
})

test("singular agent", () => {
  assert.equal(activityTitle({ total: 1, running: 1, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }), "1 agent")
})

test("the app mark is kept (no per-theme image)", () => {
  const state = activityState({ total: 1, running: 1, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }, plain)
  assert.equal(state.imageName, "oi")
  assert.equal(activityLabel(plain), "")
})

test("disconnected state says there is no connection", () => {
  const state = activityState({ total: 2, running: 2, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }, plain, false, true)
  assert.equal(state.title, "No connection")
  assert.match(state.subtitle ?? "", /Can't reach OpenCode/)
})

test("labels and status words mirror the hero per skin", () => {
  assert.equal(activityLabel(resolveTheme("evangelion", "unit01")), "MAGI SYSTEM")
  assert.equal(activityLabel(resolveTheme("sanrio", "chococat")), "CHOCOCAT")
  assert.equal(activityLabel(resolveTheme("starwars", "sith")), "SITH ORDER")
  assert.equal(activityLabel(resolveTheme("tunes", "classic")), "TUNES CLASSIC")
  assert.equal(activityLabel(resolveTheme("tunes", "bento")), "TUNES BENTO")
  assert.equal(activityLabel(resolveTheme("classic-os", "blue")), "CLASSIC OS")
  const clear = { total: 1, running: 1, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }
  const waiting = { total: 1, running: 0, waitingApproval: 1, waitingAnswer: 0, stopped: 0 }
  assert.equal(activityStatus(resolveTheme("evangelion", "unit01"), clear), "NOMINAL")
  assert.equal(activityStatus(resolveTheme("evangelion", "unit01"), waiting), "ATTENTION")
  assert.equal(activityStatus(resolveTheme("sanrio", "kitty"), clear), "ALL GOOD")
  assert.equal(activityStatus(resolveTheme("starwars", "sith"), clear), "◆ READY")
  assert.equal(activityStatus(resolveTheme("tunes", "classic"), clear), "PLAYING")
  assert.equal(activityStatus(resolveTheme("tunes", "classic"), waiting), "NEEDS YOU")
  assert.equal(activityStatus(resolveTheme("classic-os", "blue"), clear), "ACTIVE")
})

test("tunes and classic os use their own Live Activity marks", () => {
  assert.equal(activityMark(resolveTheme("tunes", "classic")), "mark-bolt-gold")
  assert.equal(activityMark(resolveTheme("tunes", "bento")), "mark-bolt-orange")
  assert.equal(activityMark(resolveTheme("classic-os", "dark")), "mark-os")
})

test("themed label and status lead the subtitle", () => {
  const force = resolveTheme("starwars", "jedi")
  const state = activityState({ total: 1, running: 1, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }, force)
  assert.equal(state.subtitle, "# JEDI ORDER · ◆ READY\n1 working")
})

test("activity config uses the theme palette and accent", () => {
  const cat = resolveTheme("sanrio", "kitty")
  const config = activityConfig(cat)
  assert.equal(config.backgroundColor, cat.surface)
  assert.equal(config.titleColor, cat.text)
  assert.equal(config.subtitleColor, cat.textSecondary)
  assert.equal(config.progressViewTint, cat.accent)
})
