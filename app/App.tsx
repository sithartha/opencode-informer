import { StatusBar } from "expo-status-bar"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Dimensions, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, Switch, Text, TextInput, TouchableOpacity, useColorScheme, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useBridge } from "./src/useBridge"
import type { PendingRequest } from "./src/events"
import { aggregate } from "./src/aggregate"
import { resolveTheme, type ThemeMode } from "./src/theme"
import { createStyles } from "./src/styles"
import { BrandMark, GradientButton, HeroCard, NeedsAttentionCard, PreviewScreen, SessionCard } from "./src/components"
import { DemoScreen } from "./src/DemoScreen"
import { FadeIn, GlowDot, PressableScale } from "./src/ui"

const APP_DESCRIPTION =
  "OpenCode Informer mirrors your OpenCode agents to this phone: watch their activity, get notified when one needs you, and approve or answer right from the Lock Screen — over your local WiFi and Bluetooth, with no server."

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: "light", label: "Light" },
  { mode: "dark", label: "Dark" },
  { mode: "system", label: "System" },
]

export default function App() {
  const {
    appState,
    connection,
    paired,
    connect,
    connectManual,
    resolve,
    sendPrompt,
    liveActivityEnabled,
    setLiveActivityOn,
    deviceName,
    setDeviceName,
    themeMode,
    setThemeMode,
  } = useBridge()

  const systemScheme = useColorScheme()
  const theme = resolveTheme(themeMode, systemScheme)
  const styles = useMemo(() => createStyles(theme), [theme])

  const [manualHost, setManualHost] = useState(process.env.EXPO_PUBLIC_DEV_HOST ?? "127.0.0.1:38963")
  const [nameDraft, setNameDraft] = useState(deviceName)
  const [showSettings, setShowSettings] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  useEffect(() => setNameDraft(deviceName), [deviceName])

  const scrollRef = useRef<ScrollView>(null)
  const offsetRef = useRef(0)
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

  const statusColor =
    connection.status === "connected" ? theme.allow : connection.status === "disconnected" ? theme.deny : theme.accent

  return (
    <LinearGradient colors={theme.bgGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.root}>
      <StatusBar style={theme.dark ? "light" : "dark"} />
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onScroll={(event) => { offsetRef.current = event.nativeEvent.contentOffset.y }} scrollEventThrottle={16}>
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <BrandMark theme={theme} />
            <Text style={styles.title}>OpenCode Informer</Text>
          </View>
          <PressableScale onPress={() => setShowSettings(true)} accessibilityLabel="Settings">
            <Text style={styles.settingsLink}>Settings</Text>
          </PressableScale>
        </View>

        <View style={styles.statusPill}>
          <GlowDot color={statusColor} size={8} pulse={connection.status === "connecting" || connection.status === "discovering"} />
          <Text style={styles.statusText}>
            {connection.status}
            {connection.macName ? ` · ${connection.macName}` : ""}
          </Text>
        </View>
        {connection.error ? <Text style={styles.error}>{connection.error}</Text> : null}

        <FadeIn style={styles.heroWrap}>
          <HeroCard agg={agg} theme={theme} styles={styles} />
        </FadeIn>

        {!paired ? (
          <View style={styles.connectBlock}>
            <GradientButton label="Connect to Mac" onPress={() => void connect()} styles={styles} colors={theme.accentGradient} />
            <Text style={styles.hint}>or connect by address (no Bluetooth)</Text>
            <View style={styles.manualRow}>
              <TextInput
                style={styles.input}
                value={manualHost}
                onChangeText={setManualHost}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="host:port"
                placeholderTextColor={theme.textMuted}
                keyboardType="url"
              />
              <GradientButton label="Connect" onPress={() => void connectManual(manualHost)} styles={styles} colors={theme.accentGradient} />
            </View>
          </View>
        ) : null}

        {orphanPending.length > 0 ? (
          <>
            <Text style={styles.section}>Needs attention</Text>
            {orphanPending.map((request, index) => (
              <FadeIn key={request.requestID} delay={index * 50} style={styles.cardGap}>
                <NeedsAttentionCard request={request} resolve={resolve} theme={theme} styles={styles} onFieldFocus={focusField} />
              </FadeIn>
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
          <FadeIn key={session.id} delay={index * 50} style={styles.cardGap}>
            <SessionCard session={session} requests={pendingBySession[session.id] ?? []} resolve={resolve} theme={theme} styles={styles} onFieldFocus={focusField} onSendPrompt={sendPrompt} />
          </FadeIn>
        ))}
        {keyboardHeight > 0 ? <View style={{ height: keyboardHeight + 24 }} /> : null}
      </ScrollView>
      </KeyboardAvoidingView>

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
            <View style={styles.segment}>
              {THEME_OPTIONS.map((option) => {
                const selected = themeMode === option.mode
                return (
                  <TouchableOpacity key={option.mode} style={styles.segmentItem} onPress={() => void setThemeMode(option.mode)} activeOpacity={0.8}>
                    {selected ? (
                      <LinearGradient colors={theme.accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.segmentSelected}>
                        <Text style={styles.segmentTextSelected}>{option.label}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.segmentUnselected}>
                        <Text style={styles.segmentText}>{option.label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
            <Text style={styles.fieldDescription}>System follows your iPhone's Light/Dark setting.</Text>

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
