import json
import os

from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not set in .env")

client = Anthropic()

from models.schemas import EnrichedContext, Evidence

RESEARCH_SYSTEM = """You are a market research agent. Your job is to gather REAL evidence about a product idea using web search and web fetch tools.

Follow this EXACT research sequence:

STEP 1 — COMPETITOR SEARCH
Search for: "{idea} software pricing"
Then search for: "{idea} tool alternatives"
Identify the top 2-3 competitors from the results.

STEP 2 — FETCH COMPETITOR PRICING PAGES
For each competitor found in Step 1, fetch their pricing page URL.
Use ONLY URLs that appeared in your search results — NEVER invent URLs.
If a pricing page is paywalled or JS-rendered and you cannot read the price, write "pricing not public" — do NOT guess.

STEP 3 — REDDIT SEARCH
Search for: "site:reddit.com {niche} {pain}"
Then search for: "reddit {target_customer} {pain}"
Find threads where real users discuss this pain point.

STEP 4 — FETCH REDDIT THREADS
For each Reddit thread URL found in Step 3, fetch the actual thread content.
Use ONLY URLs that appeared in your search results.
Extract EXACT quotes from users — word for word, not summaries.
Record the upvote count from the fetched page.

STEP 5 — MARKET SIGNALS
Search for industry statistics, growth data, and market size for this niche.

CRITICAL RULES:
- NEVER invent URLs. Only use URLs that appeared in prior search results.
- Reddit quotes must be EXACT words from the fetched thread, not paraphrases or summaries.
- Upvote counts must come from the actual fetched page content.
- If a page cannot be fetched, note the failure — do not fabricate content.
- pricing_found must contain actual price strings (e.g. "$49/mo") OR "pricing not public".
- pricing_url must be the actual URL you fetched, not a guessed URL.

Return ONLY valid JSON matching this exact schema — no markdown fences, no commentary:

{
  "competitors": [
    {
      "name": "CompetitorName",
      "url": "https://competitor.com",
      "pricing_found": "$49/mo starter · $149/mo pro",
      "pricing_url": "https://competitor.com/pricing",
      "weakness": "Specific weakness based on what you found"
    }
  ],
  "reddit_quotes": [
    {
      "quote": "Exact words from the Reddit post",
      "subreddit": "subredditname",
      "upvotes": "247",
      "thread_url": "https://reddit.com/r/subreddit/comments/..."
    }
  ],
  "market_signals": [
    {
      "signal": "Specific statistic or market data point",
      "source": "https://source-url.com"
    }
  ],
  "pricing_range": {
    "low": "$29/mo",
    "high": "$199/mo",
    "insight": "What the pricing range tells us about the market"
  },
  "all_sources": [
    "https://every-url-that-yielded-real-data.com"
  ]
}"""


def parse_llm_json(text: str) -> dict:
    clean = text.strip()
    if clean.startswith("```"):
        parts = clean.split("```")
        clean = parts[1] if len(parts) > 1 else parts[0]
        if clean.startswith("json"):
            clean = clean[4:]
    return json.loads(clean.strip())


async def run_research_agent(context: EnrichedContext, model: str | None = None) -> Evidence:
    user_message = f"""Research this product idea thoroughly:

IDEA: {context.idea}
NICHE: {context.niche}
TARGET CUSTOMER: {context.target_customer}
CORE PAIN: {context.core_pain}
EXISTING SOLUTIONS: {context.existing_solutions}

Follow the research sequence in your instructions. Search for competitors, fetch their pricing pages, find Reddit threads about this pain, fetch the actual thread content, and gather market signals.

Return ONLY valid JSON matching the Evidence schema."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=8000,
            tools=[
                {"type": "web_search_20260209", "name": "web_search"},
                {"type": "web_fetch_20260209", "name": "web_fetch", "max_uses": 5},
            ],
            system=RESEARCH_SYSTEM,
            messages=[{"role": "user", "content": user_message}],
        )

        text = next(
            (block.text for block in reversed(response.content) if hasattr(block, "text")),
            "{}",
        )

        parsed = parse_llm_json(text)
        return Evidence(**parsed)

    except json.JSONDecodeError as e:
        print(f"Agent 0 JSON parse failed: {e}")
        print(f"Raw text: {text[:500]}")
        raise
    except Exception as e:
        print(f"Agent 0 failed: {e}")
        raise
