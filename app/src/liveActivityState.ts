import type { LiveActivityConfig, LiveActivityState } from "expo-live-activity"
import type { Aggregate } from "./aggregate"

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

export function activityTitle(agg: Aggregate): string {
  return `${agg.total} ${agg.total === 1 ? "agent" : "agents"}`
}

/**
 * Map the aggregate to the Live Activity's title/subtitle. Waiting states are
 * prefixed with a warning mark so they read as distinct from working.
 */
export function activityState(agg: Aggregate, stale = false, disconnected = false): LiveActivityState {
  // No reachable Mac: say so plainly instead of showing stale counts.
  if (disconnected) {
    return {
      title: "No connection",
      subtitle: "Can't reach OpenCode on your Mac",
      imageName: "oi",
      dynamicIslandImageName: "oi",
    }
  }

  // Plain text: the widget draws the small colored dots itself and parses these
  // lines ("<count> <label>"), keeping the payload human-readable as a fallback.
  const lines: string[] = []
  if (agg.waitingApproval) lines.push(`${agg.waitingApproval} permission`)
  if (agg.waitingAnswer) lines.push(`${agg.waitingAnswer} question`)
  if (agg.running) lines.push(`${agg.running} working`)
  if (agg.stopped) lines.push(`${agg.stopped} inactive`)

  let subtitle = lines.join("\n") || "idle"
  if (stale) subtitle = `${subtitle}\nstale`

  return {
    title: activityTitle(agg),
    subtitle,
    imageName: "oi",
    dynamicIslandImageName: "oi",
  }
}
