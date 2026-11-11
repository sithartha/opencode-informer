import test from "node:test"
import assert from "node:assert/strict"
import { ShellOutputTracker, tailLines } from "../src/shellOutput.js"

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

test("tailLines keeps the last lines and drops the trailing blank ones", () => {
  assert.deepEqual(tailLines("one\ntwo\nthree\n"), ["one", "two", "three"])
  assert.deepEqual(tailLines("1\n2\n3\n4\n5\n6\n7\n"), ["3", "4", "5", "6", "7"])
  assert.deepEqual(tailLines(""), [])
})

test("tailLines clips a line that would overflow the card", () => {
  const [line] = tailLines("x".repeat(500))
  assert.equal(line.length, 201)
  assert.ok(line.endsWith("…"))
})

test("tracker follows a shell file and reports the last five lines", async () => {
  const seen = []
  const tracker = new ShellOutputTracker({
    intervalMs: 5,
    read: async () => "build 1\nbuild 2\nok\n",
    resolveSession: (id) => `root-${id}`,
    onLines: (sessionID, lines) => seen.push({ sessionID, lines }),
  })
  tracker.observe({ type: "shell.created", data: { info: { id: "sh1", file: "/tmp/sh1.out", metadata: { sessionID: "ses_child" } } } })
  await wait(30)
  assert.deepEqual(seen[0], { sessionID: "root-ses_child", lines: ["build 1", "build 2", "ok"] })
  tracker.stopAll()
})

test("tracker emits only when the tail changes", async () => {
  const seen = []
  let text = "first\n"
  const tracker = new ShellOutputTracker({
    intervalMs: 5,
    read: async () => text,
    onLines: (sessionID, lines) => seen.push(lines.join("|")),
  })
  tracker.observe({ type: "shell.created", data: { info: { id: "sh1", file: "/tmp/sh1.out", metadata: { sessionID: "ses_1" } } } })
  await wait(25)
  text = "first\nsecond\n"
  await wait(25)
  tracker.stopAll()
  assert.deepEqual(seen, ["first", "first|second"])
})

test("a shell that exits is followed once more and then forgotten", async () => {
  const seen = []
  let text = "still running\n"
  const tracker = new ShellOutputTracker({
    intervalMs: 5,
    read: async () => text,
    onLines: (sessionID, lines) => seen.push(lines.join("|")),
  })
  tracker.observe({ type: "shell.created", data: { info: { id: "sh1", file: "/tmp/sh1.out", metadata: { sessionID: "ses_1" } } } })
  await wait(20)
  text = "still running\nexit 0\n"
  tracker.observe({ type: "shell.exited", data: { id: "sh1", exit: 0 } })
  await wait(20)
  assert.equal(tracker.shells.size, 0)
  assert.deepEqual(seen, ["still running", "still running|exit 0"])
})

test("shells without a session or file are ignored", () => {
  const tracker = new ShellOutputTracker({ read: async () => "" })
  tracker.observe({ type: "shell.created", data: { info: { id: "sh1" } } })
  tracker.observe({ type: "shell.created", data: { info: { id: "sh2", file: "/tmp/x" } } })
  assert.equal(tracker.shells.size, 0)
})
