import { readFileSync } from "node:fs"
import { sign } from "node:crypto"
import http2 from "node:http2"

// Direct APNs sender: the Mac sends pushes to Apple with a token-based (ES256 JWT)
// APNs auth key. No intermediate server. Disabled unless the key is configured.

function b64url(input) {
  return Buffer.from(input).toString("base64url")
}

function makeJwt({ keyId, teamId, key }) {
  const header = b64url(JSON.stringify({ alg: "ES256", kid: keyId }))
  const claims = b64url(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) }))
  const signingInput = `${header}.${claims}`
  const signature = sign("sha256", Buffer.from(signingInput), { key, dsaEncoding: "ieee-p1363" })
  return `${signingInput}.${signature.toString("base64url")}`
}

export function createApnsSender(config = {}, { http2Impl = http2 } = {}) {
  const host = config.production === false ? "api.sandbox.push.apple.com" : "api.push.apple.com"
  let key = null
  if (config.keyPath && config.keyId && config.teamId) {
    try {
      key = readFileSync(config.keyPath, "utf8")
    } catch {
      key = null
    }
  }
  const enabled = Boolean(key)
  let cachedJwt = null
  let cachedAt = 0

  function bearer() {
    const now = Date.now()
    if (!cachedJwt || now - cachedAt > 45 * 60 * 1000) {
      cachedJwt = makeJwt({ keyId: config.keyId, teamId: config.teamId, key })
      cachedAt = now
    }
    return cachedJwt
  }

  function post(deviceToken, authorization, body) {
    return new Promise((resolve, reject) => {
      const client = http2Impl.connect(`https://${host}`)
      client.on("error", reject)
      const req = client.request({
        ":method": "POST",
        ":path": `/3/device/${deviceToken}`,
        authorization,
        "apns-topic": config.topic,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      })
      let status = 0
      req.on("response", (headers) => {
        status = Number(headers[":status"]) || 0
      })
      req.on("error", reject)
      req.setEncoding("utf8")
      req.on("data", () => {})
      req.on("end", () => {
        client.close()
        resolve(status)
      })
      req.end(body)
    })
  }

  async function send(deviceToken, payload) {
    if (!enabled) return { ok: false, status: 0, reason: "disabled" }
    try {
      const status = await post(deviceToken, `bearer ${bearer()}`, JSON.stringify(payload))
      return { ok: status === 200, status }
    } catch (err) {
      return { ok: false, status: 0, reason: String((err && err.message) || err) }
    }
  }

  return { enabled, send }
}
