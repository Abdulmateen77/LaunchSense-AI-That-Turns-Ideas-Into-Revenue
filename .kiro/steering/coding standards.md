# Coding Standards

## Python conventions

- Python 3.11+ — use `str | None` not `Optional[str]`, use `list[str]` not `List[str]`
- All async functions use `async def` and `await`
- All Pydantic models use `model_dump()` not `.dict()` (Pydantic v2)
- All JSON parsing wrapped in try/except with a meaningful fallback
- No bare `except:` — always `except Exception as e:` with a print/log

## Pydantic model rules

- Every model in `models/schemas.py` — nowhere else
- Field constraints declared inline: `Field(min_length=5, max_length=500)`
- `max_length` on all list fields to prevent token blowout
- Optional fields use `str | None = None` default, not `Optional`
- Models validated at boundaries only — internal functions pass typed objects

## FastAPI conventions

- All routes in `api/` folder, registered in `main.py`
- Route functions are thin — they call services, not contain logic
- Input validation happens in the route via Pydantic, not inside services
- All errors return structured JSON: `{"error": "message", "code": "ERROR_CODE"}`
- SSE routes return `StreamingResponse` with `media_type="text/event-stream"`

## SSE event format (strict — Nathan depends on this)

Every SSE event must be exactly:
```python
f"data: {json.dumps({'event': event_name, 'data': payload})}\n\n"
```

Valid event names (no others):
- `status`         → `{ step: int, label: str, sub?: str }`
- `research`       → `Evidence` model as dict
- `offer`          → `Offer` model as dict
- `page`           → `{ url: str, slug: str }`
- `growth`         → `GrowthPack` model as dict
- `critique_chunk` → `{ text: str }`
- `eval`           → `{ research: EvalResult, offer: EvalResult }`
- `complete`       → `{ success: bool, slug: str }`
- `error`          → `{ message: str }`

**Never rename events. Nathan's frontend depends on these exact strings.**

## Anthropic SDK usage

```python
# Standard call — structured output
from anthropic import Anthropic
client = Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=4000,
    system=SYSTEM_PROMPT,
    messages=[{"role": "user", "content": prompt}]
)
text = response.content[0].text

# Research agent — with tools
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=8000,
    tools=[
        {"type": "web_search_20260209", "name": "web_search"},
        {"type": "web_fetch_20260209", "name": "web_fetch", "max_uses": 5},
    ],
    system=SYSTEM_PROMPT,
    messages=[{"role": "user", "content": prompt}]
)
# Extract final text block after all tool calls
text = next(
    (block.text for block in response.content if hasattr(block, "text")),
    "{}"
)

# Streaming — Agent 4 only
with client.messages.stream(
    model="claude-sonnet-4-6",
    max_tokens=1500,
    system=SYSTEM_PROMPT,
    messages=[{"role": "user", "content": prompt}]
) as stream:
    for chunk in stream.text_stream:
        yield chunk
```

## JSON parsing from LLM responses

LLMs sometimes wrap JSON in markdown fences. Always strip them:

```python
def parse_llm_json(text: str) -> dict:
    clean = text.strip()
    if clean.startswith("```"):
        parts = clean.split("```")
        clean = parts[1] if len(parts) > 1 else parts[0]
        if clean.startswith("json"):
            clean = clean[4:]
    return json.loads(clean.strip())
```

## Environment variables

Access only via `os.getenv()` with a clear error if missing:

```python
import os
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not set in .env")
```

## Error handling in agents

Agents should never crash the pipeline silently. Pattern:

```python
async def run_agent_N(...):
    try:
        # ... agent logic
        return ValidatedOutput(**parsed)
    except json.JSONDecodeError as e:
        print(f"Agent N JSON parse failed: {e}")
        return fallback_output()  # always return a valid typed object
    except Exception as e:
        print(f"Agent N failed: {e}")
        raise  # re-raise so the main route catches it and emits error event
```

## Async patterns

```python
# Parallel agents — always use gather
page, growth = await asyncio.gather(
    run_builder_agent(offer, evidence, model),
    run_growth_agent(offer, evidence, model),
)

# Sequential with early exit
evidence = await run_research_agent(context)
if eval_research(evidence).action == "retry":
    evidence = await run_research_agent(context, retry=True)
offer = await run_offer_agent(context, evidence, principles)
```

## What NOT to do

- Do not use LangChain, LlamaIndex, or any agent framework
- Do not store conversation state in a database — use in-memory dict for hackathon
- Do not call Anthropic API from inside Pydantic validators
- Do not put prompts inline inside route functions — they live in the agent files
- Do not create new Pydantic models outside schemas.py
- Do not catch exceptions and return None — always return a typed fallback or re-raise
- Do not add retry logic with exponential backoff — simple single retry is enough
- Do not make the SSE emit function async — keep it sync, yield strings directly