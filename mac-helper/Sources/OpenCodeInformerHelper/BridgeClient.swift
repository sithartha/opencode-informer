import Foundation

/// Posts the Mac user's pairing decision back to the local bridge, and reads the
/// current pairing code for display.
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

    /// Read the code the user should type on the pairing phone (loopback only).
    func fetchPairingCode(completion: @escaping (String?) -> Void) {
        guard let url = URL(string: "http://127.0.0.1:\(Contract.bridgePort)/pair/code") else {
            completion(nil)
            return
        }
        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data,
                  let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                completion(nil)
                return
            }
            completion(object["code"] as? String)
        }.resume()
    }
}
