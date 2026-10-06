# Roadmap

Future work beyond the v1 OpenCode companion (plugin + macOS helper + phone app).

## Open source & distribution

- [x] Create a public GitHub repository for the project (plugin, mac-helper, app, contract), with a top-level README and license. → https://github.com/sithartha/opencode-informer
- [x] Publish the macOS companion helper as a downloadable GitHub **Release** asset — a signed and notarized `OpenCode Informer.app` / `.dmg`, so users can install the companion without building from source. Include install and launch-at-login notes. → https://github.com/sithartha/opencode-informer/releases
- [ ] Add release automation: on a version tag, build the helper and attach the artifact to the GitHub Release; optionally build the phone app with EAS in the same pipeline.
- [ ] Publish the OpenCode plugin as an installable artifact (npm package or a `~/.config/opencode/plugins/` file) so the bridge can be added without the repo.

## App Store

- [x] Interactive demo mode (sample data, works without a Mac) for App Review; reachable from the empty state and Settings.
- [x] Privacy policy URL (GitHub Pages: /docs) and "Notes for Reviewers" describing the local-only architecture and the companion helper. → https://sithartha.github.io/opencode-informer/privacy-policy.html
- [x] Complete EAS credentials (distribution cert + profiles for the app and the Live Activity extension) and submit via `eas submit`.
- [ ] Screenshots, description, keywords, age rating, and App Privacy declarations in App Store Connect.

## Features

- [ ] APNs-direct notifications so the phone can be notified while away from the local network (BLE wake only works in range).
- [ ] Android parity: foreground service, BLE central pairing, and the ongoing-notification aggregate.
