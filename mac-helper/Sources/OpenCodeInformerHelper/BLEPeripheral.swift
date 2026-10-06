import CoreBluetooth
import Foundation

/// Advertises the Open Island service, delivers doorbell notifications, serves the
/// rendezvous address, and accepts the phone's pairing characteristic writes.
final class BLEPeripheral: NSObject, CBPeripheralManagerDelegate {
    private var manager: CBPeripheralManager?
    private var doorbellChar: CBMutableCharacteristic?
    private var rendezvousChar: CBMutableCharacteristic?
    private var pairingChar: CBMutableCharacteristic?

    private var pending: [Data] = []
    private var centralConnected = false

    /// Human-readable status for the menu bar.
    var onStatusChange: ((String) -> Void)?

    func start() {
        manager = CBPeripheralManager(delegate: self, queue: nil)
    }

    // MARK: - Advertising

    private func advertise() {
        guard let manager else { return }
        if manager.state != .poweredOn {
            onStatusChange?("Bluetooth unavailable")
            return
        }

        let doorbell = CBMutableCharacteristic(
            type: Contract.doorbellUUID,
            properties: [.notify],
            value: nil,
            permissions: []
        )
        let rendezvous = CBMutableCharacteristic(
            type: Contract.rendezvousUUID,
            properties: [.read],
            value: nil,
            permissions: [.readable]
        )
        let pairing = CBMutableCharacteristic(
            type: Contract.pairingUUID,
            properties: [.write, .notify],
            value: nil,
            permissions: [.writeable]
        )
        doorbellChar = doorbell
        rendezvousChar = rendezvous
        pairingChar = pairing

        let service = CBMutableService(type: Contract.serviceUUID, primary: true)
        service.characteristics = [doorbell, rendezvous, pairing]
        manager.add(service)
        manager.startAdvertising([
            CBAdvertisementDataServiceUUIDsKey: [Contract.serviceUUID],
            CBAdvertisementDataLocalNameKey: "OpenCodeInformer",
        ])
        onStatusChange?("advertising")
    }

    // MARK: - Doorbell

    /// Cap and de-duplicate buffered doorbells so a reconnect cannot flush a flood
    /// of stale notifications.
    private let maxPendingDoorbells = 1

    func deliverDoorbell(_ payload: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: payload) else { return }
        if centralConnected {
            send(data)
            return
        }

        let key = (payload["requestID"] as? String) ?? (payload["kind"] as? String) ?? "doorbell"
        pending.removeAll { existing in
            guard let object = try? JSONSerialization.jsonObject(with: existing) as? [String: Any] else { return false }
            let existingKey = (object["requestID"] as? String) ?? (object["kind"] as? String) ?? "doorbell"
            return existingKey == key
        }
        pending.append(data)
        if pending.count > maxPendingDoorbells {
            pending.removeFirst(pending.count - maxPendingDoorbells)
        }
    }

    @discardableResult
    private func send(_ data: Data) -> Bool {
        guard let manager, let doorbellChar else { return false }
        let ok = manager.updateValue(data, for: doorbellChar, onSubscribedCentrals: nil)
        if !ok { pending.insert(data, at: 0) }
        return ok
    }

    private func flushPending() {
        while let next = pending.first {
            if !send(next) { return }
            pending.removeFirst()
        }
    }

    // MARK: - CBPeripheralManagerDelegate

    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        if peripheral.state == .poweredOn {
            advertise()
        } else {
            onStatusChange?("Bluetooth state \(peripheral.state.rawValue)")
        }
    }

    func peripheralManager(
        _ peripheral: CBPeripheralManager,
        central: CBCentral,
        didSubscribeTo characteristic: CBCharacteristic
    ) {
        centralConnected = true
        onStatusChange?("phone connected")
        flushPending()
    }

    func peripheralManager(
        _ peripheral: CBPeripheralManager,
        central: CBCentral,
        didUnsubscribeFrom characteristic: CBCharacteristic
    ) {
        centralConnected = false
        // Resume advertising so the phone can rediscover us after a disconnect
        // (e.g. the app was force-quit and relaunched).
        startAdvertising()
        onStatusChange?("advertising")
    }

    private func startAdvertising() {
        manager?.startAdvertising([
            CBAdvertisementDataServiceUUIDsKey: [Contract.serviceUUID],
            CBAdvertisementDataLocalNameKey: "OpenCodeInformer",
        ])
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
        if let error {
            onStatusChange?("add service failed: \(error.localizedDescription)")
        } else {
            onStatusChange?("service added")
        }
    }

    func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
        if let error {
            onStatusChange?("advertising failed: \(error.localizedDescription)")
        } else {
            onStatusChange?("advertising started")
        }
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveRead request: CBATTRequest) {
        guard request.characteristic.uuid == Contract.rendezvousUUID else {
            peripheral.respond(to: request, withResult: .attributeNotFound)
            return
        }
        request.value = Contract.rendezvousValue().data(using: .utf8)
        peripheral.respond(to: request, withResult: .success)
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
        for request in requests { peripheral.respond(to: request, withResult: .success) }
    }

    func peripheralManagerIsReady(toUpdateSubscribers peripheral: CBPeripheralManager) {
        flushPending()
    }
}
