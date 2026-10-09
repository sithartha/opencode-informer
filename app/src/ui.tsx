import { useEffect, useRef, useState, type ReactNode } from "react"
import { AccessibilityInfo, Animated, Dimensions, Easing, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
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
  nerv = false,
  rail = false,
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
  nerv?: boolean
  rail?: boolean
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

  // Angular panels (NERV) clamp the radius and add corner ticks; Star Wars rounds the
  // panel and adds a left lightsaber rail.
  const r = nerv ? 0 : rail ? Math.min(radius, 16) : radius
  const tickColor = glow ?? colors[0]
  const ticks = nerv ? (
    <>
      <View pointerEvents="none" style={[styles.tick, { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2, borderColor: tickColor }]} />
      <View pointerEvents="none" style={[styles.tick, { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2, borderColor: tickColor }]} />
      <View pointerEvents="none" style={[styles.tick, { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: tickColor }]} />
      <View pointerEvents="none" style={[styles.tick, { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2, borderColor: tickColor }]} />
    </>
  ) : null
  const railEl = rail ? <View pointerEvents="none" style={[styles.rail, { backgroundColor: tickColor }]} /> : null

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
      <Animated.View style={[{ borderRadius: r }, glowStyle, style]}>
        <View style={[styles.clip, { borderRadius: r }]}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.rotor,
              { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] },
            ]}
          >
            <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
          </Animated.View>
          <View style={[styles.inner, { borderRadius: Math.max(0, r - 1), margin: 1 }, innerStyle]}>
            {sheen}
            {children}
            {railEl}
          </View>
        </View>
        {ticks}
      </Animated.View>
    )
  }

  return (
    <Animated.View style={[{ borderRadius: r }, glowStyle, style]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: r, padding: 1 }}
      >
        <View style={[styles.inner, { borderRadius: Math.max(0, r - 1) }, innerStyle]}>
          {sheen}
          {children}
          {railEl}
        </View>
      </LinearGradient>
      {ticks}
    </Animated.View>
  )
}

/** A round multi-color gradient button with a sweeping sheen and a breathing glow. */
export function GradientGlowButton({
  children,
  colors,
  onPress,
  accessibilityLabel,
  size = 44,
}: {
  children: ReactNode
  colors: readonly [string, string, ...string[]]
  onPress: () => void
  accessibilityLabel?: string
  size?: number
}) {
  const reduce = useReducedMotion()
  const sheen = useRef(new Animated.Value(0)).current
  const glow = useRef(new Animated.Value(0.45)).current

  useEffect(() => {
    if (reduce) {
      sheen.setValue(0.5)
      glow.setValue(0.45)
      return
    }
    const sweep = Animated.loop(
      Animated.timing(sheen, {
        toValue: 1,
        duration: 2200,
        delay: 600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    )
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.85, duration: 1500, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0.35, duration: 1500, useNativeDriver: false }),
      ]),
    )
    sweep.start()
    pulse.start()
    return () => {
      sweep.stop()
      pulse.stop()
    }
  }, [reduce, sheen, glow])

  return (
    <PressableScale onPress={onPress} accessibilityLabel={accessibilityLabel}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          shadowColor: colors[0],
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 14,
          shadowOpacity: glow,
          elevation: 10,
        }}
      >
        <View style={{ flex: 1, borderRadius: size / 2, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
          <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -6,
              bottom: -6,
              width: 34,
              transform: [
                { translateX: sheen.interpolate({ inputRange: [0, 1], outputRange: [-60, size + 40] }) },
                { rotate: "20deg" },
              ],
            }}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.75)", "rgba(255,255,255,0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
          {children}
        </View>
      </Animated.View>
    </PressableScale>
  )
}

/** A round button with a breathing colored halo; static under reduced motion. */
export function GlowIconButton({
  label,
  color,
  onPress,
  accessibilityLabel,
  size = 38,
}: {
  label: string
  color: string
  onPress: () => void
  accessibilityLabel?: string
  size?: number
}) {
  const reduce = useReducedMotion()
  const glow = useRef(new Animated.Value(0.25)).current
  useEffect(() => {
    if (reduce) {
      glow.setValue(0.3)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.7, duration: 1400, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0.2, duration: 1400, useNativeDriver: false }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [reduce, glow])

  return (
    <PressableScale onPress={onPress} accessibilityLabel={accessibilityLabel}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1.5,
          borderColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 12,
          shadowOpacity: glow,
          elevation: 8,
        }}
      >
        <Text style={{ color, fontSize: size * 0.62, fontWeight: "700", lineHeight: size * 0.68 }}>{label}</Text>
      </Animated.View>
    </PressableScale>
  )
}

/** A small dot that breathes; static under reduced motion. */
export function GlowDot({ color, size = 10, pulse = false }: { color: string; size?: number; pulse?: boolean }) {  const reduce = useReducedMotion()
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
  tick: { position: "absolute", width: 12, height: 12 },
  rail: { position: "absolute", left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2 },
})

/** A thin NERV hazard stripe band (repeating diagonal blocks). */
export function HazardBar({ color = "#f5a524", contrast = "rgba(0,0,0,0.85)", height = 5 }: { color?: string; contrast?: string; height?: number }) {
  const dark = contrast
  const colors: string[] = []
  const locations: number[] = []
  const stripes = 16
  for (let i = 0; i < stripes; i += 1) {
    const start = i / stripes
    const mid = (i + 0.5) / stripes
    const end = (i + 1) / stripes
    colors.push(color, color, dark, dark)
    locations.push(start, mid - 0.001, mid, end - 0.001)
  }
  return (
    <LinearGradient
      colors={colors as [string, string, ...string[]]}
      locations={locations as [number, number, ...number[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ height, width: "100%" }}
    />
  )
}

/** A subtle horizontal scanline texture (CRT / HUD). Fills its positioned parent. */
export function Scanlines({ color = "rgba(127,127,127,0.12)", count = 22, thickness = 1 }: { color?: string; count?: number; thickness?: number }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { justifyContent: "space-between", overflow: "hidden" }]}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ height: thickness, backgroundColor: color }} />
      ))}
    </View>
  )
}

const TELEMETRY = [0.35, 0.6, 0.45, 0.9, 0.5, 0.75, 0.4, 0.68, 0.55, 0.85, 0.3, 0.7, 0.5, 0.95, 0.42, 0.62, 0.38, 0.8, 0.52, 0.72, 0.33, 0.88, 0.48, 0.66]

/** A decorative HUD waveform / equalizer strip. */
export function TelemetryBars({ color, height = 14, count = 26 }: { color: string; height?: number; count?: number }) {
  return (
    <View pointerEvents="none" style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, width: "100%", height }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ flex: 1, height: Math.max(2, height * TELEMETRY[i % TELEMETRY.length]), backgroundColor: color }} />
      ))}
    </View>
  )
}
