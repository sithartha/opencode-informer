import test from "node:test"
import assert from "node:assert/strict"
import {
  beginPairing,
  closeUrl,
  eventsUrl,
  fetchOptions,
  fetchState,
  optionsUrl,
  pollPairing,
  postClose,
  postPrompt,
  postResolution,
  postStart,
  postStop,
  postSwitch,
  promptUrl,
  resolutionUrl,
  sessionsUrl,
  stateUrl,
  stopUrl,
  switchUrl,
  type FetchLike,
} from "../src/bridgeClient"

function fakeFetch(status: number, body: unknown): FetchLike {
  return (async () =>
    ({
      status,
      ok: status >= 200 && status < 300,
      json: async () => body,
    }) as Response) as unknown as FetchLike
}

test("URL helpers follow the contract endpoints", () => {
  const base = "http://10.0.0.2:38963"
  assert.equal(stateUrl(base), `${base}/state`)
  assert.equal(eventsUrl(base), `${base}/events`)
  assert.equal(resolutionUrl(base), `${base}/resolution`)
})

test("beginPairing reports pending then approved", async () => {
  const pending = await beginPairing("http://h:1", "iPhone", fakeFetch(202, { status: "pending", approvalID: "a1" }))
  assert.deepEqual(pending, { status: "pending", approvalID: "a1" })

  const approved = await beginPairing("http://h:1", "iPhone", fakeFetch(200, { status: "approved", token: "t1" }))
  assert.deepEqual(approved, { status: "approved", token: "t1" })
})

test("pollPairing surfaces approval and denial", async () => {
  assert.deepEqual(await pollPairing("http://h:1", "a1", fakeFetch(200, { status: "approved", token: "t1" })), {
    status: "approved",
    token: "t1",
  })
  assert.deepEqual(await pollPairing("http://h:1", "a1", fakeFetch(403, {})), { status: "denied" })
})

test("fetchState throws on 401 and returns snapshots otherwise", async () => {
  await assert.rejects(() => fetchState("http://h:1", "bad", fakeFetch(401, {})), /unauthorized/)
  const snapshot = await fetchState("http://h:1", "t1", fakeFetch(200, { activeSessionCount: 0, sessions: [] }))
  assert.equal(snapshot.activeSessionCount, 0)
})

test("postResolution returns acceptance", async () => {
  assert.equal(await postResolution("http://h:1", "t1", "r1", "allow", fakeFetch(200, { status: "accepted" })), true)
  assert.equal(await postResolution("http://h:1", "t1", "r1", "allow", fakeFetch(409, { status: "not_applicable" })), false)
  await assert.rejects(() => postResolution("http://h:1", "bad", "r1", "allow", fakeFetch(401, {})), /unauthorized/)
})

test("promptUrl follows the contract", () => {
  assert.equal(promptUrl("http://h:1"), "http://h:1/prompt")
})

test("postPrompt posts the session and text", async () => {
  let seen: { url: string; body: unknown } | null = null
  const fetchImpl = (async (url: string, init: { body?: string }) => {
    seen = { url, body: JSON.parse(String(init.body)) }
    return { status: 200, ok: true, json: async () => ({}) }
  }) as unknown as FetchLike
  const ok = await postPrompt("http://h:1", "t1", "ses_1", "hello", fetchImpl)
  assert.equal(ok, true)
  assert.deepEqual(seen, { url: "http://h:1/prompt", body: { sessionID: "ses_1", text: "hello" } })
})

test("lifecycle URL helpers follow the contract", () => {
  const base = "http://h:1"
  assert.equal(sessionsUrl(base), `${base}/sessions`)
  assert.equal(stopUrl(base), `${base}/stop`)
  assert.equal(closeUrl(base), `${base}/close`)
  assert.equal(optionsUrl(base), `${base}/options`)
  assert.equal(switchUrl(base), `${base}/switch`)
})

test("postStart returns the new session id", async () => {
  const fetchImpl = (async () => ({
    status: 200,
    ok: true,
    json: async () => ({ status: "accepted", sessionID: "ses_new" }),
  })) as unknown as FetchLike
  assert.equal(await postStart("http://h:1", "t", undefined, fetchImpl), "ses_new")
})

test("postStart posts the chosen agent and model", async () => {
  let seen: unknown = null
  const fetchImpl = (async (_url: string, init: { body?: string }) => {
    seen = JSON.parse(String(init.body))
    return { status: 200, ok: true, json: async () => ({ status: "accepted", sessionID: "ses_new" }) }
  }) as unknown as FetchLike
  await postStart("http://h:1", "t", undefined, fetchImpl, { agent: "plan", model: { providerID: "deepseek", id: "deepseek-flash" } })
  assert.deepEqual(seen, { agent: "plan", model: { providerID: "deepseek", id: "deepseek-flash" } })
})

test("postStop and postClose report ok", async () => {
  const ok = (async () => ({ status: 200, ok: true, json: async () => ({}) })) as unknown as FetchLike
  assert.equal(await postStop("http://h:1", "t", "ses_1", ok), true)
  assert.equal(await postClose("http://h:1", "t", "ses_1", ok), true)
})

test("fetchOptions returns the discovered agents and models", async () => {
  const fetchImpl = (async () => ({
    status: 200,
    ok: true,
    json: async () => ({ agents: ["build"], models: [{ providerID: "deepseek", id: "x" }] }),
  })) as unknown as FetchLike
  assert.deepEqual(await fetchOptions("http://h:1", "t", fetchImpl), {
    agents: ["build"],
    models: [{ providerID: "deepseek", id: "x" }],
  })
})

test("postSwitch posts the target", async () => {
  let seen: unknown = null
  const fetchImpl = (async (url: string, init: { body?: string }) => {
    seen = { url, body: JSON.parse(String(init.body)) }
    return { status: 200, ok: true, json: async () => ({}) }
  }) as unknown as FetchLike
  assert.equal(await postSwitch("http://h:1", "t", "ses_1", { agent: "plan" }, fetchImpl), true)
  assert.deepEqual(seen, { url: "http://h:1/switch", body: { sessionID: "ses_1", agent: "plan" } })
})
