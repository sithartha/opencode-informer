import Foundation

/// Posts the Mac user's pairing decision back to the local bridge.
final class BridgeClient {
    func decidePairing(approvalID: String, approve: Bool) {
        guard let url = URL(string: "http://127.0.0.1:\(Contract.bridgePort)/pair/decision") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "approvalID": approvalID,
            "decision": approve ? "approve" : "deny",
        ])
        URLSession.shared.dataTask(with: request) { _, _, _ in }.resume()
    }
}
