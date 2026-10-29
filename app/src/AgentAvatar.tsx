import { useEffect, useMemo, useState } from "react"
import { AccessibilityInfo, View, type StyleProp, type ViewStyle } from "react-native"
import { Moodstone } from "moodstone"
import { avatarColor, avatarCut, avatarIdentity, avatarMood } from "./avatar"
import type { Theme } from "./theme"

/** Follow the device's Reduce Motion setting, including changes while the app runs. */
function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false)
  useEffect(() => {
    let active = true
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduceMotion(value)
    })
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion)
    return () => {
      active = false
      subscription.remove()
    }
  }, [])
  return reduceMotion
}

/**
 * The agent's face on a session card. The avatar is decorative: the card's text
 * already names the agent, so assistive technology skips the canvas entirely.
 */
export function AgentAvatar({
  agent,
  sessionId,
  phase,
  currentTool,
  theme,
  size = 32,
  animated = false,
  style,
}: {
  agent?: string | null
  sessionId?: string | null
  phase: string
  currentTool?: string | null
  theme: Theme
  size?: number
  animated?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const reduceMotion = useReduceMotion()
  const cut = avatarCut(theme)
  const identity = useMemo(() => avatarIdentity(agent, sessionId, cut), [agent, sessionId, cut])
  const mood = avatarMood(phase, currentTool)
  if (process.env.EXPO_PUBLIC_BLE_DEBUG) {
    console.warn("[avatar]", sessionId ?? agent ?? "-", identity.cut, avatarColor(theme, phase))
  }
  return (
    <View
      style={style}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Moodstone
        mood={mood}
        cut={identity.cut}
        color={avatarColor(theme, phase)}
        eyeColor={theme.dark ? "white" : "black"}
        seed={identity.seed}
        size={size}
        animated={animated && !reduceMotion}
        paused={reduceMotion}
      />
    </View>
  )
}
