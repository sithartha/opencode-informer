import { readFileSync, statSync } from "node:fs"
import { homedir } from "node:os"

// The V2 plugin context does not expose a form (question) reply method, and
// ctx.permission.reply can intermittently miss. Both fall back to the local
// OpenCode service, whose URL and password live in the CLI's state directory.

function stateServicePath() {
  const stateHome = process.env.XDG_STATE_HOME || `${process.env.HOME || homedir()}/.local/state`
  return `${stateHome}/opencode/service.json`
}

let cached

export function readService() {
  try {
    const path = stateServicePath()
    const stat = statSync(path)
    if (cached && cached.mtimeMs === stat.mtimeMs) return cached
    const data = JSON.parse(readFileSync(path, "utf8"))
    cached = { url: data.url, password: data.password, mtimeMs: stat.mtimeMs }
    return cached
  } catch {
    return null
  }
}

function authHeader(service) {
  return "Basic " + Buffer.from(`opencode:${service.password}`).toString("base64")
}

/**
 * A form reply needs the option `value`s (the app sends the visible labels), and
 * an array for a multiselect field.
 */
export function buildFormAnswer(field, text) {
  const options = Array.isArray(field && field.options) ? field.options : []
  const valueFor = (token) => {
    const t = String(token).trim()
    const match = options.find(
      (o) => String(o.label).toLowerCase() === t.toLowerCase() || String(o.value).toLowerCase() === t.toLowerCase(),
    )
    if (!match) return t
    return match.value != null ? match.value : match.label != null ? match.label : t
  }
  if (field && field.type === "multiselect") {
    return String(text)
      .split(/\s*,\s*/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map(valueFor)
  }
  return valueFor(text)
}

export async function replyToForm(sessionID, formID, answer, { fetchImpl = fetch } = {}) {
  const service = readService()
  if (!service || !service.url || !service.password) throw new Error("service registration unavailable")
  const res = await fetchImpl(`${service.url}/api/session/${sessionID}/form/${formID}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader(service) },
    body: JSON.stringify({ answer }),
  })
  if (!res.ok) {
    let detail = ""
    try {
      detail = await res.text()
    } catch {
      /* ignore */
    }
    throw new Error(`form reply HTTP ${res.status} ${detail}`)
  }
}

export async function replyToPermission(sessionID, requestID, decision, message, { fetchImpl = fetch } = {}) {
  const service = readService()
  if (!service || !service.url || !service.password) throw new Error("service registration unavailable")
  const body = message ? { decision, message } : { decision }
  const res = await fetchImpl(`${service.url}/api/session/${sessionID}/permission/${requestID}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader(service) },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`permission reply HTTP ${res.status}`)
}
