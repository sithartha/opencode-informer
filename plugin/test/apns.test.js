import test from "node:test"
import assert from "node:assert/strict"
import { generateKeyPairSync } from "node:crypto"
import { writeFileSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createApnsSender } from "../src/apns.js"

function fakeHttp2(status = 200) {
  const captured = {}
  const req = {
    on(event, cb) {
      if (event === "response") cb({ ":status": status })
      if (event === "end") this._end = cb
      return this
    },
    setEncoding() {
      return this
    },
    end(body) {
      captured.body = body
      if (this._end) this._end()
    },
  }
  const client = {
    on() {
      return this
    },
    request(opts) {
      captured.headers = opts
      return req
    },
    close() {},
  }
  return { impl: { connect: () => client }, captured }
}

test("the sender is disabled without a key", async () => {
  const sender = createApnsSender({ topic: "ru.opencode.informer" })
  assert.equal(sender.enabled, false)
  assert.equal((await sender.send("tok", {})).ok, false)
})

test("signs an ES256 JWT and posts to APNs", async () => {
  const dir = mkdtempSync(join(tmpdir(), "apns-"))
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" })
  const keyPath = join(dir, "AuthKey.p8")
  writeFileSync(keyPath, privateKey.export({ type: "pkcs8", format: "pem" }))

  const { impl, captured } = fakeHttp2(200)
  const sender = createApnsSender(
    { keyPath, keyId: "ABC123", teamId: "TEAM123", topic: "ru.opencode.informer", production: true },
    { http2Impl: impl },
  )
  assert.equal(sender.enabled, true)

  const res = await sender.send("devtok", { aps: { alert: { title: "hi", body: "there" } } })
  assert.equal(res.ok, true)
  assert.equal(captured.headers[":path"], "/3/device/devtok")
  assert.match(captured.headers.authorization, /^bearer [\w-]+\.[\w-]+\.[\w-]+$/)
  assert.equal(captured.headers["apns-topic"], "ru.opencode.informer")
  assert.equal(captured.headers["apns-push-type"], "alert")
})

test("a failing APNs request does not throw", async () => {
  const dir = mkdtempSync(join(tmpdir(), "apns-"))
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" })
  const keyPath = join(dir, "AuthKey.p8")
  writeFileSync(keyPath, privateKey.export({ type: "pkcs8", format: "pem" }))

  const { impl } = fakeHttp2(410)
  const sender = createApnsSender({ keyPath, keyId: "A", teamId: "T", topic: "x" }, { http2Impl: impl })
  const res = await sender.send("devtok", {})
  assert.equal(res.ok, false)
  assert.equal(res.status, 410)
})
