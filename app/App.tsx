import { StatusBar } from "expo-status-bar"
import Constants from "expo-constants"
import * as Clipboard from "expo-clipboard"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Animated, Dimensions, Keyboard, KeyboardAvoidingView, LayoutAnimation, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, Switch, Text, TextInput, TouchableOpacity, UIManager, useColorScheme, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context"
import { useBridge } from "./src/useBridge"
import { orderSessions, type PendingRequest, type Session } from "./src/events"
import { sessionPresentation, toggleExpanded, type SessionLayout } from "./src/layout"
import { aggregate } from "./src/aggregate"
import { readableInk, resolveTheme, SKINS, skinDef, themeSelection, type SkinId } from "./src/theme"
import { createStyles } from "./src/styles"
import { liveActivity } from "./src/liveActivity"
import { joinHostPort } from "./src/manualConnect"
import { CompactHero, CompactSessionCard, ConfirmModal, GradientButton, HeroCard, ManualConnectModal, NeedsAttentionCard, PairingCodeModal, PreviewScreen, SessionCard, SessionGrid, SessionsLayoutToggle, SwitcherModal } from "./src/components"
import { ThemeMark } from "./src/themeMark"
import { ScreenBackdrop } from "./src/terminalArt"
import { DemoScreen } from "./src/DemoScreen"
import { Ionicons } from "@expo/vector-icons"
import { TIP_IDS, TipStore } from "./src/purchases"
import { createIapAdapter, initIap } from "./src/iapAdapter"
import { FadeIn, GlowDot, PressableScale, useReducedMotion } from "./src/ui"
import { CTA, connectionLabel, relativeTime } from "./src/copy"
import { isStale } from "./src/staleness"
import { requestNotificationPermission } from "./src/pushNotifications"
import { haptics } from "./src/haptics"
import { DURATION, EASE } from "./src/motion"

const APP_DESCRIPTION =
  "OpenCode Informer mirrors your OpenCode agents to this phone: watch their activity, get notified when one needs you, and approve or answer right from the Lock Screen — over your local WiFi and Bluetooth, with no server."

// Humorous copy for the optional tips — the point is that a tip unlocks nothing.
const TIP_COPY = [
  { iconName: "cafe-outline" as const, title: "A modest nothing", blurb: "You receive exactly no features. The app stays free either way — thanks for the kindness." },
  { iconName: "pizza-outline" as const, title: "Three times the nothing", blurb: "Still nothing, but generously tripled. It supports development, which is the whole point." },
  { iconName: "rocket-outline" as const, title: "The complete nothing", blurb: "The full nothing experience. Unlocks nothing, forever, with style." },
]

// Three cards fully + half of the next card in the bordered theme list.
const THEME_GAP = 4
const SETUP_URL = "https://github.com/sithartha/opencode-informer#readme"
const PRIVACY_URL = "https://github.com/sithartha/opencode-informer/blob/main/docs/privacy-policy.md"


function MeasuredCard({
  id,
  onFrame,
  onLayout,
  style,
  children,
}: {
  id: string
  onFrame: (id: string, y: number, height: number) => void
  onLayout?: (event: LayoutChangeEvent) => void
  style?: StyleProp<ViewStyle>
  children: React.ReactNode
}) {
  const ref = useRef<View>(null)
  return (
    <View
      ref={ref}
      style={style}
      onLayout={(event) => {
        onLayout?.(event)
        ref.current?.measureInWindow((_x, y, _width, height) => onFrame(id, y, height))
      }}
    >
      {children}
    </View>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppScreen />
    </SafeAreaProvider>
  )
}

function AppScreen() {
  const insets = useSafeAreaInsets()
  const {
    appState,
    connection,
    paired,
    connect,
    connectManual,
    disconnect,
    resolve,
    sendPrompt,
    startSession,
    stopSession,
    closeSession,
    switchSession,
    loadOptions,
    liveActivityEnabled,
    setLiveActivityOn,
    deviceName,
    skin,
    themeOption,
    setSkinAndOption,
    setThemeOption,
    pairingCodeRequest,
    pairingCodeError,
    submitPairingCode,
    cancelPairingCode,
    diagnostic,
    lastUpdatedAt,
    refresh,
  } = useBridge()

  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true)
    }
  }, [])

  const [nowTick, setNowTick] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])
  const stale = isStale(lastUpdatedAt, nowTick)
  const [refreshing, setRefreshing] = useState(false)
  const [starting, setStarting] = useState(false)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [buyingTip, setBuyingTip] = useState<string | null>(null)
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  const systemScheme = useColorScheme()
  const reduceMotion = useReducedMotion()
  const theme = resolveTheme(skin, themeOption, systemScheme)
  const styles = useMemo(() => createStyles(theme), [theme])

  // Store the theme before effects run (so the activity starts with the right
  // palette); re-theme a running activity when the theme changes.
  liveActivity.setTheme(theme)
  useEffect(() => {
    liveActivity.refreshTheme()
  }, [theme])

  const wasConnected = useRef(false)
  useEffect(() => {
    if (connection.status === "connected" && !wasConnected.current) haptics.success()
    wasConnected.current = connection.status === "connected"
  }, [connection.status])

  const [showManual, setShowManual] = useState(false)
  const [sessionLayout, setSessionLayout] = useState<SessionLayout>("compact")
  const [expandedSessionID, setExpandedSessionID] = useState<string | null>(null)
  const [manualError, setManualError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  const [tipProducts, setTipProducts] = useState<{ id: string; price: string }[]>([])
  const [tipError, setTipError] = useState<string | null>(null)
  const [themesBoxHeight, setThemesBoxHeight] = useState(0)
  const [confirmAction, setConfirmAction] = useState<{ kind: "stop" | "close"; sessionID?: string } | null>(null)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [switcherSession, setSwitcherSession] = useState<Session | null>(null)
  const [switchOptions, setSwitchOptions] = useState<{ agents: string[]; models: { providerID: string; id: string; name?: string }[] }>({ agents: [], models: [] })
  const [startDraft, setStartDraft] = useState<{ agent?: string; model?: { providerID: string; id: string } } | null>(null)

  const scrollRef = useRef<ScrollView>(null)
  const themeListRef = useRef<ScrollView>(null)
  const framesRef = useRef<Record<string, { y: number; height: number }>>({})
  const visibleRef = useRef<Set<string>>(new Set())
  const lastVisibilityRef = useRef(0)
  const [visibleSessionIDs, setVisibleSessionIDs] = useState<Set<string>>(new Set())
  const appVersion = Constants.expoConfig?.version ?? "0.1.1"
  const offsetRef = useRef(0)
  const waitingYRef = useRef(0)
  const markWaiting = useCallback((event: LayoutChangeEvent) => {
    waitingYRef.current = event.nativeEvent.layout.y
  }, [])
  const scrollToWaiting = useCallback(() => {
    scrollRef.current?.scrollTo({ y: Math.max(0, waitingYRef.current - 12), animated: true })
  }, [])

  // Scroll-driven collapse of the hero into the pinned compact bar.
  const heroScrollY = useRef(new Animated.Value(0)).current
  // The hero's measured layout (position + height within the scroll content) drives
  // the collapse, so the expanded hero stays in step with the scroll over its whole
  // height instead of fading out early and leaving a gap before the content below.
  const [heroLayout, setHeroLayout] = useState<{ y: number; height: number } | null>(null)
  const heroBottom = heroLayout ? Math.max(160, heroLayout.y + heroLayout.height) : 320
  const heroCompactStart = Math.max(0, heroBottom - 140)
  const heroExpandedOpacity = heroScrollY.interpolate({ inputRange: [0, heroBottom], outputRange: [1, 0], extrapolate: "clamp" })
  const heroExpandedScale = heroScrollY.interpolate({ inputRange: [0, heroBottom], outputRange: [1, 0.97], extrapolate: "clamp" })
  const heroExpandedTranslate = heroScrollY.interpolate({ inputRange: [0, heroBottom], outputRange: [0, -16], extrapolate: "clamp" })
  const heroCompactOpacity = heroScrollY.interpolate({ inputRange: [heroCompactStart, heroBottom], outputRange: [0, 1], extrapolate: "clamp" })
  const heroCompactTranslate = heroScrollY.interpolate({ inputRange: [heroCompactStart, heroBottom], outputRange: [-8, 0], extrapolate: "clamp" })
  const keyboardRef = useRef(0)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", (event) => {
      keyboardRef.current = event.endCoordinates?.height ?? 0
      setKeyboardHeight(keyboardRef.current)
    })
    const hide = Keyboard.addListener("keyboardWillHide", () => {
      keyboardRef.current = 0
      setKeyboardHeight(0)
    })
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])
  // Bring the focused answer field just above the keyboard.
  const focusField = useCallback((y: number, h: number) => {
    const windowHeight = Dimensions.get("window").height
    const keyboard = keyboardRef.current || 300
    const visibleBottom = windowHeight - keyboard - 12
    const fieldBottom = y + h
    if (fieldBottom > visibleBottom) {
      scrollRef.current?.scrollTo({ y: offsetRef.current + (fieldBottom - visibleBottom), animated: true })
    }
  }, [])

  const registerFrame = useCallback((id: string, y: number, height: number) => {
    framesRef.current[id] = { y: y + offsetRef.current, height }
    updateVisible(offsetRef.current)
  }, [])

  const updateVisible = useCallback((offset: number) => {
    const now = Date.now()
    if (now - lastVisibilityRef.current < 100) return
    lastVisibilityRef.current = now
    const height = Dimensions.get("window").height
    const next = new Set<string>()
    for (const [id, frame] of Object.entries(framesRef.current)) {
      if (frame.y + frame.height > offset && frame.y < offset + height) next.add(id)
    }
    if (next.size !== visibleRef.current.size || [...next].some((id) => !visibleRef.current.has(id))) {
      visibleRef.current = next
      setVisibleSessionIDs(next)
    }
  }, [])

  const openSwitcher = useCallback(
    async (session: Session) => {
      setSwitcherSession(session)
      setOptionsLoading(true)
      try {
        setSwitchOptions(await loadOptions())
      } finally {
        setOptionsLoading(false)
      }
    },
    [loadOptions],
  )

  // Start a session: ask for a mode and a model first (skip a step when the bridge
  // reports none), then create the session with the selection.
  const beginStart = useCallback(async () => {
    if (starting) return
    setStarting(true)
    try {
      const options = await loadOptions()
      setSwitchOptions(options)
      if (options.agents.length === 0 && options.models.length === 0) {
        await startSession()
        return
      }
      setStartDraft({})
    } finally {
      setStarting(false)
    }
  }, [loadOptions, startSession, starting])

  const confirmPending = useCallback(async () => {
    const action = confirmAction
    setConfirmAction(null)
    if (!action) return
    haptics.commit()
    if (action.kind === "stop" && action.sessionID) await stopSession(action.sessionID)
    else if (action.kind === "close" && action.sessionID) await closeSession(action.sessionID)
  }, [confirmAction, stopSession, closeSession])

  const pending = Object.values(appState.pending)
  const agg = aggregate(appState)

  // Attention first, then working, then inactive. Within the attention tier the
  // most recently arrived request comes first (see orderSessions).
  const pendingRank = new Map<string, number>()
  pending.forEach((request, index) => pendingRank.set(request.sessionID, index))
  const sessions = orderSessions(Object.values(appState.sessions), pendingRank)

  const pendingBySession: Record<string, PendingRequest[]> = {}
  for (const request of pending) {
    // Newest first within a session so the card shows the latest request.
    ;(pendingBySession[request.sessionID] ??= []).unshift(request)
  }
  const orphanPending = pending.filter((request) => !appState.sessions[request.sessionID]).reverse()
  const firstWaitingSessionID = sessions.find((session) => (pendingBySession[session.id] ?? []).length > 0)?.id

  const sessionCard = (session: Session, onCollapse?: () => void, attentionActive = true, avatarAnimated = true) => (
    <SessionCard
      session={session}
      requests={pendingBySession[session.id] ?? []}
      resolve={resolve}
      theme={theme}
      styles={styles}
      onFieldFocus={focusField}
      onSendPrompt={sendPrompt}
      onStop={(sessionID) => setConfirmAction({ kind: "stop", sessionID })}
      onClose={(sessionID) => setConfirmAction({ kind: "close", sessionID })}
      onOpenSwitcher={(value) => void openSwitcher(value)}
      onCollapse={onCollapse}
      attentionActive={attentionActive}
      avatarAnimated={avatarAnimated}
    />
  )

  const themeFade = useRef(new Animated.Value(1)).current
  const firstTheme = useRef(true)
  useEffect(() => {
    if (firstTheme.current) {
      firstTheme.current = false
      return
    }
    themeFade.setValue(0.92)
    Animated.timing(themeFade, { toValue: 1, duration: DURATION.base, easing: EASE.out, useNativeDriver: true }).start()
  }, [theme.skin, theme.variant, themeFade])

  const statusColor =
    connection.status === "connected"
      ? theme.allow
      : connection.status === "disconnected"
        ? theme.deny
        : theme.skin === "terminal"
          ? theme.pendingBorder
          : theme.accent

  const tipStore = useRef(new TipStore(createIapAdapter())).current
  useEffect(() => {
    void initIap()
    void tipStore
      .load()
      .then((products) => setTipProducts(products.map((product) => ({ id: product.id, price: product.price }))))
      .catch(() => undefined)
  }, [tipStore])

  const tips = TIP_IDS.map((id, index) => ({
    id,
    price: tipProducts.find((product) => product.id === id)?.price ?? ["$0.99", "$2.99", "$5.99"][index],
    iconName: TIP_COPY[index].iconName,
    title: TIP_COPY[index].title,
    blurb: TIP_COPY[index].blurb,
    recommended: index === 1,
  }))
  // Three cards fully + half a card: cardHeight = (boxHeight - gaps) / 3.5.
  const themeCardHeight = themesBoxHeight > 0 ? (themesBoxHeight - THEME_GAP * 3) / 3.5 : 84
  const previewStylesBySkin = useMemo(() => {
    const map = new Map<SkinId, ReturnType<typeof createStyles>>()
    for (const entry of SKINS) {
      const preview = entry.options.some((option) => option.id === "system")
        ? entry.resolve("system", theme.dark ? "dark" : "light")
        : entry.resolve((entry.options.find((option) => entry.resolve(option.id, systemScheme).dark === theme.dark) ?? entry.options[0]).id, systemScheme)
      map.set(entry.id, createStyles(preview))
    }
    return map
  }, [theme.dark, systemScheme])

  const selectTheme = (next: SkinId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    haptics.selection()
    const selection = themeSelection(next, systemScheme)
    void setSkinAndOption(selection.skin, selection.option)
  }
  const buyTip = (id: string) => {
    if (buyingTip) return
    setTipError(null)
    setBuyingTip(id)
    void tipStore
      .buy(id)
      .then((result) => {
        if (result.status === "error") {
          haptics.error()
          setTipError(result.error ?? "Purchase failed. Try again.")
        } else {
          haptics.success()
        }
      })
      .finally(() => setBuyingTip(null))
  }

  return (
    <Animated.View style={[styles.root, { opacity: themeFade }]}>
    <LinearGradient colors={theme.bgGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.root}>
      <StatusBar style={theme.dark ? "light" : "dark"} />
      <ScreenBackdrop theme={theme} />
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void refresh().finally(() => setRefreshing(false))
            }}
            tintColor={theme.accent}
          />
        }
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: heroScrollY } } }], {
          useNativeDriver: true,
          listener: (event: { nativeEvent: { contentOffset: { y: number } } }) => {
            offsetRef.current = event.nativeEvent.contentOffset.y
            updateVisible(offsetRef.current)
          },
        })}
        scrollEventThrottle={16}
      >
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <ThemeMark theme={theme} />
            <Text style={styles.title}>OI</Text>
          </View>
          <PressableScale onPress={() => setShowSettings(true)} accessibilityLabel="Settings">
            <Text style={styles.settingsLink}>Settings</Text>
          </PressableScale>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={styles.statusPill} accessible accessibilityLabel={`Connection: ${connectionLabel(connection.status, connection.macName)}`}>
            <GlowDot color={statusColor} size={8} pulse={connection.status === "connecting" || connection.status === "discovering"} glyph={theme.skin === "terminal"} />
            <Text style={styles.statusText}>{connectionLabel(connection.status, connection.macName)}</Text>
          </View>
          {paired && connection.status !== "connected" ? (
            <PressableScale onPress={() => void connect(true)} accessibilityLabel={CTA.reconnect}>
              <Text style={styles.settingsLink}>{CTA.reconnect}</Text>
            </PressableScale>
          ) : null}
        </View>
        {paired && lastUpdatedAt > 0 ? (
          <Text style={stale ? styles.error : styles.hint}>Updated {relativeTime(nowTick - lastUpdatedAt)}{stale ? " · pull to refresh" : ""}</Text>
        ) : null}
        {connection.error ? <Text style={styles.error} accessibilityLiveRegion="polite">{connection.error}</Text> : null}

        <Animated.View
          onLayout={(event) => {
            const { y, height } = event.nativeEvent.layout
            setHeroLayout((prev) => (prev && prev.y === y && prev.height === height ? prev : { y, height }))
          }}
          style={[
            styles.heroWrap,
            reduceMotion
              ? null
              : { opacity: heroExpandedOpacity, transform: [{ scale: heroExpandedScale }, { translateY: heroExpandedTranslate }] },
          ]}
        >
          <HeroCard agg={agg} theme={theme} styles={styles} starting={starting} onStart={() => void beginStart()} onReviewWaiting={scrollToWaiting} />
        </Animated.View>

        {!paired ? (
          <View style={styles.connectBlock}>
            <View style={styles.setupCard}>
              <Text style={styles.setupTitle}>Connect this phone to your Mac</Text>
              <Text style={styles.setupStep}>1. Install and run the OpenCode informer helper on your Mac.</Text>
              <Text style={styles.setupStep}>2. Keep this phone and the Mac on the same network.</Text>
              <Text style={styles.setupStep}>3. Connect below; a short pairing code finishes setup.</Text>
              <Text style={styles.link} accessibilityRole="link" onPress={() => void Linking.openURL(SETUP_URL)}>Open the setup guide</Text>
              <Text style={styles.fieldDescription}>We ask for Bluetooth and local network access only to find and reach your Mac.</Text>
            </View>
            <GradientButton
              label={connection.status === "discovering" || connection.status === "connecting" ? "Searching…" : "Find nearby computer"}
              onPress={() => void connect(true)}
              styles={styles}
              colors={theme.accentGradient}
            />
            <Text style={styles.hint}>
              {connection.status === "discovering" || connection.status === "connecting"
                ? "Searching for the computer over Bluetooth…"
                : "or connect by address (no Bluetooth)"}
            </Text>
            <GradientButton
              label="Connect by address"
              onPress={() => {
                setManualError(null)
                setShowManual(true)
              }}
              styles={styles}
              colors={theme.accentGradient}
            />
          </View>
        ) : null}

        {orphanPending.length > 0 ? (
          <>
            <Text style={styles.section}>Needs attention</Text>
            {orphanPending.map((request, index) => (
              <View key={request.requestID} onLayout={index === 0 ? markWaiting : undefined}>
                <FadeIn delay={Math.min(index * 50, 150)} style={styles.cardGap}>
                  <NeedsAttentionCard request={request} resolve={resolve} theme={theme} styles={styles} onFieldFocus={focusField} attentionActive={index === 0} />
                </FadeIn>
              </View>
            ))}
          </>
        ) : null}

        <View style={styles.sessionsHeaderRow}>
          <Text style={[styles.section, styles.sessionsHeadingInRow]}>Sessions</Text>
          <SessionsLayoutToggle layout={sessionLayout} onChange={setSessionLayout} styles={styles} />
        </View>
        {sessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.empty}>No active sessions</Text>
            <Text style={styles.emptyHint}>{paired ? "Start an OpenCode agent on your Mac, or try the demo." : "Connect to your Mac to see its OpenCode agents."}</Text>
            <View style={styles.demoActions}>
              {paired ? (
                <GradientButton label={starting ? "Starting…" : CTA.start} onPress={() => void beginStart()} styles={styles} colors={theme.accentGradient} />
              ) : null}
              <GradientButton label={CTA.demo} onPress={() => setShowDemo(true)} styles={styles} colors={theme.accentGradient} />
            </View>
          </View>
        ) : null}
        {sessionLayout === "full"
          ? sessions.map((session, index) => (
              <MeasuredCard
                key={session.id}
                id={session.id}
                onFrame={registerFrame}
                onLayout={orphanPending.length === 0 && session.id === firstWaitingSessionID ? markWaiting : undefined}
              >
                <FadeIn delay={Math.min(index * 50, 150)} style={styles.cardGap}>
                  {sessionCard(session, undefined, session.id === firstWaitingSessionID, visibleSessionIDs.size === 0 || visibleSessionIDs.has(session.id))}
                </FadeIn>
              </MeasuredCard>
            ))
          : (
              <SessionGrid styles={styles}>
                {(itemWidth) =>
                  sessions.map((session, index) => {
                    const requests = pendingBySession[session.id] ?? []
                    const pending = requests.length > 0
                    const expanded = sessionPresentation({ layout: sessionLayout, expandedSessionID, sessionID: session.id }) === "full"
                    return (
                      <MeasuredCard
                        key={session.id}
                        id={session.id}
                        style={{ width: expanded ? "100%" : itemWidth ?? "48%" }}
                        onFrame={registerFrame}
                        onLayout={orphanPending.length === 0 && session.id === firstWaitingSessionID ? markWaiting : undefined}
                      >
                        <FadeIn delay={Math.min(index * 50, 150)} style={styles.titleGrow}>
                          {expanded ? (
                            sessionCard(session, () => setExpandedSessionID(null), session.id === firstWaitingSessionID)
                          ) : (
                            <CompactSessionCard
                              session={session}
                              request={requests[0]}
                              theme={theme}
                              styles={styles}
                              attentionActive={session.id === firstWaitingSessionID}
                              avatarAnimated={visibleSessionIDs.size === 0 || visibleSessionIDs.has(session.id)}
                              onOpen={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
                                setExpandedSessionID(toggleExpanded(expandedSessionID, session.id))
                              }}
                            />
                          )}
                        </FadeIn>
                      </MeasuredCard>
                    )
                  })
                }
              </SessionGrid>
            )}
        {keyboardHeight > 0 ? <View style={{ height: keyboardHeight + 24 }} /> : null}
      </Animated.ScrollView>
      </KeyboardAvoidingView>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.compactHero,
          { paddingTop: insets.top + 6 },
          reduceMotion ? { opacity: 0 } : { opacity: heroCompactOpacity, transform: [{ translateY: heroCompactTranslate }] },
        ]}
      >
        <CompactHero agg={agg} server={connection.macName} connected={connection.status === "connected"} theme={theme} styles={styles} />
      </Animated.View>

      <Modal visible={showSettings} animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <LinearGradient colors={theme.bgGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.root}>
          <ScreenBackdrop theme={theme} />
          <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.headerRow}>
              <Text style={styles.title}>Settings</Text>
              <PressableScale onPress={() => setShowSettings(false)} accessibilityLabel="Done">
                <Text style={styles.settingsLink}>Done</Text>
              </PressableScale>
            </View>

            <Text style={styles.section}>Connection</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Status</Text>
              <Text style={styles.about}>{connectionLabel(connection.status, connection.macName)}</Text>
            </View>
            {paired && connection.status !== "connected" ? (
              <PressableScale onPress={() => void connect(true)} accessibilityLabel={CTA.reconnect}>
                <View style={styles.rowButton}>
                  <Text style={styles.rowButtonText}>{CTA.reconnect}</Text>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </PressableScale>
            ) : null}
            {paired ? (
              <PressableScale onPress={() => setConfirmDisconnect(true)} accessibilityLabel="Disconnect from this computer">
                <View style={styles.rowButton}>
                  <Text style={styles.rowButtonText}>Disconnect</Text>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </PressableScale>
            ) : (
              <Text style={styles.fieldDescription}>Connect to your Mac from the dashboard; this page is for settings that apply once paired.</Text>
            )}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Lock Screen activity</Text>
              <Switch
                value={liveActivityEnabled}
                accessibilityLabel="Lock Screen activity"
                onValueChange={(value) => {
                  if (!value) {
                    void setLiveActivityOn(false)
                    return
                  }
                  void requestNotificationPermission().then((granted) => {
                    if (granted) void setLiveActivityOn(true)
                  })
                }}
              />
            </View>
            <Text style={styles.fieldDescription}>
              Shows a Live Activity with agent status. Allows notifications while the app is closed; you can change this in iOS Settings.
            </Text>

            <Text style={styles.section}>Appearance</Text>
            <Text style={styles.fieldLabel}>Theme</Text>
            <View
              onLayout={(event) => setThemesBoxHeight(event.nativeEvent.layout.height)}
              style={[styles.themesFrame, { borderColor: theme.border }]}
            >
              <ScrollView ref={themeListRef} showsVerticalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={{ gap: THEME_GAP }} onContentSizeChange={() => { const index = SKINS.findIndex((entry) => entry.id === skin); if (index > 0) themeListRef.current?.scrollTo({ y: index * (themeCardHeight + THEME_GAP), animated: false }) }}>
                {SKINS.map((entry) => {
                  const preview = entry.options.some((o) => o.id === "system")
                    ? entry.resolve("system", theme.dark ? "dark" : "light")
                    : entry.resolve((entry.options.find((o) => entry.resolve(o.id, systemScheme).dark === theme.dark) ?? entry.options[0]).id, systemScheme)
                  const selected = skin === entry.id
                  // Render the thumbnail with the previewed theme's own tokens so its
                  // corner style (rounded vs square) is visible in the list.
                  const previewStyles = previewStylesBySkin.get(entry.id) ?? createStyles(preview)
                  return (
                    <TouchableOpacity
                      key={entry.id}
                      style={[styles.themeCard, { minHeight: themeCardHeight }, selected ? styles.themeCardSelected : null]}
                      onPress={() => selectTheme(entry.id)}
                      activeOpacity={0.85}
                      accessibilityLabel={`Theme ${entry.name}, ${entry.description}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <View style={styles.themeCardMain}>
                        <Text style={styles.themeCardText} numberOfLines={1} maxFontSizeMultiplier={1.4}>{entry.name}</Text>
                        {entry.description.split(" · ").map((line, index) => (
                          <Text key={index} style={styles.themeCardDesc} numberOfLines={1} maxFontSizeMultiplier={1.4}>{line}</Text>
                        ))}
                      </View>
                      <View style={styles.themeCardRight}>
                        <LinearGradient
                          colors={preview.bgGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[previewStyles.themePreview, { borderColor: preview.border }]}
                        >
                          <View style={[previewStyles.themePreviewCard, { backgroundColor: preview.surface, borderColor: preview.border }]}>
                            <View style={[previewStyles.themePreviewLine, { backgroundColor: preview.accent }]} />
                            <View style={[previewStyles.themePreviewLine, { width: 16, backgroundColor: preview.textSecondary }]} />
                            <View style={[previewStyles.themePreviewAccent, { backgroundColor: preview.accent }]} />
                          </View>
                        </LinearGradient>
                        {selected ? <Text style={styles.switcherCheck}>{skin === "terminal" ? ">" : "✓"}</Text> : null}
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>
            <Text style={styles.fieldLabel}>{skin === "evangelion" ? "Unit" : skin === "tunes" || skin === "classic-os" ? "Look" : "Appearance"}</Text>
            <View style={styles.segment}>
              {skinDef(skin).options.map((option) => {
                const active = themeOption === option.id
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.segmentItem}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
                      haptics.selection()
                      void setThemeOption(option.id)
                    }}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={option.name}
                    accessibilityState={{ selected: active }}
                  >
                    {active ? (
                      <LinearGradient colors={theme.accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.segmentSelected}>
                        <Text style={styles.segmentTextSelected}>{option.name}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.segmentUnselected}>
                        <Text style={styles.segmentText}>{option.name}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
            <Text style={styles.fieldDescription}>
              {skin === "evangelion"
                ? "NERV interface using one Evangelion unit's colors."
                : skin === "tunes"
                  ? "Classic media player chrome — a dark stock look or the light recolor."
                  : skin === "classic-os"
                    ? "Classic desktop interface — the blue look or a dark counterpart."
                    : skin === "terminal"
                      ? "Bash shell interface — monochrome with colored indicators."
                      : "Light, Dark, or follow your iPhone's setting."}
            </Text>
            <PressableScale
              onPress={() => {
                setShowSettings(false)
                setShowPreview(true)
              }}
              accessibilityLabel="Preview this theme"
            >
              <View style={styles.rowButton}>
                <Text style={styles.rowButtonText}>Preview this theme</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </PressableScale>

            <Text style={styles.section}>This phone</Text>
            <Text style={styles.fieldLabel}>Device name</Text>
            <Text style={styles.about}>{deviceName}</Text>
            <Text style={styles.fieldDescription}>
              The name the Mac shows when this phone pairs — taken from iOS.
            </Text>

            <Text style={styles.section}>Support development</Text>
            <Text style={styles.fieldDescription}>
              The app is free and there are no plans to charge. Tips are optional — and, honestly, you get nothing for them.
            </Text>
            <View style={styles.tipsWrap}>
              {tips.map((tip) => (
                <View key={tip.id} style={[styles.tipCard, tip.recommended ? styles.tipCardRecommended : null]}>
                  <Ionicons name={tip.iconName} size={26} color={theme.accent} />
                  <View style={styles.tipCardText}>
                    <Text style={styles.tipCardTitle}>{tip.title}</Text>
                    <Text style={styles.tipCardBlurb}>{tip.blurb}</Text>
                  </View>
                  <Pressable
                    onPress={() => buyTip(tip.id)}
                    disabled={buyingTip !== null}
                    accessibilityRole="button"
                    accessibilityLabel={buyingTip === tip.id ? "Purchase in progress" : `Buy tip ${tip.price}`}
                    accessibilityState={{ busy: buyingTip === tip.id, disabled: buyingTip !== null }}
                    style={[styles.tipBuyBtn, tip.recommended ? styles.tipBuyBtnFilled : null, buyingTip !== null ? { opacity: 0.6 } : null]}
                  >
                    <Text style={[styles.tipCardPrice, tip.recommended ? { color: readableInk(theme.accent) } : null]}>{buyingTip === tip.id ? "…" : tip.price}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
            {tipError ? <Text style={styles.error} accessibilityLiveRegion="polite">{tipError}</Text> : null}


            <Text style={styles.section}>About</Text>
            <Text style={styles.about}>{APP_DESCRIPTION}</Text>
            <Text style={styles.about}>Version {appVersion}</Text>
            <PressableScale onPress={() => void Linking.openURL(PRIVACY_URL)} accessibilityLabel="Privacy policy">
              <View style={styles.rowButton}>
                <Text style={styles.rowButtonText}>Privacy policy</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </PressableScale>
            <Text style={styles.section}>Diagnostics</Text>
            <PressableScale onPress={() => setShowDiagnostics((value) => !value)} accessibilityLabel={showDiagnostics ? "Hide diagnostics" : "Show diagnostics"} accessibilityState={{ expanded: showDiagnostics }}>
              <View style={styles.rowButton}>
                <Text style={styles.rowButtonText}>{showDiagnostics ? "Hide diagnostics" : "Show diagnostics"}</Text>
                <Text style={styles.chevron}>{showDiagnostics ? "⌄" : "›"}</Text>
              </View>
            </PressableScale>
            {showDiagnostics ? (
              <>
                <Text style={styles.about}>{diagnostic ?? "No issues recorded."}</Text>
                <Text style={styles.fieldDescription}>
                  Recorded locally to help diagnose unexpected app terminations.
                </Text>
                <PressableScale onPress={() => void Clipboard.setStringAsync(diagnostic ?? "")} accessibilityLabel="Copy diagnostics">
                  <View style={styles.rowButton}>
                    <Text style={styles.rowButtonText}>Copy diagnostics</Text>
                  </View>
                </PressableScale>
              </>
            ) : null}

          </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </Modal>

      {showPreview ? <PreviewScreen onClose={() => setShowPreview(false)} theme={theme} styles={styles} resolve={resolve} /> : null}

      <ManualConnectModal
        visible={showManual}
        error={manualError}
        onClose={() => setShowManual(false)}
        onConnect={(address, port) => {
          const value = joinHostPort(address, port)
          if (!value) {
            setManualError("Enter a valid address and port (1–65535).")
            return
          }
          setManualError(null)
          setShowManual(false)
          void connectManual(value)
        }}
        theme={theme}
        styles={styles}
      />

      <PairingCodeModal
        visible={pairingCodeRequest !== null}
        error={pairingCodeError}
        onSubmit={(code) => void submitPairingCode(code)}
        onCancel={cancelPairingCode}
        theme={theme}
        styles={styles}
      />

      <ConfirmModal
        visible={confirmDisconnect}
        title={connection.macName ? `Disconnect from ${connection.macName}?` : "Disconnect?"}
        message="The app will stop receiving agent activity until you connect again."
        confirmLabel="Disconnect"
        onConfirm={() => {
          setConfirmDisconnect(false)
          void disconnect()
        }}
        onCancel={() => setConfirmDisconnect(false)}
        theme={theme}
        styles={styles}
      />

      <ConfirmModal
        visible={confirmAction !== null}
        title={confirmAction?.kind === "close" ? "Close this session?" : "Stop this session?"}
        message={
          confirmAction?.kind === "close"
            ? "The OpenCode session will be closed and its card removed."
            : "The current turn will be stopped. You can then send a new prompt."
        }
        confirmLabel={confirmAction?.kind === "close" ? "Close" : "Stop"}
        onConfirm={() => void confirmPending()}
        onCancel={() => setConfirmAction(null)}
        theme={theme}
        styles={styles}
      />

      <SwitcherModal
        visible={switcherSession !== null || startDraft !== null}
        agents={switchOptions.agents}
        models={switchOptions.models}
        currentAgent={switcherSession?.agent ?? startDraft?.agent}
        currentModel={switcherSession?.model ?? (startDraft?.model ? `${startDraft.model.providerID}/${startDraft.model.id}` : undefined)}
        onSelectAgent={(agent) => {
          if (startDraft) {
            // No models reported: the mode is the last choice, so start now.
            if (switchOptions.models.length === 0) {
              setStartDraft(null)
              void startSession(undefined, { agent })
            } else {
              setStartDraft({ ...startDraft, agent })
            }
            return
          }
          const target = switcherSession
          if (target) {
            void switchSession(target.id, { agent })
            setSwitcherSession(null)
          }
        }}
        onSelectModel={(model) => {
          if (startDraft) {
            const selection = { agent: startDraft.agent, model }
            setStartDraft(null)
            void startSession(undefined, selection)
            return
          }
          const target = switcherSession
          if (target) {
            void switchSession(target.id, { model })
            setSwitcherSession(null)
          }
        }}
        onClose={() => {
          setSwitcherSession(null)
          setStartDraft(null)
        }}
        theme={theme}
        styles={styles}
        loading={optionsLoading}
      />

      <Modal visible={showDemo} animationType="slide" onRequestClose={() => setShowDemo(false)}>
        <DemoScreen
          onClose={() => setShowDemo(false)}
          onOpenGallery={() => {
            setShowDemo(false)
            setShowPreview(true)
          }}
          theme={theme}
          styles={styles}
        />
      </Modal>
    </LinearGradient>
    </Animated.View>
  )
}
