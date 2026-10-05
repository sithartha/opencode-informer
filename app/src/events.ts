import type { Phase, StreamEventType } from "./contract"

export interface Session {
  id: string
  title?: string
  agent: string
  model?: string
  cwd: string
  phase: Phase
  currentTool: string | null
  lastActivity: string
  subagents?: number
  shells?: number
  updatedAt: number
}

export interface Snapshot {
  activeSessionCount: number
  sessions: Session[]
  pending?: PendingRequest[]
}

export interface PendingRequest {
  requestID: string
  sessionID: string
  kind: "permission" | "question"
  title: string
  summary?: string
  options?: string[]
  allowFreeform?: boolean
}

export interface ActivityEvent {
  type: StreamEventType
  data: Record<string, unknown>
}

export interface AppState {
  sessions: Record<string, Session>
  activeCount: number
  pending: Record<string, PendingRequest>
  recent: ActivityEvent[]
}

export function emptyState(): AppState {
  return { sessions: {}, activeCount: 0, pending: {}, recent: [] }
}

export function stateFromSnapshot(snapshot: Snapshot): AppState {
  const sessions: Record<string, Session> = {}
  for (const session of snapshot.sessions) sessions[session.id] = session
  const pending: Record<string, PendingRequest> = {}
  for (const request of snapshot.pending ?? []) pending[request.requestID] = request

  // A waiting phase with no pending request is not actionable (for example a
  // stale phase after the answer was given), so treat it as running. This keeps
  // the session card in step with the hero.
  const waiting = new Set(Object.values(pending).map((request) => request.sessionID))
  for (const session of Object.values(sessions)) {
    if ((session.phase === "waiting-permission" || session.phase === "waiting-answer") && !waiting.has(session.id)) {
      sessions[session.id] = { ...session, phase: "running" }
    }
  }

  return {
    sessions,
    activeCount: snapshot.activeSessionCount,
    pending,
    recent: [],
  }
}

function recount(sessions: Record<string, Session>): number {
  return Object.values(sessions).filter(
    (s) => s.phase === "running" || s.phase === "waiting-permission" || s.phase === "waiting-answer",
  ).length
}

const MAX_RECENT = 100

/** Apply one stream event to the UI state, returning a new state. */
export function applyEvent(state: AppState, event: ActivityEvent): AppState {
  const sessions = { ...state.sessions }
  const pending = { ...state.pending }
  const data = event.data as Record<string, any>
  const sessionID: string | undefined = data.sessionID

  switch (event.type) {
    case "session.started": {
      sessions[sessionID!] = {
        id: sessionID!,
        agent: data.agent ?? "opencode",
        cwd: data.cwd ?? "",
        phase: (data.phase as Phase) ?? "running",
        currentTool: null,
        lastActivity: "Session started",
        subagents: 0,
        shells: 0,
        updatedAt: Date.now(),
      }
      break
    }
    case "session.ended": {
      delete sessions[sessionID!]
      break
    }
    case "prompt.submitted": {
      if (sessions[sessionID!]) {
        sessions[sessionID!] = { ...sessions[sessionID!], phase: "running", lastActivity: String(data.text ?? ""), updatedAt: Date.now() }
      }
      break
    }
    case "tool.started": {
      if (sessions[sessionID!]) {
        const session = sessions[sessionID!]
        sessions[sessionID!] = { ...session, phase: "running", currentTool: String(data.tool ?? ""), lastActivity: String(data.tool ?? ""), shells: (session.shells ?? 0) + 1, updatedAt: Date.now() }
      }
      break
    }
    case "tool.ended": {
      if (sessions[sessionID!]) {
        const session = sessions[sessionID!]
        sessions[sessionID!] = { ...session, currentTool: null, shells: Math.max(0, (session.shells ?? 0) - 1), updatedAt: Date.now() }
      }
      break
    }
    case "permission.requested": {
      if (sessions[sessionID!]) sessions[sessionID!] = { ...sessions[sessionID!], phase: "waiting-permission", updatedAt: Date.now() }
      pending[String(data.requestID)] = {
        requestID: String(data.requestID),
        sessionID: sessionID!,
        kind: "permission",
        title: String(data.title ?? "Permission"),
        summary: data.summary != null ? String(data.summary) : undefined,
      }
      break
    }
    case "question.asked": {
      if (sessions[sessionID!]) sessions[sessionID!] = { ...sessions[sessionID!], phase: "waiting-answer", updatedAt: Date.now() }
      pending[String(data.requestID)] = {
        requestID: String(data.requestID),
        sessionID: sessionID!,
        kind: "question",
        title: String(data.title ?? "Question"),
        summary: data.summary != null ? String(data.summary) : undefined,
        options: Array.isArray(data.options) ? data.options.map(String) : [],
        allowFreeform: data.allowFreeform === true,
      }
      break
    }
    case "turn.completed": {
      if (sessions[sessionID!]) sessions[sessionID!] = { ...sessions[sessionID!], phase: "completed", currentTool: null, updatedAt: Date.now() }
      break
    }
    case "session.activity": {
      const session = sessions[sessionID!]
      if (session) {
        sessions[sessionID!] = { ...session, lastActivity: String(data.text ?? session.lastActivity), updatedAt: Date.now() }
      }
      break
    }
    case "session.updated": {
      const session = sessions[sessionID!]
      if (session) {
        sessions[sessionID!] = {
          ...session,
          title: data.title != null ? String(data.title) : session.title,
          agent: data.agent != null ? String(data.agent) : session.agent,
          model: data.model != null ? String(data.model) : session.model,
          phase: data.phase != null ? (String(data.phase) as Phase) : session.phase,
          updatedAt: Date.now(),
        }
      }
      break
    }
    case "actionable.resolved": {
      delete pending[String(data.requestID)]
      const session = sessions[sessionID!]
      if (session && (session.phase === "waiting-permission" || session.phase === "waiting-answer")) {
        sessions[sessionID!] = { ...session, phase: "running", updatedAt: Date.now() }
      }
      break
    }
  }

  const recent = [event, ...state.recent].slice(0, MAX_RECENT)
  return { sessions, activeCount: recount(sessions), pending, recent }
}

/** Incrementally parse an SSE byte stream into activity events. */
export function parseSSE(buffer: string, chunk: string): { events: ActivityEvent[]; rest: string } {
  const combined = buffer + chunk
  const events: ActivityEvent[] = []
  let rest = combined

  let index: number
  while ((index = rest.indexOf("\n\n")) !== -1) {
    const block = rest.slice(0, index)
    rest = rest.slice(index + 2)

    let type: string | undefined
    const dataLines: string[] = []
    for (const line of block.split("\n")) {
      if (line.startsWith("event: ")) type = line.slice("event: ".length)
      else if (line.startsWith("data: ")) dataLines.push(line.slice("data: ".length))
      else if (line === "data") dataLines.push("")
    }
    if (!type || dataLines.length === 0) continue
    try {
      const data = JSON.parse(dataLines.join("\n"))
      events.push({ type: type as StreamEventType, data })
    } catch {
      // ignore malformed frames
    }
  }

  return { events, rest }
}
