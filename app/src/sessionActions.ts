import {
  fetchOptions,
  postClose,
  postStart,
  postStop,
  postSwitch,
  type FetchLike,
  type ModelRef,
  type SessionOptions,
} from "./bridgeClient"

/**
 * Session lifecycle actions: call the bridge, then run `sync` so the dashboard
 * reflects the authoritative state. Kept pure-ish (no React) so they are unit
 * testable with an injected fetch and a sync spy.
 */

export async function startSession(
  base: string,
  token: string,
  sync: () => unknown,
  title?: string,
  fetchImpl?: FetchLike,
  selection?: { agent?: string; model?: ModelRef },
): Promise<boolean> {
  const id = await postStart(base, token, title, fetchImpl, selection)
  if (id === null) return false
  await sync()
  return true
}

export async function stopSession(
  base: string,
  token: string,
  sync: () => unknown,
  sessionID: string,
  fetchImpl?: FetchLike,
): Promise<boolean> {
  const ok = await postStop(base, token, sessionID, fetchImpl)
  if (ok) await sync()
  return ok
}

export async function closeSession(
  base: string,
  token: string,
  sync: () => unknown,
  sessionID: string,
  fetchImpl?: FetchLike,
): Promise<boolean> {
  const ok = await postClose(base, token, sessionID, fetchImpl)
  if (ok) await sync()
  return ok
}

export async function switchSession(
  base: string,
  token: string,
  sync: () => unknown,
  sessionID: string,
  target: { agent?: string; model?: ModelRef },
  fetchImpl?: FetchLike,
): Promise<boolean> {
  const ok = await postSwitch(base, token, sessionID, target, fetchImpl)
  if (ok) await sync()
  return ok
}

export function loadOptions(base: string, token: string, fetchImpl?: FetchLike): Promise<SessionOptions> {
  return fetchOptions(base, token, fetchImpl)
}
