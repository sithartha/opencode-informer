import Foundation
import Network

/// Minimal localhost HTTP server that accepts `POST /ring` from the plugin bridge
/// and hands the JSON body to `onRing`.
final class RingServer {
    var onRing: (([String: Any]) -> Void)?

    private var listener: NWListener?
    private let queue = DispatchQueue(label: "app.openisland.ble.ring")

    func start(port: UInt16) throws {
        let parameters = NWParameters.tcp
        guard let nwPort = NWEndpoint.Port(rawValue: port) else {
            throw NSError(domain: "RingServer", code: 1, userInfo: [NSLocalizedDescriptionKey: "invalid port"])
        }
        parameters.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: nwPort)

        let listener = try NWListener(using: parameters)
        listener.newConnectionHandler = { [weak self] connection in
            self?.handle(connection)
        }
        listener.start(queue: queue)
        self.listener = listener
    }

    private func handle(_ connection: NWConnection) {
        connection.start(queue: queue)
        receive(connection, buffer: Data())
    }

    private func receive(_ connection: NWConnection, buffer: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { [weak self] data, _, isComplete, error in
            guard let self else { return }
            var accumulated = buffer
            if let data { accumulated.append(data) }

            if let request = Self.parse(accumulated) {
                if request.method == "POST" && request.path == Contract.ringPath {
                    self.onRing?(request.body)
                }
                let response = "HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nok"
                connection.send(content: response.data(using: .utf8), completion: .contentProcessed { _ in
                    connection.cancel()
                })
            } else if isComplete || error != nil {
                connection.cancel()
            } else {
                self.receive(connection, buffer: accumulated)
            }
        }
    }

    private static func parse(_ data: Data) -> (method: String, path: String, body: [String: Any])? {
        guard let text = String(data: data, encoding: .utf8),
              let headerEnd = text.range(of: "\r\n\r\n") else { return nil }

        let header = String(text[text.startIndex..<headerEnd.lowerBound])
        let bodyText = String(text[headerEnd.upperBound...])
        let lines = header.components(separatedBy: "\r\n")
        guard let requestLine = lines.first else { return nil }
        let parts = requestLine.split(separator: " ")
        guard parts.count >= 2 else { return nil }

        var contentLength = 0
        for line in lines.dropFirst() {
            let lower = line.lowercased()
            if lower.hasPrefix("content-length:") {
                let value = line.split(separator: ":", maxSplits: 1).last.map(String.init) ?? "0"
                contentLength = Int(value.trimmingCharacters(in: .whitespaces)) ?? 0
            }
        }
        guard bodyText.utf8.count >= contentLength else { return nil }

        let bodyData = Data(bodyText.utf8.prefix(contentLength))
        let json = (try? JSONSerialization.jsonObject(with: bodyData)) as? [String: Any] ?? [:]
        return (String(parts[0]), String(parts[1]), json)
    }
}
