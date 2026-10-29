import test from "node:test"
import assert from "node:assert/strict"
import { findBridge, intToIpv4, ipv4Candidates, ipv4ToInt } from "../src/lanScan"

test("IPv4 addresses round-trip", () => {
  assert.equal(ipv4ToInt("192.168.1.11"), 0xc0a8010b)
  assert.equal(intToIpv4(0xc0a8010b), "192.168.1.11")
  assert.equal(ipv4ToInt("999.1.1.1"), null)
  assert.equal(ipv4ToInt("no"), null)
})

test("a /24 scan covers the subnet and skips the phone", () => {
  const hosts = ipv4Candidates("192.168.1.11", "255.255.255.0")
  assert.equal(hosts.length, 253)
  assert.equal(hosts[0], "192.168.1.1")
  assert.equal(hosts[hosts.length - 1], "192.168.1.254")
  assert.equal(hosts.includes("192.168.1.11"), false)
})

test("a wider mask is narrowed to the /24 around the phone", () => {
  const hosts = ipv4Candidates("10.1.2.3", "255.255.0.0")
  assert.equal(hosts.length, 253)
  assert.equal(hosts[0], "10.1.2.1")
  assert.equal(hosts[hosts.length - 1], "10.1.2.254")
})

test("an invalid phone address yields no candidates", () => {
  assert.deepEqual(ipv4Candidates("", "255.255.255.0"), [])
})

test("the scan returns the host that accepts the token", async () => {
  const seen: string[] = []
  const fetchImpl = (async (url: string) => {
    seen.push(url)
    const host = new URL(url).hostname
    if (host === "192.168.1.42") return { status: 200 } as Response
    return { status: 401 } as Response
  }) as typeof fetch

  const result = await findBridge(["192.168.1.10", "192.168.1.42", "192.168.1.50"], "token", fetchImpl, {
    timeoutMs: 100,
    concurrency: 2,
  })
  assert.deepEqual(result, { base: "http://192.168.1.42:38963", authorized: true })
  assert.ok(seen.some((url) => url.includes("192.168.1.42")))
})

test("the scan ignores unreachable hosts", async () => {
  const fetchImpl = (async () => {
    throw new Error("timeout")
  }) as unknown as typeof fetch
  assert.equal(await findBridge(["192.168.1.10"], "token", fetchImpl, { timeoutMs: 20 }), null)
})

test("a host that rejects the token is returned as a pairing target", async () => {
  const fetchImpl = (async () => ({ status: 401 }) as Response) as typeof fetch
  assert.deepEqual(await findBridge(["192.168.1.42"], "stale", fetchImpl, { timeoutMs: 20 }), {
    base: "http://192.168.1.42:38963",
    authorized: false,
  })
})
