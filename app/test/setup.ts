// Render expo-linear-gradient as a plain View so components can be tested without
// the native module.
jest.mock("expo-linear-gradient", () => {
  const React = require("react")
  const { View } = require("react-native")
  return {
    LinearGradient: ({ children, ...props }: { children?: unknown }) => React.createElement(View, props, children),
  }
})

// The card animations (glow pulse, shimmer, rotating border) run on timers; fake
// timers keep them from firing between tests and leaking into later renders.
jest.useFakeTimers()

// Skia cannot run under jest. Render the avatar as a plain View that still carries
// its mood, so tests can assert which expression a session got.
jest.mock("moodstone", () => {
  const React = require("react")
  const { View } = require("react-native")
  return {
    Moodstone: ({ mood, cut, color, size, animated }: { mood: string; cut: string; color: string; size: number; animated?: boolean }) =>
      React.createElement(View, {
        testID: `agent-avatar:${mood}`,
        accessibilityLabel: `avatar ${mood} ${cut} ${color}${animated ? " animated" : ""}`,
        style: { width: size, height: size },
      }),
  }
})
