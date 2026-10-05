import AppKit
import Foundation

final class AppController: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem?
    private let ble = BLEPeripheral()
    private let ring = RingServer()
    private let bridge = BridgeClient()
    private var bleStatus = "starting"
    private var pairingPromptOpen = false

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
            DispatchQueue.main.async { [weak self] in
                self?.promptPairing(approvalID: approvalID, deviceName: deviceName)
            }
        }
        ble.deliverDoorbell(payload)
    }

    private func promptPairing(approvalID: String, deviceName: String) {
        guard !approvalID.isEmpty else { return }
        let alert = NSAlert()
        alert.messageText = "Pair \(deviceName)?"
        alert.informativeText = "This phone wants to control your OpenCode agents over the local network."
        alert.addButton(withTitle: "Allow")
        alert.addButton(withTitle: "Deny")
        let approved = alert.runModal() == .alertFirstButtonReturn
        pairingPromptOpen = false
        bridge.decidePairing(approvalID: approvalID, approve: approved)
    }

    private func rebuildMenu() {
        let menu = NSMenu()

        let status = NSMenuItem(title: "BLE: \(bleStatus)", action: nil, keyEquivalent: "")
        status.isEnabled = false
        menu.addItem(status)

        let address = NSMenuItem(title: "Rendezvous: \(Contract.rendezvousValue())", action: nil, keyEquivalent: "")
        address.isEnabled = false
        menu.addItem(address)

        menu.addItem(.separator())

        let copy = NSMenuItem(title: "Copy rendezvous", action: #selector(copyRendezvous), keyEquivalent: "c")
        copy.target = self
        menu.addItem(copy)

        let quit = NSMenuItem(title: "Quit", action: #selector(quit), keyEquivalent: "q")
        quit.target = self
        menu.addItem(quit)

        statusItem?.menu = menu
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
