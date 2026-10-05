import http from "node:http"
import { URL } from "node:url"

const MAX_BODY = 64 * 1024

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on("data", (chunk) => {
      size += chunk.length
      if (size > MAX_BODY) {
        reject(new Error("payload too large"))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
    req.on("error", reject)
  })
}

function sendJSON(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(body) })
  res.end(body)
}

function parseJSON(text) {
  if (!text) return {}
  const value = JSON.parse(text)
  return value && typeof value === "object" ? value : {}
}

// Minimal HTTP + SSE server for the LAN API. Only node:* modules are used.
export function createBridgeServer({ port, host, pairing, model, resolution, keepaliveMs = 15000, sendPrompt }) {
  const sseClients = new Set()
  let keepaliveTimer = null

  const server = http.createServer((req, res) => {
    route(req, res).catch(() => {
      try {
        sendJSON(res, 500, { error: "internal" })
      } catch {
        /* response may already be sent */
      }
    })
  })
  server.on("clientError", (_err, socket) => {
    try {
      socket.end("HTTP/1.1 400 Bad Request\r\n\r\n")
    } catch {
      /* ignore */
    }
  })

  function authorized(req) {
    const header = req.headers["authorization"] || ""
    if (!header.startsWith("Bearer ")) return false
    return pairing.validate(header.slice("Bearer ".length))
  }

  function broadcast(type, data) {
    const frame = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`
    for (const res of sseClients) {
      try {
        res.write(frame)
      } catch {
        sseClients.delete(res)
      }
    }
  }

  function openStream(req, res) {
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
      "access-control-allow-origin": "*",
    })
    res.write(": connected\n\n")
    sseClients.add(res)
    const remove = () => sseClients.delete(res)
    req.on("close", remove)
    req.on("error", remove)
    res.on("error", remove)
  }

  async function handlePair(req, res) {
    const body = parseJSON(await readBody(req))
    if (body.approvalID) {
      const status = pairing.status(body.approvalID)
      if (!status) return sendJSON(res, 404, { error: "unknown approval" })
      if (status.status === "denied") return sendJSON(res, 403, { status: "denied" })
      if (status.status === "pending") return sendJSON(res, 202, { status: "pending", approvalID: body.approvalID })
      return sendJSON(res, 200, { status: "approved", token: status.token })
    }
    if (!body.deviceName) return sendJSON(res, 400, { error: "deviceName required" })
    const approval = pairing.begin(body.deviceName)
    return sendJSON(res, 202, { status: "pending", approvalID: approval.id })
  }

  function handlePairStatus(url, res) {
    const approvalID = url.searchParams.get("approvalID")
    const status = approvalID ? pairing.status(approvalID) : null
    if (!status) return sendJSON(res, 404, { error: "unknown approval" })
    if (status.status === "denied") return sendJSON(res, 403, { status: "denied" })
    if (status.status === "pending") return sendJSON(res, 200, { status: "pending" })
    return sendJSON(res, 200, { status: "approved", token: status.token })
  }

  // Called by the local helper after the Mac user approves or denies a pairing
  // request. Restricted to loopback so the LAN cannot self-approve.
  async function handlePairDecision(req, res) {
    const remote = req.socket && req.socket.remoteAddress
    const loopback = !remote || remote === "127.0.0.1" || remote === "::1" || remote === "::ffff:127.0.0.1"
    if (!loopback) return sendJSON(res, 403, { error: "localhost only" })

    const body = parseJSON(await readBody(req))
    const decision = String(body.decision || "").toLowerCase()
    if (!body.approvalID || (decision !== "approve" && decision !== "deny")) {
      return sendJSON(res, 400, { error: "approvalID and decision are required" })
    }
    const result = decision === "approve" ? pairing.approve(body.approvalID) : pairing.deny(body.approvalID)
    if (!result) return sendJSON(res, 404, { error: "unknown approval" })
    return sendJSON(res, 200, { status: decision === "approve" ? "approved" : "denied" })
  }

  async function handleResolution(req, res) {
    const body = parseJSON(await readBody(req))
    const result = await resolution.resolve(body.requestID, body.action)
    if (result.applied) return sendJSON(res, 200, { status: "accepted" })
    return sendJSON(res, 409, { status: "not_applicable", reason: result.reason })
  }

  // Send a fresh prompt to a session (used to resume an inactive one).
  async function handlePrompt(req, res) {
    const body = parseJSON(await readBody(req))
    const sessionID = String(body.sessionID || "")
    const text = typeof body.text === "string" ? body.text : ""
    if (!sessionID || !text.trim()) return sendJSON(res, 400, { error: "sessionID and text are required" })
    if (typeof sendPrompt !== "function") return sendJSON(res, 409, { status: "unavailable" })
    try {
      await sendPrompt({ sessionID, text })
      return sendJSON(res, 200, { status: "accepted" })
    } catch (err) {
      return sendJSON(res, 409, { status: "failed", reason: String((err && err.message) || "error") })
    }
  }

  async function route(req, res) {
    const url = new URL(req.url || "/", "http://localhost")
    const path = url.pathname

    if (process.env.OPEN_ISLAND_MOBILE_DEBUG) {
      try {
        process.stderr.write(`[bridge] ${req.method} ${path}\n`)
      } catch {
        /* ignore */
      }
    }

    if (req.method === "POST" && path === "/pair") return handlePair(req, res)
    if (req.method === "GET" && path === "/pair") return handlePairStatus(url, res)
    if (req.method === "POST" && path === "/pair/decision") return handlePairDecision(req, res)

    if (!authorized(req)) return sendJSON(res, 401, { error: "unauthorized" })

    if (req.method === "GET" && path === "/state") return sendJSON(res, 200, model.snapshot())
    if (req.method === "GET" && path === "/status") {
      return sendJSON(res, 200, {
        connected: sseClients.size > 0,
        activeSessionCount: model.activeSessionCount(),
      })
    }
    if (req.method === "GET" && path === "/events") return openStream(req, res)
    if (req.method === "POST" && path === "/resolution") return handleResolution(req, res)
    if (req.method === "POST" && path === "/prompt") return handlePrompt(req, res)
    return sendJSON(res, 404, { error: "not found" })
  }

  function start() {
    return new Promise((resolve, reject) => {
      const onError = (err) => {
        server.off("listening", onListening)
        reject(err)
      }
      const onListening = () => {
        server.off("error", onError)
        if (keepaliveMs > 0) {
          keepaliveTimer = setInterval(() => {
            for (const res of sseClients) {
              try {
                res.write(": keepalive\n\n")
              } catch {
                sseClients.delete(res)
              }
            }
          }, keepaliveMs)
          keepaliveTimer.unref?.()
        }
        resolve(server.address())
      }
      server.once("error", onError)
      server.once("listening", onListening)
      server.listen(port, host)
    })
  }

  function stop() {
    if (keepaliveTimer) clearInterval(keepaliveTimer)
    keepaliveTimer = null
    for (const res of sseClients) {
      try {
        res.end()
      } catch {
        /* ignore */
      }
    }
    sseClients.clear()
    return new Promise((resolve) => server.close(() => resolve()))
  }

  return {
    start,
    stop,
    broadcast,
    clientCount: () => sseClients.size,
    address: () => server.address(),
  }
}
