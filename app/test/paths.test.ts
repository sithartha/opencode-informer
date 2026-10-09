import test from "node:test"
import assert from "node:assert/strict"
import { dirName } from "../src/paths"

test("dirName returns the final path segment", () => {
  assert.equal(dirName("/Users/dev/project"), "project")
  assert.equal(dirName("/Users/dev/project/"), "project")
  assert.equal(dirName("C:\\Users\\dev\\project"), "project")
  assert.equal(dirName("/"), "/")
  assert.equal(dirName(""), "")
})
