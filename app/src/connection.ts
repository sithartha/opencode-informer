export type ConnectionStatus =
  | "disconnected"
  | "discovering"
  | "connecting"
  | "connected"
  | "recovering"

export interface ConnectionState {
  status: ConnectionStatus
  macName?: string
  error?: string
}

export type ConnectionAction =
  | { type: "discover" }
  | { type: "pairingStarted"; macName?: string }
  | { type: "connected"; macName?: string }
  | { type: "disconnected" }
  | { type: "failed"; message: string }
  | { type: "reset" }

export const initialConnection: ConnectionState = { status: "disconnected" }

/** Pure connection state machine for the app. */
export function connectionReducer(state: ConnectionState, action: ConnectionAction): ConnectionState {
  switch (action.type) {
    case "discover":
      return { status: "discovering" }
    case "pairingStarted":
      return { status: "connecting", macName: action.macName ?? state.macName }
    case "connected":
      return { status: "connected", macName: action.macName ?? state.macName }
    case "disconnected":
      // A known Mac means we should try to recover rather than start over.
      return state.macName ? { status: "recovering", macName: state.macName } : { status: "disconnected" }
    case "failed":
      return { status: "disconnected", macName: state.macName, error: action.message }
    case "reset":
      return { status: "disconnected" }
    default:
      return state
  }
}
