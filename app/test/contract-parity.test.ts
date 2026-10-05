import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { CONTRACT } from "../src/contract"

const canonical = JSON.parse(readFileSync(new URL("../../contract/contract.json", import.meta.url), "utf8"))

test("the app contract mirrors contract/contract.json", () => {
  assert.equal(CONTRACT.version, canonical.version)
  assert.deepEqual(CONTRACT.bridge, canonical.bridge)
  assert.deepEqual(CONTRACT.helper, canonical.helper)
  assert.deepEqual(CONTRACT.endpoints, canonical.endpoints)
  assert.deepEqual(CONTRACT.phases, canonical.phases)
  assert.deepEqual(CONTRACT.streamEvents, canonical.streamEvents)
  assert.deepEqual(CONTRACT.doorbellKinds, canonical.doorbellKinds)
  assert.deepEqual(CONTRACT.ble, canonical.ble)
})
