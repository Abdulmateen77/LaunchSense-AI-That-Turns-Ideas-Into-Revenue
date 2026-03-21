import json
import os

from anthropic import Anthropic
from pathlib import Path

from dotenv import load_dotenv
from tavily import TavilyClient

load_dotenv(Path(__file__).parent.parent / ".env")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not set in .env")

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
if not TAVILY_API_KEY:
    raise ValueError("TAVILY_API_KEY not set in .env")

anthropic_client = Anthropic()
tavily_client = TavilyClient(api_key=TAVILY_API_KEY)

from models.schemas import EnrichedContext, Evidence
from models.model_registry import resolve_model

RESEARCH_SYSTEM = """You are a market research analyst. You will be given raw search results.
Extract structured evidence from them.

RULES:
- Only use information that appears in the search results — never invent data
- Quotes must be exact words from the results, not summaries
- If pricing is not found, write "pricing not public"
- You MUST populate pricing_range even if approximate
- Return ONLY valid JSON with NO markdown fences

Return this exact JSON structure:
{"competitors":[{"name":"","url":"","pricing_found":"","pricing_url":"","weakness":""}],"reddit_quotes":[{"quote":"","subreddit":"","upvotes":"","thread_url":""}],"market_signals":[{"signal":"","source":""}],"pricing_range":{"low":"","high":"","insight":""},"all_sources":[]}"""


def parse_llm_json(text: str) -> dict:
    clean = text.strip()
    if clean.startswith("```"):
        parts = clean.split("```")
        clean = parts[1] if len(parts) > 1 else parts[0]
        if clean.startswith("json"):
            clean = clean[4:]
    clean = clean.strip()
    decoder = json.JSONDecoder()
    obj, _ = decoder.raw_decode(clean)
    return obj


def search_tavily(query: str, max_results: int = 5) -> str:
    """Run a Tavily search and return formatted results as text."""
    try:
        response = tavily_client.search(
            query=query,
            max_results=max_results,
            include_answer=True,
        )
        lines = []
        if response.get("answer"):
            lines.append(f"Summary: {response['answer']}\n")
        for r in response.get("results", []):
            lines.append(f"Title: {r.get('title', '')}")
            lines.append(f"URL: {r.get('url', '')}")
            lines.append(f"Content: {r.get('content', '')[:200]}")
            lines.append("---")
        return "\n".join(lines)
    except Exception as e:
        print(f"Tavily search failed for '{query}': {e}")
        return ""


async def run_research_agent(context: EnrichedContext, model: str | None = None) -> Evidence:
    model_id = resolve_model("research", model)

    # Run targeted searches via Tavily
    competitor_results = search_tavily(
        f"{context.idea} competitors pricing {context.niche}", max_results=3
    )
    pricing_results = search_tavily(
        f"{context.idea} {context.niche} pricing per month cost subscription", max_results=3
    )
    reddit_results = search_tavily(
        f"reddit {context.core_pain} {context.niche}", max_results=3
    )
    market_results = search_tavily(
        f"{context.niche} market size statistics {context.idea}", max_results=2
    )

    user_message = f"""Extract structured market research from these search results.

IDEA: {context.idea}
NICHE: {context.niche}
CUSTOMER: {context.target_customer}
PAIN: {context.core_pain}

--- COMPETITOR SEARCH RESULTS ---
{competitor_results}

--- PRICING SEARCH RESULTS ---
{pricing_results}

--- REDDIT SEARCH RESULTS ---
{reddit_results}

--- MARKET STATS SEARCH RESULTS ---
{market_results}

Extract:
- 2 competitors with real pricing and URLs from the results above
- 1-2 Reddit quotes (exact words) with upvote counts and thread URLs
- 1-2 market signals with sources
- Pricing range based on competitor data found

Return ONLY valid JSON matching the schema. No markdown fences."""

    try:
        response = anthropic_client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=2000,
            system=RESEARCH_SYSTEM,
            messages=[{"role": "user", "content": user_message}],
        )
        text = response.content[0].text
        parsed = parse_llm_json(text)
        return Evidence(**parsed)

    except json.JSONDecodeError as e:
        print(f"Agent 0 JSON parse failed: {e}")
        raise
    except Exception as e:
        print(f"Agent 0 failed: {e}")
        raise
