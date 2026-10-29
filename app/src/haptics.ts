import * as Haptics from "expo-haptics"

/** One haptic vocabulary; every call is paired with a visible change. */
export const haptics = {
  selection: () => void Haptics.selectionAsync(),
  impact: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  commit: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  success: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
}
