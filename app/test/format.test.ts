import test from "node:test"
import assert from "node:assert/strict"
import { formatCost } from "../src/format"

test("formatCost shows four decimals under a dollar and two above", () => {
  assert.equal(formatCost(0.0123), "$0.0123")
  assert.equal(formatCost(1.5), "$1.50")
  assert.equal(formatCost(0), "$0.0000")
  assert.equal(formatCost(-1), "")
  assert.equal(formatCost(Number.NaN), "")
})
