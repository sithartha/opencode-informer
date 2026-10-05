import * as LiveActivity from "expo-live-activity"
import { LiveActivityController, type ActivityApi } from "./liveActivityController"

const api: ActivityApi = {
  startActivity: (state, config) => LiveActivity.startActivity(state, config) ?? undefined,
  updateActivity: (id, state) => {
    LiveActivity.updateActivity(id, state)
  },
  stopActivity: (id, state) => {
    LiveActivity.stopActivity(id, state)
  },
}

export const liveActivity = new LiveActivityController(api)
