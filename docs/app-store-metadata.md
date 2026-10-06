# App Store metadata — OpenCode Informer

Copy-paste values for App Store Connect. Character limits noted.

## App information

- **App name** (≤30): `OpenCode Informer`
- **Subtitle** (≤30): `Monitor your OpenCode agents`
- **Bundle ID:** `ru.opencode.informer`
- **SKU:** `opencode-informer`
- **Primary language:** English (U.S.)
- **Primary category:** Developer Tools
- **Secondary category (optional):** Utilities
- **Content rights:** does not contain third-party content
- **Copyright:** `© 2026 Anton Budnik`
- **Age rating:** 4+ (answer "None" to all content questions)

## URLs

- **Support URL:** `https://github.com/sithartha/opencode-informer`
- **Marketing URL (optional):** `https://github.com/sithartha/opencode-informer`
- **Privacy Policy URL:** `https://sithartha.github.io/opencode-informer/privacy-policy.html`

## Promotional text (≤170)

"Your OpenCode agents, on your phone. See live activity, approve permissions, answer questions, and manage sessions over your own Wi-Fi — with a Lock Screen Live Activity. Local only, no server."

## Description (≤4000)

```
OpenCode Informer mirrors your OpenCode coding agents from your Mac to your iPhone.

Watch every agent session live, get notified the moment one needs you, and approve or
answer right from your phone — over your own Wi-Fi, with a Bluetooth wake so it works even
when your phone is locked. No account, no server; nothing leaves your devices.

FEATURES
• Live dashboard of agent sessions with agent (mode), model, phase, current tool and
  recent activity
• Approve or deny permission requests, and answer questions with options or free text
• Start a new session, stop a running turn, and close sessions — from the phone
• Switch a session's agent (mode) and model
• Lock Screen & Dynamic Island Live Activity with a glanceable agent count
• Actionable notifications to allow / deny / answer
• Interactive demo with sample data — try it without a Mac

HOW IT WORKS
The app talks to OpenCode on your own Mac over your local network (Wi-Fi) and Bluetooth
Low Energy. It needs the free OpenCode CLI and a small companion (an OpenCode plugin plus
a macOS helper) running on that Mac. There is no cloud service and no account.

PRIVACY
The app collects no personal data. Privacy policy:
https://sithartha.github.io/opencode-informer/privacy-policy.html
```

## Keywords (≤100, comma-separated)

```
opencode,agent,coding,developer,terminal,approval,remote,bluetooth,cli,devtool
```

## What's New (first version)

```
Initial release.
```

## Screenshots (plan)

At minimum provide the 6.9" iPhone size (1320 × 2868, e.g. iPhone 16 Pro Max). If you also
capture 6.7" (1290 × 2796) that is fine; iPad is not required (`supportsTablet: false`).

Suggested set (light + dark are both fine; App Review only needs accurate screens):

1. **Dashboard** — hero with the agent count and the sparkles start button, plus session
   cards (agent · model, activity).
2. **Permission** — a session card with an Allow / Deny permission prompt (orange).
3. **Question** — a question card with option buttons and the free-text field (blue).
4. **Modes & models** — the mode/model switcher (build / plan).
5. **Lock Screen Live Activity** — the Live Activity showing the agent count and status
   dots (capture from the Lock Screen).
6. *(Optional)* **Demo mode** — Settings → Try the demo, to show it works without a Mac.

## App Privacy (App Store Connect → App Privacy)

- **Data collection:** **No, we do not collect data from this app** → "Data Not Collected".
- **Tracking:** No.
- **Third-party SDKs that collect data:** none.

## App Review Information

- **Contact:** Anton Budnik, gsithartha@gmail.com  (phone optional)
- **Demo account:** not applicable (no login)
- **Notes:** paste `docs/review-notes.md` (explains the local-only architecture, that a Mac
  companion is required, and how to use the built-in **Demo** to evaluate without a Mac).

## Version release

- **Release option:** Manual release (recommended) — approve, then release when ready,
  or Phased Release for a gradual rollout.

## Checklist before Submit for Review

- [ ] Build `0.1.0 (6)` processed and selectable in the version's Build section
- [ ] Screenshots uploaded (6.9" iPhone at minimum)
- [ ] Description, subtitle, keywords, promotional text filled
- [ ] Support URL and Privacy Policy URL set
- [ ] Age rating answered (4+)
- [ ] App Privacy completed (Data Not Collected)
- [ ] Review notes pasted
- [ ] App icon has no alpha channel (already fixed in the project)
