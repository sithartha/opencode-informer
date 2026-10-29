import type { Snapshot } from "./events"
import { fetchState } from "./bridgeClient"
import type { TokenStore } from "./tokenStore"

export interface ReconnectResult {
  token: string | null
  snapshot: Snapshot | null
  /** True when the address rejected the stored token; the token is kept. */
  revoked?: boolean
}

/**
 * Try to reuse a stored token. A 401 means this address rejects the token; the
 * token is kept because the rejection may come from a different computer that now
 * holds an old address. Only the caller, after checking the address the helper
 * points at, may ask the user to pair again.
 */
export async function reconnectWithToken(
  base: string,
  store: TokenStore,
  loadState: (base: string, token: string) => Promise<Snapshot> = fetchState,
): Promise<ReconnectResult> {
  const token = await store.get()
  if (!token) return { token: null, snapshot: null, revoked: false }
  try {
    const snapshot = await loadState(base, token)
    return { token, snapshot }
  } catch (error) {
    if ((error as Error).message === "unauthorized") return { token, snapshot: null, revoked: true }
    throw error
  }
}
