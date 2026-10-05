import CoreBluetooth
import Foundation

/// Peripheral-only mode: advertise the service and host the ring server.
/// Run alongside `--scan` in another process to verify the BLE path.
final class AdvertiseMode {
    private let peripheral = BLEPeripheral()
    private let ring = RingServer()

    func run() -> Never {
        peripheral.onStatusChange = { print("[advertise] \($0)") }
        peripheral.start()

        do {
            try ring.start(port: Contract.helperPort)
            print("[advertise] ring server on 127.0.0.1:\(Contract.helperPort)")
        } catch {
            print("[advertise] ring server failed: \(error.localizedDescription)")
            exit(1)
        }
        ring.onRing = { [weak self] payload in
            print("[advertise] ring received: \(payload)")
            self?.peripheral.deliverDoorbell(payload)
        }

        RunLoop.main.run()
        exit(0)
    }
}

/// Central-only mode: discover the helper, read the rendezvous value, subscribe to the
/// doorbell, then ring the helper's ring server and verify the notification arrives.
final class SelfTest: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    private var central: CBCentralManager?
    private var target: CBPeripheral?
    private var rendezvous: String?
    private var doorbell: String?
    private var finished = false

    func run() -> Never {
        central = CBCentralManager(delegate: self, queue: nil)
        DispatchQueue.main.asyncAfter(deadline: .now() + 20) { [weak self] in
            self?.fail("timed out")
        }
        RunLoop.main.run()
        exit(1)
    }

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        print("[scan] central state \(central.state.rawValue)")
        switch central.state {
        case .poweredOn:
            central.scanForPeripherals(withServices: [Contract.serviceUUID], options: nil)
        case .unauthorized:
            fail("Bluetooth unauthorized")
        case .unsupported:
            fail("Bluetooth unsupported")
        default:
            break
        }
    }

    func centralManager(
        _ central: CBCentralManager,
        didDiscover peripheral: CBPeripheral,
        advertisementData: [String: Any],
        rssi RSSI: NSNumber
    ) {
        print("[scan] discovered \(peripheral.name ?? "?") rssi \(RSSI)")
        central.stopScan()
        target = peripheral
        peripheral.delegate = self
        central.connect(peripheral, options: nil)
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        print("[scan] connected")
        peripheral.discoverServices([Contract.serviceUUID])
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        fail("connect failed: \(error?.localizedDescription ?? "unknown")")
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard let service = peripheral.services?.first(where: { $0.uuid == Contract.serviceUUID }) else {
            fail("service not discovered")
        }
        peripheral.discoverCharacteristics([Contract.rendezvousUUID, Contract.doorbellUUID], for: service)
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        for characteristic in service.characteristics ?? [] {
            if characteristic.uuid == Contract.rendezvousUUID {
                peripheral.readValue(for: characteristic)
            }
            if characteristic.uuid == Contract.doorbellUUID {
                peripheral.setNotifyValue(true, for: characteristic)
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        guard let data = characteristic.value else { return }

        if characteristic.uuid == Contract.rendezvousUUID {
            let value = String(data: data, encoding: .utf8)
            print("[scan] rendezvous=\(value ?? "nil")")
            rendezvous = value
            triggerRing()
        } else if characteristic.uuid == Contract.doorbellUUID {
            print("[scan] doorbell=\(String(data: data, encoding: .utf8) ?? "")")
            doorbell = String(data: data, encoding: .utf8)
            finish()
        }
    }

    private func triggerRing() {
        guard let url = URL(string: "http://127.0.0.1:\(Contract.helperPort)\(Contract.ringPath)") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["kind": "completion", "title": "selftest"])
        URLSession.shared.dataTask(with: request) { _, _, _ in }.resume()
    }

    private func finish() {
        guard !finished else { return }
        finished = true
        let ok = rendezvous != nil && doorbell != nil
        print(ok ? "[selftest] PASS" : "[selftest] FAIL")
        exit(ok ? 0 : 1)
    }

    private func fail(_ message: String) -> Never {
        print("[selftest] FAIL: \(message)")
        exit(1)
    }
}
