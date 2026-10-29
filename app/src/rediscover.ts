/** Reconnect failures tolerated before the app re-reads the address over Bluetooth. */
export const REDISCOVER_AFTER_FAILURES = 3

export type CandidateOutcome = "keep-token" | "retry"

export type NetworkAction = "ignore" | "probe" | "rediscover"

/**
 * What to do after a failed reconnect attempt: the app scans for the new address
 * once the counter reaches the limit, then keeps scanning on later attempts until a
 * connection succeeds.
 */
export function recordReconnectFailure(failures: number): { failures: number; rediscover: boolean } {
  const next = failures + 1
  return { failures: next, rediscover: next >= REDISCOVER_AFTER_FAILURES }
}

/**
 * How to treat a failed probe of a freshly discovered address. A 401 means the
 * candidate is not the paired computer: keep the token instead of unpairing, and
 * keep recovering. Any other failure is a network problem worth retrying.
 */
export function candidateFailure(error: unknown): CandidateOutcome {
  const message = error instanceof Error ? error.message : String(error)
  return message === "unauthorized" ? "keep-token" : "retry"
}

/**
 * What a phone-side network change means for recovery: nothing while unpaired or
 * manually disconnected, a probe of the current address while connected, and an
 * immediate Bluetooth re-read while already recovering.
 */
export function networkChangeAction(input: {
  paired: boolean
  manuallyDisconnected: boolean
  status: string
}): NetworkAction {
  if (!input.paired || input.manuallyDisconnected) return "ignore"
  return input.status === "connected" ? "probe" : "rediscover"
}

/** Turn a low-level Bluetooth failure into something a phone user can act on. */
export function friendlyConnectError(message: string): string {
  if (message === "ble scan timeout") {
    return "No computer found nearby. Make sure the helper is running and Bluetooth is on."
  }
  return message
}
