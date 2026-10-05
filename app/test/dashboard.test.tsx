import { fireEvent, render } from "@testing-library/react-native"
import { Linking } from "react-native"
import { ConfirmModal, HeroCard, LinkText, NeedsAttentionCard, SessionCard, SwitcherModal } from "../src/components"
import { DemoScreen } from "../src/DemoScreen"
import { createStyles } from "../src/styles"
import { darkTheme, lightTheme } from "../src/theme"
import type { Session } from "../src/events"

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

describe("HeroCard", () => {
  it("shows the total, per-state counts, and labels", async () => {
    const { getByText } = await render(
      <HeroCard agg={{ total: 3, running: 2, waitingApproval: 1, waitingAnswer: 0, stopped: 1 }} theme={lightTheme} styles={styles} />,
    )
    expect(getByText("3")).toBeTruthy()
    expect(getByText("active agents")).toBeTruthy()
    expect(getByText("2 working")).toBeTruthy()
    expect(getByText("1 inactive")).toBeTruthy()
    expect(getByText("1 permission")).toBeTruthy()
    expect(getByText("0 question")).toBeTruthy()
  })

  it("uses the singular label for one agent", async () => {
    const { getByText } = await render(
      <HeroCard agg={{ total: 1, running: 1, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }} theme={lightTheme} styles={styles} />,
    )
    expect(getByText("active agent")).toBeTruthy()
  })

  it("renders the empty state for zero agents", async () => {
    const { getByText } = await render(
      <HeroCard agg={{ total: 0, running: 0, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }} theme={darkTheme} styles={createStyles(darkTheme)} />,
    )
    expect(getByText("0")).toBeTruthy()
    expect(getByText("0 working")).toBeTruthy()
  })
})

describe("SessionCard", () => {
  it("shows the phase, tool, counts, and last activity", async () => {
    const { getByText } = await render(<SessionCard session={session()} requests={[]} resolve={jest.fn()} theme={lightTheme} styles={styles} />)
    expect(getByText("/Users/dev/api")).toBeTruthy()
    expect(getByText("running")).toBeTruthy()
    expect(getByText("tool · Bash")).toBeTruthy()
    expect(getByText("2 subagents")).toBeTruthy()
    expect(getByText("3 shells")).toBeTruthy()
    expect(getByText("Running the test suite")).toBeTruthy()
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
        requests={[{ requestID: "q1", sessionID: "s1", kind: "question", title: "Which database?", options: ["PostgreSQL", "SQLite"] }]}
        resolve={resolve}
        theme={lightTheme}
        styles={styles}
      />,
    )
    expect(getByText("Which database?")).toBeTruthy()
    await fireEvent.press(getByText("SQLite"))
    expect(resolve).toHaveBeenCalledWith("q1", "SQLite")
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
        request={{ requestID: "o1", sessionID: "orphan", kind: "question", title: "A session asked something", options: ["Yes", "No"] }}
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

  it("expands a long activity message", async () => {
    const long = "A".repeat(200)
    const { getByText } = await render(
      <SessionCard session={session({ lastActivity: long })} requests={[]} resolve={jest.fn()} theme={lightTheme} styles={styles} />,
    )
    await fireEvent.press(getByText("more"))
    expect(getByText("less")).toBeTruthy()
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

  it("shows Stop only while running and calls onStop", async () => {
    const onStop = jest.fn()
    const running = await render(<SessionCard session={session({ phase: "running" })} requests={[]} resolve={jest.fn()} theme={lightTheme} styles={styles} onStop={onStop} />)
    await fireEvent.press(running.getByText("Stop"))
    expect(onStop).toHaveBeenCalledWith("s1")

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
  it("stops a running session and closes a card", async () => {
    const { getAllByText, getAllByLabelText, queryByText } = await render(
      <DemoScreen onClose={() => {}} onOpenGallery={() => {}} theme={lightTheme} styles={styles} />,
    )
    await fireEvent.press(getAllByText("Stop")[0])
    expect(queryByText("Stop")).toBeNull()

    const closes = getAllByLabelText("Close session")
    await fireEvent.press(closes[closes.length - 1])
    expect(queryByText("Database choice")).toBeNull()
  })
})

describe("session title", () => {
  it("names the card with the session title and falls back to the cwd", async () => {
    const titled = await render(
      <SessionCard session={session({ title: "Add a health endpoint", cwd: "/Users/dev/api" })} requests={[]} resolve={jest.fn()} theme={lightTheme} styles={styles} />,
    )
    expect(titled.getByText("Add a health endpoint")).toBeTruthy()

    const fallback = await render(<SessionCard session={session({ cwd: "/Users/dev/api" })} requests={[]} resolve={jest.fn()} theme={lightTheme} styles={styles} />)
    expect(fallback.getByText("/Users/dev/api")).toBeTruthy()
  })
})
