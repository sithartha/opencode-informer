import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { buildFormAnswer, replyToForm, replyToPermission } from "../src/serviceReply.js"

test("buildFormAnswer resolves labels to option values", () => {
  const field = { key: "db", options: [{ label: "PostgreSQL", value: "pg" }, { label: "SQLite", value: "sqlite" }] }
  assert.equal(buildFormAnswer(field, "PostgreSQL"), "pg")
  assert.equal(buildFormAnswer(field, "sqlite"), "sqlite")
})

test("buildFormAnswer falls back to the label when no value is set", () => {
  const field = { key: "db", options: [{ label: "PostgreSQL" }] }
  assert.equal(buildFormAnswer(field, "PostgreSQL"), "PostgreSQL")
  assert.equal(buildFormAnswer(field, "Other"), "Other")
})

test("buildFormAnswer handles a multiselect field", () => {
  const field = { type: "multiselect", options: [{ label: "A", value: "a" }, { label: "B", value: "b" }] }
  assert.deepEqual(buildFormAnswer(field, "A, B"), ["a", "b"])
})

test("buildFormAnswer accepts plain string options", () => {
  const field = { key: "db", options: ["PostgreSQL", "SQLite"] }
  assert.equal(buildFormAnswer(field, "SQLite"), "SQLite")
  assert.equal(buildFormAnswer(field, "sqlite"), "SQLite")
})

test("buildFormAnswer accepts the object shape used on the wire", () => {
  const field = { key: "db", options: [{ label: "PostgreSQL", value: "pg", description: "Managed" }] }
  assert.equal(buildFormAnswer(field, "PostgreSQL"), "pg")
  assert.equal(buildFormAnswer(field, "pg"), "pg")
})

test("replies post to the local service with basic auth", async () => {
  const dir = mkdtempSync(join(tmpdir(), "oc-service-"))
  mkdirSync(join(dir, "opencode"))
  writeFileSync(
    join(dir, "opencode", "service.json"),
    JSON.stringify({ url: "http://127.0.0.1:9999", password: "secret" }),
  )
  const prev = process.env.XDG_STATE_HOME
  process.env.XDG_STATE_HOME = dir

  try {
    const calls = []
    const fetchImpl = async (url, init) => {
      calls.push({ url, init })
      return { ok: true }
    }

    await replyToForm("ses_1", "form_1", { q0: "pg" }, { fetchImpl })
    assert.equal(calls[0].url, "http://127.0.0.1:9999/api/session/ses_1/form/form_1/reply")
    assert.equal(calls[0].init.method, "POST")
    assert.match(calls[0].init.headers.Authorization, /^Basic /)
    assert.deepEqual(JSON.parse(calls[0].init.body), { answer: { q0: "pg" } })

    await replyToPermission("ses_1", "req_1", "once", undefined, { fetchImpl })
    assert.equal(calls[1].url, "http://127.0.0.1:9999/api/session/ses_1/permission/req_1/reply")
    assert.deepEqual(JSON.parse(calls[1].init.body), { decision: "once" })
  } finally {
    if (prev === undefined) delete process.env.XDG_STATE_HOME
    else process.env.XDG_STATE_HOME = prev
    rmSync(dir, { recursive: true, force: true })
  }
})
