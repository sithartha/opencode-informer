import test from "node:test"
import assert from "node:assert/strict"
import type { NetInfoState } from "@react-native-community/netinfo"
import { networkIdentity, shouldRediscover } from "../src/networkChange"

function wifi(ipAddress: string | null, overrides: Partial<NetInfoState> = {}): NetInfoState {
  return {
    type: "wifi",
    isConnected: true,
    isInternetReachable: true,
    details: { ipAddress, ssid: "home", bssid: null, strength: null, subnet: "255.255.255.0", isConnectionExpensive: false },
    ...overrides,
  } as unknown as NetInfoState
}

test("ignores an unknown connection", () => {
  assert.equal(networkIdentity(null), null)
  assert.equal(networkIdentity(wifi(null, { isConnected: null } as Partial<NetInfoState>)), null)
})

test("a local network without internet still has an identity", () => {
  assert.deepEqual(
    networkIdentity(wifi("192.168.1.4", { isInternetReachable: false } as Partial<NetInfoState>)),
    { connected: true, type: "wifi", ipAddress: "192.168.1.4", subnet: "255.255.255.0" },
  )
})

test("a disconnected network is a stable identity", () => {
  assert.deepEqual(networkIdentity(wifi("", { isConnected: false } as Partial<NetInfoState>)), {
    connected: false,
    type: "wifi",
    ipAddress: null,
    subnet: null,
  })
})

test("reads the IPv4 address from the details", () => {
  assert.deepEqual(networkIdentity(wifi("192.168.1.4")), {
    connected: true,
    type: "wifi",
    ipAddress: "192.168.1.4",
    subnet: "255.255.255.0",
  })
})

test("the first observation is not a change", () => {
  const current = networkIdentity(wifi("192.168.1.4"))
  assert.equal(shouldRediscover(null, current), false)
})

test("coming back online is a change", () => {
  const offline = networkIdentity(wifi("", { isConnected: false } as Partial<NetInfoState>))
  const online = networkIdentity(wifi("192.168.1.4"))
  assert.equal(shouldRediscover(offline, online), true)
})

test("a new Wi-Fi address is a change", () => {
  const before = networkIdentity(wifi("192.168.1.4"))
  const after = networkIdentity(wifi("10.0.0.23"))
  assert.equal(shouldRediscover(before, after), true)
})

test("a different network type is a change", () => {
  const before = networkIdentity(wifi("192.168.1.4"))
  const after = networkIdentity(wifi("192.168.1.4", { type: "ethernet" } as Partial<NetInfoState>))
  assert.equal(shouldRediscover(before, after), true)
})

test("an identical refresh is not a change", () => {
  const before = networkIdentity(wifi("192.168.1.4"))
  const after = networkIdentity(wifi("192.168.1.4"))
  assert.equal(shouldRediscover(before, after), false)
})

test("going offline is not a change to act on", () => {
  const before = networkIdentity(wifi("192.168.1.4"))
  const offline = networkIdentity(wifi("", { isConnected: false } as Partial<NetInfoState>))
  assert.equal(shouldRediscover(before, offline), false)
})
