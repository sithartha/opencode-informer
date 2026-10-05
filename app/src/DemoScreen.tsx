import { useState } from "react"
import { ScrollView, Text, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { aggregate } from "./aggregate"
import { applyEvent, emptyState, type AppState, type PendingRequest } from "./events"
import type { StreamEventType } from "./contract"
import type { Theme } from "./theme"
import type { Styles } from "./styles"
import { GradientButton, HeroCard, SessionCard } from "./components"
import { FadeIn } from "./ui"

/**
 * Interactive demo for App Review and first-run exploration: sample sessions
 * with live controls, all local (no Mac, no bridge, no network).
 */
function seed(): AppState {
  let state = emptyState()
  const at = (type: StreamEventType, data: Record<string, unknown>) => {
    state = applyEvent(state, { type, data })
  }
  at("session.started", { sessionID: "demo_api", cwd: "/Users/dev/api", agent: "opencode" })
  at("tool.started", { sessionID: "demo_api", tool: "Bash" })
  at("session.activity", { sessionID: "demo_api", text: "Running the test suite for the API module" })
  at("session.started", { sessionID: "demo_web", cwd: "/Users/dev/web", agent: "opencode" })
  at("tool.started", { sessionID: "demo_web", tool: "Edit" })
  at("permission.requested", {
    sessionID: "demo_web",
    requestID: "demo_perm",
    title: "Allow Bash: rm -rf build/",
    summary: "rm -rf build/",
  })
  at("session.started", { sessionID: "demo_docs", cwd: "/Users/dev/docs", agent: "opencode" })
  at("question.asked", {
    sessionID: "demo_docs",
    requestID: "demo_q",
    title: "Which database should I use?",
    options: ["PostgreSQL", "SQLite", "MySQL"],
  })
  return state
}

let demoCounter = 0

export function DemoScreen({
  onClose,
  onOpenGallery,
  theme,
  styles,
}: {
  onClose: () => void
  onOpenGallery: () => void
  theme: Theme
  styles: Styles
}) {
  const [state, setState] = useState<AppState>(seed)
  const agg = aggregate(state)
  const sessions = Object.values(state.sessions)

  const pendingBySession: Record<string, PendingRequest[]> = {}
  for (const request of Object.values(state.pending)) {
    ;(pendingBySession[request.sessionID] ??= []).unshift(request)
  }

  // Resolutions apply locally so the buttons, cards, and hero all update.
  const resolve = (requestID: string, _action: string) => {
    setState((prev) => {
      const pending = prev.pending[requestID]
      if (!pending) return prev
      return applyEvent(prev, { type: "actionable.resolved", data: { sessionID: pending.sessionID, requestID } })
    })
  }

  const simulatePermission = () => {
    const id = `demo_${++demoCounter}`
    setState((prev) => {
      let next = applyEvent(prev, { type: "session.started", data: { sessionID: id, cwd: `/Users/dev/new-${demoCounter}`, agent: "opencode" } })
      next = applyEvent(next, {
        type: "permission.requested",
        data: { sessionID: id, requestID: `${id}_perm`, title: "Allow Bash: npm install", summary: "npm install" },
      })
      return next
    })
  }

  const simulateQuestion = () => {
    const id = `demo_${++demoCounter}`
    setState((prev) => {
      let next = applyEvent(prev, { type: "session.started", data: { sessionID: id, cwd: `/Users/dev/new-${demoCounter}`, agent: "opencode" } })
      next = applyEvent(next, {
        type: "question.asked",
        data: { sessionID: id, requestID: `${id}_q`, title: "Ship this change?", options: ["Yes", "No"] },
      })
      return next
    })
  }

  const completeOne = () => {
    setState((prev) => {
      const target = Object.values(prev.sessions).find(
        (s) => s.phase === "running" || s.phase === "waiting-permission" || s.phase === "waiting-answer",
      )
      if (!target) return prev
      return applyEvent(prev, { type: "turn.completed", data: { sessionID: target.id } })
    })
  }

  return (
    <LinearGradient colors={theme.bgGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Demo</Text>
          <View style={styles.headerLinks}>
            <Text style={styles.settingsLink} onPress={onOpenGallery}>
              Gallery
            </Text>
            <Text style={styles.settingsLink} onPress={onClose}>
              Done
            </Text>
          </View>
        </View>

        <View style={styles.demoBanner}>
          <Text style={styles.demoBannerText}>
            Sample data — no Mac required. This is how the dashboard looks when OpenCode agents are running on your Mac.
          </Text>
        </View>

        <FadeIn style={styles.heroWrap}>
          <HeroCard agg={agg} theme={theme} styles={styles} />
        </FadeIn>

        <Text style={styles.section}>Simulate</Text>
        <View style={styles.demoActions}>
          <GradientButton label="New permission" onPress={simulatePermission} styles={styles} colors={theme.accentGradient} />
          <GradientButton label="New question" onPress={simulateQuestion} styles={styles} colors={theme.accentGradient} />
          <GradientButton label="Complete one" onPress={completeOne} styles={styles} colors={theme.accentGradient} />
        </View>

        <Text style={styles.section}>Sessions</Text>
        {sessions.map((session, index) => (
          <FadeIn key={session.id} delay={index * 40} style={styles.cardGap}>
            <SessionCard session={session} requests={pendingBySession[session.id] ?? []} resolve={resolve} theme={theme} styles={styles} />
          </FadeIn>
        ))}
      </ScrollView>
    </LinearGradient>
  )
}
