import test from "node:test"
import assert from "node:assert/strict"
import { setup } from "../src/bridge.js"

function fakeCtx() {
  return {
    event: {
      subscribe: async function* ({ signal }) {
        while (!signal.aborted) await new Promise((resolve) => setTimeout(resolve, 10))
      },
    },
    permission: { reply: async () => {} },
    session: { form: { reply: async () => {} } },
  }
}

test("setup binds only once per process (singleton guard)", async (t) => {
  const first = await setup(fakeCtx(), { config: { port: 0, keepaliveMs: 0 } })
  t.after(() => first.stop())

  const firstPort = first.server.address().port
  assert.ok(firstPort > 0)

  const second = await setup(fakeCtx(), { config: { port: 0, keepaliveMs: 0 } })
  assert.equal(second, first, "second setup must reuse the running bridge")
  assert.equal(second.server.address().port, firstPort, "no second listener is created")

  await first.stop()
})
