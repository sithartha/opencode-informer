import http from "node:http"
import { URL } from "node:url"

// Fire-and-forget ring to the local BLE helper. A missing or slow helper must
// never affect agent handling, so every failure resolves to false.
export function createDoorbell(helperUrl) {
  let url = null
  try {
    url = helperUrl ? new URL(helperUrl) : null
  } catch {
    url = null
  }

  return function ring(payload) {
    if (!url) return Promise.resolve(false)
    const body = JSON.stringify(payload)
    return new Promise((resolve) => {
      let settled = false
      const finish = (value) => {
        if (settled) return
        settled = true
        resolve(value)
      }
      const req = http.request(
        {
          host: url.hostname,
          port: url.port ? Number(url.port) : 80,
          path: `${url.pathname || "/"}${url.search || ""}`,
          method: "POST",
          headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) },
          timeout: 1000,
        },
        (res) => {
          res.resume()
          res.on("end", () => finish(res.statusCode >= 200 && res.statusCode < 300))
          res.on("error", () => finish(false))
        },
      )
      req.on("error", () => finish(false))
      req.on("timeout", () => {
        req.destroy()
        finish(false)
      })
      req.write(body)
      req.end()
    })
  }
}
