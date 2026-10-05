# Tasks

## 1. Aggregate

- [x] 1.1 Implement an aggregate selector over `AppState.sessions` returning `total`, `running`, `waitingApproval`, and `waitingAnswer`; unit tests cover a mixed state and the empty state
- [x] 1.2 Verify the aggregate updates as events move a session between phases (unit test applying `permission.requested`, `question.asked`, `actionable.resolved`, `turn.completed`)

## 2. iOS Live Activity

- [x] 2.1 Add the pinned `expo-live-activity` dependency and verify `npm install` and `expo prebuild` succeed
- [x] 2.2 Add a config plugin that creates the WidgetKit extension target and sets `NSSupportsLiveActivities`; verify the extension target exists in the project and the Info.plist key is present after prebuild
- [x] 2.3 Implement the activity UI — Lock Screen expanded and Dynamic Island compact/minimal — showing the total and per-state counts; verify it renders with a sample state on a device or simulator
- [x] 2.4 Add the "OI" white-on-black mark to the activity artwork; verify it appears and matches the app icon

## 3. Lifecycle

- [x] 3.1 Start the activity when the aggregate becomes non-zero; verify a started activity is visible
- [x] 3.2 Update the activity when the aggregate changes; verify the counts change on screen
- [x] 3.3 End the activity when the aggregate returns to zero; verify the activity is removed

## 4. Update triggers

- [x] 4.1 Update the activity from foreground SSE events; verify with a simulated stream that the counts track the stream
- [x] 4.2 Update the activity on a background doorbell wake after refetching `/state`; verify with a simulated doorbell while backgrounded
- [x] 4.3 Keep the last-known aggregate when a refresh is unreachable; unit-test the keep-last-known path

## 5. Staleness

- [x] 5.1 Track the last successful refresh time and show a stale indication when a refresh fails or the age exceeds the threshold; unit test the threshold boundary

## 6. Android parity

- [ ] 6.1 Show the same aggregate as an ongoing notification, updated under the same triggers; verify on an emulator
- [x] 6.2 Document Android differences (ongoing notification vs Live Activity) in `app/README.md`

## 7. Integration

- [x] 7.1 With the phone locked, trigger a permission and verify the Lock Screen activity shows waiting-for-approval, then updates to working after Allow
- [x] 7.2 Verify the activity ends once all sessions finish
- [x] 7.3 Verify the opt-out setting ends a running activity and prevents new ones
- [x] 7.4 Document the feature, the OI mark, and the between-wakes staleness limitation in `app/README.md`; verify the documented steps reproduce the activity
