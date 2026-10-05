import { useEffect, useRef, useState, type ReactNode } from "react"
import { AccessibilityInfo, Animated, Dimensions, Easing, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { LinearGradient } from "expo-linear-gradient"

/** Respect the system reduced-motion setting. */
export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    let mounted = true
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduce(value)
    })
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => setReduce(value))
    return () => {
      mounted = false
      subscription.remove()
    }
  }, [])
  return reduce
}

/** Fade + rise on mount; instant (no motion) under reduced motion. */
export function FadeIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion()
  const progress = useRef(new Animated.Value(reduce ? 1 : 0)).current

  useEffect(() => {
    if (reduce) {
      progress.setValue(1)
      return
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    })
    animation.start()
    return () => animation.stop()
  }, [delay, progress, reduce])

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  )
}

/** Instant press-down feedback with a gentle spring release. */
export function PressableScale({
  onPress,
  onLongPress,
  disabled,
  style,
  children,
  accessibilityLabel,
}: {
  onPress?: () => void
  onLongPress?: () => void
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  children: ReactNode
  accessibilityLabel?: string
}) {
  const scale = useRef(new Animated.Value(1)).current
  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start()
        }
      >
        {children}
      </Pressable>
    </Animated.View>
  )
}

/**
 * A surface with a 1px gradient border. When `glow` is set it casts a colored
 * halo; when `pulse` is also set the halo breathes for attention (like a Live
 * Activity). Children set their own background (usually the theme surface).
 */
export function GradientSurface({
  colors,
  radius = 18,
  glow,
  pulse = false,
  shimmer = false,
  shimmerLoop = false,
  animatedBorder = false,
  style,
  innerStyle,
  children,
}: {
  colors: [string, string]
  radius?: number
  glow?: string
  pulse?: boolean
  shimmer?: boolean
  shimmerLoop?: boolean
  animatedBorder?: boolean
  style?: StyleProp<ViewStyle>
  innerStyle?: StyleProp<ViewStyle>
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  const glowOpacity = useRef(new Animated.Value(glow ? 0.15 : 0)).current
  const shimmerX = useRef(new Animated.Value(0)).current
  const spin = useRef(new Animated.Value(0)).current
  const shimmerDistance = Dimensions.get("window").width + 280

  useEffect(() => {
    if (!pulse || !glow || reduce) {
      glowOpacity.setValue(glow ? 0.15 : 0)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.22, duration: 2400, useNativeDriver: false }),
        Animated.timing(glowOpacity, { toValue: 0.06, duration: 2400, useNativeDriver: false }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulse, glow, reduce, glowOpacity])

  // The sheen sweeps across once on appear, or loops when shimmerLoop is set.
  useEffect(() => {
    if (!shimmer || reduce) return
    shimmerX.setValue(0)
    const animation = shimmerLoop
      ? Animated.loop(
          Animated.timing(shimmerX, {
            toValue: 1,
            duration: 2800,
            delay: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        )
      : Animated.timing(shimmerX, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
    animation.start()
    return () => animation.stop()
  }, [shimmer, shimmerLoop, reduce, shimmerX])

  // Important borders get a slowly rotating gradient.
  useEffect(() => {
    if (!animatedBorder || reduce) return
    spin.setValue(0)
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true }),
    )
    loop.start()
    return () => loop.stop()
  }, [animatedBorder, reduce, spin])

  const glowStyle = glow
    ? {
        shadowColor: glow,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 30,
        shadowOpacity: pulse && !reduce ? glowOpacity : 0.15,
        elevation: 10,
      }
    : null

  const sheen = shimmer ? (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        width: 200,
        opacity: 0.4,
        transform: [{ translateX: shimmerX.interpolate({ inputRange: [0, 1], outputRange: [-220, shimmerDistance] }) }],
      }}
    >
      <LinearGradient
        colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.5)", "rgba(255,255,255,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  ) : null

  if (animatedBorder) {
    return (
      <Animated.View style={[{ borderRadius: radius }, glowStyle, style]}>
        <View style={[styles.clip, { borderRadius: radius }]}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.rotor,
              { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] },
            ]}
          >
            <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
          </Animated.View>
          <View style={[styles.inner, { borderRadius: radius - 1, margin: 1 }, innerStyle]}>
            {sheen}
            {children}
          </View>
        </View>
      </Animated.View>
    )
  }

  return (
    <Animated.View style={[{ borderRadius: radius }, glowStyle, style]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radius, padding: 1 }}
      >
        <View style={[styles.inner, { borderRadius: radius - 1 }, innerStyle]}>
          {sheen}
          {children}
        </View>
      </LinearGradient>
    </Animated.View>
  )
}

/** A small dot that breathes; static under reduced motion. */
export function GlowDot({ color, size = 10, pulse = false }: { color: string; size?: number; pulse?: boolean }) {
  const reduce = useReducedMotion()
  const opacity = useRef(new Animated.Value(1)).current
  useEffect(() => {
    if (!pulse || reduce) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulse, reduce, opacity])

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        shadowColor: color,
        shadowOpacity: 0.9,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  )
}

const styles = StyleSheet.create({
  inner: { overflow: "hidden" },
  clip: { overflow: "hidden" },
  rotor: { position: "absolute", top: -1200, left: -1200, right: -1200, bottom: -1200 },
})
