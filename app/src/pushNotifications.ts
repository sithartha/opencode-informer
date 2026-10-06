import * as Notifications from "expo-notifications"
import { AppState } from "react-native"
import { ALLOW_ACTION, DENY_ACTION, OPTION_PREFIX, type NotificationPlan } from "./notifications"

// While the app is foregrounded the in-app dashboard already shows what needs an
// answer, so suppress banners. Background/Bluetooth wakes still notify.
Notifications.setNotificationHandler({
  handleNotification: async () => {
    const active = AppState.currentState === "active"
    return {
      shouldShowAlert: !active,
      shouldShowBanner: !active,
      shouldShowList: !active,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }
  },
})

/** Register actionable categories (no prompt) and request permission without blocking. */
export async function configureNotifications(): Promise<boolean> {
  await Notifications.setNotificationCategoryAsync("PERMISSION_REQUEST", [
    { identifier: ALLOW_ACTION, buttonTitle: "Allow" },
    { identifier: DENY_ACTION, buttonTitle: "Deny", options: { isDestructive: true } },
  ])

  await Notifications.setNotificationCategoryAsync("SESSION_COMPLETED", [])

  const settings = await Notifications.getPermissionsAsync()
  if (!settings.granted) {
    // Do not await: the prompt must never block connecting to the Mac.
    void Notifications.requestPermissionsAsync()
  }
  return settings.granted
}

/** Register the option actions for a specific question (options vary per question). */
export async function registerQuestionCategory(requestID: string, options: string[]): Promise<void> {  await Notifications.setNotificationCategoryAsync(`QUESTION_${requestID}`, [
    ...options.slice(0, 4).map((option) => ({ identifier: `${OPTION_PREFIX}${option}`, buttonTitle: option })),
  ])
}

export async function presentNotification(plan: NotificationPlan): Promise<void> {
  // The app is open and already showing the request; no push needed.
  if (AppState.currentState === "active") return

  const categoryIdentifier =
    plan.category === "QUESTION" && plan.requestID ? `QUESTION_${plan.requestID}` : plan.category
  await Notifications.scheduleNotificationAsync({
    content: {
      title: plan.title,
      body: plan.body,
      categoryIdentifier,
      data: { requestID: plan.requestID ?? null },
    },
    trigger: null,
  })
}

/** Dismiss a notification previously raised for a request. */
export async function dismissNotification(requestID: string): Promise<void> {
  const presented = await Notifications.getPresentedNotificationsAsync()
  await Promise.all(
    presented
      .filter((n) => (n.request.content.data as { requestID?: string })?.requestID === requestID)
      .map((n) => Notifications.dismissNotificationAsync(n.request.identifier)),
  )
}

/** The native APNs device token, or null when unavailable (simulator / no permission). */
export async function getDeviceToken(): Promise<string | null> {
  try {
    const token = (await Notifications.getDevicePushTokenAsync()) as { data?: unknown }
    return typeof token?.data === "string" && token.data ? token.data : null
  } catch {
    return null
  }
}
