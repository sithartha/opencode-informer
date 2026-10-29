import type { Cut, Mood, Seed } from "moodstone"
import type { Theme } from "./theme"

/** The avatar moods the app can ask for. */
export type AvatarMood = Mood

export interface AvatarIdentity {
  cut: Cut
  seed: Seed
}

const TAU = Math.PI * 2

/** FNV-1a over UTF-16 code units: small, stable and dependency-free. */
function hash(value: string): number {
  let result = 0x811c9dc5
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 0x01000193)
  }
  return result >>> 0
}

/**
 * The avatar's expression for a session. A tool in flight reads as thinking; a
 * running session without one as working; anything waiting on the user as observing.
 */
export function avatarMood(phase: string, currentTool?: string | null): AvatarMood {
  switch (phase) {
    case "running":
      return currentTool ? "thinking" : "working"
    case "waiting-permission":
    case "waiting-answer":
      return "observing"
    case "completed":
      return "done"
    case "ended":
      return "inactive"
    default:
      return "idle"
  }
}

/**
 * Every avatar is a circle. The face is still unique per session: the light seed and
 * the theme colour are derived from the session id, so sessions do not look alike
 * while sharing one silhouette.
 */
export function avatarIdentity(agent?: string | null, sessionId?: string | null): AvatarIdentity {
  const key = (sessionId && sessionId.trim()) || (agent && agent.trim()) || "agent"
  const seed: Seed = [
    (hash(`${key}:angle`) / 0xffffffff) * TAU,
    (hash(`${key}:drift`) / 0xffffffff) * TAU,
    (hash(`${key}:orbit`) / 0xffffffff) * TAU,
  ]
  return { cut: "circle", seed }
}

/** The face always takes the active theme's accent, so it belongs to the interface. */
export function avatarColor(theme: Theme): string {
  return theme.accent
}
