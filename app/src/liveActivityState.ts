import type { LiveActivityConfig, LiveActivityState } from "expo-live-activity"
import type { Aggregate } from "./aggregate"
import type { Theme } from "./theme"

/** Black/white branding to match the "OI" app icon and Mac helper. */
export const LIVE_ACTIVITY_CONFIG: LiveActivityConfig = {
  backgroundColor: "#000000",
  titleColor: "#FFFFFF",
  subtitleColor: "#DDDDDD",
  progressViewTint: "#FFFFFF",
  // Keep the mark a fixed size and fully visible; the default "cover" scales a
  // square image to the row width and clips it after the layout changes on update.
  contentFit: "contain",
  imageAlign: "center",
  imageSize: { width: 68, height: 68 },
}

/**
 * The activity's palette follows the active theme: the surface as the background,
 * the theme text for the count, and the theme accent (carried by `progressViewTint`)
 * for the accent line and the status caption. Falls back to the black/white
 * branding when no theme is known. Colors are fixed when an activity starts.
 */
export function activityConfig(theme: Theme | null): LiveActivityConfig {
  if (!theme) return LIVE_ACTIVITY_CONFIG
  return {
    backgroundColor: theme.surface,
    titleColor: theme.text,
    subtitleColor: theme.textSecondary,
    progressViewTint: theme.accent,
    contentFit: "contain",
    imageAlign: "center",
    imageSize: { width: 68, height: 68 },
  }
}

/**
 * Asset name of the theme's mark, bundled into the Live Activity widget from
 * `assets/liveActivity/` by the expo-live-activity plugin (Default keeps "oi").
 */
export function activityMark(theme: Theme | null): string {
  switch (theme?.skin) {
    case "evangelion":
      return theme.variant === "unit00" ? "mark-eva00" : theme.variant === "unit02" ? "mark-eva02" : "mark-eva01"
    case "sanrio":
      return theme.variant === "chococat" ? "mark-chococat" : "mark-kitty"
    case "starwars":
      return theme.variant === "jedi" ? "mark-rebel" : "mark-empire"
    default:
      return "oi"
  }
}

/** The theme's hero header, shown as a small dot-less caption in the activity. */
export function activityLabel(theme: Theme | null): string {
  switch (theme?.skin) {
    case "evangelion":
      return "MAGI SYSTEM"
    case "sanrio":
      return theme.dark ? "CHOCOCAT" : "HELLO KITTY"
    case "starwars":
      return theme.dark ? "SITH ORDER" : "JEDI ORDER"
    default:
      return ""
  }
}

/** The hero's status word, mirroring the dashboard hero per skin. */
export function activityStatus(theme: Theme | null, agg: Aggregate): string {
  const attention = agg.waitingApproval + agg.waitingAnswer > 0
  const idle = agg.total === 0
  switch (theme?.skin) {
    case "evangelion":
      return attention ? "ATTENTION" : idle ? "STANDBY" : "NOMINAL"
    case "sanrio":
      return attention ? "NEEDS YOU" : idle ? "QUIET" : "ALL GOOD"
    case "starwars":
      return attention ? "◆ ALERT" : idle ? "◇ IDLE" : "◆ READY"
    default:
      return attention ? "NEEDS YOU" : idle ? "IDLE" : "ALL CLEAR"
  }
}

export function activityTitle(agg: Aggregate): string {
  // Count every session (active + inactive), not just the active ones.
  const count = agg.total + agg.stopped
  return `${count} ${count === 1 ? "agent" : "agents"}`
}

/**
 * Map the aggregate to the Live Activity's title/subtitle. Waiting states are
 * prefixed with a warning mark so they read as distinct from working. A leading
 * "#" line carries the theme's hero label and status word as a caption (the widget
 * renders it without a dot, in the theme accent).
 */
export function activityState(agg: Aggregate, theme: Theme | null, stale = false, disconnected = false): LiveActivityState {
  const imageName = activityMark(theme)
  const label = activityLabel(theme)

  // No reachable Mac: say so plainly instead of showing stale counts.
  if (disconnected) {
    return {
      title: "No connection",
      subtitle: "Can't reach OpenCode on your Mac",
      imageName,
      dynamicIslandImageName: imageName,
    }
  }

  // Plain text: the widget draws the small colored dots itself and parses these
  // lines ("<count> <label>"), keeping the payload human-readable as a fallback.
  const status = activityStatus(theme, agg)
  const header = label ? `${label} · ${status}` : status
  const lines: string[] = [`# ${header}`]
  if (agg.waitingApproval) lines.push(`${agg.waitingApproval} permission`)
  if (agg.waitingAnswer) lines.push(`${agg.waitingAnswer} question`)
  if (agg.running) lines.push(`${agg.running} working`)
  if (agg.stopped) lines.push(`${agg.stopped} inactive`)

  let subtitle = lines.join("\n") || "idle"
  if (stale) subtitle = `${subtitle}\nstale`

  return {
    title: activityTitle(agg),
    subtitle,
    imageName,
    dynamicIslandImageName: imageName,
  }
}
