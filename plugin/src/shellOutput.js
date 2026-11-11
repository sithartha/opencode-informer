// Live shell output: OpenCode writes each shell command's output to a file
// while it runs (`shell.created` carries the path) and emits `shell.exited`
// when the process ends. We poll the tail of that file and publish the last few
// lines so the phone can show a running command instead of just "shell".

import { open } from "node:fs/promises"

export const MAX_TOOL_LINES = 5
const DEFAULT_INTERVAL_MS = 400
// Read only the tail: a build log can be megabytes and the phone shows 5 lines.
const MAX_TAIL_BYTES = 8192
const MAX_LINE_CHARS = 200
// Bound disk reads if OpenCode leaves many shells running at once.
const MAX_TRACKED = 8
const MAX_TRACK_MS = 15 * 60 * 1000

/** The last `max` lines of `text`, with trailing blank lines dropped. */
export function tailLines(text, max = MAX_TOOL_LINES, maxLine = MAX_LINE_CHARS) {
  const lines = String(text ?? "").split(/\r?\n/)
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop()
  return lines.slice(-max).map((line) => (line.length > maxLine ? `${line.slice(0, maxLine)}…` : line))
}

/** Read up to MAX_TAIL_BYTES from the end of a file. Missing files read as "". */
async function readTail(file) {
  let handle
  try {
    handle = await open(file, "r")
    const { size } = await handle.stat()
    if (!size) return ""
    const length = Math.min(size, MAX_TAIL_BYTES)
    const buffer = Buffer.alloc(length)
    await handle.read(buffer, 0, length, size - length)
    let text = buffer.toString("utf8")
    // A byte-limited tail usually starts mid-line; drop that partial line.
    if (size > length) {
      const newline = text.indexOf("\n")
      text = newline >= 0 ? text.slice(newline + 1) : ""
    }
    return text
  } catch {
    return ""
  } finally {
    try {
      await handle?.close()
    } catch {
      /* ignore */
    }
  }
}

/**
 * Follows running shell commands and reports their last lines whenever they
 * change. I/O is injected so the tracker stays testable without a process.
 */
export class ShellOutputTracker {
  constructor({ onLines, resolveSession, lines = MAX_TOOL_LINES, intervalMs = DEFAULT_INTERVAL_MS, read = readTail, now = Date.now } = {}) {
    this.onLines = onLines || (() => {})
    this.resolveSession = resolveSession || ((id) => id)
    this.lines = lines
    this.intervalMs = intervalMs
    this.read = read
    this.now = now
    this.shells = new Map() // shellID -> { file, sessionID, last, timer, busy, startedAt }
  }

  /** Feed a raw OpenCode event; starts and stops tracking as shells come and go. */
  observe(event) {
    const type = event && event.type
    const data = (event && event.data) || {}
    if (type === "shell.created") {
      this.track(data.info)
    } else if (type === "shell.exited") {
      this.stop(data.id, { final: true })
    } else if (type === "shell.deleted") {
      this.stop(data.id)
    }
  }

  track(info = {}) {
    const file = info && info.file
    const shellID = info && info.id
    const rawSession = info && info.metadata && info.metadata.sessionID
    if (!file || !shellID || !rawSession) return
    const sessionID = this.resolveSession(rawSession)
    if (!sessionID) return
    if (this.shells.size >= MAX_TRACKED) {
      const oldest = this.shells.keys().next().value
      if (oldest) this.stop(oldest)
    }
    const entry = { file, sessionID, last: "", timer: null, busy: false, startedAt: this.now() }
    this.shells.set(shellID, entry)
    this.schedule(shellID)
  }

  schedule(shellID) {
    const entry = this.shells.get(shellID)
    if (!entry) return
    const timer = setTimeout(() => void this.poll(shellID), this.intervalMs)
    // Never keep the host process alive for a tail poll.
    timer.unref?.()
    entry.timer = timer
  }

  async poll(shellID) {
    const entry = this.shells.get(shellID)
    if (!entry) return
    if (this.now() - entry.startedAt > MAX_TRACK_MS) {
      this.stop(shellID)
      return
    }
    if (!entry.busy) {
      entry.busy = true
      try {
        const text = await this.read(entry.file)
        const lines = tailLines(text, this.lines)
        const signature = lines.join("\n")
        if (lines.length > 0 && signature !== entry.last) {
          entry.last = signature
          this.onLines(entry.sessionID, lines, shellID)
        }
      } finally {
        entry.busy = false
      }
    }
    this.schedule(shellID)
  }

  /**
   * Stop following a shell. A final read picks up output written between the
   * last poll and the exit, so short commands still show their result.
   */
  stop(shellID, { final = false } = {}) {
    const entry = this.shells.get(shellID)
    if (!entry) return
    this.shells.delete(shellID)
    if (entry.timer) clearTimeout(entry.timer)
    if (!final || entry.busy) return
    Promise.resolve(this.read(entry.file))
      .then((text) => {
        const lines = tailLines(text, this.lines)
        if (lines.length > 0 && lines.join("\n") !== entry.last) {
          entry.last = lines.join("\n")
          this.onLines(entry.sessionID, lines, shellID)
        }
      })
      .catch(() => {})
  }

  stopAll() {
    for (const shellID of [...this.shells.keys()]) this.stop(shellID)
  }
}
