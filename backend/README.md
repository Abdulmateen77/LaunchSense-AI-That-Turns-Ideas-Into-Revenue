# LaunchSense — LLM Orchestration Backend

Falah's part of a 3-person hackathon project (AI London 2026).

This is the **LLM orchestration layer** — a FastAPI backend that takes a startup idea through a conversational intake loop, then fires a 5-agent pipeline to produce a complete go-to-market package, streamed live to Nathan's Next.js frontend via Server-Sent Events.

---

## Architecture Overview

```
POST /intake/message          POST /generate
       │                             │
  Intake Loop                  EnrichedContext
  (Haiku, ≤4 turns)                 │
       │                    ┌────────▼────────┐
  EnrichedContext            │   Agent 0       │
       │                    │  web_search      │
       └──────────────────► │  (Haiku)         │
                            └────────┬────────┘
                                     │ Evidence
                                eval_research()
                                     │
                            ┌────────▼────────┐
                            │   RAG Client     │
                            │  → Mateen :8001  │
                            └────────┬────────┘
                                     │ principles[]
                            ┌────────▼────────┐
                            │   Agent 1        │
                            │  Offer Gen       │
                            │  (Haiku)         │
                            └────────┬────────┘
                                     │ Offer
                                 eval_offer()
                                     │
                         ┌───────────┴───────────┐
                         │                       │
                ┌────────▼────────┐   ┌──────────▼──────┐
                │   Agent 2        │   │   Agent 3        │
                │  Landing Page    │   │  Growth Pack     │
                │  (Haiku)         │   │  (Haiku)         │
                └────────┬────────┘   └──────────┬──────┘
                         └───────────┬───────────┘
                                     │
                            ┌────────▼────────┐
                            │   Agent 4        │
                            │  Critique        │
                            │  streaming       │
                            │  (Haiku)         │
                            └────────┬────────┘
                                     │
                              SSE complete event
```

---

## Team

| Person | Owns |
|--------|------|
| Falah | This repo — LLM orchestration backend |
| Nathan | Next.js frontend — consumes SSE stream |
| Mateen | RAG service on :8001 — provides offer principles |

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | FastAPI |
| LLM | Anthropic SDK (direct — no LangChain) |
| Models | claude-haiku-4-5 (all agents), claude-sonnet-4-5 (research) |
| Async | asyncio native — asyncio.gather() for parallel agents |
| Storage | In-memory dict (hackathon scope) |
| RAG | Mateen's service via httpx |

---

## Project Structure

```
backend/
├── main.py                    # FastAPI app, CORS, router registration
├── requirements.txt
├── .env.example
│
├── agents/
│   ├── agent0_research.py     # web_search → Evidence
│   ├── agent1_offer.py        # Evidence + RAG → Offer
│   ├── agent2_builder.py      # Offer + Evidence → LandingPage
│   ├── agent3_growth.py       # Offer + Evidence → GrowthPack
│   └── agent4_critique.py     # Offer + Page + Growth → streaming critique
│
├── api/
│   ├── intake.py              # POST /intake/message — conversational context loop
│   └── generate.py            # POST /generate — SSE orchestration route
│
├── models/
│   ├── schemas.py             # All Pydantic models — single source of truth
│   └── model_registry.py      # resolve_model() — capability enforcement
│
├── services/
│   ├── evals.py               # eval_research() + eval_offer()
│   ├── prompt_builder.py      # build_offer_prompt() — assembles evidence + RAG
│   └── rag_client.py          # get_principles() — calls Mateen's service
│
└── tests/
    ├── test_intake.py         # Smoke test: intake loop via HTTP
    ├── test_agent0.py         # Smoke test: research agent standalone
    ├── test_agent1.py         # Smoke test: offer agent with mock evidence
    └── test_agent4.py         # Smoke test: critique streaming
```

---

## Setup

```bash
# 1. Create and activate virtualenv
python3 -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 4. Run the server
uvicorn main:app --reload --port 8000
```

---

## Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...        # Required — all agents use this
RAG_SERVICE_URL=http://localhost:8001  # Mateen's RAG service
```

---

## API Reference

### POST /intake/message

Conversational intake loop. Collects 5 fields from the user in ≤4 turns, then signals completion.

**Request:**
```json
{
  "session_id": "optional-uuid",
  "message": "I want to build an AI tool for UK estate agents"
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "reply": "What specific problem are your agents facing?",
  "complete": false,
  "context": null
}
```

When complete:
```json
{
  "session_id": "uuid",
  "reply": "CONTEXT_COMPLETE\n{...}",
  "complete": true,
  "context": {
    "idea": "AI listing copy tool",
    "niche": "UK residential estate agents",
    "target_customer": "Solo agents at 1-3 branch independents",
    "core_pain": "Writing descriptions takes 3hrs/week",
    "existing_solutions": "Copy-paste old listings, occasionally ChatGPT",
    "notes": ""
  }
}
```

---

### POST /generate

Runs the full 5-agent pipeline and streams results as SSE events.

**Request:**
```json
{
  "idea": "AI tool for UK estate agents",
  "context": { ... },   // optional — from completed intake session
  "models": {           // optional — override default models
    "research": "claude-sonnet-4-5",
    "offer": "claude-haiku-4-5",
    "builder": "claude-haiku-4-5",
    "growth": "claude-haiku-4-5",
    "critique": "claude-haiku-4-5"
  }
}
```

**Response:** `text/event-stream`

Events fire in this order:

| Event | When | Payload |
|-------|------|---------|
| `status` | Pipeline stage starts | `{ step: int, label: str, sub?: str }` |
| `research` | Agent 0 complete | `Evidence` model as dict |
| `eval` | After offer eval | `{ research: EvalResult, offer: EvalResult }` |
| `offer` | Agent 1 complete | `Offer` model as dict |
| `page` | Agents 2+3 complete | `{ url: "/p/{slug}", slug: str }` |
| `growth` | Agents 2+3 complete | `GrowthPack` model as dict |
| `critique_chunk` | Agent 4 streaming | `{ text: str }` — many of these |
| `complete` | Pipeline done | `{ success: true, slug: str }` |
| `error` | Any failure | `{ message: str }` |

**SSE format (exact — Nathan's frontend depends on this):**
```
data: {"event": "status", "data": {"step": 0, "label": "Researching your market..."}}\n\n
```

**curl test:**
```bash
curl -N -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"idea": "AI tool for UK estate agents"}'
```

---

### GET /p/{slug}

Returns the cached offer package for a given slug.

```bash
curl http://localhost:8000/p/ai-tool-uk-estate
```

---

## Data Models

All models live in `models/schemas.py`. Never define Pydantic models anywhere else.

### EnrichedContext
Output of the intake loop. Input to the entire pipeline.

| Field | Type | Description |
|-------|------|-------------|
| `idea` | str | The product/service idea |
| `niche` | str | Specific market or industry |
| `target_customer` | str | Precise description of ideal buyer |
| `core_pain` | str | Main problem the product solves |
| `existing_solutions` | str | What the customer uses today |
| `notes` | str | Any extra context |

### Evidence
Output of Agent 0. Grounds everything downstream.

| Field | Type | Description |
|-------|------|-------------|
| `competitors` | Competitor[] | Max 4, each with real pricing URL |
| `reddit_quotes` | RedditQuote[] | Max 3, exact quotes with upvotes |
| `market_signals` | MarketSignal[] | Max 4 stats with sources |
| `pricing_range` | PricingRange | Low/high/insight |
| `all_sources` | str[] | Every URL that yielded real data |

### Offer
Output of Agent 1. Input to Agents 2, 3, 4.

| Field | Type | Description |
|-------|------|-------------|
| `icp` | ICP | who, pain, trigger, evidence_source |
| `headline` | str | "[Outcome] for [Person] in [Timeframe]" |
| `price` | str | e.g. "£49/mo" |
| `price_anchor` | str | References actual competitor pricing |
| `guarantee` | str | Specific + measurable |
| `cta` | str | Specific action, not "Get Started" |
| `sources_used` | str[] | URLs from evidence that grounded this |

### LandingPage
Output of Agent 2.

### GrowthPack
Output of Agent 3. Contains cold email, LinkedIn DM, 3 hooks, channel recommendation.

### EvalResult

| Field | Type | Description |
|-------|------|-------------|
| `passed` | bool | Whether critical checks passed |
| `score` | float | 0.0–1.0 |
| `critical_fails` | str[] | Names of failed checks |
| `action` | str | `continue` / `retry` / `warn` / `regenerate_offer` |

---

## Eval Logic

### eval_research (pure function — no LLM)

Critical failures (trigger Agent 0 retry):
- `competitors` array is empty
- Any competitor URL doesn't start with `http`
- `reddit_quotes` array is empty
- Any reddit `thread_url` doesn't start with `http`

### eval_offer (Claude Haiku as judge)

Scores three dimensions 0.0–1.0:
- `pain_grounded` — ICP pain traceable to Reddit quote or competitor gap
- `price_grounded` — price anchored to actual competitor data
- `guarantee_credible` — specific, measurable, differentiated

Actions:
- score ≥ 0.65 → `continue`
- 0.5 ≤ score < 0.65 → `warn` (emit eval event, continue)
- score < 0.5 → `regenerate_offer` (re-run Agent 1 with weak_point hint)

---

## Model Registry

`models/model_registry.py` enforces which models can run which agents.

```python
DEFAULTS = {
    "research": "claude-sonnet-4-5",
    "offer":    "claude-haiku-4-5",
    "builder":  "claude-haiku-4-5",
    "growth":   "claude-haiku-4-5",
    "critique": "claude-haiku-4-5",
}
```

Blocked models fall back silently to the default — no exceptions raised.
`deepseek-r1` is blocked from all agents except critique.
`claude-haiku-4-5` is blocked from research (no web_search support).

---

## RAG Integration (Mateen's service)

The RAG client calls Mateen's retrieval service before Agent 1 runs.

**What it calls:**
```
GET http://localhost:8001/rag/retrieve?query=AI+tool+estate+agents+writing+pain&categories=ICP,guarantee,pricing,positioning
```

**What it expects back:**
```json
{
  "principles": [
    {
      "category": "ICP",
      "text": "Lead with the specific trigger moment, not the general pain",
      "source": "hormozi-offer-principles"
    }
  ]
}
```

**Fallback behaviour:** If the service is down, times out (5s), or returns anything unexpected, the pipeline continues with an empty principles list. It never blocks or crashes.

---

## Running Tests

No pytest — just standalone async scripts that print results.

```bash
# Test intake loop (requires server running on :8000)
python3 tests/test_intake.py

# Test offer agent with mock evidence (no server needed)
python3 tests/test_agent1.py

# Test critique streaming (no server needed)
python3 tests/test_agent4.py

# Test research agent with live web search (slow — ~30s)
python3 tests/test_agent0.py
```

---

## Error Handling

| Error | Behaviour |
|-------|-----------|
| Agent 0 rate limited | Retry up to 3x with 30/60/90s backoff |
| Agent 0 fails entirely | Emit `error` event, close stream |
| RAG service timeout | Log warning, proceed with `[]` |
| Agent 1 JSON parse fails | Retry once, then emit `error` |
| Agent 2 or 3 fails | Emit what succeeded, continue to critique |
| Critique streaming fails | Emit "Critique unavailable", emit `complete` |
| Any unhandled exception | Emit `error` event, close stream cleanly |

---

## Common Debugging

**Which SSE event last fired before it stopped?**
Check the curl output — the last event before silence tells you which agent failed.

**LLM returned JSON with markdown fences?**
`parse_llm_json()` in each agent strips ` ```json ` fences automatically.

**Pydantic validation failing?**
The error message names the exact field. Check the LLM output matches the schema.

**RAG returning empty list?**
Check if Mateen's service is running on :8001. The offer still generates — just ungrounded.

**Rate limit on Agent 0?**
The model is `claude-haiku-4-5` with `max_tokens=2000`. If still hitting limits, wait 60s and retry.
