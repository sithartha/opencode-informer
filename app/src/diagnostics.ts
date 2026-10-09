/**
 * Durable breadcrumbs for diagnosing unexpected terminations. The app records
 * lifecycle transitions, the last connection state, and the last uncaught error
 * so the next launch can report what happened even when the process was killed.
 */

export interface DiagnosticStore {
  get(): Promise<string | null>
  set(value: string): Promise<void>
}

export interface Diagnostic {
  lastTransition?: string
  lastTransitionAt?: number
  lastConnection?: string
  lastError?: string
  lastErrorAt?: number
  lastErrorFatal?: boolean
  backgroundedAt?: number
  foregroundedAt?: number
  endedUnexpectedlyAt?: number
}

export function parseDiagnostic(raw: string | null): Diagnostic {
  if (!raw) return {}
  try {
    const value = JSON.parse(raw)
    return value && typeof value === "object" ? (value as Diagnostic) : {}
  } catch {
    return {}
  }
}

function truncate(value: unknown, max = 600): string {
  const text = typeof value === "string" ? value : String(value ?? "")
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/** A short, human sentence for Settings, or null when there is nothing to show. */
export function describeDiagnostic(value: Diagnostic): string | null {
  if (value.lastError) {
    const when = value.lastErrorAt ? new Date(value.lastErrorAt).toLocaleString() : ""
    return `Last error${when ? ` (${when})` : ""}: ${value.lastError}`
  }
  if (value.endedUnexpectedlyAt) {
    return `The previous run may have ended in the background (${new Date(value.endedUnexpectedlyAt).toLocaleString()}).`
  }
  if (value.lastConnection) return `Last connection: ${value.lastConnection}`
  if (value.lastTransition) return `Last state: ${value.lastTransition}`
  return null
}

/**
 * A recorder bound to a store. All methods persist so the breadcrumb survives a
 * termination; callers may fire-and-forget the promise.
 */
export function createDiagnostics(store: DiagnosticStore) {
  let value: Diagnostic = {}
  const commit = () => store.set(JSON.stringify(value))

  return {
    async load(): Promise<Diagnostic> {
      value = parseDiagnostic(await store.get())
      return value
    },
    snapshot(): Diagnostic {
      return value
    },
    async transition(state: string): Promise<void> {
      value.lastTransition = state
      value.lastTransitionAt = Date.now()
      await commit()
    },
    async connection(status: string): Promise<void> {
      value.lastConnection = status
      await commit()
    },
    async error(error: unknown, fatal: boolean): Promise<void> {
      const message = error instanceof Error ? error.message : String(error)
      const stack = error instanceof Error && error.stack ? `\n${error.stack}` : ""
      value.lastError = truncate(`${message}${stack}`)
      value.lastErrorAt = Date.now()
      value.lastErrorFatal = fatal
      await commit()
    },
    async background(at: number): Promise<void> {
      value.backgroundedAt = at
      await commit()
    },
    async foreground(at: number): Promise<void> {
      value.foregroundedAt = at
      await commit()
    },
    /** On a cold start, flag a run that entered the background and never returned. */
    async coldStart(at: number): Promise<void> {
      const { backgroundedAt, foregroundedAt } = value
      if (backgroundedAt && (!foregroundedAt || backgroundedAt > foregroundedAt)) {
        value.endedUnexpectedlyAt = at
        await commit()
      }
    },
  }
}

export type Diagnostics = ReturnType<typeof createDiagnostics>

/** Run work, routing any thrown error to the handler; never rethrows. */
export async function runGuarded(work: () => Promise<unknown>, onError: (error: unknown) => void): Promise<void> {
  try {
    await work()
  } catch (error) {
    onError(error)
  }
}
