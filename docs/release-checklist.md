# App Store release checklist — OpenCode Informer

At https://appstoreconnect.apple.com → **My Apps** → **OpenCode Informer**.

## 0. Direct release (IPA, no App Store)

Do this after the version bump and before the App Store steps, so the newest build is
downloadable while review is pending. Full commands: `docs/release-ipa.md`.

- Build the unsigned IPA and the plugin zip: `./scripts/release-ipa.sh`.
- Add the compatibility row for this version to `docs/compatibility.md` (app/build,
  plugin, both helpers, minimum iOS, verification status).
- Create the GitHub release `app-v<version>` **marked latest** with:
  - `OpenCodeInformer-<version>-unsigned.ipa`
  - `open-island-mobile-plugin-<plugin-version>.zip`
  - `SHA256SUMS`
- Verify: release is Latest, `shasum -a 256 -c SHA256SUMS` passes on the downloaded
  assets, and the install links in `docs/install.md` resolve.
- Refresh the Agensi skill package if install steps or component versions changed
  (`./scripts/package-skill.sh`), and re-submit it (see `docs/agensi-listing.md`).

## 1. Build

- Left sidebar → **App Store** tab → the version **0.1.1** (create it if missing).
- **Build** section → **Select a build** → choose the latest **0.1.1 (…)** build (wait if it is still processing).
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

## 6. Version information (0.1.1)

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

## 10. Cross-platform helper (Linux / Windows)

The macOS helper is the signed menu-bar app in `mac-helper/` (released with
`mac-helper/scripts/release-helper.sh`, see above). The cross-platform helper in
`helper/` covers **Linux and Windows**:

1. Push to `main` (or run the `helper` workflow manually from the **Actions** tab). The
   matrix builds Linux, Windows, and macOS release binaries and runs the hardware-free
   `--selftest` on each.
2. Download the `opencode-informer-helper-*` artifacts from the workflow run.
3. Create a Release and attach the Linux/Windows binaries (releases are kept local; no
   secrets are involved). Note in the release that these binaries are **unsigned**.
4. Verify locally before publishing: `cd helper && cargo run --release -- --selftest`
   (contract parity, ring + approval flow, decision relay).

