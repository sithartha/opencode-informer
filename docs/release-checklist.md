# App Store release checklist — OpenCode Informer

At https://appstoreconnect.apple.com → **My Apps** → **OpenCode Informer**.

## 1. Build

- Left sidebar → **App Store** tab → the version **0.1.0** (create it if missing).
- **Build** section → **Select a build** → choose **0.1.0 (7)** (wait if it is still processing).
- If asked about **Export Compliance / encryption**, answer **No** (the app uses only exempt
  encryption; `usesNonExemptEncryption` is already false).

## 2. Screenshots (iPhone 6.9")

- **App Previews and Screenshots** → **iPhone 6.9" Display** → drag these 5 files in order
  (from `screenshots/`):
  1. `01-dashboard.png`
  2. `02-permission.png`
  3. `03-question.png`
  4. `04-switcher.png`
  5. `05-settings.png`
- Captions (optional): leave empty, or use:
  1. Watch every agent at a glance
  2. Approve permissions from your phone
  3. Answer questions without leaving the app
  4. Switch the agent and model
  5. Themes, device name, and settings
- iPad screenshots are **not required** (the app is iPhone-only; `supportsTablet: false`).

## 3. App information

- **Name:** `OpenCode Informer`
- **Subtitle:** `Monitor your OpenCode agents`
- **Primary category:** Developer Tools
- **Secondary category:** Utilities
- **Content rights:** does not contain third-party content
- **Age rating:** 4+ (answer **None** to every content question)

## 4. Pricing and availability

- **Price:** Free
- **Availability:** all countries (or a chosen set)

## 5. App Privacy

- **Data collection:** "No, we do not collect data from this app" → results in **Data Not Collected**.
- **Tracking:** No.

## 6. Version information (0.1.0)

- **Description:** paste the "Description" block from `docs/app-store-metadata.md`.
- **Keywords:** `opencode,agent,coding,developer,terminal,approval,remote,bluetooth,cli,devtool`
- **Promotional text:** paste from `docs/app-store-metadata.md`.
- **Support URL:** `https://github.com/sithartha/opencode-informer`
- **Marketing URL:** `https://github.com/sithartha/opencode-informer`
- **Privacy Policy URL:** `https://sithartha.github.io/opencode-informer/privacy-policy.html`
- **Copyright:** `© 2026 Anton Budnik`

## 7. App Review Information

- **Contact:** Anton Budnik — gsithartha@gmail.com (add a phone number; optional)
- **Demo account:** not applicable (no login)
- **Notes:** paste the contents of `docs/review-notes.md`. It explains that the app is a
  local companion for a Mac tool and how to use the built-in **Demo** to evaluate it without
  a Mac.

## 8. Version release

- **Release option:** Manually release this version (recommended). You can also use Phased
  Release after approval.

## 9. Submit

- **Add for Review** → inspect the draft → **Submit for Review**.
- Watch for reviewer messages under **App Review**; respond promptly.
- After approval, use **Release This Version** (manual release).
