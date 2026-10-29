/** Shared layout scales. Values are in points; themes may change color, not rhythm. */
export const SPACE = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const

/** Role-based type sizes; line heights are kept beside them so text stays readable. */
export const TYPE = {
  display: 40,
  title: 22,
  heading: 17,
  body: 14,
  label: 12,
  meta: 11,
  micro: 10,
} as const

export const LINE = {
  display: 46,
  title: 28,
  heading: 22,
  body: 20,
  label: 18,
  meta: 16,
  micro: 14,
} as const

/** Corner roles: square, control, panel, or a full pill. */
export const RADIUS = {
  none: 0,
  control: 12,
  panel: 18,
  pill: 999,
} as const
