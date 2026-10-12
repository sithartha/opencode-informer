import test from "node:test"
import assert from "node:assert/strict"
import { TIP_IDS, TipStore, type TipAdapter } from "../src/purchases"

function fake(overrides: Partial<TipAdapter> = {}): { adapter: TipAdapter; calls: { buy: string[] } } {
  const calls = { buy: [] as string[] }
  const adapter: TipAdapter = {
    getProducts: async (ids) => ids.map((id) => ({ id: String(id), price: "$0.99" })),
    buy: async (id) => {
      calls.buy.push(id)
      return "success"
    },
    ...overrides,
  }
  return { adapter, calls }
}

test("loads the tip products", async () => {
  const { adapter } = fake()
  const products = await new TipStore(adapter).load()
  assert.deepEqual(
    products.map((product) => product.id),
    [...TIP_IDS],
  )
})

test("a successful buy returns success and buys the requested tip", async () => {
  const { adapter, calls } = fake()
  const result = await new TipStore(adapter).buy(TIP_IDS[0])
  assert.equal(result.status, "success")
  assert.deepEqual(calls.buy, [TIP_IDS[0]])
})

test("pending and cancelled are surfaced", async () => {
  for (const status of ["pending", "cancelled"] as const) {
    const { adapter } = fake({ buy: async () => status })
    assert.equal((await new TipStore(adapter).buy(TIP_IDS[1])).status, status)
  }
})

test("errors are captured", async () => {
  const { adapter } = fake({
    buy: async () => {
      throw new Error("boom")
    },
  })
  const result = await new TipStore(adapter).buy(TIP_IDS[2])
  assert.equal(result.status, "error")
  assert.match(result.error ?? "", /boom/)
})
