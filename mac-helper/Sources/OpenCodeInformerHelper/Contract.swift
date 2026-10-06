import CoreBluetooth
import Darwin
import Foundation

/// Values shared with `contract/contract.json`. Keep these in sync.
enum Contract {
    static let bridgePort: UInt16 = 38963
    static let helperPort: UInt16 = 38964
    static let ringPath = "/ring"

    static let serviceUUID = CBUUID(string: "7b1e5a20-6c1a-4f4e-9c3a-2d5f8b9a1c01")
    static let doorbellUUID = CBUUID(string: "7b1e5a21-6c1a-4f4e-9c3a-2d5f8b9a1c02")
    static let rendezvousUUID = CBUUID(string: "7b1e5a22-6c1a-4f4e-9c3a-2d5f8b9a1c03")
    static let pairingUUID = CBUUID(string: "7b1e5a23-6c1a-4f4e-9c3a-2d5f8b9a1c04")

    /// The value a phone reads to learn where the bridge lives: `host:port`.
    static func rendezvousValue() -> String {
        "\(lanAddress() ?? "127.0.0.1"):\(bridgePort)"
    }

    /// Primary IPv4 address of the Mac on the LAN (en0/en1).
    static func lanAddress() -> String? {
        var result: String?
        var ifaddr: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&ifaddr) == 0, let first = ifaddr else { return nil }
        defer { freeifaddrs(ifaddr) }

        var pointer = first
        while true {
            let interface = pointer.pointee
            if let addr = interface.ifa_addr, addr.pointee.sa_family == UInt8(AF_INET) {
                let name = String(cString: interface.ifa_name)
                if name == "en0" || name == "en1" {
                    var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
                    if getnameinfo(addr, socklen_t(addr.pointee.sa_len), &host, socklen_t(host.count), nil, 0, NI_NUMERICHOST) == 0 {
                        let value = String(cString: host)
                        if !value.isEmpty {
                            result = value
                            break
                        }
                    }
                }
            }
            guard let next = interface.ifa_next else { break }
            pointer = next
        }
        return result
    }
}
