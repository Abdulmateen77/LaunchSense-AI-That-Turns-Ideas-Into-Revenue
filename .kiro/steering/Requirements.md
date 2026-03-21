# Requirements: Offer → Launch Backend

## Overview

The backend is a FastAPI service that takes a startup idea through a conversational
intake loop, then fires a 5-agent pipeline to produce a complete go-to-market package.
It streams results to the frontend via Server-Sent Events.

## Functional requirements

### FR-01: Intake loop

The system MUST conduct a short conversational intake before running the pipeline.

- WHEN a user sends their first message to POST /intake/message
- THEN the system MUST respond with one clarifying question (not multiple)
- WHEN the system has collected: idea, niche, target_customer, core_pain, existing_solutions
- THEN the system MUST respond with the signal CONTEXT_COMPLETE followed by a JSON object
- The system MUST NOT ask more than 4 questions total
- The system MUST use Claude Haiku for all intake conversations (fast + cheap)

Acceptance criteria:
- [ ] Sending "AI tool for estate agents" returns a single clarifying question
- [ ] After 2-4 responses, the system returns CONTEXT_COMPLETE with populated EnrichedContext
- [ ] The context object contains all required fields with non-empty values

### FR-02: Research agent (Agent 0)

The system MUST research the real market before generating any offer.

- WHEN Agent 0 runs
- THEN it MUST use both web_search AND web_fetch tools
- THEN it MUST search for competitors AND fetch their pricing pages
- THEN it MUST search for Reddit threads AND fetch the actual thread content
- THEN it MUST return an Evidence object with real source URLs
- IF a page cannot be fetched (paywall/JS-rendered) THEN it MUST note the failure, not invent content

Acceptance criteria:
- [ ] Evidence.competitors contains at least 1 entry with a real pricing_url
- [ ] Evidence.reddit_quotes contains at least 1 entry with real upvote count and thread_url
- [ ] No source URL is invented — all start with http and resolve to real pages
- [ ] Evidence.pricing_found contains actual price strings OR "pricing not public"

### FR-03: RAG integration

The system MUST call Mateen's retrieval service before generating the offer.

- WHEN Agent 1 is about to run
- THEN the system MUST call GET http://localhost:8001/rag/retrieve
- THEN the system MUST pass the enriched context as the retrieval query
- IF the RAG service is unavailable (timeout or error)
- THEN the system MUST proceed with an empty principles list
- THEN the system MUST NOT crash or block the pipeline
- The timeout MUST be 5 seconds maximum

Acceptance criteria:
- [ ] Killing Mateen's service does not break the pipeline
- [ ] RAG principles appear in the offer prompt when service is available
- [ ] Log message printed when falling back to empty principles

### FR-04: Offer generation (Agent 1)

The system MUST generate an offer grounded in both evidence and RAG principles.

- WHEN Agent 1 runs
- THEN it MUST produce an Offer object with all required fields
- THEN the ICP pain MUST reference a specific Reddit quote or competitor gap
- THEN the price MUST be anchored below the highest competitor price found
- THEN the guarantee MUST describe something competitors do not offer
- THEN sources_used MUST contain real URLs from the evidence

Acceptance criteria:
- [ ] Offer.icp.evidence_source is not empty
- [ ] Offer.price_anchor references actual competitor pricing
- [ ] Offer.sources_used contains at least 1 URL from Evidence.all_sources

### FR-05: Parallel agents (Agents 2 + 3)

Builder and Growth agents MUST run in parallel to minimise wall-clock time.

- WHEN Agent 1 completes
- THEN Agent 2 and Agent 3 MUST start simultaneously via asyncio.gather()
- THEN both MUST complete before Agent 4 starts
- Each MUST return a Pydantic-validated object

Acceptance criteria:
- [ ] Total time for agents 2+3 is less than max(agent2_time, agent3_time) + 2s overhead
- [ ] Both objects are populated before critique runs

### FR-06: Critique agent (Agent 4)

The system MUST stream the critique text word-by-word to the frontend.

- WHEN Agent 4 runs
- THEN it MUST use client.messages.stream() not client.messages.create()
- THEN each text chunk MUST be emitted as a critique_chunk SSE event immediately
- THEN the critique MUST reference specific claims from the offer
- THEN the critique MUST end with a single highest-leverage rewrite suggestion

Acceptance criteria:
- [ ] Frontend receives multiple critique_chunk events (not one large chunk)
- [ ] Critique mentions at least one specific field from the offer by name
- [ ] Critique ends with "The one change that will most improve conversions:"

### FR-07: SSE stream

The system MUST stream all results to the frontend via a single SSE connection.

- WHEN POST /generate is called
- THEN the response MUST have Content-Type: text/event-stream
- THEN events MUST be emitted in order: status → research → offer → page → growth → critique_chunk(s) → complete
- IF any agent fails THEN an error event MUST be emitted and the stream closed
- The stream MUST NOT close before the complete or error event

Acceptance criteria:
- [ ] curl -N POST /generate streams events in real time
- [ ] Events arrive before all agents complete (not buffered)
- [ ] Complete event always fires last (or error fires instead)

### FR-08: Model switching

The system MUST support multiple LLM providers with capability enforcement.

- WHEN a model is requested for an agent
- THEN resolve_model() MUST validate the model supports required capabilities
- IF the model is blocked for the requested agent THEN fall back to default silently
- DeepSeek R1 MUST be blocked from all agents except critique
- Research agent MUST only accept models with web_search support

Acceptance criteria:
- [ ] Requesting deepseek-r1 for the offer agent silently uses claude-sonnet-4-6
- [ ] Requesting claude-haiku for research silently uses claude-sonnet-4-6
- [ ] Model choices are passed through the full pipeline correctly

### FR-09: Evals

The system MUST evaluate research and offer quality before proceeding.

- WHEN research completes
- THEN eval_research() MUST run and check for critical failures
- IF critical_fails is not empty AND action is "retry"
- THEN the research agent MUST run once more before proceeding
- WHEN offer completes
- THEN eval_offer() MUST run using Claude Haiku as judge
- IF score < 0.5 THEN the offer agent MUST regenerate once

Acceptance criteria:
- [ ] eval_research returns action="retry" when competitors array is empty
- [ ] eval_offer returns score < 0.65 when price is not anchored to evidence
- [ ] A retried research run emits a second status event with "Deepening research..." label

### FR-10: Landing page persistence

The system MUST persist generated offers so Nathan's /p/[slug] route can serve them.

- WHEN agents 2+3 complete
- THEN the combined offer+page+evidence+growth object MUST be stored
- THEN the slug MUST be derived from the idea (lowercase, hyphenated, max 4 words)
- THEN the page SSE event MUST contain the full path /p/{slug}

Acceptance criteria:
- [ ] Visiting /p/{slug} after generation returns the stored data
- [ ] Slug is URL-safe and derived from the idea string

## Non-functional requirements

### NFR-01: Response time
- Intake responses: < 3 seconds per turn
- First SSE event (research started): < 1 second after POST /generate
- Full pipeline completion: < 90 seconds total

### NFR-02: Reliability
- Pipeline must complete even if RAG service is down
- Pipeline must complete even if one non-critical agent returns partial data
- A failed Agent 2 or 3 must not prevent Agent 4 from running

### NFR-03: Cost
- Use Claude Haiku for intake (cheap, fast conversation)
- Use Claude Sonnet for research and offer (quality matters here)
- Use GPT-4o-mini for builder and growth by default (fast, cheap, good enough)
- Each full pipeline run should cost < $0.15 in API credits

### NFR-04: Hackathon constraints
- In-memory session storage is acceptable (no database required)
- No authentication on any endpoint (Civic Auth is frontend-only)
- CORS: allow all origins
- No rate limiting required for demo
