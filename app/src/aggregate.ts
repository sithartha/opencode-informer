import type { PendingRequest, AppState } from "./events"

export interface Aggregate {
  total: number
  running: number
  waitingApproval: number
  waitingAnswer: number
  stopped: number
}

/**
 * Summarize the dashboard into the hero/lock-screen breakdown.
 *
 * Pending requests are the actionable truth: a session counts as waiting only
 * while it actually has something to answer, so the hero stays in step with the
 * cards even if a stale session phase arrives from the bridge.
 */
export function aggregate(state: AppState): Aggregate {
  let running = 0
  let waitingApproval = 0
  let waitingAnswer = 0
  let stopped = 0

  const waitingBySession = new Map<string, PendingRequest>()
  for (const request of Object.values(state.pending)) {
    const existing = waitingBySession.get(request.sessionID)
    if (!existing || request.kind === "permission") waitingBySession.set(request.sessionID, request)
  }

  const seen = new Set<string>()
  for (const session of Object.values(state.sessions)) {
    seen.add(session.id)

    const request = waitingBySession.get(session.id)
    if (request) {
      if (request.kind === "permission") waitingApproval += 1
      else waitingAnswer += 1
      continue
    }

    if (session.phase === "completed" || session.phase === "ended") {
      stopped += 1
      continue
    }

    // running, or a waiting phase with nothing left to answer: still working.
    running += 1
  }

  // Pending requests whose session is unknown (orphans) still count.
  for (const [sessionID, request] of waitingBySession) {
    if (seen.has(sessionID)) continue
    if (request.kind === "permission") waitingApproval += 1
    else waitingAnswer += 1
  }

  return { total: running + waitingApproval + waitingAnswer, running, waitingApproval, waitingAnswer, stopped }
}

export function isActive(phase: string): boolean {
  return phase === "running" || phase === "waiting-permission" || phase === "waiting-answer"
}
