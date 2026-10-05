// Typed mirror of ../../contract/contract.json. A parity test asserts the two
// stay identical (test/contract-parity.test.ts).

export const CONTRACT = {
  version: 1,
  bridge: { host: "0.0.0.0", defaultPort: 38963 },
  helper: { host: "127.0.0.1", defaultPort: 38964, ringPath: "/ring" },
  endpoints: {
    pair: "/pair",
    state: "/state",
    status: "/status",
    events: "/events",
    resolution: "/resolution",
    prompt: "/prompt",
    sessions: "/sessions",
    stop: "/stop",
    close: "/close",
    options: "/options",
    switch: "/switch",
  },
  phases: ["running", "waiting-permission", "waiting-answer", "completed", "ended"],
  streamEvents: [
    "session.started",
    "session.ended",
    "prompt.submitted",
    "tool.started",
    "tool.ended",
    "permission.requested",
    "question.asked",
    "turn.completed",
    "session.activity",
    "session.updated",
    "actionable.resolved",
  ],
  doorbellKinds: ["permission", "question", "completion", "pairing"],
  ble: {
    serviceUUID: "7b1e5a20-6c1a-4f4e-9c3a-2d5f8b9a1c01",
    doorbellUUID: "7b1e5a21-6c1a-4f4e-9c3a-2d5f8b9a1c02",
    rendezvousUUID: "7b1e5a22-6c1a-4f4e-9c3a-2d5f8b9a1c03",
    pairingUUID: "7b1e5a23-6c1a-4f4e-9c3a-2d5f8b9a1c04",
  },
} as const

export type Phase = (typeof CONTRACT.phases)[number]
export type StreamEventType = (typeof CONTRACT.streamEvents)[number]

export const SERVICE_UUID = CONTRACT.ble.serviceUUID
export const DOORBELL_UUID = CONTRACT.ble.doorbellUUID
export const RENDEZVOUS_UUID = CONTRACT.ble.rendezvousUUID
export const PAIRING_UUID = CONTRACT.ble.pairingUUID
