import { Easing } from "react-native"

/** Shared motion vocabulary for the app. Keep values here, never inline per screen. */
export const DURATION = {
  press: 120,
  fast: 160,
  base: 220,
  sheet: 300,
} as const

export const EASE = {
  /** Entering/exiting UI: strong ease-out. */
  out: Easing.bezier(0.23, 1, 0.32, 1),
  /** On-screen movement: strong ease-in-out. */
  inOut: Easing.bezier(0.77, 0, 0.175, 1),
  /** Sheet/drawer. */
  sheet: Easing.bezier(0.32, 0.72, 0, 1),
} as const

/** Slow ambient loops (attention, scanlines, sheen). */
export const AMBIENT = {
  pulse: 900,
  glow: 2400,
  sheen: 2200,
  sheenOnce: 1100,
  border: 6000,
} as const

/** Spring parameters for Reanimated 4 (Apple's damping/response model). */
export const SPRING = {
  settle: { duration: 400, dampingRatio: 1 },
  momentum: { duration: 400, dampingRatio: 0.8 },
} as const
