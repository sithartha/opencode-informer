import type { Snapshot } from "./events"
import { fetchState } from "./bridgeClient"
import type { TokenStore } from "./tokenStore"

export interface ReconnectResult {
  token: string | null
  snapshot: Snapshot | null
}

/**
 * Try to reuse a stored token. A 401 means the token was revoked, so it is cleared
 * and re-pairing is required; any other failure is surfaced.
 */
export async function reconnectWithToken(
  base: string,
  store: TokenStore,
  loadState: (base: string, token: string) => Promise<Snapshot> = fetchState,
): Promise<ReconnectResult> {
  const token = await store.get()
  if (!token) return { token: null, snapshot: null }
  try {
    const snapshot = await loadState(base, token)
    return { token, snapshot }
  } catch (error) {
    if ((error as Error).message === "unauthorized") {
      await store.clear()
      return { token: null, snapshot: null }
    }
    throw error
  }
}
