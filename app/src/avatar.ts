import type { Cut, Mood, Seed } from "moodstone"
import type { SkinId, Theme } from "./theme"

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
 * Every avatar wears its skin's shape: the hexagonal Nerv console, the square
 * corners of Tunes and Terminal, the mild squircle of The Force and Classic OS,
 * and the full circle of Cat, Default and Wizard.
 */
const SKIN_CUT: Record<SkinId, Cut> = {
  default: "circle",
  evangelion: "hexagon",
  sanrio: "circle",
  starwars: "squircle",
  tunes: "square",
  "classic-os": "squircle",
  wizard: "circle",
  terminal: "square",
}

export function avatarCut(theme: Theme): Cut {
  return SKIN_CUT[theme.skin] ?? "circle"
}

/**
 * The avatar's face is unique per session: the light seed and the theme colour are
 * derived from the session id, so sessions do not look alike while sharing one silhouette.
 */
export function avatarIdentity(agent?: string | null, sessionId?: string | null, cut: Cut = "circle"): AvatarIdentity {
  const key = (sessionId && sessionId.trim()) || (agent && agent.trim()) || "agent"
  const seed: Seed = [
    (hash(`${key}:angle`) / 0xffffffff) * TAU,
    (hash(`${key}:drift`) / 0xffffffff) * TAU,
    (hash(`${key}:orbit`) / 0xffffffff) * TAU,
  ]
  return { cut, seed }
}

/** The face takes the session's mode colour: working green, permission amber, question blue, settled neutral. */
export function avatarColor(theme: Theme, phase?: string | null): string {
  switch (phase) {
    case "running":
      return theme.allow
    case "waiting-permission":
      return theme.permissionBorder[0]
    case "waiting-answer":
      return theme.questionBorder[0]
    case "completed":
    case "ended":
      return theme.textMuted
    default:
      return theme.accent
  }
}
