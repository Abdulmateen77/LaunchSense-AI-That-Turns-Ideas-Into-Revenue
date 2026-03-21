# CLAUDE.md — Offer → Launch Backend

This file gives Claude Code and Kiro the full context for Falah's LLM layer.
Read this before making any changes to this codebase.

## What this codebase is

Falah's part of a 3-person hackathon project (AI London 2026).
This is the **LLM orchestration layer** — a FastAPI backend that:
1. Runs a conversational intake loop to enrich a startup idea
2. Fires 5 LLM agents in sequence/parallel to produce a go-to-market package
3. Streams results via Server-Sent Events to Nathan's Next.js frontend

## What this codebase is NOT

- Not the vector DB (Mateen owns that — separate service on port 8001)
- Not the frontend (Nathan owns that — separate Next.js app)
- Not a general-purpose chatbot
- Not a LangChain project — we use Anthropic SDK and OpenAI SDK directly

## The most important files

| File | What it does |
|------|-------------|
| `models/schemas.py` | All Pydantic models — the data contracts for everything |
| `agents/agent0_research.py` | Uses web_search + web_fetch to get real evidence |
| `services/prompt_builder.py` | Assembles the offer prompt from evidence + RAG principles |
| `agents/agent1_offer.py` | Generates the grounded offer from the prompt |
| `api/generate.py` | The SSE stream orchestration — connects all agents |

## The most important constraint

**Agent 0 must use web_search + web_fetch together.**
web_search returns URLs and snippets. web_fetch gets the full page content.
Without web_fetch, you get snippet-level data. With it, you get actual
pricing page content and actual Reddit thread text.

The web_fetch tool can ONLY fetch URLs that appeared in prior web_search results.
This is why the agents always search first, then fetch.

## The interface contracts (DO NOT CHANGE without telling Nathan and Mateen)

### SSE event format (Nathan depends on this)
```python
f"data: {json.dumps({'event': event_name, 'data': payload})}\n\n"
```

Valid event names: status, research, offer, page, growth, critique_chunk, eval, complete, error

### RAG endpoint (Mateen provides this)
```
GET http://localhost:8001/rag/retrieve?query=...&categories=...
Returns: { "principles": [{ "category": str, "text": str, "source": str }] }
```

Always handle with 5s timeout and empty list fallback.

## What to vibe code

Safe to generate with AI:
- Boilerplate FastAPI setup (CORS, router registration, uvicorn config)
- SSE streaming skeleton (the yield loop pattern)
- httpx client skeleton for RAG calls
- Pydantic model shells (but fill in real field names and constraints yourself)
- asyncio.gather() patterns for parallel agents

## What to write by hand

**Must be written manually:**
- All system prompts (every word matters — wrong prompts fail silently)
- `build_offer_prompt()` in prompt_builder.py — this is the core product
- `INTAKE_SYSTEM` — controls what questions get asked
- `eval_research()` logic — what counts as a critical failure
- `blocked_agents` list in model_registry — hard constraints

## Current task priority (hackathon order)

1. Schemas — nothing works without these
2. Intake loop — get CONTEXT_COMPLETE working
3. Agent 0 — **test with real ideas before proceeding**
4. RAG client with fallback
5. Prompt builder
6. Agent 1 — test offer quality
7. Agents 2 + 3 in parallel
8. Agent 4 streaming
9. Evals wired into the main route
10. Full SSE orchestration in /generate

## Common mistakes to avoid

1. **Don't proceed from Task 5 until Agent 0 returns real URLs**
   If competitors have invented URLs or empty reddit_quotes, fix the research
   system prompt before touching any other agent.

2. **Don't catch exceptions and return None**
   Always return a typed fallback object or re-raise.
   Silent None returns cause downstream agents to crash with confusing errors.

3. **Don't put prompts in the route function**
   Prompts live as constants in agent files. Routes are thin.

4. **Don't block on RAG**
   The rag_client always has a 5-second timeout and returns [] on failure.
   The offer still generates without RAG — just ungrounded.

5. **Don't change SSE event names**
   Nathan's frontend listens for exact strings. Renaming an event silently
   breaks the entire UI without any error message.

## Testing approach

Quick smoke tests for each agent as standalone scripts in `tests/`.
Run `python tests/test_agent0.py` before building Agent 1.
Run `python tests/test_intake.py` before building the pipeline.
No pytest, no fixtures — just async test functions that print results.

## Environment

```bash
# Install
pip install -r requirements.txt

# Run
uvicorn main:app --reload --port 8000

# Test Agent 0
python tests/test_agent0.py

# Full curl test
curl -N -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"idea": "AI tool for UK estate agents"}'
```

## When you're stuck

1. Check the SSE events in curl — which event last fired before it stopped?
2. Print the offer prompt before sending to the LLM — is the evidence in there?
3. Check if RAG returned empty list — is that causing a thin offer?
4. Check if the LLM returned JSON with markdown fences — strip them
5. Check if Pydantic validation is failing — the error message says which field