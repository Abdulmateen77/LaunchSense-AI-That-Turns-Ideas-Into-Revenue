# Frontend API Contract

This document defines the API contract the frontend depends on.

It is intentionally frontend-owned. The backend can evolve internally, but the frontend should only rely on the request and response shapes defined here.

## Product Constraint

The frontend must remain chat-first.

- One chat composer is the only input.
- No separate idea, audience, or notes fields.
- Intake and generation happen inside the same thread.

## Canonical Frontend Endpoints

### `GET /health`

Purpose:

- check backend availability on app load
- surface connection status in the current shell

Success response:

```json
{
  "status": "ok"
}
```

Frontend rule:

- any non-200 response or fetch failure is treated as `unavailable`

## `POST /intake/message`

Purpose:

- send one user chat turn during intake
- receive either:
  - the next intake reply
  - or a completed context summary

Request shape:

```json
{
  "session_id": "string or null",
  "message": "string"
}
```

Frontend rules:

- `session_id` may be omitted or `null` on the first turn
- `message` is always taken from the single composer

Success response shape:

```json
{
  "session_id": "string",
  "reply": "string",
  "complete": true,
  "context": {
    "idea": "string",
    "niche": "string",
    "target_customer": "string",
    "core_pain": "string",
    "existing_solutions": "string",
    "notes": "string"
  }
}
```
```
{
  "session_id": "string",
  "reply": "string",
  "complete": false,
  "context": null
}
```

Frontend-required fields:

- `session_id`
- `reply`
- `complete`

Frontend-optional fields:

- `context`

Frontend normalization rules:

- if `complete === true` and `reply` contains `CONTEXT_COMPLETE`, replace the visible assistant text with a friendly completion message
- if `context` is missing when `complete === true`, keep the thread in intake mode and treat the payload as invalid

## `POST /generate`

Purpose:

- start the full launch-package generation pipeline after intake is complete
- stream generation progress and results over one response body

Request shape:

```json
{
  "idea": "string",
  "context": {
    "idea": "string",
    "niche": "string",
    "target_customer": "string",
    "core_pain": "string",
    "existing_solutions": "string",
    "notes": "string"
  }
}
```

Frontend rules:

- the frontend should always send the full `context` once intake is complete
- `idea` should mirror `context.idea`

Response transport:

- `Content-Type: text/event-stream`
- frames are consumed as `data: { "event": "...", "data": { ... } }`

### Known SSE Events

#### `status`

Example:

```json
{
  "event": "status",
  "data": {
    "step": 1,
    "label": "Building your offer...",
    "sub": "optional"
  }
}
```

Frontend-required fields:

- `label`

Frontend-optional fields:

- `step`
- `sub`

#### `research`

Carries the structured research payload.

Frontend rule:

- render the research card if the payload is an object

#### `eval`

Carries evaluation results for research and offer quality.

Frontend rule:

- store this for later rendering alongside the offer

#### `offer`

Carries the structured offer payload.

Frontend rule:

- render the offer card when present

#### `page`

Example:

```json
{
  "event": "page",
  "data": {
    "slug": "string",
    "url": "/p/string"
  }
}
```

Frontend-required fields:

- `url`

Frontend-optional fields:

- `slug`

Frontend normalization rule:

- always derive and store an absolute URL for rendering

#### `growth`

Carries the marketing assets payload.

Frontend rule:

- render the assets card once this event arrives

#### `critique_chunk`

Example:

```json
{
  "event": "critique_chunk",
  "data": {
    "text": "streamed text"
  }
}
```

Frontend rule:

- append `data.text` to the thread critique buffer

#### `complete`

Example:

```json
{
  "event": "complete",
  "data": {
    "success": true,
    "slug": "string"
  }
}
```

Frontend rule:

- mark the thread complete
- if `slug` exists, attempt `GET /p/{slug}`

#### `error`

Example:

```json
{
  "event": "error",
  "data": {
    "message": "string"
  }
}
```

Frontend rule:

- stop generation
- preserve any partial results already received
- render the error in the thread

## Unknown SSE Events

Frontend fallback:

- ignore the event for rendering
- preserve the thread state
- log the event in development only

Unknown events must never crash the UI.

## `GET /p/{slug}`

Purpose:

- retrieve the stored launch package after generation completes

Request shape:

- path parameter only

Response shape:

```json
{
  "slug": "string",
  "context": {},
  "evidence": {},
  "offer": {},
  "landing_page": {},
  "growth_pack": {}
}
```

Frontend-required fields:

- none for the initial thread render

Frontend rule:

- treat this as a best-effort enrichment call
- if it fails, keep the streamed results intact

## Client-Side Thread Modes

The frontend owns these normalized modes:

- `welcome`
- `intake`
- `context_ready`
- `generating`
- `complete`
- `error`

The backend does not need to return these directly.

## Validation And Failure Rules

- malformed JSON route responses should surface a human-readable error
- missing required fields should be treated as recoverable frontend errors
- SSE streams with partial payloads should preserve already received output
- the frontend should not assume every backend implementation emits every optional event

## Out Of Scope For This Contract

The frontend should not depend on:

- the one-shot `/api/v1/offers/generate` backend
- backend-specific model names
- server-side session persistence beyond the active thread
- any non-chat form-based contract
