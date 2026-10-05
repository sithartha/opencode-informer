/** How long the lock-screen aggregate may go unrefreshed before it reads as stale. */
export const STALE_THRESHOLD_MS = 5 * 60 * 1000

/** True when the last successful refresh is older than the threshold. */
export function isStale(lastUpdatedAt: number, now: number, thresholdMs: number = STALE_THRESHOLD_MS): boolean {
  if (!lastUpdatedAt) return false
  return now - lastUpdatedAt > thresholdMs
}
