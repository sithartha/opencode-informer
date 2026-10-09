import test from "node:test"
import assert from "node:assert/strict"
import { createDiagnostics, describeDiagnostic, parseDiagnostic, runGuarded } from "../src/diagnostics"

function memoryStore(initial: string | null = null) {
  let raw = initial
  return {
    get: async () => raw,
    set: async (value: string) => {
      raw = value
    },
    read: () => raw,
  }
}

test("createDiagnostics persists transitions, connection, and errors", async () => {
  const store = memoryStore()
  const diagnostics = createDiagnostics(store)
  await diagnostics.load()
  await diagnostics.transition("active")
  await diagnostics.connection("connected")
  await diagnostics.error(new Error("boom"), true)

  const snapshot = diagnostics.snapshot()
  assert.equal(snapshot.lastTransition, "active")
  assert.equal(snapshot.lastConnection, "connected")
  assert.match(snapshot.lastError ?? "", /boom/)
  assert.equal(snapshot.lastErrorFatal, true)
  assert.match(describeDiagnostic(snapshot) ?? "", /boom/)
  // The breadcrumb is durable (written to the store).
  assert.match(parseDiagnostic(store.read()).lastError ?? "", /boom/)
})

test("coldStart flags a run that entered the background and never returned", async () => {
  const dirty = createDiagnostics(memoryStore(JSON.stringify({ backgroundedAt: 100, foregroundedAt: 50 })))
  await dirty.load()
  await dirty.coldStart(200)
  assert.equal(dirty.snapshot().endedUnexpectedlyAt, 200)
  assert.match(describeDiagnostic(dirty.snapshot()) ?? "", /background/)

  const clean = createDiagnostics(memoryStore(JSON.stringify({ backgroundedAt: 50, foregroundedAt: 100 })))
  await clean.load()
  await clean.coldStart(200)
  assert.equal(clean.snapshot().endedUnexpectedlyAt, undefined)
})

test("runGuarded records a thrown failure and keeps running", async () => {
  const recorded: unknown[] = []
  await runGuarded(
    async () => {
      throw new Error("boom")
    },
    (error) => recorded.push(error),
  )
  assert.equal(recorded.length, 1)
  assert.equal((recorded[0] as Error).message, "boom")

  // A successful task records nothing.
  let ran = false
  await runGuarded(
    async () => {
      ran = true
    },
    (error) => recorded.push(error),
  )
  assert.equal(ran, true)
  assert.equal(recorded.length, 1)
})
