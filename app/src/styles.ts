import { StyleSheet } from "react-native"
import type { Theme } from "./theme"

export type Styles = ReturnType<typeof createStyles>

// Design tokens: an 8-point spacing grid, a tight type scale, and soft tinted
// shadows. Hierarchy comes from size and opacity, not from many weights.
export function createStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1 },
    content: { padding: 20, paddingTop: 64, paddingBottom: 48 },

    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerLinks: { flexDirection: "row", alignItems: "center", gap: 16 },
    brandRow: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
    title: { fontSize: 22, fontWeight: "700", color: t.text, letterSpacing: -0.4 },
    settingsLink: { fontSize: 14, color: t.accent, fontWeight: "600", paddingVertical: 12 },

    statusPill: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16, alignSelf: "flex-start", backgroundColor: t.badgeBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
    statusText: { fontSize: 12, color: t.textSecondary, fontWeight: "600" },
    error: { fontSize: 14, color: t.error, marginTop: 8, lineHeight: 20 },

    heroWrap: { marginTop: 20, marginBottom: 8 },
    heroInner: { padding: 24, alignItems: "center", gap: 8 },
    heroCountRow: { flexDirection: "row", alignItems: "center", gap: 16 },
    heroCount: { fontSize: 40, fontWeight: "700", color: t.text, letterSpacing: -1 },
    heroLabel: { fontSize: 14, color: t.textSecondary },
    heroBreakdown: { flexDirection: "row", gap: 16, flexWrap: "wrap", justifyContent: "center" },
    heroBreakdownSecond: { marginTop: 8 },
    heroStat: { flexDirection: "row", alignItems: "center", gap: 6 },
    heroStatText: { fontSize: 12, color: t.textSecondary },
    heroAdd: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
    heroAddText: { fontSize: 24, fontWeight: "700", lineHeight: 26 },

    connectBlock: { marginTop: 16, gap: 12 },
    hint: { fontSize: 14, color: t.textMuted, lineHeight: 20 },
    manualRow: { flexDirection: "row", alignItems: "center", gap: 8 },

    gradientButton: { minHeight: 48, paddingHorizontal: 20, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    gradientButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
    input: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: t.inputBorder, borderRadius: 12, paddingHorizontal: 16, backgroundColor: t.inputBg, color: t.text, fontSize: 14 },
    inputFull: { minHeight: 48, borderWidth: 1, borderColor: t.inputBorder, borderRadius: 12, paddingHorizontal: 16, backgroundColor: t.inputBg, color: t.text, fontSize: 14 },
    fieldLabel: { fontSize: 14, fontWeight: "600", color: t.text, marginBottom: 8 },
    fieldDescription: { fontSize: 12, color: t.textMuted, marginTop: 8, lineHeight: 18 },
    settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, minHeight: 44 },
    settingLabel: { fontSize: 14, color: t.text },
    segment: { flexDirection: "row", backgroundColor: t.badgeBg, borderRadius: 12, padding: 4, gap: 4 },
    segmentItem: { flex: 1 },
    segmentSelected: { minHeight: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    segmentUnselected: { minHeight: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    segmentText: { fontSize: 14, fontWeight: "600", color: t.textSecondary },
    segmentTextSelected: { fontSize: 14, fontWeight: "700", color: "#ffffff" },
    rowButton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 14, paddingHorizontal: 16, minHeight: 52 },
    rowButtonText: { fontSize: 14, color: t.text, fontWeight: "600" },
    chevron: { fontSize: 20, color: t.textMuted },
    about: { fontSize: 14, color: t.textSecondary, lineHeight: 20, marginBottom: 8 },

    section: { fontSize: 12, fontWeight: "700", color: t.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 24, marginBottom: 12 },
    empty: { fontSize: 14, color: t.textMuted },
    emptyCard: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 20, padding: 24, gap: 12, alignItems: "flex-start", shadowColor: t.shadow, shadowOpacity: 1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
    emptyHint: { fontSize: 14, color: t.textMuted, lineHeight: 20 },

    cardGap: { marginBottom: 16 },
    cardPad: { padding: 16, gap: 12 },
    sessionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
    sessionTitle: { flex: 1, fontSize: 17, fontWeight: "600", color: t.text },
    sessionDir: { fontSize: 12, color: t.textMuted, marginTop: 4 },
    sessionPhase: { fontSize: 12, color: t.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: "600" },
    badges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    badge: { fontSize: 12, color: t.badgeText, backgroundColor: t.badgeBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: "hidden" },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    metaChip: { fontSize: 12, color: t.textSecondary, backgroundColor: t.badgeBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: "hidden" },
    dirChip: { fontSize: 12, fontWeight: "600", color: t.accent, backgroundColor: t.badgeBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: "hidden" },
    costChip: { fontSize: 12, fontWeight: "700", color: t.accent, backgroundColor: t.badgeBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: "hidden" },
    stopButton: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: t.deny },
    stopButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 12 },
    closeButton: { fontSize: 22, color: t.textMuted, paddingHorizontal: 8, lineHeight: 22 },

    sessionActivity: { fontSize: 14, color: t.text, marginTop: 8, lineHeight: 20 },
    activityBlock: { borderRadius: 16, padding: 12, backgroundColor: t.badgeBg, borderWidth: 1, borderColor: t.border, gap: 8 },
    activityText: { fontSize: 14, color: t.text, lineHeight: 20 },
    messageCard: { backgroundColor: t.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
    messageScroll: { maxHeight: 360 },
    messageFull: { fontSize: 14, color: t.text, lineHeight: 22 },
    moreLink: { fontSize: 12, fontWeight: "600", color: t.accent, marginBottom: 4 },

    inlineGlow: { borderRadius: 16, shadowOffset: { width: 0, height: 0 }, shadowRadius: 16, shadowOpacity: 0.5, elevation: 8 },
    inlineGradient: { borderRadius: 16, padding: 16 },
    inlinePendingTitle: { fontSize: 17, fontWeight: "700" },
    inlinePendingBody: { fontSize: 14, marginTop: 4, lineHeight: 20 },

    actions: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 },
    actionInner: { minHeight: 44, paddingHorizontal: 20, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    actionText: { color: "#ffffff", fontWeight: "600", fontSize: 14 },
    optionList: { marginTop: 8, gap: 8 },
    optionRow: { gap: 4 },
    optionButtonWrap: { alignSelf: "flex-start", maxWidth: "100%" },
    optionDescription: { fontSize: 12, lineHeight: 18, opacity: 0.85 },
    questionBlock: { marginTop: 16, gap: 4 },
    freeformRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 12 },
    freeformInput: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, color: "#ffffff", backgroundColor: "rgba(255,255,255,0.12)", fontSize: 14, maxHeight: 96, textAlignVertical: "top" },

    demoBanner: { marginTop: 16, borderRadius: 16, padding: 16, backgroundColor: t.badgeBg, borderWidth: 1, borderColor: t.border },
    demoBannerText: { fontSize: 12, color: t.textSecondary, lineHeight: 18 },
    demoActions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    link: { color: t.accent, textDecorationLine: "underline" },

    confirmBackdrop: { flex: 1, backgroundColor: t.scrim, alignItems: "center", justifyContent: "center", padding: 24 },
    confirmCard: { width: "100%", maxWidth: 440, borderRadius: 20, borderWidth: 1, padding: 20, gap: 12, shadowColor: t.shadow, shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
    confirmTitle: { fontSize: 17, fontWeight: "700", color: t.text },
    confirmMessage: { fontSize: 14, color: t.textSecondary, lineHeight: 20 },
    confirmActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 4 },
    switcherScroll: { maxHeight: 360 },
    switcherItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.border },
    switcherItemText: { fontSize: 14, color: t.text },
    switcherCheck: { fontSize: 14, color: t.accent, fontWeight: "700" },

    cardTitle: { fontSize: 17, fontWeight: "700", color: t.text },
    cardBody: { fontSize: 14, color: t.textSecondary, marginTop: 4, lineHeight: 20 },

    sparkleWrap: { alignItems: "center", justifyContent: "center", width: 28, height: 28 },
    sparkleMain: { color: "#ffffff", fontSize: 22, lineHeight: 24, marginTop: 2 },
    sparkleMini: { position: "absolute", top: -1, right: -2, color: "rgba(255,255,255,0.95)", fontSize: 11, lineHeight: 12 },
  })
}
