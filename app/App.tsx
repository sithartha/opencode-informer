import { StatusBar } from "expo-status-bar"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Animated, Dimensions, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, Switch, Text, TextInput, TouchableOpacity, useColorScheme, View, type LayoutChangeEvent } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useBridge } from "./src/useBridge"
import type { PendingRequest, Session } from "./src/events"
import { aggregate } from "./src/aggregate"
import { resolveTheme, SKINS, skinDef } from "./src/theme"
import { createStyles } from "./src/styles"
import { liveActivity } from "./src/liveActivity"
import { joinHostPort } from "./src/manualConnect"
import { CompactHero, ConfirmModal, GradientButton, HeroCard, ManualConnectModal, NeedsAttentionCard, PairingCodeModal, PreviewScreen, SessionCard, SwitcherModal } from "./src/components"
import { ThemeMark } from "./src/themeMark"
import { DemoScreen } from "./src/DemoScreen"
import { FadeIn, GlowDot, PressableScale } from "./src/ui"

const APP_DESCRIPTION =
  "OpenCode Informer mirrors your OpenCode agents to this phone: watch their activity, get notified when one needs you, and approve or answer right from the Lock Screen — over your local WiFi and Bluetooth, with no server."


export default function App() {
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
    setDeviceName,
    skin,
    themeOption,
    setSkin,
    setThemeOption,
    pairingCodeRequest,
    pairingCodeError,
    submitPairingCode,
    cancelPairingCode,
    diagnostic,
  } = useBridge()

  const systemScheme = useColorScheme()
  const theme = resolveTheme(skin, themeOption, systemScheme)
  const styles = useMemo(() => createStyles(theme), [theme])

  // Store the theme before effects run (so the activity starts with the right
  // palette); re-theme a running activity when the theme changes.
  liveActivity.setTheme(theme)
  useEffect(() => {
    liveActivity.refreshTheme()
  }, [theme])

  const [showManual, setShowManual] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState(deviceName)
  const [showSettings, setShowSettings] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ kind: "stop" | "close"; sessionID?: string } | null>(null)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [switcherSession, setSwitcherSession] = useState<Session | null>(null)
  const [switchOptions, setSwitchOptions] = useState<{ agents: string[]; models: { providerID: string; id: string; name?: string }[] }>({ agents: [], models: [] })
  const [startDraft, setStartDraft] = useState<{ agent?: string; model?: { providerID: string; id: string } } | null>(null)
  useEffect(() => setNameDraft(deviceName), [deviceName])

  const scrollRef = useRef<ScrollView>(null)
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
    const visibleBottom = windowHeight - keyboard - 27
    const fieldBottom = y + h
    if (fieldBottom > visibleBottom) {
      scrollRef.current?.scrollTo({ y: offsetRef.current + (fieldBottom - visibleBottom), animated: true })
    }
  }, [])

  const openSwitcher = useCallback(
    async (session: Session) => {
      setSwitcherSession(session)
      setSwitchOptions(await loadOptions())
    },
    [loadOptions],
  )

  // Start a session: ask for a mode and a model first (skip a step when the bridge
  // reports none), then create the session with the selection.
  const beginStart = useCallback(async () => {
    const options = await loadOptions()
    setSwitchOptions(options)
    if (options.agents.length === 0 && options.models.length === 0) {
      await startSession()
      return
    }
    setStartDraft({})
  }, [loadOptions, startSession])

  const confirmPending = useCallback(async () => {
    const action = confirmAction
    setConfirmAction(null)
    if (!action) return
    if (action.kind === "stop" && action.sessionID) await stopSession(action.sessionID)
    else if (action.kind === "close" && action.sessionID) await closeSession(action.sessionID)
  }, [confirmAction, stopSession, closeSession])

  const pending = Object.values(appState.pending)
  const agg = aggregate(appState)

  // Newer requests sort higher: a session with a pending request moves above the
  // ones without, and the most recently arrived request comes first. Sessions
  // without a request keep their existing order.
  const pendingRank = new Map<string, number>()
  pending.forEach((request, index) => pendingRank.set(request.sessionID, index))
  const sessions = Object.values(appState.sessions).sort(
    (a, b) => (pendingRank.get(b.id) ?? -1) - (pendingRank.get(a.id) ?? -1),
  )

  const pendingBySession: Record<string, PendingRequest[]> = {}
  for (const request of pending) {
    // Newest first within a session so the card shows the latest request.
    ;(pendingBySession[request.sessionID] ??= []).unshift(request)
  }
  const orphanPending = pending.filter((request) => !appState.sessions[request.sessionID]).reverse()
  const firstWaitingSessionID = sessions.find((session) => (pendingBySession[session.id] ?? []).length > 0)?.id

  const statusColor =
    connection.status === "connected" ? theme.allow : connection.status === "disconnected" ? theme.deny : theme.accent

  return (
    <LinearGradient colors={theme.bgGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.root}>
      <StatusBar style={theme.dark ? "light" : "dark"} />
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onScroll={(event) => { const y = event.nativeEvent.contentOffset.y; offsetRef.current = y; heroScrollY.setValue(y) }} scrollEventThrottle={16}>
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <ThemeMark theme={theme} />
            <Text style={styles.title}>OI</Text>
          </View>
          <PressableScale onPress={() => setShowSettings(true)} accessibilityLabel="Settings">
            <Text style={styles.settingsLink}>Settings</Text>
          </PressableScale>
        </View>

        <PressableScale onPress={paired ? () => setConfirmDisconnect(true) : undefined} accessibilityLabel="Connection">
          <View style={styles.statusPill}>
            <GlowDot color={statusColor} size={8} pulse={connection.status === "connecting" || connection.status === "discovering"} />
            <Text style={styles.statusText}>
              {connection.status}
              {connection.macName ? ` · ${connection.macName}` : ""}
            </Text>
          </View>
        </PressableScale>
        {connection.error ? <Text style={styles.error}>{connection.error}</Text> : null}

        <Animated.View
          onLayout={(event) => {
            const { y, height } = event.nativeEvent.layout
            setHeroLayout((prev) => (prev && prev.y === y && prev.height === height ? prev : { y, height }))
          }}
          style={[styles.heroWrap, { opacity: heroExpandedOpacity, transform: [{ scale: heroExpandedScale }, { translateY: heroExpandedTranslate }] }]}
        >
          <HeroCard agg={agg} theme={theme} styles={styles} onStart={() => void beginStart()} onReviewWaiting={scrollToWaiting} />
        </Animated.View>

        {!paired ? (
          <View style={styles.connectBlock}>
            <GradientButton label="Connect to Mac" onPress={() => void connect()} styles={styles} colors={theme.accentGradient} />
            <Text style={styles.hint}>or connect by address (no Bluetooth)</Text>
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
                <FadeIn delay={index * 50} style={styles.cardGap}>
                  <NeedsAttentionCard request={request} resolve={resolve} theme={theme} styles={styles} onFieldFocus={focusField} />
                </FadeIn>
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.section}>Sessions</Text>
        {sessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.empty}>No active sessions</Text>
            <Text style={styles.emptyHint}>Start an agent, or preview how the cards look.</Text>
            <GradientButton label="Try demo" onPress={() => setShowDemo(true)} styles={styles} colors={theme.accentGradient} />
          </View>
        ) : null}
        {sessions.map((session, index) => (
          <View key={session.id} onLayout={orphanPending.length === 0 && session.id === firstWaitingSessionID ? markWaiting : undefined}>
            <FadeIn delay={index * 50} style={styles.cardGap}>
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
              />
            </FadeIn>
          </View>
        ))}
        {keyboardHeight > 0 ? <View style={{ height: keyboardHeight + 24 }} /> : null}
      </ScrollView>
      </KeyboardAvoidingView>

      <Animated.View
        pointerEvents="none"
        style={[styles.compactHero, { opacity: heroCompactOpacity, transform: [{ translateY: heroCompactTranslate }] }]}
      >
        <CompactHero agg={agg} server={connection.macName} connected={connection.status === "connected"} theme={theme} styles={styles} />
      </Animated.View>

      <Modal visible={showSettings} animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <LinearGradient colors={theme.bgGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.root}>
          <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.headerRow}>
              <Text style={styles.title}>Settings</Text>
              <PressableScale onPress={() => setShowSettings(false)} accessibilityLabel="Done">
                <Text style={styles.settingsLink}>Done</Text>
              </PressableScale>
            </View>

            <Text style={styles.section}>Appearance</Text>
            <Text style={styles.fieldLabel}>Theme</Text>
            {SKINS.map((entry) => {
              // Preview follows the current light/dark: skins with a System option resolve it,
              // otherwise pick the variant that matches the current scheme.
              const preview = entry.options.some((o) => o.id === "system")
                ? entry.resolve("system", theme.dark ? "dark" : "light")
                : entry.resolve((entry.options.find((o) => entry.resolve(o.id, systemScheme).dark === theme.dark) ?? entry.options[0]).id, systemScheme)
              const previewStyles = createStyles(preview)
              const selected = skin === entry.id
              return (
                <TouchableOpacity
                  key={entry.id}
                  style={[styles.themeCard, selected ? styles.themeCardSelected : null]}
                  onPress={() => void setSkin(entry.id)}
                  activeOpacity={0.85}
                  accessibilityLabel={`Theme ${entry.name}`}
                >
                  <View style={styles.themeCardMain}>
                    <Text style={styles.themeCardText}>{entry.name}</Text>
                    <Text style={styles.themeCardDesc}>{entry.description}</Text>
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
                    {selected ? <Text style={styles.switcherCheck}>✓</Text> : null}
                  </View>
                </TouchableOpacity>
              )
            })}
            <Text style={styles.fieldLabel}>{skin === "evangelion" ? "Unit" : "Appearance"}</Text>
            <View style={styles.segment}>
              {skinDef(skin).options.map((option) => {
                const selected = themeOption === option.id
                return (
                  <TouchableOpacity key={option.id} style={styles.segmentItem} onPress={() => void setThemeOption(option.id)} activeOpacity={0.8}>
                    {selected ? (
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
                : "Light, Dark, or follow your iPhone's setting."}
            </Text>

            <Text style={styles.section}>Connection</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Lock Screen activity</Text>
              <Switch value={liveActivityEnabled} onValueChange={(value) => void setLiveActivityOn(value)} />
            </View>

            <Text style={styles.section}>This phone</Text>
            <Text style={styles.fieldLabel}>Device name</Text>
            <TextInput
              style={styles.inputFull}
              value={nameDraft}
              onChangeText={setNameDraft}
              onEndEditing={() => void setDeviceName(nameDraft.trim() || "iPhone")}
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="e.g. sithPhone"
              placeholderTextColor={theme.textMuted}
            />
            <Text style={styles.fieldDescription}>
              The name the Mac shows when this phone asks to pair. iOS hides the system name unless the app has the
              device-name entitlement, so set your own here.
            </Text>

            <Text style={styles.section}>Diagnostics</Text>
            <Text style={styles.about}>{diagnostic ?? "No issues recorded."}</Text>
            <Text style={styles.fieldDescription}>
              Recorded locally to help diagnose unexpected app terminations.
            </Text>

            <Text style={styles.section}>About</Text>
            <Text style={styles.about}>{APP_DESCRIPTION}</Text>
            <Text style={styles.about}>Version 0.1.0</Text>

            <Text style={styles.section}>Demo</Text>
            <PressableScale
              onPress={() => {
                setShowSettings(false)
                setShowDemo(true)
              }}
              accessibilityLabel="Try the demo"
            >
              <View style={styles.rowButton}>
                <Text style={styles.rowButtonText}>Try the demo</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </PressableScale>
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
  )
}
