import test from "node:test"
import assert from "node:assert/strict"
import { isStale } from "../src/staleness"

test("fresh data within the threshold is not stale", () => {
  assert.equal(isStale(1000, 1000 + 100, 1000), false)
})

test("exactly at the threshold is not stale", () => {
  assert.equal(isStale(1000, 2000, 1000), false)
})

test("past the threshold is stale", () => {
  assert.equal(isStale(1000, 2001, 1000), true)
})

test("no timestamp is never stale", () => {
  assert.equal(isStale(0, 999999, 1000), false)
})
