# Design: Offer → Launch Backend

## Technology decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | FastAPI | Async-native, Pydantic built-in, fast to scaffold |
| LLM client | anthropic SDK (direct) | No framework abstraction needed, tools work natively |
| Async | asyncio native | asyncio.gather() for parallel agents, no celery needed |
| Storage | Vercel KV REST API | Zero infra, works from any Python via httpx |
| Session state | in-memory dict | Hackathon scope — no DB overhead |
| Vector DB | Mateen's service | Separate concern — we call it via HTTP |

## Data models

### EnrichedContext
Output of the intake loop. Input to the pipeline.
```
idea:               str   — "AI listing copy tool"
niche:              str   — "UK residential estate agents"  
target_customer:    str   — "Solo agents at 1-3 branch independents"
core_pain:          str   — "Writing descriptions takes 3hrs/week"
existing_solutions: str   — "Copy-paste old listings, occasionally ChatGPT"
notes:              str   — any additional context from conversation
```

### Evidence
Output of Agent 0. Grounding for Agent 1.
```
competitors:    Competitor[]  — max 4
reddit_quotes:  RedditQuote[] — max 3
market_signals: MarketSignal[] — max 4
pricing_range:  { low, high, insight }
all_sources:    str[]  — every URL that yielded real data
```

### Competitor
```
name:          str — "PropWrite"
url:           str — "https://propwrite.com"
pricing_found: str — "£49/mo starter · £149/mo pro" OR "pricing not public"
pricing_url:   str — "https://propwrite.com/pricing"
weakness:      str — "No multi-branch support, UK-only, no tone control"
```

### RedditQuote
```
quote:       str — exact words from the fetched thread
subreddit:   str — "ukestateagents"
upvotes:     str — "247" — proxy for how common the pain is
thread_url:  str — actual URL that was fetched
```

### Offer
Output of Agent 1. Input to Agents 2, 3, 4.
```
icp: {
  who:             str — hyper-specific person
  pain:            str — quantified (hrs, £, embarrassment)
  trigger:         str — the moment they would buy
  evidence_source: str — which Reddit quote or competitor gap backs this
}
headline:        str — "[Outcome] for [Person] in [Timeframe]"
subheadline:     str
outcome:         str
price:           str — "£49/mo"
price_anchor:    str — "Competitors charge up to £149/mo"
guarantee:       str — specific + measurable
bonuses:         str[] — max 3
urgency:         str
cta:             str — specific action, not "Get Started"
competitor_gap:  str — why you win vs. them
sources_used:    str[] — URLs from evidence that grounded this offer
```

### LandingPage
Output of Agent 2.
```
slug:         str — "estate-agent-listing-ai"
color_scheme: str — dark|light|warm|bold
hero: {
  headline:    str
  subheadline: str
  cta:         str
  cta_sub:     str — "No credit card · 60-second setup"
}
problem: {
  headline: str
  points:   [{ pain, stat, source }] — max 3, each with real source URL
}
solution: {
  headline: str
  benefits: [{ title, body }] — max 3
}
vs_section: {
  headline: str
  us:       str[]
  them:     str[]
}
pricing: { price, anchor, guarantee }
sources:  [{ label, url }] — all evidence sources shown as footnotes
```

### GrowthPack
Output of Agent 3.
```
cold_email: {
  subject:        str — under 8 words
  body:           str — 3 paras, ends with 1 question
  evidence_line:  str — the specific stat/quote used
  evidence_url:   str
  ps:             str — the real pitch
}
linkedin_dm:  str — under 150 words, no pitch, curiosity only
hooks:        [{ platform, hook, angle, evidence_basis }] — exactly 3
channel: {
  pick:    str — cold_email|linkedin|content
  why:     str
  action:  str — specific first action in 24hrs
}
```

### EvalResult
```
passed:         bool
score:          float  — 0.0–1.0
critical_fails: str[]  — list of check names that failed
action:         str    — continue|retry|warn|regenerate_offer
```

## Service interfaces

### POST /intake/message
```
Request:  { session_id?: string, message: string }
Response: { session_id: string, reply: string, complete: bool, context?: EnrichedContext }
```

Sessions stored in `INTAKE_SESSIONS: dict[str, IntakeSession]` in memory.
Session contains: messages list, complete bool, context EnrichedContext | None.

### POST /generate
```
Request:  { idea: string, context?: EnrichedContext, models?: ModelChoices }
Response: text/event-stream of SSE events
```

If `context` is provided (from completed intake session), skip intake and use it directly.
If no context provided, use the raw idea string as a minimal context.

### GET /rag/retrieve (Mateen's service — we call this)
```
Request:  GET params: query (str), categories (comma-separated str)
Response: { principles: [{ category, text, source }] }
```

## Agent execution flow

```
POST /generate received
  ↓
validate input → GenerateRequest
  ↓
emit status(step=0, "Researching your market...")
  ↓
run_research_agent(context)        ← Agent 0: 15–25s, uses web_search + web_fetch
  ↓
eval_research(evidence)
  → if retry: run_research_agent again, emit "Deepening research..."
  ↓
emit research(evidence)
  ↓
get_principles(context)            ← RAG call: 5s timeout, empty list on failure
  ↓
emit status(step=1, "Building offer...")
  ↓
run_offer_agent(context, evidence, principles)  ← Agent 1: 5–10s
  ↓
eval_offer(offer, evidence)
  → if regenerate: run_offer_agent again with weak_point hint
  ↓
emit offer(offer)
  ↓
emit status(step=2, "Building page + outreach...")
  ↓
asyncio.gather(                    ← Agents 2+3: parallel, ~8s total
  run_builder_agent(offer, evidence),
  run_growth_agent(offer, evidence)
)
  ↓
cache_offer(slug, all_data)
  ↓
emit page({ url: f"/p/{slug}", slug })
emit growth(growth)
  ↓
emit status(step=3, "Critiquing...", streaming=True)
  ↓
stream critique_chunks             ← Agent 4: ~8s streaming
  ↓
emit complete({ success: True, slug })
```

## Prompt architecture

All prompts live in agent files as module-level constants (UPPERCASE).
They are never f-strings at the top level — only the user message content is dynamic.
The system prompt is static. The user prompt is assembled by prompt_builder.py.

### prompt_builder.build_offer_prompt()
This is the most important function in the codebase.
It takes: EnrichedContext, Evidence, list[Principle]
It returns: a single string to pass as the user message to Agent 1

Format:
```
IDEA: {context.idea}
TARGET: {context.target_customer}
PAIN: {context.core_pain}
EXISTING: {context.existing_solutions}

MARKET EVIDENCE:
Competitors:
- {name}: {pricing_found} ({pricing_url}) — weakness: {weakness}

Real customer quotes:
- "{quote}" ({upvotes} upvotes, r/{subreddit}) — {thread_url}

Pricing range: {low} – {high}
Insight: {pricing_range.insight}

OFFER PRINCIPLES (apply, do not copy):
- [{category}] {text}

INSTRUCTIONS:
[...specific instructions to anchor price, reference evidence, etc.]

Return ONLY valid JSON matching this schema:
{...schema}
```

## Model registry design

```python
REGISTRY = {
    "claude-sonnet-4-6": {
        "supports_web_search": True,
        "supports_structured": True,
        "supports_streaming": True,
        "blocked_agents": [],
    },
    "claude-haiku-4-5": {
        "supports_web_search": False,
        "supports_structured": True,
        "supports_streaming": True,
        "blocked_agents": ["research"],
    },
    "gpt-4o": {
        "supports_web_search": True,
        "supports_structured": True,
        "supports_streaming": True,
        "blocked_agents": [],
    },
    "gpt-4o-mini": {
        "supports_web_search": True,
        "supports_structured": True,
        "supports_streaming": True,
        "blocked_agents": [],
    },
    "deepseek-v3": {
        "supports_web_search": False,
        "supports_structured": True,
        "supports_streaming": True,
        "blocked_agents": ["research"],
    },
    "deepseek-r1": {
        "supports_web_search": False,
        "supports_structured": False,   # HARD LIMIT
        "supports_streaming": True,
        "blocked_agents": ["research", "offer", "builder", "growth"],
    },
}

DEFAULTS = {
    "research": "claude-sonnet-4-6",
    "offer":    "claude-sonnet-4-6",
    "builder":  "gpt-4o-mini",
    "growth":   "gpt-4o-mini",
    "critique": "claude-sonnet-4-6",
}
```

## Eval design

### eval_research (pure function — no LLM)
Critical checks (trigger retry):
- competitors array is not empty
- all competitor URLs start with http
- all reddit_quote thread_urls start with http
- at least 1 reddit quote exists

Non-critical (warning only):
- at least 1 real price found (not all "pricing not public")
- at least 1 market signal

### eval_offer (uses Claude Haiku as judge)
Prompt asks Haiku to score:
- pain_grounded: is ICP pain traceable to Reddit quotes?
- price_grounded: is price anchored to competitor data?
- guarantee_credible: is guarantee specific and measurable?
- score: 0.0–1.0
- weakest_claim: string

Actions:
- score >= 0.65 → continue
- 0.5 <= score < 0.65 → warn (emit eval event, continue anyway)
- score < 0.5 → regenerate_offer (re-run Agent 1 with weak_point hint)

## Error handling strategy

| Error type | Behaviour |
|-----------|-----------|
| Research agent fails entirely | Emit error event, close stream |
| RAG service timeout | Log warning, proceed with empty principles |
| Offer agent fails JSON parse | Retry once, then emit error |
| Builder OR growth fails | Emit what succeeded, continue to critique |
| Critique streaming fails | Emit "Critique unavailable", emit complete |
| Any unhandled exception | Emit error event, close stream cleanly |

The pipeline should degrade gracefully: a partial result is better than no result.
