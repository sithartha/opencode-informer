import test from "node:test"
import assert from "node:assert/strict"
import { isHelperAdvertisement, readRendezvousFromLink } from "../src/bleRendezvous"
import { RENDEZVOUS_UUID, SERVICE_UUID } from "../src/contract"

const encode = (value: string) => Buffer.from(value, "utf8").toString("base64")

function reader(read: () => Promise<{ value: string | null }>) {
  const calls: string[][] = []
  return {
    calls,
    readCharacteristicForService: async (service: string, characteristic: string) => {
      calls.push([service, characteristic])
      return read()
    },
  }
}

test("reads and parses the rendezvous over the existing link", async () => {
  const link = reader(async () => ({ value: encode("10.0.0.23:38963") }))

  const result = await readRendezvousFromLink(link)

  assert.deepEqual(result, { host: "10.0.0.23", port: 38963 })
  assert.deepEqual(link.calls[0], [SERVICE_UUID, RENDEZVOUS_UUID])
})

test("returns null when the read fails", async () => {
  const link = reader(async () => {
    throw new Error("disconnected")
  })

  assert.equal(await readRendezvousFromLink(link), null)
})

test("returns null when the link does not answer in time", async () => {
  const link = reader(() => new Promise(() => undefined))

  assert.equal(await readRendezvousFromLink(link, 10), null)
})

test("returns null for a missing or malformed value", async () => {
  assert.equal(await readRendezvousFromLink(reader(async () => ({ value: null }))), null)

  const malformed = reader(async () => ({ value: encode("not-an-address") }))
  assert.equal(await readRendezvousFromLink(malformed), null)
})

test("peripherals advertising the helper service or name are accepted", () => {
  assert.equal(isHelperAdvertisement({ serviceUUIDs: [SERVICE_UUID.toUpperCase()] }), true)
  assert.equal(isHelperAdvertisement({ serviceUUIDs: [], localName: "OpenCodeInformer" }), true)
})

test("a clearly different peripheral is skipped", () => {
  assert.equal(isHelperAdvertisement({ serviceUUIDs: ["180f", "180a"], localName: null }), false)
  assert.equal(isHelperAdvertisement({ serviceUUIDs: [], localName: "AirPods" }), false)
})

test("an advertisement with no details is not guessed", () => {
  assert.equal(isHelperAdvertisement({ serviceUUIDs: null, localName: null }), false)
})
