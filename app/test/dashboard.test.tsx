import { fireEvent, render } from "@testing-library/react-native"
import { HeroCard, NeedsAttentionCard, SessionCard } from "../src/components"
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
