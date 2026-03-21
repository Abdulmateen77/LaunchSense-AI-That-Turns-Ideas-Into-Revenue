# Tasks: Offer → Launch Backend

## Task 1: Project scaffold
**Status:** TODO
**Owner:** Falah
**Time estimate:** 30 minutes

### Steps
- [ ] 1.1 Create `backend/` directory with the full folder structure from design.md
- [ ] 1.2 Create `requirements.txt` with: fastapi uvicorn anthropic openai httpx python-dotenv pydantic
- [ ] 1.3 Create `.env.example` with all required keys (no real values)
- [ ] 1.4 Create `main.py` with FastAPI app, CORS middleware (allow all origins), router imports
- [ ] 1.5 Create `__init__.py` in every package folder
- [ ] 1.6 Verify: `uvicorn main:app --reload` starts without errors

### Acceptance
`curl http://localhost:8000/docs` returns FastAPI swagger UI.

---

## Task 2: Pydantic schemas
**Status:** TODO
**Owner:** Falah
**Time estimate:** 45 minutes
**Note:** Write by hand — do not vibe code. These define all data contracts.

### Steps
- [ ] 2.1 Write `Competitor`, `RedditQuote`, `MarketSignal` models in schemas.py
- [ ] 2.2 Write `Evidence` model with max_length constraints on all list fields
- [ ] 2.3 Write `Offer` model with nested `icp` as a dict or sub-model
- [ ] 2.4 Write `LandingPage` model with nested sections
- [ ] 2.5 Write `GrowthPack` model with nested cold_email and hooks
- [ ] 2.6 Write `EvalResult` model
- [ ] 2.7 Write `EnrichedContext` model (intake output)
- [ ] 2.8 Write `GenerateRequest` and `ModelChoices` models
- [ ] 2.9 Test: `python -c "from models.schemas import Offer; print('OK')`

### Acceptance
All models import without error. Each has correct field types and constraints.

---

## Task 3: Model registry
**Status:** TODO
**Owner:** Falah
**Time estimate:** 20 minutes

### Steps
- [ ] 3.1 Create `REGISTRY` dict in `models/model_registry.py` with all 6 models
- [ ] 3.2 Create `DEFAULTS` dict mapping agent name to default model_id
- [ ] 3.3 Write `resolve_model(agent: str, model_id: str | None) -> str`
  - Returns model_id if valid and not blocked for this agent
  - Falls back to DEFAULTS[agent] with a print warning otherwise
- [ ] 3.4 Test: `resolve_model("research", "deepseek-r1")` returns `"claude-sonnet-4-6"`
- [ ] 3.5 Test: `resolve_model("critique", "deepseek-r1")` returns `"deepseek-reasoner"`

### Acceptance
Blocked models fall back silently. No exceptions raised for invalid model IDs.

---

## Task 4: Intake loop
**Status:** TODO
**Owner:** Falah
**Time estimate:** 1.5 hours

### Steps
- [ ] 4.1 Create `IntakeSession` class in `api/intake.py` with messages list, complete bool, context field
- [ ] 4.2 Create in-memory session store: `INTAKE_SESSIONS: dict[str, IntakeSession] = {}`
- [ ] 4.3 Write `INTAKE_SYSTEM` prompt (by hand — critical):
  - One question at a time
  - Max 4 questions
  - Detect when all 5 fields are known
  - Signal completion with CONTEXT_COMPLETE + JSON
- [ ] 4.4 Write `send_message(session_id, message)` async function
  - Appends to messages, calls Haiku, checks for CONTEXT_COMPLETE
  - Parses EnrichedContext from response when complete
- [ ] 4.5 Write POST /intake/message route handler
- [ ] 4.6 Test manually: POST 4-5 times, confirm CONTEXT_COMPLETE fires
- [ ] 4.7 Test: all EnrichedContext fields are populated after completion

### Acceptance
Intake session completes within 4 turns for a clear idea.
EnrichedContext has non-empty values for all required fields.

---

## Task 5: Agent 0 — Research
**Status:** TODO
**Owner:** Falah
**Time estimate:** 2 hours

### Steps
- [ ] 5.1 Write `RESEARCH_SYSTEM` prompt in `agents/agent0_research.py` (by hand):
  - Explicit search sequence: competitors first → fetch pricing pages → Reddit → fetch threads
  - Rules: no invented URLs, "pricing not public" if not found
  - Return format: JSON matching Evidence schema
- [ ] 5.2 Write `run_research_agent(context: EnrichedContext) -> Evidence`
  - Passes both web_search_20260209 and web_fetch_20260209 tools
  - max_tokens=8000 (research is verbose)
  - Extracts final text block after all tool calls
  - Parses JSON with markdown fence stripping
  - Returns validated Evidence object
- [ ] 5.3 Write `tests/test_agent0.py` standalone test
- [ ] 5.4 **Run the test. Check output manually.**
  - Are competitor URLs real? Do they resolve?
  - Are Reddit quotes real words (not summaries)?
  - Are upvote counts present?
- [ ] 5.5 Iterate on RESEARCH_SYSTEM prompt until test passes
- [ ] 5.6 Test with 3 different ideas: estate agents, freelancers, SaaS founders

### Acceptance
For "AI tool for UK estate agents":
- competitors has ≥1 entry with a real pricing page URL
- reddit_quotes has ≥1 entry with actual quote text and upvotes
- No source URLs are invented

**Do not proceed to Task 6 until this test passes.**

---

## Task 6: RAG client
**Status:** TODO
**Owner:** Falah
**Time estimate:** 30 minutes

### Steps
- [ ] 6.1 Write `get_principles(context: EnrichedContext, categories: list[str]) -> list[dict]`
  - Build query string from context.idea + context.core_pain
  - Call GET {RAG_SERVICE_URL}/rag/retrieve with httpx
  - 5 second timeout
  - Return [] on any exception, print warning message
- [ ] 6.2 Test with RAG service running (Mateen): verify principles returned
- [ ] 6.3 Test with RAG service killed: verify [] returned, no crash

### Acceptance
Function returns valid list or empty list. Never raises. Always completes within 6s.

---

## Task 7: Prompt builder
**Status:** TODO
**Owner:** Falah
**Time estimate:** 1 hour

### Steps
- [ ] 7.1 Write `build_offer_prompt(context, evidence, principles) -> str` in prompt_builder.py
  - Format context section
  - Format competitors with pricing and weakness
  - Format Reddit quotes with upvotes and URL
  - Format RAG principles as compact bullets
  - Include explicit instructions for price anchoring, evidence citation, guarantee
  - Include the full Offer JSON schema as the expected output format
- [ ] 7.2 Print the prompt for "AI tool for estate agents" and review it
  - Does it include real competitor prices?
  - Does it include actual Reddit quotes?
  - Are the RAG principles clearly separated from raw chunks?
- [ ] 7.3 Iterate until the prompt is clear and structured

### Acceptance
Prompt clearly separates: context, evidence, principles, instructions, schema.
Reviewing the prompt text makes it obvious what a good offer should look like.

---

## Task 8: Agent 1 — Offer
**Status:** TODO
**Owner:** Falah
**Time estimate:** 1 hour

### Steps
- [ ] 8.1 Write `OFFER_SYSTEM` prompt (by hand) in `agents/agent1_offer.py`
  - Hormozi-style principles embedded
  - Rules: anchor to evidence, no generic buzzwords, strict JSON only
- [ ] 8.2 Write `run_offer_agent(context, evidence, principles, model, weak_point=None) -> Offer`
  - Calls build_offer_prompt to get user message
  - Uses specified model or default
  - Parses and validates Offer output
  - Accepts optional weak_point hint for regeneration runs
- [ ] 8.3 Test: run Agent 1 with real evidence from Agent 0 test
  - Is icp.evidence_source populated with a real reference?
  - Is price_anchor referencing actual competitor data?
  - Is the guarantee specific (not "30-day money back")?
- [ ] 8.4 Iterate on OFFER_SYSTEM and build_offer_prompt until quality is good

### Acceptance
Offer.icp.evidence_source cites a specific Reddit quote or competitor weakness.
Offer.price is lower than Offer.price_anchor.
Offer.guarantee is at least 20 words and measurable.

---

## Task 9: Agents 2 and 3 — Builder and Growth
**Status:** TODO
**Owner:** Falah
**Time estimate:** 1 hour

### Steps
- [ ] 9.1 Write `BUILDER_SYSTEM` and `run_builder_agent()` in agent2_builder.py
  - System prompt: output must use evidence stats, cite sources, slug must be clean
  - Returns LandingPage validated object
- [ ] 9.2 Write `GROWTH_SYSTEM` and `run_growth_agent()` in agent3_growth.py
  - System prompt: email subject ≤8 words, body 3 paras, DM no pitch
  - Returns GrowthPack validated object
- [ ] 9.3 Test both individually
- [ ] 9.4 Test with asyncio.gather() — confirm parallel execution
- [ ] 9.5 Verify: LandingPage.sources contains real URLs from evidence
- [ ] 9.6 Verify: GrowthPack.cold_email.evidence_url is a real source URL

### Acceptance
Both complete successfully in parallel.
Landing page sources match evidence URLs.
Cold email subject is under 8 words.

---

## Task 10: Agent 4 — Critique
**Status:** TODO
**Owner:** Falah
**Time estimate:** 45 minutes

### Steps
- [ ] 10.1 Write `CRITIQUE_SYSTEM` prompt (by hand) in agent4_critique.py
  - Bad/good feedback examples embedded
  - Structure: strengths, weakest claims, single highest-leverage rewrite
  - Must end with "The one change that will most improve conversions:"
- [ ] 10.2 Write `run_critique_agent()` as an async generator that yields str chunks
  - Uses client.messages.stream()
  - yields each text_chunk from the stream
- [ ] 10.3 Test standalone: print each chunk as it arrives
- [ ] 10.4 Verify chunks arrive incrementally (not one big response)

### Acceptance
Multiple chunks received (not one large string).
Critique includes at least one specific field name from the offer.
Final line starts with "The one change that will most improve conversions:"

---

## Task 11: Eval service
**Status:** TODO
**Owner:** Falah
**Time estimate:** 45 minutes

### Steps
- [ ] 11.1 Write `eval_research(evidence) -> EvalResult` — pure function
  - Critical: competitors not empty, all competitor URLs valid, all reddit URLs valid
  - Non-critical: at least 1 real price, at least 1 market signal
- [ ] 11.2 Write `async eval_offer(offer, evidence) -> EvalResult` — uses Haiku as judge
  - Haiku judges: pain_grounded, price_grounded, guarantee_credible, score, weakest_claim
  - Returns EvalResult with action
- [ ] 11.3 Test eval_research with empty evidence → should return action="retry"
- [ ] 11.4 Test eval_offer with ungrounded offer → should return score < 0.65

### Acceptance
eval_research(Evidence(competitors=[], reddit_quotes=[], ...)) returns action="retry".
eval_offer runs in under 3 seconds using Haiku.

---

## Task 12: SSE orchestration route
**Status:** TODO
**Owner:** Falah
**Time estimate:** 1 hour

### Steps
- [ ] 12.1 Write POST /generate in `api/generate.py`
  - emit() helper formats SSE events
  - Runs agents in correct order with evals
  - Emits correct events at each stage
  - Catches all exceptions and emits error event
- [ ] 12.2 Wire all agents, evals, RAG client together
- [ ] 12.3 Add slug generation from idea string
- [ ] 12.4 Add cache_offer() call after agents 2+3
- [ ] 12.5 End-to-end test: `curl -N -X POST http://localhost:8000/generate -d '{"idea":"AI tool for estate agents"}' -H "Content-Type: application/json"`
- [ ] 12.6 Verify: events arrive in correct order
- [ ] 12.7 Verify: complete event fires last
- [ ] 12.8 Test error handling: break Agent 2, verify error event fires, not unhandled exception

### Acceptance
Full pipeline runs end-to-end via curl.
All 8 event types fire in correct order.
Stream closes cleanly after complete or error.

---

## Task 13: Integration with Nathan
**Status:** TODO
**Owner:** Falah + Nathan
**Time estimate:** 30 minutes Saturday morning

### Steps
- [ ] 13.1 Nathan confirms he can receive SSE stream from POST /generate
- [ ] 13.2 Test: Nathan's frontend renders research panel from research event
- [ ] 13.3 Test: Nathan's frontend renders offer card from offer event
- [ ] 13.4 Test: Nathan's frontend shows streaming text from critique_chunk events
- [ ] 13.5 Fix any CORS or event format issues

### Acceptance
Full pipeline visible in Nathan's UI within 2 hours of Task 12 completion.

---

## Task 14: Integration with Mateen
**Status:** TODO
**Owner:** Falah + Mateen
**Time estimate:** 20 minutes Saturday morning

### Steps
- [ ] 14.1 Mateen's service is running on :8001
- [ ] 14.2 Test: `curl "http://localhost:8001/rag/retrieve?query=AI+tool+estate+agents&categories=ICP,guarantee"`
- [ ] 14.3 Verify principles appear in offer prompt
- [ ] 14.4 Verify offer quality improves with principles vs. without

### Acceptance
RAG principles appear in build_offer_prompt() output.
Offer generated with RAG differs visibly from offer without RAG.

---

## Task 15: Demo preparation
**Status:** TODO
**Owner:** Falah
**Time estimate:** 1 hour Sunday morning

### Steps
- [ ] 15.1 Pre-run "AI tool for UK estate agents" to warm the KV cache
- [ ] 15.2 Pre-run "Notion template for freelancers" as second demo idea
- [ ] 15.3 Verify both slugs are accessible via /p/{slug}
- [ ] 15.4 Confirm research agent found real competitor prices for both
- [ ] 15.5 Run full pipeline once live in front of team — time it
- [ ] 15.6 Confirm total time < 90 seconds

### Acceptance
Two complete offers pre-cached and accessible.
Live run completes within 90 seconds.
