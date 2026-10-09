import * as LiveActivity from "expo-live-activity"
import { LiveActivityController, type ActivityApi } from "./liveActivityController"
import { readSecure, writeSecure } from "./secureTokenStore"

// Remember our activity so a leftover one from a previous run can be ended on the
// next launch. iOS caps concurrent activities per app; a stale one makes
// startActivity throw "Maximum number of activities for target already exists".
const ACTIVITY_ID_KEY = "openisland.liveActivityId"

const api: ActivityApi = {
  startActivity: (state, config) => {
    try {
      const id = LiveActivity.startActivity(state, config)
      if (id) void writeSecure(ACTIVITY_ID_KEY, id)
      return id ?? undefined
    } catch {
      // At the per-app limit or unavailable; keep the app alive and retry later.
      return undefined
    }
  },
  updateActivity: (id, state) => {
    try {
      LiveActivity.updateActivity(id, state)
    } catch {
      // best-effort
    }
  },
  stopActivity: (id, state) => {
    try {
      LiveActivity.stopActivity(id, state)
    } catch {
      // best-effort
    }
    void writeSecure(ACTIVITY_ID_KEY, "")
  },
}

export const liveActivity = new LiveActivityController(api)

/** End a Live Activity left over from a previous run, freeing the app's slot. */
export async function endStaleLiveActivity(): Promise<void> {
  const id = await readSecure(ACTIVITY_ID_KEY)
  if (!id) return
  try {
    LiveActivity.stopActivity(id, { title: "" })
  } catch {
    // already ended or unavailable
  }
  await writeSecure(ACTIVITY_ID_KEY, "")
}
