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
