export type SkinId = "default" | "evangelion" | "sanrio" | "starwars" | "tunes" | "classic-os"
export type DefaultMode = "light" | "dark" | "system"
export type UnitId = "unit00" | "unit01" | "unit02"
export type SanrioId = "kitty" | "chococat"
export type StarWarsId = "sith" | "jedi"
export type TunesId = "classic" | "bento"
export type ClassicOSId = "blue" | "dark"
export type ThemeOption = DefaultMode | UnitId | SanrioId | StarWarsId | TunesId | ClassicOSId

export interface Theme {
  skin: SkinId
  variant?: ThemeOption
  dark: boolean
  background: string
  surface: string
  border: string
  text: string
  textSecondary: string
  textMuted: string
  accent: string
  secondaryAccent: string
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

// --- Default skin: the original rounded app look (Light / Dark / System) ---

const defaultLight: Theme = {
  skin: "default",
  dark: false,
  background: "#f5f7fb",
  surface: "#ffffff",
  border: "#e5eaf3",
  text: "#0e1524",
  textSecondary: "#57627a",
  textMuted: "#8b94a7",
  accent: "#2f6bff",
  secondaryAccent: "#6a5bff",
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

const defaultDark: Theme = {
  skin: "default",
  dark: true,
  background: "#070a10",
  surface: "#11161f",
  border: "#232c3b",
  text: "#edf1f7",
  textSecondary: "#a3aebf",
  textMuted: "#6e7889",
  accent: "#5aa9ff",
  secondaryAccent: "#8a6bff",
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

// --- Evangelion skin: the NERV unit palettes ---

const unit00: Theme = {
  skin: "evangelion",
  variant: "unit00",
  dark: false,
  background: "#eef3f9",
  surface: "#ffffff",
  border: "#cdd9e8",
  text: "#0a1626",
  textSecondary: "#46566b",
  textMuted: "#7d8ba0",
  accent: "#2563eb",
  secondaryAccent: "#60a5fa",
  allow: "#0f9d58",
  deny: "#d93025",
  option: "#2563eb",
  pendingBg: "#fff8ee",
  pendingBorder: "#ffd9a0",
  pendingTitle: "#8a4b0a",
  pendingBody: "#7a4a12",
  badgeBg: "#e4ecf6",
  badgeText: "#33465c",
  inputBg: "#ffffff",
  inputBorder: "#c3d1e2",
  error: "#d93025",
  shadow: "rgba(12,32,64,0.12)",
  scrim: "rgba(8,20,40,0.44)",
  bgGradient: ["#f6f9fd", "#e6eef8"],
  cardBorder: ["#ffffff", "#d3e0f0"],
  accentGradient: ["#3b82f6", "#1d4ed8"],
  glow: "rgba(37,99,235,0.30)",
  questionBorder: ["#60a5fa", "#2563eb"],
  questionGlow: "rgba(37,99,235,0.36)",
  questionBgGradient: ["rgba(37,99,235,0.07)", "rgba(29,78,216,0.03)"],
  questionText: "#1e3a8a",
  permissionBorder: ["#fbbf24", "#f59e0b"],
  permissionGlow: "rgba(245,158,11,0.36)",
  permissionBgGradient: ["rgba(245,158,11,0.10)", "rgba(217,119,6,0.03)"],
  permissionText: "#8a4b0a",
}

const unit01: Theme = {
  skin: "evangelion",
  variant: "unit01",
  dark: true,
  background: "#08050f",
  surface: "#140d24",
  border: "#2e2148",
  text: "#f0e9ff",
  textSecondary: "#b3a3d6",
  textMuted: "#7d6aa6",
  accent: "#a855f7",
  secondaryAccent: "#39ff14",
  allow: "#4ade80",
  deny: "#ff4d6d",
  option: "#8b5cf6",
  pendingBg: "#1c1408",
  pendingBorder: "#6b4410",
  pendingTitle: "#ffcf8f",
  pendingBody: "#e8c9a0",
  badgeBg: "#1e1535",
  badgeText: "#d6c8f5",
  inputBg: "#180f2c",
  inputBorder: "#3a2a5c",
  error: "#ff5c8a",
  shadow: "rgba(0,0,0,0.55)",
  scrim: "rgba(4,2,10,0.66)",
  bgGradient: ["#0a0616", "#140b26"],
  cardBorder: ["#3a2a5c", "#160d28"],
  accentGradient: ["#a855f7", "#22e07a"],
  glow: "rgba(168,85,247,0.42)",
  questionBorder: ["#a855f7", "#22e07a"],
  questionGlow: "rgba(168,85,247,0.5)",
  questionBgGradient: ["rgba(168,85,247,0.12)", "rgba(34,224,122,0.05)"],
  questionText: "#d8c6ff",
  permissionBorder: ["#fbbf24", "#ff5c8a"],
  permissionGlow: "rgba(255,92,138,0.5)",
  permissionBgGradient: ["rgba(251,191,36,0.10)", "rgba(255,92,138,0.05)"],
  permissionText: "#ffd9a0",
}

const unit02: Theme = {
  skin: "evangelion",
  variant: "unit02",
  dark: true,
  background: "#120406",
  surface: "#240a0e",
  border: "#4a1620",
  text: "#ffe9e6",
  textSecondary: "#d8a3a0",
  textMuted: "#a06f70",
  accent: "#ff4438",
  secondaryAccent: "#ff8a00",
  allow: "#4ade80",
  deny: "#ff2d2d",
  option: "#ff4438",
  pendingBg: "#241004",
  pendingBorder: "#6b4410",
  pendingTitle: "#ffcf8f",
  pendingBody: "#e8c9a0",
  badgeBg: "#33121a",
  badgeText: "#f4c6c2",
  inputBg: "#2a0d12",
  inputBorder: "#5a1f28",
  error: "#ff5252",
  shadow: "rgba(0,0,0,0.55)",
  scrim: "rgba(12,2,4,0.66)",
  bgGradient: ["#160407", "#240a0e"],
  cardBorder: ["#5a1f28", "#280d12"],
  accentGradient: ["#ff5a3c", "#ff8a00"],
  glow: "rgba(255,90,60,0.42)",
  questionBorder: ["#ff5a3c", "#ff8a00"],
  questionGlow: "rgba(255,138,0,0.5)",
  questionBgGradient: ["rgba(255,90,60,0.12)", "rgba(255,138,0,0.05)"],
  questionText: "#ffd0c4",
  permissionBorder: ["#ffb020", "#ff3b30"],
  permissionGlow: "rgba(255,59,48,0.5)",
  permissionBgGradient: ["rgba(255,176,32,0.10)", "rgba(255,59,48,0.05)"],
  permissionText: "#ffd9a0",
}

// --- Sanrio skin: Hello Kitty (light) / Chococat (dark) ---

const helloKitty: Theme = {
  skin: "sanrio",
  variant: "kitty",
  dark: false,
  background: "#fff5fa",
  surface: "#ffffff",
  border: "#ffd6e7",
  text: "#3b2233",
  textSecondary: "#8a6b7a",
  textMuted: "#b59aa8",
  accent: "#ff4d88",
  secondaryAccent: "#ffc93c",
  allow: "#2ecc71",
  deny: "#ff3b5c",
  option: "#ff4d88",
  pendingBg: "#fff8ee",
  pendingBorder: "#ffd9a0",
  pendingTitle: "#9a3412",
  pendingBody: "#7c3a12",
  badgeBg: "#ffe8f2",
  badgeText: "#a34a72",
  inputBg: "#ffffff",
  inputBorder: "#ffc9de",
  error: "#e0195a",
  shadow: "rgba(120,20,60,0.12)",
  scrim: "rgba(60,10,35,0.44)",
  bgGradient: ["#fff7fb", "#ffe9f3"],
  cardBorder: ["#ffffff", "#ffd9e8"],
  accentGradient: ["#ff6aa8", "#ff3d7f"],
  glow: "rgba(255,77,133,0.30)",
  questionBorder: ["#ff9ec7", "#ff4d88"],
  questionGlow: "rgba(255,77,133,0.36)",
  questionBgGradient: ["rgba(255,77,133,0.07)", "rgba(255,158,199,0.03)"],
  questionText: "#a3125a",
  permissionBorder: ["#ffd23f", "#ff8a3d"],
  permissionGlow: "rgba(255,138,61,0.36)",
  permissionBgGradient: ["rgba(255,210,63,0.12)", "rgba(255,138,61,0.03)"],
  permissionText: "#8a5a00",
}

const chococat: Theme = {
  skin: "sanrio",
  variant: "chococat",
  dark: true,
  background: "#0d0d10",
  surface: "#181820",
  border: "#2e2e3c",
  text: "#f2f2f7",
  textSecondary: "#b0b0c0",
  textMuted: "#7a7a8c",
  accent: "#ffb300",
  secondaryAccent: "#ffd54f",
  allow: "#4ade80",
  deny: "#ff5c5c",
  option: "#ffb300",
  pendingBg: "#241a04",
  pendingBorder: "#6b4a10",
  pendingTitle: "#ffcf8f",
  pendingBody: "#e8c9a0",
  badgeBg: "#242430",
  badgeText: "#e0e0ee",
  inputBg: "#1e1e28",
  inputBorder: "#3a3a4c",
  error: "#ff6b6b",
  shadow: "rgba(0,0,0,0.55)",
  scrim: "rgba(4,4,8,0.66)",
  bgGradient: ["#101014", "#1a1a24"],
  cardBorder: ["#3a3a4c", "#141420"],
  accentGradient: ["#ffb300", "#ff8a00"],
  glow: "rgba(255,179,0,0.4)",
  questionBorder: ["#ffb300", "#ffd54f"],
  questionGlow: "rgba(255,179,0,0.5)",
  questionBgGradient: ["rgba(255,179,0,0.12)", "rgba(255,213,79,0.05)"],
  questionText: "#ffe0a0",
  permissionBorder: ["#ff8a00", "#ff5c5c"],
  permissionGlow: "rgba(255,92,92,0.5)",
  permissionBgGradient: ["rgba(255,138,0,0.10)", "rgba(255,92,92,0.05)"],
  permissionText: "#ffd0b0",
}

// --- Star Wars skin: Jedi (light) / Sith (dark) ---

const jedi: Theme = {
  skin: "starwars",
  variant: "jedi",
  dark: false,
  background: "#eef5fd",
  surface: "#ffffff",
  border: "#cfe0f4",
  text: "#0b1b30",
  textSecondary: "#4a5f7a",
  textMuted: "#8296b0",
  accent: "#2b7cff",
  secondaryAccent: "#7ac8ff",
  allow: "#2ecc71",
  deny: "#e5484d",
  option: "#2b7cff",
  pendingBg: "#fff8ee",
  pendingBorder: "#ffd9a0",
  pendingTitle: "#8a4b0a",
  pendingBody: "#7a4a12",
  badgeBg: "#e6f0fb",
  badgeText: "#35507a",
  inputBg: "#ffffff",
  inputBorder: "#c9dcf2",
  error: "#d93025",
  shadow: "rgba(18,40,80,0.12)",
  scrim: "rgba(10,25,50,0.42)",
  bgGradient: ["#f6faff", "#e6f0fb"],
  cardBorder: ["#ffffff", "#d4e4f7"],
  accentGradient: ["#4a94ff", "#1d5fe0"],
  glow: "rgba(43,124,255,0.30)",
  questionBorder: ["#7ac8ff", "#2b7cff"],
  questionGlow: "rgba(43,124,255,0.36)",
  questionBgGradient: ["rgba(43,124,255,0.07)", "rgba(43,124,255,0.03)"],
  questionText: "#1b4a9a",
  permissionBorder: ["#fbbf24", "#f59e0b"],
  permissionGlow: "rgba(245,158,11,0.36)",
  permissionBgGradient: ["rgba(245,158,11,0.10)", "rgba(217,119,6,0.03)"],
  permissionText: "#8a4b0a",
}

const sith: Theme = {
  skin: "starwars",
  variant: "sith",
  dark: true,
  background: "#0a0608",
  surface: "#150c10",
  border: "#3a1a22",
  text: "#f5e9ec",
  textSecondary: "#c9a3ad",
  textMuted: "#8a6670",
  accent: "#ff2b2b",
  secondaryAccent: "#ff8a5c",
  allow: "#4ade80",
  deny: "#ff2b2b",
  option: "#ff2b2b",
  pendingBg: "#241004",
  pendingBorder: "#6b4410",
  pendingTitle: "#ffcf8f",
  pendingBody: "#e8c9a0",
  badgeBg: "#2a1218",
  badgeText: "#f0c6ce",
  inputBg: "#1e0f14",
  inputBorder: "#4a2028",
  error: "#ff5252",
  shadow: "rgba(0,0,0,0.55)",
  scrim: "rgba(10,2,4,0.66)",
  bgGradient: ["#120609", "#1e0a10"],
  cardBorder: ["#4a2028", "#1a0b10"],
  accentGradient: ["#ff3b3b", "#b30000"],
  glow: "rgba(255,43,43,0.42)",
  questionBorder: ["#ff3b3b", "#ff8a5c"],
  questionGlow: "rgba(255,59,59,0.5)",
  questionBgGradient: ["rgba(255,59,59,0.12)", "rgba(255,138,92,0.05)"],
  questionText: "#ffd0c4",
  permissionBorder: ["#ffb020", "#ff3b30"],
  permissionGlow: "rgba(255,59,48,0.5)",
  permissionBgGradient: ["rgba(255,176,32,0.10)", "rgba(255,59,48,0.05)"],
  permissionText: "#ffd9a0",
}

// --- Tunes skin: a classic media player (Classic dark / Bento light) ---

const tunesClassic: Theme = {
  skin: "tunes",
  variant: "classic",
  dark: true,
  background: "#1b1b1e",
  surface: "#2b2b30",
  border: "#4a4a52",
  text: "#e8e8ee",
  textSecondary: "#b8b8c2",
  textMuted: "#8a8a96",
  accent: "#3bd16f",
  secondaryAccent: "#ffb000",
  allow: "#3bd16f",
  deny: "#ff5a5a",
  option: "#3bd16f",
  pendingBg: "#2a2208",
  pendingBorder: "#6b5410",
  pendingTitle: "#ffe08a",
  pendingBody: "#e8d0a0",
  badgeBg: "#33333a",
  badgeText: "#d8d8e0",
  inputBg: "#232328",
  inputBorder: "#4a4a52",
  error: "#ff6b6b",
  shadow: "rgba(0,0,0,0.55)",
  scrim: "rgba(0,0,0,0.66)",
  bgGradient: ["#232328", "#141416"],
  cardBorder: ["#5a5a64", "#2a2a30"],
  accentGradient: ["#4de07f", "#1f9d4f"],
  glow: "rgba(59,209,111,0.42)",
  questionBorder: ["#3bd16f", "#8fe0a8"],
  questionGlow: "rgba(59,209,111,0.5)",
  questionBgGradient: ["rgba(59,209,111,0.12)", "rgba(255,176,0,0.05)"],
  questionText: "#bff0cf",
  permissionBorder: ["#ffb000", "#ff7a00"],
  permissionGlow: "rgba(255,176,0,0.5)",
  permissionBgGradient: ["rgba(255,176,0,0.12)", "rgba(255,122,0,0.05)"],
  permissionText: "#ffe0a0",
}

const tunesBento: Theme = {
  skin: "tunes",
  variant: "bento",
  dark: false,
  background: "#e9eaec",
  surface: "#f7f7f8",
  border: "#c3c6cb",
  text: "#23262b",
  textSecondary: "#5a5f68",
  textMuted: "#8b909a",
  accent: "#f28b00",
  secondaryAccent: "#e2542a",
  allow: "#1f9d4f",
  deny: "#d93025",
  option: "#f28b00",
  pendingBg: "#fff4e0",
  pendingBorder: "#f2c98a",
  pendingTitle: "#8a4b0a",
  pendingBody: "#7a4a12",
  badgeBg: "#e3e5e8",
  badgeText: "#42464d",
  inputBg: "#ffffff",
  inputBorder: "#c9ccd1",
  error: "#d93025",
  shadow: "rgba(30,32,36,0.14)",
  scrim: "rgba(30,32,36,0.44)",
  bgGradient: ["#f2f3f5", "#dcdde0"],
  cardBorder: ["#ffffff", "#cfd2d6"],
  accentGradient: ["#ffa733", "#f26800"],
  glow: "rgba(242,139,0,0.30)",
  questionBorder: ["#ffb84d", "#f28b00"],
  questionGlow: "rgba(242,139,0,0.36)",
  questionBgGradient: ["rgba(242,139,0,0.08)", "rgba(226,84,42,0.03)"],
  questionText: "#8a4b0a",
  permissionBorder: ["#f2c14e", "#e2542a"],
  permissionGlow: "rgba(226,84,42,0.36)",
  permissionBgGradient: ["rgba(242,193,78,0.12)", "rgba(226,84,42,0.03)"],
  permissionText: "#8a3a12",
}

// --- Classic OS skin: a classic desktop (Blue light / Dark) ---

const classicOSBlue: Theme = {
  skin: "classic-os",
  variant: "blue",
  dark: false,
  background: "#d7e3f4",
  surface: "#ffffff",
  border: "#7ba7e0",
  text: "#17324f",
  textSecondary: "#3f5f86",
  textMuted: "#6d86a6",
  accent: "#1c6fd6",
  secondaryAccent: "#3fa32a",
  allow: "#2e9b23",
  deny: "#d0342c",
  option: "#1c6fd6",
  pendingBg: "#fff8e0",
  pendingBorder: "#e8c86a",
  pendingTitle: "#8a5a00",
  pendingBody: "#7a5200",
  badgeBg: "#e3edfb",
  badgeText: "#2f4f78",
  inputBg: "#ffffff",
  inputBorder: "#a9c4e6",
  error: "#d0342c",
  shadow: "rgba(20,50,90,0.16)",
  scrim: "rgba(20,40,70,0.42)",
  bgGradient: ["#eaf1fb", "#cfe0f6"],
  cardBorder: ["#ffffff", "#b9d0ee"],
  accentGradient: ["#3f8be6", "#1558b0"],
  glow: "rgba(28,111,214,0.30)",
  questionBorder: ["#5aa0ef", "#1c6fd6"],
  questionGlow: "rgba(28,111,214,0.36)",
  questionBgGradient: ["rgba(28,111,214,0.08)", "rgba(63,163,42,0.03)"],
  questionText: "#12407e",
  permissionBorder: ["#ffd34e", "#e0a800"],
  permissionGlow: "rgba(224,168,0,0.36)",
  permissionBgGradient: ["rgba(255,211,78,0.12)", "rgba(224,168,0,0.03)"],
  permissionText: "#8a5a00",
}

const classicOSDark: Theme = {
  skin: "classic-os",
  variant: "dark",
  dark: true,
  background: "#0d1520",
  surface: "#16202e",
  border: "#2b3d54",
  text: "#e6eef8",
  textSecondary: "#a7b9cf",
  textMuted: "#6f8399",
  accent: "#4f9bf0",
  secondaryAccent: "#5fc84a",
  allow: "#5fc84a",
  deny: "#ff5a52",
  option: "#4f9bf0",
  pendingBg: "#241d08",
  pendingBorder: "#6b5410",
  pendingTitle: "#ffe08a",
  pendingBody: "#e8d0a0",
  badgeBg: "#1d2a3a",
  badgeText: "#c8d6e8",
  inputBg: "#1a2432",
  inputBorder: "#33465e",
  error: "#ff6b6b",
  shadow: "rgba(0,0,0,0.55)",
  scrim: "rgba(4,10,18,0.66)",
  bgGradient: ["#101a28", "#0b121c"],
  cardBorder: ["#33465e", "#16202e"],
  accentGradient: ["#5aa6f2", "#2f6fd0"],
  glow: "rgba(79,155,240,0.42)",
  questionBorder: ["#5aa6f2", "#8fd0ff"],
  questionGlow: "rgba(79,155,240,0.5)",
  questionBgGradient: ["rgba(79,155,240,0.12)", "rgba(95,200,74,0.04)"],
  questionText: "#bfe0ff",
  permissionBorder: ["#ffd34e", "#e0a800"],
  permissionGlow: "rgba(224,168,0,0.5)",
  permissionBgGradient: ["rgba(255,211,78,0.10)", "rgba(224,168,0,0.04)"],
  permissionText: "#ffe0a0",
}

export interface SkinDef {
  id: SkinId
  name: string
  description: string
  options: { id: ThemeOption; name: string }[]
  defaultOption: ThemeOption
  resolve: (option: ThemeOption, systemScheme?: string | null) => Theme
}

export const SKINS: SkinDef[] = [
  {
    id: "default",
    name: "Default",
    description: "Standard look · Light, Dark, System",
    options: [
      { id: "light", name: "Light" },
      { id: "dark", name: "Dark" },
      { id: "system", name: "System" },
    ],
    defaultOption: "system",
    resolve: (option, systemScheme) =>
      option === "light" ? defaultLight : option === "dark" ? defaultDark : systemScheme === "dark" ? defaultDark : defaultLight,
  },
  {
    id: "evangelion",
    name: "Nerv",
    description: "Unit console · Unit 00, 01, 02",
    options: [
      { id: "unit00", name: "Unit 00" },
      { id: "unit01", name: "Unit 01" },
      { id: "unit02", name: "Unit 02" },
    ],
    defaultOption: "unit01",
    resolve: (option) => (option === "unit00" ? unit00 : option === "unit02" ? unit02 : unit01),
  },
  {
    id: "sanrio",
    name: "Cat",
    description: "Kawaii cats · 2 looks + System",
    options: [
      { id: "kitty", name: "Hello Kitty" },
      { id: "chococat", name: "Chococat" },
      { id: "system", name: "System" },
    ],
    defaultOption: "kitty",
    resolve: (option, systemScheme) =>
      option === "chococat" ? chococat : option === "system" ? (systemScheme === "dark" ? chococat : helloKitty) : helloKitty,
  },
  {
    id: "starwars",
    name: "The Force",
    description: "Space saga · 2 sides + System",
    options: [
      { id: "sith", name: "Sith" },
      { id: "jedi", name: "Jedi" },
      { id: "system", name: "System" },
    ],
    defaultOption: "sith",
    resolve: (option, systemScheme) =>
      option === "jedi" ? jedi : option === "system" ? (systemScheme === "dark" ? sith : jedi) : sith,
  },
  {
    id: "tunes",
    name: "Tunes",
    description: "Retro media player · 2 looks",
    options: [
      { id: "classic", name: "Classic" },
      { id: "bento", name: "Bento" },
      { id: "system", name: "System" },
    ],
    defaultOption: "classic",
    resolve: (option, systemScheme) =>
      option === "bento" ? tunesBento : option === "system" ? (systemScheme === "dark" ? tunesClassic : tunesBento) : tunesClassic,
  },
  {
    id: "classic-os",
    name: "Classic OS",
    description: "Classic desktop · 2 looks",
    options: [
      { id: "blue", name: "Blue" },
      { id: "dark", name: "Dark" },
      { id: "system", name: "System" },
    ],
    defaultOption: "blue",
    resolve: (option, systemScheme) =>
      option === "dark" ? classicOSDark : option === "system" ? (systemScheme === "dark" ? classicOSDark : classicOSBlue) : classicOSBlue,
  },
]

export const DEFAULT_SKIN: SkinId = "default"
export const DEFAULT_OPTION: ThemeOption = "system"

/**
 * Whether the interface theme picker is available. Disabled for the TestFlight
 * build so it ships with only the Default theme; the other skins stay in the
 * catalog, and re-enabling is flipping this flag.
 */
export const THEMES_ENABLED = false

export function isSkinId(value: unknown): value is SkinId {
  return value === "default" || value === "evangelion" || value === "sanrio" || value === "starwars" || value === "tunes" || value === "classic-os"
}

export function skinDef(id: SkinId): SkinDef {
  return SKINS.find((skin) => skin.id === id) ?? SKINS[0]
}

export function defaultOptionFor(skin: SkinId): ThemeOption {
  return skinDef(skin).defaultOption
}

export function resolveTheme(skin: string | null | undefined, option: string | null | undefined, systemScheme?: string | null): Theme {
  const def = isSkinId(skin) ? skinDef(skin) : skinDef(DEFAULT_SKIN)
  const chosen = def.options.some((o) => o.id === option) ? (option as ThemeOption) : def.defaultOption
  return def.resolve(chosen, systemScheme)
}

/** The yellow-gold used for the Tunes mark on the dark (Classic) variant. */
export const TUNES_GOLD = "#ffd23f"

/** The tint to render the theme's mark with: gold for the dark Tunes variant, else the accent. */
export function markTint(theme: Theme): string {
  return theme.skin === "tunes" && theme.dark ? TUNES_GOLD : theme.accent
}

/** Migrate a legacy stored value (`light`/`dark`/`system` or a unit id) to a skin + option. */
export function migrateStoredTheme(raw: string | null | undefined): { skin: SkinId; option: ThemeOption } | null {
  if (!raw) return null
  if (raw === "light" || raw === "dark" || raw === "system") return { skin: "default", option: raw }
  if (raw === "unit00" || raw === "unit01" || raw === "unit02") return { skin: "evangelion", option: raw }
  return null
}
