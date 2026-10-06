import type { ActivityEvent } from "./events"

export type NotificationCategory = "PERMISSION_REQUEST" | "QUESTION" | "SESSION_COMPLETED"

export interface NotificationAction {
  identifier: string
  title: string
}

export interface NotificationPlan {
  category: NotificationCategory
  title: string
  body: string
  actions: NotificationAction[]
  requestID?: string
}

export const ALLOW_ACTION = "ALLOW"
export const DENY_ACTION = "DENY"
export const OPTION_PREFIX = "OPTION:"
const MAX_OPTION_ACTIONS = 4

/** Map a stream event to a local notification plan, or null if it is not notifiable. */
export function notificationFor(event: ActivityEvent): NotificationPlan | null {
  const data = event.data as Record<string, any>
  switch (event.type) {
    case "permission.requested":
      return {
        category: "PERMISSION_REQUEST",
        title: `Approve in ${data.agent ?? "OpenCode"}`,
        body: `${data.title ?? "Permission"}${data.summary ? `: ${data.summary}` : ""}`,
        actions: [
          { identifier: ALLOW_ACTION, title: "Allow" },
          { identifier: DENY_ACTION, title: "Deny" },
        ],
        requestID: String(data.requestID),
      }
    case "question.asked": {
      const questions = Array.isArray(data.questions) ? data.questions : []
      if (questions.length > 1) {
        // A multi-question form cannot be answered with one action; open the app.
        return {
          category: "QUESTION",
          title: "OpenCode has questions",
          body: "Open the app to answer all questions",
          actions: [],
          requestID: String(data.requestID),
        }
      }
      const options = Array.isArray(data.options) ? data.options.slice(0, MAX_OPTION_ACTIONS).map(String) : []
      return {
        category: "QUESTION",
        title: String(data.title ?? "Question"),
        body: options.join(" / "),
        actions: options.map((option: string) => ({ identifier: `${OPTION_PREFIX}${option}`, title: option })),
        requestID: String(data.requestID),
      }
    }
    case "turn.completed":
      return {
        category: "SESSION_COMPLETED",
        title: "Task completed",
        body: String(data.summary ?? ""),
        actions: [],
      }
    default:
      return null
  }
}

/** Turn a notification action identifier into a bridge resolution action. */
export function actionToResolution(actionIdentifier: string): string | null {
  if (actionIdentifier === ALLOW_ACTION) return "allow"
  if (actionIdentifier === DENY_ACTION) return "deny"
  if (actionIdentifier.startsWith(OPTION_PREFIX)) return actionIdentifier.slice(OPTION_PREFIX.length)
  return null
}

/**
 * Map a BLE doorbell payload to a notification plan. Used when the app is woken
 * in the background, where the SSE stream is not alive.
 */
export function notificationForDoorbell(payload: Record<string, unknown> | null): NotificationPlan | null {
  if (!payload) return null
  const kind = String(payload.kind ?? "")
  const requestID = payload.requestID != null ? String(payload.requestID) : undefined
  const text = String(payload.title ?? "")
  switch (kind) {
    case "permission":
      return {
        category: "PERMISSION_REQUEST",
        title: "OpenCode needs approval",
        body: text,
        actions: [
          { identifier: ALLOW_ACTION, title: "Allow" },
          { identifier: DENY_ACTION, title: "Deny" },
        ],
        requestID,
      }
    case "question":
      return {
        category: "QUESTION",
        title: "OpenCode has a question",
        body: text || "Open the app to answer",
        actions: [],
        requestID,
      }
    case "completion":
      return { category: "SESSION_COMPLETED", title: "Task completed", body: text, actions: [] }
    default:
      return null
  }
}

/** Events that need the user's attention (permission or question). */
export function isAttentionEvent(type: string): boolean {
  return type === "permission.requested" || type === "question.asked"
}
