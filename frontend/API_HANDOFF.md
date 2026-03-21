# LaunchSense Frontend API Handoff

## Purpose

This document is the frontend handoff contract for the **currently implemented backend API** in this repository.

It is intentionally based on the code that exists today, not only on the product/spec documents.

## Source of Truth

The implemented API the frontend should use is defined here:

- [`backend/app/main.py`](/C:/Users/fairc/dev/launchsense/backend/app/main.py)
- [`backend/app/api/routes/offers.py`](/C:/Users/fairc/dev/launchsense/backend/app/api/routes/offers.py)
- [`backend/app/models/schemas.py`](/C:/Users/fairc/dev/launchsense/backend/app/models/schemas.py)

There is also an older prototype API in:

- [`backend/main.py`](/C:/Users/fairc/dev/launchsense/backend/main.py)

That older API exposes different endpoints (`/intake/message`, `/generate`) and a different response model. The frontend should **not** integrate against it unless the backend team explicitly decides to revive that version.

## Current Backend Scope

The current backend is **not yet the full multi-phase chat workflow** described in the product specs.

Right now, the implemented API supports:

- health checking
- one-shot offer generation from a single request

Right now, it does **not** support:

- chat sessions
- turn-by-turn phase progression
- streamed partial results
- persistence/history
- refinement endpoints
- separate landing page / outreach asset endpoints

Frontend should therefore treat v1 as a **single submit -> single response** flow.

## Base URL

The FastAPI app mounts offer routes under:

```text
/api/v1/offers
```

So the main generation endpoint is:

```text
POST /api/v1/offers/generate
```

If running locally with the usual FastAPI setup, this will typically be something like:

```text
http://localhost:8000/api/v1/offers/generate
```

Use an environment variable in the frontend for the API origin, for example:

```text
VITE_API_BASE_URL=http://localhost:8000
```

Then construct requests as:

```text
${VITE_API_BASE_URL}/api/v1/offers/generate
```

## Endpoints

### 1. Health Check

**Method**

```http
GET /health
```

**Purpose**

Use this for a lightweight readiness check. This is useful for:

- local dev startup checks
- showing "backend unavailable" before the user submits
- uptime monitoring

**Success response**

```json
{
  "status": "ok"
}
```

**Frontend usage**

- Optional on app load
- Safe to retry
- Do not block the whole UI forever if it fails; show a connection warning instead

### 2. Generate Offer

**Method**

```http
POST /api/v1/offers/generate
```

**Purpose**

Takes a startup/business idea plus audience information and returns a structured commercial offer.

**Request body**

```json
{
  "idea": "AI bookkeeping assistant for solo accountants",
  "audience": "Solo accounting firms serving small UK businesses",
  "notes": "Should feel premium, outcome-driven, and easy to explain in one sentence"
}
```

**Request schema**

```ts
type OfferInput = {
  idea: string;      // required, min length 3
  audience: string;  // required, min length 3
  notes?: string | null;
};
```

**Field details**

- `idea`: The product/service concept to turn into an offer.
- `audience`: The intended buyer or market segment.
- `notes`: Optional extra guidance, constraints, tone, or positioning notes.

**Validation rules**

- `idea` is required and must be at least 3 characters
- `audience` is required and must be at least 3 characters
- `notes` is optional

**Success response**

```json
{
  "success": true,
  "data": {
    "icp": "Solo accounting firm owners with 20-80 SME clients",
    "pain": "They lose billable hours to repetitive bookkeeping follow-up and cleanup",
    "offer": "Done-for-you AI bookkeeping workflow setup that cuts admin time and improves client turnaround",
    "guarantee": "If you do not save at least 5 admin hours in 30 days, we keep working free until you do",
    "bonuses": [
      "Client onboarding workflow template",
      "Weekly exception-review checklist"
    ],
    "urgency": "Firms that streamline before tax-season pressure hits capture the biggest margin gains",
    "cta": "Book your workflow audit",
    "positioning_angle": "Premium operational leverage for small firms without hiring more staff"
  }
}
```

**Response schema**

```ts
type OfferOutput = {
  icp: string;
  pain: string;
  offer: string;
  guarantee: string;
  bonuses: string[]; // backend enforces 2-3 items
  urgency: string;
  cta: string;
  positioning_angle: string;
};

type OfferResponse = {
  success: boolean; // currently always true on HTTP 200
  data: OfferOutput;
};
```

## Error Responses

The route currently exposes default FastAPI validation errors and a generic server error wrapper.

### 422 Validation Error

Returned when required fields are missing or too short.

Example:

```json
{
  "detail": [
    {
      "loc": ["body", "idea"],
      "msg": "String should have at least 3 characters",
      "type": "string_too_short"
    }
  ]
}
```

**Frontend handling**

- Treat as a user-fixable error
- Show inline form validation where possible
- Prefer mapping `detail[].loc` to the relevant field

### 500 Server Error

Returned if generation fails, model output is invalid JSON, or another unexpected backend error occurs.

Example:

```json
{
  "detail": "Expecting value: line 1 column 1 (char 0)"
}
```

**Frontend handling**

- Treat as a retryable system error
- Show a general message like: `We couldn't generate the offer right now. Please try again.`
- Keep the user's last submitted values in the form

## Recommended Frontend Integration Pattern

### UI Flow

Because the API is one-shot, the frontend should use this flow:

1. User fills out `idea`, `audience`, and optional `notes`
2. User clicks generate
3. Frontend sends `POST /api/v1/offers/generate`
4. Show a loading state while waiting
5. Render the returned structured offer
6. Allow the user to edit inputs and resubmit for another result

This should be implemented as a standard form submission, not as a streaming chat client.

### Loading State

Recommended loading behavior:

- disable the submit button while the request is in flight
- prevent duplicate submissions
- show a spinner or "Generating your offer..." message
- preserve current field values during loading

### Result Rendering

Render the `data` object as distinct UI sections:

- ICP
- Pain
- Offer
- Guarantee
- Bonuses
- Urgency
- CTA
- Positioning Angle

`bonuses` should be rendered as a list.

### Retry Behavior

Recommended behavior:

- allow the user to retry after a 500-level failure
- do not auto-retry multiple times in the background
- safe to let the user regenerate with the same inputs

## Suggested TypeScript Types

```ts
export type OfferInput = {
  idea: string;
  audience: string;
  notes?: string;
};

export type OfferOutput = {
  icp: string;
  pain: string;
  offer: string;
  guarantee: string;
  bonuses: string[];
  urgency: string;
  cta: string;
  positioning_angle: string;
};

export type OfferResponse = {
  success: true;
  data: OfferOutput;
};

export type ApiValidationError = {
  detail: Array<{
    loc: Array<string | number>;
    msg: string;
    type: string;
  }>;
};

export type ApiServerError = {
  detail: string;
};
```

## Suggested API Client

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function generateOffer(input: {
  idea: string;
  audience: string;
  notes?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/api/v1/offers/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (response.status === 422) {
    const error = await response.json();
    throw {
      kind: "validation",
      error,
    };
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: "Unknown server error",
    }));

    throw {
      kind: "server",
      error,
    };
  }

  return response.json();
}
```

## Example Usage in a React Submit Handler

```ts
async function onSubmit(values: OfferInput) {
  setLoading(true);
  setFieldErrors({});
  setServerError(null);

  try {
    const result = await generateOffer(values);
    setOffer(result.data);
  } catch (err: any) {
    if (err.kind === "validation") {
      const nextErrors: Record<string, string> = {};

      for (const issue of err.error.detail ?? []) {
        const field = issue.loc?.[1];
        if (typeof field === "string") {
          nextErrors[field] = issue.msg;
        }
      }

      setFieldErrors(nextErrors);
    } else {
      setServerError("We couldn't generate the offer right now. Please try again.");
    }
  } finally {
    setLoading(false);
  }
}
```

## Rendering Contract

The frontend should assume:

- all output fields are plain strings
- no markdown is guaranteed
- no HTML is guaranteed
- `bonuses` is the only array field
- field order should be controlled by the frontend, not by object iteration

Recommended display order:

1. `icp`
2. `pain`
3. `offer`
4. `guarantee`
5. `bonuses`
6. `urgency`
7. `cta`
8. `positioning_angle`

## State Management Notes

Minimal frontend state is enough for v1:

```ts
type OfferPageState = {
  form: OfferInput;
  loading: boolean;
  offer: OfferOutput | null;
  fieldErrors: Record<string, string>;
  serverError: string | null;
};
```

No session ID or conversation state is needed for the current backend.

## Networking / CORS Caveat

Important implementation note:

The current app entrypoint in [`backend/app/main.py`](/C:/Users/fairc/dev/launchsense/backend/app/main.py) does **not** add CORS middleware.

That means browser requests from a separate frontend origin may fail unless one of these is true:

- frontend and backend are served from the same origin
- the frontend dev server proxies API requests to the backend
- backend adds CORS support

For local frontend development, the safest assumption is:

- use a dev proxy if frontend and backend run on different ports

Example approach:

- frontend calls `/api/v1/offers/generate`
- dev server proxies `/api` to the backend origin

## Auth

There is currently **no authentication** on these endpoints.

Frontend should not send auth headers unless backend adds auth later.

## Persistence

There is currently **no persistence or retrieval endpoint**.

Frontend should assume:

- each generate request is independent
- refresh will lose local UI state unless the frontend stores it
- if "history" is needed, it must be implemented client-side for now

## What Is Not Yet Implemented

The product/spec docs describe a richer conversation flow, but those endpoints do not currently exist in the active backend app.

Not implemented yet:

- context intake endpoint for chat turns
- viability-gate endpoint/state
- offer confirmation endpoint
- landing page generation endpoint
- channel recommendation endpoint
- email asset endpoint
- LinkedIn asset endpoint
- SSE or streamed generation events

Frontend should not design the first integration around those features yet unless backend work is scheduled in parallel.

## Recommended Frontend Build Now

The frontend developer can safely build:

- a single-page form
- three inputs: `idea`, `audience`, `notes`
- submit/loading/error states
- a structured result panel for the generated offer
- regenerate/edit-and-resubmit behavior

This is the most stable interpretation of the backend as it exists today.

## Final Contract Summary

Use these endpoints:

- `GET /health`
- `POST /api/v1/offers/generate`

Use this request body for generation:

```json
{
  "idea": "string, required, min 3 chars",
  "audience": "string, required, min 3 chars",
  "notes": "string, optional"
}
```

Expect this success response:

```json
{
  "success": true,
  "data": {
    "icp": "string",
    "pain": "string",
    "offer": "string",
    "guarantee": "string",
    "bonuses": ["string", "string"],
    "urgency": "string",
    "cta": "string",
    "positioning_angle": "string"
  }
}
```

Build the frontend as a one-shot generator UI, not as a chat/SSE client.
