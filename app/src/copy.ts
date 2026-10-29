/** Plain-language vocabulary shared by the dashboard, cards, notifications, and Settings. */

export function connectionLabel(status: string, macName?: string | null): string {
  const name = macName ? ` · ${macName}` : ""
  switch (status) {
    case "connected":
      return `Connected${name}`
    case "connecting":
      return `Connecting${name}`
    case "discovering":
      return "Looking for your computer"
    case "disconnected":
      return "Offline"
    default:
      return `${status.charAt(0).toUpperCase()}${status.slice(1)}${name}`
  }
}

export function phaseLabel(phase: string): string {
  switch (phase) {
    case "running":
      return "Running"
    case "waiting-permission":
      return "Needs approval"
    case "waiting-answer":
      return "Waiting for an answer"
    case "completed":
      return "Done"
    case "ended":
      return "Ended"
    default:
      return phase
  }
}

export function agentCount(count: number): string {
  return `${count} ${count === 1 ? "agent" : "agents"}`
}

export const CTA = {
  demo: "Try the demo",
  start: "Start a session",
  connect: "Find nearby computer",
  reconnect: "Reconnect",
} as const

export function relativeTime(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 5) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return `${hours}h ago`
}
