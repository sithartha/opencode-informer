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
  background: "#f4f6fb",
  surface: "#ffffff",
  border: "#e6ebf3",
  text: "#0b1220",
  textSecondary: "#5b6675",
  textMuted: "#8a94a6",
  accent: "#3b6ef6",
  allow: "#1f9d55",
  deny: "#e5484d",
  option: "#3b6ef6",
  pendingBg: "#fff8ed",
  pendingBorder: "#ffd9a0",
  pendingTitle: "#9a3412",
  pendingBody: "#7c2d12",
  badgeBg: "#eef2f8",
  badgeText: "#3a4759",
  inputBg: "#ffffff",
  inputBorder: "#d7dfec",
  error: "#e5484d",
  bgGradient: ["#fbfcfe", "#e9eef7"],
  cardBorder: ["#ffffff", "#dbe4f2"],
  accentGradient: ["#4f8cff", "#6a5bff"],
  glow: "rgba(79,140,255,0.35)",
  questionBorder: ["#7db8ff", "#6a5bff"],
  questionGlow: "rgba(90,140,255,0.45)",
  questionBgGradient: ["rgba(90,140,255,0.06)", "rgba(120,90,255,0.03)"],
  questionText: "#1e3a8a",
  permissionBorder: ["#ffb347", "#ff7a59"],
  permissionGlow: "rgba(255,122,89,0.45)",
  permissionBgGradient: ["rgba(255,170,80,0.07)", "rgba(255,110,90,0.03)"],
  permissionText: "#9a3412",
}

export const darkTheme: Theme = {
  dark: true,
  background: "#05070c",
  surface: "#0e141d",
  border: "#1c2634",
  text: "#eaf0f8",
  textSecondary: "#9aa7b8",
  textMuted: "#6b7787",
  accent: "#5aa9ff",
  allow: "#3fb950",
  deny: "#f85149",
  option: "#4f8cff",
  pendingBg: "#1c1408",
  pendingBorder: "#6b4410",
  pendingTitle: "#ffcf8f",
  pendingBody: "#e8c9a0",
  badgeBg: "#161f2b",
  badgeText: "#c2cede",
  inputBg: "#111a25",
  inputBorder: "#26313f",
  error: "#ff6b6b",
  bgGradient: ["#04060a", "#0a1220"],
  cardBorder: ["#1d2a3c", "#0e1622"],
  accentGradient: ["#5aa9ff", "#8a6bff"],
  glow: "rgba(90,169,255,0.35)",
  questionBorder: ["#4f8cff", "#8a6bff"],
  questionGlow: "rgba(90,140,255,0.55)",
  questionBgGradient: ["rgba(70,120,255,0.09)", "rgba(120,90,255,0.04)"],
  questionText: "#bcd3ff",
  permissionBorder: ["#f5a524", "#ff5d73"],
  permissionGlow: "rgba(255,93,115,0.55)",
  permissionBgGradient: ["rgba(255,160,60,0.09)", "rgba(255,90,110,0.04)"],
  permissionText: "#ffcf8f",
}

export function resolveTheme(mode: ThemeMode, system: string | null | undefined): Theme {
  if (mode === "system") return system === "dark" ? darkTheme : lightTheme
  return mode === "dark" ? darkTheme : lightTheme
}
