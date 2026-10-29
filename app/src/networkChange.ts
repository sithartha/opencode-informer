import type { NetInfoState } from "@react-native-community/netinfo"

/** A normalized "which network are we on" identity, stable across NetInfo noise. */
export interface NetworkIdentity {
  connected: boolean
  type: string | null
  ipAddress: string | null
  subnet: string | null
}

interface NetDetails {
  ipAddress?: string | null
  subnet?: string | null
}

function ipAddressOf(state: NetInfoState): string | null {
  return (state.details as NetDetails | null | undefined)?.ipAddress ?? null
}

function subnetOf(state: NetInfoState): string | null {
  return (state.details as NetDetails | null | undefined)?.subnet ?? null
}

/**
 * Reduce a NetInfo state to the identity that matters for re-discovery. Returns null
 * only while the answer is unknown, so the intermediate states iOS reports during a
 * Wi-Fi switch do not count as changes. Internet reachability is deliberately ignored:
 * the bridge only needs the local network, which may have no internet at all.
 */
export function networkIdentity(state: NetInfoState | null | undefined): NetworkIdentity | null {
  if (!state) return null
  if (state.isConnected === null || state.isConnected === undefined) return null
  if (!state.isConnected) return { connected: false, type: state.type ?? null, ipAddress: null, subnet: null }
  return { connected: true, type: state.type ?? null, ipAddress: ipAddressOf(state), subnet: subnetOf(state) }
}

/**
 * True when the app should re-read the computer's address over Bluetooth: the phone
 * came back online, or its network type or IPv4 address changed while connected.
 * The first observation is not a change.
 */
export function shouldRediscover(previous: NetworkIdentity | null, next: NetworkIdentity | null): boolean {
  if (!next || !next.connected) return false
  if (!previous) return false
  if (!previous.connected) return true
  if (previous.type !== next.type) return true
  if (previous.ipAddress && next.ipAddress && previous.ipAddress !== next.ipAddress) return true
  return false
}
