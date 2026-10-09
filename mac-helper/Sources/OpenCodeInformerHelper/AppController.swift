import AppKit
import Foundation
import ServiceManagement

final class AppController: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem?
    private let ble = BLEPeripheral()
    private let ring = RingServer()
    private let bridge = BridgeClient()
    private var bleStatus = "starting"
    private var pairingPromptOpen = false
    private var pairingCode: String?

    func applicationDidFinishLaunching(_ notification: Notification) {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        item.button?.title = "OI"
        statusItem = item
        rebuildMenu()

        ble.onStatusChange = { [weak self] status in
            self?.bleStatus = status
            self?.rebuildMenu()
        }
        ring.onRing = { [weak self] payload in
            self?.handleRing(payload)
        }

        do {
            try ring.start(port: Contract.helperPort)
        } catch {
            bleStatus = "ring server failed"
            rebuildMenu()
        }

        ble.start()
        refreshPairingCode()
        Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            self?.refreshPairingCode()
        }
    }

    private func refreshPairingCode() {
        bridge.fetchPairingCode { [weak self] code in
            DispatchQueue.main.async {
                guard let self, let code else { return }
                self.pairingCode = code
                self.rebuildMenu()
            }
        }
    }

    private func handleRing(_ payload: [String: Any]) {
        guard let kind = payload["kind"] as? String else { return }
        if kind == "pairing" {
            // Ignore pairing rings while a prompt is already open: the modal alert
            // blocks the main thread and repeated rings would queue into a stack of
            // alerts (and repeated decisions).
            if pairingPromptOpen { return }
            pairingPromptOpen = true
            let approvalID = payload["approvalID"] as? String ?? ""
            let deviceName = payload["deviceName"] as? String ?? "Unknown device"
            let code = payload["code"] as? String
            DispatchQueue.main.async { [weak self] in
                self?.promptPairing(approvalID: approvalID, deviceName: deviceName, code: code)
            }
        }
        // The pairing code is for the local user only; never hand it to the phone.
        var relay = payload
        relay.removeValue(forKey: "code")
        ble.deliverDoorbell(relay)
    }

    private func promptPairing(approvalID: String, deviceName: String, code: String?) {
        guard !approvalID.isEmpty else { return }
        let alert = NSAlert()
        alert.messageText = "Pair \(deviceName)?"
        let shownCode = code ?? pairingCode
        alert.informativeText =
            "This phone wants to control your OpenCode agents over the local network."
            + (shownCode.map { "\n\nPairing code: \($0)" } ?? "")
        alert.addButton(withTitle: "Allow")
        alert.addButton(withTitle: "Deny")
        let approved = alert.runModal() == .alertFirstButtonReturn
        pairingPromptOpen = false
        bridge.decidePairing(approvalID: approvalID, approve: approved)
        refreshPairingCode()
    }

    private func rebuildMenu() {
        let menu = NSMenu()

        let status = NSMenuItem(title: "BLE: \(bleStatus)", action: nil, keyEquivalent: "")
        status.isEnabled = false
        menu.addItem(status)

        let address = NSMenuItem(title: "Rendezvous: \(Contract.rendezvousValue())", action: nil, keyEquivalent: "")
        address.isEnabled = false
        menu.addItem(address)

        let code = NSMenuItem(title: "Pairing code: \(pairingCode ?? "…")", action: nil, keyEquivalent: "")
        code.isEnabled = false
        menu.addItem(code)

        menu.addItem(.separator())

        let copy = NSMenuItem(title: "Copy rendezvous", action: #selector(copyRendezvous), keyEquivalent: "c")
        copy.target = self
        menu.addItem(copy)

        let refresh = NSMenuItem(title: "Refresh phone", action: #selector(refreshPhone), keyEquivalent: "r")
        refresh.target = self
        menu.addItem(refresh)

        let login = NSMenuItem(title: "Launch at Login", action: #selector(toggleLaunchAtLogin), keyEquivalent: "")
        login.target = self
        login.state = launchAtLoginEnabled ? .on : .off
        menu.addItem(login)

        menu.addItem(.separator())

        let quit = NSMenuItem(title: "Quit", action: #selector(quit), keyEquivalent: "q")
        quit.target = self
        menu.addItem(quit)

        statusItem?.menu = menu
    }

    private var launchAtLoginEnabled: Bool {
        SMAppService.mainApp.status == .enabled
    }

    /// Ask the phone to resync every card from the Mac (a "refresh" doorbell).
    @objc private func refreshPhone() {
        ble.deliverDoorbell(["kind": "refresh"])
    }

    @objc private func toggleLaunchAtLogin() {
        let service = SMAppService.mainApp
        do {
            if service.status == .enabled {
                try service.unregister()
            } else {
                try service.register()
            }
        } catch {
            bleStatus = "login item failed: \(error.localizedDescription)"
        }
        // Status updates asynchronously; refresh the checkmark shortly after.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in
            self?.rebuildMenu()
        }
    }

    @objc private func copyRendezvous() {
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(Contract.rendezvousValue(), forType: .string)
    }

    @objc private func quit() {
        NSApplication.shared.terminate(nil)
    }
}
