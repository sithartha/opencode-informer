import test from "node:test"
import assert from "node:assert/strict"
import { sessionPresentation, toggleExpanded } from "../src/layout"

test("the compact layout shows compact cards by default", () => {
  assert.equal(sessionPresentation({ layout: "compact", expandedSessionID: null, sessionID: "s1" }), "compact")
})

test("the full layout always shows full cards", () => {
  assert.equal(sessionPresentation({ layout: "full", expandedSessionID: null, sessionID: "s1" }), "full")
})

test("a session that needs attention is compact until the user expands it", () => {
  assert.equal(sessionPresentation({ layout: "compact", expandedSessionID: null, sessionID: "s1" }), "compact")
})

test("only the expanded session is full", () => {
  assert.equal(sessionPresentation({ layout: "compact", expandedSessionID: "s2", sessionID: "s2" }), "full")
  assert.equal(sessionPresentation({ layout: "compact", expandedSessionID: "s2", sessionID: "s1" }), "compact")
})

test("expanding another session collapses the previous one", () => {
  const first = toggleExpanded(null, "s1")
  assert.equal(first, "s1")
  const second = toggleExpanded(first, "s2")
  assert.equal(second, "s2")
})

test("toggling the expanded session collapses it", () => {
  assert.equal(toggleExpanded("s1", "s1"), null)
})
