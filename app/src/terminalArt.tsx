import { Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import type { Theme } from "./theme"

/** The console font used by the Terminal skin (bash-like TUI). */
export const MONO_FONT = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" })

/** A figlet-style "OI" in pure ASCII so it renders in every monospace face. */
export const TERMINAL_OI_ART = ["  ___   ___ ", " / _ \\ |_ _|", "| | | | | | ", "| |_| | | | ", " \\___/ |___|"]

/** The compact prompt mark shown in the header. */
export const TERMINAL_MARK = ">_"

/**
 * A faint character grid behind the Terminal skin's screens. Static and
 * non-interactive: one text block, no animation, hidden from accessibility.
 */
export function TerminalBackdrop({ theme }: { theme: Theme }) {
  const { width, height } = useWindowDimensions()
  const cols = Math.max(8, Math.floor(width / 16))
  const rows = Math.max(8, Math.ceil(height / 18))
  const line = Array.from({ length: cols }, (_, index) => (index % 2 === 0 ? "." : " ")).join("")
  const offset = ` ${line.slice(0, Math.max(0, line.length - 1))}`
  const grid = Array.from({ length: rows }, (_, index) => (index % 2 === 0 ? line : offset)).join("\n")
  return (
    <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, { opacity: 0.07 }]}>
      <Text style={{ color: theme.text, fontFamily: MONO_FONT, fontSize: 10, lineHeight: 18 }}>{grid}</Text>
    </View>
  )
}

/** The screen backdrop for the active skin: the ASCII grid for Terminal, nothing for other themes. */
export function ScreenBackdrop({ theme }: { theme: Theme }) {
  return theme.skin === "terminal" ? <TerminalBackdrop theme={theme} /> : null
}
