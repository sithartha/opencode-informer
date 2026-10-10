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
  /** The last few activity messages (most recent last), capped at three. */
  activityHistory?: string[]
  cost?: number
  subagents?: number
  shells?: number
  updatedAt: number
}

export interface Snapshot {
  activeSessionCount: number
  sessions: Session[]
  pending?: PendingRequest[]
}

/** A single answer option, as carried on the wire (objects) or tolerated as a string. */
export interface QuestionOption {
  label: string
  value?: string
  description?: string
}

export interface Question {
  key: string
  title: string
  summary?: string
  options: QuestionOption[]
  allowFreeform: boolean
}

export interface PendingRequest {
  requestID: string
  sessionID: string
  kind: "permission" | "question"
  title: string
  summary?: string
  options?: QuestionOption[]
  allowFreeform?: boolean
  /** Every question of a form; a single question for a one-question form. */
  questions?: Question[]
}

/** The value sent back when an option is chosen (falls back to its label). */
export function optionValue(option: QuestionOption): string {
  return option.value ?? option.label
}

/** Normalize a question's options, accepting the wire objects or plain strings. */
export function parseOptions(raw: unknown): QuestionOption[] {
  if (!Array.isArray(raw)) return []
  const options: QuestionOption[] = []
  for (const entry of raw) {
    if (entry == null) continue
    if (typeof entry === "string") {
      if (entry) options.push({ label: entry })
      continue
    }
    const option = entry as Record<string, unknown>
    const label = option.label != null ? String(option.label) : option.value != null ? String(option.value) : ""
    if (!label) continue
    const parsed: QuestionOption = { label }
    if (option.value != null) parsed.value = String(option.value)
    if (option.description != null) parsed.description = String(option.description)
    options.push(parsed)
  }
  return options
}

/** Parse the `questions` of a question.asked event, synthesizing one from the flat fields. */
export function parseQuestions(data: Record<string, unknown>): Question[] {
  const raw = Array.isArray(data.questions) ? data.questions : []
  if (raw.length > 0) {
    return raw.map((entry, index) => {
      const question = (entry ?? {}) as Record<string, unknown>
      const options = parseOptions(question.options)
      return {
        key: question.key != null ? String(question.key) : `q${index}`,
        title: String(question.title ?? question.summary ?? `Question ${index + 1}`),
        summary: question.summary != null ? String(question.summary) : undefined,
        options,
        allowFreeform: question.allowFreeform === true || options.length === 0,
      }
    })
  }
  const options = parseOptions(data.options)
  return [
    {
      key: "q0",
      title: String(data.title ?? "Question"),
      summary: data.summary != null ? String(data.summary) : undefined,
      options,
      allowFreeform: data.allowFreeform === true || options.length === 0,
    },
  ]
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

/** Normalize a pending request's question options to the object shape. */
function normalizePending(request: PendingRequest): PendingRequest {
  if (request.kind !== "question") return request
  const questions =
    request.questions && request.questions.length > 0
      ? request.questions.map((question) => ({ ...question, options: parseOptions(question.options) }))
      : parseQuestions(request as unknown as Record<string, unknown>)
  const first = questions[0]
  const flat = parseOptions(request.options)
  const options = flat.length > 0 ? flat : first?.options ?? []
  return {
    ...request,
    options,
    allowFreeform: request.allowFreeform ?? first?.allowFreeform ?? options.length === 0,
    questions,
  }
}

export function stateFromSnapshot(snapshot: Snapshot): AppState {
  const sessions: Record<string, Session> = {}
  for (const session of snapshot.sessions) {
    sessions[session.id] = {
      ...session,
      activityHistory: session.activityHistory ?? (session.lastActivity ? splitActivity(session.lastActivity) : []),
    }
  }
  const pending: Record<string, PendingRequest> = {}
  for (const request of snapshot.pending ?? []) pending[request.requestID] = normalizePending(request)

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

const MAX_ACTIVITY_HISTORY = 3

/** Split an accumulated activity string into its individual messages. */
function splitActivity(text: string): string[] {
  return text
    .split("\n\n")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(-MAX_ACTIVITY_HISTORY)
}

/**
 * Keep the last few activity messages. The bridge may send only the newest
 * message or the combined text; both are handled.
 */
function nextHistory(session: Session, incoming: string): string[] {
  const current = session.activityHistory ?? (session.lastActivity ? splitActivity(session.lastActivity) : [])
  if (!incoming) return current
  const existing = session.lastActivity
  if (existing && incoming.includes(existing)) return splitActivity(incoming).slice(-MAX_ACTIVITY_HISTORY)
  return [...current, incoming].slice(-MAX_ACTIVITY_HISTORY)
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
        activityHistory: [],
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
      const questions = parseQuestions(data)
      const first = questions[0]
      pending[String(data.requestID)] = {
        requestID: String(data.requestID),
        sessionID: sessionID!,
        kind: "question",
        title: first.title,
        summary: first.summary,
        options: first.options,
        allowFreeform: first.allowFreeform,
        questions,
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
        const incoming = String(data.text ?? "")
        const history = nextHistory(session, incoming)
        const latest = history[history.length - 1] ?? session.lastActivity
        sessions[sessionID!] = { ...session, lastActivity: latest, activityHistory: history, updatedAt: Date.now() }
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
          cwd: data.cwd != null ? String(data.cwd) : session.cwd,
          phase: data.phase != null ? (String(data.phase) as Phase) : session.phase,
          updatedAt: Date.now(),
        }
      }
      break
    }
    case "session.cost": {
      const session = sessions[sessionID!]
      if (session && typeof data.cost === "number") {
        sessions[sessionID!] = { ...session, cost: data.cost, updatedAt: Date.now() }
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

/**
 * Order session cards by what the user needs first: sessions with a pending request,
 * then running sessions, then the rest. Within the attention tier the most recently
 * arrived request comes first (higher rank); the relative order is otherwise kept.
 */
export function orderSessions(sessions: Session[], pendingRank: Map<string, number>): Session[] {
  const tier = (session: Session): number =>
    (pendingRank.get(session.id) ?? -1) >= 0 ? 0 : session.phase === "running" ? 1 : 2
  return [...sessions].sort((a, b) => {
    const tierA = tier(a)
    const tierB = tier(b)
    if (tierA !== tierB) return tierA - tierB
    if (tierA === 0) return (pendingRank.get(b.id) ?? -1) - (pendingRank.get(a.id) ?? -1)
    return 0
  })
}
