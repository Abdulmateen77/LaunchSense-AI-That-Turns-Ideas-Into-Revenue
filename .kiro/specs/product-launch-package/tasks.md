# Tasks: product-launch-package

## Implementation Plan

- [x] 1. Project scaffold
  - [x] 1.1 Create `backend/` directory with folder structure: `agents/`, `api/`, `models/`, `services/`, `tests/`
  - [x] 1.2 Create `requirements.txt` with: fastapi uvicorn anthropic openai httpx python-dotenv pydantic
  - [x] 1.3 Create `.env.example` with all required keys: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `CIVIC_TOKEN`, `CIVIC_URL`, `RAG_SERVICE_URL`
  - [x] 1.4 Create `main.py` with FastAPI app, CORS middleware (allow all origins), and router imports
  - [x] 1.5 Create `__init__.py` in every package folder
  - [x] 1.6 Verify: `uvicorn main:app --reload` starts without errors and `curl http://localhost:8000/docs` returns swagger UI

- [x] 2. Pydantic schemas
  - [x] 2.1 Create `models/schemas.py` — write `Competitor`, `RedditQuote`, `MarketSignal` models
  - [x] 2.2 Write `Evidence` model with `max_length` constraints on all list fields (`competitors` max 4, `reddit_quotes` max 3, `market_signals` max 4)
  - [x] 2.3 Write `Offer` model with nested `icp` sub-model (`who`, `pain`, `trigger`, `evidence_source`) and all top-level fields (`headline`, `subheadline`, `outcome`, `price`, `price_anchor`, `guarantee`, `bonuses`, `urgency`, `cta`, `competitor_gap`, `sources_used`)
  - [x] 2.4 Write `LandingPage` model with nested `hero`, `problem`, `solution`, `vs_section`, `pricing`, and `sources` sections
  - [x] 2.5 Write `GrowthPack` model with nested `cold_email` (subject, body, evidence_line, evidence_url, ps), `linkedin_dm`, `hooks` (exactly 3), and `channel`
  - [x] 2.6 Write `EvalResult` model with `passed: bool`, `score: float`, `critical_fails: list[str]`, `action: str`
  - [x] 2.7 Write `EnrichedContext` model with fields: `idea`, `niche`, `target_customer`, `core_pain`, `existing_solutions`, `notes`
  - [x] 2.8 Write `GenerateRequest` and `ModelChoices` models
  - [x] 2.9 Verify: `python -c "from models.schemas import EnrichedContext, Evidence, Offer, LandingPage, GrowthPack, EvalResult; print('OK')"` passes

- [x] 3. Model registry
  - [x] 3.1 Create `models/model_registry.py` with `REGISTRY` dict containing all 6 models and their capabilities (`supports_web_search`, `supports_structured`, `supports_streaming`, `blocked_agents`)
  - [x] 3.2 Create `DEFAULTS` dict mapping agent name to default model_id
  - [x] 3.3 Write `resolve_model(agent: str, model_id: str | None) -> str` — returns model_id if valid and not blocked, falls back to `DEFAULTS[agent]` with a print warning
  - [x] 3.4 Verify: `resolve_model("research", "deepseek-r1")` returns `"claude-sonnet-4-6"`
  - [x] 3.5 Verify: `resolve_model("critique", "deepseek-r1")` returns `"deepseek-r1"`

- [x] 4. Intake loop
  - [x] 4.1 Create `IntakeSession` class in `api/intake.py` with `messages: list`, `complete: bool`, `context: EnrichedContext | None`
  - [x] 4.2 Create in-memory session store: `INTAKE_SESSIONS: dict[str, IntakeSession] = {}`
  - [x] 4.3 Write `INTAKE_SYSTEM` prompt constant (by hand): one question at a time, max 4 questions, detect when all 5 fields are known, signal completion with `CONTEXT_COMPLETE` + JSON
  - [x] 4.4 Write `async send_message(session_id: str, message: str)` — appends to messages, calls Haiku, checks for `CONTEXT_COMPLETE`, parses `EnrichedContext` from response when complete
  - [x] 4.5 Write `POST /intake/message` route handler in `api/intake.py` and register in `main.py`
  - [x] 4.6 Write `tests/test_intake.py` standalone async test — POST 4-5 times, confirm `CONTEXT_COMPLETE` fires and all `EnrichedContext` fields are populated

- [x] 5. Agent 0 — Research
  - [x] 5.1 Create `agents/agent0_research.py` — write `RESEARCH_SYSTEM` prompt constant (by hand): explicit search sequence (competitors → fetch pricing pages → Reddit → fetch threads), no invented URLs rule, return format matching `Evidence` schema
  - [x] 5.2 Write `async run_research_agent(context: EnrichedContext, model: str | None = None) -> Evidence` — passes both `web_search_20260209` and `web_fetch_20260209` tools, `max_tokens=8000`, extracts final text block after all tool calls, strips markdown fences, returns validated `Evidence`
  - [x] 5.3 Write `tests/test_agent0.py` standalone async test
  - [x] 5.4 Run the test manually and verify: competitor URLs are real and resolve, Reddit quotes are actual text (not summaries), upvote counts are present
  - [x] 5.5 Iterate on `RESEARCH_SYSTEM` prompt until all acceptance criteria pass
  - [x] 5.6 Test with 3 different ideas: estate agents, freelancers, SaaS founders

- [x] 6. RAG client
  - [x] 6.1 Create `services/rag_client.py` — write `async get_principles(context: EnrichedContext, categories: list[str]) -> list[dict]`
  - [x] 6.2 Build query string from `context.idea + context.core_pain`, call `GET {RAG_SERVICE_URL}/rag/retrieve` with httpx, 5-second timeout, return `[]` on any exception with a print warning
  - [x] 6.3 Test with RAG service running: verify principles are returned
  - [x] 6.4 Test with RAG service killed: verify `[]` is returned and pipeline does not crash

- [x] 7. Prompt builder
  - [x] 7.1 Create `services/prompt_builder.py` — write `build_offer_prompt(context: EnrichedContext, evidence: Evidence, principles: list[dict]) -> str`
  - [x] 7.2 Format sections in order: context (idea, target, pain, existing), competitors with pricing and weakness, Reddit quotes with upvotes and URL, pricing range, RAG principles as compact bullets, instructions (price anchoring, evidence citation, guarantee), full `Offer` JSON schema as expected output format
  - [x] 7.3 Print the prompt for "AI tool for estate agents" and verify: real competitor prices present, actual Reddit quotes present, RAG principles clearly separated
  - [x] 7.4 Iterate until the prompt clearly separates all sections and makes the expected output obvious

- [x] 8. Agent 1 — Offer
  - [x] 8.1 Create `agents/agent1_offer.py` — write `OFFER_SYSTEM` prompt constant (by hand): Hormozi-style principles, anchor-to-evidence rules, strict JSON only
  - [x] 8.2 Write `async run_offer_agent(context: EnrichedContext, evidence: Evidence, principles: list[dict], model: str | None = None, weak_point: str | None = None) -> Offer` — calls `build_offer_prompt`, parses and validates `Offer`, accepts optional `weak_point` hint for regeneration
  - [x] 8.3 Write `tests/test_agent1.py` — run with real evidence from Agent 0 test, verify `icp.evidence_source` is populated, `price` is below `price_anchor`, `guarantee` is specific and ≥20 words
  - [x] 8.4 Iterate on `OFFER_SYSTEM` and `build_offer_prompt` until offer quality meets acceptance criteria

- [x] 9. Agents 2 and 3 — Builder and Growth
  - [x] 9.1 Create `agents/agent2_builder.py` — write `BUILDER_SYSTEM` prompt constant and `async run_builder_agent(offer: Offer, evidence: Evidence, model: str | None = None) -> LandingPage`; system prompt must require evidence stats, real source citations, and clean slug
  - [x] 9.2 Create `agents/agent3_growth.py` — write `GROWTH_SYSTEM` prompt constant and `async run_growth_agent(offer: Offer, evidence: Evidence, model: str | None = None) -> GrowthPack`; system prompt must enforce email subject ≤8 words, body 3 paragraphs, LinkedIn DM no pitch
  - [x] 9.3 Test both agents individually with real offer + evidence
  - [x] 9.4 Test parallel execution with `asyncio.gather()` — confirm both complete before either result is used
  - [x] 9.5 Verify `LandingPage.sources` contains real URLs from evidence and `GrowthPack.cold_email.evidence_url` is a real source URL

- [x] 10. Agent 4 — Critique
  - [x] 10.1 Create `agents/agent4_critique.py` — write `CRITIQUE_SYSTEM` prompt constant (by hand): embed bad/good feedback examples, structure (strengths → weakest claims → single highest-leverage rewrite), must end with "The one change that will most improve conversions:"
  - [x] 10.2 Write `run_critique_agent()` as an async generator that yields `str` chunks using `client.messages.stream()`
  - [x] 10.3 Write `tests/test_agent4.py` — print each chunk as it arrives, verify chunks are incremental (not one large response)
  - [x] 10.4 Verify critique includes at least one specific field name from the offer and final line starts with the required phrase

- [x] 11. Eval service
  - [x] 11.1 Create `services/evals.py` — write `eval_research(evidence: Evidence) -> EvalResult` as a pure function
  - [x] 11.2 Critical checks in `eval_research`: competitors not empty, all competitor URLs start with `http`, all `reddit_quote.thread_url` values start with `http`, at least 1 reddit quote exists
  - [x] 11.3 Write `async eval_offer(offer: Offer, evidence: Evidence) -> EvalResult` — uses Claude Haiku as judge, scores `pain_grounded`, `price_grounded`, `guarantee_credible`, returns `EvalResult` with `action`
  - [x] 11.4 Verify: `eval_research(Evidence(competitors=[], ...))` returns `action="retry"`
  - [x] 11.5 Verify: `eval_offer` runs in under 3 seconds using Haiku

- [x] 12. SSE orchestration route
  - [x] 12.1 Create `api/generate.py` — write `emit(event_name: str, payload: dict)` sync helper that formats SSE events as `f"data: {json.dumps({'event': event_name, 'data': payload})}\n\n"`
  - [x] 12.2 Write `async def generate_stream(request: GenerateRequest)` generator function — runs all agents in correct order with evals, emits events at each stage, catches all exceptions and emits `error` event
  - [x] 12.3 Wire agent execution order: status → Agent 0 → eval_research (retry if needed) → emit research → RAG → status → Agent 1 → eval_offer (regenerate if needed) → emit offer → status → asyncio.gather(Agent 2, Agent 3) → cache → emit page + growth → status → stream Agent 4 chunks → emit complete
  - [x] 12.4 Add slug generation from idea string (lowercase, hyphenated, max 4 words)
  - [x] 12.5 Add `cache_offer(slug, data)` using Vercel KV REST API via httpx after agents 2+3 complete
  - [x] 12.6 Write `POST /generate` route returning `StreamingResponse` with `media_type="text/event-stream"` and register in `main.py`
  - [x] 12.7 End-to-end test: `curl -N -X POST http://localhost:8000/generate -d '{"idea":"AI tool for estate agents"}' -H "Content-Type: application/json"` — verify all 8 event types fire in correct order and stream closes cleanly
  - [x] 12.8 Test error handling: break Agent 2, verify `error` event fires instead of unhandled exception

- [ ] 13. Integration with Nathan
  - [ ] 13.1 Confirm Nathan can receive SSE stream from `POST /generate`
  - [ ] 13.2 Verify Nathan's frontend renders research panel from `research` event
  - [ ] 13.3 Verify Nathan's frontend renders offer card from `offer` event
  - [ ] 13.4 Verify Nathan's frontend shows streaming text from `critique_chunk` events
  - [ ] 13.5 Fix any CORS or event name mismatches

- [ ] 14. Integration with Mateen
  - [ ] 14.1 Confirm Mateen's RAG service is running on `:8001`
  - [ ] 14.2 Test: `curl "http://localhost:8001/rag/retrieve?query=AI+tool+estate+agents&categories=ICP,guarantee"` returns principles
  - [ ] 14.3 Verify principles appear in `build_offer_prompt()` output
  - [ ] 14.4 Verify offer quality visibly differs with RAG vs. without RAG

- [ ] 15. Demo preparation
  - [ ] 15.1 Pre-run "AI tool for UK estate agents" to warm the KV cache
  - [ ] 15.2 Pre-run "Notion template for freelancers" as second demo idea
  - [ ] 15.3 Verify both slugs are accessible via `/p/{slug}`
  - [ ] 15.4 Confirm research agent found real competitor prices for both ideas
  - [ ] 15.5 Run full pipeline once live in front of team and time it
  - [ ] 15.6 Confirm total time < 90 seconds
