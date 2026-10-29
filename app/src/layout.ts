/** Which presentation a session gets on the dashboard. */
export type SessionLayout = "compact" | "full"
export type SessionPresentation = "compact" | "full"

/**
 * A session is drawn as its full card when the dashboard is in the full layout, when
 * it needs the user, or when the user expanded that exact session. Everything else is
 * a compact grid card. Pending sessions cannot be collapsed.
 */
export function sessionPresentation(input: {
  layout: SessionLayout
  expandedSessionID: string | null
  sessionID: string
}): SessionPresentation {
  if (input.layout === "full") return "full"
  return input.expandedSessionID === input.sessionID ? "full" : "compact"
}

/** Expand `sessionID`, or collapse it when it is already the expanded one. */
export function toggleExpanded(current: string | null, sessionID: string): string | null {
  return current === sessionID ? null : sessionID
}
