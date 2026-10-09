import test from "node:test"
import assert from "node:assert/strict"
import { joinHostPort, manualBase } from "../src/manualConnect"

test("manualBase builds a bridge URL from host:port", () => {
  assert.equal(manualBase("127.0.0.1:38963"), "http://127.0.0.1:38963")
  assert.equal(manualBase("192.168.1.10:1234"), "http://192.168.1.10:1234")
})

test("manualBase rejects malformed values", () => {
  for (const value of ["", "host", ":123", "host:", "host:0", "host:99999"]) {
    assert.equal(manualBase(value), null, `should reject ${JSON.stringify(value)}`)
  }
})

test("joinHostPort validates and joins separate fields", () => {
  assert.equal(joinHostPort("192.168.1.10", "38963"), "192.168.1.10:38963")
  assert.equal(joinHostPort(" 127.0.0.1 ", " 1234 "), "127.0.0.1:1234")
  assert.equal(joinHostPort("", "38963"), null)
  assert.equal(joinHostPort("host", ""), null)
  assert.equal(joinHostPort("host", "0"), null)
  assert.equal(joinHostPort("host", "99999"), null)
  assert.equal(joinHostPort("host", "abc"), null)
})
