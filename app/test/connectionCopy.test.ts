import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const source = readFileSync(new URL("../App.tsx", import.meta.url), "utf8")

test("the Bluetooth connection action uses vendor-neutral wording", () => {
  assert.match(source, /label="Find nearby computer"/)
  assert.doesNotMatch(source, /Connect to Mac/)
})

test("the manual address action stays available", () => {
  assert.match(source, /label="Connect by address"/)
})
