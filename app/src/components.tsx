import { useRef, useState, type ReactNode } from "react"
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, type StyleProp, type TextStyle } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import type { PendingRequest, Session } from "./events"
import type { Aggregate } from "./aggregate"
import type { Theme } from "./theme"
import { FadeIn, GlowDot, GradientSurface, PressableScale } from "./ui"
import type { Styles } from "./styles"

export const PHASE_COLORS: Record<string, string> = {
  running: "#2e7d32",
  "waiting-permission": "#ef6c00",
  "waiting-answer": "#1565c0",
  completed: "#616161",
}

export type Resolve = (id: string, action: string) => void

export function BrandMark({ theme }: { theme: Theme }) {
  return (
    <LinearGradient colors={theme.accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={brand.mark}>
      <Text style={brand.markText}>OI</Text>
    </LinearGradient>
  )
}

export function GradientButton({ label, onPress, styles, colors }: { label: string; onPress: () => void; styles: Styles; colors: [string, string] }) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientButton}>
        <Text style={styles.gradientButtonText}>{label}</Text>
      </LinearGradient>
    </PressableScale>
  )
}

export function InlineInput({
  placeholder,
  submitLabel = "Send",
  onSubmit,
  styles,
  theme,
  onFieldFocus,
}: {
  placeholder: string
  submitLabel?: string
  onSubmit: (text: string) => void
  styles: Styles
  theme: Theme
  onFieldFocus?: (y: number, h: number) => void
}) {
  const [text, setText] = useState("")
  const inputRef = useRef<TextInput>(null)
  const submit = () => {
    const value = text.trim()
    if (!value) return
    onSubmit(value)
    setText("")
  }
  return (
    <View style={styles.freeformRow}>
      <TextInput
        ref={inputRef}
        style={styles.freeformInput}
        value={text}
        onChangeText={setText}
        multiline
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        onFocus={() => {
          if (!onFieldFocus) return
          // Let the keyboard/layout settle before measuring the field.
          setTimeout(() => inputRef.current?.measureInWindow?.((_x, y, _w, h) => onFieldFocus(y, h)), 250)
        }}
        accessibilityLabel={placeholder}
      />
      <PressableScale onPress={submit} accessibilityLabel={submitLabel}>
        <View style={[styles.actionInner, { backgroundColor: theme.option }]}>
          <Text style={styles.actionText}>{submitLabel}</Text>
        </View>
      </PressableScale>
    </View>
  )
}

export function ExpandableText({
  text,
  style,
  styles,
  numberOfLines = 3,
  threshold = 140,
}: {
  text: string
  style: StyleProp<TextStyle>
  styles: Styles
  numberOfLines?: number
  threshold?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const canExpand = text.length > threshold
  return (
    <TouchableOpacity activeOpacity={canExpand ? 0.7 : 1} onPress={() => canExpand && setExpanded((value) => !value)}>
      <Text style={style} numberOfLines={expanded ? undefined : numberOfLines}>
        {text}
      </Text>
      {canExpand ? <Text style={styles.moreLink}>{expanded ? "less" : "more"}</Text> : null}
    </TouchableOpacity>
  )
}

export function PendingActions({
  request,
  resolve,
  styles,
  theme,
  onFieldFocus,
}: {
  request: PendingRequest
  resolve: Resolve
  styles: Styles
  theme: Theme
  onFieldFocus?: (y: number, h: number) => void
}) {
  if (request.kind === "permission") {
    return (
      <View style={styles.actions}>
        <PressableScale onPress={() => resolve(request.requestID, "allow")} accessibilityLabel="Allow">
          <View style={[styles.actionInner, { backgroundColor: theme.allow }]}>
            <Text style={styles.actionText}>Allow</Text>
          </View>
        </PressableScale>
        <PressableScale onPress={() => resolve(request.requestID, "deny")} accessibilityLabel="Deny">
          <View style={[styles.actionInner, { backgroundColor: theme.deny }]}>
            <Text style={styles.actionText}>Deny</Text>
          </View>
        </PressableScale>
      </View>
    )
  }

  const options = request.options ?? []
  return (
    <>
      {options.length > 0 ? (
        <View style={styles.actions}>
          {options.map((option) => (
            <PressableScale key={option} onPress={() => resolve(request.requestID, option)} accessibilityLabel={option}>
              <View style={[styles.actionInner, { backgroundColor: theme.option }]}>
                <Text style={styles.actionText}>{option}</Text>
              </View>
            </PressableScale>
          ))}
        </View>
      ) : null}
      {request.allowFreeform ? (
        <InlineInput
          placeholder="Type an answer"
          onSubmit={(value) => resolve(request.requestID, value)}
          styles={styles}
          theme={theme}
          onFieldFocus={onFieldFocus}
        />
      ) : null}
    </>
  )
}

export function HeroCard({ agg, theme, styles }: { agg: Aggregate; theme: Theme; styles: Styles }) {
  const hasPermission = agg.waitingApproval > 0
  const hasQuestion = agg.waitingAnswer > 0
  const needsYou = hasPermission || hasQuestion
  const border = hasPermission ? theme.permissionBorder : hasQuestion ? theme.questionBorder : theme.cardBorder
  const glow = hasPermission ? theme.permissionGlow : hasQuestion ? theme.questionGlow : theme.glow
  return (
    <GradientSurface
      colors={border}
      glow={glow}
      pulse={needsYou}
      shimmer={needsYou}
      shimmerLoop={needsYou}
      animatedBorder={needsYou}
      radius={22}
      innerStyle={{ backgroundColor: theme.surface }}
    >
      <View style={styles.heroInner}>
        <Text style={styles.heroCount}>{agg.total}</Text>
        <Text style={styles.heroLabel}>active {agg.total === 1 ? "agent" : "agents"}</Text>
        <View style={styles.heroBreakdown}>
          <View style={styles.heroStat}>
            <GlowDot color={PHASE_COLORS.running} size={7} pulse={agg.running > 0} />
            <Text style={styles.heroStatText}>{agg.running} working</Text>
          </View>
          <View style={styles.heroStat}>
            <GlowDot color={PHASE_COLORS.completed} size={7} />
            <Text style={styles.heroStatText}>{agg.stopped} inactive</Text>
          </View>
        </View>
        <View style={[styles.heroBreakdown, styles.heroBreakdownSecond]}>
          <View style={styles.heroStat}>
            <GlowDot color={PHASE_COLORS["waiting-permission"]} size={7} pulse={agg.waitingApproval > 0} />
            <Text style={styles.heroStatText}>{agg.waitingApproval} permission</Text>
          </View>
          <View style={styles.heroStat}>
            <GlowDot color={PHASE_COLORS["waiting-answer"]} size={7} pulse={agg.waitingAnswer > 0} />
            <Text style={styles.heroStatText}>{agg.waitingAnswer} question</Text>
          </View>
        </View>
      </View>
    </GradientSurface>
  )
}

export function SessionCard({
  session,
  requests,
  resolve,
  theme,
  styles,
  onFieldFocus,
  onSendPrompt,
}: {
  session: Session
  requests: PendingRequest[]
  resolve: Resolve
  theme: Theme
  styles: Styles
  onFieldFocus?: (y: number, h: number) => void
  onSendPrompt?: (sessionID: string, text: string) => void
}) {
  const request = requests[0]
  const isQuestion = request?.kind === "question"
  const border = request ? (isQuestion ? theme.questionBorder : theme.permissionBorder) : theme.cardBorder
  const glow = request ? (isQuestion ? theme.questionGlow : theme.permissionGlow) : undefined
  const bgGradient = isQuestion ? theme.questionBgGradient : theme.permissionBgGradient
  const pendingText = isQuestion ? theme.questionText : theme.permissionText
  return (
    <GradientSurface
      colors={border}
      glow={glow}
      pulse={Boolean(request)}
      shimmer={Boolean(request)}
      animatedBorder={Boolean(request)}
      radius={18}
      innerStyle={{ backgroundColor: theme.surface }}
    >
      <View style={styles.cardPad}>
        <View style={styles.sessionHeader}>
          <GlowDot color={PHASE_COLORS[session.phase] ?? theme.textMuted} size={9} pulse={session.phase === "running"} />
          <Text style={styles.sessionTitle} numberOfLines={1}>
            {session.cwd || session.id}
          </Text>
          <Text style={styles.sessionPhase}>{session.phase}</Text>
        </View>
        <View style={styles.badges}>
          {session.currentTool ? <Text style={styles.badge}>tool · {session.currentTool}</Text> : null}
          <Text style={styles.badge}>{session.subagents ?? 0} subagents</Text>
          <Text style={styles.badge}>{session.shells ?? 0} shells</Text>
        </View>
        {session.lastActivity ? (
          <View style={styles.activityBlock}>
            <ExpandableText text={session.lastActivity} style={styles.activityText} styles={styles} />
          </View>
        ) : null}
        {request ? (
          <View style={[styles.inlineGlow, { shadowColor: glow }]}>
            <LinearGradient colors={bgGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.inlineGradient}>
              <Text style={[styles.inlinePendingTitle, { color: pendingText }]}>{request.title}</Text>
              {request.summary ? (
                <ExpandableText text={request.summary} style={[styles.inlinePendingBody, { color: pendingText }]} styles={styles} numberOfLines={4} threshold={120} />
              ) : null}
              <PendingActions request={request} resolve={resolve} styles={styles} theme={theme} onFieldFocus={onFieldFocus} />
            </LinearGradient>
          </View>
        ) : null}
        {!request && (session.phase === "completed" || session.phase === "ended") && onSendPrompt ? (
          <InlineInput
            placeholder="Send a prompt"
            onSubmit={(value) => onSendPrompt(session.id, value)}
            styles={styles}
            theme={theme}
            onFieldFocus={onFieldFocus}
          />
        ) : null}
      </View>
    </GradientSurface>
  )
}

export function NeedsAttentionCard({
  request,
  resolve,
  theme,
  styles,
  onFieldFocus,
}: {
  request: PendingRequest
  resolve: Resolve
  theme: Theme
  styles: Styles
  onFieldFocus?: (y: number, h: number) => void
}) {
  const isQuestion = request.kind === "question"
  const border = isQuestion ? theme.questionBorder : theme.permissionBorder
  const glow = isQuestion ? theme.questionGlow : theme.permissionGlow
  const bgGradient = isQuestion ? theme.questionBgGradient : theme.permissionBgGradient
  const text = isQuestion ? theme.questionText : theme.permissionText
  return (
    <GradientSurface colors={border} glow={glow} pulse shimmer animatedBorder radius={18} innerStyle={{ backgroundColor: theme.surface }}>
      <View style={styles.cardPad}>
        <View style={[styles.inlineGlow, { marginTop: 0, shadowColor: glow }]}>
          <LinearGradient colors={bgGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.inlineGradient}>
            <Text style={[styles.cardTitle, { color: text }]}>{request.title}</Text>
            {request.summary ? (
              <ExpandableText text={request.summary} style={[styles.cardBody, { color: text }]} styles={styles} numberOfLines={4} threshold={120} />
            ) : null}
            <PendingActions request={request} resolve={resolve} styles={styles} theme={theme} onFieldFocus={onFieldFocus} />
          </LinearGradient>
        </View>
      </View>
    </GradientSurface>
  )
}

export function PreviewScreen({ onClose, theme, styles, resolve }: { onClose: () => void; theme: Theme; styles: Styles; resolve: Resolve }) {
  const noop: Resolve = () => {}
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <LinearGradient colors={theme.bgGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Card preview</Text>
            <PressableScale onPress={onClose} accessibilityLabel="Done">
              <Text style={styles.settingsLink}>Done</Text>
            </PressableScale>
          </View>
          <Text style={styles.hint}>Every card state, with sample data.</Text>

          <Text style={styles.section}>Hero · idle</Text>
          <FadeIn>
            <HeroCard agg={{ total: 0, running: 0, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }} theme={theme} styles={styles} />
          </FadeIn>

          <Text style={styles.section}>Hero · working</Text>
          <FadeIn delay={40}>
            <HeroCard agg={{ total: 2, running: 2, waitingApproval: 0, waitingAnswer: 0, stopped: 1 }} theme={theme} styles={styles} />
          </FadeIn>

          <Text style={styles.section}>Hero · needs you</Text>
          <FadeIn delay={40}>
            <HeroCard agg={{ total: 4, running: 2, waitingApproval: 1, waitingAnswer: 1, stopped: 0 }} theme={theme} styles={styles} />
          </FadeIn>

          <Text style={styles.section}>Hero · needs you (questions only)</Text>
          <FadeIn delay={40}>
            <HeroCard agg={{ total: 2, running: 1, waitingApproval: 0, waitingAnswer: 1, stopped: 0 }} theme={theme} styles={styles} />
          </FadeIn>

          <Text style={styles.section}>Hero · with stopped sessions</Text>
          <FadeIn delay={40}>
            <HeroCard agg={{ total: 1, running: 1, waitingApproval: 0, waitingAnswer: 0, stopped: 3 }} theme={theme} styles={styles} />
          </FadeIn>

          <Text style={styles.section}>Session · running</Text>
          <FadeIn>
            <SessionCard
              session={{ id: "s1", agent: "opencode", cwd: "/Users/dev/api", phase: "running", currentTool: "Bash", lastActivity: "Running the test suite", subagents: 2, shells: 3, updatedAt: 0 }}
              requests={[]}
              resolve={noop}
              theme={theme}
              styles={styles}
            />
          </FadeIn>

          <Text style={styles.section}>Session · waiting for approval</Text>
          <FadeIn delay={40}>
            <SessionCard
              session={{ id: "s2", agent: "opencode", cwd: "/Users/dev/api", phase: "waiting-permission", currentTool: null, lastActivity: "Permission: bash", subagents: 0, shells: 1, updatedAt: 0 }}
              requests={[{ requestID: "p1", sessionID: "s2", kind: "permission", title: "Allow Bash", summary: "rm -rf build/" }]}
              resolve={resolve}
              theme={theme}
              styles={styles}
            />
          </FadeIn>

          <Text style={styles.section}>Session · waiting for an answer</Text>
          <FadeIn delay={40}>
            <SessionCard
              session={{ id: "s3", agent: "opencode", cwd: "/Users/dev/web", phase: "waiting-answer", currentTool: null, lastActivity: "Which database should I use?", subagents: 1, shells: 0, updatedAt: 0 }}
              requests={[{ requestID: "q1", sessionID: "s3", kind: "question", title: "Which database should I use?", options: ["PostgreSQL", "SQLite", "MySQL"] }]}
              resolve={resolve}
              theme={theme}
              styles={styles}
            />
          </FadeIn>

          <Text style={styles.section}>Session · completed</Text>
          <FadeIn delay={40}>
            <SessionCard
              session={{ id: "s4", agent: "opencode", cwd: "/Users/dev/docs", phase: "completed", currentTool: null, lastActivity: "Added the health endpoint", subagents: 0, shells: 0, updatedAt: 0 }}
              requests={[]}
              resolve={noop}
              theme={theme}
              styles={styles}
            />
          </FadeIn>

          <Text style={styles.section}>Needs attention (no session)</Text>
          <FadeIn>
            <NeedsAttentionCard
              request={{ requestID: "o1", sessionID: "orphan", kind: "question", title: "A session asked something", options: ["Yes", "No"] }}
              resolve={resolve}
              theme={theme}
              styles={styles}
            />
          </FadeIn>

          <Text style={styles.section}>Controls</Text>
          <GradientButton label="Primary action" onPress={() => {}} styles={styles} colors={theme.accentGradient} />
          <View style={styles.actions}>
            <View style={[styles.actionInner, { backgroundColor: theme.allow }]}>
              <Text style={styles.actionText}>Allow</Text>
            </View>
            <View style={[styles.actionInner, { backgroundColor: theme.deny }]}>
              <Text style={styles.actionText}>Deny</Text>
            </View>
            <View style={[styles.actionInner, { backgroundColor: theme.option }]}>
              <Text style={styles.actionText}>Option</Text>
            </View>
          </View>
          <View style={styles.badges}>
            <Text style={styles.badge}>tool · Bash</Text>
            <Text style={styles.badge}>2 subagents</Text>
            <Text style={styles.badge}>3 shells</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </Modal>
  )
}

const brand = StyleSheet.create({
  mark: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  markText: { color: "#ffffff", fontWeight: "800", fontSize: 13, letterSpacing: 0.3 },
})

// Re-exported for convenience in tests.
export type { ReactNode }
