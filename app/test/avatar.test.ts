import test from "node:test"
import assert from "node:assert/strict"
import type { Theme } from "../src/theme"
import { avatarColor, avatarIdentity, avatarMood } from "../src/avatar"

const theme = {
  dark: false,
  accent: "#111111",
  secondaryAccent: "#222222",
  allow: "#333333",
  deny: "#444444",
  questionBorder: ["#555555", "#666666"],
  permissionBorder: ["#777777", "#888888"],
} as unknown as Theme

test("a running session with a tool is thinking, without one is working", () => {
  assert.equal(avatarMood("running", "Bash"), "thinking")
  assert.equal(avatarMood("running", null), "working")
  assert.equal(avatarMood("running"), "working")
})

test("waiting sessions observe the user", () => {
  assert.equal(avatarMood("waiting-permission"), "observing")
  assert.equal(avatarMood("waiting-answer"), "observing")
})

test("completed and ended sessions settle", () => {
  assert.equal(avatarMood("completed"), "done")
  assert.equal(avatarMood("ended"), "inactive")
  assert.equal(avatarMood("unknown"), "idle")
})

test("every avatar is a circle", () => {
  assert.equal(avatarIdentity("opencode", "s1").cut, "circle")
  assert.equal(avatarIdentity("build", "s9").cut, "circle")
})

test("the same session always gets the same face", () => {
  assert.deepEqual(avatarIdentity("opencode", "s1"), avatarIdentity("opencode", "s1"))
})

test("sessions differ only in their light seed", () => {
  const first = avatarIdentity("opencode", "s1")
  const second = avatarIdentity("opencode", "s2")
  assert.equal(first.cut, second.cut)
  assert.notDeepEqual(first.seed, second.seed)
})

test("an agent without a session id still gets a stable look", () => {
  assert.deepEqual(avatarIdentity("opencode", null), avatarIdentity("opencode", undefined))
})

test("the identity has a three-value seed in range", () => {
  const look = avatarIdentity("opencode", "s1")
  assert.equal(look.seed.length, 3)
  for (const value of look.seed) assert.ok(value >= 0 && value <= Math.PI * 2)
})

test("the avatar colour is the active theme accent", () => {
  assert.equal(avatarColor(theme), "#111111")
})
