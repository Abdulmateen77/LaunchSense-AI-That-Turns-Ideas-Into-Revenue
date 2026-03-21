# Frontend Completion Checklist

This checklist is for getting the frontend production-ready while the backend contract is still settling.

It assumes these product constraints stay fixed:

- Keep the existing chat shell.
- Keep a single chat composer as the only input.
- Do not introduce separate form fields for idea, audience, or notes.
- Treat the backend as a chat-first API with these eventual integration points:
  - `GET /health`
  - `POST /intake/message`
  - `POST /generate` via SSE
  - `GET /p/{slug}`

## Current Baseline

These pieces already exist in the frontend and should be preserved:

- [x] Single-chat layout is already in place in [App.jsx](/C:/Users/fairc/dev/launchsense/frontend/src/App.jsx), [MessageList.jsx](/C:/Users/fairc/dev/launchsense/frontend/src/components/MessageList.jsx), and [Composer.jsx](/C:/Users/fairc/dev/launchsense/frontend/src/components/Composer.jsx).
- [x] Intake API wiring already exists in [api.js](/C:/Users/fairc/dev/launchsense/frontend/src/lib/api.js) and [App.jsx](/C:/Users/fairc/dev/launchsense/frontend/src/App.jsx).
- [x] SSE generation parsing already exists in [sse.js](/C:/Users/fairc/dev/launchsense/frontend/src/lib/sse.js).
- [x] Structured rendering for context, research, offer, assets, critique, and errors already exists in [MessageBubble.jsx](/C:/Users/fairc/dev/launchsense/frontend/src/components/MessageBubble.jsx).
- [x] Stored package fetch support already exists through `GET /p/{slug}` in [api.js](/C:/Users/fairc/dev/launchsense/frontend/src/lib/api.js).

## 1. Lock The Frontend Contract

- [x] Write a frontend-owned API contract doc for:
  - `POST /intake/message`
  - `POST /generate`
  - `GET /p/{slug}`
- [x] Define stable frontend types for:
  - `IntakeMessageRequest`
  - `IntakeMessageResponse`
  - SSE event names and payloads
  - `StoredPackage`
- [x] Document which backend fields are required for rendering and which are optional.
- [x] Decide the frontend fallback for unknown SSE events so the UI does not break if the backend adds new events.
- [x] Decide how the frontend should behave if the backend keeps the current two-step model:
  - intake completion
  - explicit generate action

Definition of done:

- One document exists in `frontend/` describing the exact request and response shapes the frontend depends on.
- All frontend rendering code can rely on one normalized client-side contract.

## 2. Add A Mock Backend Mode

- [x] Add a frontend mock mode controlled by an env flag such as `VITE_API_MODE=mock`.
- [x] Create mock handlers for:
  - `GET /health`
  - `POST /intake/message`
  - `POST /generate`
  - `GET /p/{slug}`
- [x] Create deterministic intake scenarios:
  - first message missing key context
  - context completes after 2 turns
  - context completes after 4 turns
  - malformed backend reply
- [x] Create deterministic generation scenarios:
  - happy path
  - research retry
  - offer regeneration
  - critique unavailable
  - partial asset failure
  - hard pipeline error
- [x] Make the frontend switch between mock and live backend without changing UI code.

Definition of done:

- You can demo the full chat flow locally with no live backend.
- The same UI components work in both mock and live modes.

## 3. Extract State Management Out Of `App.jsx`

- [x] Move chat thread transition logic into a dedicated reducer or state module.
- [x] Extract pure functions for:
  - intake response handling
  - SSE event application
  - phase transitions
  - error recovery
- [x] Keep `App.jsx` focused on composition and event wiring rather than business logic.
- [x] Add one source of truth for thread phases such as:
  - `welcome`
  - `intake`
  - `context_ready`
  - `generating`
  - `complete`
  - `error`
- [x] Ensure the state model can support future backend additions like:
  - confirm context
  - adjust offer
  - refine final assets

Definition of done:

- The core chat state can be tested without rendering React.
- Adding a new SSE event does not require editing unrelated UI code.

## 4. Prepare For The Missing Backend Phases

The backend does not yet fully implement the product flow, so the frontend should be ready without changing the UI later.

- [x] Reserve state for a context confirmation step, even if it is temporarily mapped to the current inline generate button.
- [x] Reserve state for an offer confirmation or adjustment step before final asset generation.
- [x] Keep the composer-compatible path for corrections, for example:
  - user corrects context in chat
  - user requests offer changes in chat
  - user requests final asset refinements in chat
- [x] Avoid hard-coding the assumption that generation always runs straight through after intake.
- [x] Avoid hard-coding the assumption that the composer stays disabled forever after context is complete.

Definition of done:

- The frontend can absorb a future backend confirm/correct loop without a UI rewrite.

## 5. Harden SSE Handling

- [x] Keep the SSE parser tolerant of chunk splits across frame boundaries.
- [x] Handle duplicate `status` events without spamming the thread.
- [x] Handle out-of-order or missing non-critical events gracefully.
- [x] Add explicit behavior for:
  - `complete` arriving without `page`
  - `error` arriving after partial results
  - critique chunks arriving after assets
  - empty stream body
- [x] Add timeout and cancel behavior for long-running generation.
- [x] Make sure thread state resets cleanly before a fresh generate run.

Definition of done:

- A flaky or partially implemented stream does not crash the chat UI.

## 6. Finish Frontend Rendering States

- [x] Show backend connection state somewhere in the existing shell without redesigning the header.
- [x] Add a distinct visual state for:
  - waiting for intake reply
  - context ready
  - generation running
  - complete with partial failures
  - hard failure
- [x] Make sure the chat still reads naturally if a message card is missing a subsection.
- [x] Render optional sections only when data exists.
- [x] Ensure long URLs, long critiques, and long email bodies wrap cleanly on mobile.
- [x] Preserve scroll behavior during streamed critique updates.

Definition of done:

- Every known backend success and failure state has a readable thread presentation.

## 7. Add Frontend Test Coverage

- [x] Add a frontend test runner if one is not already configured.
- [x] Add unit tests for:
  - `parseJsonResponse()`
  - SSE frame parsing
  - intake reply sanitization
  - event-to-thread-state reduction
- [x] Add component tests for:
  - first message send
  - follow-up intake question
  - context ready card
  - generation progress
  - streamed critique accumulation
  - error rendering
- [x] Add mock-flow tests for:
  - happy path end-to-end
  - retryable backend failure
  - partial generation output
  - unavailable backend on app load

Definition of done:

- The critical chat flow can be validated without a real backend.

## 8. Create Fixture-Based QA Scenarios

- [x] Save a small set of fixture payloads for realistic business ideas.
- [x] Include fixtures for:
  - vague user opening message
  - detailed opening message
  - viable offer path
  - non-viable or corrective path
  - partial failure path
- [x] Use fixtures to verify the copy density and layout of the current UI.
- [x] Create a short manual QA script that someone else can run.

Definition of done:

- Anyone on the team can validate the frontend behavior from repeatable scenarios.

## 9. Integration Readiness

- [x] Decide the canonical backend base URL strategy for dev:
  - direct `VITE_API_BASE_URL`
  - Vite proxy
- [x] Verify the frontend still works if the backend is unavailable at load time.
- [x] Verify a thread can survive:
  - failed intake request
  - failed generate start
  - failed stored package fetch
- [x] Add console logging guards or debug helpers for SSE troubleshooting in dev only.
- [x] Make sure no frontend code depends on the unused one-shot backend route `POST /api/v1/offers/generate`.

Definition of done:

- Swapping from mock backend to live backend is a config change, not a rewrite.

## 10. Pre-Launch Manual Checklist

- [ ] `npm run build` succeeds.
- [ ] Mobile viewport is usable through the full chat flow.
- [ ] Long streamed critiques do not cause layout jumps or broken scrolling.
- [x] Starting a new chat does not leak the previous thread's session or results.
- [ ] Refresh behavior is understood and intentionally accepted.
- [ ] Empty, slow, malformed, and partial backend responses all fail gracefully.

## Suggested Order

1. Lock the frontend contract.
2. Add mock backend mode and fixtures.
3. Extract state management from `App.jsx`.
4. Add tests around the extracted state and SSE parser.
5. Finish rendering and error states.
6. Validate live integration when the backend catches up.
