import test from "node:test"
import assert from "node:assert/strict"
import { parseDoorbell, parseRendezvous } from "../src/bleProtocol"

test("parseRendezvous reads host and port", () => {
  assert.deepEqual(parseRendezvous("192.168.1.5:38963"), { host: "192.168.1.5", port: 38963 })
  assert.deepEqual(parseRendezvous("  10.0.0.2:80 "), { host: "10.0.0.2", port: 80 })
})

test("parseRendezvous rejects malformed values", () => {
  for (const value of [null, undefined, "", "nohost", "host:", ":123", "host:0", "host:99999", "host:abc"]) {
    assert.equal(parseRendezvous(value), null, `should reject ${JSON.stringify(value)}`)
  }
})

test("parseDoorbell accepts objects and rejects junk", () => {
  assert.deepEqual(parseDoorbell('{"kind":"permission","requestID":"r1"}'), { kind: "permission", requestID: "r1" })
  assert.equal(parseDoorbell("not json"), null)
  assert.equal(parseDoorbell("42"), null)
})
