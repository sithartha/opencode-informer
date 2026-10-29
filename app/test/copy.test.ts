import test from "node:test"
import assert from "node:assert/strict"
import { CTA, connectionLabel, phaseLabel, relativeTime } from "../src/copy"

test("connection states read as plain language", () => {
  assert.equal(connectionLabel("connected", "studio-mac"), "Connected · studio-mac")
  assert.equal(connectionLabel("connecting"), "Connecting")
  assert.equal(connectionLabel("discovering"), "Looking for your computer")
  assert.equal(connectionLabel("disconnected"), "Offline")
})

test("session phases read as plain language", () => {
  assert.equal(phaseLabel("running"), "Running")
  assert.equal(phaseLabel("waiting-permission"), "Needs approval")
  assert.equal(phaseLabel("waiting-answer"), "Waiting for an answer")
  assert.equal(phaseLabel("completed"), "Done")
  assert.equal(phaseLabel("ended"), "Ended")
  assert.equal(phaseLabel("custom"), "custom")
})

test("relative time stays short and readable", () => {
  assert.equal(relativeTime(0), "just now")
  assert.equal(relativeTime(12000), "12s ago")
  assert.equal(relativeTime(180000), "3m ago")
  assert.equal(relativeTime(7200000), "2h ago")
})

test("the demo CTA is consistent", () => {
  assert.equal(CTA.demo, "Try the demo")
})
