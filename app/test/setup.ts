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

// Safe-area insets are provided by the native provider in the app; tests use zero insets.
jest.mock("react-native-safe-area-context", () => {
  const React = require("react")
  const actual = jest.requireActual("react-native-safe-area-context")
  const insets = { top: 0, bottom: 0, left: 0, right: 0 }
  return {
    ...actual,
    SafeAreaProvider: ({ children }: { children: unknown }) => React.createElement(React.Fragment, null, children),
    SafeAreaView: ({ children }: { children: unknown }) => React.createElement(React.Fragment, null, children),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  }
})
