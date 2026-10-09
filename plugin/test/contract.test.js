import test from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import { loadContract, validateContract } from "../../contract/validate.mjs"
import { createDoorbell } from "../src/doorbell.js"

test("the shared contract is valid", () => {
  const contract = loadContract()
  assert.deepEqual(validateContract(contract), [])
})

test("the plugin emits exactly the contract's stream events", () => {
  const contract = loadContract()
  const emitted = [
    "session.started",
    "session.ended",
    "prompt.submitted",
    "tool.started",
    "tool.ended",
    "permission.requested",
    "question.asked",
    "turn.completed",
    "session.activity",
    "session.updated",
    "session.cost",
    "actionable.resolved",
  ]
  assert.deepEqual(emitted, contract.streamEvents)
})

test("the doorbell sends the documented payload shape", async () => {
  const contract = loadContract()
  const payload = contract.fixtures["doorbell.permission"].value

  const received = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let body = ""
      req.on("data", (chunk) => (body += chunk))
      req.on("end", () => {
        res.end("ok")
        resolve({ path: req.url, body })
      })
    })
    server.on("error", reject)
    server.listen(0, "127.0.0.1", async () => {
      const port = server.address().port
      const ring = createDoorbell(`http://127.0.0.1:${port}${contract.helper.ringPath}`)
      await ring(payload)
      server.close()
    })
  })

  assert.equal(received.path, contract.helper.ringPath)
  assert.deepEqual(JSON.parse(received.body), payload)
})
