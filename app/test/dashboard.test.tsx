import { fireEvent, render } from "@testing-library/react-native"
import { Linking, View } from "react-native"
import { BrandMark, CompactHero, CompactSessionCard, ConfirmModal, GradientButton, HeroCard, LinkText, ManualConnectModal, MultiQuestionForm, NeedsAttentionCard, PairingCodeModal, PreviewScreen, SessionCard, SessionGrid, SessionsLayoutToggle, SwitcherModal } from "../src/components"
import { DemoScreen } from "../src/DemoScreen"
import { ThemeMark } from "../src/themeMark"
import { ScreenBackdrop, TERMINAL_OI_ART } from "../src/terminalArt"
import { GlowDot } from "../src/ui"
import { createStyles } from "../src/styles"
import { resolveTheme } from "../src/theme"
import type { PendingRequest, Session } from "../src/events"
import { avatarColor } from "../src/avatar"

const lightTheme = resolveTheme("default", "light")
const darkTheme = resolveTheme("default", "dark")
const terminalLight = resolveTheme("terminal", "light")
const terminalDark = resolveTheme("terminal", "dark")
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

  it("toggles several options and submits them together for a multi-answer question", async () => {
    const resolve = jest.fn()
    const { getByText } = await render(
      <SessionCard
        session={session({ phase: "waiting-answer", currentTool: null })}
        requests={[
          {
            requestID: "m1",
            sessionID: "s1",
            kind: "question",
            title: "Which checks?",
            multiple: true,
            options: [{ label: "Lint" }, { label: "Unit tests" }],
            questions: [
              { key: "q0", title: "Which checks?", options: [{ label: "Lint" }, { label: "Unit tests" }], allowFreeform: false, multiple: true },
            ],
          },
        ]}
        resolve={resolve}
        theme={lightTheme}
        styles={styles}
      />,
    )
    await fireEvent.press(getByText("Lint"))
    // The question must not resolve on the first tap.
    expect(resolve).not.toHaveBeenCalled()
    await fireEvent.press(getByText("Unit tests"))
    await fireEvent.press(getByText("Submit"))
    expect(resolve).toHaveBeenCalledWith("m1", "Lint, Unit tests", { q0: ["Lint", "Unit tests"] })
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

describe("Tunes and Classic OS heroes", () => {
  it("renders the Tunes player hero and readout", async () => {
    const tunes = resolveTheme("tunes", "bento")
    const { getByText } = await render(
      <HeroCard agg={{ total: 1, running: 1, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }} theme={tunes} styles={createStyles(tunes)} />,
    )
    expect(getByText("▶ BENTO")).toBeTruthy()
    expect(getByText("PLAYING")).toBeTruthy()
    expect(getByText("WRK 1")).toBeTruthy()
  })

  it("renders the Classic OS desktop hero", async () => {
    const os = resolveTheme("classic-os", "blue")
    const { getByText } = await render(
      <HeroCard agg={{ total: 1, running: 1, waitingApproval: 0, waitingAnswer: 0, stopped: 0 }} theme={os} styles={createStyles(os)} />,
    )
    expect(getByText("CLASSIC OS")).toBeTruthy()
    expect(getByText("ACTIVE")).toBeTruthy()
    expect(getByText("start")).toBeTruthy()
    expect(getByText("1 working")).toBeTruthy()
  })
})

describe("Tunes refinements", () => {
  it("uses square corners throughout", () => {
    const styles = createStyles(resolveTheme("tunes", "classic"))
    for (const style of [styles.statusPill, styles.gradientButton, styles.badge, styles.metaChip, styles.heroAdd, styles.segment, styles.freeformInput, styles.inputFull, styles.stopButton, styles.themeSwatch]) {
      expect(style.borderRadius).toBe(0)
    }
  })

  it("renders the dark mark in gold", async () => {
    const tunes = resolveTheme("tunes", "classic")
    const { toJSON } = await render(<ThemeMark theme={tunes} />)
    expect(JSON.stringify(toJSON())).toContain("#ffd23f")
  })
})

describe("Classic OS window chrome", () => {
  it("styles section headers as title bars", () => {
    const os = resolveTheme("classic-os", "blue")
    const osStyles = createStyles(os)
    expect(osStyles.section.backgroundColor).toBe(os.accent)
    expect(osStyles.section.color).toBe("#ffffff")
  })

  it("renders window controls on a session card", async () => {
    const os = resolveTheme("classic-os", "blue")
    const { getByText } = await render(
      <SessionCard
        session={session({ phase: "running" })}
        requests={[]}
        resolve={jest.fn()}
        theme={os}
        styles={createStyles(os)}
        onStop={jest.fn()}
        onClose={jest.fn()}
      />,
    )
    expect(getByText("■")).toBeTruthy()
    expect(getByText("✕")).toBeTruthy()
  })

  it("shows the directory as a path", async () => {
    const os = resolveTheme("classic-os", "blue")
    const { getByText } = await render(
      <SessionCard session={session()} requests={[]} resolve={jest.fn()} theme={os} styles={createStyles(os)} />,
    )
    expect(getByText("📁")).toBeTruthy()
  })
})

describe("theme preview shape", () => {
  it("follows the theme's corner style", () => {
    expect(createStyles(resolveTheme("tunes", "classic")).themePreview.borderRadius).toBe(0)
    expect(createStyles(resolveTheme("evangelion", "unit01")).themePreview.borderRadius).toBe(0)
    expect(createStyles(resolveTheme("default", "light")).themePreview.borderRadius).toBeGreaterThan(0)
    expect(createStyles(resolveTheme("default", "light")).themePreviewCard.borderRadius).toBeGreaterThan(0)
  })
})

describe("agent avatars on session cards", () => {
  async function avatarFor(overrides: Partial<Session>) {
    const view = await render(
      <SessionCard session={session(overrides)} requests={[]} resolve={jest.fn()} theme={lightTheme} styles={styles} />,
    )
    return view
  }

  it("shows thinking while a tool runs and working without one", async () => {
    expect((await avatarFor({ phase: "running", currentTool: "Bash" })).getByTestId("agent-avatar:thinking", { includeHiddenElements: true })).toBeTruthy()
    expect((await avatarFor({ phase: "running", currentTool: null })).getByTestId("agent-avatar:working", { includeHiddenElements: true })).toBeTruthy()
  })

  it("observes while the agent waits for the user", async () => {
    expect((await avatarFor({ phase: "waiting-permission", currentTool: null })).getByTestId("agent-avatar:observing", { includeHiddenElements: true })).toBeTruthy()
    expect((await avatarFor({ phase: "waiting-answer", currentTool: null })).getByTestId("agent-avatar:observing", { includeHiddenElements: true })).toBeTruthy()
  })

  it("settles when the session is done or ended", async () => {
    expect((await avatarFor({ phase: "completed", currentTool: null })).getByTestId("agent-avatar:done", { includeHiddenElements: true })).toBeTruthy()
    expect((await avatarFor({ phase: "ended", currentTool: null })).getByTestId("agent-avatar:inactive", { includeHiddenElements: true })).toBeTruthy()
  })

  it("draws avatars round in rounded themes and square in square themes", async () => {
    const label = (await avatarFor({ id: "s1", agent: "opencode" })).getByTestId("agent-avatar:thinking", { includeHiddenElements: true }).props.accessibilityLabel as string
    expect(label).toContain(" circle ")

    const terminal = resolveTheme("terminal", "light")
    const { getByTestId } = await render(
      <SessionCard session={session({ id: "s1", agent: "opencode" })} requests={[]} resolve={jest.fn()} theme={terminal} styles={createStyles(terminal)} />,
    )
    const square = getByTestId("agent-avatar:thinking", { includeHiddenElements: true }).props.accessibilityLabel as string
    expect(square).toContain(" square ")
  })

  it("draws the avatar in the session mode's colour", async () => {
    const { getByTestId } = await avatarFor({ id: "s1", agent: "opencode" })
    const label = getByTestId("agent-avatar:thinking", { includeHiddenElements: true }).props.accessibilityLabel as string
    expect(label).toContain(avatarColor(lightTheme, "running"))
  })

  it("draws the same look under the classic OS skin", async () => {
    const os = resolveTheme("classic-os", "blue")
    const { getByTestId } = await render(
      <SessionCard
        session={session({ agent: "opencode" })}
        requests={[]}
        resolve={jest.fn()}
        theme={os}
        styles={createStyles(os)}
      />,
    )
    expect(getByTestId("agent-avatar:thinking", { includeHiddenElements: true })).toBeTruthy()
  })
})

describe("avatars in the demo and preview", () => {
  it("shows an avatar on every demo card", async () => {
    const { getAllByTestId } = await render(
      <DemoScreen onClose={() => {}} onOpenGallery={() => {}} theme={lightTheme} styles={styles} />,
    )
    expect(getAllByTestId(/^agent-avatar:/, { includeHiddenElements: true }).length).toBeGreaterThan(0)
  })

  it("shows avatars in the card preview", async () => {
    const { getAllByTestId } = await render(
      <PreviewScreen onClose={() => {}} theme={lightTheme} styles={styles} resolve={jest.fn()} />,
    )
    expect(getAllByTestId(/^agent-avatar:/, { includeHiddenElements: true }).length).toBeGreaterThan(0)
  })
})

describe("session layout controls", () => {
  it("switches between the compact grid and the full list", async () => {
    const onChange = jest.fn()
    const { getByText } = await render(<SessionsLayoutToggle layout="compact" onChange={onChange} styles={styles} />)
    await fireEvent.press(getByText("List"))
    expect(onChange).toHaveBeenCalledWith("full")
    await fireEvent.press(getByText("Grid"))
    expect(onChange).toHaveBeenCalledWith("compact")
  })

  it("renders the toggle under the classic OS skin", async () => {
    const os = resolveTheme("classic-os", "blue")
    const { getByText } = await render(
      <SessionsLayoutToggle layout="full" onChange={jest.fn()} styles={createStyles(os)} />,
    )
    expect(getByText("Grid")).toBeTruthy()
    expect(getByText("List")).toBeTruthy()
  })

  it("shows the working directory, phase, activity and avatar on a compact card", async () => {
    const onOpen = jest.fn()
    const { getByText, queryByText, getByTestId } = await render(
      <CompactSessionCard session={session({ title: "A named session" })} theme={lightTheme} styles={styles} onOpen={onOpen} />,
    )
    expect(getByText("api")).toBeTruthy()
    expect(queryByText("A named session")).toBeNull()
    expect(getByText("running")).toBeTruthy()
    expect(getByText("tool · Bash")).toBeTruthy()
    expect(getByTestId("agent-avatar:thinking", { includeHiddenElements: true })).toBeTruthy()
    await fireEvent.press(getByText("api"))
    expect(onOpen).toHaveBeenCalled()
  })

  it("puts a larger animated avatar on the left and drops the status dot", async () => {
    const { getByTestId, queryByText } = await render(
      <CompactSessionCard session={session()} theme={lightTheme} styles={styles} onOpen={jest.fn()} />,
    )
    const avatar = getByTestId("agent-avatar:thinking", { includeHiddenElements: true })
    expect(avatar.props.accessibilityLabel).toContain(" animated")
    expect(avatar.props.style.width).toBe(48)
    expect(queryByText("●")).toBeNull()
    expect(queryByText("○")).toBeNull()
  })

  it("keeps a pending session compact and highlighted through its avatar", async () => {
    const { getByText, getByTestId } = await render(
      <CompactSessionCard
        session={session({ phase: "waiting-permission", currentTool: null })}
        request={{ requestID: "p1", sessionID: "s1", kind: "permission", title: "Allow Bash" }}
        theme={lightTheme}
        styles={styles}
        onOpen={jest.fn()}
      />,
    )
    expect(getByText("waiting-permission")).toBeTruthy()
    expect(getByTestId("agent-avatar:observing", { includeHiddenElements: true })).toBeTruthy()
  })

  it("gives each grid item half the measured width", async () => {
    const widths: Array<number | undefined> = []
    const { getByTestId } = await render(
      <SessionGrid styles={styles}>
        {(itemWidth) => {
          widths.push(itemWidth)
          return <View testID="grid-child" />
        }}
      </SessionGrid>,
    )
    await fireEvent(getByTestId("session-grid"), "layout", { nativeEvent: { layout: { width: 320, height: 200 } } })
    expect(widths[widths.length - 1]).toBe(154)
  })

  it("collapses an expanded card from its header but only when asked", async () => {
    const onCollapse = jest.fn()
    const expanded = await render(
      <SessionCard session={session()} requests={[]} resolve={jest.fn()} theme={lightTheme} styles={styles} onCollapse={onCollapse} />,
    )
    await fireEvent.press(expanded.getByLabelText("Collapse session"))
    expect(onCollapse).toHaveBeenCalled()

    const pending = await render(
      <SessionCard
        session={session({ phase: "waiting-permission", currentTool: null })}
        requests={[{ requestID: "p1", sessionID: "s1", kind: "permission", title: "Allow Bash" }]}
        resolve={jest.fn()}
        theme={lightTheme}
        styles={styles}
      />,
    )
    expect(pending.queryByLabelText("Collapse session")).toBeNull()
  })
})

function collectStyles(node: unknown, found: Array<Record<string, unknown>> = []): Array<Record<string, unknown>> {
  if (!node || typeof node !== "object") return found
  if (Array.isArray(node)) {
    for (const child of node) collectStyles(child, found)
    return found
  }
  const element = node as { props?: { style?: unknown }; children?: unknown }
  const style = element.props?.style
  if (style) {
    const merged = Array.isArray(style) ? Object.assign({}, ...style.flat().filter((entry) => entry && typeof entry === "object")) : style
    if (merged && typeof merged === "object") found.push(merged as Record<string, unknown>)
  }
  if (element.children) collectStyles(element.children, found)
  return found
}

describe("Terminal theme", () => {
  it("flattens corners, shadows and typography", () => {
    const terminalStyles = createStyles(terminalDark) as unknown as Record<string, Record<string, unknown>>
    let radii = 0
    for (const style of Object.values(terminalStyles)) {
      if (!style || typeof style !== "object") continue
      if ("borderRadius" in style) {
        radii += 1
        expect(style.borderRadius).toBe(0)
      }
      if ("shadowOpacity" in style) expect(style.shadowOpacity).toBe(0)
      if ("fontSize" in style) expect(style.fontFamily).toBeTruthy()
    }
    expect(radii).toBeGreaterThan(10)
  })

  it("shows bash chrome on the hero", async () => {
    const { getByText } = await render(
      <HeroCard agg={{ total: 3, running: 2, waitingApproval: 1, waitingAnswer: 0, stopped: 1 }} theme={terminalLight} styles={createStyles(terminalLight)} />,
    )
    expect(getByText("+-- open-island --+")).toBeTruthy()
    expect(getByText("$ status --needs-you")).toBeTruthy()
    expect(getByText("[ needs you ]")).toBeTruthy()
    expect(getByText("1")).toBeTruthy()
    expect(getByText("agent needs you")).toBeTruthy()
    expect(getByText("2 working")).toBeTruthy()
  })

  it("uses the ASCII mark and watermark", async () => {
    const header = await render(<ThemeMark theme={terminalLight} size={30} />)
    expect(header.getByText(">_")).toBeTruthy()
    const hero = await render(<ThemeMark theme={terminalDark} size={168} />)
    expect(hero.getByText(TERMINAL_OI_ART.join("\n"))).toBeTruthy()
  })

  it("only draws the backdrop for the terminal skin", async () => {
    const defaultScreen = await render(<ScreenBackdrop theme={lightTheme} />)
    expect(defaultScreen.queryByText(/\./)).toBeNull()
    const terminalScreen = await render(<ScreenBackdrop theme={terminalLight} />)
    expect(terminalScreen.getByText(/\./)).toBeTruthy()
  })

  it("marks attention cards with bracketed prompts", async () => {
    const permission = await render(
      <NeedsAttentionCard
        request={{ requestID: "p1", sessionID: "s1", kind: "permission", title: "Allow Bash" }}
        resolve={jest.fn()}
        theme={terminalLight}
        styles={createStyles(terminalLight)}
      />,
    )
    expect(permission.getByText("[!]")).toBeTruthy()
    expect(permission.getByText("Allow Bash")).toBeTruthy()
    const question = await render(
      <NeedsAttentionCard
        request={{ requestID: "q1", sessionID: "s1", kind: "question", title: "Which database?", options: [{ label: "SQLite" }] }}
        resolve={jest.fn()}
        theme={terminalLight}
        styles={createStyles(terminalLight)}
      />,
    )
    expect(question.getByText("[?]")).toBeTruthy()
  })

  it("draws status indicators as glyphs", async () => {
    const active = await render(<GlowDot color={terminalLight.allow} glyph pulse />)
    expect(active.getByText("●")).toBeTruthy()
    const idle = await render(<GlowDot color={terminalLight.textMuted} glyph />)
    expect(idle.getByText("○")).toBeTruthy()
  })

  it("keeps permission actions monochrome", async () => {
    const theme = terminalLight
    const { toJSON } = await render(
      <NeedsAttentionCard
        request={{ requestID: "p1", sessionID: "s1", kind: "permission", title: "Allow Bash" }}
        resolve={jest.fn()}
        theme={theme}
        styles={createStyles(theme)}
      />,
    )
    const backgrounds = collectStyles(toJSON()).map((style) => style.backgroundColor).filter(Boolean)
    expect(backgrounds).not.toContain(theme.allow)
    expect(backgrounds).not.toContain(theme.deny)
    expect(backgrounds).toContain(theme.text)
  })
})
