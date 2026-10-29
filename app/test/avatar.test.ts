import test from "node:test"
import assert from "node:assert/strict"
import type { Theme } from "../src/theme"
import { avatarColor, avatarCut, avatarIdentity, avatarMood } from "../src/avatar"

const theme = {
  dark: false,
  skin: "default",
  accent: "#111111",
  secondaryAccent: "#222222",
  allow: "#333333",
  deny: "#444444",
  textMuted: "#999999",
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

test("every avatar defaults to a circle", () => {
  assert.equal(avatarIdentity("opencode", "s1").cut, "circle")
  assert.equal(avatarIdentity("build", "s9").cut, "circle")
})

test("the theme's corner style picks the avatar silhouette", () => {
  assert.equal(avatarCut(theme), "circle")
  for (const skin of ["default", "sanrio", "starwars", "classic-os", "wizard"] as const) {
    assert.equal(avatarCut({ ...theme, skin } as Theme), "circle", skin)
  }
  for (const skin of ["evangelion", "tunes", "terminal"] as const) {
    assert.equal(avatarCut({ ...theme, skin } as Theme), "square", skin)
  }
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

test("the avatar colour follows the session mode", () => {
  assert.equal(avatarColor(theme), "#111111")
  assert.equal(avatarColor(theme, "running"), "#333333")
  assert.equal(avatarColor(theme, "waiting-permission"), "#777777")
  assert.equal(avatarColor(theme, "waiting-answer"), "#555555")
  assert.equal(avatarColor(theme, "completed"), "#999999")
  assert.equal(avatarColor(theme, "ended"), "#999999")
})
