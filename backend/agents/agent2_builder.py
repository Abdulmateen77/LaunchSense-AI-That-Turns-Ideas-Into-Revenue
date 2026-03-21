import json
import os

from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not set in .env")

client = Anthropic()

from models.schemas import Offer, Evidence, LandingPage
from models.model_registry import resolve_model

BUILDER_SYSTEM = """You are a conversion-focused landing page copywriter.

Your job is to generate a complete landing page JSON from an offer and market evidence.

## Rules

1. USE REAL EVIDENCE STATS
   - Every problem point must include a real stat from the evidence provided
   - Do not invent statistics — use only data from the evidence section

2. CITE SOURCES
   - Every stat in the problem section must have a real source URL from the evidence
   - The sources array must contain real URLs from the evidence — not invented ones

3. SLUG RULES
   - Generate a clean URL slug from the offer headline
   - Lowercase only, hyphens between words, max 4 words, no special characters
   - Example: "estate-agent-listing-ai" or "freelancer-proposal-tool"

4. COLOR SCHEME
   - Choose a color scheme appropriate to the niche
   - Options: dark (tech/SaaS), light (professional services), warm (creative/lifestyle), bold (high-energy/sales)
   - Match the tone of the ICP and offer

5. HERO CONSISTENCY
   - The hero headline must match the offer headline exactly
   - The hero CTA must match the offer CTA

6. PROBLEM SECTION
   - Each problem point must have: a specific pain, a real stat from the evidence, and a real source URL
   - Do not use generic stats — only stats traceable to the evidence provided

7. VS SECTION
   - "us" list: specific advantages grounded in the offer's competitor_gap
   - "them" list: specific weaknesses from the competitor evidence

Return ONLY valid JSON — no markdown fences, no commentary, no explanation.
The JSON must exactly match the LandingPage schema provided in the user message."""


def parse_llm_json(text: str) -> dict:
    clean = text.strip()
    if clean.startswith("```"):
        parts = clean.split("```")
        clean = parts[1] if len(parts) > 1 else parts[0]
        if clean.startswith("json"):
            clean = clean[4:]
    return json.loads(clean.strip())


async def run_builder_agent(
    offer: Offer,
    evidence: Evidence,
    model: str | None = None,
) -> LandingPage:
    model_id = resolve_model("builder", model)

    competitors_formatted = "\n".join(
        f"- {c.name} ({c.url}): {c.pricing_found} — weakness: {c.weakness}"
        for c in evidence.competitors
    )

    quotes_formatted = "\n".join(
        f'- "{q.quote}" (r/{q.subreddit}, {q.upvotes} upvotes) — {q.thread_url}'
        for q in evidence.reddit_quotes
    )

    sources_formatted = "\n".join(f"- {s}" for s in evidence.all_sources)

    landing_page_schema = """{
  "slug": "string — lowercase, hyphens, max 4 words",
  "color_scheme": "dark|light|warm|bold",
  "hero": {
    "headline": "string — must match offer headline",
    "subheadline": "string",
    "cta": "string — must match offer CTA",
    "cta_sub": "string — e.g. 'No credit card · 60-second setup'"
  },
  "problem": {
    "headline": "string",
    "points": [
      { "pain": "string", "stat": "string — real stat from evidence", "source": "string — real URL from evidence" }
    ]
  },
  "IMPORTANT: points array must have EXACTLY 3 items — no more, no less",
  "solution": {
    "headline": "string",
    "benefits": [
      { "title": "string", "body": "string" }
    ]
  },
  "IMPORTANT: benefits array must have EXACTLY 3 items — no more, no less",
  "vs_section": {
    "headline": "string",
    "us": ["string"],
    "them": ["string"]
  },
  "pricing": {
    "price": "string",
    "anchor": "string",
    "guarantee": "string"
  },
  "sources": [
    { "label": "string", "url": "string — real URL from evidence" }
  ]
}"""

    user_message = f"""OFFER:
Headline: {offer.headline}
Subheadline: {offer.subheadline}
ICP: {offer.icp.who} — pain: {offer.icp.pain}
Outcome: {offer.outcome}
Price: {offer.price} (anchor: {offer.price_anchor})
Guarantee: {offer.guarantee}
CTA: {offer.cta}
Competitor gap: {offer.competitor_gap}

EVIDENCE:
Competitors:
{competitors_formatted}

Reddit quotes:
{quotes_formatted}

Pricing range: {evidence.pricing_range.low} – {evidence.pricing_range.high}
Sources:
{sources_formatted}

Generate a complete landing page JSON matching the LandingPage schema.
Slug must be derived from the offer headline (lowercase, hyphens, max 4 words).
Every problem point must cite a real source URL from the evidence above.

Return ONLY valid JSON matching this schema:
{landing_page_schema}"""

    try:
        response = client.messages.create(
            model=model_id,
            max_tokens=3000,
            system=BUILDER_SYSTEM,
            messages=[{"role": "user", "content": user_message}],
        )
        text = response.content[0].text
        parsed = parse_llm_json(text)

        # Truncate lists to schema limits before Pydantic validation
        if "problem" in parsed and "points" in parsed["problem"]:
            parsed["problem"]["points"] = parsed["problem"]["points"][:3]
        if "solution" in parsed and "benefits" in parsed["solution"]:
            parsed["solution"]["benefits"] = parsed["solution"]["benefits"][:4]
        if "vs_section" in parsed:
            parsed["vs_section"]["us"] = parsed["vs_section"].get("us", [])[:6]
            parsed["vs_section"]["them"] = parsed["vs_section"].get("them", [])[:6]

        return LandingPage(**parsed)

    except json.JSONDecodeError as e:
        print(f"Agent 2 JSON parse failed: {e}")
        print(f"Raw text: {text[:500]}")
        raise
    except Exception as e:
        print(f"Agent 2 failed: {e}")
        raise
