import { fireEvent, render } from "@testing-library/react-native"
import { Linking } from "react-native"
import { BrandMark, CompactHero, ConfirmModal, GradientButton, HeroCard, LinkText, ManualConnectModal, MultiQuestionForm, NeedsAttentionCard, PairingCodeModal, SessionCard, SwitcherModal } from "../src/components"
import { DemoScreen } from "../src/DemoScreen"
import { createStyles } from "../src/styles"
import { darkTheme, lightTheme } from "../src/theme"
import type { PendingRequest, Session } from "../src/events"

const styles = createStyles(lightTheme)

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: "s1",
    agent: "opencode",
    cwd: "/Users/dev/api",
    phase: "running",
    currentTool: "Bash",
    lastActivity: "Running the test suite",
    subagents: 2,
    shells: 3,
    updatedAt: 0,
    ...overrides,
  }
}

describe("CompactHero", () => {
  it("shows a colored dot and count per state", async () => {
    const { getByText } = await render(
      <CompactHero agg={{ total: 14, running: 2, waitingApproval: 3, waitingAnswer: 4, stopped: 5 }} server="192.168.1.62" connected theme={lightTheme} styles={styles} />,
    )
    expect(getByText("2")).toBeTruthy()
    expect(getByText("3")).toBeTruthy()
    expect(getByText("4")).toBeTruthy()
    expect(getByText("5")).toBeTruthy()
    expect(getByText("192.168.1.62")).toBeTruthy()
  })

  it("omits the server pill when there is no server", async () => {
    const { queryByText } = await render(
      <CompactHero agg={{ total: 0, running: 0, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }} theme={lightTheme} styles={styles} />,
    )
    expect(queryByText("192.168.1.62")).toBeNull()
  })
})

describe("HeroCard", () => {
  it("leads with the agents that need the user", async () => {
    const { getByText } = await render(
      <HeroCard agg={{ total: 3, running: 2, waitingApproval: 1, waitingAnswer: 0, stopped: 1 }} theme={lightTheme} styles={styles} />,
    )
    expect(getByText("1")).toBeTruthy()
    expect(getByText("agent needs you")).toBeTruthy()
    expect(getByText("2 working")).toBeTruthy()
    expect(getByText("1 inactive")).toBeTruthy()
    expect(getByText("1 permission")).toBeTruthy()
  })

  it("sums permissions and questions in the primary figure", async () => {
    const { getByText } = await render(
      <HeroCard agg={{ total: 4, running: 2, waitingApproval: 1, waitingAnswer: 1, stopped: 0 }} theme={lightTheme} styles={styles} />,
    )
    expect(getByText("2")).toBeTruthy()
    expect(getByText("agents need you")).toBeTruthy()
  })

  it("shows an all-clear state when only agents are working", async () => {
    const { getByText } = await render(
      <HeroCard agg={{ total: 1, running: 1, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }} theme={lightTheme} styles={styles} />,
    )
    expect(getByText("All clear")).toBeTruthy()
    expect(getByText("Nothing needs you")).toBeTruthy()
    expect(getByText("1 working")).toBeTruthy()
  })

  it("shows an idle state when nothing is active", async () => {
    const { getByText } = await render(
      <HeroCard agg={{ total: 0, running: 0, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }} theme={darkTheme} styles={createStyles(darkTheme)} />,
    )
    expect(getByText("No active agents")).toBeTruthy()
    expect(getByText("Nothing is running")).toBeTruthy()
    expect(getByText("0 working")).toBeTruthy()
  })

  it("offers review only while something is waiting", async () => {
    const onReviewWaiting = jest.fn()
    const waiting = await render(
      <HeroCard agg={{ total: 2, running: 1, waitingApproval: 0, waitingAnswer: 1, stopped: 0 }} theme={lightTheme} styles={styles} onReviewWaiting={onReviewWaiting} />,
    )
    await fireEvent.press(waiting.getByText("Review 1 waiting"))
    expect(onReviewWaiting).toHaveBeenCalledTimes(1)

    const clear = await render(
      <HeroCard agg={{ total: 1, running: 1, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }} theme={lightTheme} styles={styles} onReviewWaiting={onReviewWaiting} />,
    )
    expect(clear.queryByText("Review 1 waiting")).toBeNull()
  })
})

describe("SessionCard", () => {
  it("shows the phase, tool, counts, and last activity", async () => {
    const { getByText, getAllByText } = await render(<SessionCard session={session()} requests={[]} resolve={jest.fn()} theme={lightTheme} styles={styles} />)
    expect(getAllByText("api").length).toBeGreaterThan(0)
    expect(getByText("running")).toBeTruthy()
    expect(getByText("tool · Bash")).toBeTruthy()
    expect(getByText("2 subagents")).toBeTruthy()
    expect(getByText("3 shells")).toBeTruthy()
    expect(getByText("Running the test suite")).toBeTruthy()
  })

  it("shows the latest message and reveals earlier ones", async () => {
    const { getByText, queryByText } = await render(
      <SessionCard
        session={session({ lastActivity: "Third", activityHistory: ["First", "Second", "Third"] })}
        requests={[]}
        resolve={jest.fn()}
        theme={lightTheme}
        styles={styles}
      />,
    )
    expect(getByText("Third")).toBeTruthy()
    expect(queryByText("First")).toBeNull()
    await fireEvent.press(getByText("show earlier (2)"))
    expect(getByText("First")).toBeTruthy()
    expect(getByText("Second")).toBeTruthy()
  })

  it("shows the recent messages before a pending question", async () => {
    const { getByText } = await render(
      <SessionCard
        session={session({ phase: "waiting-answer", currentTool: null, lastActivity: "Third", activityHistory: ["First", "Second", "Third"] })}
        requests={[{ requestID: "q1", sessionID: "s1", kind: "question", title: "Pick", options: [{ label: "A" }] }]}
        resolve={jest.fn()}
        theme={lightTheme}
        styles={styles}
      />,
    )
    expect(getByText("First")).toBeTruthy()
    expect(getByText("Second")).toBeTruthy()
    expect(getByText("Pick")).toBeTruthy()
  })

  it("shows a permission inline and resolves allow/deny", async () => {
    const resolve = jest.fn()
    const { getByText } = await render(
      <SessionCard
        session={session({ phase: "waiting-permission", currentTool: null })}
        requests={[{ requestID: "p1", sessionID: "s1", kind: "permission", title: "Allow Bash", summary: "rm -rf build/" }]}
        resolve={resolve}
        theme={lightTheme}
        styles={styles}
      />,
    )
    expect(getByText("Allow Bash")).toBeTruthy()
    expect(getByText("rm -rf build/")).toBeTruthy()

    await fireEvent.press(getByText("Allow"))
    expect(resolve).toHaveBeenCalledWith("p1", "allow")
    await fireEvent.press(getByText("Deny"))
    expect(resolve).toHaveBeenCalledWith("p1", "deny")
  })

  it("shows a question inline and resolves the chosen option", async () => {
    const resolve = jest.fn()
    const { getByText } = await render(
      <SessionCard
        session={session({ phase: "waiting-answer", currentTool: null })}
        requests={[{ requestID: "q1", sessionID: "s1", kind: "question", title: "Which database?", options: [{ label: "PostgreSQL", description: "Managed relational database" }, { label: "SQLite" }] }]}
        resolve={resolve}
        theme={lightTheme}
        styles={styles}
      />,
    )
    expect(getByText("Which database?")).toBeTruthy()
    expect(getByText("Managed relational database")).toBeTruthy()
    await fireEvent.press(getByText("SQLite"))
    expect(resolve).toHaveBeenCalledWith("q1", "SQLite")
  })

  it("shows the session cost when reported", async () => {
    const { getByText } = await render(
      <SessionCard session={session({ cost: 0.0432 })} requests={[]} resolve={jest.fn()} theme={lightTheme} styles={styles} />,
    )
    expect(getByText("$0.0432")).toBeTruthy()
  })

  it("shows only the first pending request for a session", async () => {
    const { queryByText } = await render(
      <SessionCard
        session={session()}
        requests={[
          { requestID: "p1", sessionID: "s1", kind: "permission", title: "First" },
          { requestID: "p2", sessionID: "s1", kind: "permission", title: "Second" },
        ]}
        resolve={jest.fn()}
        theme={lightTheme}
        styles={styles}
      />,
    )
    expect(queryByText("First")).toBeTruthy()
    expect(queryByText("Second")).toBeNull()
  })
})

describe("NeedsAttentionCard", () => {
  it("renders an orphan question and resolves an option", async () => {
    const resolve = jest.fn()
    const { getByText } = await render(
      <NeedsAttentionCard
        request={{ requestID: "o1", sessionID: "orphan", kind: "question", title: "A session asked something", options: [{ label: "Yes" }, { label: "No" }] }}
        resolve={resolve}
        theme={lightTheme}
        styles={styles}
      />,
    )
    expect(getByText("A session asked something")).toBeTruthy()
    await fireEvent.press(getByText("Yes"))
    expect(resolve).toHaveBeenCalledWith("o1", "Yes")
  })
})

describe("PendingActions free-form", () => {
  it("submits typed text for a custom question", async () => {
    const resolve = jest.fn()
    const { getByText, getByPlaceholderText } = await render(
      <SessionCard
        session={session({ phase: "waiting-answer", currentTool: null })}
        requests={[{ requestID: "q1", sessionID: "s1", kind: "question", title: "Custom?", options: [], allowFreeform: true }]}
        resolve={resolve}
        theme={lightTheme}
        styles={styles}
      />,
    )
    await fireEvent.changeText(getByPlaceholderText("Type an answer"), "my answer")
    await fireEvent.press(getByText("Send"))
    expect(resolve).toHaveBeenCalledWith("q1", "my answer")
  })
})

describe("inactive session", () => {
  it("offers a prompt input that sends the prompt", async () => {
    const onSendPrompt = jest.fn()
    const { getByText, getByPlaceholderText } = await render(
      <SessionCard
        session={session({ phase: "completed", currentTool: null })}
        requests={[]}
        resolve={jest.fn()}
        theme={lightTheme}
        styles={styles}
        onSendPrompt={onSendPrompt}
      />,
    )
    await fireEvent.changeText(getByPlaceholderText("Send a prompt"), "continue please")
    await fireEvent.press(getByText("Send"))
    expect(onSendPrompt).toHaveBeenCalledWith("s1", "continue please")
  })

  it("opens the full message in a modal", async () => {
    const long = "A".repeat(200)
    const { getByText, getByLabelText } = await render(
      <SessionCard session={session({ lastActivity: long })} requests={[]} resolve={jest.fn()} theme={lightTheme} styles={styles} />,
    )
    await fireEvent.press(getByLabelText("Read full message"))
    expect(getByText("Message")).toBeTruthy()
    expect(getByText("Close")).toBeTruthy()
  })
})

describe("MultiQuestionForm", () => {
  const request: PendingRequest = {
    requestID: "r2",
    sessionID: "s1",
    kind: "question",
    title: "Deploy target?",
    options: [{ label: "Staging", value: "staging" }, { label: "Production", value: "prod" }],
    allowFreeform: false,
    questions: [
      { key: "q0", title: "Deploy target?", options: [{ label: "Staging", value: "staging" }, { label: "Production", value: "prod" }], allowFreeform: false },
      { key: "q1", title: "Run migrations?", options: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }], allowFreeform: false },
    ],
  }

  it("shows every question and submits all answers together", async () => {
    const resolve = jest.fn()
    const { getByText, getByLabelText } = await render(
      <MultiQuestionForm request={request} resolve={resolve} styles={styles} theme={lightTheme} />,
    )
    expect(getByText("Deploy target?")).toBeTruthy()
    expect(getByText("Run migrations?")).toBeTruthy()

    // Submit before answering does nothing.
    await fireEvent.press(getByLabelText("Submit answers"))
    expect(resolve).not.toHaveBeenCalled()

    await fireEvent.press(getByLabelText("Deploy target?: Staging"))
    await fireEvent.press(getByLabelText("Run migrations?: Yes"))
    await fireEvent.press(getByLabelText("Submit answers"))
    expect(resolve).toHaveBeenCalledWith("r2", "staging", { q0: "staging", q1: "yes" })
  })
})

describe("DemoScreen", () => {
  it("resolves a sample permission, then simulates a new question", async () => {
    const { getByText, queryByText } = await render(
      <DemoScreen onClose={() => {}} onOpenGallery={() => {}} theme={lightTheme} styles={styles} />,
    )
    expect(getByText("Allow Bash: rm -rf build/")).toBeTruthy()
    await fireEvent.press(getByText("Allow"))
    expect(queryByText("Allow Bash: rm -rf build/")).toBeNull()

    await fireEvent.press(getByText("New question"))
    expect(getByText("Ship this change?")).toBeTruthy()
  })
})

describe("hero start control", () => {
  it("calls onStart when + is pressed", async () => {
    const onStart = jest.fn()
    const { getByLabelText } = await render(
      <HeroCard agg={{ total: 2, running: 2, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }} theme={lightTheme} styles={styles} onStart={onStart} />,
    )
    await fireEvent.press(getByLabelText("Start a new session"))
    expect(onStart).toHaveBeenCalledTimes(1)
  })
})

describe("session controls", () => {
  it("shows the agent and model label", async () => {
    const { getByText } = await render(
      <SessionCard session={session({ agent: "build", model: "deepseek/deepseek-flash" })} requests={[]} resolve={jest.fn()} theme={lightTheme} styles={styles} />,
    )
    expect(getByText("build · deepseek/deepseek-flash")).toBeTruthy()
  })

  it("shows Stop while running or waiting and calls onStop", async () => {
    const onStop = jest.fn()
    const running = await render(<SessionCard session={session({ phase: "running" })} requests={[]} resolve={jest.fn()} theme={lightTheme} styles={styles} onStop={onStop} />)
    await fireEvent.press(running.getByText("Stop"))
    expect(onStop).toHaveBeenCalledWith("s1")

    const waiting = await render(
      <SessionCard
        session={session({ phase: "waiting-answer", currentTool: null })}
        requests={[{ requestID: "q1", sessionID: "s1", kind: "question", title: "Pick", options: [{ label: "A" }] }]}
        resolve={jest.fn()}
        theme={lightTheme}
        styles={styles}
        onStop={onStop}
      />,
    )
    expect(waiting.getByText("Stop")).toBeTruthy()

    const done = await render(<SessionCard session={session({ phase: "completed" })} requests={[]} resolve={jest.fn()} theme={lightTheme} styles={styles} onStop={onStop} />)
    expect(done.queryByText("Stop")).toBeNull()
  })

  it("calls onClose when the close control is pressed", async () => {
    const onClose = jest.fn()
    const { getByLabelText } = await render(<SessionCard session={session()} requests={[]} resolve={jest.fn()} theme={lightTheme} styles={styles} onClose={onClose} />)
    await fireEvent.press(getByLabelText("Close session"))
    expect(onClose).toHaveBeenCalledWith("s1")
  })

  it("offers a prompt field for an empty session", async () => {
    const { getByPlaceholderText } = await render(
      <SessionCard session={session({ phase: "completed", lastActivity: "" })} requests={[]} resolve={jest.fn()} theme={lightTheme} styles={styles} onSendPrompt={jest.fn()} />,
    )
    expect(getByPlaceholderText("Send a prompt")).toBeTruthy()
  })
})

describe("ConfirmModal", () => {
  it("confirms and cancels", async () => {
    const onConfirm = jest.fn()
    const onCancel = jest.fn()
    const { getByText } = await render(<ConfirmModal visible title="Stop this session?" onConfirm={onConfirm} onCancel={onCancel} theme={lightTheme} styles={styles} />)
    await fireEvent.press(getByText("Confirm"))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    await fireEvent.press(getByText("Cancel"))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

describe("LinkText", () => {
  it("opens a URL and leaves plain text alone", async () => {
    const spy = jest.spyOn(Linking, "openURL").mockResolvedValue(true as never)
    const { getByText } = await render(<LinkText styles={styles} text="see https://expo.dev/docs now" />)
    await fireEvent.press(getByText("https://expo.dev/docs"))
    expect(spy).toHaveBeenCalledWith("https://expo.dev/docs")
    spy.mockRestore()
  })
})

describe("SwitcherModal", () => {
  it("renders arbitrary agent names and reports selections", async () => {
    const onSelectAgent = jest.fn()
    const onSelectModel = jest.fn()
    const { getByText } = await render(
      <SwitcherModal
        visible
        agents={["build", "Reviewer"]}
        models={[{ providerID: "deepseek", id: "deepseek-flash" }]}
        onSelectAgent={onSelectAgent}
        onSelectModel={onSelectModel}
        onClose={() => {}}
        theme={lightTheme}
        styles={styles}
      />,
    )
    expect(getByText("Reviewer")).toBeTruthy()
    await fireEvent.press(getByText("Reviewer"))
    expect(onSelectAgent).toHaveBeenCalledWith("Reviewer")
    await fireEvent.press(getByText("deepseek/deepseek-flash"))
    expect(onSelectModel).toHaveBeenCalledWith({ providerID: "deepseek", id: "deepseek-flash" })
  })
})

describe("DemoScreen controls", () => {
  it("stops an active session and closes a card", async () => {
    const { getAllByText, getAllByLabelText, queryByText } = await render(
      <DemoScreen onClose={() => {}} onOpenGallery={() => {}} theme={lightTheme} styles={styles} />,
    )
    const before = getAllByText("Stop").length
    await fireEvent.press(getAllByText("Stop")[0])
    expect(getAllByText("Stop").length).toBe(before - 1)

    const closes = getAllByLabelText("Close session")
    await fireEvent.press(closes[closes.length - 1])
    expect(queryByText("Database choice")).toBeNull()
  })
})

describe("ManualConnectModal", () => {
  it("passes the address and port to onConnect", async () => {
    const onConnect = jest.fn()
    const { getByLabelText, getByText } = await render(
      <ManualConnectModal visible onConnect={onConnect} onClose={() => {}} theme={lightTheme} styles={styles} />,
    )
    await fireEvent.changeText(getByLabelText("Address"), "192.168.1.10")
    await fireEvent.changeText(getByLabelText("Port"), "4000")
    await fireEvent.press(getByText("Connect"))
    expect(onConnect).toHaveBeenCalledWith("192.168.1.10", "4000")
  })
})

describe("PairingCodeModal", () => {
  it("submits the entered code and shows an error", async () => {
    const onSubmit = jest.fn()
    const { getByLabelText, getByText } = await render(
      <PairingCodeModal visible error="Incorrect code" onSubmit={onSubmit} onCancel={() => {}} theme={lightTheme} styles={styles} />,
    )
    expect(getByText("Incorrect code")).toBeTruthy()
    await fireEvent.changeText(getByLabelText("Pairing code"), "123456")
    await fireEvent.press(getByText("Pair"))
    expect(onSubmit).toHaveBeenCalledWith("123456")
  })
})

describe("session title", () => {
  it("names the card with the session title and falls back to the directory name", async () => {
    const titled = await render(
      <SessionCard session={session({ title: "Add a health endpoint", cwd: "/Users/dev/api" })} requests={[]} resolve={jest.fn()} theme={lightTheme} styles={styles} />,
    )
    expect(titled.getByText("Add a health endpoint")).toBeTruthy()
    expect(titled.getByText("api")).toBeTruthy()

    const fallback = await render(<SessionCard session={session({ cwd: "/Users/dev/api" })} requests={[]} resolve={jest.fn()} theme={lightTheme} styles={styles} />)
    expect(fallback.getAllByText("api").length).toBeGreaterThan(0)
    expect(fallback.queryByText("/Users/dev/api")).toBeNull()
  })
})

describe("DemoScreen switcher", () => {
  it("opens the mode/model switcher from a card chip", async () => {
    const { getAllByLabelText, getByText } = await render(
      <DemoScreen onClose={() => {}} onOpenGallery={() => {}} theme={lightTheme} styles={styles} />,
    )
    await fireEvent.press(getAllByLabelText("Change mode and model")[0])
    expect(getByText("Mode & model")).toBeTruthy()
    expect(getByText("build")).toBeTruthy()
  })
})
