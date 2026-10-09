export type ThemeMode = "light" | "dark" | "system"

export interface Theme {
  dark: boolean
  background: string
  surface: string
  border: string
  text: string
  textSecondary: string
  textMuted: string
  accent: string
  allow: string
  deny: string
  option: string
  pendingBg: string
  pendingBorder: string
  pendingTitle: string
  pendingBody: string
  badgeBg: string
  badgeText: string
  inputBg: string
  inputBorder: string
  error: string
  // Depth + overlays (tinted, never pure black)
  shadow: string
  scrim: string
  // Modern / gradient design tokens
  bgGradient: [string, string]
  cardBorder: [string, string]
  accentGradient: [string, string]
  glow: string
  // Attention kinds
  questionBorder: [string, string]
  questionGlow: string
  questionBgGradient: [string, string]
  questionText: string
  permissionBorder: [string, string]
  permissionGlow: string
  permissionBgGradient: [string, string]
  permissionText: string
}

export const lightTheme: Theme = {
  dark: false,
  background: "#f5f7fb",
  surface: "#ffffff",
  border: "#e5eaf3",
  text: "#0e1524",
  textSecondary: "#57627a",
  textMuted: "#8b94a7",
  accent: "#2f6bff",
  allow: "#12a150",
  deny: "#e5484d",
  option: "#2f6bff",
  pendingBg: "#fff8ee",
  pendingBorder: "#ffd9a0",
  pendingTitle: "#9a3412",
  pendingBody: "#7c3a12",
  badgeBg: "#eef2f9",
  badgeText: "#46516a",
  inputBg: "#ffffff",
  inputBorder: "#d7dfec",
  error: "#e5484d",
  shadow: "rgba(15,23,42,0.10)",
  scrim: "rgba(12,18,32,0.44)",
  bgGradient: ["#fafbfe", "#edf1f9"],
  cardBorder: ["#ffffff", "#e0e7f4"],
  accentGradient: ["#3f7bff", "#6a5bff"],
  glow: "rgba(47,107,255,0.28)",
  questionBorder: ["#7fb0ff", "#6a5bff"],
  questionGlow: "rgba(90,140,255,0.38)",
  questionBgGradient: ["rgba(90,140,255,0.07)", "rgba(120,90,255,0.03)"],
  questionText: "#1b3a8b",
  permissionBorder: ["#ffb347", "#ff7a59"],
  permissionGlow: "rgba(255,122,89,0.38)",
  permissionBgGradient: ["rgba(255,170,80,0.08)", "rgba(255,110,90,0.03)"],
  permissionText: "#9a3412",
}

export const darkTheme: Theme = {
  dark: true,
  background: "#070a10",
  surface: "#11161f",
  border: "#232c3b",
  text: "#edf1f7",
  textSecondary: "#a3aebf",
  textMuted: "#6e7889",
  accent: "#5aa9ff",
  allow: "#3fb950",
  deny: "#f85149",
  option: "#4f8cff",
  pendingBg: "#1c1408",
  pendingBorder: "#6b4410",
  pendingTitle: "#ffcf8f",
  pendingBody: "#e8c9a0",
  badgeBg: "#1a2230",
  badgeText: "#c6d0de",
  inputBg: "#121a24",
  inputBorder: "#2a3444",
  error: "#ff6b6b",
  shadow: "rgba(0,0,0,0.5)",
  scrim: "rgba(2,5,10,0.62)",
  bgGradient: ["#060911", "#0b1220"],
  cardBorder: ["#212c3d", "#101823"],
  accentGradient: ["#5aa9ff", "#8a6bff"],
  glow: "rgba(90,169,255,0.35)",
  questionBorder: ["#4f8cff", "#8a6bff"],
  questionGlow: "rgba(90,140,255,0.5)",
  questionBgGradient: ["rgba(70,120,255,0.1)", "rgba(120,90,255,0.04)"],
  questionText: "#bcd3ff",
  permissionBorder: ["#f5a524", "#ff5d73"],
  permissionGlow: "rgba(255,93,115,0.5)",
  permissionBgGradient: ["rgba(255,160,60,0.1)", "rgba(255,90,110,0.04)"],
  permissionText: "#ffcf8f",
}

export function resolveTheme(mode: ThemeMode, system: string | null | undefined): Theme {
  if (mode === "system") return system === "dark" ? darkTheme : lightTheme
  return mode === "dark" ? darkTheme : lightTheme
}
