// Supervised subscription to the OpenCode event stream.
//
// The bridge must never silently stop receiving events. `ctx.event.subscribe`
// can end or throw out of band (the stream may be torn down without an error),
// which previously left the bridge — and therefore the phone — frozen on a stale
// snapshot. This keeps a single subscription alive: on end/error it logs, rings a
// reconnect hook, and resubscribes with capped exponential backoff until the
// provided `signal` aborts.

const defaultDelay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * @param {object} options
 * @param {(opts: {signal: AbortSignal}) => AsyncIterable} options.subscribe
 * @param {(event: any) => void} options.onEvent
 * @param {AbortSignal} options.signal
 * @param {(message: string) => void} [options.log]
 * @param {(attempt: number) => void} [options.onReconnect]
 * @param {(ms: number) => Promise<void>} [options.delay]
 * @param {number} [options.baseBackoffMs]
 * @param {number} [options.maxBackoffMs]
 */
export async function superviseEventStream({
  subscribe,
  onEvent,
  signal,
  log = () => {},
  onReconnect = () => {},
  delay = defaultDelay,
  baseBackoffMs = 1000,
  maxBackoffMs = 15000,
}) {
  let backoff = baseBackoffMs
  let attempt = 0

  while (!signal.aborted) {
    attempt += 1
    if (attempt > 1) {
      try {
        onReconnect(attempt)
      } catch {
        /* best effort */
      }
    }

    try {
      for await (const event of subscribe({ signal })) {
        backoff = baseBackoffMs
        try {
          onEvent(event)
        } catch (err) {
          log(`event handling failed: ${err && err.message}`)
        }
      }
      if (!signal.aborted) log("event stream ended")
    } catch (err) {
      if (signal.aborted) break
      log(`event loop error: ${err && err.message}`)
    }

    if (signal.aborted) break
    await delay(backoff)
    backoff = Math.min(backoff * 2, maxBackoffMs)
  }
}
