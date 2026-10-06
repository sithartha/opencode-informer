import { CONTRACT } from "./contract"
import type { Snapshot } from "./events"

export type FetchLike = typeof fetch

export function baseUrl(host: string, port: number): string {
  return `http://${host}:${port}`
}

export function pairUrl(base: string): string {
  return `${base}${CONTRACT.endpoints.pair}`
}

export function stateUrl(base: string): string {
  return `${base}${CONTRACT.endpoints.state}`
}

export function resolutionUrl(base: string): string {
  return `${base}${CONTRACT.endpoints.resolution}`
}

export function promptUrl(base: string): string {
  return `${base}${CONTRACT.endpoints.prompt}`
}

export function sessionsUrl(base: string): string {
  return `${base}${CONTRACT.endpoints.sessions}`
}

export function stopUrl(base: string): string {
  return `${base}${CONTRACT.endpoints.stop}`
}

export function closeUrl(base: string): string {
  return `${base}${CONTRACT.endpoints.close}`
}

export function optionsUrl(base: string): string {
  return `${base}${CONTRACT.endpoints.options}`
}

export function switchUrl(base: string): string {
  return `${base}${CONTRACT.endpoints.switch}`
}

export type ModelRef = { providerID: string; id: string; variant?: string; name?: string }
export type SessionOptions = { agents: string[]; models: ModelRef[] }

export function eventsUrl(base: string): string {
  return `${base}${CONTRACT.endpoints.events}`
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
}

export type PairResult =
  | { status: "pending"; approvalID: string }
  | { status: "approved"; token: string }
  | { status: "denied" }

export async function beginPairing(base: string, deviceName: string, fetchImpl: FetchLike = fetch): Promise<PairResult> {
  const res = await fetchImpl(pairUrl(base), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceName }),
  })
  if (res.status === 403) return { status: "denied" }
  const body = (await res.json()) as { status?: string; approvalID?: string; token?: string }
  if (body.token) return { status: "approved", token: body.token }
  return { status: "pending", approvalID: String(body.approvalID) }
}

export async function pollPairing(base: string, approvalID: string, fetchImpl: FetchLike = fetch): Promise<PairResult> {
  const res = await fetchImpl(`${pairUrl(base)}?approvalID=${encodeURIComponent(approvalID)}`)
  if (res.status === 403) return { status: "denied" }
  const body = (await res.json()) as { status?: string; token?: string }
  if (body.status === "approved" && body.token) return { status: "approved", token: body.token }
  if (body.status === "denied") return { status: "denied" }
  return { status: "pending", approvalID }
}

export async function fetchState(
  base: string,
  token: string,
  fetchImpl: FetchLike = fetch,
  timeoutMs = 8000,
): Promise<Snapshot> {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null
  try {
    const res = await fetchImpl(stateUrl(base), {
      headers: authHeaders(token),
      ...(controller ? { signal: controller.signal } : {}),
    })
    if (res.status === 401) throw new Error("unauthorized")
    if (!res.ok) throw new Error(`state ${res.status}`)
    return (await res.json()) as Snapshot
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function postResolution(
  base: string,
  token: string,
  requestID: string,
  action: string,
  fetchImpl: FetchLike = fetch,
): Promise<boolean> {
  const res = await fetchImpl(resolutionUrl(base), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ requestID, action }),
  })
  if (res.status === 401) throw new Error("unauthorized")
  return res.ok
}

export async function postPrompt(
  base: string,
  token: string,
  sessionID: string,
  text: string,
  fetchImpl: FetchLike = fetch,
): Promise<boolean> {
  const res = await fetchImpl(promptUrl(base), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ sessionID, text }),
  })
  if (res.status === 401) throw new Error("unauthorized")
  return res.ok
}

export async function postStart(
  base: string,
  token: string,
  title?: string,
  fetchImpl: FetchLike = fetch,
): Promise<string | null> {
  const res = await fetchImpl(sessionsUrl(base), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(title ? { title } : {}),
  })
  if (res.status === 401) throw new Error("unauthorized")
  if (!res.ok) return null
  const body = (await res.json()) as { sessionID?: string }
  return body.sessionID ?? ""
}

async function postSessionAction(
  base: string,
  token: string,
  url: string,
  sessionID: string,
  fetchImpl: FetchLike,
): Promise<boolean> {
  const res = await fetchImpl(url, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ sessionID }),
  })
  if (res.status === 401) throw new Error("unauthorized")
  return res.ok
}

export function postStop(base: string, token: string, sessionID: string, fetchImpl: FetchLike = fetch): Promise<boolean> {
  return postSessionAction(base, token, stopUrl(base), sessionID, fetchImpl)
}

export function postClose(base: string, token: string, sessionID: string, fetchImpl: FetchLike = fetch): Promise<boolean> {
  return postSessionAction(base, token, closeUrl(base), sessionID, fetchImpl)
}

export async function fetchOptions(base: string, token: string, fetchImpl: FetchLike = fetch): Promise<SessionOptions> {
  const res = await fetchImpl(optionsUrl(base), { headers: authHeaders(token) })
  if (res.status === 401) throw new Error("unauthorized")
  if (!res.ok) return { agents: [], models: [] }
  const body = (await res.json()) as { agents?: string[]; models?: ModelRef[] }
  return { agents: body.agents ?? [], models: body.models ?? [] }
}

export async function postSwitch(
  base: string,
  token: string,
  sessionID: string,
  target: { agent?: string; model?: ModelRef },
  fetchImpl: FetchLike = fetch,
): Promise<boolean> {
  const res = await fetchImpl(switchUrl(base), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ sessionID, ...target }),
  })
  if (res.status === 401) throw new Error("unauthorized")
  return res.ok
}
