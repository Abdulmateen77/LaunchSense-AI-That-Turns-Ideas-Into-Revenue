# Manual QA Script

This script is for testing the frontend as a whole while the backend is still being completed.

## Start The Frontend

Use mock mode for repeatable testing:

```powershell
$env:VITE_API_MODE="mock"
.\node_modules\.bin\vite
```

Open:

- chat app: `http://localhost:5173/?apiMode=mock`
- test dashboard: `http://localhost:5173/?view=tests&apiMode=mock`

## Core Chat Checks

### 1. Vague intake prompt

Open:

```text
http://localhost:5173/?apiMode=mock&mockScenario=missing_context_first_turn
```

Steps:

1. Start a new chat.
2. Send `Audit offer`.
3. Confirm the app stays in intake mode.
4. Confirm the assistant asks for missing context instead of jumping to generation.

### 2. Two-turn context completion

Open:

```text
http://localhost:5173/?apiMode=mock&mockScenario=two_turn_context
```

Steps:

1. Send `I run an HR consultancy and want to launch an AI onboarding audit service.`
2. Confirm the assistant asks one follow-up question.
3. Send `We sell to scaling teams that still run onboarding manually.`
4. Confirm the thread shows a context-ready summary card.
5. Confirm the composer stays usable for a correction message.
6. Send a correction such as `Actually start with boutique HR firms.`
7. Confirm that correction is saved in the thread without changing the UI.

### 3. Happy-path generation

Open:

```text
http://localhost:5173/?apiMode=mock&mockScenario=happy_path
```

Steps:

1. Complete the intake flow.
2. Click `Generate launch package`.
3. Confirm the header status changes through generation.
4. Confirm the thread renders:
   - status messages
   - research card
   - offer card
   - assets card
   - streamed critique
5. Confirm the final status shows `Launch package ready`.
6. Send a refinement request such as `Make the CTA more specific.`
7. Confirm the refinement request is stored in-thread.

## Edge-Case Checks

### 4. Research retry

Open:

```text
http://localhost:5173/?apiMode=mock&mockScenario=research_retry
```

Steps:

1. Run a full generation.
2. Confirm you see a second research status such as `Deepening research...`.
3. Confirm the rest of the package still completes normally.

### 5. Critique unavailable

Open:

```text
http://localhost:5173/?apiMode=mock&mockScenario=critique_unavailable
```

Steps:

1. Run a full generation.
2. Confirm the critique section shows degraded output instead of crashing the thread.
3. Confirm the thread still reaches a completed state.

### 6. Partial asset failure

Open:

```text
http://localhost:5173/?apiMode=mock&mockScenario=partial_asset_failure
```

Steps:

1. Run a full generation.
2. Confirm page data appears before the failure.
3. Confirm the thread shows an error state afterward.
4. Confirm the successful page output is still visible.

### 7. Pipeline error

Open:

```text
http://localhost:5173/?apiMode=mock&mockScenario=pipeline_error
```

Steps:

1. Run a full generation.
2. Confirm the thread enters an error state quickly.
3. Confirm the UI stays responsive and the thread is still readable.

### 8. Backend unavailable

Open:

```text
http://localhost:5173/?apiMode=mock&mockScenario=health_failure
```

Steps:

1. Reload the app.
2. Confirm the header shows backend unavailable.
3. Confirm the welcome state still renders and the shell is usable.

### 9. Intake request failure

Open:

```text
http://localhost:5173/?apiMode=mock&mockScenario=intake_failure
```

Steps:

1. Start a new chat.
2. Send any intake message.
3. Confirm the thread shows an error state or error message.
4. Confirm the overall shell stays usable and you can start another chat.

### 10. Generate-start failure

Open:

```text
http://localhost:5173/?apiMode=mock&mockScenario=generate_start_failure
```

Steps:

1. Complete intake until the generate action appears.
2. Click `Generate launch package`.
3. Confirm generation fails immediately with a recoverable error.
4. Confirm the thread remains readable and the app does not lock up.

### 11. Stored package failure

Open:

```text
http://localhost:5173/?apiMode=mock&mockScenario=stored_package_failure
```

Steps:

1. Run a full generation.
2. Confirm the streamed research, offer, assets, and critique still appear.
3. Confirm the app does not crash even though stored-package enrichment fails.

## Dashboard Checks

Open:

```text
http://localhost:5173/?view=tests&apiMode=mock
```

Steps:

1. Confirm the dashboard auto-runs the internal test suite.
2. Confirm all tests show `Passed`.
3. Click `Run tests again`.
4. Confirm the run status updates and the results refresh.
5. Confirm the `QA fixtures` section lists the mock scenarios and query params.

## Mobile And Layout Checks

1. Resize to a narrow mobile viewport.
2. Repeat the happy-path flow.
3. Confirm:
   - the sidebar still toggles correctly
   - long URLs wrap
   - long critiques wrap
   - the message list stays pinned near the latest streamed content
   - the composer remains usable and does not overflow

## Thread Isolation And Refresh Checks

### 12. New chat isolation

1. Complete one chat through to either context-ready or full generation.
2. Click `New chat`.
3. Confirm the new thread starts empty.
4. Confirm the old thread's preview stays in the sidebar.
5. Confirm the new thread does not inherit the prior thread's context, errors, or results.

### 13. Refresh behavior

1. Complete at least one mock chat.
2. Refresh the browser.
3. Confirm the app resets to its initial local state.
4. Confirm this reset is acceptable for now, since session persistence is not yet implemented in the frontend.
