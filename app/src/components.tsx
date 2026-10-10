import { useRef, useState, type ReactNode } from "react"
import { Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, type StyleProp, type TextStyle } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import type { PendingRequest, QuestionOption, Session } from "./events"
import { optionValue } from "./events"
import type { Aggregate } from "./aggregate"
import type { Theme } from "./theme"
import { dirName } from "./paths"
import { formatCost } from "./format"
import { FadeIn, GlowDot, GradientSurface, HazardBar, PressableScale, Scanlines, TelemetryBars } from "./ui"
import { ThemeMark } from "./themeMark"
import type { Styles } from "./styles"

export const PHASE_COLORS: Record<string, string> = {
  running: "#2e7d32",
  "waiting-permission": "#ef6c00",
  "waiting-answer": "#1565c0",
  completed: "#616161",
}

export type Resolve = (id: string, action: string, answers?: Record<string, string>) => void

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
  accent = false,
  textColor,
}: {
  placeholder: string
  submitLabel?: string
  onSubmit: (text: string) => void
  styles: Styles
  theme: Theme
  onFieldFocus?: (y: number, h: number) => void
  accent?: boolean
  textColor?: string
}) {
  const [text, setText] = useState("")
  const inputRef = useRef<TextInput>(null)
  const submit = () => {
    const value = text.trim()
    if (!value) return
    onSubmit(value)
    setText("")
  }
  const color = accent ? textColor ?? theme.questionText : theme.text
  return (
    <View style={styles.freeformRow}>
      <TextInput
        ref={inputRef}
        style={[
          styles.freeformInput,
          accent
            ? { color, backgroundColor: "rgba(127,127,127,0.14)", borderColor: "rgba(127,127,127,0.35)" }
            : { color, backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
        ]}
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

const URL_RE = /(https?:\/\/[^\s]+)/g

function isLink(part: string): boolean {
  return /^https?:\/\//.test(part)
}

/** Renders text with http(s) URLs as tappable links that open in the browser. */
export function LinkText({
  text,
  style,
  numberOfLines,
  styles,
}: {
  text: string
  style?: StyleProp<TextStyle>
  numberOfLines?: number
  styles: Styles
}) {
  const parts = text.split(URL_RE)
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) =>
        isLink(part) ? (
          <Text key={index} style={styles.link} onPress={() => void Linking.openURL(part)}>
            {part}
          </Text>
        ) : (
          <Text key={index}>{part}</Text>
        ),
      )}
    </Text>
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
      <LinkText text={text} style={style} numberOfLines={expanded ? undefined : numberOfLines} styles={styles} />
      {canExpand ? <Text style={styles.moreLink}>{expanded ? "less" : "more"}</Text> : null}
    </TouchableOpacity>
  )
}

function OptionButton({
  option,
  selected,
  onPress,
  accessibilityLabel,
  theme,
  styles,
}: {
  option: QuestionOption
  selected?: boolean
  onPress: () => void
  accessibilityLabel: string
  theme: Theme
  styles: Styles
}) {
  const opacity = selected === false ? 0.55 : 1
  return (
    <View style={styles.optionRow}>
      <View style={styles.optionButtonWrap}>
        <PressableScale onPress={onPress} accessibilityLabel={accessibilityLabel}>
          <View style={[styles.actionInner, { backgroundColor: theme.option, opacity }]}>
            <Text style={styles.actionText}>{option.label}</Text>
          </View>
        </PressableScale>
      </View>
      {option.description ? (
        <Text style={[styles.optionDescription, { color: theme.questionText }]}>{option.description}</Text>
      ) : null}
    </View>
  )
}

export function MultiQuestionForm({
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
  const questions = request.questions ?? []
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const setAnswer = (key: string, value: string) => setAnswers((prev) => ({ ...prev, [key]: value }))
  const complete = questions.length > 0 && questions.every((question) => (answers[question.key] ?? "").trim().length > 0)

  return (
    <View>
      {questions.map((question) => {
        const selected = answers[question.key]
        return (
          <View key={question.key} style={styles.questionBlock}>
            <Text style={styles.fieldLabel}>{question.title}</Text>
            {question.summary ? <Text style={styles.fieldDescription}>{question.summary}</Text> : null}
            {question.options.length > 0 ? (
              <View style={styles.optionList}>
                {question.options.map((option) => {
                  const value = optionValue(option)
                  return (
                    <OptionButton
                      key={option.label}
                      option={option}
                      selected={selected === value}
                      onPress={() => setAnswer(question.key, value)}
                      accessibilityLabel={`${question.title}: ${option.label}`}
                      theme={theme}
                      styles={styles}
                    />
                  )
                })}
              </View>
            ) : null}
            {question.allowFreeform ? (
              <InlineInput
                placeholder="Type an answer"
                onSubmit={(value) => setAnswer(question.key, value)}
                styles={styles}
                theme={theme}
                onFieldFocus={onFieldFocus}
                accent
                textColor={theme.questionText}
              />
            ) : null}
          </View>
        )
      })}
      <View style={styles.actions}>
        <PressableScale
          disabled={!complete}
          onPress={() => complete && resolve(request.requestID, answers[questions[0].key] ?? "", answers)}
          accessibilityLabel="Submit answers"
        >
          <View style={[styles.actionInner, { backgroundColor: theme.allow, opacity: complete ? 1 : 0.5 }]}>
            <Text style={styles.actionText}>Submit</Text>
          </View>
        </PressableScale>
      </View>
    </View>
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

  if ((request.questions?.length ?? 0) > 1) {
    return <MultiQuestionForm request={request} resolve={resolve} styles={styles} theme={theme} onFieldFocus={onFieldFocus} />
  }

  const options = request.options ?? []
  return (
    <>
      {options.length > 0 ? (
        <View style={styles.optionList}>
          {options.map((option) => (
            <OptionButton
              key={option.label}
              option={option}
              onPress={() => resolve(request.requestID, optionValue(option))}
              accessibilityLabel={option.label}
              theme={theme}
              styles={styles}
            />
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
          accent
          textColor={theme.questionText}
        />
      ) : null}
    </>
  )
}

export function HeroCard({
  agg,
  theme,
  styles,
  onStart,
  onReviewWaiting,
}: {
  agg: Aggregate
  theme: Theme
  styles: Styles
  onStart?: () => void
  onReviewWaiting?: () => void
}) {
  const needsYou = agg.waitingApproval + agg.waitingAnswer
  const hasAttention = needsYou > 0
  const idle = agg.total === 0
  const border = agg.waitingApproval > 0 ? theme.permissionBorder : agg.waitingAnswer > 0 ? theme.questionBorder : theme.cardBorder
  const glow = agg.waitingApproval > 0 ? theme.permissionGlow : agg.waitingAnswer > 0 ? theme.questionGlow : theme.glow
  const nerv = theme.skin === "evangelion"
  const isStarWars = theme.skin === "starwars"
  const isSanrio = theme.skin === "sanrio"
  const isTunes = theme.skin === "tunes"
  const isClassicOS = theme.skin === "classic-os"
  const unit = theme.variant === "unit00" ? "00" : theme.variant === "unit02" ? "02" : "01"
  // MAGI cores: the three supercomputer brains mapped to the attention states.
  const cores = [
    { label: "MELCHIOR", color: PHASE_COLORS.running, count: agg.running, active: agg.running > 0 },
    { label: "BALTHASAR", color: PHASE_COLORS["waiting-permission"], count: agg.waitingApproval, active: agg.waitingApproval > 0 },
    { label: "CASPER", color: PHASE_COLORS["waiting-answer"], count: agg.waitingAnswer, active: agg.waitingAnswer > 0 },
  ]
  return (
    <GradientSurface
      colors={border}
      glow={glow}
      pulse={hasAttention}
      shimmer={hasAttention}
      shimmerLoop={hasAttention}
      animatedBorder={hasAttention}
      radius={isSanrio ? 30 : isTunes ? 0 : isClassicOS ? 10 : 22}
      nerv={nerv}
      rail={isStarWars}
      innerStyle={{ backgroundColor: theme.surface }}
    >
      {nerv ? (
        <HazardBar
          color={hasAttention ? (agg.waitingApproval > 0 ? "#f5a524" : theme.accent) : theme.accent}
          contrast={theme.dark ? "rgba(0,0,0,0.85)" : "#ffffff"}
        />
      ) : null}
      {nerv ? (
        <Scanlines color={theme.dark ? "rgba(255,255,255,0.05)" : "rgba(10,25,50,0.05)"} count={26} />
      ) : null}
      {isSanrio ? (
        <LinearGradient
          pointerEvents="none"
          colors={[`${theme.accent}22`, `${theme.accent}00`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.kittyHeroGlow}
        />
      ) : null}
      <View pointerEvents="none" style={styles.heroWatermark}>
        <ThemeMark theme={theme} size={168} />
      </View>
      <View style={styles.heroInner}>
        {isStarWars ? (
          <>
            <View style={styles.swHeader}>
              <Text style={styles.swFaction}>{theme.dark ? "SITH ORDER" : "JEDI ORDER"}</Text>
              <Text style={styles.swStatus}>{hasAttention ? "◆ ALERT" : idle ? "◇ IDLE" : "◆ READY"}</Text>
            </View>
            <View style={styles.swSaberGlow}>
              <LinearGradient
                colors={[theme.accent, "#ffffff", theme.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.swSaber}
              />
            </View>
          </>
        ) : null}
        {nerv ? (
          <>
            <View style={styles.magiHeader}>
              <Text style={styles.magiTitle}>MAGI SYSTEM</Text>
              <Text style={styles.nervTag}>EVA-{unit}</Text>
              <Text style={styles.magiStatus}>{hasAttention ? "ATTENTION" : idle ? "STANDBY" : "NOMINAL"}</Text>
            </View>
            <View style={styles.magiCores}>
              {cores.map((core) => (
                <View key={core.label} style={styles.magiCore}>
                  <View style={[styles.magiTriangle, { borderBottomColor: core.color, opacity: core.active ? 1 : 0.28 }]} />
                  <Text style={styles.magiCoreLabel}>{core.label}</Text>
                  <Text style={styles.magiCoreCount}>{core.count}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
        {isSanrio ? (
          <>
            <View style={styles.kittyHeader}>
              <View style={styles.kittyBrand}>
                <Text style={styles.kittyBow}>{theme.dark ? "🐾" : "🎀"}</Text>
                <Text style={styles.kittyTitle}>{theme.dark ? "CHOCOCAT" : "HELLO KITTY"}</Text>
              </View>
              <Text style={styles.kittyStatus}>{hasAttention ? "NEEDS YOU" : idle ? "QUIET" : "ALL GOOD"}</Text>
            </View>
            <LinearGradient
              colors={[`${theme.accent}00`, theme.accent, `${theme.accent}00`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.kittyDivider}
            />
          </>
        ) : null}
        {isTunes ? (
          <>
            <View style={styles.tunesHeader}>
              <Text style={styles.tunesTitle}>{`▶ ${theme.dark ? "CLASSIC" : "BENTO"}`}</Text>
              <Text style={styles.tunesStatus}>{hasAttention ? "NEEDS YOU" : idle ? "STOPPED" : "PLAYING"}</Text>
            </View>
            <View style={styles.tunesLevelBar}>
              <View style={styles.tunesLevelFill} />
            </View>
          </>
        ) : null}
        {isClassicOS ? (
          <>
            <LinearGradient
              colors={theme.accentGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.osTitleRow, { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 }]}
            >
              <Text style={styles.osTitleText}>CLASSIC OS</Text>
              <Text style={styles.osStatus}>{hasAttention ? "NEEDS YOU" : idle ? "IDLE" : "ACTIVE"}</Text>
            </LinearGradient>
            <View style={styles.osStartChip}>
              <Text style={styles.osStartText}>start</Text>
            </View>
          </>
        ) : null}
        {hasAttention ? (
          <>
            <Text style={styles.heroCount}>{needsYou}</Text>
            <Text style={styles.heroLabel}>{needsYou === 1 ? "agent needs you" : "agents need you"}</Text>
          </>
        ) : (
          <>
            <Text style={styles.heroStatus}>{idle ? "No active agents" : "All clear"}</Text>
            <Text style={styles.heroLabel}>{idle ? "Nothing is running" : "Nothing needs you"}</Text>
          </>
        )}
        {isStarWars ? (
          <View style={styles.swReadout}>
            <Text style={styles.swReadoutText}>WRK {agg.running}</Text>
            <Text style={styles.swReadoutText}>PRM {agg.waitingApproval}</Text>
            <Text style={styles.swReadoutText}>QST {agg.waitingAnswer}</Text>
            <Text style={styles.swReadoutText}>INA {agg.stopped}</Text>
          </View>
        ) : null}
        {nerv ? (
          <>
            <View style={{ width: "100%", marginTop: 2 }}>
              <TelemetryBars color={theme.accent} height={14} count={26} />
            </View>
            <View style={styles.nervReadout}>
            <View style={styles.nervReadoutItem}>
              <Text style={styles.nervReadoutLabel}>RUN</Text>
              <Text style={[styles.nervReadoutValue, { color: agg.running > 0 ? theme.accent : theme.textMuted }]}>{agg.running}</Text>
            </View>
            <View style={styles.nervReadoutItem}>
              <Text style={styles.nervReadoutLabel}>PRM</Text>
              <Text style={[styles.nervReadoutValue, { color: agg.waitingApproval > 0 ? theme.accent : theme.textMuted }]}>{agg.waitingApproval}</Text>
            </View>
            <View style={styles.nervReadoutItem}>
              <Text style={styles.nervReadoutLabel}>QST</Text>
              <Text style={[styles.nervReadoutValue, { color: agg.waitingAnswer > 0 ? theme.accent : theme.textMuted }]}>{agg.waitingAnswer}</Text>
            </View>
            <View style={styles.nervReadoutItem}>
              <Text style={styles.nervReadoutLabel}>INA</Text>
              <Text style={[styles.nervReadoutValue, { color: theme.textMuted }]}>{agg.stopped}</Text>
            </View>
            <View style={styles.nervReadoutItem}>
              <Text style={styles.nervReadoutLabel}>TOT</Text>
              <Text style={[styles.nervReadoutValue, { color: theme.textMuted }]}>{agg.total}</Text>
            </View>
            </View>
          </>
        ) : isSanrio ? (
          <View style={styles.kittyChips}>
            <View style={styles.kittyChip}>
              <Text style={styles.kittyChipIcon}>🐾</Text>
              <Text style={styles.kittyChipValue}>{agg.running}</Text>
              <Text style={styles.kittyChipLabel}>working</Text>
            </View>
            <View style={styles.kittyChip}>
              <Text style={styles.kittyChipIcon}>💤</Text>
              <Text style={styles.kittyChipValue}>{agg.stopped}</Text>
              <Text style={styles.kittyChipLabel}>inactive</Text>
            </View>
            {agg.waitingApproval > 0 ? (
              <View style={styles.kittyChip}>
                <Text style={styles.kittyChipIcon}>🔔</Text>
                <Text style={styles.kittyChipValue}>{agg.waitingApproval}</Text>
                <Text style={styles.kittyChipLabel}>permission</Text>
              </View>
            ) : null}
            {agg.waitingAnswer > 0 ? (
              <View style={styles.kittyChip}>
                <Text style={styles.kittyChipIcon}>💬</Text>
                <Text style={styles.kittyChipValue}>{agg.waitingAnswer}</Text>
                <Text style={styles.kittyChipLabel}>question</Text>
              </View>
            ) : null}
          </View>
        ) : isStarWars || isTunes ? null : (
          <>
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
            {hasAttention ? (
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
            ) : null}
          </>
        )}
        {isTunes ? (
          <View style={styles.tunesReadout}>
            <Text style={styles.tunesReadoutText}>WRK {agg.running}</Text>
            <Text style={styles.tunesReadoutText}>PRM {agg.waitingApproval}</Text>
            <Text style={styles.tunesReadoutText}>QST {agg.waitingAnswer}</Text>
            <Text style={styles.tunesReadoutText}>INA {agg.stopped}</Text>
          </View>
        ) : null}
        {(hasAttention && onReviewWaiting) || onStart ? (
          <View style={styles.heroActions}>
            {hasAttention && onReviewWaiting ? (
              <GradientButton
                label={`Review ${needsYou} waiting`}
                onPress={onReviewWaiting}
                styles={styles}
                colors={agg.waitingApproval > 0 ? theme.permissionBorder : theme.questionBorder}
              />
            ) : null}
            {onStart ? (
              <PressableScale onPress={onStart} accessibilityLabel="Start a new session">
                <View style={styles.heroSecondary}>
                  <Text style={styles.heroSecondaryText}>New session</Text>
                </View>
              </PressableScale>
            ) : null}
          </View>
        ) : null}
      </View>
      {nerv ? (
        <HazardBar
          color={hasAttention ? (agg.waitingApproval > 0 ? "#f5a524" : theme.accent) : theme.accent}
          contrast={theme.dark ? "rgba(0,0,0,0.85)" : "#ffffff"}
          height={3}
        />
      ) : null}
    </GradientSurface>
  )
}

export function CompactHero({
  agg,
  server,
  connected,
  theme,
  styles,
}: {
  agg: Aggregate
  server?: string
  connected?: boolean
  theme: Theme
  styles: Styles
}) {
  const stats = [
    { color: PHASE_COLORS.running, count: agg.running, pulse: agg.running > 0 },
    { color: PHASE_COLORS["waiting-permission"], count: agg.waitingApproval, pulse: agg.waitingApproval > 0 },
    { color: PHASE_COLORS["waiting-answer"], count: agg.waitingAnswer, pulse: agg.waitingAnswer > 0 },
    { color: PHASE_COLORS.completed, count: agg.stopped, pulse: false },
  ]
  return (
    <View style={styles.compactRow}>
      <View style={styles.compactBrand}>
        <ThemeMark theme={theme} size={26} />
        {server ? (
          <View style={styles.compactServerPill}>
            <GlowDot color={connected ? theme.allow : theme.deny} size={6} pulse={!connected} />
            <Text style={styles.compactServerText} numberOfLines={1}>
              {server}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.compactDots}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.compactItem}>
            <GlowDot color={stat.color} size={8} pulse={stat.pulse} />
            <Text style={styles.compactCount}>{stat.count}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
  theme,
  styles,
}: {
  visible: boolean
  title: string
  message?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  theme: Theme
  styles: Styles
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.confirmBackdrop}>
        <View style={[styles.confirmCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={styles.confirmTitle}>{title}</Text>
          {message ? <Text style={styles.confirmMessage}>{message}</Text> : null}
          <View style={styles.confirmActions}>
            <PressableScale onPress={onCancel} accessibilityLabel="Cancel">
              <View style={[styles.actionInner, { backgroundColor: theme.badgeBg }]}>
                <Text style={[styles.actionText, { color: theme.text }]}>Cancel</Text>
              </View>
            </PressableScale>
            <PressableScale onPress={onConfirm} accessibilityLabel={confirmLabel}>
              <View style={[styles.actionInner, { backgroundColor: theme.deny }]}>
                <Text style={styles.actionText}>{confirmLabel}</Text>
              </View>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  )
}

export function SwitcherModal({
  visible,
  agents,
  models,
  currentAgent,
  currentModel,
  onSelectAgent,
  onSelectModel,
  onClose,
  theme,
  styles,
}: {
  visible: boolean
  agents: string[]
  models: { providerID: string; id: string; name?: string }[]
  currentAgent?: string
  currentModel?: string
  onSelectAgent: (agent: string) => void
  onSelectModel: (model: { providerID: string; id: string }) => void
  onClose: () => void
  theme: Theme
  styles: Styles
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.confirmBackdrop}>
        <View style={[styles.confirmCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={styles.confirmTitle}>Mode &amp; model</Text>
          <ScrollView style={styles.switcherScroll}>
            <Text style={styles.section}>Mode</Text>
            {agents.length === 0 ? (
              <Text style={styles.empty}>No modes reported</Text>
            ) : (
              agents.map((agent) => (
                <TouchableOpacity key={agent} style={styles.switcherItem} onPress={() => onSelectAgent(agent)}>
                  <Text style={[styles.switcherItemText, agent === currentAgent ? { color: theme.accent } : null]}>{agent}</Text>
                  {agent === currentAgent ? <Text style={styles.switcherCheck}>✓</Text> : null}
                </TouchableOpacity>
              ))
            )}
            <Text style={styles.section}>Model</Text>
            {models.length === 0 ? (
              <Text style={styles.empty}>No models reported</Text>
            ) : (
              models.map((model) => {
                const label = `${model.providerID}/${model.id}`
                return (
                  <TouchableOpacity key={label} style={styles.switcherItem} onPress={() => onSelectModel({ providerID: model.providerID, id: model.id })}>
                    <Text style={[styles.switcherItemText, label === currentModel ? { color: theme.accent } : null]}>{label}</Text>
                    {label === currentModel ? <Text style={styles.switcherCheck}>✓</Text> : null}
                  </TouchableOpacity>
                )
              })
            )}
          </ScrollView>
          <View style={styles.confirmActions}>
            <PressableScale onPress={onClose} accessibilityLabel="Done">
              <View style={[styles.actionInner, { backgroundColor: theme.badgeBg }]}>
                <Text style={[styles.actionText, { color: theme.text }]}>Done</Text>
              </View>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  )
}

export function ManualConnectModal({
  visible,
  error,
  onConnect,
  onClose,
  theme,
  styles,
}: {
  visible: boolean
  error?: string | null
  onConnect: (address: string, port: string) => void
  onClose: () => void
  theme: Theme
  styles: Styles
}) {
  const [address, setAddress] = useState("")
  const [port, setPort] = useState("38963")
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.confirmBackdrop}>
        <View style={[styles.confirmCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={styles.confirmTitle}>Connect by address</Text>
          <Text style={styles.confirmMessage}>
            Use this when the Mac is not discoverable over Bluetooth. Enter the address and port the helper shows.
          </Text>
          <Text style={styles.fieldLabel}>Address</Text>
          <TextInput
            style={styles.inputFull}
            value={address}
            onChangeText={setAddress}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="192.168.1.10"
            placeholderTextColor={theme.textMuted}
            accessibilityLabel="Address"
          />
          <Text style={styles.fieldLabel}>Port</Text>
          <TextInput
            style={styles.inputFull}
            value={port}
            onChangeText={setPort}
            keyboardType="number-pad"
            placeholder="38963"
            placeholderTextColor={theme.textMuted}
            accessibilityLabel="Port"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.confirmActions}>
            <PressableScale onPress={onClose} accessibilityLabel="Cancel">
              <View style={[styles.actionInner, { backgroundColor: theme.badgeBg }]}>
                <Text style={[styles.actionText, { color: theme.text }]}>Cancel</Text>
              </View>
            </PressableScale>
            <PressableScale onPress={() => onConnect(address, port)} accessibilityLabel="Connect">
              <View style={[styles.actionInner, { backgroundColor: theme.allow }]}>
                <Text style={styles.actionText}>Connect</Text>
              </View>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  )
}

export function PairingCodeModal({
  visible,
  error,
  onSubmit,
  onCancel,
  theme,
  styles,
}: {
  visible: boolean
  error?: string | null
  onSubmit: (code: string) => void
  onCancel: () => void
  theme: Theme
  styles: Styles
}) {
  const [code, setCode] = useState("")
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.confirmBackdrop}>
        <View style={[styles.confirmCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={styles.confirmTitle}>Enter the pairing code</Text>
          <Text style={styles.confirmMessage}>
            Type the code shown on your Mac (open the informer helper menu) to finish pairing.
          </Text>
          <TextInput
            style={styles.inputFull}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="123456"
            placeholderTextColor={theme.textMuted}
            accessibilityLabel="Pairing code"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.confirmActions}>
            <PressableScale onPress={onCancel} accessibilityLabel="Cancel">
              <View style={[styles.actionInner, { backgroundColor: theme.badgeBg }]}>
                <Text style={[styles.actionText, { color: theme.text }]}>Cancel</Text>
              </View>
            </PressableScale>
            <PressableScale onPress={() => onSubmit(code)} accessibilityLabel="Pair">
              <View style={[styles.actionInner, { backgroundColor: theme.allow }]}>
                <Text style={styles.actionText}>Pair</Text>
              </View>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  )
}

function MessageModal({
  text,
  onClose,
  theme,
  styles,
}: {
  text: string
  onClose: () => void
  theme: Theme
  styles: Styles
}) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.confirmBackdrop}>
        <View style={[styles.confirmCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={styles.confirmTitle}>Message</Text>
          <ScrollView style={styles.messageScroll}>
            <LinkText text={text} style={styles.messageFull} styles={styles} />
          </ScrollView>
          <View style={styles.confirmActions}>
            <PressableScale onPress={onClose} accessibilityLabel="Close">
              <View style={[styles.actionInner, { backgroundColor: theme.badgeBg }]}>
                <Text style={[styles.actionText, { color: theme.text }]}>Close</Text>
              </View>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  )
}

function ActivityCard({ text, theme, styles }: { text: string; theme: Theme; styles: Styles }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <PressableScale onPress={() => setOpen(true)} accessibilityLabel="Read full message">
        <View style={styles.messageCard}>
          <LinkText text={text} style={styles.activityText} numberOfLines={3} styles={styles} />
        </View>
      </PressableScale>
      {open ? <MessageModal text={text} onClose={() => setOpen(false)} theme={theme} styles={styles} /> : null}
    </>
  )
}

function ActivityHistory({
  session,
  theme,
  styles,
  expand = false,
}: {
  session: Session
  theme: Theme
  styles: Styles
  expand?: boolean
}) {
  const [showEarlier, setShowEarlier] = useState(false)
  const history = session.activityHistory ?? (session.lastActivity ? [session.lastActivity] : [])
  if (history.length === 0) return null
  const latest = history[history.length - 1]
  const older = history.slice(0, -1)
  const visible = expand || showEarlier ? history : [latest]
  return (
    <View style={styles.activityBlock}>
      {!expand && older.length > 0 ? (
        <TouchableOpacity onPress={() => setShowEarlier((value) => !value)} activeOpacity={0.7}>
          <Text style={styles.moreLink}>{showEarlier ? "hide earlier" : `show earlier (${older.length})`}</Text>
        </TouchableOpacity>
      ) : null}
      {visible.map((text, index) => (
        <ActivityCard key={`${index}-${text.slice(0, 16)}`} text={text} theme={theme} styles={styles} />
      ))}
    </View>
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
  onStop,
  onClose,
  onOpenSwitcher,
}: {
  session: Session
  requests: PendingRequest[]
  resolve: Resolve
  theme: Theme
  styles: Styles
  onFieldFocus?: (y: number, h: number) => void
  onSendPrompt?: (sessionID: string, text: string) => void
  onStop?: (sessionID: string) => void
  onClose?: (sessionID: string) => void
  onOpenSwitcher?: (session: Session) => void
}) {
  const request = requests[0]
  const isQuestion = request?.kind === "question"
  const isClassicOS = theme.skin === "classic-os"
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
      radius={theme.skin === "tunes" ? 0 : theme.skin === "classic-os" ? 10 : 18}
      nerv={theme.skin === "evangelion"}
      rail={theme.skin === "starwars"}
      innerStyle={{ backgroundColor: theme.surface }}
    >
      {isClassicOS ? (
        <LinearGradient colors={theme.accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.osWindowBar}>
          <GlowDot color="#ffffff" size={8} pulse={session.phase === "running"} />
          <Text style={styles.osWindowTitle} numberOfLines={1}>
            {session.title || dirName(session.cwd) || session.id}
          </Text>
          <Text style={styles.osWindowPhase}>{session.phase}</Text>
          {(session.phase === "running" || session.phase === "waiting-permission" || session.phase === "waiting-answer") && onStop ? (
            <PressableScale onPress={() => onStop(session.id)} accessibilityLabel="Stop">
              <View style={styles.osCtlBtn}>
                <Text style={styles.osCtlGlyph}>■</Text>
              </View>
            </PressableScale>
          ) : null}
          {onClose ? (
            <PressableScale onPress={() => onClose(session.id)} accessibilityLabel="Close session">
              <View style={[styles.osCtlBtn, styles.osCloseBtn]}>
                <Text style={styles.osCloseGlyph}>✕</Text>
              </View>
            </PressableScale>
          ) : null}
        </LinearGradient>
      ) : null}
      {isClassicOS && session.cwd ? (
        <View style={styles.osAddressBar}>
          <Text style={styles.osAddressIcon}>📁</Text>
          <Text style={styles.osAddressText} numberOfLines={1}>
            {dirName(session.cwd)}
          </Text>
        </View>
      ) : null}
      <View style={styles.cardPad}>
        {isClassicOS ? null : (
          <View style={styles.sessionHeader}>
            <GlowDot color={PHASE_COLORS[session.phase] ?? theme.textMuted} size={9} pulse={session.phase === "running"} />
            <Text style={styles.sessionTitle} numberOfLines={1}>
              {session.title || dirName(session.cwd) || session.id}
            </Text>
            {(session.phase === "running" || session.phase === "waiting-permission" || session.phase === "waiting-answer") && onStop ? (
              <PressableScale onPress={() => onStop(session.id)} accessibilityLabel="Stop">
                <View style={styles.stopButton}>
                  <Text style={styles.stopButtonText}>Stop</Text>
                </View>
              </PressableScale>
            ) : null}
            <Text style={styles.sessionPhase}>{session.phase}</Text>
            {onClose ? (
              <PressableScale onPress={() => onClose(session.id)} accessibilityLabel="Close session">
                <Text style={styles.closeButton}>×</Text>
              </PressableScale>
            ) : null}
          </View>
        )}
        <View style={styles.metaRow}>
          {session.cwd && !isClassicOS ? <Text style={styles.dirChip}>{dirName(session.cwd)}</Text> : null}
          <PressableScale onPress={() => onOpenSwitcher?.(session)} accessibilityLabel="Change mode and model">
            <Text style={styles.metaChip}>
              {session.agent || "agent"}
              {session.model ? ` · ${session.model}` : ""}
            </Text>
          </PressableScale>
          {typeof session.cost === "number" ? <Text style={styles.costChip}>{formatCost(session.cost)}</Text> : null}
        </View>
        <View style={styles.badges}>
          {session.currentTool ? <Text style={styles.badge}>tool · {session.currentTool}</Text> : null}
          <Text style={styles.badge}>{session.subagents ?? 0} subagents</Text>
          <Text style={styles.badge}>{session.shells ?? 0} shells</Text>
        </View>
        <ActivityHistory session={session} theme={theme} styles={styles} expand={Boolean(request)} />
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
    <GradientSurface colors={border} glow={glow} pulse shimmer animatedBorder radius={theme.skin === "tunes" ? 0 : theme.skin === "classic-os" ? 10 : 18} nerv={theme.skin === "evangelion"} rail={theme.skin === "starwars"} innerStyle={{ backgroundColor: theme.surface }}>
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
              requests={[{ requestID: "q1", sessionID: "s3", kind: "question", title: "Which database should I use?", options: [{ label: "PostgreSQL", description: "Managed relational database" }, { label: "SQLite" }, { label: "MySQL" }] }]}
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
              request={{ requestID: "o1", sessionID: "orphan", kind: "question", title: "A session asked something", options: [{ label: "Yes" }, { label: "No" }] }}
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
